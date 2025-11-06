const SVG_NS = "http://www.w3.org/2000/svg";
const DEFAULT_COLOR = '#ffd166';
const DEFAULT_STROKE_WIDTH = 1.5;
const MARKER_IDS = ['head-solid', 'head-comic-flat', 'head-comic-halftone'];

function resolvePassColor() {
  let color = DEFAULT_COLOR;
  try {
    const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--pass-color').trim();
    if (cssVar) color = cssVar;
  } catch (_) {
    // ignore in non-browser contexts
  }
  if (window.PASS?.color) {
    color = window.PASS.color;
  }
  return color || DEFAULT_COLOR;
}

function resolveMarkerStyles(color = resolvePassColor()) {
  return MARKER_IDS.reduce((acc, id) => {
    acc[id] = { fill: color, stroke: color, strokeWidth: DEFAULT_STROKE_WIDTH };
    return acc;
  }, {});
}

function ensureDefs(svg) {
  if (!svg) throw new Error('ensureDefs: svg is required');
  return svg.querySelector('defs') || svg.insertBefore(document.createElementNS(SVG_NS, 'defs'), svg.firstChild);
}

function createTriangle(style) {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M4,2 L22,12 L4,22 L8,12 Z');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', String(style.strokeWidth));
  path.setAttribute('stroke-linejoin', 'round');
  return path;
}

function upsertMarker(svg, id, style) {
  const defs = ensureDefs(svg);
  let marker = svg.getElementById(id);
  if (!marker) {
    marker = document.createElementNS(SVG_NS, 'marker');
    marker.setAttribute('id', id);
    defs.appendChild(marker);
  } else {
    while (marker.firstChild) marker.removeChild(marker.firstChild);
  }

  marker.setAttribute('viewBox', '0 0 24 24');
  marker.setAttribute('refX', '20');
  marker.setAttribute('refY', '12');
  marker.setAttribute('markerWidth', '8');
  marker.setAttribute('markerHeight', '8');
  marker.setAttribute('orient', 'auto');
  marker.setAttribute('markerUnits', 'strokeWidth');
  marker.setAttribute('overflow', 'visible');
  marker.setAttribute('pointer-events', 'none');
  marker.style.color = style.fill;
  marker.setAttribute('data-pass-color', style.fill);
  marker.setAttribute('color', style.fill);
  marker.appendChild(createTriangle(style));
  return marker;
}

export function installSimpleMarkers(svg, styles) {
  if (!svg) throw new Error('installSimpleMarkers: svg is required');
  const current = styles || resolveMarkerStyles();
  Object.entries(current).forEach(([id, style]) => upsertMarker(svg, id, style));
}

const recentAttempts = new WeakMap();

function markerIdFor(style) {
  if (style && MARKER_IDS.includes(`head-${style}`)) {
    return `head-${style}`;
  }
  switch (style) {
    case 'solid':
    case 'head-solid':
      return 'head-solid';
    case 'comic-halftone':
    case 'head-comic-halftone':
      return 'head-comic-halftone';
    case 'comic-flat':
    case 'head-comic-flat':
    default:
      return 'head-comic-flat';
  }
}

function ensureMarkerForPath(pathEl, preferredStyle) {
  const svg = pathEl.ownerSVGElement || pathEl.closest('svg');
  if (!svg) return null;
  const markerId = markerIdFor(preferredStyle || pathEl.dataset.passStyle);
  if (!svg.getElementById(markerId)) {
    installSimpleMarkers(svg);
  }
  return markerId;
}

function isPathReady(pathEl) {
  return Boolean(pathEl && pathEl.isConnected && (pathEl.ownerSVGElement || pathEl.closest('svg')));
}

export function attachHead(pathEl, markerId = 'head-comic-flat') {
  if (!pathEl) return pathEl;
  const desiredMarker = markerIdFor(markerId);
  const svg = pathEl.ownerSVGElement || pathEl.closest('svg');

  if (svg && isPathReady(pathEl)) {
    const id = ensureMarkerForPath(pathEl, desiredMarker);
    if (id) {
      pathEl.setAttribute('marker-end', `url(#${id})`);
      pathEl.setAttribute('vector-effect', 'non-scaling-stroke');
    }
    return pathEl;
  }

  const now = performance?.now?.() ?? Date.now();
  const last = recentAttempts.get(pathEl) || 0;
  if (now - last < 16) {
    pathEl.setAttribute('marker-end', `url(#${desiredMarker})`);
    pathEl.setAttribute('vector-effect', 'non-scaling-stroke');
    return pathEl;
  }
  recentAttempts.set(pathEl, now);

  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryAttach = () => {
      attempts += 1;
      const ready = isPathReady(pathEl);
      const svgRef = pathEl.ownerSVGElement || pathEl.closest('svg');
      if (ready && svgRef) {
        try {
          const id = ensureMarkerForPath(pathEl, desiredMarker);
          if (id) {
            pathEl.setAttribute('marker-end', `url(#${id})`);
            pathEl.setAttribute('vector-effect', 'non-scaling-stroke');
            resolve(pathEl);
            return;
          }
        } catch (err) {
          // fall through to retry
        }
      }
      if (attempts >= 4) {
        try {
          pathEl.setAttribute('marker-end', `url(#${desiredMarker})`);
          pathEl.setAttribute('vector-effect', 'non-scaling-stroke');
          resolve(pathEl);
        } catch (err) {
          reject(err);
        }
        return;
      }
      setTimeout(() => requestAnimationFrame(tryAttach), attempts * 12);
    };
    tryAttach();
  });
}

export function convertExistingPasses(root = document) {
  const paths = root.querySelectorAll('path.pass-shaft');
  let count = 0;
  paths.forEach(pathEl => {
    const style = pathEl.dataset.passStyle || window.FLAB?.passStyle || 'comic-flat';
    const markerId = markerIdFor(style);
    attachHead(pathEl, markerId);
    count += 1;
  });
  return count;
}

export function updateMarkerColors(color = resolvePassColor()) {
  const svg = document.getElementById('arrow-layer');
  if (!svg) return;
  const markers = svg.querySelectorAll('marker[id^="head-"]');
  markers.forEach(marker => {
    marker.style.color = color;
    marker.setAttribute('data-pass-color', color);
    marker.setAttribute('color', color);
    marker.querySelectorAll('[stroke-width]').forEach(node => {
      node.setAttribute('stroke-width', String(DEFAULT_STROKE_WIDTH));
    });
  });
}

export function forceFixArrows() {
  const svg = document.getElementById('arrow-layer') || document.querySelector('svg');
  if (!svg) {
    console.warn('forceFixArrows: no <svg> root available');
    return;
  }
  installSimpleMarkers(svg);
  updateMarkerColors();
  const converted = convertExistingPasses(document);
  console.log(`🎯 forceFixArrows refreshed markers and reattached ${converted} pass shaft(s).`);
}

export function nudgeRefX(svg, markerId = 'head-comic-flat', delta = 0) {
  const root = svg || document.getElementById('arrow-layer');
  if (!root) return;
  const marker = root.getElementById ? root.getElementById(markerId) : root.querySelector(`#${markerId}`);
  if (!marker) return;
  const current = Number(marker.getAttribute('refX') || '20');
  marker.setAttribute('refX', String(current + delta));
}

window.__simpleMarkers = {
  installSimpleMarkers,
  attachHead,
  convertExistingPasses,
  forceFixArrows,
  updateMarkerColors,
};
