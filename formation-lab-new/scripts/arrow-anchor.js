/**
 * Arrow Anchoring System for Formation Lab
 * Provides entity-based arrow attachment (player ID anchoring)
 * Arrows follow players automatically - no more floaty, disconnected visuals
 */

import { FLAB } from './state.js';
import { n2p } from './geometry.js';

const PLAYER_RADIUS = 20; // pixels - radius of player marker on screen
const ENDPOINT_PADDING = 4; // pixels - small gap between arrow and player edge

/**
 * Get player by ID from FLAB state
 * @param {number} playerId
 * @returns {object|null}
 */
export function getPlayerById(playerId) {
  if (!playerId) return null;
  return FLAB.players.find(p => p.id === playerId) || null;
}

/**
 * Get visual position of a player in pixels
 * @param {number} playerId
 * @returns {{x: number, y: number}|null}
 */
export function getPlayerPixelPos(playerId) {
  const player = getPlayerById(playerId);
  if (!player) return null;

  const { x, y } = n2p(player.x, player.y);
  return { x, y };
}

/**
 * Compute arrow start point (center of source player)
 * @param {number} fromPlayerId
 * @returns {{x: number, y: number}|null}
 */
export function getArrowStart(fromPlayerId) {
  return getPlayerPixelPos(fromPlayerId);
}

/**
 * Compute arrow end point with proper visual attachment
 * If arrow is anchored to a player (toPlayerId), compute endpoint on player's edge
 * If arrow is free (offset), return the offset position
 * If arrow is fixed (legacy), return fixed position
 * @param {object} arrow - arrow object with to.playerId, to.offset, or to.fixed
 * @returns {{x: number, y: number}|null}
 */
export function getArrowEnd(arrow) {
  if (!arrow) return null;

  const { to } = arrow;

  // Case 1: Arrow anchored to a target player
  if (to.playerId) {
    const toPlayer = getPlayerById(to.playerId);
    if (!toPlayer) return null;

    const fromPlayer = getPlayerById(arrow.fromId);
    if (!fromPlayer) return null;

    const fromPos = getPlayerPixelPos(arrow.fromId);
    const toPos = getPlayerPixelPos(to.playerId);
    if (!fromPos || !toPos) return null;

    // Compute vector from source to target
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) return toPos; // players at same position

    // Normalize and scale to hit player edge with padding
    const ux = dx / dist;
    const uy = dy / dist;
    const stopDist = Math.max(0, dist - PLAYER_RADIUS - ENDPOINT_PADDING);

    return {
      x: fromPos.x + ux * stopDist,
      y: fromPos.y + uy * stopDist
    };
  }

  // Case 2: Arrow has offset (free arrow, didn't hit a player)
  if (to.offset) {
    return { x: to.offset.x, y: to.offset.y };
  }

  // Case 3: Legacy fixed coordinates
  if (to.fixed) {
    return { x: to.fixed.x, y: to.fixed.y };
  }

  return null;
}

/**
 * Find which player (if any) is near a given pixel position
 * Used for snapping during drag
 * @param {number} px - pixel x
 * @param {number} py - pixel y
 * @param {number} snapRadius - how close to snap (pixels)
 * @returns {number|null} playerId or null
 */
export function findNearbyPlayer(px, py, snapRadius = 40) {
  let closest = null;
  let closestDist = snapRadius;

  for (const player of FLAB.players) {
    const pos = getPlayerPixelPos(player.id);
    if (!pos) continue;

    const dx = pos.x - px;
    const dy = pos.y - py;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < closestDist) {
      closestDist = dist;
      closest = player.id;
    }
  }

  return closest;
}

/**
 * Create a new arrow object with entity-based anchoring
 * @param {number} fromPlayerId
 * @param {number|null} toPlayerId - if set, arrow is anchored to this player
 * @param {{x,y}|null} offset - if toPlayerId is null, can optionally store offset
 * @param {boolean} curved
 * @param {{x,y}|null} control - for Bezier curves
 * @returns {object} arrow object (ready to add to FLAB.arrows)
 */
export function createArrowObject(fromPlayerId, toPlayerId, offset = null, curved = false, control = null) {
  return {
    fromId: fromPlayerId,
    to: {
      playerId: toPlayerId || null,
      offset: offset ? { x: offset.x, y: offset.y } : null,
      fixed: null // legacy, empty
    },
    curved: curved,
    control: control ? { x: control.x, y: control.y } : null,
    meta: {
      startField: null,  // computed on commit
      endField: null,
      createdAt: performance.now()
    }
  };
}

/**
 * Migrate legacy arrow (with direct x,y coords) to new format
 * Tries to find if endpoint is near a player; if so, anchors to that player
 * Otherwise stores as "fixed" (legacy) coords
 * @param {object} legacyArrow - old format arrow
 * @returns {object} migrated arrow
 */
export function migrateArrow(legacyArrow) {
  if (!legacyArrow) return null;

  // Already migrated?
  if (legacyArrow.to && (legacyArrow.to.playerId !== undefined || legacyArrow.to.offset !== undefined)) {
    return legacyArrow;
  }

  // Try to find what player this arrow might be anchored to
  const endX = legacyArrow.to?.x || legacyArrow.x;
  const endY = legacyArrow.to?.y || legacyArrow.y;

  let toPlayerId = null;
  if (endX !== undefined && endY !== undefined) {
    // Check if endpoint is very close to a player
    toPlayerId = findNearbyPlayer(endX, endY, 15); // strict 15px threshold
  }

  return {
    ...legacyArrow,
    to: {
      playerId: toPlayerId,
      offset: null,
      fixed: endX !== undefined && endY !== undefined ? { x: endX, y: endY } : null
    }
  };
}

/**
 * Recompute all arrows after a major change (player moved, zoom changed, etc)
 * This ensures visual positions stay correct
 * @returns {void}
 */
export function recomputeAllArrows() {
  // This is called by render.js after player or viewport changes
  // The actual re-rendering happens in renderArrows(), which calls getArrowEnd()
  // So just ensure all arrows have the new structure
  if (FLAB.arrows && Array.isArray(FLAB.arrows)) {
    FLAB.arrows = FLAB.arrows.map(arrow => migrateArrow(arrow));
  }
}

/**
 * Check if arrow is valid (source player still exists)
 * @param {object} arrow
 * @returns {boolean}
 */
export function isArrowValid(arrow) {
  if (!arrow) return false;
  return getPlayerById(arrow.fromId) !== null;
}

/**
 * Get diagnostic info about an arrow (for debugging)
 * @param {object} arrow
 * @returns {object}
 */
export function debugArrow(arrow) {
  if (!arrow) return null;

  const fromPlayer = getPlayerById(arrow.fromId);
  const toPlayer = arrow.to.playerId ? getPlayerById(arrow.to.playerId) : null;
  const start = getArrowStart(arrow.fromId);
  const end = getArrowEnd(arrow);

  return {
    id: arrow.id,
    from: {
      playerId: arrow.fromId,
      player: fromPlayer ? `Player #${fromPlayer.id} (${fromPlayer.role})` : 'MISSING',
      pixelPos: start
    },
    to: {
      playerId: arrow.to.playerId,
      player: toPlayer ? `Player #${toPlayer.id} (${toPlayer.role})` : 'NONE (free)',
      pixelPos: end
    },
    curved: arrow.curved,
    control: arrow.control
  };
}

window.__mod_arrow_anchor = true;
