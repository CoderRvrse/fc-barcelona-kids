import assert from "node:assert";
import { setTimeout as delay } from "node:timers/promises";
const URL_BASE = "https://coderrvrse.github.io/fc-barcelona-kids/";

async function get(u, opts={}) {
  const r = await fetch(u, opts);
  return { status: r.status, text: await r.text(), headers: r.headers };
}

(async () => {
  console.log("🔎 Fetching home page...");
  const home = await get(URL_BASE);
  assert.equal(home.status, 200, "Home not 200");
  assert(home.text.includes('styles/main.css?v=23.1'), "CSS tag missing");
  assert(home.text.includes('scripts/main.js?v=23.1'), "JS tag missing");

  console.log("🔎 Fetching service worker...");
  const sw = await get(URL_BASE + "sw.js");
  assert.equal(sw.status, 200, "SW not 200");
  assert(sw.text.includes("VERSION = 'v23.1'"), "SW version mismatch");

  console.log("✅ Versioned assets + SW OK");

  // Basic Formation Lab checks
  assert(home.text.includes('id="heroTitle"'), "Hero title missing");
  assert(home.text.includes('id="flabPitch"'), "Formation Lab pitch missing");
  assert(home.text.includes('Export'), "Export button missing");
  assert(home.text.includes('flabHelpBtn'), "Tutorial button missing");

  console.log("✅ Formation Lab elements verified");
  console.log("🎉 v23.1 verification complete.");
})().catch(err => {
  console.error("❌ Verification failed:", err.message);
  process.exit(1);
});