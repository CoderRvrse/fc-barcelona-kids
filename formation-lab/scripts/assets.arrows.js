// Arrow Assets Module for Formation Lab
// Preloads SVG arrow assets for markers, symbols, and canvas export
import { HEADS } from './state.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// ✅ This MUST match the normalized symbol viewBox size
export const HEAD_BASE = 24; // not 120 / 187.5 / 200 — use 24px canonical

// Per-style micro-overlaps to hide seams (px in view space)
export const HEAD_OVERLAP = {
  'solid':        2,
  'comic-flat':   2,
  'comic-halftone': 2,
};

// ⬇︎ StrokeWidth-based sizing (smaller k if you want smaller heads)
export function computeHeadScale(strokeWidth) {
  const k = 2.4;                      // visual tuning coefficient
  const s = (strokeWidth * k) / HEAD_BASE;
  // sane bounds so we never hit 0.100 "min clamp"
  return Math.max(0.55, Math.min(s, 3.0));
}

export const ARROW_ASSETS = new Map(); // key -> {svgText, viewBox:[w,h], img}

export async function preloadArrowAssets(stylesList) {
  await Promise.all(stylesList.map(async ({ key, asset }) => {
    try {
      const res = await fetch(asset);
      const txt = await res.text();

      // Extract viewBox from SVG
      const match = txt.match(/viewBox\s*=\s*"([^"]+)"/i);
      const [, viewBoxStr] = match || [null, '0 0 256 256']; // default square if not set
      const [, , w, h] = viewBoxStr.split(/\s+/).map(parseFloat);

      // Create canvas image for export
      const img = new Image();
      img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(txt);

      // Wait for image to load
      await img.decode().catch(() => {
        console.warn(`Failed to decode arrow asset: ${asset}`);
      });

      ARROW_ASSETS.set(key, {
        svgText: txt,
        viewBox: [w || 256, h || 256],
        img
      });

      console.log(`✅ Arrow asset loaded: ${key} (${w}×${h})`);
    } catch (error) {
      console.error(`❌ Failed to load arrow asset: ${asset}`, error);
    }
  }));
}

/**
 * Ensures arrow-defs exists under #arrow-layer
 */
function ensureArrowDefs() {
  const arrowLayer = document.getElementById('arrow-layer');
  if (!arrowLayer) {
    console.warn('ensureArrowDefs: #arrow-layer not found');
    return null;
  }

  let defs = arrowLayer.querySelector('#arrow-defs');
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    defs.id = 'arrow-defs';
    arrowLayer.appendChild(defs);
  }

  return defs;
}

/**
 * Normalizes SVG to canonical form: base at (0,0), tip to +X, proper scaling
 * @param {string} svgText - Raw SVG file content
 * @param {Object} spec - Head specification with baseSize
 * @returns {SVGSymbolElement} - Normalized symbol element
 */
