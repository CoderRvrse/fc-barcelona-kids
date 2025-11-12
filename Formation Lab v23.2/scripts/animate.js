// Animation module for Formation Lab - Ball Playback System
import { FLAB } from './state.js';

// SVG namespace constants
const SVG_NS   = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

// Animation tunables
const SPEED_PX_PER_SEC = 260;   // base speed (will scale duration = len / speed)
const MIN_DURATION_MS   = 900;  // never shorter than this – avoids blink
const MAX_DURATION_MS   = 3500; // cap overly long lines
const PAUSE_BETWEEN_MS  = 220;  // small delay between passes
const SLOWMO = (location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? (window.FLAB?.dev?.slowmo ?? 1.0) : 1.0;
const BALL_OVERSHOOT_PX = 16;     // let the ball roll slightly past the head

// Duration calculation with better scaling
function calculateDuration(pathLength) {
  // Base duration from path length and speed
  let duration = (pathLength / SPEED_PX_PER_SEC) * 1000;

  // Apply slow-mo multiplier for dev
  duration *= SLOWMO;

  // Enforce minimum and maximum bounds
  duration = clamp(duration, MIN_DURATION_MS, MAX_DURATION_MS);

  return Math.round(duration);
}

// Animation state
let currentController = null;
let ballCache = null;

// Utility functions
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function ensureLayers() {
  // Import and use the centralized layer management
  import('./render.js').then(({ ensureLayerOrder }) => {
    ensureLayerOrder();
  });

  // Get the SVG and layers
  const svg = document.getElementById('arrow-layer');
  const arrowGroup = document.getElementById('arrow-group');
  if (!svg || !arrowGroup) return null;

  const debugLayer = document.getElementById('arrow-debug-layer') || document.getElementById('ball-debug');
  const ballLayer = document.getElementById('ball-layer');

  return { svg, arrowGroup, ballLayer, debugLayer };
}

// Ball sizing based on field dimensions (1.8% of pitch width, clamped)
function computeBallPx() {
  // Use fieldSize for immediate access
  const field = document.querySelector('.flab-field');
  const rect = field?.getBoundingClientRect();
  const W = rect?.width || 400;
  return Math.max(22, Math.min(32, Math.round(W * 0.018)));
}

function createBallOnce() {
  const layer = document.getElementById('ball-layer');
  if (!layer) return null;

  let g = layer.querySelector('.ball-wrap');
  const size = computeBallPx();

  if (!g) {
    g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'ball-wrap');

    const halo = document.createElementNS(SVG_NS, 'circle');
    halo.setAttribute('class', 'ball-halo');

    const img = document.createElementNS(SVG_NS, 'image');
    img.setAttributeNS(XLINK_NS, 'href', 'assets/balls/Soccer-ball-1.svg');
    img.setAttribute('href', 'assets/balls/Soccer-ball-1.svg');
    img.setAttribute('class', 'ball');

    g.appendChild(halo);
    g.appendChild(img);
    layer.appendChild(g);
  }

  // Apply current size on every call (handles resize/zoom)
  const halo = g.querySelector('.ball-halo');
  const img = g.querySelector('.ball');

  halo.setAttribute('r', String(size * 0.56));
  img.setAttribute('width', size);
  img.setAttribute('height', size);

  return { wrap: g, halo, img, size };
}

function positionBall(img, cx, cy, size) {
  // Center image on (cx,cy)
  img.setAttribute('x', cx - size / 2);
  img.setAttribute('y', cy - size / 2);
}

function angleAt(path, s) {
  // Estimate tangent for rotation
  const eps = 0.01;
  const p1 = path.getPointAtLength(Math.max(0, s - eps));
  const p2 = path.getPointAtLength(Math.min(path.getTotalLength(), s + eps));
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  return Math.atan2(dy, dx) * 180 / Math.PI;
}

// Minimal debugging - removed confusing debug path highlights
// The ball now follows the ACTUAL visible shaft path, no debug geometry needed

