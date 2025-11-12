// Formation presets module for Formation Lab
import { FLAB } from './state.js';
import { p2n_view } from './geometry.js';
import { relayoutAllPlayers } from './render.js';
import { saveUndoState } from './undo-redo.js';

// Formation presets in normalized canonical coordinates
const FORMATIONS = {
  '4-3-3': [
    { id: 1, role: "GK", nx: 0.1, ny: 0.5 },
    { id: 2, role: "DF", nx: 0.25, ny: 0.24 },
    { id: 3, role: "DF", nx: 0.25, ny: 0.76 },
    { id: 4, role: "DF", nx: 0.35, ny: 0.35 },
    { id: 5, role: "DF", nx: 0.35, ny: 0.65 },
    { id: 6, role: "MF", nx: 0.55, ny: 0.3 },
    { id: 7, role: "MF", nx: 0.55, ny: 0.7 },
    { id: 8, role: "MF", nx: 0.65, ny: 0.5 },
    { id: 9, role: "FW", nx: 0.8, ny: 0.35 },
    { id: 10, role: "FW", nx: 0.8, ny: 0.65 },
    { id: 11, role: "FW", nx: 0.9, ny: 0.5 }
  ],

  '4-3-3 Attacking': [
    { id: 1, role: "GK", nx: 0.1, ny: 0.5 },
    { id: 2, role: "DF", nx: 0.22, ny: 0.2 },  // Wide fullbacks
    { id: 3, role: "DF", nx: 0.22, ny: 0.8 },
    { id: 4, role: "DF", nx: 0.3, ny: 0.38 },
    { id: 5, role: "DF", nx: 0.3, ny: 0.62 },
    { id: 6, role: "MF", nx: 0.58, ny: 0.25 },  // Advanced midfield
    { id: 7, role: "MF", nx: 0.58, ny: 0.75 },
    { id: 8, role: "MF", nx: 0.7, ny: 0.5 },    // Advanced playmaker
    { id: 9, role: "FW", nx: 0.85, ny: 0.3 },
    { id: 10, role: "FW", nx: 0.85, ny: 0.7 },
    { id: 11, role: "FW", nx: 0.92, ny: 0.5 }
  ],

  '4-3-3 Defensive': [
    { id: 1, role: "GK", nx: 0.1, ny: 0.5 },
    { id: 2, role: "DF", nx: 0.28, ny: 0.22 },  // Defensive fullbacks
    { id: 3, role: "DF", nx: 0.28, ny: 0.78 },
    { id: 4, role: "DF", nx: 0.32, ny: 0.38 },
    { id: 5, role: "DF", nx: 0.32, ny: 0.62 },
    { id: 6, role: "MF", nx: 0.48, ny: 0.35 },  // Deep midfield
    { id: 7, role: "MF", nx: 0.48, ny: 0.65 },
    { id: 8, role: "MF", nx: 0.55, ny: 0.5 },   // Holding mid
    { id: 9, role: "FW", nx: 0.75, ny: 0.35 },
    { id: 10, role: "FW", nx: 0.75, ny: 0.65 },
    { id: 11, role: "FW", nx: 0.88, ny: 0.5 }
  ],

  '4-4-2 Classic': [
    { id: 1, role: "GK", nx: 0.1, ny: 0.5 },
    { id: 2, role: "DF", nx: 0.25, ny: 0.22 },  // LB
    { id: 3, role: "DF", nx: 0.25, ny: 0.78 },  // RB
    { id: 4, role: "DF", nx: 0.3, ny: 0.38 },   // CB
    { id: 5, role: "DF", nx: 0.3, ny: 0.62 },   // CB
    { id: 6, role: "MF", nx: 0.55, ny: 0.2 },   // LM
    { id: 7, role: "MF", nx: 0.55, ny: 0.8 },   // RM
    { id: 8, role: "MF", nx: 0.55, ny: 0.4 },   // CM
    { id: 9, role: "MF", nx: 0.55, ny: 0.6 },   // CM
    { id: 10, role: "FW", nx: 0.82, ny: 0.38 }, // ST
    { id: 11, role: "FW", nx: 0.82, ny: 0.62 }  // ST
  ],

  '4-2-3-1 Modern': [
    { id: 1, role: "GK", nx: 0.1, ny: 0.5 },
    { id: 2, role: "DF", nx: 0.25, ny: 0.22 },  // LB
    { id: 3, role: "DF", nx: 0.25, ny: 0.78 },  // RB
    { id: 4, role: "DF", nx: 0.3, ny: 0.38 },   // CB
    { id: 5, role: "DF", nx: 0.3, ny: 0.62 },   // CB
    { id: 6, role: "MF", nx: 0.48, ny: 0.4 },   // CDM
    { id: 7, role: "MF", nx: 0.48, ny: 0.6 },   // CDM
    { id: 8, role: "MF", nx: 0.68, ny: 0.25 },  // CAM Left
    { id: 9, role: "MF", nx: 0.68, ny: 0.75 },  // CAM Right
    { id: 10, role: "MF", nx: 0.68, ny: 0.5 },  // CAM Center
    { id: 11, role: "FW", nx: 0.88, ny: 0.5 }   // ST
  ],

  '3-5-2 Wingback': [
    { id: 1, role: "GK", nx: 0.1, ny: 0.5 },
    { id: 2, role: "DF", nx: 0.28, ny: 0.3 },   // CB Left
    { id: 3, role: "DF", nx: 0.28, ny: 0.7 },   // CB Right
    { id: 4, role: "DF", nx: 0.3, ny: 0.5 },    // CB Center
    { id: 5, role: "MF", nx: 0.5, ny: 0.15 },   // LWB
    { id: 6, role: "MF", nx: 0.5, ny: 0.85 },   // RWB
    { id: 7, role: "MF", nx: 0.55, ny: 0.4 },   // CM
    { id: 8, role: "MF", nx: 0.55, ny: 0.6 },   // CM
    { id: 9, role: "MF", nx: 0.65, ny: 0.5 },   // CAM
    { id: 10, role: "FW", nx: 0.85, ny: 0.4 },  // ST
    { id: 11, role: "FW", nx: 0.85, ny: 0.6 }   // ST
  ],

  '5-3-2 Defensive': [
    { id: 1, role: "GK", nx: 0.1, ny: 0.5 },
    { id: 2, role: "DF", nx: 0.28, ny: 0.18 },  // LWB
    { id: 3, role: "DF", nx: 0.28, ny: 0.82 },  // RWB
    { id: 4, role: "DF", nx: 0.32, ny: 0.32 },  // CB Left
    { id: 5, role: "DF", nx: 0.32, ny: 0.68 },  // CB Right
    { id: 6, role: "DF", nx: 0.32, ny: 0.5 },   // CB Center
    { id: 7, role: "MF", nx: 0.55, ny: 0.35 },  // CM
    { id: 8, role: "MF", nx: 0.55, ny: 0.65 },  // CM
    { id: 9, role: "MF", nx: 0.6, ny: 0.5 },    // CM Center
    { id: 10, role: "FW", nx: 0.82, ny: 0.4 },  // ST
    { id: 11, role: "FW", nx: 0.82, ny: 0.6 }   // ST
  ],

  '4-1-4-1 Holding': [
    { id: 1, role: "GK", nx: 0.1, ny: 0.5 },
    { id: 2, role: "DF", nx: 0.25, ny: 0.22 },  // LB
    { id: 3, role: "DF", nx: 0.25, ny: 0.78 },  // RB
    { id: 4, role: "DF", nx: 0.3, ny: 0.38 },   // CB
    { id: 5, role: "DF", nx: 0.3, ny: 0.62 },   // CB
    { id: 6, role: "MF", nx: 0.45, ny: 0.5 },   // CDM (Holding)
    { id: 7, role: "MF", nx: 0.6, ny: 0.25 },   // LM
    { id: 8, role: "MF", nx: 0.6, ny: 0.75 },   // RM
    { id: 9, role: "MF", nx: 0.62, ny: 0.42 },  // CM
    { id: 10, role: "MF", nx: 0.62, ny: 0.58 }, // CM
    { id: 11, role: "FW", nx: 0.88, ny: 0.5 }   // ST
  ],

  '3-4-3 Attacking': [
    { id: 1, role: "GK", nx: 0.1, ny: 0.5 },
    { id: 2, role: "DF", nx: 0.28, ny: 0.32 },  // CB Left
    { id: 3, role: "DF", nx: 0.28, ny: 0.68 },  // CB Right
    { id: 4, role: "DF", nx: 0.28, ny: 0.5 },   // CB Center
    { id: 5, role: "MF", nx: 0.52, ny: 0.18 },  // LM
    { id: 6, role: "MF", nx: 0.52, ny: 0.82 },  // RM
    { id: 7, role: "MF", nx: 0.55, ny: 0.42 },  // CM
    { id: 8, role: "MF", nx: 0.55, ny: 0.58 },  // CM
    { id: 9, role: "FW", nx: 0.82, ny: 0.3 },   // LW
    { id: 10, role: "FW", nx: 0.82, ny: 0.7 },  // RW
    { id: 11, role: "FW", nx: 0.9, ny: 0.5 }    // ST
  ]
};

