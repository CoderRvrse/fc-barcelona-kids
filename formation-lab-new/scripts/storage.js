// Storage module for Formation Lab v23.4.4
// Handles preset saving/loading with localStorage
import { validatePlayers, validateFormationData, sanitizeFormationData } from './validators.js';
import { handleError } from './error-handler.js';
import { showErrorToast, showSuccessToast } from './ui-toast.js';

// Key namespace
const K = {
  PRESETS: 'flab.presets',       // array of {name, players:[{id,nx,ny}], createdAt}
  DEFAULT: 'flab.defaultPreset', // string name
};

// Helpers
function _load(key, fallback) {
  try {
    const data = JSON.parse(localStorage.getItem(key)) ?? fallback;

    // Validate loaded data if it's preset data
    if (key === K.PRESETS && Array.isArray(data)) {
      return data.map(preset => {
        const validation = validateFormationData(preset);
        if (!validation.valid) {
          console.warn(`Corrupted preset detected: ${preset.name}`, validation.errors);
          // Attempt to sanitize
          return validation.sanitized || preset;
        }
        return preset;
      });
    }

    return data;
  } catch (error) {
    console.warn(`Failed to load ${key}:`, error);
    return fallback;
  }
}

function _save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// Public API
export function listPresets() {
  return _load(K.PRESETS, []);
}

export function savePreset(name, playersCanon) {
  try {
    // Validate player data before saving
    const validation = validatePlayers(playersCanon);

    if (!validation.valid) {
      const errorMsg = `Cannot save preset: ${validation.errors[0]}`;
      console.error(errorMsg, validation.errors);
      showErrorToast('Formation data is invalid. Please check player positions.');
      throw new Error(errorMsg);
    }

    // Use sanitized data (fixes minor issues like out-of-range coords)
    const sanitizedPlayers = validation.sanitized;

    const items = listPresets().filter(p => p.name !== name);
    items.push({ name, players: sanitizedPlayers, createdAt: Date.now() });
    _save(K.PRESETS, items);

    showSuccessToast(`Formation "${name}" saved successfully!`);
    return name;

  } catch (error) {
    handleError(error, 'savePreset', false); // Already showed toast
    throw error; // Re-throw for caller to handle
  }
}

export function deletePreset(name) {
  _save(K.PRESETS, listPresets().filter(p => p.name !== name));
}

export function getPreset(name) {
  const preset = listPresets().find(p => p.name === name);

  if (!preset) return null;

  // Validate and sanitize preset data before returning
  const validation = validateFormationData(preset);

  if (!validation.valid) {
    console.warn(`Preset "${name}" has validation errors:`, validation.errors);
    // Return sanitized version if possible
    return validation.sanitized || null;
  }

  return preset;
}

export function setDefaultPreset(name) {
  _save(K.DEFAULT, name);
}

export function getDefaultPresetName() {
  return _load(K.DEFAULT, null);
}

window.__mod_storage = true;