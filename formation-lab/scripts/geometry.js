// Geometry module for Formation Lab
import { FLAB } from './state.js';

// Hardened number utilities
function safeNumber(v, def=0) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : def;
  }
  return def;
}

function safeMath(a, b, op, def=0) {
  const sa = safeNumber(a, 0);
  const sb = safeNumber(b, 0);
  const result = op(sa, sb);
  return Number.isFinite(result) ? result : def;
}

function safeHypot(dx, dy) {
  const sdx = safeNumber(dx, 0);
  const sdy = safeNumber(dy, 0);
  const result = Math.sqrt(sdx * sdx + sdy * sdy);
  return Number.isFinite(result) && result > 0 ? result : 1;
}

export function cssNumber(v, def=0){ const n = parseFloat(v); return Number.isFinite(n)?n:def; }

export function getVar(name, def=0){
  return cssNumber(getComputedStyle(document.documentElement).getPropertyValue(name), def);
}

export function unit(ax,ay,bx,by){ const dx=bx-ax, dy=by-ay, d=safeHypot(dx,dy); return {ux:dx/d, uy:dy/d}; }

export function insetFromA(ax,ay,bx,by,inset){
  const {ux,uy} = unit(ax,ay,bx,by);
  return { x: ax + ux*inset, y: ay + uy*inset };
}

export function insetFromB(ax,ay,bx,by,inset){
  const {ux,uy} = unit(bx,by,ax,ay); // from B toward A
  return { x: bx + ux*inset, y: by + uy*inset };
}

// Blending helpers for aim-assist
export const mix = (a, b, t) => a + (b - a) * t;
export const mixPt = (A, B, t) => ({ x: mix(A.x, B.x, t), y: mix(A.y, B.y, t) });
export function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// Orientation transforms
export function normToView(nx, ny){
  if (FLAB.orientation === 'landscape') return {vx:nx, vy:ny};
  // portrait = rotate 90° CCW around center
  return {vx: ny, vy: 1 - nx};
}

export function viewToNorm(vx, vy){
  if (FLAB.orientation === 'landscape') return {nx:vx, ny:vy};
  // inverse of above rotation
  return {nx: 1 - vy, ny: vx};
}

// Playable rectangle calculations
const BLEED = {
  landscape: { left: 24, right: 24, top: 24, bottom: 24 },
  portrait:  { left: 24, right: 24, top: 28, bottom: 28 }
};

function isPortrait() {
  const field = document.querySelector('.flab-field');
  return field?.classList.contains('is-portrait');
}

export function playableRect() {
  const field = document.querySelector('.flab-field');
  const w = safeNumber(field?.clientWidth, 800);
  const h = safeNumber(field?.clientHeight, 600);
  const b = isPortrait() ? BLEED.portrait : BLEED.landscape;
  return {
    x: safeNumber(b.left, 0),
    y: safeNumber(b.top, 0),
    w: Math.max(1, safeNumber(w - b.left - b.right, 100)),
    h: Math.max(1, safeNumber(h - b.top - b.bottom, 100))
  };
}

// Convert between normalized [0,1] and CSS px inside playable rect
export function n2p(nx, ny) {
  const r = playableRect();
  const snx = safeNumber(nx, 0.5);
  const sny = safeNumber(ny, 0.5);
  return {
    x: safeNumber(r.x + snx * r.w, r.x + r.w/2),
    y: safeNumber(r.y + sny * r.h, r.y + r.h/2)
  };
}

export function p2n(x, y) {
  const r = playableRect();
  const sx = safeNumber(x, r.x + r.w/2);
  const sy = safeNumber(y, r.y + r.h/2);
  return {
    nx: safeNumber((sx - r.x) / r.w, 0.5),
    ny: safeNumber((sy - r.y) / r.h, 0.5)
  };
}

// View-aware coordinate converters that take canonical and produce pixel for current view
export function n2p_view(nx, ny){
  const {vx, vy} = normToView(nx, ny);
  const r = playableRect();
  return {
    x: safeNumber(r.x + vx * r.w, r.x + r.w/2),
    y: safeNumber(r.y + vy * r.h, r.y + r.h/2)
  };
}

export function p2n_view(x, y){
  const r = playableRect();
  const vx = safeNumber((x - r.x) / r.w, 0.5);
  const vy = safeNumber((y - r.y) / r.h, 0.5);
  return viewToNorm(vx, vy);
}

// Clamp a px point to the playable rect
export function clampPx(x, y) {
  const r = playableRect();
  const cx = Math.min(r.x + r.w, Math.max(r.x, x));
  const cy = Math.min(r.y + r.h, Math.max(r.y, y));
  return { x: cx, y: cy };
}

