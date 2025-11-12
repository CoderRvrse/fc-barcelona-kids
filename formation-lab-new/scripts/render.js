// Render module for Formation Lab
import { FLAB } from './state.js';
import { n2p_view, p2n_view, clampPx } from './geometry.js';
import { playerEls } from './drag.js';

// SVG namespace constants
const SVG_NS = 'http://www.w3.org/2000/svg';

// Layer management for ball visibility
export function ensureLayer(id) {
  const svg = document.getElementById('arrow-layer');
  if (!svg) return null;

  let g = document.getElementById(id);
  if (!g) {
    g = document.createElementNS(SVG_NS, 'g');
    g.id = id;
    g.setAttribute('pointer-events', 'none');
    svg.appendChild(g);
  }
  return g;
}

export function ensureLayerOrder() {
  const svg = document.getElementById('arrow-layer');
  if (!svg) {
    console.warn('ensureLayerOrder: #arrow-layer not found');
    return;
  }

  // Get the existing arrow-group that has the transforms and clipping
  const arrowGroup = document.getElementById('arrow-group');
  if (!arrowGroup) {
    console.warn('ensureLayerOrder: #arrow-group not found');
    return;
  }

  // Create ball layer INSIDE the arrow-group (same coordinate space)
  let ballLayer = document.getElementById('ball-layer');
  if (!ballLayer) {
    ballLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    ballLayer.id = 'ball-layer';
    ballLayer.setAttribute('pointer-events', 'none');
  }

  // Ensure ball layer is the LAST child of arrow-group (paints on top)
  if (ballLayer.parentNode !== arrowGroup) {
    arrowGroup.appendChild(ballLayer);
  }

  // Create debug layer as sibling to arrow-group (outside clipping)
  let debugLayer = document.getElementById('arrow-debug-layer');
  if (!debugLayer) {
    debugLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    debugLayer.id = 'arrow-debug-layer';
    debugLayer.setAttribute('pointer-events', 'none');
    svg.appendChild(debugLayer);
  }

  console.log('🎨 Layer order ensured: ball-layer inside arrow-group (same transforms)');
}

// Utility functions for aim-assist
export function playerEl(id) {
  return document.querySelector(`.player[data-id="${id}"]`);
}

export function clearAimTags() {
  document.querySelectorAll('.player[data-aim]').forEach(n => n.removeAttribute('data-aim'));
}

// Keep players inside playable area by clamping their canonical coordinates
function clampPlayerCanonical(pl) {
  // project to current view → clamp px → convert back to canonical norm
  const p = n2p_view(pl.nx, pl.ny);
  const pc = clampPx(p.x, p.y);
  if (pc.x !== p.x || pc.y !== p.y) {
    const n = p2n_view(pc.x, pc.y);
    pl.nx = Math.min(1, Math.max(0, n.nx));
    pl.ny = Math.min(1, Math.max(0, n.ny));
  }
}

// Place player element using normalized coordinates
export function placePlayerEl(el, player) {
  const { x, y } = n2p_view(player.nx, player.ny);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

// Re-layout all players after resize/orientation change
export function relayoutAllPlayers() {
  // First clamp all players to ensure they stay inside playable area
  (FLAB.players || []).forEach(clampPlayerCanonical);

  // Then position the DOM elements
  for (const p of FLAB.players) {
    const el = document.querySelector(`.flab-player[data-id="${p.id}"]`);
    if (el) placePlayerEl(el, p);
  }
}

// Ensure halo exists and is properly configured
export function ensureHalo() {
  let halo = document.getElementById('flabHalo');
  if (!halo) {
    console.warn('Creating fallback halo element');
    halo = document.createElement('div');
    halo.id = 'flabHalo';
    halo.className = 'flab-halo';
    halo.style.cssText = 'position:absolute;width:56px;height:56px;pointer-events:none;opacity:0;';
    halo.setAttribute('aria-hidden', 'true');

    const field = document.getElementById('formationField');
    if (field) field.appendChild(halo);
  }

  // Ensure pointer events are disabled
  halo.style.pointerEvents = 'none';
  return halo;
}

export function updateHalo() {
  const halo = ensureHalo();
  if (!FLAB.selectedId) {
    halo.classList.remove("is-visible");
    return;
  }
  const player = FLAB.players.find(p => p.id === FLAB.selectedId);
  if (!player) {
    halo.classList.remove("is-visible");
    return;
  }
  const { x, y } = n2p_view(player.nx, player.ny);
  halo.style.left = `${x}px`;
  halo.style.top = `${y}px`;
  halo.classList.add("is-visible");
}

export function renderPlayers() {
  FLAB.players.forEach(player => {
    const el = playerEls.get(player.id);
    if (!el) return;
    placePlayerEl(el, player);
  });
}

export function renderArrows() {
  // Import and call renderArrows from pass module
  import('./pass.js').then(({ renderArrows }) => {
    renderArrows();
  });
}

// Resize handling
export function handleResize() {
  // Check if orientation needs adjustment (desktop stays landscape, mobile can rotate)
  import('./orientation.js').then(({ autoOrientation }) => {
    autoOrientation();
  });

  // Re-measure and re-layout everything
  relayoutAllPlayers();
  updateHalo();
  renderArrows();
}

window.__mod_render = true;