function normalizeAsSymbol(svgText, spec) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svgEl = doc.documentElement;

  // Create normalized symbol with square viewBox
  const symbol = document.createElementNS(SVG_NS, 'symbol');
  symbol.setAttribute('viewBox', `0 0 ${spec.baseSize} ${spec.baseSize}`);

  // Extract all graphic content
  const content = Array.from(svgEl.children);

  // Compute bounding box of the original content
  const tempSvg = document.createElementNS(SVG_NS, 'svg');
  tempSvg.style.position = 'absolute';
  tempSvg.style.visibility = 'hidden';
  tempSvg.style.width = '200px';
  tempSvg.style.height = '200px';
  document.body.appendChild(tempSvg);

  const tempGroup = document.createElementNS(SVG_NS, 'g');
  content.forEach(child => {
    tempGroup.appendChild(child.cloneNode(true));
  });
  tempSvg.appendChild(tempGroup);

  let bbox;
  try {
    bbox = tempGroup.getBBox();
  } catch (e) {
    // Fallback if getBBox fails
    bbox = { x: 0, y: 0, width: 24, height: 24 };
  }
  document.body.removeChild(tempSvg);

  // Per-asset normalization tweaks (manual adjustments for proper orientation)
  const adjustments = {
    'solid': { dx: 0, dy: 0, rotate: 0 },
    'comic-flat': { dx: 0, dy: 0, rotate: 0 },
    'comic-halftone': { dx: 0, dy: 0, rotate: 0 }
  };

  const adj = adjustments[spec.key] || { dx: 0, dy: 0, rotate: 0 };

  // Create the normalized group
  const g = document.createElementNS(SVG_NS, 'g');
  g.classList.add('head-content');

  // Fixed normalization: proper SVG transform order and calculation
  // Scale factor to fit the original content into our 24x24 baseSize
  const scale = spec.baseSize / Math.max(bbox.width, bbox.height, 1);

  console.log(`🔧 Normalizing ${spec.key}: bbox=${bbox.width.toFixed(1)}×${bbox.height.toFixed(1)} at (${bbox.x.toFixed(1)},${bbox.y.toFixed(1)}), scale=${scale.toFixed(3)}`);

  // Calculate the translation needed BEFORE scaling
  // We want: base at (0,0), tip pointing to +X, centered vertically in 24x24

  // First, move the content so its left edge is at x=0
  const translateX = -bbox.x;

  // Then center it vertically in the 24x24 space
  // The scaled content will be (bbox.height * scale) tall
  // We want it centered in the 24px height
  const scaledHeight = bbox.height * scale;
  const translateY = -bbox.y + (spec.baseSize - scaledHeight) / 2;

  // Apply translate first, then scale (SVG transform order matters!)
  const transform = `translate(${translateX}, ${translateY}) scale(${scale})`;
  g.setAttribute('transform', transform);

  console.log(`🔧 Transform: translate(${translateX.toFixed(1)}, ${translateY.toFixed(1)}) scale(${scale.toFixed(3)})`);

  // Copy all content and ensure they use currentColor
  content.forEach(child => {
    const cloned = child.cloneNode(true);

    // Set fill to currentColor for styling control
    if (cloned.setAttribute) {
      if (cloned.getAttribute('fill') && cloned.getAttribute('fill') !== 'none') {
        cloned.setAttribute('fill', 'currentColor');
      }
      if (cloned.getAttribute('stroke') && cloned.getAttribute('stroke') !== 'none') {
        cloned.setAttribute('stroke', 'currentColor');
      }
    }

    // Apply to child elements too
    const fillElements = cloned.querySelectorAll?.('[fill]:not([fill="none"])') || [];
    fillElements.forEach(el => el.setAttribute('fill', 'currentColor'));

    const strokeElements = cloned.querySelectorAll?.('[stroke]:not([stroke="none"])') || [];
    strokeElements.forEach(el => el.setAttribute('stroke', 'currentColor'));

    g.appendChild(cloned);
  });

  symbol.appendChild(g);
  return symbol;
}

/**
 * Creates a marker definition with proper refX/refY positioning
 */
function createMarker(defs, style, pathData) {
  // Remove existing marker
  const existing = defs.querySelector(`#head-${style}`);
  if (existing) {
    existing.remove();
  }

  const marker = document.createElementNS(SVG_NS, 'marker');
  marker.setAttribute('id', `head-${style}`);
  marker.setAttribute('viewBox', '0 0 24 24');
  marker.setAttribute('refX', '20');  // tip near x=22, so refX=20 puts tip exactly on path end
  marker.setAttribute('refY', '12');  // center vertically
  marker.setAttribute('markerWidth', '8');
  marker.setAttribute('markerHeight', '8');
  marker.setAttribute('orient', 'auto');
  marker.setAttribute('markerUnits', 'strokeWidth');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', pathData);
  path.setAttribute('fill', 'currentColor');

  // Add stroke for comic styles
  if (style.includes('comic')) {
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1');
    path.setAttribute('stroke-linejoin', 'round');
  }

  marker.appendChild(path);
  defs.appendChild(marker);

  console.log(`  ✅ Marker ${style} created with refX=20, refY=12`);
}

/**
 * Creates working SVG markers - tries custom heads first, fallback to simple triangles
 */
export async function preloadArrowHeads() {
  const svg = document.querySelector('svg') || document.getElementById('arrow-layer');
  if (!svg) return;

  console.log('🏹 Loading arrow markers...');

  try {
    // Try loading custom SVG heads from folder first
    const { registerFolderHeads } = await import('../assets/arrows/register-folder-heads.js');
    const success = await registerFolderHeads(svg);

    if (success) {
      console.log('✅ Custom folder heads loaded');
    } else {
      throw new Error('Custom heads failed, falling back');
    }
  } catch (error) {
    console.log('⚠️ Using simple triangle fallback');
    // Fallback to simple working triangles
    const { installSimpleMarkers } = await import('../assets/arrows/simple-markers.js');
    installSimpleMarkers(svg);
  }

  convertExistingHeadsToMarkers();
}

