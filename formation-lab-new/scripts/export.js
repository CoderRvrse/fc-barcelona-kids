// Export module for Formation Lab
import { FLAB, PITCH_LAND, PITCH_PORT, PASS } from './state.js';
import { normToView, getVar, insetFromA, insetFromB } from './geometry.js';
import { ARROW_ASSETS } from './assets.arrows.js';
import { headPxFor, headTrimPx } from './pass.headsize.js';
import { showSpinner, hideSpinner } from './loading-spinner.js';
import { handleError } from './error-handler.js';
import { showSuccessToast, showErrorToast } from './ui-toast.js';
const JERSEY_SIZE = 56;

// Bleed configuration (moved from geometry to avoid circular dependency)
const BLEED = {
  landscape: { left: 24, right: 24, top: 24, bottom: 24 },
  portrait:  { left: 24, right: 24, top: 28, bottom: 28 }
};

// Jersey image for export
const jerseyImg = new Image();
jerseyImg.src = 'assets/jersey.svg';

function getPlayer(playerId) {
  return FLAB.players.find(player => player.id === playerId) || null;
}

function showToast(message) {
  // Import ui module for toast functionality
  import('./ui.js').then(({ showToast }) => {
    showToast(message);
  }).catch(() => {
    console.log(message); // Fallback
  });
}

function logTelemetry(event, data) {
  console.log(`Telemetry: ${event}`, data);
}

/**
 * Draw border decorations (corner markers, lines, and text)
 * to match the animated pitch border styling
 */
function drawBorderDecorations(ctx, wCss, hCss) {
  const cornerSize = 40;
  const lineWidth = 2;
  const cornerRadius = 8;

  // FC Barcelona color palette
  const colors = [
    'rgba(0, 77, 152, 0.6)',        // Blue (Blau)
    'rgba(168, 19, 62, 0.6)',       // Claret (Grana)
    'rgba(237, 187, 0, 0.6)',       // Gold
    'rgba(255, 237, 2, 0.6)',       // Yellow (senyera)
    'rgba(219, 0, 48, 0.6)',        // Bright Red
  ];
  const primaryColor = colors[0]; // Use blue as primary for export

  ctx.save();

  // Draw corner markers
  const corners = [
    { x: 0, y: 0, label: 'top-left' },
    { x: wCss - cornerSize, y: 0, label: 'top-right' },
    { x: wCss - cornerSize, y: hCss - cornerSize, label: 'bottom-right' },
    { x: 0, y: hCss - cornerSize, label: 'bottom-left' }
  ];

  corners.forEach((corner, index) => {
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    // Draw corner bracket based on position
    if (index === 0) {
      // Top-left
      ctx.moveTo(corner.x, corner.y + cornerRadius);
      ctx.lineTo(corner.x, corner.y);
      ctx.lineTo(corner.x + cornerRadius, corner.y);
    } else if (index === 1) {
      // Top-right
      ctx.moveTo(corner.x + cornerSize - cornerRadius, corner.y);
      ctx.lineTo(corner.x + cornerSize, corner.y);
      ctx.lineTo(corner.x + cornerSize, corner.y + cornerRadius);
    } else if (index === 2) {
      // Bottom-right
      ctx.moveTo(corner.x + cornerSize, corner.y + cornerSize - cornerRadius);
      ctx.lineTo(corner.x + cornerSize, corner.y + cornerSize);
      ctx.lineTo(corner.x + cornerSize - cornerRadius, corner.y + cornerSize);
    } else if (index === 3) {
      // Bottom-left
      ctx.moveTo(corner.x + cornerRadius, corner.y + cornerSize);
      ctx.lineTo(corner.x, corner.y + cornerSize);
      ctx.lineTo(corner.x, corner.y + cornerSize - cornerRadius);
    }

    ctx.stroke();
  });

  // Draw border lines with slight glow effect
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = lineWidth;
  ctx.shadowColor = 'rgba(0, 77, 152, 0.4)';
  ctx.shadowBlur = 8;

  // Top line
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(wCss, 0);
  ctx.stroke();

  // Right line
  ctx.beginPath();
  ctx.moveTo(wCss, 0);
  ctx.lineTo(wCss, hCss);
  ctx.stroke();

  // Bottom line
  ctx.beginPath();
  ctx.moveTo(wCss, hCss);
  ctx.lineTo(0, hCss);
  ctx.stroke();

  // Left line
  ctx.beginPath();
  ctx.moveTo(0, hCss);
  ctx.lineTo(0, 0);
  ctx.stroke();

  ctx.restore();
}

