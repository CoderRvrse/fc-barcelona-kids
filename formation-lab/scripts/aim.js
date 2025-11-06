// Aim-assist helpers for Formation Lab
import { AIM, aimState } from './state.js';

export function nearestPlayerView(x, y, players, excludeId) {
  let best = null, dist = Infinity;
  for (const p of players) {
    if (p.id === excludeId) continue;

    // Get current view position dynamically
    const el = document.getElementById(`player-${p.id}`);
    if (!el) continue;

    const rect = el.getBoundingClientRect();
    const fieldRect = document.querySelector('.flab-field').getBoundingClientRect();
    const px = rect.left + rect.width / 2 - fieldRect.left;
    const py = rect.top + rect.height / 2 - fieldRect.top;

    const dx = px - x, dy = py - y;
    const d = Math.hypot(dx, dy);
    if (d < dist) {
      dist = d;
      best = { ...p, view: { x: px, y: py } };
    }
  }
  return { player: best, dist };
}

export function resetAimRings(players) {
  for (const p of players) {
    document.getElementById(`player-${p.id}`)?.removeAttribute('data-aim');
  }
}

export function setAimRing(id, mode) {  // mode: 'pre' | 'lock'
  const el = document.getElementById(`player-${id}`);
  el?.setAttribute('data-aim', mode);
}

export function clearAim() {
  aimState.candidateId = null;
  aimState.lockedId = null;
  aimState.showAt = 0;
}

window.__mod_aim = true;