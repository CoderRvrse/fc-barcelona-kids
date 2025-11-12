// Test module for touch gestures - FOR DEVELOPMENT ONLY
// Run in browser console: import('./scripts/test-touch.js').then(m => m.testTouch())

import {
  initTouchGestures,
  destroyTouchGestures,
  resetZoom,
  setZoom,
  getZoomLevel,
  getPanPosition,
  isTouchDevice,
  hapticFeedback
} from './touch-gestures.js';

/**
 * Test device detection
 */
export function testDeviceDetection() {
  console.log('🧪 Testing device detection...');

  const isTouch = isTouchDevice();
  console.log(`✅ Is touch device: ${isTouch}`);
  console.log(`   - ontouchstart: ${'ontouchstart' in window}`);
  console.log(`   - maxTouchPoints: ${navigator.maxTouchPoints}`);
  console.log(`   - msMaxTouchPoints: ${navigator.msMaxTouchPoints}`);

  if (!isTouch) {
    console.warn('⚠️ This device does not support touch. Some tests may not work.');
  }

  return isTouch;
}

/**
 * Test haptic feedback
 */
export function testHaptic() {
  console.log('🧪 Testing haptic feedback...');

  if (!navigator.vibrate) {
    console.warn('⚠️ Haptic feedback not supported on this device');
    return;
  }

  console.log('Testing different haptic patterns...');

  hapticFeedback('light');
  console.log('✅ Light haptic (10ms)');

  setTimeout(() => {
    hapticFeedback('medium');
    console.log('✅ Medium haptic (20ms)');
  }, 500);

  setTimeout(() => {
    hapticFeedback('heavy');
    console.log('✅ Heavy haptic (50ms)');
  }, 1000);

  setTimeout(() => {
    hapticFeedback('success');
    console.log('✅ Success haptic (pattern)');
  }, 1500);

  setTimeout(() => {
    hapticFeedback('error');
    console.log('✅ Error haptic (pattern)');
  }, 2000);
}

/**
 * Test zoom functions
 */
export function testZoom() {
  console.log('🧪 Testing zoom functions...');

  const initialZoom = getZoomLevel();
  console.log(`✅ Initial zoom level: ${initialZoom}`);

  // Zoom in
  console.log('Zooming in to 1.5x...');
  setZoom(1.5, true);

  setTimeout(() => {
    const currentZoom = getZoomLevel();
    console.log(`✅ Current zoom: ${currentZoom}`);
  }, 500);

  // Zoom in more
  setTimeout(() => {
    console.log('Zooming in to 2.5x...');
    setZoom(2.5, true);
  }, 1500);

  setTimeout(() => {
    const currentZoom = getZoomLevel();
    console.log(`✅ Current zoom: ${currentZoom}`);
  }, 2000);

  // Reset zoom
  setTimeout(() => {
    console.log('Resetting zoom to 1x...');
    resetZoom();
  }, 3000);

  setTimeout(() => {
    const finalZoom = getZoomLevel();
    console.log(`✅ Final zoom: ${finalZoom}`);
    console.log('✅ Zoom test complete');
  }, 3500);
}

/**
 * Test pan position tracking
 */
export function testPanTracking() {
  console.log('🧪 Testing pan position tracking...');

  const position = getPanPosition();
  console.log(`✅ Current pan position: x=${position.x}, y=${position.y}`);

  // Note: Pan is controlled by touch gestures, can't simulate from code
  console.log('ℹ️ Use two-finger pinch gesture to test panning');
}

/**
 * Test long-press detection
 */
export function testLongPress() {
  console.log('🧪 Testing long-press detection...');

  // Add event listener for long-press
  const field = document.querySelector('.flab-field');

  if (!field) {
    console.error('❌ Field element not found');
    return;
  }

  const longPressHandler = (event) => {
    console.log('✅ Long-press detected!');
    console.log(`   Target: ${event.detail.target.tagName}`);
    console.log(`   Position: x=${event.detail.x}, y=${event.detail.y}`);
    hapticFeedback('medium');
  };

  field.addEventListener('flab-longpress', longPressHandler);

  console.log('✅ Long-press listener added');
  console.log('ℹ️ Press and hold on the field for 500ms to trigger');

  // Cleanup function
  return () => {
    field.removeEventListener('flab-longpress', longPressHandler);
    console.log('✅ Long-press listener removed');
  };
}

