// CI audit runner for Formation Lab v23.4.3
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

// Load performance budget
let perfBudget;
try {
  perfBudget = JSON.parse(readFileSync('docs/perf-budget.json', 'utf8'));
} catch (error) {
  console.warn('Warning: Could not load performance budget from docs/perf-budget.json');
  perfBudget = { lighthouse: { performance: 0.9 } }; // Fallback
}

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});

try {
  const page = await browser.newPage();

  // Capture console output
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);

    // Forward console messages with types
    const method = msg.type() === 'error' ? 'error' : 'log';
    console[method](`[Browser ${msg.type()}]`, text);
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.error('[Page Error]', error.message);
    consoleMessages.push(`PAGE ERROR: ${error.message}`);
  });

  console.log('🏃 Starting Formation Lab audit...');

  // Navigate to application
  await page.goto('http://127.0.0.1:5500/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  console.log('📄 Page loaded, waiting for modules to initialize...');

  // Wait for FLAB to be available
  await page.waitForFunction(() => window.FLAB && window.FLAB_VERSION, {
    timeout: 10000
  });

  console.log('⚙️ FLAB initialized, running audit...');

  // Run the audit and capture result
  const auditResult = await page.evaluate(async () => {
    try {
      const auditModule = await import('./scripts/audit.js');
      const passed = await auditModule.runAudit();

      // Additional boundary test: verify all players are inside field bounds
      const field = document.querySelector('.flab-field').getBoundingClientRect();
      const outOfBounds = [...document.querySelectorAll('.player')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.top < field.top || r.bottom > field.bottom || r.left < field.left || r.right > field.right;
      });

      console.log(`🎯 Player boundary check: ${outOfBounds.length === 0 ? '✅' : '❌'} out-of-bounds count: ${outOfBounds.length}`);

      return {
        passed: passed && outOfBounds.length === 0,
        error: outOfBounds.length > 0 ? `${outOfBounds.length} players are outside field bounds` : null
      };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  });

  // Wait a bit for audit console output to complete
  await page.waitForTimeout(1000);

  if (auditResult.error) {
    console.error('❌ Audit execution failed:', auditResult.error);
    process.exit(1);
  }

  if (!auditResult.passed) {
    console.error('❌ Formation Lab audit FAILED - check output above for details');

    // Take screenshot on failure for debugging
    await page.screenshot({
      path: 'audit-failure.png',
      fullPage: true
    });

    process.exit(1);
  }

  console.log('✅ Formation Lab audit PASSED - all checks successful');

  // Test SW bypass functionality
  console.log('🧪 Testing service worker bypass...');
  const swBypassPage = await browser.newPage();

  await swBypassPage.goto('http://127.0.0.1:5500/?sw=off', {
    waitUntil: 'networkidle',
    timeout: 15000
  });

  // Check that SW was disabled
  const swRegistrations = await swBypassPage.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length;
    }
    return 0;
  });

  if (swRegistrations > 0) {
    console.error('❌ SW bypass test FAILED - service worker still active');
    process.exit(1);
  }

  // Verify app still works without SW
  const flabAvailable = await swBypassPage.evaluate(() => {
    return typeof window.FLAB !== 'undefined' && typeof window.FLAB_VERSION !== 'undefined';
  });

  if (!flabAvailable) {
    console.error('❌ SW bypass test FAILED - app not functional without SW');
    process.exit(1);
  }

  console.log('✅ Service worker bypass test PASSED');
  await swBypassPage.close();

  console.log('🎯 All CI checks completed successfully!');

} catch (error) {
  console.error('💥 CI audit crashed:', error.message);
  process.exit(1);
} finally {
  await browser.close();
}