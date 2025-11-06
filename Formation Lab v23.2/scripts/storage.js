// Storage module for Formation Lab v23.4.4
// Handles preset saving/loading with localStorage

// Key namespace
const K = {
  PRESETS: 'flab.presets',       // array of {name, players:[{id,nx,ny}], createdAt}
  DEFAULT: 'flab.defaultPreset', // string name
};

// Helpers
function _load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
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
  const items = listPresets().filter(p => p.name !== name);
  items.push({ name, players: playersCanon, createdAt: Date.now() });
  _save(K.PRESETS, items);
  return name;
}

export function deletePreset(name) {
  _save(K.PRESETS, listPresets().filter(p => p.name !== name));
}

export function getPreset(name) {
  return listPresets().find(p => p.name === name) || null;
}

export function setDefaultPreset(name) {
  _save(K.DEFAULT, name);
}

export function getDefaultPresetName() {
  return _load(K.DEFAULT, null);
}

window.__mod_storage = true;