// Upgrade legacy coordinates helper
function upgradeLegacyXY(p) {
  if (p.nx == null || p.ny == null) {
    p.nx = 0.5;
    p.ny = 0.5;
    delete p.x;
    delete p.y;
  }
}

// Apply a formation preset
export function applyPreset(name) {
  const formation = FORMATIONS[name];
  if (!formation) {
    console.warn(`Unknown formation preset: ${name}`);
    return;
  }

  // Reset state
  FLAB.players = formation.map(slot => ({
    id: slot.id,
    role: slot.role,
    nx: slot.nx,
    ny: slot.ny
  }));

  FLAB.players.forEach(upgradeLegacyXY);
  FLAB.arrows = [];
  FLAB.arrowCounter = 1;
  FLAB.selectedId = null;
  FLAB.drag = null;
  FLAB.passArm = null;

  // Import and reinitialize drag system
  import('./drag.js').then(({ initDrag }) => {
    initDrag();
  });

  console.log(`📋 Applied formation preset: ${name}`);

  // Save state for undo
  saveUndoState(`Apply preset: ${name}`);
}

// Get available preset names
export function getPresetNames() {
  return Object.keys(FORMATIONS);
}

// Canonical snapshot from current view
export function snapshotCurrentPlayersCanonical() {
  // convert current DOM/view positions back to canonical nx,ny
  return (FLAB.players || []).map(p => {
    // If DOM moved without committing nx,ny, we still pull from layout:
    const el = document.querySelector(`.player[data-id="${p.id}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      const f = document.querySelector('.flab-field').getBoundingClientRect();
      const cx = (r.left - f.left) + r.width / 2;
      const cy = (r.top - f.top) + r.height / 2;
      const canon = p2n_view(cx, cy);
      return { id: p.id, nx: canon.nx, ny: canon.ny };
    }
    return { id: p.id, nx: p.nx, ny: p.ny };
  });
}

// Apply preset (replaces current 4-3-3 positions)
export function applyPlayersCanonical(players) {
  const byId = Object.fromEntries(players.map(p => [String(p.id), p]));
  (FLAB.players || []).forEach(p => {
    const q = byId[String(p.id)];
    if (q) {
      p.nx = q.nx;
      p.ny = q.ny;
    }
  });
  relayoutAllPlayers();
}

// Export built-in formation for fallback
export const PRESET_433 = FORMATIONS['4-3-3'];

window.__mod_presets = true;