// Tiny dispatcher
function dispatch(type, detail) {
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

// Resolve a pass to the ACTUAL VISIBLE shaft <path> element
export function resolvePassPathElement(p) {
  // Accept either an element or an id-like object
  if (p instanceof SVGPathElement) return p;
  if (p?.el instanceof SVGPathElement) return p.el;

  const passId = typeof p === 'string' ? p : p?.id;
  if (!passId) return null;

  // Import and use the single source of truth
  return import('./pass.js').then(({ getShaftPathForPass }) => {
    return getShaftPathForPass(passId);
  });
}

// Replay controller class
export class ReplayController {
  constructor(passes) {
    this.passes = passes;   // array of { id, pathEl } or something we can resolve to <path>
    this._raf = null;
    this._stop = false;
    this._ball = null;
    this._ballElements = null;
    this._layers = ensureLayers();
    this._frame = 0;
  }

  stop(reason = 'manual') {
    this._stop = true;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    this._cleanupBall();
    console.log('%cPlayback stopped:', 'color:#999', reason);
    dispatch('flab:replay-end', { reason });
  }

  _cleanupBall() {
    if (this._ballElements?.wrap && this._ballElements.wrap.parentNode) {
      this._ballElements.wrap.parentNode.removeChild(this._ballElements.wrap);
    }
    this._ball = null;
    this._ballElements = null;
  }

  async start(mode = 'all') {
    this._stop = false;
    this._frame = 0;
    dispatch('flab:replay-start', { mode, count: this.passes.length });

    // Import layer management and ensure proper order
    await import('./render.js').then(({ ensureLayerOrder }) => {
      ensureLayerOrder();
    });

    // prepare ball - start at first pass origin
    const { ballLayer } = this._layers ?? {};
    if (!ballLayer) {
      console.warn('No ball layer available');
      return;
    }
    this._cleanupBall();

    if (mode === 'last') {
      const p = this.passes[this.passes.length - 1];
      if (p) await this.playCurrentPass(p);
    } else {
      for (const p of this.passes) {
        if (this._stop) break;
        await this.playCurrentPass(p);
        await wait(PAUSE_BETWEEN_MS);
      }
    }
    if (!this._stop) this.stop('completed');
  }

  // p: either the actual <path> element, or an object we can resolve to it
  async playCurrentPass(p) {
    const { ballLayer } = this._layers ?? {};
    if (!ballLayer) return;

    const passData = typeof p === 'object' ? p : FLAB.arrows.find(arrow => arrow.id.toString() === String(p));

    const { getShaftPathForPass, getPassInsets } = await import('./pass.js');
    const passId = typeof p === 'string' ? p : p?.id;
    const path = getShaftPathForPass(passId);

    if (!path) {
      console.warn('No shaft path for pass', passId);
      return;
    }

    const pathLen = path.getTotalLength();
    const { startInsetPx } = getPassInsets(passData || {});
    const baseLen = Number(path.dataset.headBaseLen ?? pathLen);
    const targetLen = Math.min(pathLen, baseLen + BALL_OVERSHOOT_PX);
    const travel = Math.max(0, targetLen - startInsetPx);
    const duration = calculateDuration(targetLen);

    console.log('🎯 Playing pass', {
      id: passId,
      len: `${pathLen.toFixed(1)}px`,
      headBase: `${baseLen.toFixed(1)}px`,
      travel: `${travel.toFixed(1)}px`
    });

    if (!this._ballElements) {
      const ballData = createBallOnce();
      if (!ballData) return;
      this._ballElements = ballData;
      this._ball = ballData.wrap;
    }
    const ball = this._ballElements;

    await new Promise(resolve => {
      let startTs = 0;
      const step = (ts) => {
        if (this._stop) {
          resolve();
          return;
        }
        if (!startTs) startTs = ts;
        const t = clamp((ts - startTs) / duration, 0, 1);
        const eased = easeOutCubic(t);
        const s = Math.min(targetLen, startInsetPx + eased * travel);
        const pt = path.getPointAtLength(s);

        positionBall(ball.img, pt.x, pt.y, ball.size);
        ball.halo.setAttribute('cx', pt.x);
        ball.halo.setAttribute('cy', pt.y);

        if (t >= 1) {
          handleTargetFinish(passData || {}, ball, pt);
          resolve();
          return;
        }

        this._raf = requestAnimationFrame(step);
      };

      this._raf = requestAnimationFrame(step);
    });
  }
}

// Public API functions
export async function preloadBall() {
  if (ballCache) return;

  try {
    const response = await fetch(FLAB.assets.ballUrl);
    if (!response.ok) throw new Error(`Ball asset fetch failed: ${response.status}`);
    ballCache = await response.text();
    console.log('⚽ Ball asset preloaded');
  } catch (e) {
    console.warn('Failed to preload ball asset:', e);
  }
}

export function ensureBallLayer(parentSvg) {
  if (!parentSvg) return;
  ensureLayers();
}

// New simplified playPass function using exact shaft path
export async function playPass(pass) {
  const { getShaftPathForPass, getPassInsets } = await import('./pass.js');

  const passId = typeof pass === 'object' ? pass.id : pass;
  const passData = typeof pass === 'object' ? pass : FLAB.arrows.find(arrow => arrow.id.toString() === passId.toString());

  if (!passData) {
    console.warn('Pass not found:', passId);
    return;
  }

  const shaft = getShaftPathForPass(passId);
  if (!shaft) {
    console.warn('No shaft for pass', passId);
    return;
  }

  const total = shaft.getTotalLength();
  const { startInsetPx } = getPassInsets(passData);

  // Ball end must match the head base
  const L = shaft.getTotalLength();
  const baseLen = Number(shaft.dataset.headBaseLen ?? L);
  const targetLen = Math.min(L, baseLen + BALL_OVERSHOOT_PX);
  const travel = Math.max(0, targetLen - startInsetPx);
  const duration = Math.max(MIN_DURATION_MS, Math.round((baseLen / 320) * 1000)); // scale as needed

  console.log('⚽ Playing pass', {
    id: passId,
    totalLength: `${total.toFixed(1)}px`,
    headBaseLen: `${baseLen.toFixed(1)}px`,
    travel: `${travel.toFixed(1)}px`,
    duration: `${duration}ms`,
    startInset: `${startInsetPx.toFixed(1)}px`
  });

  const ball = createBallOnce();
  if (!ball) return;

  let req, t0;

  function frame(ts) {
    if (!t0) t0 = ts;
    const p = Math.min(1, (ts - t0) / duration);
    const d = startInsetPx + p * travel;
    const pt = shaft.getPointAtLength(d);

    positionBall(ball.img, pt.x, pt.y, ball.size);
    ball.halo.setAttribute('cx', pt.x);
    ball.halo.setAttribute('cy', pt.y);

    if (p < 1) {
      req = requestAnimationFrame(frame);
    } else {
      // Animation complete - handle target finishing
      handleTargetFinish(passData, ball, pt);
    }
  }

  cancelAnimationFrame(req);
  req = requestAnimationFrame(frame);

  return { stop: () => cancelAnimationFrame(req) };
}

async function handleTargetFinish(passData, ball, lastPt) {
  const toId = passData.meta?.toId;
  if (!toId) return;

  // Get target player and celebrate
  const { getPlayer } = await import('./state.js');
  const target = getPlayer(toId);
  if (!target) return;

  // Find target player element
  const targetEl = document.querySelector(`.player[data-id="${toId}"]`);
  const targetRing = targetEl?.querySelector('.ring');

  if (targetEl && targetRing) {
    // Get target player's exact center position
    const targetRect = targetEl.getBoundingClientRect();
    const field = document.querySelector('.flab-field');
    const fieldRect = field.getBoundingClientRect();

    // Calculate exact target position in field coordinates
    const targetX = (targetRect.left + targetRect.width / 2) - fieldRect.left;
    const targetY = (targetRect.top + targetRect.height / 2) - fieldRect.top;

    // Position ball exactly at target center
    if (ball.img) {
      positionBall(ball.img, targetX, targetY, ball.size);
      ball.halo.setAttribute('cx', targetX);
      ball.halo.setAttribute('cy', targetY);
    }

    // Enhanced celebration animation - dual ring effect
    targetRing.animate([
      {
        boxShadow: '0 0 0 0 rgba(255,209,102,0.9), 0 0 0 0 rgba(255,255,255,0.0)',
        transform: 'scale(1)'
      },
      {
        boxShadow: '0 0 0 12px rgba(255,209,102,0.2), 0 0 0 24px rgba(255,255,255,0.1)',
        transform: 'scale(1.15)'
      },
      {
        boxShadow: '0 0 0 16px rgba(255,209,102,0.0), 0 0 0 32px rgba(255,255,255,0.0)',
        transform: 'scale(1)'
      }
    ], {
      duration: 600,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    });

    // Add a subtle player highlight
    targetEl.animate([
      { filter: 'brightness(1)' },
      { filter: 'brightness(1.3)' },
      { filter: 'brightness(1)' }
    ], {
      duration: 400,
      easing: 'ease-out'
    });
  }

  console.log('🎯 Pass completed to player', toId, 'at position', `(${lastPt.x.toFixed(1)}, ${lastPt.y.toFixed(1)})`);
}

export async function queuePasses(passIds, opts = {}) {
  stopPlayback('new-request');

  // Get pass data from FLAB state
  const passData = passIds.map(id => FLAB.arrows.find(arrow => arrow.id.toString() === id.toString())).filter(Boolean);
  if (passData.length === 0) {
    console.warn('No valid passes found:', passIds);
    return { stop: () => {} };
  }

  const controller = new ReplayController(passData, opts);
  currentController = controller;
  await controller.start('all');
  return controller;
}

export function stopPlayback(reason = 'manual') {
  if (currentController) {
    currentController.stop(reason);
    currentController = null;
  }
}

export function isPlaying() {
  return currentController && !currentController._stop;
}

// Export for audit checks
window.__mod_animate = true;







