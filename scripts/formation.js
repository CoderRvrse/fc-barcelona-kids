// Formation Lab Module - Interactive Tactical Formation Creator
// Implements drag & drop, pass drawing, animations, and export functionality

class FormationLab {
  constructor() {
    this.pitch = document.getElementById('pitch');
    this.playersLayer = document.getElementById('playersLayer');
    this.passesLayer = document.getElementById('passesLayer');
    this.ballLayer = document.getElementById('ballLayer');

    this.players = [];
    this.passes = [];
    this.isDrawingPass = false;
    this.currentPass = null;
    this.selectedPlayer = null;
    this.ball = null;

    this.formations = {
      '4-3-3': {
        name: '4-3-3',
        positions: [
          { id: 'GK', x: 50, y: 90, name: 'Goalkeeper' },
          { id: 'LB', x: 15, y: 70, name: 'Left Back' },
          { id: 'CB1', x: 35, y: 70, name: 'Centre Back' },
          { id: 'CB2', x: 65, y: 70, name: 'Centre Back' },
          { id: 'RB', x: 85, y: 70, name: 'Right Back' },
          { id: 'CM1', x: 25, y: 45, name: 'Centre Mid' },
          { id: 'CM2', x: 50, y: 45, name: 'Centre Mid' },
          { id: 'CM3', x: 75, y: 45, name: 'Centre Mid' },
          { id: 'LW', x: 15, y: 20, name: 'Left Wing' },
          { id: 'ST', x: 50, y: 15, name: 'Striker' },
          { id: 'RW', x: 85, y: 20, name: 'Right Wing' }
        ]
      },
      '4-4-2': {
        name: '4-4-2',
        positions: [
          { id: 'GK', x: 50, y: 90, name: 'Goalkeeper' },
          { id: 'LB', x: 15, y: 70, name: 'Left Back' },
          { id: 'CB1', x: 35, y: 70, name: 'Centre Back' },
          { id: 'CB2', x: 65, y: 70, name: 'Centre Back' },
          { id: 'RB', x: 85, y: 70, name: 'Right Back' },
          { id: 'LM', x: 15, y: 45, name: 'Left Mid' },
          { id: 'CM1', x: 35, y: 45, name: 'Centre Mid' },
          { id: 'CM2', x: 65, y: 45, name: 'Centre Mid' },
          { id: 'RM', x: 85, y: 45, name: 'Right Mid' },
          { id: 'ST1', x: 35, y: 15, name: 'Striker' },
          { id: 'ST2', x: 65, y: 15, name: 'Striker' }
        ]
      },
      '3-5-2': {
        name: '3-5-2',
        positions: [
          { id: 'GK', x: 50, y: 90, name: 'Goalkeeper' },
          { id: 'CB1', x: 25, y: 70, name: 'Centre Back' },
          { id: 'CB2', x: 50, y: 70, name: 'Centre Back' },
          { id: 'CB3', x: 75, y: 70, name: 'Centre Back' },
          { id: 'LWB', x: 10, y: 50, name: 'Left Wing Back' },
          { id: 'CM1', x: 30, y: 45, name: 'Centre Mid' },
          { id: 'CM2', x: 50, y: 45, name: 'Centre Mid' },
          { id: 'CM3', x: 70, y: 45, name: 'Centre Mid' },
          { id: 'RWB', x: 90, y: 50, name: 'Right Wing Back' },
          { id: 'ST1', x: 35, y: 15, name: 'Striker' },
          { id: 'ST2', x: 65, y: 15, name: 'Striker' }
        ]
      }
    };

    this.init();
  }

  init() {
    this.loadFormation('4-3-3');
    this.createBall();
    this.bindEvents();
    this.loadFromStorage();
  }

