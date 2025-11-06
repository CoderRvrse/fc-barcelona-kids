// Pass layer initialization for Formation Lab
import { ensureGroup } from './svgroot.js';

export function initPassLayer() {
  // Ensure the arrow svg and a dedicated preview group exist
  const g = ensureGroup('pass-preview');   // <svg id="arrow-layer"><g id="pass-preview">
  g.setAttribute('data-ready', '');         // simple flag if you want to probe it
  // Optional: keep it empty & click-through
  g.style.pointerEvents = 'none';
}

window.__mod_pass_init = true;