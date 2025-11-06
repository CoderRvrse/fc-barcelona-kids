// Pass Head Size Utilities for Formation Lab
// Calculates head size and trim for clean shaft-head joins

import { getVar } from './geometry.js';

// Single source of truth for head sizing
export function headPxFor(lengthPx, isComic = false) {
  // Updated values for better visual balance
  const base = isComic ? 36 : 32;
  const min = 28;
  const max = 56;
  const scaled = base * (0.9 + Math.min(lengthPx, 600) / 600 * 0.4);
  return Math.max(min, Math.min(max, Math.round(scaled)));
}

// Calculate how much shaft to trim to prevent overlap with head
export function headTrimPx(headPx) {
  // How much shaft to hide under the head base for clean join
  const refRatio = 20 / 24; // marker refX vs viewBox width
  return Math.max(6, Math.round(headPx * refRatio));
}

window.__mod_passheadsize = true;