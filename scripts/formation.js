(function () {
  // === FORMATION LAB v22 - COMPREHENSIVE UX OVERHAUL ===
  // Fixes: Drag offset "shooting" issue + Cursor ring + Enhanced Draw mode + Onboarding

  // State management
  const state = {
    mode: 'select', // 'select' | 'ball' | 'draw' | 'highlight'
    selectedId: null,
    draggingId: null,
    ballId: null,
    highlights: new Set(),
    lines: [], // [{fromId, toId, id, points}]

    // New Draw mode state
    drawing: false,
    drawPoints: [], // Current line being drawn
    ghostPath: null,
    snapEnabled: true,
    snapTarget: null,

    // Drag offset fix
    dragOffset: { x: 0, y: 0 },

    history: [],
    future: [],
    positions: new Map() // id -> {x, y}
  };

  // DOM references
  const svg = () => document.getElementById('flabPitch');
  const gPlayers = () => document.getElementById('flabPlayers');
  const gLines = () => document.getElementById('flabLines');
  const gDragProxy = () => document.getElementById('flabDragProxy');
  const gBall = () => document.getElementById('flabBall');
  const gGhost = () => document.getElementById('flabGhostLayer');
  const labRoot = () => document.getElementById('formationLab');
  const cursorRing = () => document.getElementById('flabCursorRing');
  const modeHint = () => document.getElementById('flabModeHint');
  const helpBtn = () => document.getElementById('flabHelpBtn');
  const drawFinishBtn = () => document.getElementById('flabDrawFinish');

  // Formation presets
  const presets = {
    "433": [
      [52.5,62, "GK"], [16,50, "LB"], [36,48, "CB"], [69,48, "CB"], [89,50, "RB"],
      [30,38, "CM"], [52.5,36, "CM"], [75,38, "CM"],
      [28,22, "LW"], [52.5,18, "ST"], [77,22, "RW"]
    ],
    "442": [
      [52.5,62, "GK"], [16,50, "LB"], [36,48, "CB"], [69,48, "CB"], [89,50, "RB"],
      [25,38, "LM"], [44,36, "CM"], [61,36, "CM"], [80,38, "RM"],
      [40,20, "ST"], [66,20, "ST"]
    ],
    "451": [
      [52.5,62, "GK"], [16,50, "LB"], [36,48, "CB"], [69,48, "CB"], [89,50, "RB"],
      [20,42, "LM"], [35,40, "CM"], [52.5,38, "CM"], [70,40, "CM"], [85,42, "RM"],
      [52.5,18, "ST"]
    ],
    "343": [
      [52.5,62, "GK"], [30,50, "CB"], [52.5,48, "CB"], [75,50, "CB"],
      [16,42, "LM"], [36,38, "CM"], [69,38, "CM"], [89,42, "RM"],
      [32,22, "LW"], [52.5,18, "ST"], [73,22, "RW"]
    ],
    "352": [
      [52.5,62, "GK"], [30,50, "CB"], [52.5,48, "CB"], [75,50, "CB"],
      [16,42, "LWB"], [30,38, "CM"], [52.5,36, "CM"], [75,38, "CM"], [89,42, "RWB"],
      [40,20, "ST"], [66,20, "ST"]
    ]
  };

  // Cursor ring management
  let cursorFrame = null;
  let cursorVisible = false;

  // Interaction state management (Hotfix v21.1)
  function beginInteraction() {
    const root = labRoot();
    if (root) root.classList.add('is-interacting');
    showCursorRing();
  }

  function endInteraction() {
    const root = labRoot();
    if (root) root.classList.remove('is-interacting');
    hideCursorRing();
  }

  // Cursor Ring Implementation
  function showCursorRing() {
    const ring = cursorRing();
    if (!ring) return;

    ring.classList.add('show');
    cursorVisible = true;

    // Start tracking cursor
    document.addEventListener('pointermove', updateCursorRing);
    document.addEventListener('pointerleave', hideCursorRing);
  }

  function hideCursorRing() {
    const ring = cursorRing();
    if (!ring) return;

    ring.classList.remove('show', 'locked');
    cursorVisible = false;

    document.removeEventListener('pointermove', updateCursorRing);
    document.removeEventListener('pointerleave', hideCursorRing);
  }

  function lockCursorRing() {
    const ring = cursorRing();
    if (ring) ring.classList.add('locked');
  }

  function unlockCursorRing() {
    const ring = cursorRing();
    if (ring) ring.classList.remove('locked');
  }

  function updateCursorRing(e) {
    if (!cursorVisible) return;

    if (cursorFrame) cancelAnimationFrame(cursorFrame);

    cursorFrame = requestAnimationFrame(() => {
      const ring = cursorRing();
      if (!ring) return;

      const stage = document.querySelector('.flab__stage');
      if (!stage) return;

      const rect = stage.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      // Touch offset - nudge ring up on mobile
      if (e.pointerType === 'touch') {
        y -= 28;
      }

      ring.style.left = x + 'px';
      ring.style.top = y + 'px';
    });
  }

  // Mode hint management
  function showModeHint(text) {
    const hint = modeHint();
    if (!hint) return;

    hint.textContent = text;
    hint.classList.add('show');

    // Auto-hide after 4 seconds unless user is actively drawing
    setTimeout(() => {
      if (!state.drawing) {
        hint.classList.remove('show');
      }
    }, 4000);
  }

  function hideModeHint() {
    const hint = modeHint();
    if (hint) hint.classList.remove('show');
  }

  let dragFrame = null;

  function init() {
    if (!svg()) return;

    // Add missing layers
    ensureLayers();

    // Wire UI
    wireToolbar();
    wireKeyboard();
    wireCursorRing();
    wireOnboarding();

    // Load default formation
    loadFormation('433');

    // Set initial mode
    setMode('select');

    // Show onboarding if first time
    checkFirstRun();

    console.log('Formation Lab v22 initialized - UX Overhaul Complete');
  }

  function ensureLayers() {
    const s = svg();
    if (!s) return;

    // Ensure drag proxy layer exists (topmost)
    if (!gDragProxy()) {
      const proxy = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      proxy.id = 'flabDragProxy';
      proxy.setAttribute('aria-hidden', 'true');
      s.appendChild(proxy);
    }

    // Ensure ball layer exists
    if (!gBall()) {
      const ball = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      ball.id = 'flabBall';
      s.appendChild(ball);
    }

    // Ensure ghost layer exists for draw mode
    if (!gGhost()) {
      const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      ghost.id = 'flabGhostLayer';
      ghost.setAttribute('aria-hidden', 'true');
      s.appendChild(ghost);
    }
  }

  function wireToolbar() {
    // Mode buttons
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    // Action buttons
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn.dataset.action));
    });

    // Formation selector
    const sel = document.getElementById('flabFormation');
    sel?.addEventListener('change', () => {
      pushHistory();
      loadFormation(sel.value);
    });

    updateToolbarState();
  }

  function wireKeyboard() {
    document.addEventListener('keydown', handleKeyboard);
  }

  function wireCursorRing() {
    // Cursor ring is wired through begin/endInteraction
  }

  function wireOnboarding() {
    // Help button
    const help = helpBtn();
    help?.addEventListener('click', showOnboarding);

    // Mobile draw finish button
    const finish = drawFinishBtn();
    finish?.addEventListener('click', finishDrawing);
  }

  function handleKeyboard(e) {
    // Onboarding shortcuts
    if (e.key === 'Escape') {
      hideOnboarding();
      if (state.drawing) {
        cancelDrawing();
      }
      return;
    }

    // Drawing shortcuts
    if (state.mode === 'draw') {
      if (e.key === 'Enter') {
        finishDrawing();
        return;
      }
      if (e.key === 'Backspace') {
        removeLastDrawPoint();
        return;
      }
    }

    // Player movement
    if (!state.selectedId) return;

    const step = e.shiftKey ? 2 : 0.5;
    let moved = false;

    switch(e.key) {
      case 'ArrowLeft':
        movePlayer(state.selectedId, -step, 0);
        moved = true;
        break;
      case 'ArrowRight':
        movePlayer(state.selectedId, step, 0);
        moved = true;
        break;
      case 'ArrowUp':
        movePlayer(state.selectedId, 0, -step);
        moved = true;
        break;
      case 'ArrowDown':
        movePlayer(state.selectedId, 0, step);
        moved = true;
        break;
      case 'Enter':
      case ' ':
        handlePlayerClick(state.selectedId);
        moved = true;
        break;
      case 'Escape':
        setSelection(null);
        moved = true;
        break;
    }

    if (moved) {
      e.preventDefault();
      pushHistory();
    }
  }

  function setMode(mode) {
    // Exit current mode cleanly
    exitCurrentMode();

    state.mode = mode;

    // Set data-mode attribute for CSS hover guards
    const root = labRoot();
    if (root) root.setAttribute('data-mode', mode);

    // Enter new mode
    enterMode(mode);

    updateToolbarState();
    updateCursor();
  }

  function exitCurrentMode() {
    switch(state.mode) {
      case 'draw':
        cancelDrawing();
        break;
    }
    hideModeHint();
  }

  function enterMode(mode) {
    const hints = {
      select: null, // No hint for select mode
      ball: 'Ball mode: click a player to place ball, then Play to animate passes',
      draw: 'Draw mode: click to add points, double-click or Enter to finish, Esc to cancel',
      highlight: 'Highlight mode: click players to highlight/unhighlight them'
    };

    if (hints[mode]) {
      showModeHint(hints[mode]);
    }

    // Special mode setup
    if (mode === 'draw') {
      setupDrawMode();
    }
  }

  function updateToolbarState() {
    // Update mode buttons
    document.querySelectorAll('[data-mode]').forEach(btn => {
      const isActive = btn.dataset.mode === state.mode;
      btn.setAttribute('aria-pressed', isActive);
      btn.classList.toggle('is-active', isActive);
    });

    // Update action button states
    const undoBtn = document.querySelector('[data-action="undo"]');
    const redoBtn = document.querySelector('[data-action="redo"]');

    if (undoBtn) {
      undoBtn.disabled = state.history.length === 0;
      undoBtn.setAttribute('aria-disabled', state.history.length === 0);
    }

    if (redoBtn) {
      redoBtn.disabled = state.future.length === 0;
      redoBtn.setAttribute('aria-disabled', state.future.length === 0);
    }
  }

  function updateCursor() {
    const s = svg();
    if (!s) return;

    const cursors = {
      select: 'default',
      ball: 'crosshair',
      draw: 'crosshair',
      highlight: 'pointer'
    };

    s.style.cursor = cursors[state.mode] || 'default';
  }

  function handleAction(action) {
    switch(action) {
      case 'undo':
        undo();
        break;
      case 'redo':
        redo();
        break;
      case 'clear':
        clearAll();
        break;
      case 'play':
        playSequence();
        break;
      case 'save':
        saveFormation();
        break;
      case 'load':
        loadSavedFormation();
        break;
      case 'export':
        exportFormation();
        break;
    }
  }

  // === PLAYER CREATION AND POSITIONING ===

  function loadFormation(formationName) {
    const formation = presets[formationName] || presets["433"];

    clearAll(false); // Don't push to history

    formation.forEach((pos, i) => {
      const [x, y, role] = pos;
      state.positions.set(i, { x, y });
      createPlayer(i, x, y, role);
    });

    renderAllPlayers();
  }

  function createPlayer(id, x, y, role = '') {
    const player = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    player.classList.add('flab-player');
    player.setAttribute('data-id', id);
    player.setAttribute('tabindex', '0');
    player.setAttribute('role', 'button');
    player.setAttribute('aria-label', `Player ${id + 1} ${role}`);
    player.setAttribute('aria-grabbed', 'false');

    // Hit target (larger invisible circle)
    const hitTarget = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hitTarget.setAttribute('r', '5.5');
    hitTarget.setAttribute('fill', 'transparent');
    hitTarget.setAttribute('pointer-events', 'visible');

    // Selection ring (hidden by default)
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.classList.add('flab-ring');
    ring.setAttribute('r', '4.2');
    ring.style.display = 'none';

    // Player dot
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.classList.add('flab-player__dot');

    // Player label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.classList.add('flab-player__label');
    label.textContent = (id + 1).toString();

    player.appendChild(hitTarget);
    player.appendChild(ring);
    player.appendChild(dot);
    player.appendChild(label);

    // Event listeners
    player.addEventListener('pointerdown', e => startDrag(e, id));
    player.addEventListener('click', e => {
      e.stopPropagation();
      handlePlayerClick(id);
    });
    player.addEventListener('focus', () => setSelection(id));

    gPlayers()?.appendChild(player);
    setPlayerPosition(id, x, y);
  }

  function setPlayerPosition(id, x, y) {
    const player = gPlayers()?.querySelector(`[data-id="${id}"]`);
    if (!player) return;

    // Constrain to pitch bounds
    x = Math.max(3, Math.min(102, x));
    y = Math.max(3, Math.min(65, y));

    player.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    state.positions.set(id, { x, y });
  }

  // === FIXED DRAG IMPLEMENTATION ===
  // This fixes the "shooting off" issue by calculating proper drag offset

  function startDrag(e, id) {
    e.preventDefault();
    e.stopPropagation();

    if (state.mode !== 'select') return;

    const player = e.currentTarget;

    // Calculate drag offset to prevent "shooting"
    const playerPos = state.positions.get(id);
    const svgCoords = getSVGCoords(e);

    if (playerPos && svgCoords) {
      state.dragOffset = {
        x: svgCoords.x - playerPos.x,
        y: svgCoords.y - playerPos.y
      };
    } else {
      state.dragOffset = { x: 0, y: 0 };
    }

    player.setPointerCapture?.(e.pointerId);

    state.draggingId = id;
    state.selectedId = id;

    // Begin interaction (Hotfix v21.1)
    beginInteraction();
    lockCursorRing();

    // Create drag proxy
    createDragProxy(id);

    // Set original to ghost state and mark as dragging
    player.style.opacity = '0.5';
    player.setAttribute('aria-grabbed', 'true');
    player.classList.add('is-dragging');

    document.addEventListener('pointermove', handleDragMove);
    document.addEventListener('pointerup', handleDragEnd);

    updateSelection();
  }

  function createDragProxy(id) {
    const original = gPlayers()?.querySelector(`[data-id="${id}"]`);
    const proxy = gDragProxy();
    if (!original || !proxy) return;

    // Clear existing proxy
    while (proxy.firstChild) proxy.removeChild(proxy.firstChild);

    // Clone player elements
    const proxyPlayer = original.cloneNode(true);
    proxyPlayer.setAttribute('data-proxy', 'true');
    proxyPlayer.style.transform = original.getAttribute('transform');
    proxyPlayer.style.filter = 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))';
    proxyPlayer.style.cursor = 'grabbing';

    // Scale up proxy slightly
    const dot = proxyPlayer.querySelector('.flab-player__dot');
    if (dot) dot.setAttribute('transform', 'scale(1.08)');

    proxy.appendChild(proxyPlayer);
  }

  function handleDragMove(e) {
    if (!state.draggingId) return;

    if (dragFrame) cancelAnimationFrame(dragFrame);

    dragFrame = requestAnimationFrame(() => {
      const coords = getSVGCoords(e);
      if (!coords) return;

      // Apply drag offset to prevent jumping
      const x = coords.x - state.dragOffset.x;
      const y = coords.y - state.dragOffset.y;

      // Update proxy position
      const proxy = gDragProxy()?.querySelector('[data-proxy]');
      if (proxy) {
        const constrainedX = Math.max(3, Math.min(102, x));
        const constrainedY = Math.max(3, Math.min(65, y));
        proxy.style.transform = `translate(${constrainedX.toFixed(1)}px, ${constrainedY.toFixed(1)}px)`;
      }
    });
  }

  function handleDragEnd(e) {
    if (!state.draggingId) return;

    const id = state.draggingId;
    const coords = getSVGCoords(e);

    document.removeEventListener('pointermove', handleDragMove);
    document.removeEventListener('pointerup', handleDragEnd);

    // Move original to final position with offset correction
    if (coords) {
      const x = coords.x - state.dragOffset.x;
      const y = coords.y - state.dragOffset.y;
      setPlayerPosition(id, x, y);
    }

    // Restore original player
    const player = gPlayers()?.querySelector(`[data-id="${id}"]`);
    if (player) {
      player.style.opacity = '';
      player.setAttribute('aria-grabbed', 'false');
      player.classList.remove('is-dragging');
      player.releasePointerCapture?.(e.pointerId);
    }

    // Clear proxy
    const proxy = gDragProxy();
    if (proxy) while (proxy.firstChild) proxy.removeChild(proxy.firstChild);

    // End interaction
    unlockCursorRing();
    endInteraction();

    state.draggingId = null;
    state.dragOffset = { x: 0, y: 0 };
    pushHistory();
  }

  function getSVGCoords(e) {
    const s = svg();
    if (!s) return null;

    try {
      const pt = s.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      return pt.matrixTransform(s.getScreenCTM().inverse());
    } catch (error) {
      console.warn('SVG transform failed:', error);
      return null;
    }
  }

  // === PLAYER INTERACTION ===

  function handlePlayerClick(id) {
    switch(state.mode) {
      case 'select':
        setSelection(id === state.selectedId ? null : id);
        break;
      case 'ball':
        toggleBall(id);
        break;
      case 'highlight':
        toggleHighlight(id);
        break;
      case 'draw':
        handleDrawClick(id);
        break;
    }
  }

  function setSelection(id) {
    const prev = state.selectedId;
    state.selectedId = id;

    // Update previous player
    if (prev !== null) {
      const prevPlayer = gPlayers()?.querySelector(`[data-id="${prev}"]`);
      if (prevPlayer) {
        prevPlayer.setAttribute('aria-selected', 'false');
      }
    }

    // Update new player
    if (id !== null) {
      const player = gPlayers()?.querySelector(`[data-id="${id}"]`);
      if (player) {
        player.setAttribute('aria-selected', 'true');
        player.focus();
      }
    }

    updateSelection();
  }

  function updateSelection() {
    // Update all selection rings
    gPlayers()?.querySelectorAll('.flab-player').forEach(player => {
      const id = parseInt(player.dataset.id);
      const ring = player.querySelector('.flab-ring');
      const isSelected = id === state.selectedId;

      if (ring) {
        ring.style.display = isSelected ? 'block' : 'none';
        ring.classList.toggle('is-active', isSelected);
      }
    });
  }

  function toggleBall(id) {
    if (state.ballId === id) {
      state.ballId = null;
    } else {
      state.ballId = id;
    }
    renderBall();
    pushHistory();
  }

  function renderBall() {
    const ballGroup = gBall();
    if (!ballGroup) return;

    // Clear existing ball
    while (ballGroup.firstChild) ballGroup.removeChild(ballGroup.firstChild);

    if (state.ballId === null) return;

    const pos = state.positions.get(state.ballId);
    if (!pos) return;

    const ball = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ball.setAttribute('cx', pos.x);
    ball.setAttribute('cy', pos.y - 1.5); // Slightly above player
    ball.setAttribute('r', '1.2');
    ball.setAttribute('fill', '#ffffff');
    ball.setAttribute('stroke', '#000000');
    ball.setAttribute('stroke-width', '0.2');
    ball.style.filter = 'drop-shadow(0 0.5px 1px rgba(0,0,0,0.3))';

    ballGroup.appendChild(ball);
  }

  function toggleHighlight(id) {
    if (state.highlights.has(id)) {
      state.highlights.delete(id);
    } else {
      state.highlights.add(id);
    }
    renderHighlights();
    pushHistory();
  }

  function renderHighlights() {
    gPlayers()?.querySelectorAll('.flab-player').forEach(player => {
      const id = parseInt(player.dataset.id);
      const isHighlighted = state.highlights.has(id);
      player.classList.toggle('is-highlighted', isHighlighted);
    });
  }

  // === ENHANCED DRAW MODE ===

  function setupDrawMode() {
    state.drawing = false;
    state.drawPoints = [];
    state.ghostPath = null;
    state.snapTarget = null;

    // Wire canvas for drawing
    const s = svg();
    if (s) {
      s.addEventListener('pointerdown', handleCanvasPointerDown);
      s.addEventListener('pointermove', handleCanvasPointerMove);
      s.addEventListener('dblclick', finishDrawing);
    }
  }

  function handleDrawClick(id) {
    const pos = state.positions.get(id);
    if (!pos) return;

    addDrawPoint(pos.x, pos.y, id);
  }

  function handleCanvasPointerDown(e) {
    if (state.mode !== 'draw') return;

    const coords = getSVGCoords(e);
    if (!coords) return;

    // Check for snap target
    const snapTarget = findSnapTarget(coords.x, coords.y);
    if (snapTarget) {
      const pos = state.positions.get(snapTarget);
      if (pos) {
        addDrawPoint(pos.x, pos.y, snapTarget);
      }
    } else {
      addDrawPoint(coords.x, coords.y);
    }
  }

  function handleCanvasPointerMove(e) {
    if (state.mode !== 'draw' || !state.drawing) return;

    const coords = getSVGCoords(e);
    if (!coords) return;

    updateGhostPath(coords.x, coords.y);
    updateSnapTarget(coords.x, coords.y);
  }

  function addDrawPoint(x, y, playerId = null) {
    state.drawPoints.push({ x, y, playerId });

    if (!state.drawing) {
      state.drawing = true;
      beginInteraction();

      // Show mobile finish button
      const finishBtn = drawFinishBtn();
      if (finishBtn && 'ontouchstart' in window) {
        finishBtn.style.display = 'block';
      }

      // Update hint
      const hint = modeHint();
      if (hint) {
        hint.textContent = `Drawing: ${state.drawPoints.length} points - double-click or Enter to finish`;
      }
    }

    renderDrawPoints();
    announceDrawing();
  }

  function removeLastDrawPoint() {
    if (state.drawPoints.length === 0) return;

    state.drawPoints.pop();

    if (state.drawPoints.length === 0) {
      cancelDrawing();
    } else {
      renderDrawPoints();
      announceDrawing();
    }
  }

  function finishDrawing() {
    if (!state.drawing || state.drawPoints.length < 2) return;

    // Create the line
    const lineId = `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newLine = {
      id: lineId,
      points: [...state.drawPoints],
      fromId: state.drawPoints[0].playerId,
      toId: state.drawPoints[state.drawPoints.length - 1].playerId
    };

    state.lines.push(newLine);

    // Clean up draw state
    cancelDrawing();
    renderLines();
    pushHistory();

    // Announce completion
    const liveRegion = document.querySelector('[aria-live="polite"]');
    if (liveRegion) {
      liveRegion.textContent = `Line finished with ${newLine.points.length} points`;
    }
  }

  function cancelDrawing() {
    state.drawing = false;
    state.drawPoints = [];
    state.ghostPath = null;
    state.snapTarget = null;

    // Clear ghost layer
    const ghost = gGhost();
    if (ghost) while (ghost.firstChild) ghost.removeChild(ghost.firstChild);

    // Hide mobile finish button
    const finishBtn = drawFinishBtn();
    if (finishBtn) finishBtn.style.display = 'none';

    // Remove canvas listeners
    const s = svg();
    if (s) {
      s.removeEventListener('pointerdown', handleCanvasPointerDown);
      s.removeEventListener('pointermove', handleCanvasPointerMove);
      s.removeEventListener('dblclick', finishDrawing);
    }

    endInteraction();

    // Reset hint
    if (state.mode === 'draw') {
      showModeHint('Draw mode: click to add points, double-click or Enter to finish, Esc to cancel');
    }
  }

  function findSnapTarget(x, y, tolerance = 22) {
    let closest = null;
    let closestDist = tolerance;

    state.positions.forEach((pos, id) => {
      const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (dist < closestDist) {
        closest = id;
        closestDist = dist;
      }
    });

    return closest;
  }

  function updateSnapTarget(x, y) {
    const newTarget = state.snapEnabled ? findSnapTarget(x, y) : null;

    if (newTarget !== state.snapTarget) {
      // Clear old target
      if (state.snapTarget !== null) {
        const oldPlayer = gPlayers()?.querySelector(`[data-id="${state.snapTarget}"]`);
        if (oldPlayer) oldPlayer.classList.remove('snap-target');
      }

      // Set new target
      state.snapTarget = newTarget;
      if (state.snapTarget !== null) {
        const newPlayer = gPlayers()?.querySelector(`[data-id="${state.snapTarget}"]`);
        if (newPlayer) newPlayer.classList.add('snap-target');
      }
    }
  }

  function updateGhostPath(x, y) {
    if (state.drawPoints.length === 0) return;

    // Use snap target position if available
    if (state.snapTarget !== null) {
      const snapPos = state.positions.get(state.snapTarget);
      if (snapPos) {
        x = snapPos.x;
        y = snapPos.y;
      }
    }

    const ghost = gGhost();
    if (!ghost) return;

    // Clear previous ghost
    while (ghost.firstChild) ghost.removeChild(ghost.firstChild);

    // Create ghost path
    const lastPoint = state.drawPoints[state.drawPoints.length - 1];

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', lastPoint.x);
    line.setAttribute('y1', lastPoint.y);
    line.setAttribute('x2', x);
    line.setAttribute('y2', y);
    line.classList.add('flab-ghost-path');

    if (state.snapTarget !== null) {
      line.classList.add('snapped');
    }

    ghost.appendChild(line);

    // Add snap dot if snapping
    if (state.snapTarget !== null) {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.classList.add('flab-snap-dot');
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', y);
      dot.setAttribute('r', '2');
      ghost.appendChild(dot);
    }
  }

  function renderDrawPoints() {
    // Draw points are rendered as part of the ghost path
    // The actual committed lines are rendered separately
  }

  function announceDrawing() {
    const liveRegion = document.querySelector('[aria-live="polite"]');
    if (liveRegion && state.drawing) {
      let msg = `Drawing: ${state.drawPoints.length} points`;
      if (state.snapTarget !== null) {
        msg += `, snapped to Player ${state.snapTarget + 1}`;
      }
      liveRegion.textContent = msg;
    }
  }

  function renderLines() {
    const linesGroup = gLines();
    if (!linesGroup) return;

    // Clear existing lines
    while (linesGroup.firstChild) linesGroup.removeChild(linesGroup.firstChild);

    // Render all lines
    state.lines.forEach(line => {
      if (line.points && line.points.length >= 2) {
        // Multi-point line (new format)
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        let d = `M ${line.points[0].x} ${line.points[0].y}`;
        for (let i = 1; i < line.points.length; i++) {
          d += ` L ${line.points[i].x} ${line.points[i].y}`;
        }

        pathEl.setAttribute('d', d);
        pathEl.setAttribute('stroke', 'url(#barcaGrad)');
        pathEl.setAttribute('stroke-width', '2.5');
        pathEl.setAttribute('fill', 'none');
        pathEl.setAttribute('marker-end', 'url(#arrowhead)');
        pathEl.classList.add('flab-line');

        linesGroup.appendChild(pathEl);
      } else {
        // Legacy two-point line
        const fromPos = state.positions.get(line.fromId);
        const toPos = state.positions.get(line.toId);
        if (!fromPos || !toPos) return;

        const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineEl.setAttribute('x1', fromPos.x);
        lineEl.setAttribute('y1', fromPos.y);
        lineEl.setAttribute('x2', toPos.x);
        lineEl.setAttribute('y2', toPos.y);
        lineEl.setAttribute('stroke', 'url(#barcaGrad)');
        lineEl.setAttribute('stroke-width', '2.5');
        lineEl.setAttribute('marker-end', 'url(#arrowhead)');
        lineEl.classList.add('flab-line');

        linesGroup.appendChild(lineEl);
      }
    });
  }

  // === UTILITY FUNCTIONS ===

  function renderAllPlayers() {
    state.positions.forEach((pos, id) => {
      setPlayerPosition(id, pos.x, pos.y);
    });
    renderBall();
    renderHighlights();
    renderLines();
  }

  function movePlayer(id, deltaX, deltaY) {
    const pos = state.positions.get(id);
    if (!pos) return;

    setPlayerPosition(id, pos.x + deltaX, pos.y + deltaY);
    renderBall(); // Update ball if attached
  }

  function clearAll(pushToHistory = true) {
    if (pushToHistory) pushHistory();

    state.ballId = null;
    state.highlights.clear();
    state.lines = [];
    cancelDrawing();

    const linesGroup = gLines();
    const ballGroup = gBall();

    if (linesGroup) while (linesGroup.firstChild) linesGroup.removeChild(linesGroup.firstChild);
    if (ballGroup) while (ballGroup.firstChild) ballGroup.removeChild(ballGroup.firstChild);

    renderHighlights();
  }

  // === ANIMATION AND PLAYBACK ===

  function playSequence() {
    if (state.lines.length === 0) {
      alert('💡 Draw some pass lines first, then click Play to animate the ball!');
      return;
    }

    const ballGroup = gBall();
    if (!ballGroup || state.ballId === null) {
      alert('💡 Place the ball on a player first using Ball mode!');
      return;
    }

    let currentLine = 0;

    function animateNextPass() {
      if (currentLine >= state.lines.length) return;

      const line = state.lines[currentLine];
      let fromPos, toPos;

      if (line.points && line.points.length >= 2) {
        // Multi-point line - animate from first to last point
        fromPos = line.points[0];
        toPos = line.points[line.points.length - 1];
      } else {
        // Legacy two-point line
        fromPos = state.positions.get(line.fromId);
        toPos = state.positions.get(line.toId);
      }

      if (!fromPos || !toPos) {
        currentLine++;
        animateNextPass();
        return;
      }

      const ball = ballGroup.querySelector('circle');
      if (!ball) return;

      // Animate ball to destination
      const animation = ball.animate([
        { cx: fromPos.x, cy: fromPos.y - 1.5 },
        { cx: toPos.x, cy: toPos.y - 1.5 }
      ], {
        duration: 800,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });

      animation.onfinish = () => {
        ball.setAttribute('cx', toPos.x);
        ball.setAttribute('cy', toPos.y - 1.5);

        // Update ball position to destination player if it's a player point
        if (line.points && line.points.length >= 2) {
          const lastPoint = line.points[line.points.length - 1];
          if (lastPoint.playerId !== null) {
            state.ballId = lastPoint.playerId;
          }
        } else if (line.toId !== undefined) {
          state.ballId = line.toId;
        }

        currentLine++;
        if (currentLine < state.lines.length) {
          setTimeout(animateNextPass, 400);
        }
      };
    }

    animateNextPass();
  }

  // === HISTORY MANAGEMENT ===

  function pushHistory() {
    const snapshot = {
      positions: new Map(state.positions),
      ballId: state.ballId,
      highlights: new Set(state.highlights),
      lines: JSON.parse(JSON.stringify(state.lines)) // Deep copy for lines with points
    };

    state.history.push(snapshot);
    state.future = []; // Clear future on new action

    // Limit history size
    if (state.history.length > 50) {
      state.history.shift();
    }

    updateToolbarState();
  }

  function undo() {
    if (state.history.length === 0) return;

    // Save current state to future
    const current = {
      positions: new Map(state.positions),
      ballId: state.ballId,
      highlights: new Set(state.highlights),
      lines: JSON.parse(JSON.stringify(state.lines))
    };
    state.future.push(current);

    // Restore previous state
    const prev = state.history.pop();
    restoreState(prev);
    updateToolbarState();
  }

  function redo() {
    if (state.future.length === 0) return;

    // Save current state to history
    pushHistory();
    state.history.pop(); // Remove the duplicate we just added

    // Restore future state
    const next = state.future.pop();
    restoreState(next);
    updateToolbarState();
  }

  function restoreState(snapshot) {
    state.positions = new Map(snapshot.positions);
    state.ballId = snapshot.ballId;
    state.highlights = new Set(snapshot.highlights);
    state.lines = JSON.parse(JSON.stringify(snapshot.lines));

    renderAllPlayers();
  }

  // === SAVE/LOAD SYSTEM ===

  function saveFormation() {
    try {
      const data = {
        formation: document.getElementById('flabFormation')?.value || '433',
        positions: Array.from(state.positions.entries()),
        ballId: state.ballId,
        highlights: Array.from(state.highlights),
        lines: state.lines,
        timestamp: Date.now(),
        version: 2 // New version with multi-point lines
      };

      localStorage.setItem('fcb_formation_v2', JSON.stringify(data));
      alert('✅ Formation saved!');
    } catch (error) {
      console.error('Save failed:', error);
      alert('❌ Save failed. Please try again.');
    }
  }

  function loadSavedFormation() {
    try {
      const saved = localStorage.getItem('fcb_formation_v2') || localStorage.getItem('fcb_formation_v1');
      if (!saved) {
        alert('No saved formation found.');
        return;
      }

      const data = JSON.parse(saved);

      // Set formation selector
      const sel = document.getElementById('flabFormation');
      if (sel && data.formation) {
        sel.value = data.formation;
      }

      // Clear current state
      clearAll(false);

      // Restore positions
      if (data.positions) {
        state.positions = new Map(data.positions);

        // Recreate players
        state.positions.forEach((pos, id) => {
          createPlayer(id, pos.x, pos.y);
        });
      }

      // Restore other state
      state.ballId = data.ballId || null;
      state.highlights = new Set(data.highlights || []);
      state.lines = data.lines || [];

      renderAllPlayers();
      pushHistory();

      alert('✅ Formation loaded!');
    } catch (error) {
      console.error('Load failed:', error);
      alert('❌ Load failed. Please try again.');
    }
  }

  function exportFormation() {
    try {
      const s = svg();
      if (!s) throw new Error('No SVG found');

      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Set canvas size (scale up for quality)
      const scale = 2;
      canvas.width = 1050 * scale; // SVG is 105 units wide
      canvas.height = 680 * scale;  // SVG is 68 units tall

      ctx.scale(scale, scale);
      ctx.fillStyle = '#1e3a8a'; // Barcelona blue background
      ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);

      // Get SVG data
      const svgData = new XMLSerializer().serializeToString(s);
      const img = new Image();

      img.onload = () => {
        ctx.drawImage(img, 0, 0, 105, 68);

        // Download
        const link = document.createElement('a');
        link.download = `formation_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();

        alert('✅ Formation exported as PNG!');
      };

      img.onerror = () => {
        throw new Error('Export failed');
      };

      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      img.src = url;

    } catch (error) {
      console.error('Export failed:', error);
      alert('❌ Export failed. Please try again.');
    }
  }

  // === ONBOARDING SYSTEM ===

  function checkFirstRun() {
    const seen = localStorage.getItem('flab.tutorialSeen');
    if (!seen) {
      setTimeout(showOnboarding, 1000); // Show after 1 second
    }
  }

  function showOnboarding() {
    const modal = document.getElementById('flabOnboard');
    if (!modal) return;

    modal.style.display = 'flex';

    // Wire modal events
    wireOnboardingEvents();

    // Focus first slide
    showSlide(0);
  }

  function hideOnboarding() {
    const modal = document.getElementById('flabOnboard');
    if (!modal) return;

    modal.style.display = 'none';

    // Mark as seen if checkbox is checked
    const checkbox = document.getElementById('onboard-dont-show');
    if (checkbox?.checked) {
      localStorage.setItem('flab.tutorialSeen', 'true');
    }
  }

  let currentSlide = 0;

  function wireOnboardingEvents() {
    // Close button
    const closeBtn = document.querySelector('.flab-onboard__close');
    closeBtn?.addEventListener('click', hideOnboarding);

    // Navigation buttons
    const prevBtn = document.querySelector('.btn-prev');
    const nextBtn = document.querySelector('.btn-next');

    prevBtn?.addEventListener('click', () => showSlide(currentSlide - 1));
    nextBtn?.addEventListener('click', () => {
      if (currentSlide === 3) {
        hideOnboarding();
      } else {
        showSlide(currentSlide + 1);
      }
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideOnboarding();
    });

    // Click outside to close
    const modal = document.getElementById('flabOnboard');
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) hideOnboarding();
    });
  }

  function showSlide(index) {
    const slides = document.querySelectorAll('.flab-onboard__slide');
    const prevBtn = document.querySelector('.btn-prev');
    const nextBtn = document.querySelector('.btn-next');
    const indicator = document.querySelector('.slide-indicator');

    if (index < 0 || index >= slides.length) return;

    // Hide all slides
    slides.forEach(slide => slide.style.display = 'none');

    // Show current slide
    slides[index].style.display = 'block';

    // Update navigation
    currentSlide = index;

    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.textContent = index === slides.length - 1 ? 'Finish' : 'Next';
    if (indicator) indicator.textContent = `${index + 1} / ${slides.length}`;
  }

  // === INITIALIZATION ===

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for global access
  window.FormationLab = {
    init,
    setMode,
    loadFormation,
    saveFormation,
    exportFormation,
    showOnboarding
  };

})();