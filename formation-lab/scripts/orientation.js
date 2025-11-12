// Orientation module for Formation Lab
import { set, FLAB, PITCH_LAND } from './state.js';

/**
 * Detect if we're on a mobile device vs desktop
 * Mobile devices should auto-rotate, desktop should stay landscape
 */
function isMobileDevice() {
  // Check for touch support AND small screen
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.screen.width <= 1024 || window.screen.height <= 1024;

  // Also check user agent for mobile patterns
  const mobilePattern = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobilePattern.test(navigator.userAgent);

  return (hasTouch && isSmallScreen) || isMobileUA;
}

/**
 * Detect current device orientation based on viewport dimensions
 */
function getDeviceOrientation() {
  return window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape';
}

export function setOrientation(mode) {
  // Support both landscape and portrait modes
  set('orientation', mode);
  const fieldEl = document.querySelector('.flab-field');

  if (mode === 'portrait') {
    fieldEl?.classList.add('is-portrait');
    document.documentElement.style.setProperty('--pitch-url',
      `url("../../assets/portrait/pitch-portrait.svg")`
    );
  } else {
    fieldEl?.classList.remove('is-portrait');
    document.documentElement.style.setProperty('--pitch-url',
      `url("../../assets/landscape/pitch-landscape.svg")`
    );
  }

  // Import render functions when needed
  import('./render.js').then(({ relayoutAllPlayers, renderArrows }) => {
    relayoutAllPlayers();
    renderArrows?.();
  });
}

export function flipSides(){
  for (const p of FLAB.players) p.nx = 1 - p.nx;

  // Import render functions when needed
  import('./render.js').then(({ relayoutAllPlayers, renderArrows }) => {
    relayoutAllPlayers();
    renderArrows?.();
  });
}

/**
 * Auto-detect and apply orientation based on device and viewport
 * On mobile: respond to device rotation
 * On desktop: stay in landscape
 */
export function autoOrientation() {
  if (isMobileDevice()) {
    // Mobile devices: respond to actual device orientation
    const orientation = getDeviceOrientation();
    setOrientation(orientation);
  } else {
    // Desktop: always use landscape
    setOrientation('landscape');
  }
}

/**
 * Handle device orientation changes (for fullscreen mode on mobile)
 */
export function initOrientationListener() {
  if (!isMobileDevice()) return;

  // Listen for orientation changes
  window.addEventListener('orientationchange', () => {
    setTimeout(() => autoOrientation(), 100);
  });

  // Also listen to resize for viewport changes
  window.addEventListener('resize', () => {
    const currentOrientation = FLAB?.orientation || 'landscape';
    const newOrientation = getDeviceOrientation();
    if (currentOrientation !== newOrientation) {
      autoOrientation();
    }
  });
}

window.__mod_orientation = true;
