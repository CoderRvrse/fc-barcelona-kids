// Test module for error handling system - FOR DEVELOPMENT ONLY
// Run in browser console: import('./scripts/test-error-system.js').then(m => m.testErrorSystem())

import { handleError } from './error-handler.js';
import { showToast, showErrorToast, showSuccessToast, showInfoToast, showWarningToast } from './ui-toast.js';

/**
 * Test all toast types
 */
export function testToasts() {
  console.log('Testing toast notifications...');

  // Test each toast type
  setTimeout(() => showSuccessToast('Formation saved successfully!'), 100);
  setTimeout(() => showInfoToast('Press Tab to cycle between players'), 1200);
  setTimeout(() => showWarningToast('You have used 4 of 5 free formations'), 2400);
  setTimeout(() => showErrorToast('Failed to connect to server. Please check your internet connection.'), 3600);

  console.log('✅ Toast tests queued (watch top-right corner)');
}

/**
 * Test error handler with various error types
 */
export function testErrorHandler() {
  console.log('Testing error handler...');

  // Test Error object
  setTimeout(() => {
    const error = new Error('Network request failed');
    handleError(error, 'test-network', true);
  }, 100);

  // Test Firebase-style error
  setTimeout(() => {
    const error = new Error('auth/user-not-found');
    handleError(error, 'test-auth', true);
  }, 2000);

  // Test validation error
  setTimeout(() => {
    const error = new Error('validation/invalid-data');
    handleError(error, 'test-validation', true);
  }, 4000);

  // Test generic error
  setTimeout(() => {
    const error = new Error('Something weird happened');
    handleError(error, 'test-generic', true);
  }, 6000);

  console.log('✅ Error handler tests queued');
}

/**
 * Test global error catching
 */
export function testGlobalError() {
  console.log('Testing global error handler (will throw error intentionally)...');

  setTimeout(() => {
    // This should be caught by global error handler
    throw new Error('Test global error - this should show a toast!');
  }, 100);
}

/**
 * Test unhandled promise rejection
 */
export function testPromiseRejection() {
  console.log('Testing promise rejection handler...');

  setTimeout(() => {
    // This should be caught by unhandled rejection handler
    Promise.reject(new Error('Test promise rejection - this should show a toast!'));
  }, 100);
}

/**
 * Test multiple toasts (queue system)
 */
export function testToastQueue() {
  console.log('Testing toast queue (showing 6 toasts, max 3 visible)...');

  for (let i = 1; i <= 6; i++) {
    setTimeout(() => {
      showInfoToast(`Toast message #${i}`, 2000);
    }, i * 200);
  }

  console.log('✅ Queue test started - watch toasts appear in sequence');
}

/**
 * Run all tests
 */
export function testErrorSystem() {
  console.log('🧪 Running complete error system test suite...');
  console.log('This will take about 10 seconds...');

  testToasts();

  setTimeout(() => {
    console.log('\n--- Testing Error Handler ---');
    testErrorHandler();
  }, 5000);

  setTimeout(() => {
    console.log('\n--- Testing Toast Queue ---');
    testToastQueue();
  }, 12000);

  console.log('\n✅ All tests scheduled. Watch the browser UI for results.');
  console.log('To test global errors manually, run:');
  console.log('  testGlobalError()');
  console.log('  testPromiseRejection()');
}

// Export test functions to window for easy console access
if (typeof window !== 'undefined') {
  window.testErrorSystem = testErrorSystem;
  window.testToasts = testToasts;
  window.testErrorHandler = testErrorHandler;
  window.testGlobalError = testGlobalError;
  window.testPromiseRejection = testPromiseRejection;
  window.testToastQueue = testToastQueue;
}

console.log('✅ Error system test module loaded');
console.log('Run testErrorSystem() in console to test everything');