function applyCanvasPassStyle(ctx) {
  const s = FLAB.passStyle;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--pass-color').trim() || "#f0c419";

  if (s === 'dashed') {
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 4;
  } else if (s.startsWith('comic')) {
    ctx.setLineDash([2, 8]);
    ctx.lineWidth = 5;
  } else {
    ctx.setLineDash([]);
    ctx.lineWidth = 4;
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Recolor SVG content with current pass colors
function recolorSVG(svgText, fillColor, strokeColor) {
  return svgText
    .replace(/fill\s*=\s*["'][^"']*["']/gi, `fill="${fillColor}"`)
    .replace(/stroke\s*=\s*["'][^"']*["']/gi, `stroke="${strokeColor}"`);
}

// Create a colored image for the current colors
async function getColoredImage(styleKey, fillColor, strokeColor) {
  const asset = ARROW_ASSETS.get(styleKey);
  if (!asset) return null;

  const coloredSVG = recolorSVG(asset.svgText, fillColor, strokeColor);
  const img = new Image();
  img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(coloredSVG);
  await img.decode().catch(() => {});
  return img;
}

function drawHeadCanvas(ctx, A, B, styleKey) {
  const len = Math.hypot(B.x - A.x, B.y - A.y);
  const isComic = /comic/.test(styleKey);
  const head = headPxFor(len, isComic);

  const ang = Math.atan2(B.y - A.y, B.x - A.x);

  // Get current colors for a simple geometric arrow
  const shaftColor = getComputedStyle(document.documentElement).getPropertyValue('--pass-color')?.trim() || PASS.color;
  const outlineColor = getComputedStyle(document.documentElement).getPropertyValue('--pass-outline')?.trim() || PASS.outline;

  ctx.save();
  ctx.translate(B.x, B.y);
  ctx.rotate(ang);

  // Draw a simple triangle arrow head using current colors
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-head, head / 2);
  ctx.lineTo(-head, -head / 2);
  ctx.closePath();

  ctx.fillStyle = shaftColor;
  ctx.fill();

  ctx.lineWidth = getVar('--pass-head-outline', 1.4);
  ctx.strokeStyle = outlineColor;
  ctx.stroke();

  ctx.restore();
}

async function ensureJerseyReady() {
  if (jerseyImg.complete) {
    if (jerseyImg.naturalWidth > 0) {
      return;
    }
    throw new Error('jersey_unavailable');
  }
  if (typeof jerseyImg.decode === "function") {
    try {
      await jerseyImg.decode();
      if (jerseyImg.naturalWidth > 0) {
        return;
      }
    } catch (error) {
      console.warn('jersey_decode_failed', error);
    }
  }
  await new Promise((resolve, reject) => {
    jerseyImg.addEventListener('load', resolve, { once: true });
    jerseyImg.addEventListener('error', () => reject(new Error('Failed to load jersey.svg')), { once: true });
  });
  if (jerseyImg.naturalWidth === 0) {
    throw new Error('jersey_unavailable');
  }
}

function drawJersey(ctx, x, y, size, numText) {
  const half = size / 2;
  const scale = size / JERSEY_SIZE || 1;
  if (jerseyImg.complete && jerseyImg.naturalWidth > 0) {
    ctx.drawImage(jerseyImg, x - half, y - half, size, size);
  } else {
    ctx.save();
    ctx.fillStyle = '#0b2b72';
    ctx.beginPath();
    ctx.arc(x, y, half, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const chipRadius = 14 * scale;
  const offset = 4 * scale;
  const chipX = x + half - chipRadius - offset;
  const chipY = y + half - chipRadius - offset;

  ctx.save();
  ctx.fillStyle = '#ffd166';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.beginPath();
  ctx.arc(chipX, chipY, chipRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0b2b66';
  ctx.font = `${Math.max(12, 14 * scale)}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(numText), chipX, chipY);
  ctx.restore();
}

function drawArrows(ctx, width, height) {
  ctx.save();
  const passColor = getComputedStyle(document.documentElement).getPropertyValue('--pass-color').trim() || "#f0c419";
  ctx.strokeStyle = passColor;
  ctx.fillStyle = passColor;
  applyCanvasPassStyle(ctx);
  ctx.lineCap = "round";

  const avgScale = Math.min(width / 800, height / 600);

  FLAB.arrows.forEach(arrow => {
    const fromPlayer = getPlayer(arrow.fromId);
    if (!fromPlayer) return;

    // Use view-aware coordinates for export
    const isExportPortrait = FLAB.orientation === 'portrait';
    const bleed = isExportPortrait ? BLEED.portrait : BLEED.landscape;
    const r = {
      x: bleed.left * (width / 720),
      y: bleed.top * (height / 460),
      w: width - (bleed.left + bleed.right) * (width / 720),
      h: height - (bleed.top + bleed.bottom) * (height / 460)
    };

    // Apply view transform for export
    const {vx: passerVx, vy: passerVy} = normToView(fromPlayer.nx, fromPlayer.ny);
    const passerCenter = {
      x: r.x + passerVx * r.w,
      y: r.y + passerVy * r.h
    };

    // Target center needs scaling from original arrow coordinates
    const scaleX = width / (document.querySelector('.flab-field')?.clientWidth || 800);
    const scaleY = height / (document.querySelector('.flab-field')?.clientHeight || 600);
    const targetCenter = { x: arrow.to.x * scaleX, y: arrow.to.y * scaleY };

    // Create a scaled version of halo-based endpoints for export
    const exportHaloR = 28 * avgScale; // approximate halo radius scaled
    const exportStartGap = getVar('--pass-origin-gap', 1.5) * avgScale;
    const exportEndGap = getVar('--pass-target-gap', 2) * avgScale;

    // Calculate scaled tight endpoints
    const A = insetFromA(passerCenter.x, passerCenter.y, targetCenter.x, targetCenter.y, exportHaloR + exportStartGap);
    const exportTargetR = 28 * avgScale; // approximate target radius
    const Btip = insetFromB(passerCenter.x, passerCenter.y, targetCenter.x, targetCenter.y, exportTargetR + exportEndGap);

    // Calculate shaft trim for clean head join
    const len = Math.hypot(Btip.x - A.x, Btip.y - A.y);
    const isComic = /comic/.test(FLAB.passStyle);
    const headPx = headPxFor(len, isComic);
    const trim = headTrimPx(headPx);

    // Calculate shortened shaft endpoint
    const dx = Btip.x - A.x;
    const dy = Btip.y - A.y;
    const L = len || 1;
    const Bshaft = {
      x: Btip.x - dx * (trim / L),
      y: Btip.y - dy * (trim / L)
    };

    if (arrow.curved && arrow.control) {
      // For curved passes - need to adjust the curve endpoint
      const scaledControl = { x: arrow.control.x * scaleX, y: arrow.control.y * scaleY };
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.quadraticCurveTo(scaledControl.x, scaledControl.y, Bshaft.x, Bshaft.y);
    } else {
      // For straight passes
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(Bshaft.x, Bshaft.y);
    }

    ctx.stroke();

    // Draw arrowhead using current style at the tip position
    drawHeadCanvas(ctx, A, Btip, FLAB.passStyle);
  });

  ctx.restore();
}

function drawPlayers(ctx, width, height) {
  const sizeScale = Math.min(width / 720, height / 460); // Approximate scaling
  FLAB.players.forEach(player => {
    // Use view-aware coordinates and convert to export canvas space
    const isExportPortrait = FLAB.orientation === 'portrait';
    const bleed = isExportPortrait ? BLEED.portrait : BLEED.landscape;
    const r = {
      x: bleed.left * (width / 720),
      y: bleed.top * (height / 460),
      w: width - (bleed.left + bleed.right) * (width / 720),
      h: height - (bleed.top + bleed.bottom) * (height / 460)
    };

    // Apply view transform for export
    const {vx, vy} = normToView(player.nx, player.ny);
    const x = r.x + vx * r.w;
    const y = r.y + vy * r.h;
    drawJersey(ctx, x, y, JERSEY_SIZE * sizeScale, player.id);
  });
}

export async function exportPNG() {
  const spinnerId = showSpinner("Exporting formation...");

  try {
    const field = document.querySelector('.flab-field');
    const dpr = window.devicePixelRatio || 1;
    const wCss = Math.max(1, field?.clientWidth || 800);
    const hCss = Math.max(1, field?.clientHeight || 600);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(wCss * dpr);
    canvas.height = Math.round(hCss * dpr);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error('Canvas context unavailable for export');
    }

    ctx.scale(dpr, dpr);

    // Try to load jersey image (non-critical)
    try {
      await ensureJerseyReady();
    } catch (error) {
      console.warn('Jersey image load failed (non-critical):', error);
    }

    // 1) Draw pitch from active orientation
    const pitchSrc = FLAB.orientation === 'portrait' ? PITCH_PORT : PITCH_LAND;
    const img = new Image();
    img.src = pitchSrc;

    try {
      await img.decode();
    } catch (error) {
      throw new Error('Failed to load pitch image. Please try again.');
    }

    ctx.drawImage(img, 0, 0, wCss, hCss);

    // 2) Draw arrows/jerseys/halo-based passes
    drawArrows(ctx, wCss, hCss);
    drawPlayers(ctx, wCss, hCss);

    // 3) Draw border decorations (corner markers and lines)
    drawBorderDecorations(ctx, wCss, hCss);

    // Add subtle watermark
    ctx.save();
    ctx.font = '12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'right';
    ctx.fillText(`Formation Lab ${FLAB.version}`, wCss - 10, hCss - 10);
    ctx.restore();

    // 3) Convert to data URL and download
    let url;
    try {
      url = canvas.toDataURL('image/png');
    } catch (error) {
      throw new Error('Failed to create image data. Canvas may be too large.');
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = `formation-${Date.now()}.png`;
    a.click();

    // Success!
    hideSpinner(spinnerId);
    showSuccessToast("Formation exported successfully!");

    logTelemetry("export_png", {
      width: canvas.width,
      height: canvas.height,
      arrows: FLAB.arrows.length,
      dpr,
      success: true
    });

  } catch (error) {
    hideSpinner(spinnerId);
    handleError(error, 'export', true);
    showErrorToast('Export failed. Please try again.');

    logTelemetry("export_png", {
      error: error.message,
      success: false
    });
  }
}

window.__mod_export = true;