/**
 * Create visual debug overlay
 */
export function createDebugOverlay() {
  console.log('🧪 Creating debug overlay...');

  // Remove existing overlay if any
  const existing = document.getElementById('flab-debug-overlay');
  if (existing) {
    existing.remove();
  }

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'flab-debug-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    z-index: 9999;
    pointer-events: none;
    line-height: 1.6;
  `;

  document.body.appendChild(overlay);

  // Update overlay every 100ms
  const updateInterval = setInterval(() => {
    const zoom = getZoomLevel();
    const pan = getPanPosition();
    const isTouch = isTouchDevice();

    overlay.innerHTML = `
      <strong>Touch Gestures Debug</strong><br>
      Zoom: ${zoom.toFixed(2)}x<br>
      Pan: ${pan.x.toFixed(1)}, ${pan.y.toFixed(1)}<br>
      Touch Device: ${isTouch ? 'Yes' : 'No'}<br>
      <br>
      <em>Pinch to zoom, Hold to long-press</em>
    `;
  }, 100);

  console.log('✅ Debug overlay created');

  // Return cleanup function
  return () => {
    clearInterval(updateInterval);
    overlay.remove();
    console.log('✅ Debug overlay removed');
  };
}

/**
 * Test gesture initialization and cleanup
 */
export function testInitCleanup() {
  console.log('🧪 Testing initialization and cleanup...');

  console.log('Destroying gestures...');
  destroyTouchGestures();

  setTimeout(() => {
    console.log('✅ Gestures destroyed');
    console.log('Re-initializing gestures...');
    initTouchGestures();
  }, 1000);

  setTimeout(() => {
    console.log('✅ Gestures re-initialized');
  }, 1500);
}

/**
 * Simulate pinch gesture (for testing on desktop)
 */
export function simulatePinchZoom() {
  console.log('🧪 Simulating pinch zoom (desktop testing)...');
  console.warn('⚠️ This is a simulation. Real pinch gestures work differently.');

  // Zoom in
  console.log('Simulating zoom in...');
  setZoom(1.8, true);

  setTimeout(() => {
    console.log('Simulating zoom out...');
    setZoom(1.2, true);
  }, 1500);

  setTimeout(() => {
    console.log('Resetting zoom...');
    resetZoom();
  }, 3000);

  setTimeout(() => {
    console.log('✅ Pinch zoom simulation complete');
  }, 3500);
}

/**
 * Run comprehensive touch gesture tests
 */
export async function testTouch() {
  console.log('🧪 Running comprehensive touch gesture test suite...\n');

  // Device detection
  const isTouch = testDeviceDetection();

  await new Promise(resolve => setTimeout(resolve, 500));

  // Haptic feedback (if supported)
  if (navigator.vibrate) {
    testHaptic();
    await new Promise(resolve => setTimeout(resolve, 2500));
  }

  // Zoom functions
  testZoom();
  await new Promise(resolve => setTimeout(resolve, 4000));

  // Pan tracking
  testPanTracking();

  // Long-press detection
  const cleanupLongPress = testLongPress();

  // Create debug overlay
  const cleanupOverlay = createDebugOverlay();

  console.log('\n✅ Touch gesture tests complete!');
  console.log('📱 Try these gestures on a touch device:');
  console.log('   - Pinch with two fingers to zoom in/out');
  console.log('   - Press and hold for 500ms to trigger long-press');
  console.log('   - Debug overlay shows current zoom and pan position');

  // Return cleanup function
  return () => {
    if (cleanupLongPress) cleanupLongPress();
    if (cleanupOverlay) cleanupOverlay();
    console.log('✅ All test cleanup complete');
  };
}

// Export functions to window for easy console access
if (typeof window !== 'undefined') {
  window.testTouch = testTouch;
  window.testDeviceDetection = testDeviceDetection;
  window.testHaptic = testHaptic;
  window.testZoom = testZoom;
  window.testPanTracking = testPanTracking;
  window.testLongPress = testLongPress;
  window.createDebugOverlay = createDebugOverlay;
  window.testInitCleanup = testInitCleanup;
  window.simulatePinchZoom = simulatePinchZoom;
}

console.log('✅ Touch gesture test module loaded');
console.log('Run testTouch() in console to test everything');
console.log('For desktop testing: simulatePinchZoom()');