/**
 * Creates a simple working marker that actually renders
 */
function createWorkingMarker(svg, markerId) {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Ensure defs
  const defs = svg.querySelector('defs') || svg.insertBefore(
    document.createElementNS(SVG_NS, 'defs'), svg.firstChild
  );

  // Remove old broken marker
  const existing = svg.getElementById(markerId);
  if (existing) existing.remove();

  // Create simple working marker
  const marker = document.createElementNS(SVG_NS, 'marker');
  marker.setAttribute('id', markerId);
  marker.setAttribute('viewBox', '0 0 24 24');
  marker.setAttribute('refX', '20');
  marker.setAttribute('refY', '12');
  marker.setAttribute('markerWidth', '8');
  marker.setAttribute('markerHeight', '8');
  marker.setAttribute('orient', 'auto');
  marker.setAttribute('markerUnits', 'strokeWidth');
  marker.setAttribute('overflow', 'visible');

  // Create simple triangle
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M4,2 L22,12 L4,22 L8,12 Z');
  path.setAttribute('fill', '#ffd166');
  path.setAttribute('stroke', '#1d1300');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-linejoin', 'round');

  marker.appendChild(path);
  defs.appendChild(marker);

  console.log(`✅ Created working marker: ${markerId}`);
}

/**
 * Converts existing symbol-based heads to marker-based approach
 */
function convertExistingHeadsToMarkers() {
  const arrowGroup = document.getElementById('arrow-group');
  if (!arrowGroup) return;

  const passes = arrowGroup.querySelectorAll('[data-arrow-id]');
  console.log(`🔄 Converting ${passes.length} passes to marker-based heads...`);

  passes.forEach((passGroup, i) => {
    const shaft = passGroup.querySelector('.pass-shaft');
    const headGroup = passGroup.querySelector('.pass-head');

    if (shaft && headGroup) {
      // Remove the old head group
      headGroup.remove();

      // Apply marker to the shaft instead
      const currentStyle = FLAB?.passStyle || 'solid';
      shaft.setAttribute('marker-end', `url(#head-${currentStyle})`);

      console.log(`  🔄 Pass ${i + 1} converted to marker-based head`);
    }
  });

  console.log('🔄 Conversion to markers complete');
}

/**
 * Force refresh all existing arrow heads to use the new custom symbols
 */
function refreshExistingArrowHeads() {
  const arrowGroup = document.getElementById('arrow-group');
  if (!arrowGroup) return;

  const headGroups = arrowGroup.querySelectorAll('.pass-head');
  console.log(`🔄 Refreshing ${headGroups.length} existing arrow heads...`);

  headGroups.forEach(headGroup => {
    const useEl = headGroup.querySelector('use');
    if (useEl) {
      const href = useEl.getAttribute('href');
      console.log(`  🔄 Refreshing head with href: ${href}`);

      // Force re-reference the symbol by setting href again
      if (href) {
        useEl.setAttribute('href', href);
        useEl.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
      }
    }
  });

  console.log('🔄 Arrow head refresh complete');
}

/**
 * Export refresh function for global access
 */
export { refreshExistingArrowHeads };

// Global debugging helper
window.refreshArrowHeads = () => {
  console.log('🔧 Manual arrow head refresh triggered...');
  refreshExistingArrowHeads();
};

// Global helper to recreate arrow symbols
window.recreateArrowSymbols = async () => {
  console.log('🔧 Manual symbol recreation triggered...');
  await preloadArrowHeads();
};

// Global emergency function using the clean simple-markers system
window.forceFixArrows = async () => {
  const { forceFixArrows } = await import('../assets/arrows/simple-markers.js');
  forceFixArrows();
};

// Legacy functions
window.forceRecreateAllArrowHeads = window.forceFixArrows;

// Diagnostic function for quick sanity checks
window.diagArrowHeads = () => {
  console.log('🔧 Arrow Head Diagnostics (Marker-based):');
  const shafts = [...document.querySelectorAll('path.pass-shaft')];
  shafts.forEach((p, i) => {
    const L  = p.getTotalLength();
    const hb = +p.dataset.headBaseLen || L;
    const marker = p.getAttribute('marker-end');
    console.log(`Pass ${i + 1}:`, {
      L: L.toFixed(1),
      headBase: hb.toFixed(1),
      gap: (L-hb).toFixed(2),
      marker: marker || 'NO MARKER'
    });
  });
};

window.__mod_arrowassets = true;