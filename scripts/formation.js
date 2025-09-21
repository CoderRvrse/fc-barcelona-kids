(function () {
  const svg = () => document.getElementById('flabPitch');
  const gPlayers = () => document.getElementById('flabPlayers');
  const gLines = () => document.getElementById('flabLines');

  const presets = {
    "433": [
      [52.5,62],          // GK
      [16,50],[36,48],[69,48],[89,50], // back 4
      [30,38],[52.5,36],[75,38],       // mid 3
      [28,22],[52.5,18],[77,22]        // front 3
    ],
    "442": [
      [52.5,62],          // GK
      [16,50],[36,48],[69,48],[89,50], // back 4
      [25,38],[44,36],[61,36],[80,38], // mid 4
      [40,20],[66,20]                  // front 2
    ],
    "451": [
      [52.5,62],          // GK
      [16,50],[36,48],[69,48],[89,50], // back 4
      [20,42],[35,40],[52.5,38],[70,40],[85,42], // mid 5
      [52.5,18]                        // front 1
    ],
    "343": [
      [52.5,62],          // GK
      [30,50],[52.5,48],[75,50],       // back 3
      [16,42],[36,38],[69,38],[89,42], // mid 4
      [32,22],[52.5,18],[73,22]        // front 3
    ],
    "352": [
      [52.5,62],          // GK
      [30,50],[52.5,48],[75,50],       // back 3
      [16,42],[30,38],[52.5,36],[75,38],[89,42], // mid 5
      [40,20],[66,20]                  // front 2
    ]
  };

  function clearGroup(g){
    if (!g) return;
    while(g.firstChild) g.removeChild(g.firstChild);
  }

  function drawPlaceholders(formation="433"){
    const pts = presets[formation] || presets["433"];
    const playersGroup = gPlayers();
    if (!playersGroup) return;

    clearGroup(playersGroup);

    pts.forEach((p, i) => {
      const [x,y] = p;
      const node = document.createElementNS('http://www.w3.org/2000/svg','g');
      node.classList.add('flab-player');
      node.setAttribute('tabindex', '0');
      node.setAttribute('transform', `translate(${x} ${y})`);
      node.dataset.index = i;
      node.setAttribute('aria-label', `Player ${i === 0 ? 'Goalkeeper' : i + 1}`);

      const dot = document.createElementNS('http://www.w3.org/2000/svg','circle');
      dot.setAttribute('class','flab-player__dot');

      const label = document.createElementNS('http://www.w3.org/2000/svg','text');
      label.setAttribute('class','flab-player__label');
      label.textContent = i === 0 ? '1' : String(i + 1);

      node.appendChild(dot);
      node.appendChild(label);
      playersGroup.appendChild(node);

      // Simple drag functionality
      let dragging = false;

      node.addEventListener('pointerdown', e => {
        dragging = true;
        node.setPointerCapture?.(e.pointerId);
        e.preventDefault();
      });

      node.addEventListener('pointerup', e => {
        dragging = false;
        node.releasePointerCapture?.(e.pointerId);
      });

      node.addEventListener('pointermove', e => {
        if(!dragging) return;
        e.preventDefault();

        const pitchSvg = svg();
        if (!pitchSvg) return;

        const pt = pitchSvg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;

        try {
          const local = pt.matrixTransform(pitchSvg.getScreenCTM().inverse());
          // Constrain to pitch bounds
          const x = Math.max(1, Math.min(104, local.x));
          const y = Math.max(1, Math.min(67, local.y));
          node.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        } catch (error) {
          // Fallback for browsers without full SVG support
          console.warn('SVG transform not supported:', error);
        }
      });

      // Keyboard support
      node.addEventListener('keydown', e => {
        const step = 2;
        const transform = node.getAttribute('transform');
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (!match) return;

        let x = parseFloat(match[1]);
        let y = parseFloat(match[2]);

        switch(e.key) {
          case 'ArrowLeft': x = Math.max(1, x - step); break;
          case 'ArrowRight': x = Math.min(104, x + step); break;
          case 'ArrowUp': y = Math.max(1, y - step); break;
          case 'ArrowDown': y = Math.min(67, y + step); break;
          default: return;
        }

        e.preventDefault();
        node.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      });
    });
  }

  function wireUI(){
    const sel = document.getElementById('flabFormation');
    sel?.addEventListener('change', () => drawPlaceholders(sel.value));

    document.querySelectorAll('.flab__buttons button').forEach(btn=>{
      const mode = btn.dataset.mode;
      const act = btn.dataset.action;

      btn.addEventListener('click', () => {
        if (act === 'clear') {
          clearGroup(gLines());
          console.log('Lines cleared');
        }
        if (act === 'export') {
          exportPNG();
        }
        if (act === 'save') {
          saveFormation();
        }
        if (act === 'load') {
          loadFormation();
        }
        // Mode handlers can be wired later
        console.log('Button clicked:', mode || act);
      });
    });
  }

  function exportPNG(){
    alert('Export coming next. SVG → PNG pipeline will be added.');
  }

  function saveFormation(){
    try {
      const players = Array.from(gPlayers()?.children || []).map(node => {
        const transform = node.getAttribute('transform');
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        return match ? {
          index: node.dataset.index,
          x: parseFloat(match[1]),
          y: parseFloat(match[2])
        } : null;
      }).filter(Boolean);

      const formation = document.getElementById('flabFormation')?.value || '433';

      const data = { formation, players, timestamp: Date.now() };
      localStorage.setItem('formationLab:saved', JSON.stringify(data));

      alert('Formation saved!');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Save failed. Please try again.');
    }
  }

  function loadFormation(){
    try {
      const saved = localStorage.getItem('formationLab:saved');
      if (!saved) {
        alert('No saved formation found.');
        return;
      }

      const data = JSON.parse(saved);

      // Set formation
      const sel = document.getElementById('flabFormation');
      if (sel && data.formation) {
        sel.value = data.formation;
      }

      // Redraw with saved positions
      drawPlaceholders(data.formation);

      // Apply saved positions
      if (data.players) {
        data.players.forEach(playerData => {
          const node = gPlayers()?.querySelector(`[data-index="${playerData.index}"]`);
          if (node) {
            node.setAttribute('transform', `translate(${playerData.x} ${playerData.y})`);
          }
        });
      }

      alert('Formation loaded!');
    } catch (error) {
      console.error('Load failed:', error);
      alert('Load failed. Please try again.');
    }
  }

  function init(){
    if(!document.getElementById('flabPitch')) return;
    wireUI();
    drawPlaceholders(document.getElementById('flabFormation')?.value || '433');
    console.log('Formation Lab initialized');
  }

  // Public API
  const FormationLab = {
    init,
    drawPlaceholders,
    saveFormation,
    loadFormation,
    exportPNG
  };

  window.FormationLab = FormationLab;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();