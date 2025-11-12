// UI module for Formation Lab
import { FLAB, set } from './state.js';
import { setOrientation, flipSides } from './orientation.js';
import { exportPNG } from './export.js';
import { applyPreset, snapshotCurrentPlayersCanonical, applyPlayersCanonical, PRESET_433 } from './presets.js';
import { saveSettings } from './persist.js';
import { savePreset, getDefaultPresetName, getPreset, setDefaultPreset, listPresets, deletePreset } from './storage.js';
import { logPresetSave, logPresetApply, logPresetSetDefault, logPresetDelete, logPresetManagement } from './logger.js';

// Toast notifications
export function showToast(message) {
  const toastHost = document.getElementById('toastHost');
  if (!toastHost) {
    console.log(message);
    return;
  }

  const toast = document.createElement('div');
  toast.className = 'flab-toast';
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  toastHost.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Mode switching
function setMode(mode) {
  const previous = FLAB.mode;
  const clamped = ['select', 'pass', 'erase'].includes(mode) ? mode : 'select';
  set('mode', clamped);

  // Update button states (both sidepanel and overlay)
  const toolButtons = document.querySelectorAll('.flab-tool[data-mode], .flab-overlay-btn[data-mode]');
  toolButtons.forEach(btn => {
    const pressed = btn.dataset.mode === FLAB.mode;
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
  });

  // Update arrow layer interactivity
  const arrowLayer = document.getElementById('arrow-layer');
  arrowLayer?.classList.toggle("is-interactive", FLAB.mode === "erase");

  if (previous !== FLAB.mode) {
    console.log(`Mode changed from ${previous} to ${FLAB.mode}`);
  }

  // Cancel any active interactions
  if (FLAB.mode !== "pass") {
    FLAB.passArm = null;
    // Clear aim-assist state when leaving pass mode
    import('./aim.js').then(({ resetAimRings, clearAim }) => {
      resetAimRings(FLAB.players);
      clearAim();
    });
  }

  // Clear drag state
  FLAB.drag = null;
}

// Formation reset
function resetFormation() {
  const name = getDefaultPresetName();
  if (name) {
    const p = getPreset(name);
    if (p) {
      applyPlayersCanonical(p.players);
      logPresetApply(name, p);
      showToast(`Formation reset to ${name}`);
      return;
    }
  }
  applyPlayersCanonical(PRESET_433);
  logPresetApply('4-3-3 (built-in)', { players: PRESET_433 });
  showToast("Formation reset to 4-3-3");
}

// Preset management helpers
function promptName(defaultName = 'My Preset') {
  const s = prompt('Preset name:', defaultName);
  return s && s.trim() ? s.trim() : null;
}

function handleSavePreset() {
  const name = promptName('4-3-3 tuned');
  if (!name) return;
  const snap = snapshotCurrentPlayersCanonical();
  savePreset(name, snap);
  logPresetSave(name, snap);
  // Optionally set as default immediately
  if (confirm(`Set "${name}" as default?`)) {
    setDefaultPreset(name);
    logPresetSetDefault(name);
  }
  showToast(`Preset saved: ${name}`);
}

function handleApplyDefault() {
  const name = getDefaultPresetName();
  if (!name) {
    alert('No default preset set yet. Save one first.');
    return;
  }
  const p = getPreset(name);
  if (!p) {
    alert('Default preset missing.');
    return;
  }
  applyPlayersCanonical(p.players);
  logPresetApply(name, p);
  showToast(`Applied preset: ${name}`);
}

// Preset management now handled by dropdown module
// Legacy function removed in favor of wirePresetDropdown()

// Help modal
function showHelp() {
  const helpOverlay = document.getElementById('helpOverlay');
  const helpButton = document.getElementById('helpButton');

  if (helpOverlay) {
    helpOverlay.setAttribute("aria-hidden", "false");
    helpButton?.setAttribute("aria-expanded", "true");

    // Focus the close button for accessibility
    const closeButton = helpOverlay.querySelector('.flab-help__close');
    closeButton?.focus();
  }
}

export function hideHelp() {
  const helpOverlay = document.getElementById('helpOverlay');
  const helpButton = document.getElementById('helpButton');

  if (helpOverlay) {
    helpOverlay.setAttribute("aria-hidden", "true");
    helpButton?.setAttribute("aria-expanded", "false");

    // Return focus to help button
    helpButton?.focus();
  }
}


// Acceptance logging
function logAcceptanceChecklist() {
  console.group('✅ Formation Lab v23.4 Acceptance Checklist');

  // Module checks
  const modules = ['state', 'geometry', 'drag', 'pass', 'render', 'orientation', 'export', 'ui'];
  modules.forEach(name => {
    const loaded = !!window[`__mod_${name}`];
    console.log(`📦 Module ${name}:`, loaded ? '✅ loaded' : '❌ missing');
  });

  // Core functionality checks
  console.log('🎯 Halo-edge origins:', !!document.getElementById('flabHalo') ? '✅ halo present' : '❌ missing');
  console.log('🖱️  Select/Drag mode:', FLAB.mode === 'select' ? '✅ active' : '⚠️  not active');
  const previewReady = !!document.querySelector('#arrow-layer #pass-preview');
  console.log('➡️  Pass tool:', previewReady ? '✅ preview ready' : '⚠️  preview missing');
  console.log('🔄 Orientation support:', FLAB.orientation ? `✅ ${FLAB.orientation}` : '❌ missing');
  console.log('📱 Service worker:', 'serviceWorker' in navigator ? '✅ supported' : '❌ not supported');
  console.log('🏷️  Version consistency:', window.FLAB_VERSION === FLAB.version ? '✅ matches' : '⚠️  mismatch');

  // State validation
  console.assert(!!window.FLAB && !!window.FLAB_VERSION, 'State/version missing');

  console.groupEnd();
}

// Wire up all UI interactions
export function wireUI() {
  // Mode buttons (sidepanel tools, overlay buttons, and undo/redo buttons)
  document.querySelectorAll('.flab-tool[data-mode], .flab-overlay-btn[data-mode], .flab-undo-redo-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      setMode(btn.dataset.mode);
    });
  });

  // Export button
  const exportButton = document.getElementById('exportButton');
  exportButton?.addEventListener('click', exportPNG);

  // Reset button
  const resetButton = document.getElementById('resetButton');
  resetButton?.addEventListener('click', resetFormation);

  // Controls tab button (Tools panel toggle)
  const btnControlsTab = document.getElementById('btnControlsTab');
  const pitchControlsSheet = document.getElementById('pitchControlsSheet');

  btnControlsTab?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = pitchControlsSheet?.classList.contains('is-open');

    if (isOpen) {
      // Close the panel
      pitchControlsSheet.classList.remove('is-open');
      btnControlsTab.setAttribute('aria-expanded', 'false');
    } else {
      // Open the panel
      pitchControlsSheet.classList.add('is-open');
      btnControlsTab.setAttribute('aria-expanded', 'true');
    }
  });

  // Preset buttons
  const btnSavePreset = document.getElementById('btnSavePreset');
  const btnApplyDefault = document.getElementById('btnApplyDefault');

  btnSavePreset?.addEventListener('click', handleSavePreset);
  btnApplyDefault?.addEventListener('click', handleApplyDefault);
  // Manage button now handled by preset dropdown module

  // Orientation buttons
  const btnLandscape = document.getElementById('btnLandscape');
  const btnPortrait = document.getElementById('btnPortrait');
  btnLandscape?.addEventListener('click', () => {
    // On desktop, landscape mode = fullscreen mode for better display
    import('./orientation.js').then(({ autoOrientation }) => {
      // Check if we're on desktop
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.screen.width <= 1024 || window.screen.height <= 1024;
      const mobilePattern = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileUA = mobilePattern.test(navigator.userAgent);
      const isMobile = (hasTouch && isSmallScreen) || isMobileUA;

      if (!isMobile) {
        // Desktop: trigger fullscreen instead
        import('./fullscreen.js').then(({ enterFullscreen }) => {
          enterFullscreen();
        });
      } else {
        // Mobile: just set orientation
        setOrientation('landscape');
        saveSettings({ orientation: 'landscape' });
      }
    });
  });
  btnPortrait?.addEventListener('click', () => {
    setOrientation('portrait');
    saveSettings({ orientation: 'portrait' });
  });

  // Flip sides button
  const btnFlip = document.getElementById('btnFlip');
  btnFlip?.addEventListener('click', flipSides);

  // Pass style dropdown now handled by pass style menu module

  // Aim-assist (read-only from localStorage; no UI control)
  try {
    const saved = localStorage.getItem('flab-aim-assist');
    if (saved !== null) {
      const enabled = JSON.parse(saved);
      import('./state.js').then(({ AIM }) => {
        AIM.enabled = enabled;
      });
    }
  } catch (e) {
    console.warn('Could not load aim-assist setting:', e);
  }

  // Help modal
  const helpButton = document.getElementById('helpButton');
  const closeHelpButton = document.getElementById('closeHelpButton');
  const helpOverlay = document.getElementById('helpOverlay');

  helpButton?.addEventListener('click', showHelp);
  closeHelpButton?.addEventListener('click', hideHelp);

  // Close help when clicking outside
  helpOverlay?.addEventListener('click', (evt) => {
    if (evt.target === helpOverlay) {
      hideHelp();
    }
  });


  // Resize handling with debouncing for better performance
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      import('./render.js').then(({ handleResize }) => {
        handleResize();
      });
    }, 16); // ~60fps throttling
  });

  // Undo/Redo buttons
  import('./undo-redo.js').then(({ undoManager }) => {
    const btnUndo = document.getElementById('btnUndo');
    const btnRedo = document.getElementById('btnRedo');

    if (btnUndo) {
      btnUndo.addEventListener('click', () => {
        undoManager.undo();
      });
    }

    if (btnRedo) {
      btnRedo.addEventListener('click', () => {
        undoManager.redo();
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoManager.undo();
      }
      // Redo: Ctrl+Y or Cmd+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        undoManager.redo();
      }
    });
  });

  // Close controls sheet when clicking on pitch
  const pitchWrapper = document.querySelector('.flab-pitch-wrapper');
  const pitchField = document.querySelector('.flab-field');

  pitchWrapper?.addEventListener('click', (e) => {
    // Don't close if clicking on a control button or the sheet itself
    if (e.target.closest('.flab-controls-tab') || e.target.closest('.flab-controls-sheet')) {
      return;
    }

    // Close the panel if it's open
    const pitchControlsSheet = document.getElementById('pitchControlsSheet');
    const btnControlsTab = document.getElementById('btnControlsTab');

    if (pitchControlsSheet?.classList.contains('is-open')) {
      pitchControlsSheet.classList.remove('is-open');
      btnControlsTab?.setAttribute('aria-expanded', 'false');
    }
  });

  // Wire up pass playback controls
  setupPassPlaybackControls();

  // Log acceptance checklist
  setTimeout(logAcceptanceChecklist, 1000);

  console.log('🎮 Formation Lab UI initialized');
}

