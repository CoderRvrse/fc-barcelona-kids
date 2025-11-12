// Keyboard module for Formation Lab
import { FLAB } from './state.js';

// Global keyboard navigation
function handleGlobalKeydown(evt) {
  if (evt.key === "Escape") {
    // Import ui to hide help
    import('./ui.js').then(({ hideHelp }) => {
      hideHelp();
    });

    // Cancel any active drag or pass
    if (FLAB.drag || FLAB.passArm) {
      FLAB.drag = null;
      FLAB.passArm = null;

      // Import render to update
      import('./render.js').then(({ renderArrows }) => {
        renderArrows();
      });
    }

    return;
  }

  // Z key: Undo last pass
  if ((evt.key === "z" || evt.key === "Z") && !evt.ctrlKey && !evt.shiftKey && !evt.altKey && !evt.metaKey) {
    evt.preventDefault();

    import('./pass.js').then(({ clearLastPass, renderArrows }) => {
      if ((FLAB.arrows || []).length === 0) {
        import('./ui-toast.js').then(({ showToast }) => {
          showToast('No passes to undo');
        });
        return;
      }
      clearLastPass();
      renderArrows();
      import('./ui-toast.js').then(({ showToast }) => {
        showToast('⚠️ Undid last pass (cannot be undone with Redo)', 'warning');
      });
    });

    return;
  }

  if (evt.key === "Tab" && !evt.ctrlKey && !evt.altKey && !evt.metaKey) {
    // Cycle through players
    evt.preventDefault();
    const playerIds = FLAB.players.map(p => p.id).sort((a, b) => a - b);
    if (playerIds.length === 0) return;

    const currentIndex = playerIds.indexOf(FLAB.selectedId);
    const nextIndex = evt.shiftKey
      ? (currentIndex <= 0 ? playerIds.length - 1 : currentIndex - 1)
      : (currentIndex >= playerIds.length - 1 ? 0 : currentIndex + 1);

    FLAB.selectedId = playerIds[nextIndex];

    // Import render to update halo
    import('./render.js').then(({ updateHalo }) => {
      updateHalo();
    });

    // Focus the selected player
    const playerEl = document.querySelector(`.flab-player[data-id="${FLAB.selectedId}"]`);
    playerEl?.focus();

    return;
  }

  // Arrow key nudging for selected player
  if (FLAB.selectedId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(evt.key)) {
    evt.preventDefault();

    const player = FLAB.players.find(p => p.id === FLAB.selectedId);
    if (!player) return;

    const step = evt.shiftKey ? 0.1 : 0.01; // Large steps with Shift

    if (evt.key === "ArrowUp") player.ny -= step;
    if (evt.key === "ArrowDown") player.ny += step;
    if (evt.key === "ArrowLeft") player.nx -= step;
    if (evt.key === "ArrowRight") player.nx += step;

    // Clamp to bounds
    player.nx = Math.min(1, Math.max(0, player.nx));
    player.ny = Math.min(1, Math.max(0, player.ny));

    // Import render to update
    import('./render.js').then(({ renderPlayers, updateHalo, renderArrows }) => {
      renderPlayers();
      updateHalo();
      renderArrows();
    });
  }
}

// Initialize keyboard handling
export function initKeyboard() {
  document.addEventListener('keydown', handleGlobalKeydown);
  console.log('⌨️ Keyboard navigation initialized');
}

window.__mod_keyboard = true;