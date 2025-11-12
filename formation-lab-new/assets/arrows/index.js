// assets/arrows/index.js
// Universal arrow-head registry → wraps ANY local arrow asset as a proper SVG <marker>.
// Works for <symbol> sprites or standalone .svg files.

const SVGNS = "http://www.w3.org/2000/svg";

function ensureDefs(svg) {
  return svg.querySelector("defs") ||
         svg.insertBefore(document.createElementNS(SVGNS, "defs"), svg.firstChild);
}

function resolveSvgRoot(pathEl, fallbackSvg) {
  // 1) caller-provided wins
  if (fallbackSvg) return fallbackSvg;
  // 2) standard
  if (pathEl.ownerSVGElement) return pathEl.ownerSVGElement;
  // 3) walk up (handles detached nodes / shadow)
  if (pathEl.closest) {
    const found = pathEl.closest("svg");
    if (found) return found;
  }
  // 4) global fallbacks
  return document.getElementById("arrow-layer") || document.querySelector("svg");
}

/**
 * Create (or update) a <marker> from a provided node (a <path> or <g>).
 * @param {SVGSVGElement} svg - root svg
 * @param {string} markerId - unique id for the marker
 * @param {SVGGraphicsElement} node - element to append inside marker (<path>/<g>)
 * @param {object} opts - { viewBox, refX, refY, markerWidth, markerHeight, orient, markerUnits }
 */
function upsertMarkerFromNode(svg, markerId, node, opts = {}) {
  const defs = ensureDefs(svg);

  let marker = svg.getElementById(markerId);
  if (!marker) {
    marker = document.createElementNS(SVGNS, "marker");
    marker.setAttribute("id", markerId);
    defs.appendChild(marker);
  } else {
    while (marker.firstChild) marker.removeChild(marker.firstChild);
  }

  const {
    viewBox = "0 0 24 24",
    refX = 20,
    refY = 12,
    markerWidth = 8,
    markerHeight = 8,
    orient = "auto",
    markerUnits = "strokeWidth",
  } = opts;

  marker.setAttribute("viewBox", viewBox);
  marker.setAttribute("refX", String(refX));
  marker.setAttribute("refY", String(refY));
  marker.setAttribute("markerWidth", String(markerWidth));
  marker.setAttribute("markerHeight", String(markerHeight));
  marker.setAttribute("orient", orient);
  marker.setAttribute("markerUnits", markerUnits);
  marker.setAttribute("overflow", "visible");       // ← prevents "box" clipping
  marker.setAttribute("pointer-events", "none");

  marker.appendChild(node);
  return marker;
}

/**
 * Attach a registered head to a path.
 * Keeps line crisp while allowing marker to scale with stroke width.
 * Automatically ensures marker exists in the correct SVG.
 */
export function attachHead(pathEl, markerId, fallbackSvg = null) {
  // Ensure the path is actually in an <svg>. If not, defer.
  let svg = resolveSvgRoot(pathEl, fallbackSvg);
  if (!svg) {
    // Defer one frame in case caller attaches right after creating
    return new Promise((resolve, reject) => {
      requestAnimationFrame(() => {
        svg = resolveSvgRoot(pathEl, fallbackSvg);
        if (!svg) return reject(new Error("attachHead: path is not in an <svg> yet; append it before attaching."));
        try {
          resolve(attachHead(pathEl, markerId, svg));
        } catch (e) { reject(e); }
      });
    });
  }

  // Ensure marker exists in this svg; if not, clone from any other svg in the doc.
  let marker = svg.getElementById(markerId);
  if (!marker) {
    const global = document.getElementById(markerId);
    if (global) {
      const defs = ensureDefs(svg);
      marker = global.cloneNode(true);
      marker.setAttribute("overflow", "visible"); // safety on clone
      defs.appendChild(marker);
    } else {
      throw new Error(`attachHead: marker #${markerId} not found in document.`);
    }
  } else {
    marker.setAttribute("overflow", "visible");
  }

  // Attach & keep shaft crisp
  pathEl.setAttribute("marker-end", `url(#${markerId})`);
  pathEl.setAttribute("vector-effect", "non-scaling-stroke");
  return pathEl;
}

/**
 * Register a head from an existing <symbol> in the DOM sprite.
 * @param {SVGSVGElement} svg
 * @param {string} symbolId - e.g., "head-solid"
 * @param {string} markerId - e.g., "head-solid-marker"
 * @param {object} opts - sizing/ref options (see upsertMarkerFromNode)
 */
