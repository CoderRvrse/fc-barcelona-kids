/**
 * Dynamic border and corner animations
 * Adds interactive pulse effects and visual feedback to the pitch border
 */

let activeAnimationTimeout = null;

export function initBorderAnimations() {
  const field = document.querySelector('.flab-field');
  const pitchWrapper = document.querySelector('.flab-pitch-wrapper');

  if (!field || !pitchWrapper) {
    console.warn('Border animation: field or pitch-wrapper not found');
    return;
  }

  // Trigger pulse on player drag
  field.addEventListener('pointerdown', () => {
    triggerActivePulse(field);
  });

  field.addEventListener('pointerup', () => {
    clearActivePulse(field);
  });

  // Trigger pulse on pass arrow creation
  const arrowLayer = document.querySelector('#arrow-layer');
  if (arrowLayer) {
    const originalAppendChild = arrowLayer.appendChild;
    arrowLayer.appendChild = function (...args) {
      triggerActivePulse(field);
      clearTimeout(activeAnimationTimeout);
      activeAnimationTimeout = setTimeout(() => clearActivePulse(field), 800);
      return originalAppendChild.apply(this, args);
    };
  }

  // Add corner accent animation markers
  createCornerMarkers(pitchWrapper);

  // Initialize border text animations
  initBorderTextAnimations();

  console.log('✨ Border animations initialized');
}

/**
 * Trigger the active pulse animation
 */
function triggerActivePulse(field) {
  field.setAttribute('data-active', 'true');
}

/**
 * Clear the active pulse animation
 */
function clearActivePulse(field) {
  field.removeAttribute('data-active');
}

/**
 * Create animated corner markers for visual enhancement
 */
function createCornerMarkers(wrapper) {
  // Top-left corner already created via ::before pseudo-element
  // Bottom-right corner already created via ::after pseudo-element
  // This function can be extended for additional corner effects

  // Add subtle accent indicators at each corner
  const corners = [
    { position: 'top-left', side: 'top left' },
    { position: 'top-right', side: 'top right' },
    { position: 'bottom-left', side: 'bottom left' },
    { position: 'bottom-right', side: 'bottom right' }
  ];

  corners.forEach(corner => {
    const marker = document.createElement('div');
    marker.className = `border-corner-marker border-corner-${corner.position}`;
    marker.style.cssText = `
      position: absolute;
      width: 3px;
      height: 3px;
      background: rgba(255, 193, 7, 0.4);
      border-radius: 50%;
      pointer-events: none;
      z-index: 2;
      ${corner.side === 'top left' ? 'top: 12px; left: 12px;' : ''}
      ${corner.side === 'top right' ? 'top: 12px; right: 12px;' : ''}
      ${corner.side === 'bottom left' ? 'bottom: 12px; left: 12px;' : ''}
      ${corner.side === 'bottom right' ? 'bottom: 12px; right: 12px;' : ''}
      animation: dotPulse 2s ease-in-out infinite;
    `;

    // Add staggered animation delays
    const delays = { 'top-left': '0s', 'top-right': '0.5s', 'bottom-left': '1s', 'bottom-right': '1.5s' };
    marker.style.animationDelay = delays[corner.position];

    wrapper.appendChild(marker);
  });
}

/**
 * Manually trigger a visual burst effect (for events like pass creation)
 */
