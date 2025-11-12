// assets/arrows/white-head.js
// Registers and applies the crisp white arrow head marker used in the UI.

const XLINK = "http://www.w3.org/1999/xlink";
const SVGNS = "http://www.w3.org/2000/svg";

let _installed = false;
let _refX = 20; // base docking point; tweak via tuneWhiteHead(+/-)

export function ensureWhiteHead(svg) {
  if (_installed && svg.getElementById("arrow-head-white")) return;

  // If an external SVG file is inlined at build, you may already have <marker>.
  // Otherwise create it programmatically (functional duplicate of the .svg file).
  const defs = svg.querySelector("defs") || svg.insertBefore(
    document.createElementNS(SVGNS, "defs"),
    svg.firstChild
  );

  let marker = svg.getElementById("arrow-head-white");
  if (!marker) {
    marker = document.createElementNS(SVGNS, "marker");
    marker.setAttribute("id", "arrow-head-white");
    marker.setAttribute("viewBox", "0 0 24 24");
    marker.setAttribute("refX", String(_refX));
    marker.setAttribute("refY", "12");
    marker.setAttribute("markerWidth", "8");
    marker.setAttribute("markerHeight", "8");
    marker.setAttribute("orient", "auto");
    marker.setAttribute("markerUnits", "strokeWidth");

    const path = document.createElementNS(SVGNS, "path");
    path.setAttribute("d", "M4,2 L22,12 L4,22 L8,12 Z");
    path.setAttribute("fill", "#FFFFFF");
    path.setAttribute("stroke", "#FFFFFF");
    path.setAttribute("stroke-width", "1.25");
    path.setAttribute("stroke-linejoin", "round");
    marker.appendChild(path);

    defs.appendChild(marker);
  }

  _installed = true;
}

export function attachWhiteHead(pathEl) {
  const svg = pathEl.ownerSVGElement;
  ensureWhiteHead(svg);
  pathEl.setAttribute("marker-end", "url(#arrow-head-white)");
  // Keep line crisp while allowing marker to scale with stroke:
  pathEl.setAttribute("vector-effect", "non-scaling-stroke");
}

export function tuneWhiteHead(refXDelta = 0) {
  _refX = 20 + (refXDelta | 0); // clamp to int
  const markers = document.querySelectorAll("#arrow-head-white");
  markers.forEach(m => m.setAttribute("refX", String(_refX)));
}