  bindEvents() {
    // Formation selector
    const formationSelect = document.getElementById('formationSelect');
    formationSelect.addEventListener('change', (e) => {
      this.loadFormation(e.target.value);
    });

    // Clear passes button
    const clearPassesBtn = document.getElementById('clearPasses');
    clearPassesBtn.addEventListener('click', () => {
      this.clearPasses();
    });

    // Reset formation button
    const resetBtn = document.getElementById('resetFormation');
    resetBtn.addEventListener('click', () => {
      this.resetFormation();
    });

    // Export button
    const exportBtn = document.getElementById('exportFormation');
    exportBtn.addEventListener('click', () => {
      this.exportFormation();
    });

    // Animate ball button
    const animateBallBtn = document.getElementById('animateBall');
    animateBallBtn.addEventListener('click', () => {
      this.animateBall();
    });

    // Pass drawing toggle
    const drawPassesBtn = document.getElementById('drawPasses');
    drawPassesBtn.addEventListener('click', () => {
      this.togglePassDrawing();
    });

    // Pitch click for pass creation
    this.pitch.addEventListener('click', (e) => {
      if (this.isDrawingPass) {
        this.handlePassClick(e);
      }
    });

    // Auto-save on changes
    this.pitch.addEventListener('pointermove', () => {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => this.saveToStorage(), 500);
    });
  }

  loadFormation(formationName) {
    const formation = this.formations[formationName];
    if (!formation) return;

    this.clearPlayers();
    this.clearPasses();

    formation.positions.forEach(pos => {
      this.createPlayer(pos);
    });

    this.saveToStorage();
  }

  createPlayer(position) {
    const player = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    player.classList.add('formation__player');
    player.setAttribute('data-id', position.id);
    player.setAttribute('data-name', position.name);

    const x = (position.x / 100) * 1000;
    const y = (position.y / 100) * 650;

    player.innerHTML = `
      <circle cx="${x}" cy="${y}" r="15" fill="#004d98" stroke="#f2c200" stroke-width="2"/>
      <text x="${x}" y="${y + 4}" text-anchor="middle" fill="white" font-size="10" font-weight="bold" pointer-events="none">
        ${position.id}
      </text>
    `;

    this.playersLayer.appendChild(player);
    this.players.push({ element: player, position: { x: position.x, y: position.y }, id: position.id });

    this.makeDraggable(player);
  }

  makeDraggable(player) {
    let isDragging = false;
    let startPoint = { x: 0, y: 0 };
    let offset = { x: 0, y: 0 };

    const circle = player.querySelector('circle');
    const text = player.querySelector('text');

    const getPointerPosition = (e) => {
      const rect = this.pitch.getBoundingClientRect();
      const scale = 1000 / rect.width;
      return {
        x: (e.clientX - rect.left) * scale,
        y: (e.clientY - rect.top) * scale
      };
    };

    const startDrag = (e) => {
      e.preventDefault();
      isDragging = true;
      player.style.cursor = 'grabbing';

      const pointerPos = getPointerPosition(e);
      const currentX = parseFloat(circle.getAttribute('cx'));
      const currentY = parseFloat(circle.getAttribute('cy'));

      offset.x = pointerPos.x - currentX;
      offset.y = pointerPos.y - currentY;

      document.addEventListener('pointermove', drag);
      document.addEventListener('pointerup', endDrag);
    };

    const drag = (e) => {
      if (!isDragging) return;
      e.preventDefault();

      const pointerPos = getPointerPosition(e);
      let newX = pointerPos.x - offset.x;
      let newY = pointerPos.y - offset.y;

      // Constrain to pitch bounds
      newX = Math.max(15, Math.min(985, newX));
      newY = Math.max(15, Math.min(635, newY));

      circle.setAttribute('cx', newX);
      circle.setAttribute('cy', newY);
      text.setAttribute('x', newX);
      text.setAttribute('y', newY + 4);

      // Update player position data
      const playerData = this.players.find(p => p.element === player);
      if (playerData) {
        playerData.position.x = (newX / 1000) * 100;
        playerData.position.y = (newY / 650) * 100;
      }
    };

    const endDrag = () => {
      isDragging = false;
      player.style.cursor = 'grab';
      document.removeEventListener('pointermove', drag);
      document.removeEventListener('pointerup', endDrag);
      this.saveToStorage();
    };

    player.addEventListener('pointerdown', startDrag);
    player.style.cursor = 'grab';
    player.style.userSelect = 'none';
  }

  togglePassDrawing() {
    const btn = document.getElementById('drawPasses');
    this.isDrawingPass = !this.isDrawingPass;

    if (this.isDrawingPass) {
      btn.textContent = 'Stop Drawing';
      btn.classList.add('active');
      this.pitch.style.cursor = 'crosshair';
    } else {
      btn.textContent = 'Draw Passes';
      btn.classList.remove('active');
      this.pitch.style.cursor = 'default';
      this.currentPass = null;
    }
  }

  handlePassClick(e) {
    const rect = this.pitch.getBoundingClientRect();
    const scale = 1000 / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;

    if (!this.currentPass) {
      // Start new pass
      this.currentPass = {
        startX: x,
        startY: y,
        endX: x,
        endY: y
      };
    } else {
      // Complete pass
      this.currentPass.endX = x;
      this.currentPass.endY = y;
      this.createPass(this.currentPass);
      this.currentPass = null;
    }
  }

  createPass(passData) {
    const pass = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    pass.classList.add('formation__pass');
    pass.setAttribute('x1', passData.startX);
    pass.setAttribute('y1', passData.startY);
    pass.setAttribute('x2', passData.endX);
    pass.setAttribute('y2', passData.endY);
    pass.setAttribute('stroke', '#f2c200');
    pass.setAttribute('stroke-width', '2');
    pass.setAttribute('marker-end', 'url(#arrowhead)');

    this.passesLayer.appendChild(pass);
    this.passes.push(pass);
    this.saveToStorage();
  }

  createBall() {
    this.ball = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.ball.classList.add('formation__ball');
    this.ball.innerHTML = `
      <circle cx="500" cy="325" r="8" fill="#ffffff" stroke="#000000" stroke-width="1"/>
    `;
    this.ballLayer.appendChild(this.ball);
    this.makeBallDraggable();
  }

  makeBallDraggable() {
    let isDragging = false;
    let offset = { x: 0, y: 0 };

    const circle = this.ball.querySelector('circle');

    const getPointerPosition = (e) => {
      const rect = this.pitch.getBoundingClientRect();
      const scale = 1000 / rect.width;
      return {
        x: (e.clientX - rect.left) * scale,
        y: (e.clientY - rect.top) * scale
      };
    };

    const startDrag = (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;

      const pointerPos = getPointerPosition(e);
      const currentX = parseFloat(circle.getAttribute('cx'));
      const currentY = parseFloat(circle.getAttribute('cy'));

      offset.x = pointerPos.x - currentX;
      offset.y = pointerPos.y - currentY;

      document.addEventListener('pointermove', drag);
      document.addEventListener('pointerup', endDrag);
    };

    const drag = (e) => {
      if (!isDragging) return;
      e.preventDefault();

      const pointerPos = getPointerPosition(e);
      let newX = pointerPos.x - offset.x;
      let newY = pointerPos.y - offset.y;

      newX = Math.max(8, Math.min(992, newX));
      newY = Math.max(8, Math.min(642, newY));

      circle.setAttribute('cx', newX);
      circle.setAttribute('cy', newY);
    };

    const endDrag = () => {
      isDragging = false;
      document.removeEventListener('pointermove', drag);
      document.removeEventListener('pointerup', endDrag);
      this.saveToStorage();
    };

    this.ball.addEventListener('pointerdown', startDrag);
    this.ball.style.cursor = 'grab';
  }

  animateBall() {
    if (this.passes.length === 0) return;

    const circle = this.ball.querySelector('circle');
    let currentPassIndex = 0;

    const animateToNextPass = () => {
      if (currentPassIndex >= this.passes.length) {
        currentPassIndex = 0;
      }

      const pass = this.passes[currentPassIndex];
      const startX = parseFloat(pass.getAttribute('x1'));
      const startY = parseFloat(pass.getAttribute('y1'));
      const endX = parseFloat(pass.getAttribute('x2'));
      const endY = parseFloat(pass.getAttribute('y2'));

      // Move ball to start of pass
      circle.setAttribute('cx', startX);
      circle.setAttribute('cy', startY);

      // Animate to end of pass
      const animate = circle.animate([
        { transform: `translate(0, 0)` },
        { transform: `translate(${endX - startX}px, ${endY - startY}px)` }
      ], {
        duration: 800,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });

      animate.onfinish = () => {
        circle.setAttribute('cx', endX);
        circle.setAttribute('cy', endY);
        currentPassIndex++;

        if (currentPassIndex < this.passes.length) {
          setTimeout(animateToNextPass, 300);
        }
      };
    };

    animateToNextPass();
  }

  clearPasses() {
    this.passes.forEach(pass => pass.remove());
    this.passes = [];
    this.saveToStorage();
  }

  clearPlayers() {
    this.players.forEach(player => player.element.remove());
    this.players = [];
  }

  resetFormation() {
    const currentFormation = document.getElementById('formationSelect').value;
    this.loadFormation(currentFormation);

    // Reset ball position
    const circle = this.ball.querySelector('circle');
    circle.setAttribute('cx', '500');
    circle.setAttribute('cy', '325');

    this.saveToStorage();
  }

  exportFormation() {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 650;
    const ctx = canvas.getContext('2d');

    // Draw pitch background
    ctx.fillStyle = '#2d5a3d';
    ctx.fillRect(0, 0, 1000, 650);

    // Draw pitch markings (simplified)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    // Outer boundary
    ctx.strokeRect(10, 10, 980, 630);

    // Center line
    ctx.beginPath();
    ctx.moveTo(10, 325);
    ctx.lineTo(990, 325);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(500, 325, 73, 0, 2 * Math.PI);
    ctx.stroke();

    // Goal areas
    ctx.strokeRect(450, 580, 100, 60);
    ctx.strokeRect(450, 10, 100, 60);

    // Penalty areas
    ctx.strokeRect(350, 540, 300, 100);
    ctx.strokeRect(350, 10, 300, 100);

    // Draw passes
    ctx.strokeStyle = '#f2c200';
    ctx.lineWidth = 3;
    this.passes.forEach(pass => {
      const x1 = parseFloat(pass.getAttribute('x1'));
      const y1 = parseFloat(pass.getAttribute('y1'));
      const x2 = parseFloat(pass.getAttribute('x2'));
      const y2 = parseFloat(pass.getAttribute('y2'));

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Draw players
    this.players.forEach(player => {
      const circle = player.element.querySelector('circle');
      const text = player.element.querySelector('text');
      const x = parseFloat(circle.getAttribute('cx'));
      const y = parseFloat(circle.getAttribute('cy'));

      // Player circle
      ctx.fillStyle = '#004d98';
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = '#f2c200';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Player text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(text.textContent, x, y + 3);
    });

    // Draw ball
    const ballCircle = this.ball.querySelector('circle');
    const ballX = parseFloat(ballCircle.getAttribute('cx'));
    const ballY = parseFloat(ballCircle.getAttribute('cy'));

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ballX, ballY, 8, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Download the canvas as PNG
    const link = document.createElement('a');
    link.download = `formation-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }

  saveToStorage() {
    const data = {
      formation: document.getElementById('formationSelect').value,
      players: this.players.map(p => ({
        id: p.id,
        position: p.position
      })),
      passes: this.passes.map(pass => ({
        x1: parseFloat(pass.getAttribute('x1')),
        y1: parseFloat(pass.getAttribute('y1')),
        x2: parseFloat(pass.getAttribute('x2')),
        y2: parseFloat(pass.getAttribute('y2'))
      })),
      ball: {
        x: parseFloat(this.ball.querySelector('circle').getAttribute('cx')),
        y: parseFloat(this.ball.querySelector('circle').getAttribute('cy'))
      }
    };

    localStorage.setItem('formationLabState', JSON.stringify(data));
  }

  loadFromStorage() {
    const saved = localStorage.getItem('formationLabState');
    if (!saved) return;

    try {
      const data = JSON.parse(saved);

      // Load formation
      document.getElementById('formationSelect').value = data.formation;

      // Update player positions
      if (data.players) {
        data.players.forEach(savedPlayer => {
          const player = this.players.find(p => p.id === savedPlayer.id);
          if (player) {
            const circle = player.element.querySelector('circle');
            const text = player.element.querySelector('text');
            const x = (savedPlayer.position.x / 100) * 1000;
            const y = (savedPlayer.position.y / 100) * 650;

            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            text.setAttribute('x', x);
            text.setAttribute('y', y + 4);

            player.position = savedPlayer.position;
          }
        });
      }

      // Restore passes
      if (data.passes) {
        data.passes.forEach(passData => {
          this.createPass(passData);
        });
      }

      // Restore ball position
      if (data.ball) {
        const circle = this.ball.querySelector('circle');
        circle.setAttribute('cx', data.ball.x);
        circle.setAttribute('cy', data.ball.y);
      }
    } catch (error) {
      console.error('Failed to load formation state:', error);
    }
  }
}

// Initialize Formation Lab when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pitch')) {
      window.formationLab = new FormationLab();
    }
  });
} else {
  if (document.getElementById('pitch')) {
    window.formationLab = new FormationLab();
  }
}

export default FormationLab;