export function triggerBurstEffect(x, y) {
  const burst = document.createElement('div');
  burst.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    width: 40px;
    height: 40px;
    border: 2px solid rgba(255, 193, 7, 0.8);
    border-radius: 50%;
    pointer-events: none;
    z-index: 100;
    animation: burstExpand 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    box-shadow: 0 0 15px rgba(255, 193, 7, 0.6);
  `;

  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 600);
}

/**
 * Initialize keyframe animations in a style tag
 */
function initializeKeyframes() {
  if (document.getElementById('border-animation-keyframes')) return;

  const style = document.createElement('style');
  style.id = 'border-animation-keyframes';
  style.textContent = `
    @keyframes dotPulse {
      0%, 100% {
        opacity: 0.3;
        transform: scale(1);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.5);
      }
    }

    @keyframes burstExpand {
      0% {
        opacity: 1;
        transform: scale(0.5);
      }
      100% {
        opacity: 0;
        transform: scale(3);
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Initialize animated text along pitch borders
 * Uses requestAnimationFrame to smoothly animate textPath startOffset
 * Left border scrolls down, right border scrolls up (bouncing effect)
 */
function initBorderTextAnimations() {
  const textElements = document.querySelectorAll('.flab-border-text');

  if (textElements.length === 0) {
    console.warn('Border text animations: no text elements found');
    return;
  }

  // Animation config - continuous seamless flow on both sides
  // Left scrolls down (0-100), right scrolls up in sync (100-0), creating continuous flow effect
  const animConfig = {
    'left': { duration: 20000, startOffsetStart: 0, startOffsetEnd: 100, reverse: false },
    'right': { duration: 20000, startOffsetStart: 100, startOffsetEnd: 0, reverse: true }
  };

  textElements.forEach(textEl => {
    const isLeftBorder = textEl.classList.contains('flab-border-text--left');
    const isRightBorder = textEl.classList.contains('flab-border-text--right');

    let direction = null;
    if (isLeftBorder) direction = 'left';
    else if (isRightBorder) direction = 'right';
    else return;

    const config = animConfig[direction];
    const textPath = textEl.querySelector('textPath');

    if (!textPath) {
      console.warn(`Border text (${direction}): textPath not found`);
      return;
    }

    // Ensure text is visible - SVG attributes with FC Barcelona Play-style font
    // Using geometric sans-serif that matches Barcelona Play aesthetic
    textEl.setAttribute('font-family', 'Montserrat, Futura, "Century Gothic", "Arial Black", sans-serif');
    textEl.setAttribute('font-size', '0.5');  // Super tiny SVG units!
    textEl.setAttribute('font-weight', '900');
    textEl.setAttribute('dominant-baseline', 'middle');
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('paint-order', 'stroke fill');
    textEl.setAttribute('letter-spacing', '-0.05');  // Condensed spacing

    // Offset text away from border lines
    const textDy = isLeftBorder ? '4' : '4';  // Left: above path, Right: below path
    textEl.setAttribute('dy', textDy);

    // Magenta color for text
    textEl.setAttribute('fill', 'rgba(156, 39, 176, 1)');
    textEl.setAttribute('stroke', 'rgba(0, 0, 0, 0.7)');
    textEl.setAttribute('stroke-width', '0.15');

    // Dynamic color cycling palette - FC Barcelona official colors
    const colors = [
      'rgba(0, 77, 152, 1)',       // Blue (Blau)
      'rgba(168, 19, 62, 1)',      // Claret (Grana)
      'rgba(237, 187, 0, 1)',      // Gold
      'rgba(255, 237, 2, 1)',      // Yellow (senyera)
      'rgba(219, 0, 48, 1)',       // Bright Red
      'rgba(0, 77, 152, 1)'        // Blue (loop back)
    ];

    // Infinite seamless ticker-tape animation with dynamic color & glow
    let startTime = null;

    function animate(currentTime) {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = (elapsed % config.duration) / config.duration;

      // Linear continuous scroll - synchronized on both sides
      let offset;
      if (config.reverse) {
        // Right border: animate from 100 to 0 (scrolling up, picks up where left left off)
        offset = config.startOffsetStart + (config.startOffsetEnd - config.startOffsetStart) * progress;
      } else {
        // Left border: animate from 0 to 100 (scrolling down)
        offset = config.startOffsetStart + (config.startOffsetEnd - config.startOffsetStart) * progress;
      }

      // Color cycling every loop (0.0 to 1.0 = 1 full cycle)
      const colorIndex = Math.floor(progress * colors.length) % colors.length;
      const nextColorIndex = (colorIndex + 1) % colors.length;
      const colorProgress = (progress * colors.length) % 1;

      // Smooth color interpolation between palette colors
      const currentColor = colors[colorIndex];
      const nextColor = colors[nextColorIndex];

      // Pulse/glow effect - oscillates from 0.6 to 1.0 opacity
      const pulseEffect = 0.6 + Math.sin(elapsed / 300) * 0.4;

      // Apply color with dynamic glow
      textEl.setAttribute('fill', currentColor);
      textEl.setAttribute('opacity', pulseEffect.toString());

      // Enhanced stroke glow based on pulse
      const strokeWidth = 0.15 + Math.sin(elapsed / 250) * 0.1;
      textEl.setAttribute('stroke-width', strokeWidth.toString());

      // Shadow effect by adjusting stroke opacity
      const strokeOpacity = 0.5 + Math.cos(elapsed / 350) * 0.3;
      textEl.setAttribute('stroke', `rgba(0, 0, 0, ${strokeOpacity})`);

      textPath.setAttribute('startOffset', offset + '%');

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    console.log(`✏️ Border text (${direction}): animated along path`);
  });

  console.log(`📝 Border text animations started (${textElements.length} elements)`);
}

// Initialize keyframes on script load
initializeKeyframes();

window.__mod_border_animations = true;
