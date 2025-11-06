// Logger module for Formation Lab - dev-grade console telemetry
import { FLAB } from './state.js';
import { listPresets } from './storage.js';

// Console styling constants
const STYLES = {
  header: 'background: #2196F3; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
  action: 'background: #4CAF50; color: white; padding: 1px 4px; border-radius: 2px;',
  name: 'background: #FF9800; color: white; padding: 1px 4px; border-radius: 2px;',
  timestamp: 'color: #666; font-size: 11px;',
  success: 'color: #4CAF50; font-weight: bold;',
  error: 'color: #f44336; font-weight: bold;',
  info: 'color: #2196F3;'
};

// Get current timestamp in readable format
function getTimestamp() {
  return new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
}

// Get localStorage metrics
function getStorageMetrics() {
  const presets = listPresets();
  const storageUsed = JSON.stringify(localStorage).length;
  return {
    presetCount: presets.length,
    storageBytes: storageUsed,
    storageKB: Math.round(storageUsed / 1024 * 10) / 10
  };
}

// Get current field state summary
function getFieldState() {
  const players = FLAB.players || [];
  return {
    orientation: FLAB.orientation,
    mode: FLAB.mode,
    playerCount: players.length,
    passCount: (FLAB.passes || []).length,
    version: FLAB.version
  };
}

// Log preset save operation
export function logPresetSave(name, playersCanon) {
  const timestamp = getTimestamp();
  const state = getFieldState();
  const storage = getStorageMetrics();

  console.groupCollapsed(
    `%c⚾ PRESET %cSAVE %c${name} %c@ ${timestamp}`,
    STYLES.header, STYLES.action, STYLES.name, STYLES.timestamp
  );

  console.log('%c✅ Preset saved successfully', STYLES.success);

  // Current state table
  console.table({
    'Action': 'SAVE',
    'Preset Name': name,
    'Timestamp': timestamp,
    'Orientation': state.orientation,
    'Current Mode': state.mode,
    'Players': state.playerCount,
    'Pass Arrows': state.passCount,
    'App Version': state.version
  });

  // Storage metrics
  console.log('%cStorage Metrics:', STYLES.info);
  console.table(storage);

  // Player coordinates (canonical)
  console.log('%cPlayer Coordinates (Canonical):', STYLES.info);
  console.table(playersCanon.map(p => ({
    ID: p.id,
    'X (norm)': Math.round(p.nx * 1000) / 1000,
    'Y (norm)': Math.round(p.ny * 1000) / 1000
  })));

  // JSON copy helper
  console.log('%cJSON Copy Helper:', STYLES.info);
  console.log('Copy preset data:', JSON.stringify({ name, players: playersCanon }, null, 2));

  console.groupEnd();
}

// Log preset apply operation
export function logPresetApply(name, preset) {
  const timestamp = getTimestamp();
  const state = getFieldState();
  const storage = getStorageMetrics();

  console.groupCollapsed(
    `%c⚾ PRESET %cAPPLY %c${name} %c@ ${timestamp}`,
    STYLES.header, STYLES.action, STYLES.name, STYLES.timestamp
  );

  console.log('%c✅ Preset applied successfully', STYLES.success);

  // Current state table
  console.table({
    'Action': 'APPLY',
    'Preset Name': name,
    'Timestamp': timestamp,
    'Target Orientation': state.orientation,
    'Current Mode': state.mode,
    'Players Applied': preset.players.length,
    'App Version': state.version
  });

  // Storage metrics
  console.log('%cStorage Metrics:', STYLES.info);
  console.table(storage);

  // Applied coordinates
  console.log('%cApplied Coordinates (from canonical):', STYLES.info);
  console.table(preset.players.map(p => ({
    ID: p.id,
    'X (norm)': Math.round(p.nx * 1000) / 1000,
    'Y (norm)': Math.round(p.ny * 1000) / 1000
  })));

  // Preset metadata
  if (preset.createdAt) {
    const created = new Date(preset.createdAt).toLocaleString();
    console.log('%cPreset Created:', STYLES.info, created);
  }

  console.groupEnd();
}

