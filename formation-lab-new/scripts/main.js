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
import { initErrorHandler } from './error-handler.js';
import { initToastSystem } from './ui-toast.js';
import { initSpinnerSystem } from './loading-spinner.js';
import { initTouchGestures } from './touch-gestures.js';
import { initBottomSheetSystem } from './bottom-sheet.js';
import { initAccessibility, addLandmarks, addAriaLabels, addSkipLink } from './accessibility.js';
import { initUndoRedo, saveUndoState } from './undo-redo.js';
import { initTheme } from './theme.js';
import { initShare } from './share.js';
import { initFullscreen } from './fullscreen.js';
import { initPlayerEditor } from './player-editor.js';
import { initBorderAnimations } from './border-animations.js';

console.log(`🚀 Formation Lab ${FLAB.version} starting...`);

// Initialize error handling, toast notifications, loading spinners, bottom sheets, accessibility, and theme
initErrorHandler();
initToastSystem();
initSpinnerSystem();
initBottomSheetSystem();
initAccessibility();
initTheme(); // Initialize theme early to prevent flash

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
  initTouchGestures(); // Mobile touch gestures (pinch-zoom, long-press)

  // Initialize pass layer (for audit)
  initPassLayer();

  // Wire up UI
  wireUI();
  wirePresetDropdown();
  wireEraseMenu();
  wirePassStyleMenu();

  // Initialize accessibility features (ARIA landmarks, labels, skip link)
  addSkipLink();
  addLandmarks();
  addAriaLabels();

  // Initialize undo/redo system
  initUndoRedo();

  // Save initial state for undo/redo
  saveUndoState('Initial formation');

  // Initialize share system
  initShare();

  // Initialize fullscreen mode
  initFullscreen();

  // Initialize player editor (double-click to edit)
  initPlayerEditor();

  // Initialize border and corner animations
  initBorderAnimations();

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
