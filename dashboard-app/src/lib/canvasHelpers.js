import fileSaver from 'file-saver';
import logoImg from '../assets/logo.png';

export const saveAs = fileSaver.saveAs || fileSaver;

/**
 * Safely load an HTMLImageElement
 */
export function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Sanitize string for clean filenames
 */
export function sanitizeFilename(str) {
  return (str || 'table')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Format 16-char hex qrToken into 4-char chunks
 */
export function formatTableCode(token) {
  if (!token) return 'TABLE-CODE';
  const clean = token.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const chunks = clean.match(/.{1,4}/g);
  return chunks ? chunks.join('-') : clean;
}

/**
 * Draw a high-contrast Pill Badge
 */
export function drawPillBadge(ctx, {
  x,
  y,
  width,
  height,
  radius = height / 2,
  bgColor = '#1B382B',
  borderColor = null,
  borderWidth = 1,
  text = 'Table 1',
  textColor = '#FFFFFF',
  font = '700 44px "Playfair Display", Georgia, serif',
  shadow = true,
}) {
  ctx.save();
  if (shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
  }

  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = bgColor;
  ctx.fill();

  if (borderColor) {
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
  }

  ctx.restore();

  // Draw text
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.font = font;
  ctx.fillText(text, x + width / 2, y + height / 2 + 1);
  ctx.restore();
}

/**
 * Vector Icon: Smartphone
 */
export function drawPhoneIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const w = size * 0.55;
  const h = size * 0.88;
  const r = size * 0.12;
  const x = cx - w / 2;
  const y = cy - h / 2;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();

  // Top speaker notch
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.1, y + size * 0.1);
  ctx.lineTo(cx + size * 0.1, y + size * 0.1);
  ctx.stroke();

  // Bottom button dot
  ctx.beginPath();
  ctx.arc(cx, y + h - size * 0.12, size * 0.04, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();
}

/**
 * Vector Icon: Menu / List
 */
export function drawMenuIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const w = size * 0.65;
  const h = size * 0.85;
  const r = size * 0.1;
  const x = cx - w / 2;
  const y = cy - h / 2;

  // Book / document border
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();

  // 3 Horizontal lines
  const lineInset = size * 0.14;
  const lineStartX = x + lineInset;
  const lineEndX = x + w - lineInset;
  const lineY1 = cy - size * 0.14;
  const lineY2 = cy;
  const lineY3 = cy + size * 0.14;

  ctx.beginPath();
  ctx.moveTo(lineStartX, lineY1);
  ctx.lineTo(lineEndX, lineY1);
  ctx.moveTo(lineStartX, lineY2);
  ctx.lineTo(lineEndX, lineY2);
  ctx.moveTo(lineStartX, lineY3);
  ctx.lineTo(lineEndX, lineY3);
  ctx.stroke();

  ctx.restore();
}

/**
 * Vector Icon: Cloche / Dish
 */
