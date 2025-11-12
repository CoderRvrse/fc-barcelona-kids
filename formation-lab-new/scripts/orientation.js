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

export function setOrientation(mode) {
  // Landscape is our default/stable mode for now
  set('orientation', 'landscape');
  const fieldEl = document.querySelector('.flab-field');
  fieldEl?.classList.remove('is-portrait');

  // Always point to the landscape asset until portrait mode is reintroduced
  document.documentElement.style.setProperty('--pitch-url',
    `url("../../assets/landscape/pitch-landscape.svg")`
  );

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

export function autoOrientation() {
  // Temporarily force landscape everywhere for stability
  setOrientation('landscape');
}

window.__mod_orientation = true;
