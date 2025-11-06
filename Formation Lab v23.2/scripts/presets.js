// Formation presets module for Formation Lab
import { FLAB } from './state.js';
import { p2n_view } from './geometry.js';
import { relayoutAllPlayers } from './render.js';

// Formation presets in normalized canonical coordinates
const FORMATIONS = {
  '4-3-3': [
    { id: 1, role: "GK", nx: 0.1, ny: 0.5 },
    { id: 2, role: "DF", nx: 0.25, ny: 0.24 },  // LB nudged inward from 0.2 to 0.24
    { id: 3, role: "DF", nx: 0.25, ny: 0.76 },  // RB nudged inward from 0.8 to 0.76
    { id: 4, role: "DF", nx: 0.35, ny: 0.35 },
    { id: 5, role: "DF", nx: 0.35, ny: 0.65 },
    { id: 6, role: "MF", nx: 0.55, ny: 0.3 },
    { id: 7, role: "MF", nx: 0.55, ny: 0.7 },
    { id: 8, role: "MF", nx: 0.65, ny: 0.5 },
    { id: 9, role: "FW", nx: 0.8, ny: 0.35 },
    { id: 10, role: "FW", nx: 0.8, ny: 0.65 },
    { id: 11, role: "FW", nx: 0.9, ny: 0.5 }
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