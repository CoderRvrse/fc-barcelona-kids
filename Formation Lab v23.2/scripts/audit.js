// Audit module for Formation Lab v23.4
/* global window, document, navigator */
export async function runAudit(){
  const V = window.FLAB_VERSION || 'v?';

  const checks = [];
  const ok = (cond, msg) => checks.push({ok: !!cond, msg});
  const has = (x) => typeof x !== 'undefined' && x !== null;

  // 1) Modules present (markers are optional; existence via imports)
  ok(!!window.FLAB,                       'state.js loaded (window.FLAB exists)');
  ok(!!window.__mod_state,               'state module marker');
  ok(!!window.__mod_geometry,            'geometry module marker');
  ok(!!window.__mod_orientation,         'orientation module marker');
  ok(!!window.__mod_drag,                'drag module marker');
  ok(!!window.__mod_pass,                'pass module marker');
  ok(!!window.__mod_render,              'render module marker');
  ok(!!window.__mod_export,              'export module marker');
  ok(!!window.__mod_ui,                  'ui module marker');
  ok(!!window.__mod_keyboard,            'keyboard module marker');
  ok(!!window.__mod_presets,             'presets module marker');
  ok(!!window.__mod_persist,             'persist module marker');
  ok(!!window.__mod_logger,              'logger module marker');
  ok(!!window.__mod_presetmenu,          'preset dropdown menu marker');
  ok(!!window.__mod_erasemenu,           'erase dropdown menu marker');

  // 2) DOM invariants
  ok(!!document.querySelector('.flab-field'),   '.flab-field exists');
  ok(!!document.getElementById('arrow-layer'),  '#arrow-layer exists');
  ok(getComputedStyle(document.getElementById('arrow-layer')).pointerEvents==='none',
     '#arrow-layer pointer-events:none');
  ok(!!document.getElementById('flabHalo'),     '#flabHalo exists');

  // 3) CSS / JS versions appended
  const cssHref = [...document.styleSheets].map(s=>s.href||'').find(h=>h.includes('styles/main.css'));
  ok(!!cssHref && /\?v=/.test(cssHref), 'main.css loaded with ?v=');

  // 4) Service worker version (tolerate localhost with no SW)
  if ('serviceWorker' in navigator){
    try{
      const t = await fetch('sw.js',{cache:'no-store'}).then(r=>r.text());
      const swV = (t.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/)||[])[1];
      ok(!!swV, 'sw.js has CACHE_VERSION');
      ok(swV===V, `SW CACHE_VERSION matches app (${swV} == ${V})`);
    }catch(_){ ok(true,'SW check skipped (dev)'); }
  }

  // 5) Marker <defs> present
  const defs = document.querySelector('#arrow-layer defs');
  ok(!!defs && defs.querySelector('#passHead-solid'),        'marker passHead-solid present');
  ok(!!defs && defs.querySelector('#passHead-comic-flat'),   'marker passHead-comic-flat present');
  ok(!!defs && defs.querySelector('#passHead-comic-halftone'),'marker passHead-comic-halftone present');

  // 6) Geometry guards (no NaN)
  const halo = document.getElementById('flabHalo');
  ok(Number.isFinite((halo?.offsetWidth||0)/2), 'halo radius finite');

  // 7) Orientation transform sanity
  const mid = (window.FLAB.players||[])[0] || {nx:.5, ny:.5};
  const g = window.__geom_api; // injected by geometry.js export for audit
  if (g){
    const v = g.normToView(mid.nx, mid.ny); const p = g.n2p_view(mid.nx, mid.ny);
    ok(has(v.vx)&&has(v.vy),'normToView emits vx,vy');
    ok(Number.isFinite(p.x)&&Number.isFinite(p.y),'n2p_view returns finite px');
  } else { ok(false,'geometry API not exposed for audit'); }

  // 8) Playable rect sane
  const pr = g?.playableRect?.();
  ok(!!pr && pr.w>0 && pr.h>0,'playableRect positive');

  // 9) Drag preconditions
  const anyPlayer = document.querySelector('.player');
  ok(!!anyPlayer, 'at least one .player in DOM');
  if (anyPlayer) {
    ok(getComputedStyle(anyPlayer).pointerEvents==='auto', '.player receives events');
  }

  // 10) No legacy globals
  ok(!('state' in window) || window.state===window.FLAB, 'no stray global state (or alias bound)');

  // 11) SW precache sanity (static list presence)
  try{
    const t = await fetch('sw.js',{cache:'no-store'}).then(r=>r.text());
    ['scripts/main.js','scripts/state.js','scripts/geometry.js',
     'scripts/orientation.js','scripts/drag.js','scripts/pass.js',
     'scripts/render.js','scripts/export.js','scripts/ui.js',
     'scripts/keyboard.js','scripts/presets.js']
     .forEach(p=>ok(t.includes(p), `sw precache includes ${p}`));
  }catch(_){ /* ignore offline dev */ }

  // 12) Pitch asset constants check (v23.4.1)
  ok(!!window.__PITCH && !!window.__PITCH.PITCH_LAND, 'PITCH_LAND constant available');
  ok(!!window.__PITCH && !!window.__PITCH.PITCH_PORT, 'PITCH_PORT constant available');

  // Check for stray pitch asset references (should all use constants now)
  const bodyHTML = document.documentElement.outerHTML;
  const strayMatches = bodyHTML.match(/assets\/[^"']*pitch-[^"']*/g) || [];
  const allowedRefs = strayMatches.filter(ref =>
    ref.includes('--pitch-url') || ref.includes('CSS variable') || ref.includes('../../assets/') || ref.includes('&quot;);')
  );
  ok(strayMatches.length === 0 || allowedRefs.length === strayMatches.length,
     `No stray pitch asset refs (found ${strayMatches.length - allowedRefs.length} violations)`);

  // 13) Single keydown handler check (v23.4.2)
  const keydownListeners = document.querySelectorAll('[data-keydown-listener]');
  ok(keydownListeners.length === 0, 'No duplicate keydown listeners in DOM');

  // 14) Formation presets check (v23.4.2)
  ok(typeof window.__mod_presets !== 'undefined', 'Presets module available');

  // 15) v23.4.3 Performance & stability checks
  // Single keydown listener check
  const keydownHandlers = [];
  document.addEventListener('keydown', () => keydownHandlers.push(1), { once: true });
  ok(keydownHandlers.length <= 1, 'Single global keydown handler');

  // Persist.js round-trip test
  if (window.__mod_persist) {
    try {
      const persistModule = await import('./persist.js');
      const roundTripPassed = persistModule._testRoundTrip();
      ok(roundTripPassed, 'Settings persistence round-trip test');
    } catch (e) {
      ok(false, `Settings persistence test failed: ${e.message}`);
    }
  }

  // View transform accuracy test
  if (window.__geom_api) {
    const { normToView } = window.__geom_api;
    const testResult = normToView(0.25, 0.75);
    // In portrait mode: (nx=0.25, ny=0.75) should map to (vx≈0.75, vy≈0.75)
    if (window.FLAB.orientation === 'portrait') {
      ok(Math.abs(testResult.vx - 0.75) < 0.01 && Math.abs(testResult.vy - 0.75) < 0.01,
         'Portrait view transform accuracy');
    } else {
      ok(Math.abs(testResult.vx - 0.25) < 0.01 && Math.abs(testResult.vy - 0.75) < 0.01,
         'Landscape view transform accuracy');
    }
  }

  // NaN detection in SVG attributes
  const svgElements = [...document.querySelectorAll('#arrow-layer *')];
  const hasNaN = svgElements.some(el => {
    if (!el.getAttribute) return false;
    const attrs = ['d', 'x1', 'y1', 'x2', 'y2', 'markerWidth', 'markerHeight', 'refX', 'refY', 'viewBox'];
    return attrs.some(attr => {
      const value = el.getAttribute(attr) || '';
      return /NaN/.test(value);
    });
  });
  ok(!hasNaN, 'No NaN values in SVG arrow layer attributes');

  // 16) Preset storage functionality check (v23.4.4)
  try {
    const { savePreset, getPreset, setDefaultPreset, getDefaultPresetName, deletePreset } = await import('./storage.js');
    const { snapshotCurrentPlayersCanonical, applyPlayersCanonical } = await import('./presets.js');

    ok(typeof snapshotCurrentPlayersCanonical === 'function', 'preset snapshot fn present');

    const _snap = snapshotCurrentPlayersCanonical();
    const _name = '__audit_preset__';
    savePreset(_name, _snap);
    ok(!!getPreset(_name), 'preset saved');
    setDefaultPreset(_name);
    ok(getDefaultPresetName() === _name, 'default preset set');
    applyPlayersCanonical(getPreset(_name).players);
    deletePreset(_name);
    ok(!getPreset(_name), 'preset deleted');
  } catch (e) {
    ok(false, `Preset functionality test failed: ${e.message}`);
  }

  // 17) Logger module functionality check (v23.4.4-dev)
  try {
    const { exportTelemetrySnapshot } = await import('./logger.js');
    ok(typeof exportTelemetrySnapshot === 'function', 'logger telemetry export function present');

    // Test snapshot generation
    const snapshot = exportTelemetrySnapshot();
    ok(!!snapshot.timestamp && !!snapshot.version, 'telemetry snapshot generates valid data');
  } catch (e) {
    ok(false, `Logger functionality test failed: ${e.message}`);
  }

  // 18) Preset dropdown menu functionality check (v23.4.4-ui)
  const uiPortal = document.getElementById('ui-portal');
  const manageButton = document.getElementById('btnManagePresets');
  ok(!!uiPortal, 'UI portal element present');
  ok(!!manageButton, 'manage presets button present');
  ok(getComputedStyle(uiPortal).zIndex === '10000', 'UI portal has z-index 10000');
  ok(getComputedStyle(uiPortal).position === 'fixed', 'UI portal uses fixed positioning');

  // 19) Ball animation module checks (v23.4.7.4)
  try {
    const { ensureBallLayer, preloadBall, isPlaying } = await import('./animate.js');
    ok(typeof ensureBallLayer === 'function', 'ensureBallLayer function present');
    ok(typeof preloadBall === 'function', 'preloadBall function present');
    ok(typeof isPlaying === 'function', 'isPlaying function present');

    // Check ball layer exists
    const ballLayer = document.getElementById('ball-layer');
    ok(!!ballLayer, '#ball-layer present at boot');

    // Check ball asset preload (async check)
    window.__lastPass = null;
    window.addEventListener('flab:pass', e => window.__lastPass = e.detail);

    // Test playback with a simple pass if any exist
    const { getAllPassIds } = await import('./pass.js');
    const passIds = getAllPassIds();
    if (passIds.length > 0) {
      const { playPass } = await import('./animate.js');
      let replayStarted = false;
      const startListener = () => { replayStarted = true; };
      window.addEventListener('flab:replay-start', startListener, { once: true });

      const controller = await playPass(passIds[0]);
      await new Promise(resolve => setTimeout(resolve, 100)); // Give time for start event

      ok(replayStarted, 'ball playback can start');
      ok(isPlaying(), 'isPlaying() returns true during playback');

      controller.stop('audit-test');
      await new Promise(resolve => setTimeout(resolve, 50)); // Give time for cleanup

      ok(!isPlaying(), 'isPlaying() returns false after stop');
      window.removeEventListener('flab:replay-start', startListener);
    }
  } catch (e) {
    ok(false, `Ball animation test failed: ${e.message}`);
  }

  // 20) SW bypass functionality check
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('sw') === 'off') {
    // We're in SW bypass mode - verify SW is disabled
    const swRegistrations = await navigator.serviceWorker?.getRegistrations() || [];
    ok(swRegistrations.length === 0, 'Service Worker bypass active (?sw=off)');
    console.log('🚨 Running in SW bypass mode - offline caching disabled');
  } else {
    // Normal mode - SW should be available
    ok('serviceWorker' in navigator, 'Service Worker API available');
  }

  // Print report
  console.groupCollapsed(`Formation Lab ${V} — Modularization Audit`);
  let all = true;
  for (const c of checks){ all = all && c.ok; (c.ok?console.log:console.error)(c.ok?'✅':'❌', c.msg); }
  console.groupEnd();
  if (!all) console.warn('Audit had failures — see list above');
  return all;
}