import QRCode from 'qrcode';
import { calculateCoverCrop } from './coverCrop';

export interface RenderOptions {
  width?: number;
  height?: number;
  name?: string;
  origin?: string;
  team?: string;
}

/* ── Color Palette ─────────────────────────────────────── */
const C = {
  bg: '#0C0C0E',
  card: '#111114',
  yellow: '#FDE047',
  gold: '#D4A843',
  orange: '#EA580C',
  warmOrange: '#F59E0B',
  pink: '#EC4899',
  green: '#10B981',
  white: '#F9FAFB',
  muted: '#6B7280',
  dim: '#3A3A44',
  border: '#2A2A30',
  dark: '#18181C',
  surface: '#1E1E24',
};

/* ── Font Helpers ──────────────────────────────────────── */
const F = {
  bold: (s: number) => `bold ${s}px "Inter", sans-serif`,
  med: (s: number) => `500 ${s}px "Inter", sans-serif`,
  reg: (s: number) => `400 ${s}px "Inter", sans-serif`,
  italic: (s: number) => `italic 500 ${s}px "Inter", sans-serif`,
  boldItalic: (s: number) => `italic bold ${s}px "Inter", sans-serif`,
};

/* ═══════════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════════════════════ */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function octagonPath(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, w: number, h: number, cut: number
) {
  const l = cx - w / 2, r = cx + w / 2;
  const t = cy - h / 2, b = cy + h / 2;
  ctx.beginPath();
  ctx.moveTo(l + cut, t);
  ctx.lineTo(r - cut, t);
  ctx.lineTo(r, t + cut);
  ctx.lineTo(r, b - cut);
  ctx.lineTo(r - cut, b);
  ctx.lineTo(l + cut, b);
  ctx.lineTo(l, b - cut);
  ctx.lineTo(l, t + cut);
  ctx.closePath();
}

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number, spacing: number
) {
  let currentX = x;
  for (const char of text) {
    ctx.fillText(char, currentX, y);
    currentX += ctx.measureText(char).width + spacing;
  }
}

function drawVerticalText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number, spacing: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  drawSpacedText(ctx, text, 0, 0, spacing);
  ctx.restore();
}

/* ── Background Textures ───────────────────────────────── */

function drawGrid(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number
) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = C.yellow;
  ctx.lineWidth = 0.5;
  const gap = 32;
  for (let gx = x; gx <= x + w; gx += gap) {
    ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke();
  }
  for (let gy = y; gy <= y + h; gy += gap) {
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
  }
  ctx.restore();
}