// Ball playback diagnostics
function showBallPlaybackDiagnostics() {
  const ballLayer = document.getElementById('ball-layer');
  const arrowLayer = document.getElementById('arrow-layer');
  const arrowGroup = document.getElementById('arrow-group');
  const debugLayer = document.getElementById('arrow-debug-layer') || document.getElementById('ball-debug');

  const ballChildren = ballLayer?.children?.length || 0;
  const debugChildren = debugLayer?.children?.length || 0;
  const arrowChildren = arrowLayer?.children?.length || 0;
  const arrowGroupChildren = arrowGroup?.children?.length || 0;

  const lastPassPath = document.querySelector('#arrow-group [data-arrow-id] path') ||
                      document.querySelector('#arrow-layer [data-arrow-id] path');
  const lastPassLength = lastPassPath ? lastPassPath.getTotalLength().toFixed(1) + 'px' : 'No paths found';

  const layerOrder = [];
  if (arrowLayer) {
    Array.from(arrowLayer.children).forEach((child, i) => {
      layerOrder.push(`${i}: ${child.id || child.tagName}`);
    });
  }

  const arrowGroupOrder = [];
  if (arrowGroup) {
    Array.from(arrowGroup.children).forEach((child, i) => {
      arrowGroupOrder.push(`  ${i}: ${child.id || child.tagName || 'unnamed'}`);
    });
  }

  const ballParent = ballLayer?.parentNode?.id || 'unknown';

  const report = `Ball Playback Diagnostics:

🎯 Layer Status:
• Ball layer children: ${ballChildren}
• Ball layer parent: ${ballParent}
• Debug layer children: ${debugChildren}
• Arrow layer children: ${arrowChildren}
• Arrow group children: ${arrowGroupChildren}
• Last pass path length: ${lastPassLength}

📐 SVG Structure:
#arrow-layer children:
${layerOrder.join('\n')}

#arrow-group children:
${arrowGroupOrder.join('\n')}

🔧 Asset Status:
• Ball URL: ${FLAB.assets?.ballUrl || 'Not set'}
• Ball asset exists: ${!!document.querySelector('[href*="Soccer-ball"]')}

💭 Current State:
• Pass count: ${FLAB.arrows?.length || 0}
• Current mode: ${FLAB.mode}
• Animation playing: ${window.currentAnimController ? 'Yes' : 'No'}`;

  console.log(report);
  showToast('Diagnostics logged to console 🔍');
}