export function drawClocheIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const baseW = size * 0.75;
  const baseY = cy + size * 0.22;

  // Base tray line
  ctx.beginPath();
  ctx.moveTo(cx - baseW / 2, baseY);
  ctx.lineTo(cx + baseW / 2, baseY);
  ctx.stroke();

  // Dome dome arc
  const domeRadius = size * 0.32;
  ctx.beginPath();
  ctx.arc(cx, baseY, domeRadius, Math.PI, 0);
  ctx.stroke();

  // Top knob
  ctx.beginPath();
  ctx.arc(cx, baseY - domeRadius - size * 0.07, size * 0.06, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Vector Icon: Shopping Cart (for GreenMart)
 */
export function drawCartIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const startX = cx - size * 0.35;
  const startY = cy - size * 0.25;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(startX + size * 0.12, startY);
  ctx.lineTo(startX + size * 0.25, cy + size * 0.12);
  ctx.lineTo(cx + size * 0.28, cy + size * 0.12);
  ctx.lineTo(cx + size * 0.35, startY + size * 0.05);
  ctx.lineTo(startX + size * 0.16, startY + size * 0.05);
  ctx.stroke();

  // Wheels
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(startX + size * 0.28, cy + size * 0.24, size * 0.06, 0, Math.PI * 2);
  ctx.arc(cx + size * 0.24, cy + size * 0.24, size * 0.06, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 3-Step Instruction Flow Node Row
 * Renders: (Phone) Scan  >  (Menu) View Menu  >  (Order) Order
 */
export function drawStepFlowNodes(ctx, {
  cx,
  cy,
  color = '#1B382B',
  textColor = '#4F5D55',
  circleRadius = 38,
  spacing = 220,
  orderIconType = 'cloche',
  labels = ['Scan', 'View Menu', 'Order'],
}) {
  const nodeCount = 3;
  const startX = cx - ((nodeCount - 1) * spacing) / 2;

  const icons = [
    (x, y) => drawPhoneIcon(ctx, x, y, circleRadius * 1.05, color),
    (x, y) => drawMenuIcon(ctx, x, y, circleRadius * 1.05, color),
    (x, y) => {
      if (orderIconType === 'cart') {
        drawCartIcon(ctx, x, y, circleRadius * 1.05, color);
      } else {
        drawClocheIcon(ctx, x, y, circleRadius * 1.05, color);
      }
    },
  ];

  for (let i = 0; i < nodeCount; i++) {
    const nx = startX + i * spacing;
    const ny = cy;

    // Outer Circle
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(nx, ny, circleRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Draw the icon
    icons[i](nx, ny);

    // Label below
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = textColor;
    ctx.font = '600 20px "Space Grotesk", Inter, sans-serif';
    ctx.fillText(labels[i], nx, ny + circleRadius + 14);
    ctx.restore();

    // Draw connecting arrow '>' between circles
    if (i < nodeCount - 1) {
      const arrowX = nx + spacing / 2;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(arrowX - 7, ny - 9);
      ctx.lineTo(arrowX + 4, ny);
      ctx.lineTo(arrowX - 7, ny + 9);
      ctx.stroke();
      ctx.restore();
    }
  }
}

/**
 * Botanical Leaf Sprig helper (for natural garden & cafe stationery)
 */
export function drawBotanicalSprig(ctx, x, y, scale = 1, rotation = 0, color = 'rgba(27, 56, 43, 0.35)') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Central curved stem
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(40, 20, 90, 70, 130, 140);
  ctx.stroke();

  const drawLeaf = (startX, startY, tipX, tipY, ctrlW, leafScale = 1) => {
    ctx.save();
    ctx.beginPath();
    const dx = tipX - startX;
    const dy = tipY - startY;
    const perpX = -dy * 0.35 * leafScale;
    const perpY = dx * 0.35 * leafScale;

    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(
      startX + dx * 0.4 + perpX,
      startY + dy * 0.4 + perpY,
      startX + dx * 0.8 + perpX * 0.5,
      startY + dy * 0.8 + perpY * 0.5,
      tipX,
      tipY
    );
    ctx.bezierCurveTo(
      startX + dx * 0.8 - perpX * 0.5,
      startY + dy * 0.8 - perpY * 0.5,
      startX + dx * 0.4 - perpX,
      startY + dy * 0.4 - perpY,
      startX,
      startY
    );
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.stroke();

    // Center vein
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + dx * 0.88, startY + dy * 0.88);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  };

  drawLeaf(15, 8, 55, -8, 20, 0.9);
  drawLeaf(32, 22, -8, 48, 22, 0.95);
  drawLeaf(58, 44, 108, 32, 24, 1.05);
  drawLeaf(76, 68, 38, 105, 24, 1.1);
  drawLeaf(104, 102, 160, 96, 26, 1.15);
  drawLeaf(116, 122, 85, 168, 24, 1.0);
  drawLeaf(130, 140, 175, 185, 22, 0.85);

  ctx.restore();
}

/**
 * Steaming Coffee Cup Vector Logo (Default emblem for cafe)
 */
export function drawCoffeeCupEmblem(ctx, cx, cy, size = 110, color = '#1B382B') {
  ctx.save();
  ctx.translate(cx, cy);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.07;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cupW = size * 0.65;
  const cupH = size * 0.48;

  // Cup body: rounded bottom bowl
  ctx.beginPath();
  ctx.moveTo(-cupW / 2, -cupH * 0.2);
  ctx.lineTo(cupW / 2, -cupH * 0.2);
  ctx.bezierCurveTo(
    cupW / 2, cupH * 0.7,
    -cupW / 2, cupH * 0.7,
    -cupW / 2, -cupH * 0.2
  );
  ctx.closePath();
  ctx.stroke();

  // Cup handle
  ctx.beginPath();
  ctx.arc(cupW / 2 + size * 0.08, cupH * 0.15, size * 0.16, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  // Saucer
  const saucerW = size * 0.85;
  const saucerY = cupH * 0.58;
  ctx.beginPath();
  ctx.moveTo(-saucerW / 2, saucerY);
  ctx.lineTo(saucerW / 2, saucerY);
  ctx.stroke();

  // Steam swirls rising
  const drawSteam = (sx, sy, h) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(sx + 8, sy - h * 0.5, sx - 8, sy - h * 0.8, sx + 2, sy - h);
    ctx.lineWidth = size * 0.055;
    ctx.stroke();
  };

  drawSteam(-size * 0.14, -cupH * 0.32, size * 0.32);
  drawSteam(0, -cupH * 0.36, size * 0.4);
  drawSteam(size * 0.14, -cupH * 0.32, size * 0.32);

  // Left leaf flourish
  ctx.beginPath();
  ctx.moveTo(-cupW / 2 - 8, cupH * 0.1);
  ctx.bezierCurveTo(-cupW / 2 - 28, -cupH * 0.1, -cupW / 2 - 34, cupH * 0.3, -cupW / 2 - 8, cupH * 0.1);
  ctx.globalAlpha = 0.8;
  ctx.fill();

  ctx.restore();
}

/**
 * Standard High-Visibility "Powered by LayoScan" Footer Badge
 */
export async function drawLayoScanFooter(ctx, {
  cx,
  cy,
  badgeW = 390,
  badgeH = 58,
  markLogo = null,
  theme = 'light', // 'light' | 'dark'
  accentColor = '#1B382B',
}) {
  ctx.save();
  const radius = badgeH / 2;
  const x = cx - badgeW / 2;
  const y = cy - badgeH / 2;

  // Badge pill container
  ctx.beginPath();
  ctx.roundRect(x, y, badgeW, badgeH, radius);

  if (theme === 'dark') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  }
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();

  // Content inside badge
  const loadedMark = markLogo || (await loadImage(logoImg));
  const markSize = 32;
  const textStr = 'Powered by LayoScan';

  ctx.save();
  ctx.font = '700 22px "Space Grotesk", Inter, sans-serif';
  const textWidth = ctx.measureText(textStr).width;
  const totalW = (loadedMark ? markSize + 12 : 0) + textWidth;
  const startX = cx - totalW / 2;

  if (loadedMark) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(startX, cy - markSize / 2, markSize, markSize, 7);
    ctx.clip();
    ctx.drawImage(loadedMark, startX, cy - markSize / 2, markSize, markSize);
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme === 'dark' ? '#E5E7EB' : '#1E1510';
    ctx.fillText('Powered by ', startX + markSize + 12, cy);

    const prefixW = ctx.measureText('Powered by ').width;
    ctx.fillStyle = accentColor;
    ctx.fillText('LayoScan', startX + markSize + 12 + prefixW, cy);
  } else {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme === 'dark' ? '#E5E7EB' : '#1E1510';
    ctx.fillText('Powered by LayoScan', cx, cy);
  }
  ctx.restore();
}
