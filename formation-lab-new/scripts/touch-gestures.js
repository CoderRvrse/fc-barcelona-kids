// Touch gestures module for Formation Lab - Advanced mobile interactions
// Supports pinch-zoom, long-press, improved drag sensitivity, haptic feedback

let fieldElement = null;
let zoomLevel = 1;
let zoomMin = 0.5;
let zoomMax = 3;
let panX = 0;
let panY = 0;

// Touch tracking
let touches = new Map(); // Track all active touches
let gestureState = {
  type: null, // 'pinch', 'pan', 'longpress', 'drag'
  startDistance: 0,
  startZoom: 1,
  startPan: { x: 0, y: 0 },
  longPressTimer: null,
  longPressTarget: null
};

// Configuration
const LONG_PRESS_DURATION = 500; // ms
const LONG_PRESS_THRESHOLD = 10; // px movement allowed
const PINCH_THRESHOLD = 10; // px distance change to trigger pinch
const PAN_THRESHOLD = 5; // px to start panning

/**
 * Calculate distance between two touch points
 */
function getTouchDistance(touch1, touch2) {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get center point between two touches
 */
function getTouchCenter(touch1, touch2) {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2
  };
}

/**
 * Trigger haptic feedback (if supported)
 */
function hapticFeedback(type = 'light') {
  if (!navigator.vibrate) return;

  const patterns = {
    light: 10,
    medium: 20,
    heavy: 50,
    success: [10, 50, 10],
    error: [50, 100, 50]
  };

  navigator.vibrate(patterns[type] || 10);
}

/**
 * Apply zoom and pan transform to field
 */
function applyTransform() {
  if (!fieldElement) return;

  const transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
  fieldElement.style.transform = transform;
  fieldElement.style.transformOrigin = 'center center';
  fieldElement.style.transition = 'transform 0.1s ease-out';
}

/**
 * Reset zoom and pan to defaults
 */
export function resetZoom() {
  zoomLevel = 1;
  panX = 0;
  panY = 0;
  applyTransform();
  hapticFeedback('light');
}

/**
 * Set zoom level programmatically
 */
export function setZoom(level, animate = true) {
  zoomLevel = Math.max(zoomMin, Math.min(zoomMax, level));

  if (animate) {
    if (fieldElement) {
      fieldElement.style.transition = 'transform 0.3s ease-out';
    }
  }

  applyTransform();

  if (!animate && fieldElement) {
    fieldElement.style.transition = 'transform 0.1s ease-out';
  }
}

/**
 * Handle touch start
 */
function handleTouchStart(event) {
  // Track all touches
  for (let touch of event.changedTouches) {
    touches.set(touch.identifier, {
      id: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      target: touch.target,
      startTime: Date.now()
    });
  }

  const touchCount = touches.size;

  // Single touch - potential long press or drag
  if (touchCount === 1) {
    const touch = Array.from(touches.values())[0];

    // Start long press detection
    gestureState.longPressTimer = setTimeout(() => {
      handleLongPress(touch);
    }, LONG_PRESS_DURATION);

    gestureState.longPressTarget = touch.target;
    gestureState.type = 'potential-longpress';
  }

  // Two touches - pinch zoom
  else if (touchCount === 2) {
    // Cancel long press if active
    if (gestureState.longPressTimer) {
      clearTimeout(gestureState.longPressTimer);
      gestureState.longPressTimer = null;
    }

    const touchArray = Array.from(touches.values());
    gestureState.type = 'pinch';
    gestureState.startDistance = getTouchDistance(touchArray[0], touchArray[1]);
    gestureState.startZoom = zoomLevel;
    gestureState.startPan = { x: panX, y: panY };

    // Prevent default to avoid page zoom
    event.preventDefault();
  }
}

/**
 * Handle touch move
 */
