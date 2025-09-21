(function () {
  // State management
  const state = {
    mode: 'select', // 'select' | 'ball' | 'draw' | 'highlight'
    selectedId: null,
    draggingId: null,
    ballId: null,
    highlights: new Set(),
    lines: [], // [{fromId, toId, id}]
    drawFrom: null, // for two-click pass drawing
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

  let dragFrame = null;

  function init() {
    if (!svg()) return;

    // Add missing layers
    ensureLayers();

    // Wire UI
    wireToolbar();
    wireKeyboard();

    // Load default formation
    loadFormation('433');

    console.log('Formation Lab v21 initialized');
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

  function handleKeyboard(e) {
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
    state.mode = mode;
    state.drawFrom = null; // Reset draw state
    updateToolbarState();
    updateCursor();
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

  function startDrag(e, id) {
    e.preventDefault();
    e.stopPropagation();

    if (state.mode !== 'select') return;

    const player = e.currentTarget;
    player.setPointerCapture?.(e.pointerId);

    state.draggingId = id;
    state.selectedId = id;

    // Create drag proxy
    createDragProxy(id);

    // Set original to ghost state
    player.style.opacity = '0.5';
    player.setAttribute('aria-grabbed', 'true');

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

      // Update proxy position
      const proxy = gDragProxy()?.querySelector('[data-proxy]');
      if (proxy) {
        const x = Math.max(3, Math.min(102, coords.x));
        const y = Math.max(3, Math.min(65, coords.y));
        proxy.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      }
    });
  }

  function handleDragEnd(e) {
    if (!state.draggingId) return;

    const id = state.draggingId;
    const coords = getSVGCoords(e);

    document.removeEventListener('pointermove', handleDragMove);
    document.removeEventListener('pointerup', handleDragEnd);

    // Move original to final position
    if (coords) {
      setPlayerPosition(id, coords.x, coords.y);
    }

    // Restore original player
    const player = gPlayers()?.querySelector(`[data-id="${id}"]`);
    if (player) {
      player.style.opacity = '';
      player.setAttribute('aria-grabbed', 'false');
      player.releasePointerCapture?.(e.pointerId);
    }

    // Clear proxy
    const proxy = gDragProxy();
    if (proxy) while (proxy.firstChild) proxy.removeChild(proxy.firstChild);

    state.draggingId = null;
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
        handlePassDraw(id);
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

  function handlePassDraw(id) {
    if (state.drawFrom === null) {
      // First click - set starting point
      state.drawFrom = id;
      showDrawHint(id);
    } else if (state.drawFrom === id) {
      // Clicking same player - cancel
      state.drawFrom = null;
      hideDrawHint();
    } else {
      // Second click - create line
      createPassLine(state.drawFrom, id);
      state.drawFrom = null;
      hideDrawHint();
      pushHistory();
    }
  }

  function showDrawHint(id) {
    const player = gPlayers()?.querySelector(`[data-id="${id}"]`);
    if (player) {
      player.classList.add('draw-from');
    }
  }

  function hideDrawHint() {
    gPlayers()?.querySelectorAll('.draw-from').forEach(p => {
      p.classList.remove('draw-from');
    });
  }

  function createPassLine(fromId, toId) {
    const fromPos = state.positions.get(fromId);
    const toPos = state.positions.get(toId);
    if (!fromPos || !toPos) return;

    const lineId = `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    state.lines.push({ fromId, toId, id: lineId });

    renderLines();
  }

  function renderLines() {
    const linesGroup = gLines();
    if (!linesGroup) return;

    // Clear existing lines
    while (linesGroup.firstChild) linesGroup.removeChild(linesGroup.firstChild);

    // Render all lines
    state.lines.forEach(line => {
      const fromPos = state.positions.get(line.fromId);
      const toPos = state.positions.get(line.toId);
      if (!fromPos || !toPos) return;

      const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineEl.setAttribute('x1', fromPos.x);
      lineEl.setAttribute('y1', fromPos.y);
      lineEl.setAttribute('x2', toPos.x);
      lineEl.setAttribute('y2', toPos.y);
      lineEl.setAttribute('stroke', 'url(#barcaGrad)');
      lineEl.setAttribute('stroke-width', '1.2');
      lineEl.setAttribute('stroke-dasharray', '3 2');
      lineEl.setAttribute('marker-end', 'url(#arrowhead)');
      lineEl.classList.add('flab-line');

      linesGroup.appendChild(lineEl);
    });
  }

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
    state.drawFrom = null;

    const linesGroup = gLines();
    const ballGroup = gBall();

    if (linesGroup) while (linesGroup.firstChild) linesGroup.removeChild(linesGroup.firstChild);
    if (ballGroup) while (ballGroup.firstChild) ballGroup.removeChild(ballGroup.firstChild);

    hideDrawHint();
    renderHighlights();
  }

  function playSequence() {
    if (state.lines.length === 0) {
      alert('💡 Draw some pass lines first, then click Play to animate the ball!');
      return;
    }

    // Simple ball animation along pass sequence
    const ballGroup = gBall();
    if (!ballGroup || !state.ballId) {
      alert('💡 Place the ball on a player first using Ball mode!');
      return;
    }

    let currentLine = 0;

    function animateNextPass() {
      if (currentLine >= state.lines.length) return;

      const line = state.lines[currentLine];
      const fromPos = state.positions.get(line.fromId);
      const toPos = state.positions.get(line.toId);

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
        state.ballId = line.toId; // Move ball to destination player

        currentLine++;
        if (currentLine < state.lines.length) {
          setTimeout(animateNextPass, 400);
        }
      };
    }

    animateNextPass();
  }

  function pushHistory() {
    const snapshot = {
      positions: new Map(state.positions),
      ballId: state.ballId,
      highlights: new Set(state.highlights),
      lines: [...state.lines]
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
      lines: [...state.lines]
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
    state.lines = [...snapshot.lines];

    renderAllPlayers();
  }

  function saveFormation() {
    try {
      const data = {
        formation: document.getElementById('flabFormation')?.value || '433',
        positions: Array.from(state.positions.entries()),
        ballId: state.ballId,
        highlights: Array.from(state.highlights),
        lines: state.lines,
        timestamp: Date.now(),
        version: 1
      };

      localStorage.setItem('fcb_formation_v1', JSON.stringify(data));
      alert('✅ Formation saved!');
    } catch (error) {
      console.error('Save failed:', error);
      alert('❌ Save failed. Please try again.');
    }
  }

  function loadSavedFormation() {
    try {
      const saved = localStorage.getItem('fcb_formation_v1');
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

      // Restore state
      state.positions = new Map(data.positions || []);
      state.ballId = data.ballId || null;
      state.highlights = new Set(data.highlights || []);
      state.lines = data.lines || [];

      // Clear existing players and recreate
      const playersGroup = gPlayers();
      if (playersGroup) while (playersGroup.firstChild) playersGroup.removeChild(playersGroup.firstChild);

      // Recreate players
      state.positions.forEach((pos, id) => {
        createPlayer(id, pos.x, pos.y);
      });

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
      if (!s) throw new Error('SVG not found');

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 650;
      const ctx = canvas.getContext('2d');

      // Draw background
      const grad = ctx.createLinearGradient(0, 0, 0, 650);
      grad.addColorStop(0, '#1c3b7a');
      grad.addColorStop(1, '#142a4f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1000, 650);

      // Scale coordinates from viewBox (105x68) to canvas (1000x650)
      const scaleX = 1000 / 105;
      const scaleY = 650 / 68;

      // Draw pitch markings
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.strokeRect(10 * scaleX, 10 * scaleY, 85 * scaleX, 48 * scaleY);

      // Draw lines
      state.lines.forEach(line => {
        const fromPos = state.positions.get(line.fromId);
        const toPos = state.positions.get(line.toId);
        if (!fromPos || !toPos) return;

        ctx.strokeStyle = '#f2c200';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(fromPos.x * scaleX, fromPos.y * scaleY);
        ctx.lineTo(toPos.x * scaleX, toPos.y * scaleY);
        ctx.stroke();
      });

      // Draw players
      state.positions.forEach((pos, id) => {
        const x = pos.x * scaleX;
        const y = pos.y * scaleY;

        // Player circle
        ctx.fillStyle = '#f9bf00';
        ctx.strokeStyle = '#0b1c45';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Highlight if needed
        if (state.highlights.has(id)) {
          ctx.strokeStyle = '#f2c200';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(x, y, 25, 0, 2 * Math.PI);
          ctx.stroke();
        }

        // Player number
        ctx.fillStyle = '#0b1c45';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((id + 1).toString(), x, y);
      });

      // Draw ball
      if (state.ballId !== null) {
        const pos = state.positions.get(state.ballId);
        if (pos) {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(pos.x * scaleX, (pos.y - 1.5) * scaleY, 8, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }
      }

      // Download
      const link = document.createElement('a');
      link.download = `formation-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

    } catch (error) {
      console.error('Export failed:', error);
      alert('❌ Export failed. Please try again.');
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose public API
  window.FormationLab = {
    init,
    getState: () => state,
    loadFormation,
    saveFormation,
    exportFormation
  };
})();