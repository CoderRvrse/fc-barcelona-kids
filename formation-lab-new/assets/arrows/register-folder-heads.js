// assets/arrows/register-folder-heads.js
// Make your saved heads usable as <marker>s: solid, comic-flat, comic-halftone.

const SVGNS = "http://www.w3.org/2000/svg";

function ensureDefs(svg) {
  return svg.querySelector("defs") ||
         svg.insertBefore(document.createElementNS(SVGNS, "defs"), svg.firstChild);
}

// Expand <use> into real shapes so markers aren't empty
function expandUses(root) {
  root.querySelectorAll("use").forEach(u => {
    const href = u.getAttribute("href") || u.getAttributeNS("http://www.w3.org/1999/xlink","href");
    if (!href || !href.startsWith("#")) return;
    const src = root.querySelector(href);
    if (!src) return;
    const clone = src.cloneNode(true);
    const x = +u.getAttribute("x") || 0;
    const y = +u.getAttribute("y") || 0;
    if (x || y) clone.setAttribute("transform", `translate(${x},${y})`);
    u.replaceWith(clone);
  });
}

// Mount offscreen to measure bbox
function measureAndClone(node) {
  const scratch = document.createElementNS(SVGNS, "svg");
  scratch.setAttribute("width", "0");
  scratch.setAttribute("height", "0");
  scratch.style.position = "absolute";
  scratch.style.left = "-99999px";
  scratch.style.top  = "-99999px";

  const g = document.createElementNS(SVGNS, "g");
  g.appendChild(node.cloneNode(true));
  scratch.appendChild(g);
  document.body.appendChild(scratch);

  expandUses(scratch);

  const bbox = g.getBBox(); // will be valid since it's visible (offscreen)
  document.body.removeChild(scratch);

  const clone = document.createElementNS(SVGNS, "g");
  Array.from(node.childNodes || []).forEach(ch => {
    if (ch.nodeType === 1) clone.appendChild(ch.cloneNode(true));
  });
  if (!clone.firstChild && node.tagName.toLowerCase() !== "g") {
    clone.appendChild(node.cloneNode(true));
  }
  return { clone, bbox };
}

// Normalize any shape into a 24×24 right-pointing marker
function toMarker(svg, markerId, shape, bbox, {
  forceFill = null, forceStroke = null, forceStrokeWidth = null
} = {}) {
  const defs = ensureDefs(svg);

  // optional force style (avoids invisible outline-only heads)
  if (forceFill || forceStroke || forceStrokeWidth != null) {
    shape.querySelectorAll("*").forEach(el => {
      if (forceFill) el.setAttribute("fill", forceFill);
      if (forceStroke) el.setAttribute("stroke", forceStroke);
      if (forceStrokeWidth != null) el.setAttribute("stroke-width", String(forceStrokeWidth));
      if (!el.getAttribute("stroke-linejoin")) el.setAttribute("stroke-linejoin","round");
    });
  }

  // Fit into 24×24, align tip to ~x=22,y=12 (assume tip is at bbox.maxX)
  const targetW = 24, targetH = 24, pad = 2;
  const usableW = targetW - pad*2, usableH = targetH - pad*2;
  const sx = usableW / bbox.width, sy = usableH / bbox.height, s = Math.min(sx, sy);

  const tipTargetX = 22;
  const xToLeft    = pad - bbox.x * s;
  const xAdjust    = tipTargetX - (pad + bbox.width * s);
  const tx = xToLeft + xAdjust;

  const yToCenter  = pad + (usableH/2) - (bbox.y*s + bbox.height*s/2);
  const ty = yToCenter;

  shape.setAttribute("transform", `translate(${tx},${ty}) scale(${s})`);

  // Upsert marker
  let marker = svg.getElementById(markerId);
  if (!marker) {
    marker = document.createElementNS(SVGNS, "marker");
    marker.setAttribute("id", markerId);
    defs.appendChild(marker);
  } else {
    while (marker.firstChild) marker.removeChild(marker.firstChild);
  }

  marker.setAttribute("viewBox", "0 0 24 24");
  marker.setAttribute("refX", "20");
  marker.setAttribute("refY", "12");
  marker.setAttribute("markerWidth", "8");
  marker.setAttribute("markerHeight", "8");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");
  marker.setAttribute("overflow", "visible");
  marker.setAttribute("pointer-events", "none");
  const passColor = shape.getAttribute('data-pass-color') || window.PASS?.color || getComputedStyle(document.documentElement).getPropertyValue('--pass-color').trim() || '#ffd166';
  marker.style.color = passColor;
  marker.setAttribute('data-pass-color', passColor);
  marker.setAttribute('color', passColor);
  marker.appendChild(shape);
  return marker;
}

