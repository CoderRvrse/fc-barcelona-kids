// Pass module for Formation Lab
import { FLAB, AIM, aimState, headSpec, HEADS, PASS } from './state.js';
import { HEAD_OVERLAP, computeHeadScale } from './assets.arrows.js';
import { centerInField, fieldSize, clipSegmentToRect, getVar, insetFromA, insetFromB, viewToField } from './geometry.js';
import { playerEl, clearAimTags } from './render.js';
import { ensureHeadMarker, rebuildAllMarkers } from './pass.markers.js';
import { headPxFor, headTrimPx } from './pass.headsize.js';
import { getArrowSvg, ensureGroup } from './svgroot.js';
import { logPass } from './logger.js';
import { saveUndoState } from './undo-redo.js';
import { createArrowObject, findNearbyPlayer, getArrowStart, getArrowEnd } from './arrow-anchor.js';

// Helper to get CSS variable in pixels
function getVarPx(varName, fallback = 0) {
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName);
  return parseFloat(val) || fallback;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const PASS_STYLES = ['solid', 'comic-flat', 'comic-halftone'];

// Hardened number utilities
function safeNumber(v, def=0) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : def;
  }
  return def;
}

// Use overlap values from asset specifications
function headOverlapFor(style){ return headSpec(style).overlap ?? 2; }

/**
 * Positions and rotates a head group so its base sits at the end of `shaftPath`,
 * oriented along the path tangent. Uses small overlap to hide seams.
 *
 * @param {SVGPathElement} shaftPath - the visible shaft (<path>) on screen
 * @param {SVGGElement} headGroup     - the group containing the head graphic
 * @param {string} style              - current pass style (solid/comic-flat/comic-halftone)
 */
export async function attachPassHead(shaftPath, style) {
  if (!shaftPath) return;

  const L = shaftPath.getTotalLength();
  const overlap = (HEAD_OVERLAP?.[style] ?? 2);

  // headBaseLen is exactly where the ball stops too
  const baseLen = Math.max(0, L - overlap);
  shaftPath.dataset.headBaseLen = String(baseLen);

  // Use the clean simple-markers system with improved error handling
  const { attachHead } = await import('../assets/arrows/simple-markers.js');

  try {
    // attachHead now handles all timing internally with retries
    const result = await attachHead(shaftPath, `head-${style}`);
    if (result instanceof Promise) {
      await result;
    }
    console.log(`🎯 Head attached: style=${style}, baseLen=${baseLen.toFixed(1)}px`);
  } catch (error) {
    // For preview paths that might not be fully attached, try silent fallback
    try {
      if (shaftPath.setAttribute) {
        shaftPath.setAttribute('marker-end', `url(#head-${style})`);
        shaftPath.setAttribute('vector-effect', 'non-scaling-stroke');
        console.log(`🎯 Head attached (silent fallback): style=${style}`);
      }
    } catch (fallbackError) {
      // Even fallback failed - this is likely a preview path that will be recreated
      console.debug(`⚡ Preview path attachment skipped: ${error.message}`);
    }
  }
}


/**
 * Ensures the SVG markers are available for the given style
 * @param {string} style - pass style (solid, comic-flat, comic-halftone)
 */
function ensurePassMarker(style) {
  const svg = document.getElementById('arrow-layer');
  if (!svg) return;

  const marker = svg.querySelector(`#head-${style}`);
  if (marker) return; // already exists

  // Import and trigger marker creation if needed
  import('./assets.arrows.js').then(({ preloadArrowHeads }) => {
    preloadArrowHeads();
  });
}

/**
 * Finalizes head positioning after shaft updates
 * @param {SVGGElement} passGroup - the pass group containing shaft and head
 * @param {string} style - current pass style
 */
function finalizeHead(passGroup, style = FLAB.passStyle) {
  if (!passGroup) return;

  const shaft = passGroup.querySelector('.pass-shaft');
  if (!shaft) return;

  // Remove any old head groups - we're using markers now
  const oldHead = passGroup.querySelector('.pass-head');
  if (oldHead) {
    oldHead.remove();
  }

  // Ensure marker exists and attach to shaft
  ensurePassMarker(style);
  attachPassHead(shaft, style);
}

// Precision endpoint computation for field-local coordinates
function unit(ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const d = Math.hypot(dx, dy) || 1;
  return { ux: dx / d, uy: dy / d, d };
}

