// Pass Markers Module for Formation Lab
// Creates SVG markers using preloaded arrow assets

import { ARROW_ASSETS } from './assets.arrows.js';
import { getVar } from './geometry.js';
import { PASS } from './state.js';
import { headPxFor } from './pass.headsize.js';

// Recolor SVG content with current pass colors
function recolorSVG(svgText, fillColor, strokeColor) {
  return svgText
    .replace(/fill\s*=\s*["'][^"']*["']/gi, `fill="${fillColor}"`)
    .replace(/stroke\s*=\s*["'][^"']*["']/gi, `stroke="${strokeColor}"`);
}

export function ensureHeadMarker(defs, styleKey, lengthPx) {
  const headPx = headPxFor(lengthPx, /comic/.test(styleKey));
  const shaftColor = getComputedStyle(document.documentElement).getPropertyValue('--pass-color')?.trim() || PASS.color;
  const outlineColor = getComputedStyle(document.documentElement).getPropertyValue('--pass-outline')?.trim() || PASS.outline;

  // Include color in cache key so markers rebuild when color changes
  const colorHash = shaftColor.replace('#', '');
  const id = `passHead-${styleKey}-${headPx}-${colorHash}`;
  let mk = defs.querySelector(`#${id}`);
  if (mk) return id;

  const asset = ARROW_ASSETS.get(styleKey);
  if (!asset) {
    console.warn(`Arrow asset not found for style: ${styleKey}`);
    return null;
  }

  const [vbw, vbh] = asset.viewBox;
  const scale = headPx / Math.max(vbw, vbh); // preserve aspect ratio

  mk = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  mk.setAttribute('id', id);
  mk.setAttribute('markerUnits', 'userSpaceOnUse'); // size in px
  mk.setAttribute('orient', 'auto');
  mk.setAttribute('markerWidth', headPx);
  mk.setAttribute('markerHeight', headPx);
  mk.setAttribute('refX', headPx); // tip at end
  mk.setAttribute('refY', headPx / 2);
  mk.setAttribute('viewBox', `0 0 ${headPx} ${headPx}`);

  // Recolor the SVG with current pass colors
  const coloredSVG = recolorSVG(asset.svgText, shaftColor, outlineColor);

  // Embed the colored arrow SVG as an <image> scaled to headPx box
  const img = document.createElementNS(mk.namespaceURI, 'image');
  img.setAttribute('href', 'data:image/svg+xml;utf8,' + encodeURIComponent(coloredSVG));
  img.setAttribute('x', 0);
  img.setAttribute('y', (headPx - vbh * scale) / 2); // center if not square
  img.setAttribute('width', vbw * scale);
  img.setAttribute('height', vbh * scale);

  mk.appendChild(img);
  defs.appendChild(mk);
  return id;
}

// Clear all existing markers (for color changes)
export function rebuildAllMarkers() {
  console.log('🔄 rebuildAllMarkers called - clearing and regenerating markers');
  const defs = document.querySelector('#arrow-layer defs');
  if (!defs) {
    console.warn('No #arrow-layer defs found');
    return;
  }

  // Clear only marker nodes (both old and new styles)
  const markers = defs.querySelectorAll('marker[id^="passHead-"], marker[id^="head-"]');
  console.log(`Removing ${markers.length} existing markers`);
  markers.forEach(n => n.remove());

  // Force regeneration of new marker system
  import('../assets/arrows/simple-markers.js').then(({ forceFixArrows }) => {
    console.log('🔄 Calling forceFixArrows to regenerate markers');
    forceFixArrows();
  }).catch(() => {
    console.log('🔄 Fallback: using preloadArrowHeads');
    // Fallback: recreate markers manually
    import('../scripts/assets.arrows.js').then(({ preloadArrowHeads }) => {
      preloadArrowHeads();
    }).catch(console.error);
  });
}

window.__mod_passmarkers = true;