async function normalizeFile(svg, url, markerId, { selectorList, forceFill, forceStroke, forceStrokeWidth } = {}) {
  const text = await (await fetch(url, { credentials: "same-origin" })).text();
  const doc  = new DOMParser().parseFromString(text, "image/svg+xml");

  // Try several selectors commonly produced by editors
  const candidates = selectorList || [
    "g#tip", "path#tip",           // explicit ids if you added them
    "svg > g:last-of-type",        // last group often contains the head
    "svg > path:last-of-type",     // last path often the head
    "g:last-of-type", "path:last-of-type"
  ];

  let node = null;
  for (const sel of candidates) {
    node = doc.querySelector(sel);
    if (node) break;
  }
  if (!node) {
    // fallback: if the root is <svg>, use its children
    node = doc.documentElement.tagName.toLowerCase() === "svg"
      ? doc.documentElement
      : null;
  }
  if (!node) throw new Error(`No head candidate found in ${url}`);

  // If node is <svg>, wrap its children into a <g>
  if (node.tagName.toLowerCase() === "svg") {
    const g = doc.createElementNS(SVGNS, "g");
    Array.from(node.childNodes).forEach(ch => ch.nodeType === 1 && g.appendChild(ch.cloneNode(true)));
    node = g;
  }

  const { clone, bbox } = measureAndClone(node);
  clone.setAttribute('data-pass-color', forceFill === 'currentColor' ? (window.PASS?.color || getComputedStyle(document.documentElement).getPropertyValue('--pass-color').trim() || '#ffd166') : forceFill);
  return toMarker(svg, markerId, clone, bbox, { forceFill, forceStroke, forceStrokeWidth });
}

/**
 * Public API:
 * Registers your three heads on the provided SVG.
 * Colors are optional; change or remove the force* to keep original fills/strokes.
 */
export async function registerFolderHeads(svg, {
  basePath = "./assets/arrows/",
  colorize = null // will be set to current PASS.color
} = {}) {
  // Get current color from multiple sources
  let currentColor = '#ffd166'; // fallback

  // Try CSS variable first
  const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--pass-color').trim();
  if (cssVar) {
    currentColor = cssVar;
  }

  // Try PASS.color if available
  if (window.PASS?.color) {
    currentColor = window.PASS.color;
  }

  const actualColorize = colorize || { fill: currentColor, stroke: currentColor, strokeWidth: 1.5 };

  console.log(`🎨 Loading custom arrow heads with color: ${currentColor} (CSS: ${cssVar}, PASS: ${window.PASS?.color})`);
  if (!svg) throw new Error("registerFolderHeads: provide the root <svg>.");

  console.log('🎨 Loading custom arrow heads from folder...');

  try {
    // Solid
    const solid = await normalizeFile(svg,
      `${basePath}head-solid.svg`,
      "head-solid",
      { forceFill: 'currentColor', forceStroke: 'currentColor', forceStrokeWidth: actualColorize.strokeWidth }
    );
    const flat = await normalizeFile(svg,
      `${basePath}head-comic-flat.svg`,
      "head-comic-flat",
      { forceFill: 'currentColor', forceStroke: 'currentColor', forceStrokeWidth: actualColorize.strokeWidth }
    );
    const half = await normalizeFile(svg,
      `${basePath}head-comic-halftone.svg`,
      "head-comic-halftone",
      { forceFill: 'currentColor', forceStroke: 'currentColor', forceStrokeWidth: actualColorize.strokeWidth }
    );

    [solid, flat, half].forEach(marker => {
      if (marker) {
        marker.style.color = actualColorize.fill;
        marker.setAttribute('data-pass-color', actualColorize.fill);
        marker.setAttribute('color', actualColorize.fill);
      }
    });

    console.log('✅ Custom arrow heads loaded successfully');
    return true;
  } catch (error) {
    console.warn('⚠️ Could not load custom heads, keeping simple triangles:', error.message);
    return false;
  }
}

// Simple attach - compatible with existing system
export function attachHead(pathEl, markerId) {
  const svg = pathEl.ownerSVGElement || pathEl.closest("svg");
  if (!svg) throw new Error("attachHead: path is not in an <svg>.");
  pathEl.setAttribute("marker-end", `url(#${markerId})`);
  pathEl.setAttribute("vector-effect", "non-scaling-stroke");
  return pathEl;
}