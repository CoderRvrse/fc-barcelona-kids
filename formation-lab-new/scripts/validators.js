// Data validation module for Formation Lab
// Prevents corrupted data from being saved or loaded
import { PASS_STYLES } from './state.js';

/**
 * Validation result type
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether data is valid
 * @property {string[]} errors - Array of error messages
 * @property {*} sanitized - Sanitized/fixed data (if recoverable)
 */

/**
 * Check if value is a valid finite number
 */
function isValidNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Check if value is within range [min, max]
 */
function isInRange(value, min, max) {
  return isValidNumber(value) && value >= min && value <= max;
}

/**
 * Validate normalized coordinate (0-1 range)
 * @param {number} coord - Coordinate value
 * @param {string} name - Coordinate name (for error messages)
 * @returns {ValidationResult}
 */
export function validateNormalizedCoord(coord, name = 'coordinate') {
  const errors = [];

  if (!isValidNumber(coord)) {
    errors.push(`${name} must be a finite number, got ${typeof coord}: ${coord}`);
  } else if (!isInRange(coord, 0, 1)) {
    errors.push(`${name} must be in range [0, 1], got ${coord}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: isValidNumber(coord) ? Math.max(0, Math.min(1, coord)) : 0.5
  };
}

/**
 * Validate player object
 * @param {Object} player - Player object
 * @returns {ValidationResult}
 */
export function validatePlayer(player) {
  const errors = [];

  // Check if player is an object
  if (!player || typeof player !== 'object') {
    return {
      valid: false,
      errors: ['Player must be an object'],
      sanitized: null
    };
  }

  // Required fields
  if (player.id === undefined || player.id === null) {
    errors.push('Player missing required field: id');
  }

  // Validate coordinates (nx, ny = normalized x, y)
  const nxResult = validateNormalizedCoord(player.nx, 'nx');
  const nyResult = validateNormalizedCoord(player.ny, 'ny');

  if (!nxResult.valid) {
    errors.push(...nxResult.errors);
  }
  if (!nyResult.valid) {
    errors.push(...nyResult.errors);
  }

  // Validate role (optional)
  if (player.role !== undefined && typeof player.role !== 'string') {
    errors.push(`Player role must be a string, got ${typeof player.role}`);
  }

  // Create sanitized version
  const sanitized = {
    id: player.id ?? Math.random().toString(36).substr(2, 9),
    nx: nxResult.sanitized,
    ny: nyResult.sanitized,
    role: typeof player.role === 'string' ? player.role : 'player',
    number: typeof player.number === 'number' ? player.number : player.id
  };

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Validate array of players
 * @param {Array} players - Array of player objects
 * @returns {ValidationResult}
 */
export function validatePlayers(players) {
  const errors = [];

  if (!Array.isArray(players)) {
    return {
      valid: false,
      errors: ['Players must be an array'],
      sanitized: []
    };
  }

  // Check player count (reasonable limits)
  if (players.length > 50) {
    errors.push(`Too many players: ${players.length} (max 50)`);
  }

  // Validate each player
  const sanitized = [];
  players.forEach((player, index) => {
    const result = validatePlayer(player);
    if (!result.valid) {
      errors.push(`Player ${index}: ${result.errors.join(', ')}`);
    }
    // Include sanitized version even if invalid (recoverable)
    if (result.sanitized) {
      sanitized.push(result.sanitized);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Validate arrow/pass object
 * @param {Object} arrow - Arrow object
 * @returns {ValidationResult}
 */
export function validateArrow(arrow) {
  const errors = [];

  if (!arrow || typeof arrow !== 'object') {
    return {
      valid: false,
      errors: ['Arrow must be an object'],
      sanitized: null
    };
  }

  // Validate ID
  if (!arrow.id) {
    errors.push('Arrow missing required field: id');
  }

  // Validate from/to coordinates
  const fromXResult = validateNormalizedCoord(arrow.fromX, 'fromX');
  const fromYResult = validateNormalizedCoord(arrow.fromY, 'fromY');
  const toXResult = validateNormalizedCoord(arrow.toX, 'toX');
  const toYResult = validateNormalizedCoord(arrow.toY, 'toY');

  if (!fromXResult.valid) errors.push(...fromXResult.errors);
  if (!fromYResult.valid) errors.push(...fromYResult.errors);
  if (!toXResult.valid) errors.push(...toXResult.errors);
  if (!toYResult.valid) errors.push(...toYResult.errors);

  // Validate curve control points (optional, for curved passes)
  if (arrow.c1x !== undefined) {
    const c1xResult = validateNormalizedCoord(arrow.c1x, 'c1x');
    const c1yResult = validateNormalizedCoord(arrow.c1y, 'c1y');
    const c2xResult = validateNormalizedCoord(arrow.c2x, 'c2x');
    const c2yResult = validateNormalizedCoord(arrow.c2y, 'c2y');

    if (!c1xResult.valid) errors.push(...c1xResult.errors);
    if (!c1yResult.valid) errors.push(...c1yResult.errors);
    if (!c2xResult.valid) errors.push(...c2xResult.errors);
    if (!c2yResult.valid) errors.push(...c2yResult.errors);
  }

  // Validate style (optional)
  if (arrow.style !== undefined) {
    const validStyles = PASS_STYLES.map(s => s.key);
    if (!validStyles.includes(arrow.style)) {
      errors.push(`Invalid arrow style: ${arrow.style}, must be one of ${validStyles.join(', ')}`);
    }
  }

  // Create sanitized version
  const sanitized = {
    id: arrow.id ?? `arrow-${Date.now()}`,
    fromX: fromXResult.sanitized,
    fromY: fromYResult.sanitized,
    toX: toXResult.sanitized,
    toY: toYResult.sanitized,
    style: arrow.style || 'solid',
    number: typeof arrow.number === 'number' ? arrow.number : undefined
  };

  // Include curve points if present
  if (arrow.c1x !== undefined) {
    sanitized.c1x = validateNormalizedCoord(arrow.c1x).sanitized;
    sanitized.c1y = validateNormalizedCoord(arrow.c1y).sanitized;
    sanitized.c2x = validateNormalizedCoord(arrow.c2x).sanitized;
    sanitized.c2y = validateNormalizedCoord(arrow.c2y).sanitized;
    sanitized.curved = true;
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Validate array of arrows
 * @param {Array} arrows - Array of arrow objects
 * @returns {ValidationResult}
 */
export function validateArrows(arrows) {
  const errors = [];

  if (!Array.isArray(arrows)) {
    return {
      valid: false,
      errors: ['Arrows must be an array'],
      sanitized: []
    };
  }

  // Check arrow count (reasonable limits)
  if (arrows.length > 100) {
    errors.push(`Too many arrows: ${arrows.length} (max 100)`);
  }

  // Validate each arrow
  const sanitized = [];
  arrows.forEach((arrow, index) => {
    const result = validateArrow(arrow);
    if (!result.valid) {
      errors.push(`Arrow ${index}: ${result.errors.join(', ')}`);
    }
    // Include sanitized version even if invalid (recoverable)
    if (result.sanitized) {
      sanitized.push(result.sanitized);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Validate complete formation data
 * @param {Object} data - Formation data object
 * @returns {ValidationResult}
 */
export function validateFormationData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['Formation data must be an object'],
      sanitized: null
    };
  }

  // Validate players
  const playersResult = validatePlayers(data.players || []);
  if (!playersResult.valid) {
    errors.push(...playersResult.errors);
  }

  // Validate arrows (optional)
  let arrowsResult = { valid: true, errors: [], sanitized: [] };
  if (data.arrows) {
    arrowsResult = validateArrows(data.arrows);
    if (!arrowsResult.valid) {
      errors.push(...arrowsResult.errors);
    }
  }

  // Validate metadata
  if (data.name !== undefined && typeof data.name !== 'string') {
    errors.push('Formation name must be a string');
  }

  if (data.createdAt !== undefined && !isValidNumber(data.createdAt)) {
    errors.push('Formation createdAt must be a number (timestamp)');
  }

  // Create sanitized version
  const sanitized = {
    name: typeof data.name === 'string' ? data.name : 'Untitled Formation',
    players: playersResult.sanitized,
    arrows: arrowsResult.sanitized,
    createdAt: isValidNumber(data.createdAt) ? data.createdAt : Date.now()
  };

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Validate settings object
 * @param {Object} settings - Settings object
 * @returns {ValidationResult}
 */
export function validateSettings(settings) {
  const errors = [];

  if (!settings || typeof settings !== 'object') {
    return {
      valid: false,
      errors: ['Settings must be an object'],
      sanitized: null
    };
  }

  // Validate orientation
  if (settings.orientation && !['landscape', 'portrait'].includes(settings.orientation)) {
    errors.push(`Invalid orientation: ${settings.orientation}`);
  }

  // Validate passStyle
  if (settings.passStyle) {
    const validStyles = PASS_STYLES.map(s => s.key);
    if (!validStyles.includes(settings.passStyle)) {
      errors.push(`Invalid passStyle: ${settings.passStyle}`);
    }
  }

  // Validate passWidth
  if (settings.passWidth !== undefined && !isInRange(settings.passWidth, 1, 10)) {
    errors.push(`Invalid passWidth: ${settings.passWidth}, must be between 1 and 10`);
  }

  // Validate passColor (hex color)
  if (settings.passColor && !/^#[0-9a-fA-F]{6}$/.test(settings.passColor)) {
    errors.push(`Invalid passColor: ${settings.passColor}, must be hex color (#rrggbb)`);
  }

  // Validate passRecent (array of hex colors)
  if (settings.passRecent && !Array.isArray(settings.passRecent)) {
    errors.push('passRecent must be an array');
  } else if (settings.passRecent) {
    settings.passRecent.forEach((color, index) => {
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
        errors.push(`Invalid color in passRecent[${index}]: ${color}`);
      }
    });
  }

  // Create sanitized version
  const sanitized = {
    orientation: ['landscape', 'portrait'].includes(settings.orientation)
      ? settings.orientation : 'landscape',
    passStyle: PASS_STYLES.map(s => s.key).includes(settings.passStyle)
      ? settings.passStyle : 'solid',
    passWidth: isInRange(settings.passWidth, 1, 10)
      ? settings.passWidth : 4,
    passColor: /^#[0-9a-fA-F]{6}$/.test(settings.passColor)
      ? settings.passColor : '#ffd166',
    passRecent: Array.isArray(settings.passRecent)
      ? settings.passRecent.filter(c => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 3)
      : []
  };

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Sanitize and fix formation data (attempt recovery from corruption)
 * @param {Object} data - Formation data
 * @returns {Object} Sanitized data
 */
export function sanitizeFormationData(data) {
  const result = validateFormationData(data);

  // If completely invalid, return minimal valid structure
  if (!result.sanitized) {
    return {
      name: 'Recovered Formation',
      players: [],
      arrows: [],
      createdAt: Date.now()
    };
  }

  return result.sanitized;
}

/**
 * Check if formation data is safe to save
 * @param {Object} data - Formation data
 * @throws {Error} If data is invalid
 */
export function assertValidFormation(data) {
  const result = validateFormationData(data);

  if (!result.valid) {
    throw new Error(`Invalid formation data: ${result.errors.join('; ')}`);
  }

  return result.sanitized;
}

// Export for testing
export { isValidNumber, isInRange };
