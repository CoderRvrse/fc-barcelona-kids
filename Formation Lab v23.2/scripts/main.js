// Bootstrap module for Formation Lab v23.4
import './version.js';
import { FLAB, PITCH_LAND, PITCH_PORT, PASS_STYLES } from './state.js';
import { preloadArrowAssets } from './assets.arrows.js';
import { ensureHalo, relayoutAllPlayers } from './render.js';
import { initDrag } from './drag.js';
import { initPassTool } from './pass.js';
import { setOrientation } from './orientation.js';
import { wireUI } from './ui.js';
import { initKeyboard } from './keyboard.js';
import { loadSettings } from './persist.js';
import { runAudit } from './audit.js';
import { applyPreset } from './presets.js';
import { wirePresetDropdown } from './ui.presets.menu.js';
import { wireEraseMenu } from './ui.erase.menu.js';
import { wirePassStyleMenu } from './ui.passstyle.menu.js';
import { initPassLayer } from './pass.init.js';

console.log(`🚀 Formation Lab ${FLAB.version} starting...`);

// Global error logging (dev only)
if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
  window.onerror = (message, source, line, column, error) => {
    console.warn('[FLAB]', window.FLAB_VERSION, message, `${source}:${line}:${column}`, error);
    return false; // Don't prevent default error handling
  };

  window.addEventListener('unhandledrejection', event => {
    console.warn('[FLAB]', window.FLAB_VERSION, 'Unhandled Promise rejection:', event.reason);
  });
}

// Preload pitch assets to eliminate 404s
const preloadImg1 = new Image();
const preloadImg2 = new Image();
preloadImg1.src = PITCH_LAND;
preloadImg2.src = PITCH_PORT;

window.addEventListener('DOMContentLoaded', async () => {
  console.log('📄 DOM loaded, initializing modules...');

  // Preload arrow assets for markers and export parity
  await preloadArrowAssets(PASS_STYLES);

  // Preload arrow head symbols for transform-based heads
  const { preloadArrowHeads } = await import('./assets.arrows.js');
  await preloadArrowHeads();

  // Load user settings first
  loadSettings();

  // Initialize default formation if no players exist
  if (!FLAB.players || FLAB.players.length === 0) {
    applyPreset('4-3-3');
  }

  // Initialize core components
  ensureHalo();
  setOrientation(FLAB.orientation || 'landscape');
  relayoutAllPlayers();

  // Initialize interaction systems
  initDrag();
  initPassTool();
  initKeyboard();

  // Initialize pass layer (for audit)
  initPassLayer();

  // Wire up UI
  wireUI();
  wirePresetDropdown();
  wireEraseMenu();
  wirePassStyleMenu();

  // Initialize ball animation system
  import('./animate.js').then(({ ensureBallLayer, preloadBall }) => {
    ensureBallLayer(document.getElementById('arrow-layer'));
    preloadBall();
  });

  // Ensure proper layer ordering for ball visibility
  import('./render.js').then(({ ensureLayerOrder }) => {
    ensureLayerOrder();
  });

  // Assert overlay alignment at boot
  (() => {
    const field = document.querySelector('.flab-field');
    const overlay = document.getElementById('arrow-layer');
    const ok = overlay?.parentElement === field &&
               getComputedStyle(field).position === 'relative' &&
               getComputedStyle(overlay).position === 'absolute';
    if (!ok) console.error('Arrow overlay misaligned: place #arrow-layer inside .flab-field with position:absolute;inset:0');
  })();

  console.log(`✅ Formation Lab ${FLAB.version} ready!`);

  // Run audit on localhost/dev only
  if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
    setTimeout(() => runAudit(), 500); // Allow modules to fully initialize
  }
});