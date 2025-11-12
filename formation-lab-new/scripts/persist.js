// Settings persistence module for Formation Lab
import { FLAB, set, PASS } from './state.js';
import { validateSettings } from './validators.js';
import { handleError } from './error-handler.js';
import { showErrorToast } from './ui-toast.js';

const STORAGE_KEY = 'formation-lab-settings';

// Default settings
const DEFAULT_SETTINGS = {
  orientation: 'landscape',
  passStyle: 'solid',
  passWidth: 4,
  passColor: '#ffd166',
  passRecent: []
};

// Load settings from localStorage
export function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;

    const settings = JSON.parse(stored);

    // Migrate comic-dots to comic-halftone
    if (settings.passStyle === 'comic-dots') {
      settings.passStyle = 'comic-halftone';
    }

    // Validate and sanitize loaded settings using validators module
    const validation = validateSettings(settings);

    if (!validation.valid) {
      console.warn('Settings validation errors:', validation.errors);
      // Show error toast if settings are corrupted
      showErrorToast('Settings were corrupted and have been reset to defaults.');
    }

    // Use sanitized settings (either valid or defaults)
    const valid = validation.sanitized || DEFAULT_SETTINGS;

    // Apply to FLAB state
    set('orientation', valid.orientation);
    set('passStyle', valid.passStyle);
    set('passWidth', valid.passWidth);

    // Apply to PASS state and CSS
    PASS.color = valid.passColor;
    PASS.recent = valid.passRecent;
    PASS.style = valid.passStyle;
    document.documentElement.style.setProperty('--pass-color', valid.passColor);

    // Debug: Verify CSS variable was actually set
    const actualVar = getComputedStyle(document.documentElement).getPropertyValue('--pass-color');
    console.log(`🎨 CSS variable set: expected=${valid.passColor}, actual=${actualVar.trim()}`);

    console.log('⚙️ Settings loaded from localStorage:', valid);
    return valid;

  } catch (error) {
    handleError(error, 'loadSettings', false);
    console.warn('Failed to load settings, using defaults:', error);
    return DEFAULT_SETTINGS;
  }
}

// Save current settings to localStorage
export function saveSettings(partial = {}) {
  try {
    const current = {
      orientation: FLAB.orientation || DEFAULT_SETTINGS.orientation,
      passStyle: FLAB.passStyle || DEFAULT_SETTINGS.passStyle,
      passWidth: FLAB.passWidth || DEFAULT_SETTINGS.passWidth,
      passColor: PASS.color || DEFAULT_SETTINGS.passColor,
      passRecent: PASS.recent || DEFAULT_SETTINGS.passRecent,
      ...partial
    };

    // Validate before saving
    const validation = validateSettings(current);

    if (!validation.valid) {
      console.error('Cannot save invalid settings:', validation.errors);
      showErrorToast('Cannot save settings: Invalid configuration.');
      return null;
    }

    // Save sanitized settings
    const sanitized = validation.sanitized;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    console.log('💾 Settings saved to localStorage:', sanitized);
    return sanitized;

  } catch (error) {
    handleError(error, 'saveSettings', true);
    console.warn('Failed to save settings:', error);
    return null;
  }
}

// Clear all settings
export function clearSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Settings cleared');
  } catch (error) {
    console.warn('Failed to clear settings:', error);
  }
}

// Auto-save when FLAB properties change (debounced)
let saveTimeout;
function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveSettings(), 500);
}

// Export for audit testing
export function _testRoundTrip() {
  const testSettings = { passStyle: 'comic-flat', orientation: 'portrait', passWidth: 6 };
  saveSettings(testSettings);

  // Clear FLAB and reload
  set('passStyle', 'solid');
  set('orientation', 'landscape');
  set('passWidth', 4);

  const loaded = loadSettings();
  return loaded.passStyle === testSettings.passStyle &&
         loaded.orientation === testSettings.orientation &&
         loaded.passWidth === testSettings.passWidth;
}

window.__mod_persist = true;