(function () {
  // === FORMATION LAB v22.1 - TOAST SYSTEM + DRAG RELIABILITY OVERHAUL ===
  // Features: In-field toasts, drag threshold, non-blocking tutorial, reliability fixes

  // State management
  const state = {
    mode: 'select', // 'select' | 'ball' | 'draw' | 'highlight'
    selectedId: null,
    draggingId: null,
    ballId: null,
    highlights: new Set(),
    lines: [], // [{fromId, toId, id, points}]

    // Enhanced drag state
    isDragging: false,
    dragStartPos: null,
    dragThreshold: 6, // pixels before drag starts
    dragTimer: null,

    // Draw mode state
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
  const toastHost = () => document.getElementById('flabToastHost');

  // === TOAST SYSTEM ===

  const toastSystem = {
    toasts: new Map(),
    queue: [],
    maxVisible: 3,
    nextId: 1,

    show(options) {
      const {
        type = 'info',
        message,
        timeout = 5000,
        actions = [],
        id = `toast_${this.nextId++}`,
        persistent = false
      } = options;

      // If toast with same ID exists, pulse it instead of creating new
      if (this.toasts.has(id)) {
        this.pulse(id);
        return id;
      }

      const toast = {
        id,
        type,
        message,
        timeout,
        actions,
        persistent,
        element: null,
        timer: null
      };

      if (this.toasts.size >= this.maxVisible) {
        this.queue.push(toast);
      } else {
        this.render(toast);
      }

      return id;
    },

    info(message, options = {}) {
      return this.show({ ...options, type: 'info', message });
    },

    success(message, options = {}) {
      return this.show({ ...options, type: 'success', message });
    },

    warn(message, options = {}) {
      return this.show({ ...options, type: 'warn', message });
    },

    error(message, options = {}) {
      return this.show({ ...options, type: 'error', message, timeout: 8000 });
    },

    tutorial(message, step, total, actions = []) {
      return this.show({
        type: 'tutorial',
        message,
        actions: [
          ...actions,
          {
            text: step > 1 ? 'Previous' : '',
            action: step > 1 ? () => this.tutorialStep(step - 1) : null,
            secondary: true
          },
          {
            text: step < total ? 'Next' : 'Finish',
            action: step < total ? () => this.tutorialStep(step + 1) : () => this.endTutorial()
          }
        ],
        id: 'tutorial',
        persistent: true,
        timeout: 0
      });
    },

    render(toast) {
      const host = toastHost();
      if (!host) return;

      const el = document.createElement('div');
      el.className = `flab-toast flab-toast--${toast.type}`;
      el.setAttribute('role', toast.type === 'error' ? 'alert' : 'status');
      el.setAttribute('aria-live', toast.type === 'error' ? 'assertive' : 'polite');

      const icons = {
        info: '⚽',
        success: '✅',
        warn: '⚠️',
        error: '❌',
        tutorial: '🎯'
      };

      let actionsHtml = '';
      if (toast.actions && toast.actions.length > 0) {
        const actionButtons = toast.actions
          .filter(action => action.text && action.action)
          .map(action =>
            `<button class="flab-toast__action ${action.secondary ? 'flab-toast__action--secondary' : ''}"
                     data-action="${action.text}">${action.text}</button>`
          ).join('');

        if (actionButtons) {
          actionsHtml = `<div class="flab-toast__actions">${actionButtons}</div>`;
        }
      }

      // Tutorial-specific navigation
      let tutorialNav = '';
      if (toast.type === 'tutorial') {
        const currentStep = parseInt(toast.id.split('_')[1]) || 1;
        const totalSteps = 4; // Fixed for now
        tutorialNav = `
          <div class="flab-tutorial-nav">
            <div class="flab-tutorial-progress">${currentStep} / ${totalSteps}</div>
            <div class="flab-tutorial-actions">
              ${actionsHtml}
            </div>
          </div>
        `;
        actionsHtml = ''; // Move actions to tutorial nav
      }

      el.innerHTML = `
        <div class="flab-toast__icon">${icons[toast.type] || '⚽'}</div>
        <div class="flab-toast__content">
          <p class="flab-toast__message">${toast.message}</p>
          ${actionsHtml}
          ${tutorialNav}
        </div>
        ${!toast.persistent ? '<button class="flab-toast__close" aria-label="Close">&times;</button>' : ''}
        ${toast.timeout > 0 ? '<div class="flab-toast__progress" style="width: 100%"></div>' : ''}
      `;

      // Wire up action buttons
      el.querySelectorAll('[data-action]').forEach(btn => {
        const actionText = btn.dataset.action;
        const action = toast.actions?.find(a => a.text === actionText);
        if (action?.action) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            action.action();
          });
        }
      });

      // Wire up close button
      const closeBtn = el.querySelector('.flab-toast__close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.dismiss(toast.id));
      }

      // Keyboard handling
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.dismiss(toast.id);
        }
      });

      toast.element = el;
      this.toasts.set(toast.id, toast);
      host.appendChild(el);

      // Start progress bar animation
      if (toast.timeout > 0) {
        const progressBar = el.querySelector('.flab-toast__progress');
        if (progressBar) {
          progressBar.style.transition = `width ${toast.timeout}ms linear`;
          setTimeout(() => {
            progressBar.style.width = '0%';
          }, 50);

          // Auto-dismiss
          toast.timer = setTimeout(() => {
            this.dismiss(toast.id);
          }, toast.timeout);

          // Pause on hover
          el.addEventListener('mouseenter', () => {
            if (toast.timer) {
              clearTimeout(toast.timer);
              progressBar.style.animationPlayState = 'paused';
            }
          });

          el.addEventListener('mouseleave', () => {
            if (toast.timeout > 0) {
              const remaining = toast.timeout * (parseFloat(progressBar.style.width) / 100);
              toast.timer = setTimeout(() => {
                this.dismiss(toast.id);
              }, remaining);
            }
          });
        }
      }

      // Focus management for accessibility
      const firstButton = el.querySelector('button:not(.flab-toast__close)');
      if (firstButton) {
        firstButton.focus();
      }
    },

    pulse(id) {
      const toast = this.toasts.get(id);
      if (toast?.element) {
        toast.element.style.animation = 'none';
        setTimeout(() => {
          toast.element.style.animation = 'toast-enter 180ms ease-out';
        }, 10);
      }
    },

    dismiss(id) {
      const toast = this.toasts.get(id);
      if (!toast) return;

      if (toast.timer) {
        clearTimeout(toast.timer);
      }

      if (toast.element) {
        toast.element.classList.add('exiting');
        setTimeout(() => {
          if (toast.element.parentNode) {
            toast.element.parentNode.removeChild(toast.element);
          }
          this.toasts.delete(id);
          this.processQueue();
        }, 160);
      } else {
        this.toasts.delete(id);
        this.processQueue();
      }
    },

    clear() {
      this.toasts.forEach((_, id) => this.dismiss(id));
      this.queue = [];
    },

    processQueue() {
      if (this.queue.length > 0 && this.toasts.size < this.maxVisible) {
        const nextToast = this.queue.shift();
        this.render(nextToast);
      }
    }
  };

  // Global toast API
  window.flabToast = toastSystem;

  // === TUTORIAL SYSTEM ===

  const tutorialSteps = [
    {
      title: "Move Players",
      message: "Drag players to reposition them. Use arrow keys for precision. Players snap to pitch boundaries.",
      demo: "⚽ Drag demo here"
    },
    {
      title: "Ball Mode",
      message: "Click 'Ball', then tap a player to place the ball. Click again to move it between players.",
      demo: "🏟️ Ball placement demo"
    },
    {
      title: "Draw Mode",
      message: "Click 'Draw', then click to add points. Lines snap to players. Enter to finish, Esc to cancel.",
      demo: "📏 Drawing demo"
    },
    {
      title: "Play Animation",
      message: "Click 'Play' to animate pass sequences. Use Save/Load to preserve formations and Undo/Redo to refine.",
      demo: "📸 Animation demo"
    }
  ];

  let currentTutorialStep = 0;

  function startTutorial() {
    currentTutorialStep = 1;
    showTutorialStep(1);
  }

  function showTutorialStep(step) {
    if (step < 1 || step > tutorialSteps.length) return;

    currentTutorialStep = step;
    const stepData = tutorialSteps[step - 1];

    toastSystem.tutorial(
      `**${stepData.title}** - ${stepData.message}`,
      step,
      tutorialSteps.length
    );
  }

  function endTutorial() {
    toastSystem.dismiss('tutorial');
    localStorage.setItem('flab.tutorialSeen', '1');
    toastSystem.success('Tutorial complete! You\'re ready to create formations.');
  }

  // Session storage for one-time tips
  const sessionTips = {
    hasShown: new Set(),

    show(id, message, type = 'info') {
      if (this.hasShown.has(id)) return;
      this.hasShown.add(id);
      toastSystem[type](message, { id });
    }
  };

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

  // Enhanced drag management
  let dragFrame = null;

  // Interaction state management (Enhanced v22.1)
  function beginInteraction() {
    const root = labRoot();
    if (root) {
      root.classList.add('is-interacting');
      if (state.isDragging) {
        root.classList.add('is-dragging');
      }
    }
    showCursorRing();
  }

  function endInteraction() {
    const root = labRoot();
    if (root) {
      root.classList.remove('is-interacting', 'is-dragging');
    }
    hideCursorRing();
    state.isDragging = false;
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

    // Show tutorial if first time
    checkFirstRun();

    console.log('Formation Lab v22.1 initialized - Toast System + Drag Reliability Complete');
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
    help?.addEventListener('click', startTutorial);

    // Mobile draw finish button
    const finish = drawFinishBtn();
    finish?.addEventListener('click', finishDrawing);
  }

  function handleKeyboard(e) {
    // Tutorial shortcuts
    if (e.key === 'Escape') {
      toastSystem.dismiss('tutorial');
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

    // Show one-time session tips
    switch(mode) {
      case 'ball':
        sessionTips.show('ball-tip', 'Ball mode: click a player to attach the ball • Play animates passes', 'info');
        break;
      case 'draw':
        sessionTips.show('draw-tip', 'Draw mode: click to add points • Enter = finish • Esc = cancel', 'info');
        break;
      case 'highlight':
        sessionTips.show('highlight-tip', 'Highlight mode: click players to highlight/unhighlight for tactical emphasis', 'info');
        break;
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

    // Enhanced hit target (larger for reliability)
    const hitTarget = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hitTarget.classList.add('flab-player__hit');
    hitTarget.setAttribute('r', '7'); // Larger hit area
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

    // Enhanced event listeners with drag threshold
    player.addEventListener('pointerdown', e => startDragSequence(e, id));
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

    // Update ball carrier status
    if (state.ballId === id) {
      player.classList.add('has-ball');
    } else {
      player.classList.remove('has-ball');
    }
  }

  // === ENHANCED DRAG IMPLEMENTATION WITH THRESHOLD ===

  function startDragSequence(e, id) {
    e.preventDefault();
    e.stopPropagation();

    if (state.mode !== 'select') return;

    const player = e.currentTarget;
    const startCoords = getSVGCoords(e);

    state.dragStartPos = startCoords;
    state.selectedId = id;

    // Set up threshold detection
    player.setPointerCapture?.(e.pointerId);

    // Start threshold timer (60ms hold alternative)
    state.dragTimer = setTimeout(() => {
      if (state.dragStartPos) {
        startActualDrag(e, id, player);
      }
    }, 60);

    document.addEventListener('pointermove', handleThresholdMove);
    document.addEventListener('pointerup', handleThresholdEnd);

    updateSelection();
  }

  function handleThresholdMove(e) {
    if (!state.dragStartPos) return;

    const currentCoords = getSVGCoords(e);
    if (!currentCoords) return;

    const distance = Math.sqrt(
      Math.pow(currentCoords.x - state.dragStartPos.x, 2) +
      Math.pow(currentCoords.y - state.dragStartPos.y, 2)
    );

    // Start drag if threshold exceeded
    if (distance > state.dragThreshold) {
      clearTimeout(state.dragTimer);
      const player = gPlayers()?.querySelector(`[data-id="${state.selectedId}"]`);
      if (player) {
        startActualDrag(e, state.selectedId, player);
      }
    }
  }

  function handleThresholdEnd(e) {
    clearTimeout(state.dragTimer);

    document.removeEventListener('pointermove', handleThresholdMove);
    document.removeEventListener('pointerup', handleThresholdEnd);

    const player = gPlayers()?.querySelector(`[data-id="${state.selectedId}"]`);
    if (player) {
      player.releasePointerCapture?.(e.pointerId);
    }

    state.dragStartPos = null;
  }

  function startActualDrag(e, id, player) {
    // Clean up threshold listeners
    document.removeEventListener('pointermove', handleThresholdMove);
    document.removeEventListener('pointerup', handleThresholdEnd);

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

    state.draggingId = id;
    state.isDragging = true;

    // Begin interaction with drag state
    beginInteraction();
    lockCursorRing();

    // Create drag proxy
    createDragProxy(id);

    // Set original to ghost state
    player.classList.add('drag-origin');
    player.setAttribute('aria-grabbed', 'true');

    document.addEventListener('pointermove', handleDragMove);
    document.addEventListener('pointerup', handleDragEnd);

    state.dragStartPos = null; // Clear threshold state
  }

  function createDragProxy(id) {
    const original = gPlayers()?.querySelector(`[data-id="${id}"]`);
    const proxy = gDragProxy();
    if (!original || !proxy) return;

    // Clear existing proxy
    while (proxy.firstChild) proxy.removeChild(proxy.firstChild);

    // Clone player elements
    const proxyPlayer = original.cloneNode(true);
    proxyPlayer.classList.add('drag-proxy');
    proxyPlayer.setAttribute('data-proxy', 'true');
    proxyPlayer.style.transform = original.getAttribute('transform');

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
      player.classList.remove('drag-origin');
      player.setAttribute('aria-grabbed', 'false');
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
    renderAllPlayers(); // Update has-ball classes
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

    // Show success toast
    toastSystem.success(`Pass line created with ${newLine.points.length} points`);
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
    renderAllPlayers(); // Update has-ball classes
  }

  // === ANIMATION AND PLAYBACK ===

  function playSequence() {
    if (state.lines.length === 0) {
      toastSystem.warn('Place a ball and draw a path first', {
        actions: [
          { text: 'Ball Mode', action: () => setMode('ball') },
          { text: 'Draw Mode', action: () => setMode('draw') }
        ]
      });
      return;
    }

    const ballGroup = gBall();
    if (!ballGroup || state.ballId === null) {
      toastSystem.warn('Place the ball on a player first using Ball mode', {
        actions: [
          { text: 'Ball Mode', action: () => setMode('ball') }
        ]
      });
      return;
    }

    let currentLine = 0;

    function animateNextPass() {
      if (currentLine >= state.lines.length) {
        toastSystem.success('Animation complete!');
        return;
      }

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

        renderAllPlayers(); // Update has-ball classes

        currentLine++;
        if (currentLine < state.lines.length) {
          setTimeout(animateNextPass, 400);
        } else {
          toastSystem.success('Animation complete!');
        }
      };
    }

    toastSystem.info(`Playing ${state.lines.length} pass sequences...`);
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

  // === SAVE/LOAD SYSTEM WITH TOASTS ===

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
      toastSystem.success('Formation saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      toastSystem.error('Save failed. Please try again.', {
        actions: [
          { text: 'Retry', action: () => saveFormation() }
        ]
      });
    }
  }

  function loadSavedFormation() {
    try {
      const saved = localStorage.getItem('fcb_formation_v2') || localStorage.getItem('fcb_formation_v1');
      if (!saved) {
        toastSystem.warn('No saved formation found.', {
          actions: [
            { text: 'Save Current', action: () => saveFormation() }
          ]
        });
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

      toastSystem.success('Formation loaded successfully!');
    } catch (error) {
      console.error('Load failed:', error);
      toastSystem.error('Load failed. Please try again.', {
        actions: [
          { text: 'Retry', action: () => loadSavedFormation() }
        ]
      });
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

        toastSystem.success('Formation exported as PNG!');
      };

      img.onerror = () => {
        throw new Error('Export failed');
      };

      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      img.src = url;

    } catch (error) {
      console.error('Export failed:', error);
      toastSystem.error('Export failed. Please try again.', {
        actions: [
          { text: 'Retry', action: () => exportFormation() }
        ]
      });
    }
  }

  // === FIRST RUN CHECK ===

  function checkFirstRun() {
    const seen = localStorage.getItem('flab.tutorialSeen');
    if (!seen) {
      setTimeout(startTutorial, 1000); // Show after 1 second
    }
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
    startTutorial,
    toast: toastSystem
  };

  // Global tutorial step functions for toast actions
  window.flabToast.tutorialStep = showTutorialStep;
  window.flabToast.endTutorial = endTutorial;

})();