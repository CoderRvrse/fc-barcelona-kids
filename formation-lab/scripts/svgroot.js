// SVG Root Helper for Formation Lab
// Ensures proper SVG context for arrow rendering

const NS = 'http://www.w3.org/2000/svg';

export function getArrowSvg() {
  let svg = document.getElementById('arrow-layer');
  if (!svg) {
    // Create the layer if somebody stripped it
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('id', 'arrow-layer');
    svg.setAttribute('class', 'arrow-layer');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    // Ensure <defs> exists
    const defs = document.createElementNS(NS, 'defs');
    svg.appendChild(defs);
    // Append to field container (same parent you used originally)
    document.getElementById('pitchMount')?.appendChild(svg);
  } else if (!svg.querySelector('defs')) {
    svg.insertBefore(document.createElementNS(NS, 'defs'), svg.firstChild);
  }
  return svg;
}

export function ensureGroup(id) {
  const svg = getArrowSvg();
  const arrowGroup = document.getElementById('arrow-group');

  // For pass-related groups, create them inside arrow-group to inherit transforms
  const shouldUseArrowGroup = id && (id.includes('pass') || id.includes('preview'));
  const container = shouldUseArrowGroup && arrowGroup ? arrowGroup : svg;

  let g = id ? container.querySelector(`#${CSS.escape(id)}`) : null;
  if (!g) {
    g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    if (id) g.id = id;
    container.appendChild(g);
  } else if (g.parentNode !== container) {
    // If a detached node somehow exists, reattach it to correct container
    container.appendChild(g);
  }
  return g;
}

window.__mod_svgroot = true;