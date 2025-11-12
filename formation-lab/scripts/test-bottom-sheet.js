// Test module for bottom sheet modals - FOR DEVELOPMENT ONLY
// Run in browser console: import('./scripts/test-bottom-sheet.js').then(m => m.testBottomSheet())

import { showBottomSheet, showModal, dismissSheet } from './bottom-sheet.js';

/**
 * Test basic bottom sheet
 */
export function testBasicSheet() {
  console.log('🧪 Testing basic bottom sheet...');

  showBottomSheet({
    title: 'Test Bottom Sheet',
    content: '<p>This is a test bottom sheet that slides up from the bottom.</p><p>Try swiping down on the handle to dismiss!</p>',
    buttons: [
      {
        text: 'Close',
        variant: 'secondary'
      }
    ]
  });

  console.log('✅ Bottom sheet shown');
}

/**
 * Test bottom sheet with actions
 */
export function testSheetWithActions() {
  console.log('🧪 Testing bottom sheet with actions...');

  showBottomSheet({
    title: 'Confirm Action',
    content: '<p>Are you sure you want to perform this action?</p>',
    buttons: [
      {
        text: 'Cancel',
        variant: 'secondary',
        onClick: () => console.log('User cancelled')
      },
      {
        text: 'Confirm',
        variant: 'primary',
        onClick: () => console.log('User confirmed')
      }
    ]
  });

  console.log('✅ Action sheet shown');
}

/**
 * Test bottom sheet with custom content
 */
export function testCustomContent() {
  console.log('🧪 Testing bottom sheet with custom HTML content...');

  const content = document.createElement('div');
  content.innerHTML = `
    <h3>Custom Content</h3>
    <p>This bottom sheet has custom HTML elements.</p>
    <ul>
      <li>Item 1</li>
      <li>Item 2</li>
      <li>Item 3</li>
    </ul>
    <button onclick="alert('Custom button clicked!')" style="padding:8px 16px;background:#2196F3;color:white;border:none;border-radius:4px;cursor:pointer;">
      Custom Button
    </button>
  `;

  showBottomSheet({
    title: 'Custom Sheet',
    content: content,
    buttons: [
      {
        text: 'Done',
        variant: 'primary'
      }
    ]
  });

  console.log('✅ Custom content sheet shown');
}

/**
 * Test non-dismissible sheet
 */
export function testNonDismissible() {
  console.log('🧪 Testing non-dismissible bottom sheet...');

  showBottomSheet({
    title: 'Important Notice',
    content: '<p>This sheet cannot be dismissed by clicking outside or swiping.</p><p>You must click the button below.</p>',
    dismissible: false,
    buttons: [
      {
        text: 'I Understand',
        variant: 'primary',
        onClick: () => console.log('User acknowledged')
      }
    ]
  });

  console.log('✅ Non-dismissible sheet shown');
}

/**
 * Test adaptive modal (bottom sheet on mobile, center on desktop)
 */
export function testAdaptiveModal() {
  console.log('🧪 Testing adaptive modal...');
  console.log(`Current window width: ${window.innerWidth}px`);

  showModal({
    title: 'Adaptive Modal',
    content: '<p>This modal adapts based on your device.</p><p><strong>Mobile (≤768px):</strong> Bottom sheet</p><p><strong>Desktop (>768px):</strong> Center modal</p>',
    buttons: [
      {
        text: 'Got it!',
        variant: 'primary'
      }
    ]
  });

  console.log('✅ Adaptive modal shown');
}

/**
 * Test danger action
 */
export function testDangerAction() {
  console.log('🧪 Testing danger action sheet...');

  showBottomSheet({
    title: 'Delete Formation?',
    content: '<p>This action cannot be undone.</p>',
    buttons: [
      {
        text: 'Cancel',
        variant: 'secondary'
      },
      {
        text: 'Delete',
        variant: 'danger',
        onClick: () => console.log('User deleted item')
      }
    ]
  });

  console.log('✅ Danger action sheet shown');
}

/**
 * Test long content with scroll
 */
export function testLongContent() {
  console.log('🧪 Testing bottom sheet with long scrollable content...');

  const longContent = `
    <h3>Terms and Conditions</h3>
    <p>This is a very long content that requires scrolling...</p>
    ${Array.from({ length: 10 }, (_, i) => `
      <h4>Section ${i + 1}</h4>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
    `).join('')}
  `;

  showBottomSheet({
    title: 'Long Content Sheet',
    content: longContent,
    buttons: [
      {
        text: 'Accept',
        variant: 'primary'
      }
    ]
  });

  console.log('✅ Long content sheet shown (try scrolling)');
}

/**
 * Test programmatic dismiss
 */
export function testProgrammaticDismiss() {
  console.log('🧪 Testing programmatic dismiss...');

  showBottomSheet({
    title: 'Auto-Close Sheet',
    content: '<p>This sheet will automatically close in 3 seconds...</p>',
    buttons: []
  });

  setTimeout(() => {
    dismissSheet();
    console.log('✅ Sheet programmatically dismissed');
  }, 3000);
}

/**
 * Test callback on dismiss
 */
export function testDismissCallback() {
  console.log('🧪 Testing dismiss callback...');

  showBottomSheet({
    title: 'Sheet with Callback',
    content: '<p>When you dismiss this sheet, a callback will be triggered.</p>',
    buttons: [
      {
        text: 'Close',
        variant: 'secondary'
      }
    ],
    onDismiss: () => {
      console.log('✅ Dismiss callback fired!');
      alert('Sheet was dismissed!');
    }
  });

  console.log('✅ Sheet shown with dismiss callback');
}

/**
 * Run comprehensive bottom sheet tests
 */
export async function testBottomSheet() {
  console.log('🧪 Running comprehensive bottom sheet test suite...\n');

  // Test 1: Basic sheet
  testBasicSheet();
  await new Promise(resolve => setTimeout(resolve, 500));

  // Wait for user to dismiss
  console.log('ℹ️ Dismiss the sheet to continue tests...');
}

// Export functions to window for easy console access
if (typeof window !== 'undefined') {
  window.testBottomSheet = testBottomSheet;
  window.testBasicSheet = testBasicSheet;
  window.testSheetWithActions = testSheetWithActions;
  window.testCustomContent = testCustomContent;
  window.testNonDismissible = testNonDismissible;
  window.testAdaptiveModal = testAdaptiveModal;
  window.testDangerAction = testDangerAction;
  window.testLongContent = testLongContent;
  window.testProgrammaticDismiss = testProgrammaticDismiss;
  window.testDismissCallback = testDismissCallback;
}

console.log('✅ Bottom sheet test module loaded');
console.log('Try these tests:');
console.log('  testBasicSheet()        - Basic bottom sheet');
console.log('  testSheetWithActions()  - Sheet with confirm/cancel');
console.log('  testCustomContent()     - Custom HTML content');
console.log('  testAdaptiveModal()     - Adaptive (mobile/desktop)');
console.log('  testDangerAction()      - Danger action (delete)');
console.log('  testLongContent()       - Scrollable long content');
console.log('  testProgrammaticDismiss() - Auto-close after 3s');
console.log('  testDismissCallback()   - Callback on dismiss');