// Log default preset setting
export function logPresetSetDefault(name) {
  const timestamp = getTimestamp();
  const state = getFieldState();
  const storage = getStorageMetrics();

  console.groupCollapsed(
    `%c⚾ PRESET %cSET DEFAULT %c${name} %c@ ${timestamp}`,
    STYLES.header, STYLES.action, STYLES.name, STYLES.timestamp
  );

  console.log('%c✅ Default preset updated', STYLES.success);

  // Current state table
  console.table({
    'Action': 'SET DEFAULT',
    'Preset Name': name,
    'Timestamp': timestamp,
    'Current Orientation': state.orientation,
    'Current Mode': state.mode,
    'App Version': state.version
  });

  // Storage metrics
  console.log('%cStorage Metrics:', STYLES.info);
  console.table(storage);

  // Default preset info
  console.log('%cDefault Preset Info:', STYLES.info);
  console.log(`Reset button will now apply: "${name}"`);

  console.groupEnd();
}

// Log preset delete operation
export async function logPresetDelete(name) {
  const timestamp = getTimestamp();
  const state = getFieldState();
  const storage = getStorageMetrics();

  console.groupCollapsed(
    `%c⚾ PRESET %cDELETE %c${name} %c@ ${timestamp}`,
    STYLES.header, STYLES.action, STYLES.name, STYLES.timestamp
  );

  console.log('%c🗑️ Preset deleted', STYLES.success);

  // Current state table
  console.table({
    'Action': 'DELETE',
    'Preset Name': name,
    'Timestamp': timestamp,
    'Current Orientation': state.orientation,
    'Current Mode': state.mode,
    'App Version': state.version
  });

  // Storage metrics (after deletion)
  console.log('%cStorage Metrics (after deletion):', STYLES.info);
  console.table(storage);

  // Warning if default was deleted
  const { getDefaultPresetName } = await import('./storage.js');
  if (getDefaultPresetName() === name) {
    console.warn('%c⚠️ Warning: Deleted preset was set as default', 'color: #ff9800; font-weight: bold;');
  }

  console.groupEnd();
}

// Log preset management session
export function logPresetManagement(action, target) {
  const timestamp = getTimestamp();
  const storage = getStorageMetrics();

  console.groupCollapsed(
    `%c⚾ PRESET %cMANAGE %c${action.toUpperCase()} %c@ ${timestamp}`,
    STYLES.header, STYLES.action, STYLES.name, STYLES.timestamp
  );

  console.log('%c📋 Preset management session', STYLES.info);

  // Available presets
  const presets = listPresets();
  if (presets.length > 0) {
    console.log('%cAvailable Presets:', STYLES.info);
    console.table(presets.map((p, i) => ({
      '#': i + 1,
      'Name': p.name,
      'Players': p.players.length,
      'Created': p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Unknown'
    })));
  } else {
    console.log('%cNo presets available', 'color: #666;');
  }

  // Storage metrics
  console.log('%cStorage Metrics:', STYLES.info);
  console.table(storage);

  if (target) {
    console.log(`%cTarget: ${target}`, STYLES.name);
  }

  console.groupEnd();
}

// Export telemetry summary for debugging
export function exportTelemetrySnapshot() {
  const timestamp = getTimestamp();
  const state = getFieldState();
  const storage = getStorageMetrics();
  const presets = listPresets();

  const snapshot = {
    timestamp,
    version: state.version,
    field: state,
    storage,
    presets: presets.map(p => ({
      name: p.name,
      playerCount: p.players.length,
      created: p.createdAt ? new Date(p.createdAt).toISOString() : null
    }))
  };

  console.log('%cFormation Lab Telemetry Snapshot:', STYLES.header);
  console.log(JSON.stringify(snapshot, null, 2));

  return snapshot;
}

// Pass telemetry (dev-only logging + events)
export const DEV = location.hostname === '127.0.0.1' || location.hostname === 'localhost';

export function logPass(payload) {
  if (DEV) {
    const {
      fromId, toId, fromNum, toNum, style, width, color,
      curved, lengthPx, startField, endField
    } = payload;

    console.groupCollapsed(
      `➡️ PASS  #${fromNum} (${fromId})  →  #${toNum ?? '—'} (${toId ?? 'free'})`
    );
    console.table({
      fromId, toId, fromNum, toNum,
      style, width, color, curved, lengthPx,
      startField: `${startField.x.toFixed(1)}, ${startField.y.toFixed(1)}`,
      endField:   `${endField.x.toFixed(1)}, ${endField.y.toFixed(1)}`
    });
    console.groupEnd();
  }

  // fire a DOM event so anything can listen (telemetry, tests, replay)
  window.dispatchEvent(new CustomEvent('flab:pass', { detail: payload }));
}

window.__mod_logger = true;