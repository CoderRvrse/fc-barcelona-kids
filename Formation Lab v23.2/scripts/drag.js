// Drag module for Formation Lab
import { FLAB } from './state.js';
import { n2p_view, p2n_view, clampPx, toView } from './geometry.js';
import { beginPassPreview, updatePassPreview, commitPass } from './pass.js';

const SLOP_PX = 6;
const ROLE_LABELS = {
  GK: "goalkeeper",
  DF: "defender",
  MF: "midfielder",
  FW: "forward"
};

let playerEls = new Map();
let field = null;
let _stream = null; // active pointer stream

function getLocalPoint(evt, container) {
  const rect = container.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

function getPlayer(playerId) {
  return FLAB.players.find(player => player.id === playerId) || null;
}

function hitPlayer(evt) {
  const playerEl = evt.target.closest('.player[data-id]');
  if (!playerEl) return null;
  return { id: parseInt(playerEl.dataset.id) };
}

function startPointerStream(ev) {
  // anchor listeners at window so we never miss moves
  if (_stream) return;
  _stream = {
    id: ev.pointerId,
    move: e => {
      if (!FLAB.passArm?.drawing) return;
      const v = toView(e.clientX, e.clientY);
      updatePassPreview(v);
    },
    up: e => {
      if (!_stream || e.pointerId !== _stream.id) return;
      window.removeEventListener('pointermove', _stream.move, true);
      window.removeEventListener('pointerup', _stream.up, true);
      window.removeEventListener('pointercancel', _stream.up, true);
      try { document.getElementById('pitchMount')?.releasePointerCapture(_stream.id); } catch {}
      _stream = null;
      if (FLAB.passArm?.drawing) commitPass();
    }
  };
  window.addEventListener('pointermove', _stream.move, true);
  window.addEventListener('pointerup', _stream.up, true);
  window.addEventListener('pointercancel', _stream.up, true);
  // capture on the stable container (not the tiny child)
  try { document.getElementById('pitchMount')?.setPointerCapture(ev.pointerId); } catch {}
}

function selectPlayer(playerId) {
  const previous = FLAB.selectedId;
  if (playerId === FLAB.selectedId) {
    FLAB.selectedId = null;
  } else {
    FLAB.selectedId = playerId ?? null;
  }

  // Import and call updateHalo when needed
  if (previous !== FLAB.selectedId) {
    import('./render.js').then(({ updateHalo }) => {
      updateHalo();
    });
  }
}

function removeArrowsByPlayer(playerId) {
  const before = FLAB.arrows.length;
  FLAB.arrows = FLAB.arrows.filter(arrow => arrow.fromId !== playerId);
  if (before !== FLAB.arrows.length) {
    import('./render.js').then(({ renderArrows }) => {
      renderArrows();
    });
  }
}

function createPlayerElement(player) {
  const el = document.createElement("div");
  el.className = "flab-player player";
  el.dataset.id = String(player.id);
  el.dataset.role = player.role;
  el.tabIndex = 0;
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", `Player ${player.id}, ${ROLE_LABELS[player.role]}`);
  el.innerHTML = `
    <img class="jersey" src="assets/jersey.svg" alt="" draggable="false" />
    <span class="num">${player.id}</span>
  `;

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", evt => onPlayerPointerMove(evt, player.id));
  el.addEventListener("pointerup", evt => onPlayerPointerUp(evt, player.id));
  el.addEventListener("pointercancel", evt => onPlayerPointerUp(evt, player.id));

  el.addEventListener("keydown", evt => onPlayerKeyDown(evt, player.id));

  return el;
}

export function onPointerDown(evt) {
  // stop bubbling through jersey/img/badge layers
  evt.stopPropagation();
  evt.preventDefault();

  const hit = hitPlayer(evt);
  if (!hit) return;

  if (FLAB.mode === 'pass') {
    if (FLAB.passArm?.drawing) return;   // guard: prevent duplicate begins
    console.log('[pass] begin from player', hit.id);
    FLAB.activePlayer = getPlayer(hit.id);
    beginPassPreview(FLAB.activePlayer);
    startPointerStream(evt);
    return;
  }

  // … existing select/drag logic
  const el = playerEls.get(hit.id);
  const player = getPlayer(hit.id);
  if (!el || !player) return;

  if (FLAB.mode === "erase") {
    removeArrowsByPlayer(hit.id);
    return;
  }

  // Add pressing class to kill hover transitions immediately
  field.classList.remove("can-hover");
  field.classList.add("lab-pressing", "is-engaged");

  const localPoint = getLocalPoint(evt, field);
  const { x: centerX, y: centerY } = n2p_view(player.nx, player.ny);
  const center = { x: centerX, y: centerY };

  selectPlayer(hit.id);

  evt.preventDefault();
  el.setPointerCapture(evt.pointerId);
  el.classList.add("is-grabbing");
  // Add will-change for better performance during drag
  el.style.willChange = 'transform';
  FLAB.drag = {
    pointerId: evt.pointerId,
    playerId: hit.id,
    origin: localPoint,
    grabDX: center.x - localPoint.x,
    grabDY: center.y - localPoint.y,
    started: false
  };
}

function onPlayerPointerMove(evt, playerId) {
  if (FLAB.passArm && FLAB.passArm.fromId === playerId && FLAB.passArm.pointerId === evt.pointerId) {
    const v = toView(evt.clientX, evt.clientY);
    FLAB.passArm.latest = v;

    // Check for curve mode with Alt key
    FLAB.passArm.curved = evt.altKey;
    if (FLAB.passArm.curved) {
      // Add perpendicular offset for curved passes
      const dx = v.x - FLAB.passArm.origin.x;
      const dy = v.y - FLAB.passArm.origin.y;
      const midX = FLAB.passArm.origin.x + dx * 0.5;
      const midY = FLAB.passArm.origin.y + dy * 0.5;
      const perpX = -dy * 0.3; // perpendicular offset
      const perpY = dx * 0.3;
      FLAB.passArm.control = {
        x: midX + perpX,
        y: midY + perpY
      };
    } else {
      FLAB.passArm.control = null;
    }

    // Import and call pass preview
    import('./pass.js').then(({ updatePassPreview }) => {
      updatePassPreview(v);
    });
    return;
  }

  if (!FLAB.drag || FLAB.drag.playerId !== playerId || FLAB.drag.pointerId !== evt.pointerId) {
    return;
  }

  const localPoint = getLocalPoint(evt, field);
  const player = getPlayer(playerId);
  if (!player) return;

  const dx = localPoint.x - FLAB.drag.origin.x;
  const dy = localPoint.y - FLAB.drag.origin.y;
  const distance = Math.hypot(dx, dy);

  if (!FLAB.drag.started && distance < SLOP_PX) {
    return;
  }

  evt.preventDefault();

  if (!FLAB.drag.started) {
    FLAB.drag.started = true;
    field.classList.add("is-engaged");
  }

  // Calculate new position in px space
  let nxPx = localPoint.x + FLAB.drag.grabDX;
  let nyPx = localPoint.y + FLAB.drag.grabDY;

  // Clamp to playable rect
  ({ x: nxPx, y: nyPx } = clampPx(nxPx, nyPx));

  // Compute canonical norm from current view
  const canon = p2n_view(nxPx, nyPx);
  player.nx = Math.min(1, Math.max(0, canon.nx));
  player.ny = Math.min(1, Math.max(0, canon.ny));

  // Re-place via view mapping (keeps pixel under cursor)
  const px = n2p_view(player.nx, player.ny);
  const el = playerEls.get(playerId);
  if (el) {
    el.style.left = `${px.x}px`;
    el.style.top = `${px.y}px`;
  }

  // Import and call render functions
  import('./render.js').then(({ updateHalo, renderArrows }) => {
    updateHalo();
    renderArrows();
  });
}

function onPlayerPointerUp(evt, playerId) {
  const el = playerEls.get(playerId);

  if (FLAB.passArm && FLAB.passArm.fromId === playerId && FLAB.passArm.pointerId === evt.pointerId) {
    evt.preventDefault();
    el?.classList.remove("is-grabbing");
    if (el) el.style.willChange = 'auto'; // Reset will-change after drag
    if (el?.hasPointerCapture?.(evt.pointerId)) {
      el.releasePointerCapture(evt.pointerId);
    }

    if (FLAB.passArm?.drawing) {
      console.log('[pass] commit');
      // Use commitPass which handles passArm cleanup
      import('./pass.js').then(({ commitPass }) => {
        commitPass();
      });
    } else {
      FLAB.passArm = null;
    }

    // Hide preview
    import('./pass.js').then(({ updatePassPreview }) => {
      updatePassPreview(null, null);
    });

    field.classList.remove("lab-pressing", "is-engaged");
    field.classList.add("can-hover");
    return;
  }

  if (!FLAB.drag || FLAB.drag.playerId !== playerId || FLAB.drag.pointerId !== evt.pointerId) {
    return;
  }

  evt.preventDefault();
  el?.classList.remove("is-grabbing");
  if (el) el.style.willChange = 'auto'; // Reset will-change after drag

  if (FLAB.drag.started) {
    if (el?.hasPointerCapture?.(evt.pointerId)) {
      el.releasePointerCapture(evt.pointerId);
    }
  }

  field.classList.remove("lab-pressing", "is-engaged");
  field.classList.add("can-hover");

  FLAB.drag = null;
}

function onPlayerKeyDown(evt, playerId) {
  if (evt.key === "Enter" || evt.key === " ") {
    evt.preventDefault();
    selectPlayer(playerId);
  }
}

export function initDrag() {
  field = document.querySelector('.flab-field');
  if (!field) {
    console.error('Cannot initialize drag: .flab-field not found');
    return;
  }

  // Get player container
  const playersLayer = document.querySelector('.flab-players');
  if (!playersLayer) {
    console.error('Cannot initialize drag: .flab-players not found');
    return;
  }

  // Clear existing players and rebuild
  playersLayer.innerHTML = "";
  playerEls.clear();

  FLAB.players.forEach(player => {
    const el = createPlayerElement(player);
    playersLayer.appendChild(el);
    playerEls.set(player.id, el);
  });

  // Import and call render functions
  import('./render.js').then(({ renderPlayers, renderArrows, updateHalo }) => {
    renderPlayers();
    renderArrows();
    updateHalo();
  });

  field.classList.add("can-hover");
}

export { playerEls };

window.__mod_drag = true;