// Helper functions
function getPlayer(playerId) {
  return FLAB.players.find(player => player.id === playerId) || null;
}

function getPlayerEl(playerId) {
  return document.querySelector(`.player[data-id="${playerId}"]`);
}

function snapHalf(p) {
  p.x = Math.round(p.x) + 0.5;
  p.y = Math.round(p.y) + 0.5;
  return p;
}

function haloRadiusPx() {
  const h = document.getElementById('flabHalo');
  return ((h?.offsetWidth) || 56) / 2;
}

function tokenRadiusPx(el) {
  // jersey button size ≈ its min dimension /2; fallback to 28
  const r = el?.getBoundingClientRect();
  return Math.max(14, Math.min(r?.width || 56, r?.height || 56) / 2);
}

// Helper to get player view coordinates
function getPlayerViewCoords(player) {
  const el = document.querySelector(`.player[data-id="${player.id}"]`);
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const fieldRect = document.getElementById('pitchMount').getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - fieldRect.left,
    y: rect.top + rect.height / 2 - fieldRect.top
  };
}

// Find nearest player in view space (exclude passer)
function nearestPlayerView(x, y, excludeId) {
  let best = null, bestDist = Infinity;
  for (const p of FLAB.players) {
    if (p.id === excludeId) continue;
    const pView = getPlayerViewCoords(p);
    if (!pView) continue;
    const d = Math.hypot(pView.x - x, pView.y - y);
    if (d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return { player: best, dist: bestDist };
}

export function computePassEndpoints(passerEl, targetEl) {
  const startGap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pass-origin-gap')) || 1.5;
  const endGap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pass-target-gap')) || 2;

  // Centers in **field-local** pixels
  const A0 = centerInField(passerEl);
  const B0 = centerInField(targetEl);

  const startInset = haloRadiusPx() + startGap;
  const endInset = tokenRadiusPx(targetEl) + endGap;

  let A = insetFromA(A0.x, A0.y, B0.x, B0.y, startInset);
  let B = insetFromB(A0.x, A0.y, B0.x, B0.y, endInset);

  // Minimum visible length guard
  const { d, ux, uy } = unit(A.x, A.y, B.x, B.y);
  const minLen = 12;
  if (d < minLen) {
    const cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2, half = minLen / 2;
    A = { x: cx - ux * half, y: cy - uy * half };
    B = { x: cx + ux * half, y: cy + uy * half };
  }

  return { A: snapHalf(A), B: snapHalf(B) };
}

// Compute clipped pass endpoints that stay within field bounds
export function computeClippedPass(A, B) {
  const { w, h } = fieldSize();
  const seg = clipSegmentToRect(A.x, A.y, B.x, B.y, w, h);
  if (!seg.visible) return null; // nothing to draw
  return { A: snapHalf({x: seg.ax, y: seg.ay}), B: snapHalf({x: seg.bx, y: seg.by}) };
}

function applyPassStyle(el, lengthPx = null) {
  const s = FLAB.passStyle;
  const cls = s.startsWith('comic') ? 'pass-comic' : 'pass-solid';
  el.setAttribute('class', cls);

  // Use length-aware markers if length is provided
  if (lengthPx !== null) {
    const arrowLayer = document.getElementById('arrow-layer');
    const defs = arrowLayer?.querySelector('defs');
    if (defs) {
      const markerId = ensureHeadMarker(defs, s, lengthPx);
      if (markerId) {
        el.setAttribute('marker-end', `url(#${markerId})`);
        return;
      }
    }
  }

  // Fallback to static markers
  const markerId = s === 'solid' ? 'passHead-solid' : s === 'comic-flat' ? 'passHead-comic-flat' : 'passHead-comic-halftone';
  el.setAttribute('marker-end', `url(#${markerId})`);
}

// Set arrow paths with clean shaft-head join
function setArrowPaths(svgGroup, A, Btip, styleKey, lenPx, shaftClass) {
  if (!svgGroup) return;
  console.debug('setArrowPaths', A, Btip, svgGroup?.ownerSVGElement?.id);

  // Debug shaft disabled - using main shaft with CSS styling instead
  // let shaft = svgGroup.querySelector('path.__debug');
  // if (!shaft) {
  //   shaft = document.createElementNS('http://www.w3.org/2000/svg','path');
  //   shaft.setAttribute('class','__debug');
  //   svgGroup.appendChild(shaft);
  // }
  // shaft.setAttribute('d', `M ${A.x} ${A.y} L ${Btip.x} ${Btip.y}`);
  // shaft.setAttribute('fill','none');
  // shaft.setAttribute('stroke', PASS.color || '#ffd166');
  // shaft.setAttribute('stroke-width', FLAB.passWidth || 4);
  // shaft.setAttribute('vector-effect','non-scaling-stroke');

  const svgRoot = getArrowSvg();
  const arrowGroup = document.getElementById('arrow-group');
  if (!svgRoot || !arrowGroup) {
    console.warn('setArrowPaths: no arrow SVG root or arrow-group');
    return;
  }

  // If group is not in DOM or not under arrow-group, reattach it
  if (!svgGroup || svgGroup.parentNode !== arrowGroup) {
    if (!svgGroup) {
      svgGroup = document.createElementNS(svgRoot.namespaceURI,'g');
    }
    arrowGroup.appendChild(svgGroup);
  }

  const defs = svgRoot.querySelector('defs'); // guaranteed by getArrowSvg()
  const headId = ensureHeadMarker(defs, styleKey, lenPx);
  const headPx = headPxFor(lenPx, /comic/.test(styleKey));
  const trim = headTrimPx(headPx);

  // Compute Bshaft = Btip moved back toward A by trim
  const dx = Btip.x - A.x;
  const dy = Btip.y - A.y;
  const L = Math.hypot(dx, dy) || 1;
  const Bshaft = {
    x: Btip.x - dx * (trim / L),
    y: Btip.y - dy * (trim / L)
  };

  // Clear previous content except debug shaft
  Array.from(svgGroup.children).forEach(child => {
    if (!child.classList.contains('shaft')) {
      svgGroup.removeChild(child);
    }
  });

  // 1) Visible shaft path (stops at Bshaft) - DIRECT COLOR APPLICATION
  const mainShaft = document.createElementNS(SVG_NS, 'path');
  mainShaft.classList.add('pass-shaft');
  mainShaft.classList.add(shaftClass);
  mainShaft.classList.add(`pass-${styleKey}`);
  mainShaft.dataset.passStyle = styleKey;
  mainShaft.setAttribute('vector-effect', 'non-scaling-stroke');
  mainShaft.setAttribute('fill', 'none');
  mainShaft.setAttribute('d', `M ${A.x} ${A.y} L ${Bshaft.x} ${Bshaft.y}`);

  // Get color from multiple sources in priority order
  let currentColor = '#ffd166'; // fallback

  // Try CSS variable first
  const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--pass-color').trim();
  if (cssVar) {
    currentColor = cssVar;
  }

  // Try PASS.color if available
  if (PASS?.color) {
    currentColor = PASS.color;
  }

  // FORCE CSS VARIABLE UPDATE - This ensures the CSS variable is updated before creating shaft
  document.documentElement.style.setProperty('--pass-color', currentColor);

  // Also ensure PASS.color is synchronized
  if (PASS) {
    PASS.color = currentColor;
  }

  mainShaft.setAttribute('stroke', currentColor);
  mainShaft.style.stroke = currentColor;
  mainShaft.style.color = currentColor;
  mainShaft.setAttribute('color', currentColor);

  // Add shaft to DOM first so CSS rules can apply
  svgGroup.appendChild(mainShaft);

  // FORCE IMMEDIATE CSS RECALCULATION
  // Since CSS has !important rules that override inline styles, we need to ensure the CSS variable is read correctly
  getComputedStyle(mainShaft).stroke; // Force style calculation

  // Ensure comic style uses solid stroke by clearing any dash pattern
  if (shaftClass === 'pass-comic') {
    mainShaft.removeAttribute('stroke-dasharray');
  }

  // DETAILED DEBUGGING - Check what actually got set AND monitor changes
  let monitorCount = 0;
  const monitorChanges = () => {
    monitorCount++;
    const actualStroke = mainShaft.getAttribute('stroke');
    const computedStroke = getComputedStyle(mainShaft).stroke;
    const hasStyleStroke = mainShaft.style.stroke;
    console.log(`🔍 SHAFT DEBUG (check ${monitorCount}):`);
    console.log(`  - Intended color: ${currentColor}`);
    console.log(`  - SVG stroke attribute: ${actualStroke}`);
    console.log(`  - Computed stroke style: ${computedStroke}`);
    console.log(`  - Inline style.stroke: ${hasStyleStroke}`);

    if (monitorCount < 5) {
      setTimeout(monitorChanges, 200); // Check again in 200ms
    }

    if (monitorCount === 1) {
      console.log(`  - Element:`, mainShaft);
    }
  };

  setTimeout(monitorChanges, 100);

  // MUTATION OBSERVER - Watch for any changes to the shaft element
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && (mutation.attributeName === 'stroke' || mutation.attributeName === 'style')) {
        console.log(`🚨 SHAFT MODIFIED by external code!`);
        console.log(`  - Attribute changed: ${mutation.attributeName}`);
        console.log(`  - New value: ${mainShaft.getAttribute(mutation.attributeName)}`);
        console.log(`  - Current computed stroke: ${getComputedStyle(mainShaft).stroke}`);
      }
    });
  });

  observer.observe(mainShaft, {
    attributes: true,
    attributeFilter: ['stroke', 'style']
  });

  // Stop observing after 5 seconds
  setTimeout(() => observer.disconnect(), 5000);

  console.log(`✅ Shaft created with direct color: ${currentColor} (CSS: ${cssVar}, PASS: ${PASS?.color}), style: ${shaftClass}`);

  // 2) Attach marker-based head to shaft
  ensurePassMarker(styleKey);
  attachPassHead(mainShaft, styleKey);

  // Dash polish: ensure last dash doesn't peek under the head
  mainShaft.style.strokeDashoffset = '';
  mainShaft.style.strokeLinecap = 'butt';
}


