// Orientation module for Formation Lab
import { set, FLAB, PITCH_LAND, PITCH_PORT } from './state.js';

export function setOrientation(mode) {
  set('orientation', mode);
  const fieldEl = document.querySelector('.flab-field');
  fieldEl?.classList.toggle('is-portrait', mode === 'portrait');
  // swap pitch asset via CSS var (use relative path from CSS context)
  const pitchPath = mode === 'portrait' ? '../../assets/portrait/pitch-portrait.svg' : '../../assets/landscape/pitch-landscape.svg';
  document.documentElement.style.setProperty('--pitch-url',
    `url("${pitchPath}")`
  );

  // Import render functions when needed
  import('./render.js').then(({ relayoutAllPlayers, renderArrows }) => {
    relayoutAllPlayers();
    renderArrows?.();
  });
}

export function flipSides(){
  for (const p of FLAB.players) p.nx = 1 - p.nx;

  // Import render functions when needed
  import('./render.js').then(({ relayoutAllPlayers, renderArrows }) => {
    relayoutAllPlayers();
    renderArrows?.();
  });
}

export function autoOrientation() {
  const field = document.querySelector('.flab-field');
  const r = field?.clientWidth / Math.max(1, field?.clientHeight || 1);
  setOrientation(r >= 1 ? 'landscape' : 'portrait');
}

window.__mod_orientation = true;