function drawTopoLines(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, count: number
) {
  ctx.save();
  ctx.globalAlpha = 0.035;
  ctx.strokeStyle = C.yellow;
  ctx.lineWidth = 0.6;
  for (let i = 1; i <= count; i++) {
    const rx = 45 * i + Math.sin(i) * 25;
    const ry = 35 * i + Math.cos(i) * 18;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0.2 * i, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWorldMapDots(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number
) {
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = C.yellow;
  const regions = [
    { cx: 0.2, cy: 0.3, dots: 35, spread: 0.13 },
    { cx: 0.28, cy: 0.65, dots: 22, spread: 0.08 },
    { cx: 0.48, cy: 0.25, dots: 20, spread: 0.07 },
    { cx: 0.48, cy: 0.55, dots: 25, spread: 0.1 },
    { cx: 0.7, cy: 0.3, dots: 40, spread: 0.16 },
    { cx: 0.65, cy: 0.45, dots: 12, spread: 0.04 },
    { cx: 0.82, cy: 0.7, dots: 14, spread: 0.06 },
  ];
  for (const r of regions) {
    for (let i = 0; i < r.dots; i++) {
      const dx = x + r.cx * w + (Math.random() - 0.5) * r.spread * w;
      const dy = y + r.cy * h + (Math.random() - 0.5) * r.spread * h;
      ctx.fillRect(dx, dy, 2.5, 2.5);
    }
  }
  ctx.restore();
}

/* ── Decorative Elements ───────────────────────────────── */

function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, size: number
) {
  ctx.save();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 1.5;
  const corners = [
    [x, y, 1, 1], [x + w, y, -1, 1],
    [x, y + h, 1, -1], [x + w, y + h, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * size, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * size);
    ctx.stroke();
    const px = cx + dx * 6, py = cy + dy * 6;
    ctx.beginPath();
    ctx.moveTo(px - 3, py); ctx.lineTo(px + 3, py);
    ctx.moveTo(px, py - 3); ctx.lineTo(px, py + 3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDiagonalStripes(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 3;
  for (let i = -size; i < size * 2; i += 10) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i - size, y + size);
    ctx.stroke();
  }
  ctx.restore();
}

function drawChevrons(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, count: number, size: number
) {
  ctx.save();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < count; i++) {
    const cx = x + i * (size + 5);
    ctx.beginPath();
    ctx.moveTo(cx, y - size / 2);
    ctx.lineTo(cx + size / 2, y);
    ctx.lineTo(cx, y + size / 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGradientBarcode(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  gradient: string | CanvasGradient
) {
  ctx.save();
  ctx.fillStyle = gradient;
  const bars = 65;
  const barW = w / bars;
  for (let i = 0; i < bars; i++) {
    // Math.sin provides a deterministic but varied pattern
    const thick = Math.abs(Math.sin(i * 1.5)) > 0.4;
    ctx.fillRect(x + i * barW, y, thick ? barW * 0.7 : barW * 0.3, h);
  }
  ctx.restore();
}

function drawStubSeparator(
  ctx: CanvasRenderingContext2D,
  x: number, yTop: number, yBot: number, cutR: number
) {
  ctx.save();
  ctx.strokeStyle = C.dim;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.moveTo(x, yTop + cutR);
  ctx.lineTo(x, yBot - cutR);
  ctx.stroke();
  ctx.setLineDash([]);
  // Semicircle cutouts
  ctx.fillStyle = C.bg;
  ctx.beginPath();
  ctx.arc(x, yTop, cutR, 0, Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, yBot, cutR, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ── Airplane Icon ─────────────────────────────────────── */
function drawAirplane(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = C.gold;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(size * 0.2, -size * 0.15);
  ctx.lineTo(-size * 0.1, -size * 0.6);
  ctx.lineTo(-size * 0.2, -size * 0.6);
  ctx.lineTo(-size * 0.15, -size * 0.15);
  ctx.lineTo(-size * 0.7, -size * 0.15);
  ctx.lineTo(-size * 0.8, -size * 0.35);
  ctx.lineTo(-size, -size * 0.35);
  ctx.lineTo(-size * 0.85, -size * 0.05);
  ctx.lineTo(-size, 0);
  ctx.lineTo(-size * 0.85, size * 0.05);
  ctx.lineTo(-size, size * 0.35);
  ctx.lineTo(-size * 0.8, size * 0.35);
  ctx.lineTo(-size * 0.7, size * 0.15);
  ctx.lineTo(-size * 0.15, size * 0.15);
  ctx.lineTo(-size * 0.2, size * 0.6);
  ctx.lineTo(-size * 0.1, size * 0.6);
  ctx.lineTo(size * 0.2, size * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ── ADMITTED Stamp ────────────────────────────────────── */
function drawStamp(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number
) {
  ctx.save();
  ctx.globalAlpha = 0.85;

  // Outer ring (thick)
  ctx.strokeStyle = C.warmOrange;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 7, 0, Math.PI * 2);
  ctx.stroke();

  // ADMITTED text (large, centered)
  ctx.fillStyle = C.warmOrange;
  ctx.font = F.bold(18);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADMITTED', cx, cy + 1);

  // Curved top text: "HH GOA '26"
  ctx.font = F.bold(10);
  const topText = "HH GOA '26";
  const topAngleStart = -Math.PI / 2 - (topText.length * 0.09);
  for (let i = 0; i < topText.length; i++) {
    const angle = topAngleStart + i * 0.18;
    const tx = cx + (radius - 14) * Math.cos(angle);
    const ty = cy + (radius - 14) * Math.sin(angle);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(angle + Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(topText[i], 0, 0);
    ctx.restore();
  }

  // Curved bottom text: "GOA · INDIA"
  const botText = 'GOA · INDIA';
  const botAngleStart = Math.PI / 2 - (botText.length * 0.09);
  for (let i = 0; i < botText.length; i++) {
    const angle = botAngleStart + i * 0.18;
    const tx = cx + (radius - 14) * Math.cos(angle);
    const ty = cy + (radius - 14) * Math.sin(angle);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(angle - Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(botText[i], 0, 0);
    ctx.restore();
  }

  // Star decorations at compass points
  const starAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
  for (const a of starAngles) {
    const sx = cx + (radius - 3.5) * Math.cos(a);
    const sy = cy + (radius - 3.5) * Math.sin(a);
    ctx.fillStyle = C.warmOrange;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawDetailedFort(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const grad = ctx.createLinearGradient(-100, 0, 100, 0);
  grad.addColorStop(0, '#FDE047'); // Yellow
  grad.addColorStop(1, '#EC4899'); // Pink

  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Base and battlements
  ctx.beginPath();
  ctx.moveTo(-90, 20);
  ctx.lineTo(-90, -10);
  ctx.lineTo(-70, -10);
  ctx.lineTo(-70, 0);
  ctx.lineTo(-50, 0);
  ctx.lineTo(-50, -15);
  ctx.lineTo(-30, -15);
  ctx.lineTo(-30, 0);
  ctx.lineTo(-10, 0);
  ctx.lineTo(-10, -20);

  // Central tower
  ctx.lineTo(-15, -50);
  ctx.lineTo(-10, -50);
  ctx.lineTo(-10, -60);
  ctx.lineTo(-2, -60);
  // Flag
  ctx.moveTo(-2, -60);
  ctx.lineTo(15, -65);
  ctx.lineTo(-2, -70);
  ctx.moveTo(-2, -60);
  ctx.lineTo(-2, -75);

  // Right side of tower
  ctx.moveTo(-2, -60);
  ctx.lineTo(5, -60);
  ctx.lineTo(5, -50);
  ctx.lineTo(10, -50);
  ctx.lineTo(5, -20);

  // Right battlements
  ctx.lineTo(25, -20);
  ctx.lineTo(25, -5);
  ctx.lineTo(45, -5);
  ctx.lineTo(45, -15);
  ctx.lineTo(65, -15);
  ctx.lineTo(65, -5);
  ctx.lineTo(85, -5);
  ctx.lineTo(85, 20);

  // Bottom line
  ctx.lineTo(-90, 20);

  // Tower windows/details
  ctx.moveTo(-6, -30);
  ctx.arc(-2.5, -30, 3, 0, Math.PI * 2);

  // Archway
  ctx.moveTo(-25, 20);
  ctx.quadraticCurveTo(-2, -5, 20, 20);

  ctx.stroke();

  // Water waves below
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    let y = 25 + i * 5;
    ctx.moveTo(-85, y);
    ctx.quadraticCurveTo(-75, y - 3, -65, y);
    ctx.quadraticCurveTo(-55, y + 3, -45, y);
    ctx.quadraticCurveTo(-35, y - 3, -25, y);
    ctx.quadraticCurveTo(-15, y + 3, -5, y);
    ctx.quadraticCurveTo(5, y - 3, 15, y);
    ctx.quadraticCurveTo(25, y + 3, 35, y);
    ctx.quadraticCurveTo(45, y - 3, 55, y);
    ctx.quadraticCurveTo(65, y + 3, 75, y);
    ctx.quadraticCurveTo(85, y - 3, 95, y);
  }
  ctx.stroke();

  // Left Palm Tree
  ctx.beginPath();
  ctx.moveTo(-110, 20);
  ctx.quadraticCurveTo(-105, -5, -95, -20);
  ctx.moveTo(-95, -20);
  ctx.quadraticCurveTo(-115, -25, -125, -15);
  ctx.moveTo(-95, -20);
  ctx.quadraticCurveTo(-100, -35, -90, -40);
  ctx.moveTo(-95, -20);
  ctx.quadraticCurveTo(-80, -25, -75, -15);
  ctx.stroke();

  // Right Palm Tree
  ctx.beginPath();
  ctx.moveTo(105, 20);
  ctx.quadraticCurveTo(100, -5, 95, -15);
  ctx.moveTo(95, -15);
  ctx.quadraticCurveTo(115, -20, 120, -10);
  ctx.moveTo(95, -15);
  ctx.quadraticCurveTo(100, -30, 90, -35);
  ctx.moveTo(95, -15);
  ctx.quadraticCurveTo(80, -20, 75, -10);
  ctx.stroke();

  // Birds
  ctx.beginPath();
  ctx.moveTo(-60, -40);
  ctx.quadraticCurveTo(-55, -45, -50, -40);
  ctx.quadraticCurveTo(-45, -45, -40, -40);

  ctx.moveTo(40, -50);
  ctx.quadraticCurveTo(45, -55, 50, -50);
  ctx.quadraticCurveTo(55, -55, 60, -50);

  ctx.moveTo(70, -30);
  ctx.quadraticCurveTo(73, -33, 76, -30);
  ctx.quadraticCurveTo(79, -33, 82, -30);
  ctx.stroke();

  ctx.restore();
}

/* ── Info Box Icon Drawing ─────────────────────────────── */
type InfoIconType = 'flight' | 'gate' | 'seat' | 'clock';

function drawInfoIcon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  type: InfoIconType, color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.3;

  switch (type) {
    case 'flight': {
      ctx.font = `${r * 1.3}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✈', cx + 1, cy + 1);
      break;
    }
    case 'gate': {
      const s = r * 0.45;
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.4, s * 0.7, Math.PI, 0);
      ctx.lineTo(cx + s * 0.7, cy + s * 0.6);
      ctx.lineTo(cx - s * 0.7, cy + s * 0.6);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'seat': {
      const s = r * 0.4;
      ctx.strokeRect(cx - s, cy - s * 0.8, s * 2, s * 1.4);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.5, cy + s * 0.6);
      ctx.lineTo(cx - s * 0.5, cy + s);
      ctx.moveTo(cx + s * 0.5, cy + s * 0.6);
      ctx.lineTo(cx + s * 0.5, cy + s);
      ctx.stroke();
      break;
    }
    case 'clock': {
      const s = r * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - s * 0.6);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + s * 0.4, cy + s * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/* ── Info Box ──────────────────────────────────────────── */
function drawInfoBox(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  label: string, value: string, accent: string,
  iconType: InfoIconType, valuePink: boolean = false
) {
  // Background
  ctx.fillStyle = C.dark;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 8);
  ctx.stroke();

  // Icon circle at top
  const icR = 15;
  const icCx = x + w / 2;
  const icCy = y + 24;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(icCx, icCy, icR, 0, Math.PI * 2);
  ctx.stroke();

  drawInfoIcon(ctx, icCx, icCy, icR, iconType, accent);

  // Label
  ctx.fillStyle = C.muted;
  ctx.font = F.bold(11);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  drawSpacedText(ctx, label, icCx - ctx.measureText(label).width / 2 - (label.length * 0.5), y + 44, 1);

  // Value
  ctx.fillStyle = valuePink ? C.pink : C.white;
  ctx.font = F.bold(24);
  ctx.textAlign = 'center';
  ctx.fillText(value, x + w / 2, y + 62);
}

/* ── Tech Pill Tag ─────────────────────────────────────── */
function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, text: string
): number {
  ctx.font = F.med(13);
  const tw = ctx.measureText(text).width;
  const iconSpace = 22;
  const pw = tw + iconSpace + 18;
  const ph = 32;

  roundRect(ctx, x, y, pw, ph, 16);
  ctx.fillStyle = 'rgba(253, 224, 71, 0.06)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.3)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, pw, ph, 16);
  ctx.stroke();

  // Icon circle
  ctx.save();
  ctx.fillStyle = C.gold;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(x + 16, y + ph / 2, 6, 0, Math.PI * 2);
  ctx.fill();
  // Inner dot
  ctx.fillStyle = C.card;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(x + 16, y + ph / 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = C.yellow;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + iconSpace + 6, y + ph / 2 + 1);

  return pw + 8;
}

/* ── Stub Info Line with Icon ──────────────────────────── */
type StubIcon = 'doc' | 'team' | 'cal' | 'tag' | 'star';

function drawStubInfoLine(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  label: string, value: string, iconType: StubIcon, isTeam = false
) {
  const iconSize = 34;
  const icCx = x + iconSize / 2;
  const icCy = y + iconSize / 2;

  // Dark square
  ctx.fillStyle = '#111114';
  if (iconType === 'star') {
    ctx.strokeStyle = C.yellow;
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, iconSize, iconSize, 8);
    ctx.fill();
    ctx.stroke();
  } else {
    roundRect(ctx, x, y, iconSize, iconSize, 8);
    ctx.fill();
  }

  // Draw icon shape
  ctx.save();
  ctx.strokeStyle = '#D1D5DB';
  ctx.fillStyle = '#D1D5DB';
  ctx.lineWidth = 1.2;
  const s = iconSize * 0.22;

  switch (iconType) {
    case 'doc':
      ctx.strokeRect(icCx - s * 0.7, icCy - s * 1.1, s * 1.4, s * 2.1);
      ctx.beginPath();
      ctx.moveTo(icCx - s * 0.3, icCy - s * 0.3);
      ctx.lineTo(icCx + s * 0.3, icCy - s * 0.3);
      ctx.moveTo(icCx - s * 0.3, icCy + s * 0.2);
      ctx.lineTo(icCx + s * 0.3, icCy + s * 0.2);
      ctx.stroke();
      break;
    case 'team':
      ctx.beginPath();
      ctx.arc(icCx, icCy - s * 0.5, s * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(icCx - s * 0.8, icCy + s * 0.7);
      ctx.quadraticCurveTo(icCx, icCy + s * 0.05, icCx + s * 0.8, icCy + s * 0.7);
      ctx.stroke();
      break;
    case 'cal':
      ctx.strokeRect(icCx - s * 0.8, icCy - s * 0.5, s * 1.6, s * 1.6);
      ctx.beginPath();
      ctx.moveTo(icCx - s * 0.35, icCy - s * 0.5 - s * 0.35);
      ctx.lineTo(icCx - s * 0.35, icCy - s * 0.5 + s * 0.25);
      ctx.moveTo(icCx + s * 0.35, icCy - s * 0.5 - s * 0.35);
      ctx.lineTo(icCx + s * 0.35, icCy - s * 0.5 + s * 0.25);
      ctx.moveTo(icCx - s * 0.8, icCy + s * 0.1);
      ctx.lineTo(icCx + s * 0.8, icCy + s * 0.1);
      ctx.stroke();
      break;
    case 'tag':
      ctx.beginPath();
      ctx.moveTo(icCx - s * 0.7, icCy - s * 0.5);
      ctx.lineTo(icCx + s * 0.3, icCy - s * 0.5);
      ctx.lineTo(icCx + s * 0.8, icCy);
      ctx.lineTo(icCx + s * 0.3, icCy + s * 0.5);
      ctx.lineTo(icCx - s * 0.7, icCy + s * 0.5);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(icCx - s * 0.15, icCy, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'star':
      ctx.strokeStyle = C.yellow;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a1 = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const a2 = ((i + 0.5) * 2 * Math.PI) / 5 - Math.PI / 2;
        const r1 = s * 1.2;
        const r2 = s * 0.5;
        if (i === 0) ctx.moveTo(icCx + r1 * Math.cos(a1), icCy + r1 * Math.sin(a1));
        else ctx.lineTo(icCx + r1 * Math.cos(a1), icCy + r1 * Math.sin(a1));
        ctx.lineTo(icCx + r2 * Math.cos(a2), icCy + r2 * Math.sin(a2));
      }
      ctx.closePath();
      ctx.stroke();
      break;
  }
  ctx.restore();

  // Label
  const textX = x + iconSize + 16;
  ctx.fillStyle = C.pink;
  ctx.font = F.bold(12);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, textX, y + 2);

  // Value
  ctx.fillStyle = isTeam ? C.yellow : C.white;
  ctx.font = F.bold(22);
  ctx.fillText(value, textX, y + 18);
}

/* ═══════════════════════════════════════════════════════════
   MAIN RENDER FUNCTION
   ═══════════════════════════════════════════════════════════ */

export async function renderFrame(
  sourceImage: HTMLImageElement,
  options: RenderOptions = {}
): Promise<Blob> {
  const W = options.width || 1800;
  const H = options.height || 1000;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');

  /* ── Generate QR Code ─────────────────────────────────── */
  let qrImg: HTMLImageElement | null = null;
  try {
    const qrDataUrl = await QRCode.toDataURL('HHGOA26-PASS-' + Date.now(), {
      width: 150,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });
    qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = qrDataUrl;
    });
  } catch { /* QR fallback - skip */ }

  /* ── Load Background Image ────────────────────────────── */
  let bgImg: HTMLImageElement | null = null;
  try {
    bgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = '/icon1.png'; // Load from public directory
    });
  } catch (err) {
    console.warn('Failed to load /icon1.png', err);
  }

  let worldBgImg: HTMLImageElement | null = null;
  try {
    worldBgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = '/world.png';
    });
  } catch (err) {
    console.warn('Failed to load /world.png', err);
  }

  let iconImg: HTMLImageElement | null = null;
  try {
    iconImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = '/icon.png';
    });
  } catch (err) {
    console.warn('Failed to load /icon.png', err);
  }

  /* ── Layout Constants ─────────────────────────────────── */
  const PAD = 36;
  const CARD_R = 16;
  const cardX = PAD, cardY = PAD;
  const cardW = W - PAD * 2, cardH = H - PAD * 2;

  const LEFT_W = 490;
  const STUB_W = 420;
  const SEP_X = cardX + cardW - STUB_W;
  const CENTER_X = cardX + LEFT_W + 15;
  const CENTER_W = SEP_X - CENTER_X - 15;

  const TOP_H = 100;
  const BOT_H = 58;
  const CONTENT_Y = cardY + TOP_H;
  const BOT_Y = cardY + cardH - BOT_H;

  /* ═══ 1. BACKGROUND ═══════════════════════════════════ */
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  /* ═══ 2. CARD + INNER DECORATIONS ═════════════════════ */
  roundRect(ctx, cardX, cardY, cardW, cardH, CARD_R);
  ctx.fillStyle = C.card;
  ctx.fill();

  ctx.save();
  // Clip to the left part of the card (before the stub separator)
  ctx.beginPath();
  ctx.rect(cardX, cardY, SEP_X - cardX, cardH);
  ctx.clip();
  // Also ensure we respect the card's rounded corners
  roundRect(ctx, cardX, cardY, cardW, cardH, CARD_R);
  ctx.clip();
  
  if (worldBgImg) {
    ctx.globalAlpha = 0.2;
    const scale = Math.max(cardW / worldBgImg.width, cardH / worldBgImg.height);
    const wW = worldBgImg.width * scale;
    const wH = worldBgImg.height * scale;
    ctx.drawImage(worldBgImg, cardX + (cardW - wW) / 2, cardY + (cardH - wH) / 2, wW, wH);
    ctx.globalAlpha = 1.0;
  } else {
    drawWorldMapDots(ctx, CENTER_X - 60, cardY + 20, CENTER_W + 120, 350);
  }
  
  drawGrid(ctx, cardX, cardY, cardW, cardH);
  drawTopoLines(ctx, CENTER_X + CENTER_W / 2, CONTENT_Y + 180, 9);
  ctx.restore();

  /* ═══ 3. CARD BORDER (gold glow) ══════════════════════ */
  ctx.save();
  ctx.shadowColor = C.gold;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 1.8;
  roundRect(ctx, cardX, cardY, cardW, cardH, CARD_R);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Inner subtle border
  ctx.strokeStyle = 'rgba(212, 168, 67, 0.12)';
  ctx.lineWidth = 0.5;
  roundRect(ctx, cardX + 4, cardY + 4, cardW - 8, cardH - 8, CARD_R - 2);
  ctx.stroke();

  /* ═══ 4. CORNER BRACKETS ══════════════════════════════ */
  drawCornerBrackets(ctx, cardX + 12, cardY + 12, cardW - 24, cardH - 24, 22);

  /* ═══ 5. DIAGONAL STRIPES + CHEVRONS ══════════════════ */
  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, CARD_R);
  ctx.clip();
  drawDiagonalStripes(ctx, cardX, cardY, 140);
  ctx.restore();

  // Chevrons below stripes
  drawChevrons(ctx, cardX + 25, cardY + 155, 4, 9);

  /* ═══ 6. HEADER ═══════════════════════════════════════ */
  // Tagline: "LESS NOISE." (white) + "MORE SIGNAL." (pink)
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = F.med(15);
  ctx.fillStyle = C.white;
  const lessNoise = 'LESS NOISE. ';
  ctx.fillText(lessNoise, cardX + 150, cardY + 20);
  const lnW = ctx.measureText(lessNoise).width;
  ctx.fillStyle = C.pink;
  ctx.fillText('MORE SIGNAL.', cardX + 150 + lnW, cardY + 20);

  // Title: "HH GOA" (white) + "'26" (pink)
  ctx.font = F.bold(54);
  ctx.fillStyle = C.white;
  const hhgoa = "HH GOA ";
  ctx.fillText(hhgoa, cardX + 148, cardY + 40);
  const hhW = ctx.measureText(hhgoa).width;
  ctx.fillStyle = C.pink;
  ctx.fillText("'26", cardX + 148 + hhW, cardY + 40);
  const fullTitleEndX = cardX + 148 + hhW + ctx.measureText("'26").width;

  // Three dots after title
  ctx.fillStyle = C.yellow;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(fullTitleEndX + 20 + i * 12, cardY + 67, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // BOARDING PASS badge (green)
  const bpText = 'BOARDING PASS  ✈';
  ctx.font = F.bold(14);
  const bpTW = ctx.measureText(bpText).width;
  const bpW = bpTW + 28;
  const bpH = 34;
  const bpX = SEP_X - bpW - 15;
  const bpY = cardY + 30;
  roundRect(ctx, bpX, bpY, bpW, bpH, 8);
  ctx.fillStyle = C.green;
  ctx.fill();
  ctx.fillStyle = C.white;
  ctx.font = F.bold(14);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(bpText, bpX + bpW / 2, bpY + bpH / 2);

  // Header separator line
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 25, cardY + TOP_H);
  ctx.lineTo(SEP_X - 10, cardY + TOP_H);
  ctx.stroke();

  /* ═══ 7. PHOTO SECTION (Left) ═════════════════════════ */
  const photoX = cardX + 85;
  const photoY = CONTENT_Y + 30;
  const photoW = 400;
  const photoH = 600;
  const photoCut = 42;
  const photoCX = photoX + photoW / 2;
  const photoCY = photoY + photoH / 2;

  // "BUILDER CLASS" vertical text (large)
  ctx.save();
  ctx.fillStyle = C.yellow;
  ctx.font = F.bold(22);
  ctx.globalAlpha = 0.9;
  drawVerticalText(ctx, 'BUILDER CLASS', cardX + 30, photoY + photoH - 5, 4);
  ctx.restore();

  // Chevrons below BUILDER CLASS
  ctx.save();
  ctx.translate(cardX + 38, photoY + photoH + 20);
  ctx.rotate(-Math.PI / 2);
  drawChevrons(ctx, 0, 0, 3, 7);
  ctx.restore();

  // Small label above photo
  ctx.fillStyle = C.muted;
  ctx.font = F.reg(9);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('ATTENDEE // PORTRAIT', photoX, photoY - 7);

  // Octagonal photo
  ctx.save();
  octagonPath(ctx, photoCX, photoCY, photoW, photoH, photoCut);
  ctx.clip();

  // Fill plain white background behind the transparent photo
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  const crop = calculateCoverCrop(
    sourceImage.width, sourceImage.height,
    photoW, photoH
  );
  ctx.drawImage(
    sourceImage,
    crop.sx, crop.sy, crop.sWidth, crop.sHeight,
    photoX, photoY, photoW, photoH
  );

  // Dark gradient at bottom of photo
  const grad = ctx.createLinearGradient(photoX, photoY + photoH - 100, photoX, photoY + photoH);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(photoX, photoY + photoH - 100, photoW, 100);
  ctx.restore();

  // Photo octagonal border
  ctx.save();
  octagonPath(ctx, photoCX, photoCY, photoW, photoH, photoCut);
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // "HHGOA • 2:47PM STUDIO" along right edge of photo
  ctx.save();
  ctx.fillStyle = C.dim;
  ctx.font = F.reg(9);
  ctx.globalAlpha = 0.6;
  ctx.translate(photoX + photoW + 14, photoY + photoH - 15);
  ctx.rotate(-Math.PI / 2);
  drawSpacedText(ctx, 'HHGOA • 2:47PM STUDIO', 0, 0, 1.5);
  ctx.restore();

  // ADMITTED stamp (large, overlapping bottom-right of photo)
  drawStamp(ctx, photoX + photoW - 45, photoY + photoH - 50, 52);

  /* ═══ 8. BELOW PHOTO AREA ════════════════════════════ */
  ctx.fillStyle = C.dim;
  ctx.font = F.reg(10);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('28–31 OCT 2026 · DONA PAULA, GOA', photoCX, photoY + photoH + 18);

  drawChevrons(ctx, photoCX - 22, photoY + photoH + 42, 5, 8);

  /* ═══ 9. FLIGHT ROUTE (Center) ════════════════════════ */
  const routeY = CONTENT_Y + 50;

  // "ORIGIN" label
  ctx.fillStyle = C.muted;
  ctx.font = F.reg(12);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  drawSpacedText(ctx, 'ORIGIN', CENTER_X, routeY, 2);

  // "VTZ" large
  const originText = (options.origin || 'VTZ').toUpperCase();
  ctx.fillStyle = C.white;
  ctx.font = F.bold(50);
  ctx.textAlign = 'left';
  ctx.fillText(originText, CENTER_X, routeY + 18);

  // Small subtitle (could be based on origin, but let's leave it empty or generic for now, or just use "Location")
  ctx.fillStyle = C.muted;
  ctx.font = F.reg(13);
  ctx.fillText('Location', CENTER_X, routeY + 74);

  // "DESTINATION" label
  ctx.textAlign = 'right';
  ctx.fillStyle = C.muted;
  ctx.font = F.reg(12);
  drawSpacedText(ctx, 'DESTINATION', CENTER_X + CENTER_W - ctx.measureText('DESTINATION').width - 8, routeY, 2);

  // "GOI" large (yellow)
  ctx.fillStyle = C.yellow;
  ctx.font = F.bold(50);
  ctx.textAlign = 'right';
  ctx.fillText('GOI', CENTER_X + CENTER_W, routeY + 18);

  // "Goa, India" small
  ctx.fillStyle = C.muted;
  ctx.font = F.reg(13);
  ctx.fillText('Goa, India', CENTER_X + CENTER_W, routeY + 74);

  // Dotted flight path
  const pathY = routeY + 48;
  const pathStartX = CENTER_X + 100;
  const pathEndX = CENTER_X + CENTER_W - 90;
  const midX = (pathStartX + pathEndX) / 2;
  const archControlY = pathY - 70;

  ctx.save();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 8]);
  ctx.beginPath();
  ctx.moveTo(pathStartX, pathY);
  ctx.quadraticCurveTo(midX, archControlY, pathEndX, pathY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Endpoint dots
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.arc(pathStartX, pathY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.yellow;
  ctx.beginPath();
  ctx.arc(pathEndX, pathY, 4, 0, Math.PI * 2);
  ctx.fill();

  // Airplane on path
  drawAirplane(ctx, midX, (pathY + archControlY) / 2, 16);

  /* ═══ 10. PASSENGER INFO ══════════════════════════════ */
  const passengerY = routeY + 150;

  // Separator
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(CENTER_X, passengerY);
  ctx.lineTo(CENTER_X + CENTER_W, passengerY);
  ctx.stroke();

  // "PASSENGER" label
  ctx.fillStyle = C.muted;
  ctx.font = F.reg(14);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  drawSpacedText(ctx, 'PASSENGER', CENTER_X, passengerY + 10, 2);

  // "JITHEENDER MANAPURAM" large
  const passengerName = (options.name || 'JITHEENDER MANAPURAM').toUpperCase();
  ctx.fillStyle = C.white;
  ctx.font = F.bold(42);
  ctx.fillText(passengerName, CENTER_X, passengerY + 36);

  // Subtitle
  ctx.fillStyle = C.pink;
  ctx.font = F.italic(20);
  ctx.fillText('Animation Virtuoso', CENTER_X, passengerY + 84);

  /* ═══ 11. INFO BOXES ══════════════════════════════════ */
  const infoY = passengerY + 140;
  const boxGap = 14;
  const boxW = (CENTER_W - boxGap * 3) / 4;
  const boxH = 92;

  drawInfoBox(ctx, CENTER_X, infoY, boxW, boxH, 'FLIGHT', 'HH 247', C.yellow, 'flight');
  drawInfoBox(ctx, CENTER_X + boxW + boxGap, infoY, boxW, boxH, 'GATE', 'B2', C.orange, 'gate');
  drawInfoBox(ctx, CENTER_X + (boxW + boxGap) * 2, infoY, boxW, boxH, 'SEAT', '34D', C.pink, 'seat');
  drawInfoBox(ctx, CENTER_X + (boxW + boxGap) * 3, infoY, boxW, boxH, 'BOARDING', '14:47', C.gold, 'clock', true);

  /* ═══ 12. TAGLINE ═════════════════════════════════════ */
  const taglineY = infoY + boxH + 60;

  // "CARRY THE CODE." in muted
  ctx.font = F.italic(14);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = C.muted;
  const carryText = 'CARRY THE CODE. ';
  ctx.fillText(carryText, CENTER_X, taglineY);
  const carryW = ctx.measureText(carryText).width;

  // "BUILD THE FUTURE." in white + underline
  ctx.fillStyle = C.white;
  ctx.font = F.bold(14);
  const buildText = 'BUILD THE FUTURE.';
  ctx.fillText(buildText, CENTER_X + carryW, taglineY);
  const buildW = ctx.measureText(buildText).width;

  // Underline
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(CENTER_X + carryW, taglineY + 18);
  ctx.lineTo(CENTER_X + carryW + buildW, taglineY + 18);
  ctx.stroke();

  /* ═══ 13. TECH TAGS ═══════════════════════════════════ */
  const tagsY = taglineY + 45;
  const tags = ['DEVELOPER', 'NEXT.JS', 'UI/UX', 'RESPONSIVE DESIGN'];
  let tagX = CENTER_X;
  for (const tag of tags) {
    const w = drawPill(ctx, tagX, tagsY, tag);
    tagX += w;
    if (tagX > CENTER_X + CENTER_W - 60) break;
  }

  /* ═══ 14. STUB SEPARATOR ══════════════════════════════ */
  drawStubSeparator(ctx, SEP_X, cardY, cardY + cardH, 15);

  /* ═══ 15. RIGHT STUB ══════════════════════════════════ */
  const stubX = SEP_X + 22;
  const stubW = STUB_W - 44;
  let stubY = cardY + 40;

  // Top stars
  const starColors = ['#FDE047', '#EC4899', '#EC4899', '#EC4899'];
  const starSpacing = stubW / 5;
  for (let i = 0; i < 4; i++) {
    const sx = stubX + starSpacing * (i + 1);
    const sy = stubY - 20;
    ctx.save();
    ctx.fillStyle = starColors[i];
    ctx.shadowColor = starColors[i];
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 6);
    ctx.quadraticCurveTo(sx, sy, sx + 6, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy + 6);
    ctx.quadraticCurveTo(sx, sy, sx - 6, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy - 6);
    ctx.fill();
    ctx.restore();
  }

  // QR Code + Mini Portrait row
  const qrSize = 145;
  const qrX = stubX + 8;
  const miniPortW = 125;
  const miniPortH = 145;
  const miniPortX = stubX + stubW - miniPortW - 5;
  const miniPortY = stubY;

  if (qrImg) {
    // QR Code (White rounded bg)
    ctx.save();
    roundRect(ctx, qrX, stubY, qrSize, qrSize, 12);
    ctx.clip();
    ctx.drawImage(qrImg, qrX, stubY, qrSize, qrSize);
    ctx.restore();
  }

  // Mini portrait (Grayscale, gradient border)
  ctx.save();
  roundRect(ctx, miniPortX, miniPortY, miniPortW, miniPortH, 12);
  ctx.clip();

  // Fill plain white background behind the transparent mini portrait
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  const miniCrop = calculateCoverCrop(
    sourceImage.width, sourceImage.height,
    miniPortW, miniPortH
  );
  // Grayscale filter
  ctx.filter = 'grayscale(100%)';
  ctx.drawImage(
    sourceImage,
    miniCrop.sx, miniCrop.sy, miniCrop.sWidth, miniCrop.sHeight,
    miniPortX, miniPortY, miniPortW, miniPortH
  );
  ctx.restore();

  // Mini portrait gradient border
  const portGrad = ctx.createLinearGradient(miniPortX, miniPortY, miniPortX + miniPortW, miniPortY + miniPortH);
  portGrad.addColorStop(0, '#F59E0B');
  portGrad.addColorStop(1, '#EC4899');
  ctx.strokeStyle = portGrad;
  ctx.lineWidth = 2;
  roundRect(ctx, miniPortX, miniPortY, miniPortW, miniPortH, 12);
  ctx.stroke();

  stubY += Math.max(qrSize, miniPortH) + 30;

  // "HH GOA '26" centered text
  ctx.fillStyle = C.white;
  ctx.font = F.bold(14);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText("HH GOA '26", stubX + stubW / 2, stubY);
  stubY += 40;

  // Separator function for dotted gradient lines
  const drawDottedSep = (y: number) => {
    ctx.save();
    const sepGrad = ctx.createLinearGradient(stubX, 0, stubX + stubW, 0);
    sepGrad.addColorStop(0, 'rgba(236, 72, 153, 0.1)');
    sepGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.4)');
    sepGrad.addColorStop(1, 'rgba(236, 72, 153, 0.1)');
    ctx.strokeStyle = sepGrad;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(stubX, y);
    ctx.lineTo(stubX + stubW, y);
    ctx.stroke();
    ctx.restore();
  };

  // Stub info lines with icons
  drawStubInfoLine(ctx, stubX, stubY, 'PASS NO.', '247-24JS', 'doc');
  stubY += 45;
  drawDottedSep(stubY);
  stubY += 15;
  const teamName = (options.team || 'VERNA VISIONARIES').toUpperCase();
  drawStubInfoLine(ctx, stubX, stubY, 'TEAM', teamName, 'team', true);
  stubY += 45;
  drawDottedSep(stubY);
  stubY += 15;
  drawStubInfoLine(ctx, stubX, stubY, 'RESIDENCY', '28-31 OCT 2026', 'cal');
  stubY += 45;
  drawDottedSep(stubY);
  stubY += 15;
  drawStubInfoLine(ctx, stubX, stubY, 'EDITION', '052 / 247', 'star');
  stubY += 55;

  // Fort illustration (from icon1.png)
  const fortCenterX = stubX + stubW / 2;
  const barcodeY = BOT_Y - 70; // Give more room for the thick barcode and coordinates
  const fortAvailableH = barcodeY - stubY - 20;

  if (bgImg) {
    let drawW = bgImg.width;
    let drawH = bgImg.height;
    const iconMaxW = stubW - 20;
    const iconMaxH = fortAvailableH;

    if (drawW > iconMaxW) {
      drawH = drawH * (iconMaxW / drawW);
      drawW = iconMaxW;
    }
    if (drawH > iconMaxH) {
      drawW = drawW * (iconMaxH / drawH);
      drawH = iconMaxH;
    }

    const imgX = fortCenterX - drawW / 2;
    const imgY = stubY + fortAvailableH / 2 - drawH / 2;
    ctx.drawImage(bgImg, imgX, imgY, drawW, drawH);
  } else {
    const fortCY = stubY + fortAvailableH / 2;
    drawDetailedFort(ctx, fortCenterX, fortCY, 1.4);
  }

  // Thick Barcode at bottom of stub
  ctx.save();
  const bcGrad = ctx.createLinearGradient(stubX + 15, 0, stubX + stubW - 15, 0);
  bcGrad.addColorStop(0, '#FDE047');
  bcGrad.addColorStop(1, '#EC4899');
  ctx.strokeStyle = bcGrad;
  ctx.restore();
  drawGradientBarcode(ctx, stubX + 15, barcodeY, stubW - 30, 48, bcGrad);

  // Barcode label (Coordinates) moved under barcode
  ctx.fillStyle = C.muted;
  ctx.font = F.reg(10);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const stubCoordText = '15.4909° N, 73.8278° E   |   UTC +5:30';
  ctx.fillText(stubCoordText, stubX + stubW / 2, barcodeY + 60);

  /* ═══ 16. BOTTOM BAR ══════════════════════════════════ */
  // Separator
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 20, BOT_Y);
  ctx.lineTo(SEP_X - 10, BOT_Y);
  ctx.stroke();

  const footY = BOT_Y + 20;

  // Globe icon + HHGOA.COM
  const globeCx = cardX + 44;
  ctx.strokeStyle = C.muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(globeCx, footY, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(globeCx - 8, footY);
  ctx.lineTo(globeCx + 8, footY);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(globeCx, footY, 3.5, 8, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = C.muted;
  ctx.font = F.med(13);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('HHGOA.COM', globeCx + 14, footY);

  // Clock icon + 2:47PM STUDIO
  const clockCx = cardX + 195;
  ctx.strokeStyle = C.muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(clockCx, footY, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(clockCx, footY);
  ctx.lineTo(clockCx, footY - 5);
  ctx.moveTo(clockCx, footY);
  ctx.lineTo(clockCx + 4, footY + 1);
  ctx.stroke();

  ctx.fillStyle = C.muted;
  ctx.font = F.reg(13);
  ctx.fillText('2:47PM STUDIO', clockCx + 14, footY);

  // "247" circular badge
  const badgeCx = cardX + 380;
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(badgeCx, footY, 22, 0, Math.PI * 2);
  ctx.stroke();
  // Inner ring
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(badgeCx, footY, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = C.gold;
  ctx.font = F.boldItalic(18);
  ctx.textAlign = 'center';
  ctx.fillText('247', badgeCx, footY);

  // Chevrons after badge
  drawChevrons(ctx, badgeCx + 32, footY, 4, 9);

  // #FrameInGoa (yellow, centered)
  ctx.fillStyle = C.yellow;
  ctx.font = F.bold(16);
  ctx.textAlign = 'center';
  ctx.fillText('#FrameInGoa', CENTER_X + CENTER_W / 2 + 40, footY);

  if (iconImg) {
    const iconH = 34;
    const iconW = iconImg.width * (iconH / iconImg.height);
    // Draw on the right side of the bottom bar before the stub separator
    ctx.drawImage(iconImg, SEP_X - iconW - 30, footY - iconH / 2, iconW, iconH);
  }

  /* ═══ 17. SCANNER LINE EFFECT ═════════════════════════ */
  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, CARD_R);
  ctx.clip();
  const scanGrad = ctx.createLinearGradient(
    cardX, cardY + cardH * 0.35,
    cardX, cardY + cardH * 0.38
  );
  scanGrad.addColorStop(0, 'rgba(253, 224, 71, 0)');
  scanGrad.addColorStop(0.5, 'rgba(253, 224, 71, 0.025)');
  scanGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(cardX, cardY, cardW, cardH);
  ctx.restore();

  /* ═══ EXPORT ══════════════════════════════════════════ */
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png', 1.0);
  });
}