function createPass(arrow) {
  const { id, fromId, to, curved = false, control = null } = arrow;

  const startPlayer = getPlayer(fromId);
  if (!startPlayer) return null;

  // Get DOM elements for precise field-local coordinates
  const passerEl = document.querySelector(`.player[data-id="${fromId}"]`);
  if (!passerEl) return null;

  // NEW: Use anchor system to compute proper visual endpoints
  // This ensures arrows follow players and snap cleanly to target player edges
  const arrowStart = getArrowStart(fromId);
  const arrowEnd = getArrowEnd(arrow);

  if (!arrowStart || !arrowEnd) return null;

  // Create a temporary element at computed endpoint for field calculations
  const tempTarget = document.createElement('div');
  tempTarget.style.cssText = `position:absolute;left:${arrowEnd.x}px;top:${arrowEnd.y}px;width:56px;height:56px;pointer-events:none;`;
  document.querySelector('.flab-field').appendChild(tempTarget);

  try {
    // Use field-local precise endpoints
    const { A, B } = computePassEndpoints(passerEl, tempTarget);

    let pathData;
    if (curved && control) {
      // For curved passes, use the tight endpoints but keep the control point
      const safeControlX = safeNumber(control.x, (A.x + B.x) / 2);
      const safeControlY = safeNumber(control.y, (A.y + B.y) / 2);
      pathData = `M ${A.x} ${A.y} Q ${safeControlX} ${safeControlY} ${B.x} ${B.y}`;
    } else {
      // For straight passes with clipping
      const clipped = computeClippedPass(A, B);
      if (clipped) {
        pathData = `M ${clipped.A.x} ${clipped.A.y} L ${clipped.B.x} ${clipped.B.y}`;
      } else {
        pathData = ""; // Nothing to draw - completely outside field
      }
    }

    // Only proceed if all coordinates are finite
    if (!pathData.match(/NaN|Infinity|-Infinity/)) {

      // Calculate pass length for size-aware markers
      const lengthPx = Math.hypot(B.x - A.x, B.y - A.y);
      const styleKey = FLAB.passStyle;
      const shaftClass = styleKey.startsWith('comic') ? 'pass-comic' : 'pass-solid';

      const group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("data-arrow-id", String(id));
      group.classList.add("svg-pass");

      // Use the new clean shaft-head join system
      setArrowPaths(group, A, B, styleKey, lengthPx, shaftClass);

      // Create hitbox for the full path
      const hitbox = document.createElementNS(SVG_NS, "path");
      hitbox.setAttribute("d", pathData);
      hitbox.classList.add("flab-arrow-hitbox");
      group.appendChild(hitbox);

      return group;
    } else {
      console.warn('Rejected path with invalid coordinates:', pathData);
      return null;
    }
  } finally {
    // Clean up temporary target element
    tempTarget.remove();
  }
}

