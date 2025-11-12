// Test module for accessibility features - FOR DEVELOPMENT ONLY
// Run in browser console: import('./scripts/test-accessibility.js').then(m => m.testAccessibility())

import {
  announce,
  setFocus,
  trapFocus,
  releaseFocusTrap,
  addLandmarks,
  addAriaLabels,
  addSkipLink,
  enableKeyboardNavigation,
  checkColorContrast,
  announceMode,
  announcePlayerAction,
  announceFormationAction
} from './accessibility.js';

/**
 * Test screen reader announcements
 */
export function testAnnouncements() {
  console.log('🧪 Testing screen reader announcements...');

  // Test polite announcement
  announce('This is a polite announcement', 'polite');
  console.log('✅ Polite announcement: Check screen reader');

  setTimeout(() => {
    // Test assertive announcement
    announce('This is an urgent announcement!', 'assertive');
    console.log('✅ Assertive announcement: Check screen reader');
  }, 1000);

  setTimeout(() => {
    // Test mode announcement
    announceMode('select');
    console.log('✅ Mode announcement: Select mode');
  }, 2000);

  setTimeout(() => {
    // Test player action announcement
    announcePlayerAction('added', 10);
    console.log('✅ Player action announcement: Player 10 added');
  }, 3000);

  setTimeout(() => {
    // Test formation action announcement
    announceFormationAction('saved', '4-3-3');
    console.log('✅ Formation action announcement: 4-3-3 saved');
  }, 4000);

  console.log('ℹ️ Listen for announcements with screen reader (NVDA, JAWS, VoiceOver)');
}

/**
 * Test focus management
 */
export function testFocusManagement() {
  console.log('🧪 Testing focus management...');

  // Find first tool button
  const toolButton = document.querySelector('.flab-tool');

  if (!toolButton) {
    console.error('❌ No tool button found');
    return;
  }

  console.log('Setting focus to first tool button...');
  setFocus(toolButton);

  setTimeout(() => {
    console.log('✅ Focus set (check if button is focused)');
    console.log(`   Active element: ${document.activeElement.textContent?.trim()}`);
  }, 500);
}

/**
 * Test focus trap
 */
