// In-browser console checks for Formation Lab v23.1
// Copy and paste this into DevTools Console

(async () => {
  console.log("🔎 Checking Service Worker registration and cache version...");

  // Confirm active SW and cache version
  const regs = await navigator.serviceWorker.getRegistrations();
  console.log("SW registrations:", regs.map(r => r.scope));

  const swText = await fetch('sw.js', { cache: 'no-store' }).then(r => r.text());
  const swVersionOk = /VERSION\s*=\s*['"]v23\.1['"]/.test(swText);
  console.log(swVersionOk ? "✅ SW version OK (v23.1)" : "❌ SW version mismatch");

  // Ensure v23.1 assets are live
  const css = [...document.querySelectorAll('link[rel="stylesheet"]')].map(n => n.href);
  const js  = [...document.querySelectorAll('script[src]')].map(n => n.src);
  console.log("CSS assets:", css.filter(h => h.includes('main.css')));
  console.log("JS assets:", js.filter(h => h.includes('main.js')));

  const cssVersionOk = css.some(h => h.includes('v=23.1'));
  const jsVersionOk = js.some(h => h.includes('v=23.1'));

  console.log(cssVersionOk ? "✅ CSS version OK" : "❌ CSS version mismatch");
  console.log(jsVersionOk ? "✅ JS version OK" : "❌ JS version mismatch");

  // Formation Lab basic checks
  const heroTitle = document.getElementById('heroTitle');
  const flabPitch = document.getElementById('flabPitch');
  const helpBtn = document.getElementById('flabHelpBtn');

  console.log(heroTitle ? "✅ Hero title present" : "❌ Hero title missing");
  console.log(flabPitch ? "✅ Formation Lab pitch present" : "❌ Formation Lab pitch missing");
  console.log(helpBtn ? "✅ Tutorial button present" : "❌ Tutorial button missing");

  // Check for critical Formation Lab state
  if (window.FormationLab) {
    console.log("✅ Formation Lab loaded");
    console.log("Formation Lab state keys:", Object.keys(window.FormationLab));
  } else {
    console.log("⚠️ Formation Lab global not found (may load async)");
  }

  console.log("🎉 Console verification complete!");
})().catch(err => {
  console.error("❌ Console verification failed:", err);
});