// called on pointerdown in Pass mode
export function beginPassPreview(passer) {
  FLAB.passArm = { drawing: true, curved: false, latest: getPlayerViewCoords(passer) };
  FLAB.activePlayer = passer;
  FLAB.aim.candidateId = null;
  FLAB.aim.lockedId = null;
  FLAB.aim.showAt = 0;
  clearAimTags();
  FLAB.previewG = ensureGroup('pass-preview');
  while (FLAB.previewG.firstChild) FLAB.previewG.removeChild(FLAB.previewG.firstChild);
}

// Helper to get shaft class for pass style
function shaftClassFor(style) {
  return style.startsWith('comic') ? 'pass-comic' : 'pass-solid';
}

// commit pass on pointerup
export function commitPass() {
  if (!FLAB.passArm?.drawing) return;
  const passer = FLAB.activePlayer;
  if (!passer) return;

  const cur = FLAB.passArm.latest;
  const tgtGap = getVarPx('--pass-target-gap', 2);
  const passerView = getPlayerViewCoords(passer);

  let endV = cur;
  if (FLAB.aim.lockedId) {
    const t = getPlayer(FLAB.aim.lockedId);
    const tView = getPlayerViewCoords(t);
    if (passerView && tView) {
      const targetR = 28;
      endV = insetFromB(passerView.x, passerView.y, tView.x, tView.y, targetR + tgtGap);
    }
  }

  commitArrow(passer.id, endV, FLAB.passArm.curved, FLAB.passArm.control);

  // telemetry: log pass details for dev/analytics
  const startField = viewToField(passerView);
  const endField = viewToField(endV);

  const style = FLAB.passStyle;
  const width = FLAB.passWidth;
  const color = PASS.color || '#ffd166';
  const curved = !!FLAB.passArm?.curved;

  const fromId = passer.id;
  const fromNum = passer.number ?? passer.id;

  // if we had a lock, we know the receiver; else "free" end (toId=null)
  const lockedId = FLAB.aim?.lockedId ?? null;
  const target = lockedId ? getPlayer(lockedId) : null;
  const toId = target?.id ?? null;
  const toNum = target?.number ?? target?.id ?? null;

  const dx = endV.x - passerView.x;
  const dy = endV.y - passerView.y;
  const lengthPx = Math.hypot(dx, dy);

  logPass({
    fromId, toId, fromNum, toNum,
    style, width, color, curved, lengthPx,
    startField, endField
  });

  FLAB.passArm = null;

  // cleanup
  FLAB.aim.candidateId = FLAB.aim.lockedId = null;
  clearAimTags();
  while (FLAB.previewG?.firstChild) FLAB.previewG.removeChild(FLAB.previewG.firstChild);
}

