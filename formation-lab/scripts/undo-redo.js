// Undo/Redo System - Formation Lab v23.2+
// Provides undo/redo functionality for all user actions

import { FLAB } from './state.js';
import { relayoutAllPlayers } from './render.js';
import { renderArrows } from './pass.js';
import { announce } from './accessibility.js';
import { showToast } from './ui-toast.js';

/**
 * Maximum number of undo steps to keep in memory
 */
const MAX_UNDO_STEPS = 50;

/**
 * Undo/Redo stack manager
 */
class UndoRedoManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.isUndoingOrRedoing = false;
    this.enabled = true;
  }

  /**
   * Save current state to undo stack
   * @param {string} actionName - Human-readable action name
   */
  saveState(actionName = 'Action') {
    if (!this.enabled || this.isUndoingOrRedoing) {
      return;
    }

    // Create deep clone of current state
    const state = {
      timestamp: Date.now(),
      actionName,
      players: JSON.parse(JSON.stringify(FLAB.players || [])),
      arrows: JSON.parse(JSON.stringify(FLAB.arrows || [])),
      orientation: FLAB.orientation,
      mode: FLAB.mode,
      selectedPlayer: FLAB.selectedPlayer,
      passOrigin: FLAB.passOrigin
    };

    // Add to undo stack
    this.undoStack.push(state);

    // Limit stack size
    if (this.undoStack.length > MAX_UNDO_STEPS) {
      this.undoStack.shift();
    }

    // Clear redo stack when new action is performed
    this.redoStack = [];

    // Update UI
    this.updateUI();
  }

  /**
   * Undo last action
   * @returns {boolean} Success
   */
  undo() {
    if (!this.canUndo()) {
      showToast('Nothing to undo', 'info');
      return false;
    }

    this.isUndoingOrRedoing = true;

    // Save current state to redo stack
    const currentState = {
      timestamp: Date.now(),
      actionName: 'Current',
      players: JSON.parse(JSON.stringify(FLAB.players || [])),
      arrows: JSON.parse(JSON.stringify(FLAB.arrows || [])),
      orientation: FLAB.orientation,
      mode: FLAB.mode,
      selectedPlayer: FLAB.selectedPlayer,
      passOrigin: FLAB.passOrigin
    };
    this.redoStack.push(currentState);

    // Pop from undo stack
    const previousState = this.undoStack.pop();

    // Restore state
    this.restoreState(previousState);

    // Announce
    announce(`Undid: ${previousState.actionName}`, 'polite');
    showToast(`Undid: ${previousState.actionName}`, 'info');

    this.isUndoingOrRedoing = false;

    // Update UI
    this.updateUI();

    return true;
  }

  /**
   * Redo last undone action
   * @returns {boolean} Success
   */
  redo() {
    if (!this.canRedo()) {
      showToast('Nothing to redo', 'info');
      return false;
    }

    this.isUndoingOrRedoing = true;

    // Save current state to undo stack
    const currentState = {
      timestamp: Date.now(),
      actionName: 'Current',
      players: JSON.parse(JSON.stringify(FLAB.players || [])),
      arrows: JSON.parse(JSON.stringify(FLAB.arrows || [])),
      orientation: FLAB.orientation,
      mode: FLAB.mode,
      selectedPlayer: FLAB.selectedPlayer,
      passOrigin: FLAB.passOrigin
    };
    this.undoStack.push(currentState);

    // Pop from redo stack
    const nextState = this.redoStack.pop();

    // Restore state
    this.restoreState(nextState);

    // Announce
    announce(`Redid: ${nextState.actionName}`, 'polite');
    showToast(`Redid: ${nextState.actionName}`, 'info');

    this.isUndoingOrRedoing = false;

    // Update UI
    this.updateUI();

    return true;
  }

  /**
   * Restore a saved state
   * @param {Object} state - State to restore
   */
  restoreState(state) {
    // Restore players
    FLAB.players = JSON.parse(JSON.stringify(state.players));

    // Restore arrows
    FLAB.arrows = JSON.parse(JSON.stringify(state.arrows));

    // Restore other properties
    FLAB.orientation = state.orientation;
    FLAB.mode = state.mode;
    FLAB.selectedPlayer = state.selectedPlayer;
    FLAB.passOrigin = state.passOrigin;

    // Re-render
    relayoutAllPlayers();
    renderArrows();

    // Update mode UI
    const modeButtons = document.querySelectorAll('.flab-tool');
    modeButtons.forEach(btn => {
      const btnMode = btn.dataset.mode;
      if (btnMode === FLAB.mode) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  /**
   * Check if undo is available
   * @returns {boolean}
   */
  canUndo() {
    return this.enabled && this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   * @returns {boolean}
   */
  canRedo() {
    return this.enabled && this.redoStack.length > 0;
  }

  /**
   * Clear all undo/redo history
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.updateUI();
    console.log('Undo/redo history cleared');
  }

  /**
   * Temporarily disable undo/redo (e.g., during batch operations)
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Re-enable undo/redo
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Update UI buttons to reflect undo/redo availability
   */
  updateUI() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    if (undoBtn) {
      if (this.canUndo()) {
        undoBtn.disabled = false;
        undoBtn.removeAttribute('aria-disabled');
        undoBtn.title = `Undo: ${this.undoStack[this.undoStack.length - 1]?.actionName || 'Last action'}`;
      } else {
        undoBtn.disabled = true;
        undoBtn.setAttribute('aria-disabled', 'true');
        undoBtn.title = 'Nothing to undo';
      }
    }

    if (redoBtn) {
      if (this.canRedo()) {
        redoBtn.disabled = false;
        redoBtn.removeAttribute('aria-disabled');
        redoBtn.title = `Redo: ${this.redoStack[this.redoStack.length - 1]?.actionName || 'Last action'}`;
      } else {
        redoBtn.disabled = true;
        redoBtn.setAttribute('aria-disabled', 'true');
        redoBtn.title = 'Nothing to redo';
      }
    }
  }

  /**
   * Get undo stack size
   * @returns {number}
   */
  getUndoStackSize() {
    return this.undoStack.length;
  }

  /**
   * Get redo stack size
   * @returns {number}
   */
  getRedoStackSize() {
    return this.redoStack.length;
  }

  /**
   * Get list of recent actions
   * @param {number} count - Number of actions to retrieve
   * @returns {Array<string>}
   */
  getRecentActions(count = 5) {
    return this.undoStack
      .slice(-count)
      .reverse()
      .map(state => state.actionName);
  }
}

// Create singleton instance
export const undoManager = new UndoRedoManager();

/**
 * Initialize undo/redo system
 */
export function initUndoRedo() {
  console.log('🔄 Initializing undo/redo system...');

  // Add keyboard shortcuts
  document.addEventListener('keydown', handleUndoRedoKeys);

  // Undo/Redo buttons are already in HTML overlay at top right (#btnUndo, #btnRedo)
  // No need to create duplicate buttons in Tools panel

  // Initial UI update
  undoManager.updateUI();

  console.log('✅ Undo/redo system initialized');
}

/**
 * Handle keyboard shortcuts for undo/redo
 * @param {KeyboardEvent} event
 */
function handleUndoRedoKeys(event) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

  // Ctrl+Z / Cmd+Z - Undo
  if (ctrlKey && event.key === 'z' && !event.shiftKey) {
    event.preventDefault();
    undoManager.undo();
    return;
  }

  // Ctrl+Shift+Z / Cmd+Shift+Z - Redo
  if (ctrlKey && event.key === 'z' && event.shiftKey) {
    event.preventDefault();
    undoManager.redo();
    return;
  }

  // Ctrl+Y / Cmd+Y - Alternative redo (Windows style)
  if (ctrlKey && event.key === 'y' && !isMac) {
    event.preventDefault();
    undoManager.redo();
    return;
  }
}

/**
 * Add undo/redo buttons to the UI
 */
function addUndoRedoButtons() {
  // Check if buttons already exist
  if (document.getElementById('undo-btn')) {
    return;
  }

  // Find actions container
  const actionsContainer = document.querySelector('.flab-actions');
  if (!actionsContainer) {
    console.warn('Could not find .flab-actions container for undo/redo buttons');
    return;
  }

  // Create undo/redo button group
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'btn-group undo-redo-group';
  buttonGroup.style.cssText = 'display: flex; gap: 8px; margin-bottom: 12px;';

  // Undo button
  const undoBtn = document.createElement('button');
  undoBtn.id = 'undo-btn';
  undoBtn.className = 'flab-action';
  undoBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 8H13M3 8L7 4M3 8L7 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>Undo</span>
  `;
  undoBtn.title = 'Undo (Ctrl+Z)';
  undoBtn.setAttribute('aria-label', 'Undo last action');
  undoBtn.disabled = true;
  undoBtn.addEventListener('click', () => undoManager.undo());

  // Redo button
  const redoBtn = document.createElement('button');
  redoBtn.id = 'redo-btn';
  redoBtn.className = 'flab-action';
  redoBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 8H3M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>Redo</span>
  `;
  redoBtn.title = 'Redo (Ctrl+Shift+Z)';
  redoBtn.setAttribute('aria-label', 'Redo last undone action');
  redoBtn.disabled = true;
  redoBtn.addEventListener('click', () => undoManager.redo());

  // Add buttons to group
  buttonGroup.appendChild(undoBtn);
  buttonGroup.appendChild(redoBtn);

  // Insert at the beginning of actions container
  actionsContainer.insertBefore(buttonGroup, actionsContainer.firstChild);
}

/**
 * Helper function to save state with action name
 * @param {string} actionName - Human-readable action name
 */
export function saveUndoState(actionName) {
  undoManager.saveState(actionName);
}

/**
 * Helper function to perform undo
 * @returns {boolean} Success
 */
export function undo() {
  return undoManager.undo();
}

/**
 * Helper function to perform redo
 * @returns {boolean} Success
 */
export function redo() {
  return undoManager.redo();
}

/**
 * Helper function to clear undo/redo history
 */
export function clearUndoHistory() {
  undoManager.clear();
}

/**
 * Batch operation wrapper - disables undo during operation, then saves single state
 * @param {Function} operation - Operation to perform
 * @param {string} actionName - Name for the batch operation
 */
export async function batchOperation(operation, actionName) {
  undoManager.disable();
  try {
    await operation();
    undoManager.enable();
    undoManager.saveState(actionName);
  } catch (error) {
    undoManager.enable();
    throw error;
  }
}
// undoManager already exported as const at line 285