function handleTouchMove(event) {
  // Update touch positions
  for (let touch of event.changedTouches) {
    if (touches.has(touch.identifier)) {
      const tracked = touches.get(touch.identifier);
      tracked.currentX = touch.clientX;
      tracked.currentY = touch.clientY;
    }
  }

  const touchCount = touches.size;
  const touchArray = Array.from(touches.values());

  // Check if moved too much for long press
  if (gestureState.type === 'potential-longpress') {
    const touch = touchArray[0];
    const dx = touch.currentX - touch.startX;
    const dy = touch.currentY - touch.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > LONG_PRESS_THRESHOLD) {
      // Moved too much, cancel long press
      if (gestureState.longPressTimer) {
        clearTimeout(gestureState.longPressTimer);
        gestureState.longPressTimer = null;
      }
      gestureState.type = 'drag';
    }
  }

  // Two-finger pinch zoom
  if (touchCount === 2 && gestureState.type === 'pinch') {
    event.preventDefault();

    const currentDistance = getTouchDistance(touchArray[0], touchArray[1]);
    const distanceChange = currentDistance - gestureState.startDistance;

    // Only trigger pinch if moved enough
    if (Math.abs(distanceChange) > PINCH_THRESHOLD) {
      const scale = currentDistance / gestureState.startDistance;
      const newZoom = gestureState.startZoom * scale;

      zoomLevel = Math.max(zoomMin, Math.min(zoomMax, newZoom));
      applyTransform();
    }
  }
}

/**
 * Handle touch end
 */
function handleTouchEnd(event) {
  // Remove ended touches
  for (let touch of event.changedTouches) {
    touches.delete(touch.identifier);
  }

  // Cancel long press timer if active
  if (gestureState.longPressTimer) {
    clearTimeout(gestureState.longPressTimer);
    gestureState.longPressTimer = null;
  }

  // If no more touches, reset gesture state
  if (touches.size === 0) {
    gestureState.type = null;
    gestureState.longPressTarget = null;
  }
}

/**
 * Handle long press gesture
 */
function handleLongPress(touch) {
  console.log('🔴 Long press detected', touch.target);

  // Trigger haptic feedback
  hapticFeedback('medium');

  // Dispatch custom event for long press
  const event = new CustomEvent('flab-longpress', {
    bubbles: true,
    detail: {
      target: touch.target,
      x: touch.currentX,
      y: touch.currentY
    }
  });

  touch.target.dispatchEvent(event);

  gestureState.longPressTimer = null;
}

/**
 * Get current zoom level
 */
export function getZoomLevel() {
  return zoomLevel;
}

/**
 * Get current pan position
 */
export function getPanPosition() {
  return { x: panX, y: panY };
}

/**
 * Check if device supports touch
 */
export function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Initialize touch gestures
 */
export function initTouchGestures() {
  // Find field element
  fieldElement = document.querySelector('.flab-field');

  if (!fieldElement) {
    console.warn('Touch gestures: Field element not found');
    return;
  }

  // Only initialize on touch devices
  if (!isTouchDevice()) {
    console.log('Touch gestures: Not a touch device, skipping');
    return;
  }

  // Add touch event listeners
  fieldElement.addEventListener('touchstart', handleTouchStart, { passive: false });
  fieldElement.addEventListener('touchmove', handleTouchMove, { passive: false });
  fieldElement.addEventListener('touchend', handleTouchEnd, { passive: true });
  fieldElement.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  // Add CSS for touch interactions
  fieldElement.style.touchAction = 'none';
  fieldElement.style.userSelect = 'none';
  fieldElement.classList.add('flab-touch-enabled');

  console.log('✅ Touch gestures initialized (pinch-zoom, long-press)');
}

/**
 * Clean up touch gestures
 */
export function destroyTouchGestures() {
  if (!fieldElement) return;

  fieldElement.removeEventListener('touchstart', handleTouchStart);
  fieldElement.removeEventListener('touchmove', handleTouchMove);
  fieldElement.removeEventListener('touchend', handleTouchEnd);
  fieldElement.removeEventListener('touchcancel', handleTouchEnd);

  fieldElement.classList.remove('flab-touch-enabled');

  console.log('✅ Touch gestures destroyed');
}

// Export for testing
export { hapticFeedback };