export function testFocusTrap() {
  console.log('🧪 Testing focus trap...');

  // Create a test modal
  const modal = document.createElement('div');
  modal.className = 'test-modal';
  modal.innerHTML = `
    <h2>Test Modal</h2>
    <button id="test-btn-1">Button 1</button>
    <button id="test-btn-2">Button 2</button>
    <button id="test-close">Close</button>
  `;
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--flab-surface);
    padding: 24px;
    border-radius: 12px;
    border: 2px solid var(--flab-accent);
    z-index: 5000;
  `;

  document.body.appendChild(modal);

  // Trap focus in modal
  trapFocus(modal);
  console.log('✅ Focus trap activated');
  console.log('ℹ️ Try pressing Tab - focus should stay within modal');

  // Add close button handler
  const closeBtn = modal.querySelector('#test-close');
  closeBtn.onclick = () => {
    releaseFocusTrap();
    modal.remove();
    console.log('✅ Focus trap released, modal closed');
  };

  return () => {
    releaseFocusTrap();
    modal.remove();
  };
}

/**
 * Test ARIA landmarks
 */
export function testLandmarks() {
  console.log('🧪 Testing ARIA landmarks...');

  // Add landmarks
  addLandmarks();
  console.log('✅ ARIA landmarks added');

  // Check if landmarks are present
  const landmarks = {
    navigation: document.querySelector('[role="navigation"]'),
    main: document.querySelector('[role="main"]'),
    complementary: document.querySelector('[role="complementary"]')
  };

  console.log('Landmarks found:');
  console.log(`   - Navigation: ${landmarks.navigation ? '✅' : '❌'}`);
  console.log(`   - Main: ${landmarks.main ? '✅' : '❌'}`);
  console.log(`   - Complementary: ${landmarks.complementary ? '✅' : '❌'}`);

  // Log aria-label for each
  if (landmarks.navigation) {
    console.log(`   Navigation label: "${landmarks.navigation.getAttribute('aria-label')}"`);
  }
  if (landmarks.main) {
    console.log(`   Main label: "${landmarks.main.getAttribute('aria-label')}"`);
  }
}

/**
 * Test ARIA labels
 */
export function testAriaLabels() {
  console.log('🧪 Testing ARIA labels...');

  // Add labels
  addAriaLabels();
  console.log('✅ ARIA labels added');

  // Check tool buttons
  const tools = document.querySelectorAll('.flab-tool');
  console.log(`Found ${tools.length} tool buttons with labels:`);
  tools.forEach((tool, i) => {
    const label = tool.getAttribute('aria-label');
    const pressed = tool.getAttribute('aria-pressed');
    console.log(`   ${i + 1}. "${label}" (pressed: ${pressed})`);
  });

  // Check players
  const players = document.querySelectorAll('.flab-player');
  console.log(`Found ${players.length} players with labels:`);
  players.forEach((player, i) => {
    const label = player.getAttribute('aria-label');
    if (i < 3) { // Show first 3
      console.log(`   ${i + 1}. "${label}"`);
    }
  });
  if (players.length > 3) {
    console.log(`   ... and ${players.length - 3} more`);
  }
}

/**
 * Test skip link
 */
export function testSkipLink() {
  console.log('🧪 Testing skip link...');

  // Add skip link
  addSkipLink();
  console.log('✅ Skip link added');

  // Check if skip link exists
  const skipLink = document.querySelector('.flab-skip-link');

  if (!skipLink) {
    console.error('❌ Skip link not found');
    return;
  }

  console.log(`   Skip link text: "${skipLink.textContent}"`);
  console.log(`   Skip link href: "${skipLink.getAttribute('href')}"`);
  console.log('ℹ️ Press Tab from top of page to reveal skip link');

  // Programmatically focus to show it
  setTimeout(() => {
    console.log('Focusing skip link for 2 seconds...');
    skipLink.focus();

    setTimeout(() => {
      skipLink.blur();
      console.log('✅ Skip link test complete');
    }, 2000);
  }, 1000);
}

/**
 * Test keyboard navigation
 */
export function testKeyboardNavigation() {
  console.log('🧪 Testing keyboard navigation...');

  // Enable keyboard navigation
  enableKeyboardNavigation();
  console.log('✅ Keyboard navigation enabled');

  // Check if body has keyboard nav class
  const hasClass = document.body.classList.contains('flab-keyboard-nav');
  console.log(`   Body has flab-keyboard-nav class: ${hasClass ? '✅' : '❌'}`);

  console.log('ℹ️ Try these keyboard shortcuts:');
  console.log('   - Tab: Navigate through tools and buttons');
  console.log('   - Enter/Space: Activate focused tool');
  console.log('   - Arrow keys: Navigate between players');
  console.log('   - 1-5: Switch to tool 1-5');
  console.log('   - H: Open help modal');
}

/**
 * Test color contrast checking
 */
export function testColorContrast() {
  console.log('🧪 Testing color contrast checker...');

  // Test various color combinations
  const tests = [
    { fg: '#f5f7ff', bg: '#0b2b72', name: 'Text on background' },
    { fg: '#ffd447', bg: '#0b2b66', name: 'Accent on dark' },
    { fg: '#ffffff', bg: '#000000', name: 'White on black' },
    { fg: '#cccccc', bg: '#ffffff', name: 'Light gray on white (should fail)' },
    { fg: '#0b2b66', bg: '#ffd447', name: 'Dark on accent' }
  ];

  console.log('Color contrast test results:');
  console.log('');

  tests.forEach(test => {
    const result = checkColorContrast(test.fg, test.bg);
    const passIcon = result.passAA ? '✅' : '❌';
    console.log(`${passIcon} ${test.name}:`);
    console.log(`   Ratio: ${result.ratio.toFixed(2)}:1`);
    console.log(`   WCAG AA: ${result.passAA ? 'PASS' : 'FAIL'}`);
    console.log(`   WCAG AAA: ${result.passAAA ? 'PASS' : 'FAIL'}`);
    console.log('');
  });
}

/**
 * Test focus indicators
 */
export function testFocusIndicators() {
  console.log('🧪 Testing focus indicators...');

  // Get all focusable elements
  const focusable = document.querySelectorAll('button, a, [tabindex]:not([tabindex="-1"])');

  console.log(`Found ${focusable.length} focusable elements`);
  console.log('ℹ️ Press Tab to navigate - look for yellow outline (focus indicator)');

  // Test focus on first few elements
  const testElements = Array.from(focusable).slice(0, 5);

  let index = 0;
  const focusNext = () => {
    if (index >= testElements.length) {
      console.log('✅ Focus indicator test complete');
      return;
    }

    const element = testElements[index];
    element.focus();

    const tagName = element.tagName.toLowerCase();
    const text = element.textContent?.trim() || element.getAttribute('aria-label') || '';
    console.log(`   Focused: <${tagName}> "${text.substring(0, 30)}..."`);

    index++;
    setTimeout(focusNext, 800);
  };

  setTimeout(focusNext, 500);
}

/**
 * Test ARIA live regions
 */
export function testLiveRegions() {
  console.log('🧪 Testing ARIA live regions...');

  // Check if announcer exists
  const announcer = document.querySelector('.flab-sr-announcer');

  if (!announcer) {
    console.error('❌ ARIA live region announcer not found');
    return;
  }

  console.log('✅ ARIA live region found');
  console.log(`   Role: ${announcer.getAttribute('role')}`);
  console.log(`   ARIA-live: ${announcer.getAttribute('aria-live')}`);
  console.log(`   ARIA-atomic: ${announcer.getAttribute('aria-atomic')}`);

  // Test announcements
  console.log('Testing announcements through live region...');

  const messages = [
    'First test message',
    'Second test message',
    'Third test message'
  ];

  messages.forEach((msg, i) => {
    setTimeout(() => {
      announce(msg, 'polite');
      console.log(`   Announced: "${msg}"`);
    }, i * 1000);
  });
}

/**
 * Test high contrast mode support
 */
export function testHighContrast() {
  console.log('🧪 Testing high contrast mode support...');

  // Check if browser supports high contrast detection
  const supportsHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
  const supportsForcedColors = window.matchMedia('(forced-colors: active)').matches;

  console.log(`   High contrast mode: ${supportsHighContrast ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   Forced colors mode: ${supportsForcedColors ? 'ENABLED' : 'DISABLED'}`);

  if (!supportsHighContrast && !supportsForcedColors) {
    console.log('ℹ️ To test:');
    console.log('   - Windows: Enable High Contrast mode in settings');
    console.log('   - macOS: Enable Increase Contrast in accessibility settings');
  }

  console.log('✅ High contrast support CSS is in place');
}

/**
 * Run comprehensive accessibility tests
 */
export async function testAccessibility() {
  console.log('🧪 Running comprehensive accessibility test suite...\n');

  // Test 1: Announcements
  testAnnouncements();
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Test 2: Focus management
  console.log('\n---\n');
  testFocusManagement();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Landmarks
  console.log('\n---\n');
  testLandmarks();
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 4: ARIA labels
  console.log('\n---\n');
  testAriaLabels();
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 5: Skip link
  console.log('\n---\n');
  testSkipLink();
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 6: Keyboard navigation
  console.log('\n---\n');
  testKeyboardNavigation();
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 7: Color contrast
  console.log('\n---\n');
  testColorContrast();
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 8: Live regions
  console.log('\n---\n');
  testLiveRegions();
  await new Promise(resolve => setTimeout(resolve, 3500));

  // Test 9: High contrast
  console.log('\n---\n');
  testHighContrast();

  console.log('\n✅ Accessibility test suite complete!');
  console.log('\n📋 Manual testing checklist:');
  console.log('   ☐ Test with NVDA screen reader (Windows)');
  console.log('   ☐ Test with JAWS screen reader (Windows)');
  console.log('   ☐ Test with VoiceOver (macOS/iOS)');
  console.log('   ☐ Test with TalkBack (Android)');
  console.log('   ☐ Navigate entire app using only keyboard');
  console.log('   ☐ Test with Windows High Contrast mode');
  console.log('   ☐ Test with browser zoom at 200%');
  console.log('   ☐ Verify all interactive elements are keyboard accessible');
  console.log('   ☐ Verify focus indicators are visible');
  console.log('   ☐ Verify color contrast meets WCAG AA standards');
}

// Export functions to window for easy console access
if (typeof window !== 'undefined') {
  window.testAccessibility = testAccessibility;
  window.testAnnouncements = testAnnouncements;
  window.testFocusManagement = testFocusManagement;
  window.testFocusTrap = testFocusTrap;
  window.testLandmarks = testLandmarks;
  window.testAriaLabels = testAriaLabels;
  window.testSkipLink = testSkipLink;
  window.testKeyboardNavigation = testKeyboardNavigation;
  window.testColorContrast = testColorContrast;
  window.testFocusIndicators = testFocusIndicators;
  window.testLiveRegions = testLiveRegions;
  window.testHighContrast = testHighContrast;
}

console.log('✅ Accessibility test module loaded');
console.log('Run testAccessibility() in console to test everything');
console.log('Available tests:');
console.log('  testAnnouncements()        - Screen reader announcements');
console.log('  testFocusManagement()      - Focus control');
console.log('  testFocusTrap()            - Focus trap in modals');
console.log('  testLandmarks()            - ARIA landmarks');
console.log('  testAriaLabels()           - ARIA labels');
console.log('  testSkipLink()             - Skip to content link');
console.log('  testKeyboardNavigation()   - Keyboard shortcuts');
console.log('  testColorContrast()        - WCAG color contrast');
console.log('  testFocusIndicators()      - Visual focus indicators');
console.log('  testLiveRegions()          - ARIA live regions');
console.log('  testHighContrast()         - High contrast mode support');