export function updatePassPreview(v) {
  if (!FLAB.passArm?.drawing) return;
  const passer = FLAB.activePlayer;
  if (!passer) return;

  // Handle null/undefined viewPt
  if (!v || typeof v.x !== 'number' || typeof v.y !== 'number') {
    return;
  }

  console.debug('[pass] move', v.x|0, v.y|0);

  // track latest pointer
  FLAB.passArm.latest = v;

  // ----- aim acquisition -----
  let cand = null;
  if (AIM.enabled) {
    const { player, dist } = nearestPlayerView(v.x, v.y, passer.id);
    if (player && dist <= AIM.radius) cand = player;
  }

  const now = performance.now();

  // hysteresis & promotion to lock
  if (cand) {
    if (FLAB.aim.lockedId) {
      const lp = getPlayer(FLAB.aim.lockedId);
      const lpView = getPlayerViewCoords(lp);
      if (lpView) {
        const d = Math.hypot(lpView.x - v.x, lpView.y - v.y);
        if (d > AIM.radius + AIM.hysteresis) {
          FLAB.aim.lockedId = null;
          FLAB.aim.candidateId = cand.id;
          FLAB.aim.showAt = now;
        }
      }
    } else {
      if (FLAB.aim.candidateId !== cand.id) {
        FLAB.aim.candidateId = cand.id;
        FLAB.aim.showAt = now;
      } else if (now - FLAB.aim.showAt >= AIM.delay) {
        FLAB.aim.lockedId = cand.id;
      }
    }
  } else {
    FLAB.aim.candidateId = null;
    FLAB.aim.lockedId = null;
  }

  // ----- visual rings -----
  clearAimTags();
  if (FLAB.aim.candidateId && !FLAB.aim.lockedId) {
    playerEl(FLAB.aim.candidateId)?.setAttribute('data-aim', 'pre');
  }
  if (FLAB.aim.lockedId) {
    playerEl(FLAB.aim.lockedId)?.setAttribute('data-aim', 'lock');
  }

  // ----- geometry (halo-edge origin + snapped end if locked) -----
  const haloR = (document.getElementById('flabHalo')?.offsetWidth || 0) / 2;
  const startGap = getVarPx('--pass-origin-gap', 1.5);
  const passerView = getPlayerViewCoords(passer);
  if (!passerView) return;
  const start = insetFromA(passerView.x, passerView.y, v.x, v.y, haloR + startGap);

  let endX = v.x, endY = v.y;
  const tgtGap = getVarPx('--pass-target-gap', 2);
  const targetR = 28; // jersey visual radius

  if (FLAB.aim.lockedId) {
    const t = getPlayer(FLAB.aim.lockedId);
    const tView = getPlayerViewCoords(t);
    if (tView) {
      const targetVecX = tView.x - passerView.x;
      const targetVecY = tView.y - passerView.y;
      const targetLenSq = targetVecX ** 2 + targetVecY ** 2;
      if (targetLenSq > 0) {
        const pointerVecX = v.x - passerView.x;
        const pointerVecY = v.y - passerView.y;
        const projection = (pointerVecX * targetVecX + pointerVecY * targetVecY) / targetLenSq;
        if (projection > 1.05) {
          FLAB.aim.lockedId = null;
          FLAB.aim.candidateId = null;
        } else {
          const end = insetFromB(passerView.x, passerView.y, tView.x, tView.y, targetR + tgtGap);
          endX = end.x;
          endY = end.y;
        }
      }
    }
  }

  // draw (debug shaft)
  const len = Math.hypot(endX - start.x, endY - start.y);
  setArrowPaths(FLAB.previewG, start, { x: endX, y: endY }, FLAB.passStyle, len, shaftClassFor(FLAB.passStyle));

  // Finalize head positioning after preview update
  finalizeHead(FLAB.previewG, FLAB.passStyle);
}