// Pass playback controls
function setupPassPlaybackControls() {
  const controls = document.getElementById('passPlaybackControls');
  const btnPlayLast = document.getElementById('btnPlayLast');
  const btnPlayAll = document.getElementById('btnPlayAll');
  const btnStopPlayback = document.getElementById('btnStopPlayback');
  const btnDiagnostics = document.getElementById('btnDiagnostics');

  if (!controls || !btnPlayLast || !btnPlayAll || !btnStopPlayback) {
    console.warn('Pass playback controls not found');
    return;
  }

  let currentController = null;

  // Update control states
  function updateControlStates() {
    import('./pass.js').then(({ getAllPassIds }) => {
      const passIds = getAllPassIds();
      const hasPassses = passIds.length > 0;

      // Show/hide controls based on whether there are passes
      controls.style.display = hasPassses ? 'flex' : 'none';

      if (hasPassses) {
        btnPlayLast.disabled = false;
        btnPlayAll.disabled = false;
      } else {
        btnPlayLast.disabled = true;
        btnPlayAll.disabled = true;
      }
    });

    import('./animate.js').then(({ isPlaying }) => {
      const playing = isPlaying();
      btnStopPlayback.disabled = !playing;
    });
  }

  // Play last pass
  btnPlayLast.addEventListener('click', async () => {
    try {
      const { playPass } = await import('./animate.js');

      const lastId = FLAB.lastPassId;
      if (!lastId) {
        showToast('No recent pass to play');
        return;
      }

      const passData = FLAB.arrows.find(arrow => arrow.id === lastId);
      if (passData) {
        await playPass(passData);
        updateControlStates();
      }
    } catch (e) {
      console.warn('Play last pass failed:', e);
    }
  });

  // Play all passes
  btnPlayAll.addEventListener('click', async () => {
    try {
      const { getAllPassIds } = await import('./pass.js');
      const { queuePasses } = await import('./animate.js');

      const allIds = getAllPassIds();
      if (allIds.length > 0) {
        currentController = await queuePasses(allIds);
        updateControlStates();
      }
    } catch (e) {
      console.warn('Play all passes failed:', e);
    }
  });

  // Stop playback
  btnStopPlayback.addEventListener('click', async () => {
    try {
      const { stopPlayback } = await import('./animate.js');
      stopPlayback('user-request');
      currentController = null;
      updateControlStates();
    } catch (e) {
      console.warn('Stop playback failed:', e);
    }
  });

  // Diagnostics
  if (btnDiagnostics) {
    btnDiagnostics.addEventListener('click', () => {
      showBallPlaybackDiagnostics();
    });
  }

  document.querySelectorAll('[data-proxy]').forEach(btn => {
    const targetSelector = btn.getAttribute('data-proxy');
    if (!targetSelector) return;
    btn.addEventListener('click', () => {
      const target = document.querySelector(targetSelector);
      if (target) {
        target.click();
      }
    });
  });

  // Pass click handling for one-click play
  const arrowLayer = document.getElementById('arrow-layer');
  if (arrowLayer) {
    arrowLayer.addEventListener('click', async (evt) => {
      // Find clicked pass element
      const passElement = evt.target.closest('[data-arrow-id]');
      if (!passElement) return;

      const passId = passElement.dataset.arrowId;
      if (!passId) return;

      try {
        // Clear any existing highlights
        const { clearPassHighlight, highlightPass } = await import('./pass.js');
        clearPassHighlight();

        // Highlight the clicked pass
        highlightPass(passId);

        // Play the pass
        const { playPass } = await import('./animate.js');
        const passData = FLAB.arrows.find(arrow => arrow.id.toString() === passId.toString());
        if (passData) {
          await playPass(passData);
        }
      } catch (e) {
        console.warn('Pass click play failed:', e);
      }
    });
  }

  // Listen for pass commits to update controls
  window.addEventListener('flab:pass', () => {
    setTimeout(updateControlStates, 100); // Small delay to ensure DOM is updated
  });

  // Listen for playback end to update controls
  window.addEventListener('flab:replay-end', () => {
    currentController = null;
    updateControlStates();
  });

  // Initial state update
  setTimeout(updateControlStates, 500);
}

window.__mod_ui = true;