// Halo-based tight endpoints
export function tightEndpointsFromHalo(passerCenter, targetCenter){
  // Ensure halo exists with fallback creation
  let haloEl = document.getElementById('flabHalo');
  if (!haloEl) {
    console.warn('Creating fallback halo element');
    haloEl = document.createElement('div');
    haloEl.id = 'flabHalo';
    haloEl.className = 'flab-halo';
    haloEl.style.cssText = 'position:absolute;width:56px;height:56px;pointer-events:none;opacity:0;';
    const field = document.getElementById('formationField');
    if (field) field.appendChild(haloEl);
  }

  const safePasserX = safeNumber(passerCenter?.x, 400);
  const safePasserY = safeNumber(passerCenter?.y, 300);
  const safeTargetX = safeNumber(targetCenter?.x, 400);
  const safeTargetY = safeNumber(targetCenter?.y, 300);

  const haloR = safeNumber(haloEl && haloEl.offsetWidth ? haloEl.offsetWidth/2 : 28, 28);
  const startGap = safeNumber(getVar('--pass-origin-gap', 1.5), 1.5);
  const endGap = safeNumber(getVar('--pass-target-gap', 2), 2);

  // Start exactly outside the halo edge
  const A = insetFromA(safePasserX, safePasserY, safeTargetX, safeTargetY, haloR + startGap);

  // End slightly outside target token's bounding circle (use jersey box ≈ 56px)
  const targetEl = document.querySelector('.player[data-id="'+ (FLAB?.selectedId ?? '') +'"]');
  const targetR = safeNumber(targetEl ? Math.max(targetEl.offsetWidth, targetEl.offsetHeight)/2 : 28, 28);
  const B = insetFromB(safePasserX, safePasserY, safeTargetX, safeTargetY, targetR + endGap);

  // half-pixel snap to reduce AA fuzz
  const safeAx = safeNumber(A.x, safePasserX);
  const safeAy = safeNumber(A.y, safePasserY);
  const safeBx = safeNumber(B.x, safeTargetX);
  const safeBy = safeNumber(B.y, safeTargetY);

  return {
    A: { x: Math.round(safeAx) + 0.5, y: Math.round(safeAy) + 0.5 },
    B: { x: Math.round(safeBx) + 0.5, y: Math.round(safeBy) + 0.5 }
  };
}

// Field-local coordinate helpers for precise pass alignment
export function fieldRect() {
  return document.querySelector('.flab-field')?.getBoundingClientRect();
}

export function centerInField(el) {
  const fr = fieldRect();
  if (!fr || !el) return { x: 0, y: 0 };
  const r = el.getBoundingClientRect();
  // convert page coords → field local
  return {
    x: (r.left - fr.left) + r.width / 2,
    y: (r.top - fr.top) + r.height / 2
  };
}

// Field size for clipping operations
export function fieldSize(){
  const el = document.querySelector('.flab-field');
  const r = el?.getBoundingClientRect();
  return { w: r?.width||0, h: r?.height||0 };
}

export function getFieldBBox() {
  const el = document.querySelector('.flab-field');
  const r = el?.getBoundingClientRect();
  return { width: r?.width || 400, height: r?.height || 300, x: 0, y: 0 };
}

// Cohen–Sutherland-style rectangle clip (axis-aligned)
// Rect is [0,w] x [0,h]
export function clipSegmentToRect(ax,ay,bx,by,w,h){
  const INS=0, L=1, R=2, B=4, T=8;
  const code=(x,y)=> (x<0?L:0)|(x>w?R:0)|(y<0?T:0)|(y>h?B:0);
  let cA=code(ax,ay), cB=code(bx,by);
  while(true){
    if(!(cA|cB)) return { ax,ay,bx,by, visible:true };            // inside
    if(cA & cB)   return { ax,ay,bx,by, visible:false };          // outside same side
    const out = cA?cA:cB;
    let x,y;
    if(out & T){ x = ax + (bx-ax)*(0 - ay)/(by-ay); y = 0; }
    else if(out & B){ x = ax + (bx-ax)*(h - ay)/(by-ay); y = h; }
    else if(out & R){ y = ay + (by-ay)*(w - ax)/(bx-ax); x = w; }
    else /* L */ { y = ay + (by-ay)*(0 - ax)/(bx-ax); x = 0; }
    if(out===cA){ ax=x; ay=y; cA=code(ax,ay); } else { bx=x; by=y; cB=code(bx,by); }
  }
}

// Robust client → view coords conversion
export function toView(clientX, clientY) {
  const mount = document.getElementById('pitchMount');
  if (!mount) {
    console.warn('toView: pitchMount not found, using defaults');
    return { x: clientX, y: clientY };
  }
  const r = mount.getBoundingClientRect();
  const x = clientX - r.left;
  const y = clientY - r.top;
  return { x, y }; // view space = CSS pixels in the pitchMount box
}

// Convert view coordinates to field-space (normalized 0-1 with orientation)
export function viewToField(viewX, viewY) {
  // Handle both object {x, y} and separate x, y parameters
  if (typeof viewX === 'object' && viewX !== null) {
    return viewToField(viewX.x, viewX.y);
  }

  const norm = p2n_view(viewX, viewY);
  return { x: norm.nx, y: norm.ny };
}

window.__mod_geometry = true;
// Expose API for audit
window.__geom_api = { playableRect, n2p_view, normToView, fieldSize, clipSegmentToRect, toView };