export function commitArrow(fromId, point, curved = false, control = null) {
  if (!point) return;

  // NEW: Use anchor system for entity-based arrow attachment
  // Get locked target from aim state (visual feedback during drag)
  // ONLY snap to player if aim-locked during drag, NOT on proximity
  const lockId = FLAB.aim?.lockedId ?? null;
  const toPlayerId = lockId || null;

  // Get passer position for metadata
  const passer = getPlayer(fromId);
  const passerEl = getPlayerEl(fromId);
  let startField = null, endField = null;

  if (passer && passerEl) {
    const passerRect = passerEl.getBoundingClientRect();
    const fieldRect = document.querySelector('.flab-field').getBoundingClientRect();
    const startView = {
      x: passerRect.left + passerRect.width / 2 - fieldRect.left,
      y: passerRect.top + passerRect.height / 2 - fieldRect.top
    };
    startField = viewToField(startView);

    // For metadata, compute endpoint based on whether arrow is anchored
    let endView = point;
    if (toPlayerId) {
      const targetEl = getPlayerEl(toPlayerId);
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const fieldRect = document.querySelector('.flab-field').getBoundingClientRect();
        endView = {
          x: rect.left + rect.width / 2 - fieldRect.left,
          y: rect.top + rect.height / 2 - fieldRect.top
        };
      }
    }
    endField = viewToField(endView);
  }

  // Store comprehensive metadata
  const meta = {
    toId: toPlayerId,
    startInsetPx: getVarPx('--pass-origin-gap', 1.5) + haloRadiusPx(),
    endInsetPx: getVarPx('--pass-target-gap', 2) + (toPlayerId ? tokenRadiusPx(getPlayerEl(toPlayerId)) : 0),
    headInsetPx: 16, // arrowhead clearance
    startField,
    endField,
    createdAt: performance.now()
  };

  // Create arrow with NEW entity-anchored structure
  const passId = FLAB.arrowCounter++;
  const arrow = createArrowObject(fromId, toPlayerId, point, curved, control);
  arrow.id = passId;
  arrow.meta = meta;

  FLAB.arrows.push(arrow);

  // Remember last committed pass for "Play Last" functionality
  FLAB.lastPassId = passId;

  // Clear aim state after commit
  clearAimTags();

  // Import and call renderArrows
  import('./render.js').then(({ renderArrows }) => {
    renderArrows();
  });

  // Highlight the new pass
  setTimeout(() => highlightPass(passId), 100);

  // Save state for undo
  saveUndoState(`Add pass from player ${fromId}`);
}