export function registerFromSymbol(svg, symbolId, markerId, opts = {}) {
  const sym = svg.getElementById(symbolId);
  if (!sym) throw new Error(`Symbol #${symbolId} not found in this SVG`);
  // Clone *children* (not the symbol itself) into a <g>
  const g = document.createElementNS(SVGNS, "g");
  Array.from(sym.childNodes).forEach(n => g.appendChild(n.cloneNode(true)));
  // (Optional) enforce fill/stroke if you want a specific style:
  // g.querySelectorAll('*').forEach(el => { el.setAttribute('fill', '#fff'); ... });
  return upsertMarkerFromNode(svg, markerId, g, opts);
}

/**
 * Register a head from a standalone SVG file in /assets/arrows.
 * @param {SVGSVGElement} svg
 * @param {string} url - relative path to the .svg (same-origin), e.g., "./assets/arrows/comic-flat.svg"
 * @param {string} selector - CSS selector to the head element inside that file (e.g., "path#tip" or "g#arrow")
 * @param {string} markerId - marker id to create
 * @param {object} opts - sizing/ref options
 */
export async function registerFromExternalSVG(svg, url, selector, markerId, opts = {}) {
  const resp = await fetch(url, { credentials: "same-origin" });
  const text = await resp.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const node = doc.querySelector(selector);
  if (!node) throw new Error(`Selector "${selector}" not found in ${url}`);

  const clone = node.cloneNode(true);
  // Ensure strokes are export-safe (optional)
  // if (!clone.getAttribute('stroke-linejoin')) clone.setAttribute('stroke-linejoin','round');

  return upsertMarkerFromNode(svg, markerId, clone, opts);
}

/**
 * Quick helper: register a classic triangular head like the white one.
 * Use this if you just have a 'd' path string.
 */
export function registerClassicTriangle(svgOrNull, {
  markerId = "arrow-head-custom",
  d = "M4,2 L22,12 L4,22 L8,12 Z",
  fill = "#fff",
  stroke = "#fff",
  strokeWidth = 1.25,
  opts = {}
} = {}) {
  // Allow caller to pass null; we'll resolve on first attach
  const svg = svgOrNull || document.getElementById("arrow-layer") || document.querySelector("svg");
  if (!svg) throw new Error("registerClassicTriangle: no SVG root available.");

  const path = document.createElementNS(SVGNS, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", fill);
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", String(strokeWidth));
  path.setAttribute("stroke-linejoin", "round");

  return upsertMarkerFromNode(svg, markerId, path, {
    viewBox: "0 0 24 24",
    refX: 20, refY: 12,
    markerWidth: 8, markerHeight: 8,
    orient: "auto",
    markerUnits: "strokeWidth",
    ...opts
  });
}

/**
 * One-shot fix for testing - creates a bullet-proof marker directly in the path's SVG
 * Use this in console to test if markers work at all
 */
export function createTestMarker() {
  const SVGNS = "http://www.w3.org/2000/svg";

  // 1) grab a real shaft path that is visible on the field
  const path = document.querySelector('path.pass-shaft');
  if (!path) {
    console.warn('No pass-shaft path found. Draw one first.');
    return;
  }

  const svg = path.ownerSVGElement;

  // 2) ensure <defs> in THIS svg
  const defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS(SVGNS,'defs'), svg.firstChild);

  // 3) remove any old copies so we don't reference a broken one
  const old = svg.getElementById('arrow-head-test');
  if (old) old.remove();

  // 4) build a fresh, self-contained marker (no external refs)
  const marker = document.createElementNS(SVGNS, 'marker');
  marker.setAttribute('id', 'arrow-head-test');
  marker.setAttribute('viewBox', '0 0 24 24');
  marker.setAttribute('refX', '20');
  marker.setAttribute('refY', '12');
  marker.setAttribute('markerWidth', '8');
  marker.setAttribute('markerHeight', '8');
  marker.setAttribute('orient', 'auto');
  marker.setAttribute('markerUnits', 'strokeWidth');
  marker.setAttribute('overflow', 'visible');          // ← avoids clipping causing a "box"
  marker.setAttribute('pointer-events', 'none');

  const tri = document.createElementNS(SVGNS, 'path');
  tri.setAttribute('d', 'M4,2 L22,12 L4,22 L8,12 Z');   // tip toward +X, tip near x≈22
  tri.setAttribute('fill', '#ffffff');                  // white head
  tri.setAttribute('stroke', '#ffffff');                // white edge to stay crisp
  tri.setAttribute('stroke-width', '1.25');
  tri.setAttribute('stroke-linejoin', 'round');

  marker.appendChild(tri);
  defs.appendChild(marker);

  // 5) attach and ensure crisp shaft
  path.setAttribute('marker-end', 'url(#arrow-head-test)');
  path.setAttribute('vector-effect', 'non-scaling-stroke');

  // 6) sanity: show what the marker actually contains
  console.log(svg.getElementById('arrow-head-test').outerHTML);
  console.log('✅ Attached arrow-head-test to the selected pass path.');

  return { path, marker, svg };
}