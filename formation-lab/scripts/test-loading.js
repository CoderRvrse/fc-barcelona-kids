// Test module for loading spinner system - FOR DEVELOPMENT ONLY
// Run in browser console: import('./scripts/test-loading.js').then(m => m.testLoading())

import {
  showSpinner,
  hideSpinner,
  hideAllSpinners,
  updateSpinnerMessage,
  withSpinner,
  disableButton,
  enableButton,
  showInlineLoader
} from './loading-spinner.js';

/**
 * Test basic spinner show/hide
 */
export function testBasicSpinner() {
  console.log('🧪 Testing basic spinner...');

  // Show spinner
  const id = showSpinner('Loading test data...');
  console.log(`✅ Spinner shown with ID: ${id}`);

  // Hide after 2 seconds
  setTimeout(() => {
    hideSpinner(id);
    console.log('✅ Spinner hidden');
  }, 2000);
}

/**
 * Test multiple spinners
 */
export function testMultipleSpinners() {
  console.log('🧪 Testing multiple spinners...');

  // Show 3 spinners with delays
  const id1 = showSpinner('Loading players...', { blocking: false });
  console.log(`✅ Spinner 1 shown: ${id1}`);

  setTimeout(() => {
    const id2 = showSpinner('Loading formations...', { blocking: false });
    console.log(`✅ Spinner 2 shown: ${id2}`);
  }, 500);

  setTimeout(() => {
    const id3 = showSpinner('Loading settings...', { blocking: false });
    console.log(`✅ Spinner 3 shown: ${id3}`);
  }, 1000);

  // Hide all after 3 seconds
  setTimeout(() => {
    hideAllSpinners();
    console.log('✅ All spinners hidden');
  }, 3000);
}

/**
 * Test spinner message update
 */
export function testSpinnerUpdate() {
  console.log('🧪 Testing spinner message update...');

  const id = showSpinner('Step 1: Initializing...');
  console.log('✅ Spinner shown with initial message');

  setTimeout(() => {
    updateSpinnerMessage(id, 'Step 2: Processing data...');
    console.log('✅ Message updated to step 2');
  }, 1000);

  setTimeout(() => {
    updateSpinnerMessage(id, 'Step 3: Finalizing...');
    console.log('✅ Message updated to step 3');
  }, 2000);

  setTimeout(() => {
    hideSpinner(id);
    console.log('✅ Spinner hidden');
  }, 3000);
}

/**
 * Test blocking spinner
 */
export function testBlockingSpinner() {
  console.log('🧪 Testing blocking spinner (with overlay)...');

  const id = showSpinner('Processing... Please wait', { blocking: true });
  console.log('✅ Blocking spinner shown (should see dark overlay)');

  setTimeout(() => {
    hideSpinner(id);
    console.log('✅ Blocking spinner hidden');
  }, 2500);
}

/**
 * Test withSpinner wrapper
 */
export function testWithSpinner() {
  console.log('🧪 Testing withSpinner wrapper...');

  // Create async function
  const mockAsyncOperation = async () => {
    console.log('Operation started...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Operation completed!');
    return 'Success!';
  };

  // Wrap with spinner
  const wrappedOperation = withSpinner(
    mockAsyncOperation,
    'Running async operation...'
  );

  // Execute
  wrappedOperation().then(result => {
    console.log(`✅ withSpinner test completed: ${result}`);
  });
}

/**
 * Test button disable/enable
 */
export function testButtonStates() {
  console.log('🧪 Testing button disable/enable...');

  // Create test button
  const button = document.createElement('button');
  button.textContent = 'Test Button';
  button.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:12px 24px;background:#2196F3;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;z-index:9999;';
  document.body.appendChild(button);

  console.log('✅ Test button created (center of screen)');

  // Disable button
  const restore = disableButton(button, 'Loading...');
  console.log('✅ Button disabled with loading text');

  // Re-enable after 2 seconds
  setTimeout(() => {
    restore();
    console.log('✅ Button restored to original state');

    // Remove button after another second
    setTimeout(() => {
      document.body.removeChild(button);
      console.log('✅ Test button removed');
    }, 1000);
  }, 2000);
}

/**
 * Test inline loader
 */
export function testInlineLoader() {
  console.log('🧪 Testing inline loader...');

  // Create test container
  const container = document.createElement('div');
  container.textContent = 'Original content';
  container.style.cssText = 'position:fixed;top:60%;left:50%;transform:translate(-50%,-50%);padding:16px 32px;background:rgba(10,18,68,0.9);color:white;border-radius:12px;font-size:14px;z-index:9999;';
  document.body.appendChild(container);

  console.log('✅ Test container created');

  // Show inline loader
  const cleanup = showInlineLoader(container, 'Loading inline...');
  console.log('✅ Inline loader shown');

  // Restore after 2 seconds
  setTimeout(() => {
    cleanup();
    console.log('✅ Original content restored');

    // Remove container after another second
    setTimeout(() => {
      document.body.removeChild(container);
      console.log('✅ Test container removed');
    }, 1000);
  }, 2000);
}

/**
 * Test export integration (real export function)
 */
export function testExportIntegration() {
  console.log('🧪 Testing export integration...');
  console.log('This will trigger the actual PNG export with spinner');

  import('./export.js').then(({ exportPNG }) => {
    exportPNG();
    console.log('✅ Export started (watch for spinner and toast)');
  }).catch(error => {
    console.error('❌ Export test failed:', error);
  });
}

/**
 * Run all loading tests (sequentially)
 */
export async function testLoading() {
  console.log('🧪 Running complete loading spinner test suite...\n');

  testBasicSpinner();

  await new Promise(resolve => setTimeout(resolve, 2500));
  testMultipleSpinners();

  await new Promise(resolve => setTimeout(resolve, 3500));
  testSpinnerUpdate();

  await new Promise(resolve => setTimeout(resolve, 3500));
  testBlockingSpinner();

  await new Promise(resolve => setTimeout(resolve, 3000));
  testWithSpinner();

  await new Promise(resolve => setTimeout(resolve, 2500));
  testButtonStates();

  await new Promise(resolve => setTimeout(resolve, 3500));
  testInlineLoader();

  console.log('\n✅ All loading tests scheduled!');
  console.log('To test export integration, run: testExportIntegration()');
}

// Export test functions to window for easy console access
if (typeof window !== 'undefined') {
  window.testLoading = testLoading;
  window.testBasicSpinner = testBasicSpinner;
  window.testMultipleSpinners = testMultipleSpinners;
  window.testSpinnerUpdate = testSpinnerUpdate;
  window.testBlockingSpinner = testBlockingSpinner;
  window.testWithSpinner = testWithSpinner;
  window.testButtonStates = testButtonStates;
  window.testInlineLoader = testInlineLoader;
  window.testExportIntegration = testExportIntegration;
}

console.log('✅ Loading spinner test module loaded');
console.log('Run testLoading() in console to test everything');