export async function renderArrows() {
  const svgRoot = getArrowSvg();
  if (!svgRoot) return;

  // Get the arrow-group that has the transforms and clipping
  const arrowGroup = document.getElementById('arrow-group');
  if (!arrowGroup) {
    console.warn('renderArrows: #arrow-group not found');
    return;
  }

  // Clear existing arrows (except markers in defs)
  const existingPasses = arrowGroup.querySelectorAll('.svg-pass');
  existingPasses.forEach(el => el.remove());

  // NEW: Migrate all arrows to new entity-anchored format on first render
  // This ensures backward compatibility with old stored arrows
  if (FLAB.arrows && FLAB.arrows.length > 0) {
    const { migrateArrow } = await import('./arrow-anchor.js');
    FLAB.arrows = FLAB.arrows.map(arrow => {
      const migrated = migrateArrow(arrow);
      if (!migrated.to || migrated.to.playerId === undefined) {
        console.log(`⚡ Migrated arrow #${arrow.id} to new anchor format`);
      }
      return migrated;
    });
  }

  // Create all arrows with NEW entity-anchored system
  const promises = FLAB.arrows.map(arrow => createPass(arrow));

  Promise.all(promises).then(groups => {
    groups.forEach(group => {
      if (group) {
        // Append to arrow-group, not svgRoot, to inherit transforms
        arrowGroup.appendChild(group);
        // Finalize head positioning after creation
        finalizeHead(group, FLAB.passStyle);
      }
    });

    // Force update all shaft colors after rendering
    forceUpdateAllShaftColors();
  });

  document.getElementById("arrow-layer")?.classList.toggle("is-interactive", FLAB.mode === "erase");
}

// Force update all shaft colors - DIRECT SVG attribute approach
function forceUpdateAllShaftColors() {
  // Get color from multiple sources in priority order
  let currentColor = '#ffd166'; // fallback

  // Try CSS variable first
  const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--pass-color').trim();
  if (cssVar) {
    currentColor = cssVar;
  }

  // Try PASS.color if available
  if (PASS?.color) {
    currentColor = PASS.color;
  }

  const allShafts = document.querySelectorAll('.pass-shaft');
  console.log(`🔧 Force updating ${allShafts.length} shaft colors to: ${currentColor} (CSS: ${cssVar}, PASS: ${PASS?.color})`);

  allShafts.forEach((shaft, index) => {
    console.log(`🔧 Updating shaft ${index + 1}:`);
    console.log(`  - Before: stroke="${shaft.getAttribute('stroke')}", style.stroke="${shaft.style.stroke}"`);

    // NUCLEAR OPTION: Use both SVG attribute AND inline style
    shaft.setAttribute('stroke', currentColor);
    shaft.style.stroke = currentColor;  // Inline style has highest specificity - nothing can override this
    shaft.style.color = currentColor;
    shaft.setAttribute('color', currentColor);

    console.log(`  - After: stroke="${shaft.getAttribute('stroke')}", style.stroke="${shaft.style.stroke}"`);

    // Check computed style after update
    setTimeout(() => {
      const computed = getComputedStyle(shaft).stroke;
      console.log(`  - Computed after 100ms: ${computed}`);
    }, 100);
  });
}

// Pass clearing functions for erase menu
export function clearLastPass() {
  const arr = FLAB.arrows || [];
  if (arr.length > 0) {
    arr.pop();
    console.log('Cleared last pass');
    // Save state for undo
    saveUndoState('Delete last pass');
  }
}

export function clearAllPasses() {
  FLAB.arrows = [];
  console.log('Cleared all passes');
  // Save state for undo
  saveUndoState('Clear all passes');
}

export function initPassTool() {
  const arrowLayer = document.getElementById("arrow-layer");
  if (!arrowLayer) {
    console.error('Cannot initialize pass tool: #arrow-layer not found');
    return;
  }

  // Create/clear a dedicated preview group
  if (!FLAB.previewGroup) {
    FLAB.previewGroup = ensureGroup('pass-preview');
  } else {
    // purge previous children
    while (FLAB.previewGroup.firstChild) FLAB.previewGroup.removeChild(FLAB.previewGroup.firstChild);
    // reattach in case it got detached
    FLAB.previewGroup = ensureGroup('pass-preview');
  }

  // Handle arrow layer clicks for erase mode
  arrowLayer.addEventListener("pointerdown", evt => {
    if (FLAB.mode !== "erase") return;

    const target = evt.target.closest('.svg-pass');
    if (!target) return;

    const arrowId = target.getAttribute('data-arrow-id');
    if (arrowId) {
      evt.preventDefault();
      evt.stopPropagation();

      FLAB.arrows = FLAB.arrows.filter(item => item.id !== parseInt(arrowId));
      renderArrows();
    }
  });
}

