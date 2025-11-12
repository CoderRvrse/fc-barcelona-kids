// State module for Formation Lab
// Hardened number utilities
function safeNumber(v, def=0) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : def;
  }
  return def;
}

// Global runtime state with safe defaults
export const FLAB = (window.FLAB = window.FLAB || {
  version: window.FLAB_VERSION || 'v23.4',
  mode: 'select',                // 'select' | 'pass' | 'erase'
  orientation: 'landscape',      // 'landscape' | 'portrait'
  passStyle: 'solid',            // 'solid' | 'dashed' | 'comic-flat' | 'comic-halftone'
  passWidth: safeNumber(window.FLAB?.passWidth, 4),
  players: [],                   // {id, role, nx, ny, ...}
  arrows: [],                    // current saved arrows
  selectedId: null,
  drag: null,
  passArm: null,
  previewPath: null,
  arrowCounter: safeNumber(window.FLAB?.arrowCounter, 1),
  lastPassId: null               // last committed pass for "Play Last" functionality
});

// Preserve existing properties if they already exist
FLAB.passStyle = FLAB.passStyle || 'solid';
FLAB.passWidth = safeNumber(FLAB.passWidth, 4);
FLAB.orientation = FLAB.orientation || 'landscape';
FLAB.mode = FLAB.mode || 'select';
FLAB.players = FLAB.players || [];
FLAB.arrows = FLAB.arrows || [];
FLAB.selectedId = FLAB.selectedId || null;
FLAB.drag = FLAB.drag || null;
FLAB.passArm = FLAB.passArm || null;
FLAB.previewPath = FLAB.previewPath || null;
FLAB.arrowCounter = safeNumber(FLAB.arrowCounter, 1);

// Simple helpers (no reactivity framework)
export const set = (k, v) => { FLAB[k] = v; return FLAB; };
export const get = (k) => FLAB[k];

// Player utilities
export const getPlayer = (id) => FLAB.players.find(p => p.id.toString() === id.toString());

// Aim-assist configuration
export const AIM = {
  enabled: true,   // internal only
  radius: 80,      // px, view-space
  hysteresis: 18,  // px beyond radius to unlock
  delay: 60        // ms before lock promotion
};

// one live aim session per drag - attached to FLAB for easy access
if (!window.FLAB.aim) {
  window.FLAB.aim = {
    candidateId: null,
    lockedId: null,
    showAt: 0
  };
}

// Legacy export for compatibility
export const aimState = window.FLAB.aim;

// Pass styling configuration
const existingPass = window.PASS || {};
export const PASS = Object.assign(existingPass, {
  style: existingPass.style || FLAB.passStyle || 'solid',
  color: existingPass.color || '#ffd166',
  outline: existingPass.outline || '#1d1300',
  recent: Array.isArray(existingPass.recent) ? existingPass.recent.slice(0, 3) : []
});
window.PASS = PASS;

// Legacy aim state - replaced by aimState export

// Pass style definitions (3 styles matching our arrow SVGs)
export const PASS_STYLES = [
  { key: 'solid', label: 'Solid', asset: 'assets/arrows/head-solid.svg' },
  { key: 'comic-flat', label: 'Comic Flat', asset: 'assets/arrows/head-comic-flat.svg' },
  { key: 'comic-halftone', label: 'Comic Halftone', asset: 'assets/arrows/head-comic-halftone.svg' },
];

// Canonical head registry with proper sizing specifications
export const HEADS = /** @type {const} */ ({
  'solid':         { key:'solid',         file:'assets/arrows/head-solid.svg',         baseSize: 24, overlap: 2 },
  'comic-flat':    { key:'comic-flat',    file:'assets/arrows/head-comic-flat.svg',    baseSize: 24, overlap: 2 },
  'comic-halftone':{ key:'comic-halftone', file:'assets/arrows/head-comic-halftone.svg',baseSize: 24, overlap: 2 },
});

export function headSpec(style){ return HEADS[style] ?? HEADS['solid']; }

// Pitch asset paths (single source of truth)
export const PITCH_LAND = 'assets/landscape/pitch-landscape.svg';
export const PITCH_PORT = 'assets/portrait/pitch-portrait.svg';
export const BALL_SVG = 'assets/balls/Soccer-ball-1.svg';

// Assets object for global access
FLAB.assets = FLAB.assets || {
  ballUrl: BALL_SVG
};

window.__PITCH = { PITCH_LAND, PITCH_PORT }; // dev visibility

// Legacy alias for backward compatibility
window.state = FLAB;

window.__mod_state = true;