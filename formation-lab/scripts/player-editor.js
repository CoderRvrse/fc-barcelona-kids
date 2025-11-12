// Player jersey editor module for Formation Lab
import { FLAB, set } from './state.js';

let editorDialog = null;
let currentEditingPlayerId = null;

/**
 * Show player editor dialog
 */
function showPlayerEditor(playerId) {
  const player = FLAB.players.find(p => p.id === playerId);
  if (!player) return;

  currentEditingPlayerId = playerId;

  // Remove existing dialog if any
  if (editorDialog) {
    editorDialog.remove();
  }

  // Create dialog
  editorDialog = document.createElement('div');
  editorDialog.className = 'player-editor-dialog';
  editorDialog.innerHTML = `
    <div class="player-editor-backdrop"></div>
    <div class="player-editor-content">
      <h3>Edit Player ${playerId}</h3>
      <div class="player-editor-form">
        <label for="playerNumber">Jersey Number:</label>
        <input
          type="text"
          id="playerNumber"
          maxlength="3"
          value="${player.jerseyNumber || playerId}"
          placeholder="${playerId}"
        />

        <label for="playerName">Player Name (optional):</label>
        <input
          type="text"
          id="playerName"
          maxlength="20"
          value="${player.playerName || ''}"
          placeholder="e.g., Smith"
        />
      </div>
      <div class="player-editor-actions">
        <button type="button" class="player-editor-btn player-editor-btn--cancel">Cancel</button>
        <button type="button" class="player-editor-btn player-editor-btn--save">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(editorDialog);

  // Focus first input
  setTimeout(() => {
    const numberInput = editorDialog.querySelector('#playerNumber');
    if (numberInput) {
      numberInput.focus();
      numberInput.select();
    }
  }, 100);

  // Wire up events
  const backdrop = editorDialog.querySelector('.player-editor-backdrop');
  const cancelBtn = editorDialog.querySelector('.player-editor-btn--cancel');
  const saveBtn = editorDialog.querySelector('.player-editor-btn--save');
  const numberInput = editorDialog.querySelector('#playerNumber');
  const nameInput = editorDialog.querySelector('#playerName');

  backdrop.addEventListener('click', closePlayerEditor);
  cancelBtn.addEventListener('click', closePlayerEditor);
  saveBtn.addEventListener('click', savePlayerEdits);

  // Save on Enter
  numberInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      savePlayerEdits();
    } else if (e.key === 'Escape') {
      closePlayerEditor();
    }
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      savePlayerEdits();
    } else if (e.key === 'Escape') {
      closePlayerEditor();
    }
  });
}

/**
 * Save player edits
 */
function savePlayerEdits() {
  if (!editorDialog || currentEditingPlayerId === null) return;

  const numberInput = editorDialog.querySelector('#playerNumber');
  const nameInput = editorDialog.querySelector('#playerName');

  const jerseyNumber = numberInput.value.trim() || String(currentEditingPlayerId);
  const playerName = nameInput.value.trim();

  // Update player data
  const player = FLAB.players.find(p => p.id === currentEditingPlayerId);
  if (player) {
    player.jerseyNumber = jerseyNumber;
    player.playerName = playerName;
  }

  // Update DOM element
  updatePlayerElement(currentEditingPlayerId);

  // Save to settings
  import('./persist.js').then(({ saveSettings }) => {
    saveSettings({});
  });

  closePlayerEditor();
}

/**
 * Close player editor dialog
 */
function closePlayerEditor() {
  if (editorDialog) {
    editorDialog.remove();
    editorDialog = null;
  }
  currentEditingPlayerId = null;
}

/**
 * Update player element in DOM
 */
function updatePlayerElement(playerId) {
  const player = FLAB.players.find(p => p.id === playerId);
  if (!player) return;

  const el = document.querySelector(`.flab-player[data-id="${playerId}"]`);
  if (!el) return;

  const numSpan = el.querySelector('.num');
  if (!numSpan) return;

  // Update jersey number
  const displayNumber = player.jerseyNumber || playerId;
  numSpan.textContent = displayNumber;

  // Add/update player name if provided
  let nameSpan = el.querySelector('.player-name');
  if (player.playerName) {
    if (!nameSpan) {
      nameSpan = document.createElement('span');
      nameSpan.className = 'player-name';
      el.appendChild(nameSpan);
    }
    nameSpan.textContent = player.playerName;
  } else if (nameSpan) {
    // Remove name if cleared
    nameSpan.remove();
  }
}

/**
 * Initialize player editor
 */
export function initPlayerEditor() {
  // Add double-click handler to all players
  document.addEventListener('dblclick', (e) => {
    const playerEl = e.target.closest('.flab-player');
    if (playerEl) {
      e.preventDefault();
      const playerId = parseInt(playerEl.dataset.id);
      if (!isNaN(playerId)) {
        showPlayerEditor(playerId);
      }
    }
  });

  // Also update existing players on init
  FLAB.players.forEach(player => {
    if (player.jerseyNumber || player.playerName) {
      updatePlayerElement(player.id);
    }
  });

  console.log('✅ Player editor initialized (Double-click players to edit)');
}

window.__mod_player_editor = true;