// Pass data getters for animation module - SINGLE SOURCE OF TRUTH
export function getShaftPathForPass(passId) {
  // Get the ACTUAL visible shaft path that users see
  return document.querySelector(`#arrow-group [data-arrow-id="${passId}"] .pass-shaft`) ||
         document.querySelector(`#arrow-group [data-arrow-id="${passId}"] path`) ||
         document.querySelector(`#arrow-layer [data-arrow-id="${passId}"] path`);
}

export function getPassInsets(pass) {
  const m = pass.meta || {};
  return {
    startInsetPx: m.startInsetPx ?? 18,
    endInsetPx: (m.endInsetPx ?? 18) + (m.headInsetPx ?? 16)
  };
}

export function highlightPass(passId) {
  // Remove existing highlights
  document.querySelectorAll('#arrow-group [data-arrow-id].is-selected')
    .forEach(el => el.classList.remove('is-selected'));

  // Add highlight to selected pass
  document.querySelectorAll(`#arrow-group [data-arrow-id="${passId}"]`)
    .forEach(el => el.classList.add('is-selected'));
}

export function getPassPathNode(passId) {
  return getShaftPathForPass(passId);
}

export function getPassMeta(passId) {
  const arrow = FLAB.arrows.find(a => a.id.toString() === passId.toString());
  if (!arrow) return null;

  return {
    id: arrow.id.toString(),
    fromId: arrow.fromId,
    toId: arrow.toId || null,
    curved: arrow.curved || false,
    style: FLAB.passStyle,
    width: FLAB.passWidth,
    color: PASS.color || '#ffd166'
  };
}

export function getLastPassId() {
  const arrows = FLAB.arrows;
  return arrows.length > 0 ? arrows[arrows.length - 1].id.toString() : null;
}

export function getAllPassIds() {
  return FLAB.arrows.map(arrow => arrow.id.toString());
}

export function clearPassHighlight() {
  // Remove highlight from all passes
  const highlighted = document.querySelectorAll('#arrow-group [data-arrow-id].is-selected');
  highlighted.forEach(el => el.classList.remove('is-selected'));
}

// Head diagnostics for debugging
export function logHeadDiagnostics(){
  const rows = [...document.querySelectorAll('#arrow-layer path.pass-shaft')].map(p=>{
    const L = p.getTotalLength();
    const hb = Number(p.dataset.headBaseLen ?? L);
    const head = p.parentNode.querySelector('.pass-head');
    const t = head?.getAttribute('transform') || '';
    const sw = parseFloat(getComputedStyle(p).strokeWidth);
    return {
      L: +L.toFixed(1),
      headBase: +hb.toFixed(1),
      gap: +(L - hb).toFixed(2),
      sw,
      transform: t.slice(0,80)
    };
  });
  console.table(rows);
}

// Force refresh all existing arrows with current color
export function forceArrowRefresh() {
  const currentColor = PASS?.color || getComputedStyle(document.documentElement).getPropertyValue('--pass-color').trim() || '#ffd166';

  // Force CSS variable update
  document.documentElement.style.setProperty('--pass-color', currentColor);

  import('../assets/arrows/simple-markers.js')
    .then(({ updateMarkerColors }) => updateMarkerColors?.(currentColor))
    .catch(error => console.warn('updateMarkerColors import failed', error));

  // Force recalculation on all existing shaft elements
  const allShafts = document.querySelectorAll('.pass-shaft');
  allShafts.forEach(shaft => {
    shaft.setAttribute('stroke', currentColor);
    shaft.style.stroke = currentColor;
    shaft.style.color = currentColor;
    shaft.setAttribute('color', currentColor);
    // Force immediate style recalculation
    getComputedStyle(shaft).stroke;
  });

  console.log(`🎨 Forced refresh of ${allShafts.length} arrow shafts with color: ${currentColor}`);
}

// Re-export the marker rebuilding function
export { rebuildAllMarkers };

window.__mod_pass = true;

