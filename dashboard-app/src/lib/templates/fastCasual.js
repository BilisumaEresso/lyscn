import {
  drawPillBadge,
  drawPhoneIcon,
  drawMenuIcon,
  drawLayoScanFooter,
  formatTableCode,
} from '../canvasHelpers';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEMPLATE 2: GOODBITE (Fast Casual, Burgers, Pizza & Street Food)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Split Burger & Pizza Vector Mark
 * Left side: Golden-yellow burger
 * Right side: Tomato-red pizza slice
 */
export function drawSplitBurgerPizzaLogo(ctx, cx, cy, size = 110) {
  ctx.save();
  ctx.translate(cx, cy);

  const yellow = '#FFA800';
  const orange = '#FF4B26';
  const strokeW = size * 0.065;

  ctx.lineWidth = strokeW;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const halfW = size * 0.48;
  const halfH = size * 0.42;

  // ── LEFT HALF: BURGER (#FFA800) ──────────────────────────────────────────
  ctx.strokeStyle = yellow;
  ctx.fillStyle = yellow;

  // Top bun arc (left half)
  ctx.beginPath();
  ctx.moveTo(-halfW, -halfH * 0.1);
  ctx.bezierCurveTo(-halfW, -halfH * 1.05, -size * 0.04, -halfH * 1.05, -size * 0.04, -halfH * 0.1);
  ctx.stroke();

  // Sesame seeds on top bun
  ctx.beginPath();
  ctx.arc(-halfW * 0.5, -halfH * 0.55, size * 0.025, 0, Math.PI * 2);
  ctx.arc(-halfW * 0.25, -halfH * 0.75, size * 0.025, 0, Math.PI * 2);
  ctx.fill();

  // Wavy lettuce line
  ctx.beginPath();
  ctx.moveTo(-halfW, halfH * 0.08);
  ctx.bezierCurveTo(-halfW * 0.7, halfH * 0.22, -halfW * 0.4, -halfH * 0.04, -size * 0.04, halfH * 0.08);
  ctx.stroke();

  // Patty & Cheese line
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.95, halfH * 0.38);
  ctx.lineTo(-size * 0.04, halfH * 0.38);
  ctx.stroke();

  // Bottom bun line
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.85, halfH * 0.68);
  ctx.bezierCurveTo(-halfW * 0.6, halfH * 0.9, -halfW * 0.2, halfH * 0.9, -size * 0.04, halfH * 0.68);
  ctx.stroke();

  // ── RIGHT HALF: PIZZA SLICE (#FF4B26) ────────────────────────────────────
  ctx.strokeStyle = orange;
  ctx.fillStyle = orange;

  // Triangle body
  ctx.beginPath();
  ctx.moveTo(size * 0.04, -halfH * 0.95); // Top tip
  ctx.lineTo(halfW, halfH * 0.65);         // Bottom right base
  ctx.lineTo(size * 0.04, halfH * 0.75);  // Bottom center base
  ctx.closePath();
  ctx.stroke();

  // Crust arc at bottom right
  ctx.beginPath();
  ctx.moveTo(size * 0.04, halfH * 0.75);
  ctx.bezierCurveTo(halfW * 0.4, halfH * 0.88, halfW * 0.8, halfH * 0.82, halfW, halfH * 0.65);
  ctx.stroke();

  // Pepperoni circles inside slice
  ctx.beginPath();
  ctx.arc(halfW * 0.32, -halfH * 0.15, size * 0.05, 0, Math.PI * 2);
  ctx.arc(halfW * 0.48, halfH * 0.32, size * 0.045, 0, Math.PI * 2);
  ctx.arc(halfW * 0.2, halfH * 0.42, size * 0.038, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Fast Casual Burger Icon (for step 3 order icon)
 */
export function drawBurgerStepIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const w = size * 0.72;
  const h = size * 0.58;

  // Top bun
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.05, w / 2, Math.PI, 0);
  ctx.closePath();
  ctx.stroke();

  // Patty
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.45, cy + h * 0.12);
  ctx.lineTo(cx + w * 0.45, cy + h * 0.12);
  ctx.stroke();

  // Bottom bun
  ctx.beginPath();
  ctx.roundRect(cx - w * 0.42, cy + h * 0.26, w * 0.84, h * 0.2, 5);
  ctx.stroke();

  ctx.restore();
}

/**
 * 3-Step Instruction Flow Node Row for Fast Casual
 */
export function drawFastCasualStepFlow(ctx, {
  cx,
  cy,
  color = '#FFA800',
  textColor = '#E5E7EB',
  circleRadius = 38,
  spacing = 220,
}) {
  const nodeCount = 3;
  const startX = cx - ((nodeCount - 1) * spacing) / 2;

  const icons = [
    (x, y) => drawPhoneIcon(ctx, x, y, circleRadius * 1.05, color),
    (x, y) => drawMenuIcon(ctx, x, y, circleRadius * 1.05, color),
    (x, y) => drawBurgerStepIcon(ctx, x, y, circleRadius * 1.05, color),
  ];

  const labels = ['Scan', 'View Menu', 'Order'];

  for (let i = 0; i < nodeCount; i++) {
    const nx = startX + i * spacing;
    const ny = cy;

    // Outer Circle with warm subtle glow
    ctx.save();
    ctx.shadowColor = 'rgba(255, 168, 0, 0.25)';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.6;
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

    // Arrow '>' between circles
    if (i < nodeCount - 1) {
      const arrowX = nx + spacing / 2;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(arrowX - 8, ny - 9);
      ctx.lineTo(arrowX + 4, ny);
      ctx.lineTo(arrowX - 8, ny + 9);
      ctx.stroke();
      ctx.restore();
    }
  }
}

/**
 * Subtle Background Food Doodles (Burgers, Pizza, Drink cups, Fries)
 */
export function drawBackgroundFoodDoodles(ctx, width, height) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  const doodles = [
    { x: 120, y: 150, type: 'burger', rot: -0.2, s: 50 },
    { x: width - 130, y: 220, type: 'pizza', rot: 0.35, s: 55 },
    { x: 90, y: 520, type: 'drink', rot: 0.15, s: 45 },
    { x: width - 110, y: 640, type: 'burger', rot: 0.25, s: 50 },
    { x: 100, y: 920, type: 'pizza', rot: -0.3, s: 50 },
    { x: width - 120, y: 1020, type: 'drink', rot: -0.15, s: 45 },
    { x: 140, y: 1340, type: 'burger', rot: 0.2, s: 48 },
    { x: width - 140, y: 1420, type: 'pizza', rot: 0.1, s: 52 },
  ];

  for (const d of doodles) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);

    if (d.type === 'burger') {
      ctx.beginPath();
      ctx.arc(0, -d.s * 0.2, d.s * 0.45, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-d.s * 0.4, 0);
      ctx.lineTo(d.s * 0.4, 0);
      ctx.moveTo(-d.s * 0.35, d.s * 0.15);
      ctx.lineTo(d.s * 0.35, d.s * 0.15);
      ctx.stroke();
    } else if (d.type === 'pizza') {
      ctx.beginPath();
      ctx.moveTo(0, -d.s * 0.5);
      ctx.lineTo(d.s * 0.4, d.s * 0.4);
      ctx.lineTo(-d.s * 0.4, d.s * 0.4);
      ctx.closePath();
      ctx.stroke();
    } else if (d.type === 'drink') {
      ctx.beginPath();
      ctx.moveTo(-d.s * 0.3, -d.s * 0.3);
      ctx.lineTo(d.s * 0.3, -d.s * 0.3);
      ctx.lineTo(d.s * 0.2, d.s * 0.4);
      ctx.lineTo(-d.s * 0.2, d.s * 0.4);
      ctx.closePath();
      ctx.stroke();
      // Straw
      ctx.beginPath();
      ctx.moveTo(0, -d.s * 0.3);
      ctx.lineTo(d.s * 0.15, -d.s * 0.55);
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Dynamic Yellow & Orange Ribbon Waves (Signature GoodBite aesthetic)
 */
export function drawDynamicRibbonWaves(ctx, width, height, isLandscape = false) {
  const yellow = '#FFA800';
  const orange = '#FF4B26';

  // 1. Top-Right Corner Energetic Swoosh
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(width - 240, 0);
  ctx.bezierCurveTo(width - 160, 80, width - 40, 160, width, 180);
  ctx.lineTo(width, 0);
  ctx.closePath();
  const topGrad = ctx.createLinearGradient(width - 240, 0, width, 180);
  topGrad.addColorStop(0, yellow);
  topGrad.addColorStop(1, orange);
  ctx.fillStyle = topGrad;
  ctx.fill();
  ctx.restore();

  // 2. Bottom Dynamic Sweeping Ribbon Waves
  const baseH = isLandscape ? height * 0.32 : height * 0.22;
  const startY = height - baseH;

  // Back Wave (Deep Red-Orange)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, startY + 40);
  ctx.bezierCurveTo(
    width * 0.25, startY + 120,
    width * 0.65, startY - 60,
    width, startY + 50
  );
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fillStyle = orange;
  ctx.fill();
  ctx.restore();

  // Front Wave (Golden Yellow Ribbon)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, startY + 110);
  ctx.bezierCurveTo(
    width * 0.28, startY + 40,
    width * 0.6, startY + 140,
    width, startY + 10
  );
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fillStyle = yellow;
  ctx.fill();
  ctx.restore();
}

/**
 * PORTRAIT RENDERER (1200 x 1800)
 */
export async function renderFastCasualPortrait(ctx, {
  table,
  restaurant,
  qrImage,
  logoImage,
  width = 1200,
  height = 1800,
}) {
  const yellow = '#FFA800';
  const darkCard = '#1A1A1E';
  const textMuted = '#9CA3AF';
  const tableLabel = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // 1. Dark Matte Charcoal Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#111113');
  bgGrad.addColorStop(0.5, '#161619');
  bgGrad.addColorStop(1, '#0F0F11');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle Food Doodles in background
  drawBackgroundFoodDoodles(ctx, width, height);

  // 3. Dynamic Curved Waves
  drawDynamicRibbonWaves(ctx, width, height, false);

  // 4. Header: Split Burger/Pizza Logo or Custom Brand Logo
  const headerCenterY = 150;
  if (logoImage) {
    const logoSize = 110;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2 + 5, 0, Math.PI * 2);
    ctx.fillStyle = darkCard;
    ctx.shadowColor = 'rgba(255, 168, 0, 0.3)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = yellow;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, width / 2 - logoSize / 2, headerCenterY - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawSplitBurgerPizzaLogo(ctx, width / 2, headerCenterY, 115);
  }

  // 5. Restaurant Title: Bold Rounded Typography
  const restName = restaurant?.name || 'GoodBite';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 58px "Space Grotesk", "Montserrat", Inter, sans-serif';
  ctx.fillText(restName, width / 2, 252, width - 240);

  // Tagline: 3-dot categories
  const tagline = (restaurant?.description || 'BURGERS • PIZZA • MORE').toUpperCase();
  ctx.fillStyle = textMuted;
  ctx.font = '700 20px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(tagline, width / 2, 290, width - 260);
  ctx.restore();

  // 6. QR Code Card Container (Dark mode with radiant yellow border)
  const qrBoxSize = 610;
  const qrBoxX = width / 2 - qrBoxSize / 2;
  const qrBoxY = 330;
  const qrBoxRadius = 38;

  ctx.save();
  ctx.shadowColor = 'rgba(255, 168, 0, 0.22)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 10;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = darkCard;
  ctx.fill();

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = yellow;
  ctx.stroke();
  ctx.restore();

  // Draw QR Image
  if (qrImage) {
    const qrInnerSize = 530;
    const qrInnerX = width / 2 - qrInnerSize / 2;
    const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
    ctx.drawImage(qrImage, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
  }

  // 7. Table Pill Badge: Radiant Golden Amber
  const pillW = 380;
  const pillH = 76;
  const pillY = qrBoxY + qrBoxSize + 36; // ~976
  drawPillBadge(ctx, {
    x: width / 2 - pillW / 2,
    y: pillY,
    width: pillW,
    height: pillH,
    bgColor: yellow,
    text: tableLabel,
    textColor: '#141414',
    font: '800 42px "Space Grotesk", Montserrat, sans-serif',
  });

  // 8. 3-Step Instruction Flow Node Row
  const stepsY = pillY + pillH + 68; // ~1120
  drawFastCasualStepFlow(ctx, {
    cx: width / 2,
    cy: stepsY,
    color: yellow,
    textColor: textMuted,
    circleRadius: 36,
    spacing: 215,
  });

  // 9. Script Catchphrase: "Fresh Ingredients Great Taste"
  const scriptY = stepsY + 98; // ~1218
  ctx.save();
  ctx.translate(width / 2, scriptY);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'italic 700 40px "Caveat", "Brush Script MT", cursive, sans-serif';
  ctx.fillText('Fresh Ingredients Great Taste', 0, 0);
  ctx.restore();

  // 10. Manual Table Code Fallback Pill
  const codeBoxW = 440;
  const codeBoxH = 52;
  const codeBoxX = width / 2 - codeBoxW / 2;
  const codeBoxY = height - 160;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(codeBoxX, codeBoxY, codeBoxW, codeBoxH, 16);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 18px "Space Grotesk", monospace';
  ctx.fillText(`CODE: ${tableCodeFormatted}`, width / 2, codeBoxY + codeBoxH / 2);
  ctx.restore();

  // 11. "Powered by LayoScan" Footer Badge
  await drawLayoScanFooter(ctx, {
    cx: width / 2,
    cy: height - 70,
    badgeW: 380,
    badgeH: 56,
    theme: 'dark',
    accentColor: yellow,
  });
}

/**
 * LANDSCAPE RENDERER (1800 x 1200) — Mini Table Tent / Counter Stand
 */
export async function renderFastCasualLandscape(ctx, {
  table,
  restaurant,
  qrImage,
  logoImage,
  width = 1800,
  height = 1200,
}) {
  const yellow = '#FFA800';
  const darkCard = '#1A1A1E';
  const textMuted = '#9CA3AF';
  const tableLabel = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // 1. Dark Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#111113');
  bgGrad.addColorStop(0.5, '#161619');
  bgGrad.addColorStop(1, '#0F0F11');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Doodles
  drawBackgroundFoodDoodles(ctx, width, height);

  // 3. Dynamic Ribbon Waves
  drawDynamicRibbonWaves(ctx, width, height, true);

  // 4. Left Section: Brand & Story (x: 0 -> 980)
  const leftCenterX = 480;

  // Header Logo or Split Mark
  if (logoImage) {
    const logoSize = 100;
    ctx.save();
    ctx.beginPath();
    ctx.arc(leftCenterX, 120, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = darkCard;
    ctx.shadowColor = 'rgba(255, 168, 0, 0.25)';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = yellow;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(leftCenterX, 120, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, leftCenterX - logoSize / 2, 120 - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawSplitBurgerPizzaLogo(ctx, leftCenterX, 120, 100);
  }

  // Restaurant Name
  const restName = restaurant?.name || 'GoodBite';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 52px "Space Grotesk", Montserrat, sans-serif';
  ctx.fillText(restName, leftCenterX, 215, 860);

  // Tagline
  const tagline = (restaurant?.description || 'BURGERS • PIZZA • MORE').toUpperCase();
  ctx.fillStyle = textMuted;
  ctx.font = '700 18px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(tagline, leftCenterX, 252, 860);
  ctx.restore();

  // Table Pill Badge
  const pillW = 340;
  const pillH = 70;
  drawPillBadge(ctx, {
    x: leftCenterX - pillW / 2,
    y: 295,
    width: pillW,
    height: pillH,
    bgColor: yellow,
    text: tableLabel,
    textColor: '#141414',
    font: '800 38px "Space Grotesk", Montserrat, sans-serif',
  });

  // 3-Step Flow Nodes
  drawFastCasualStepFlow(ctx, {
    cx: leftCenterX,
    cy: 440,
    color: yellow,
    textColor: textMuted,
    circleRadius: 34,
    spacing: 190,
  });

  // Catchphrase
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'italic 700 42px "Caveat", "Brush Script MT", cursive, sans-serif';
  ctx.fillText('Fresh Ingredients, Great Taste', leftCenterX, 565);
  ctx.restore();

  // Left Footer
  await drawLayoScanFooter(ctx, {
    cx: 320,
    cy: height - 60,
    badgeW: 360,
    badgeH: 52,
    theme: 'dark',
    accentColor: yellow,
  });

  // 5. Right Section: Large QR Code Presentation (x: 980 -> 1800)
  const rightCenterX = 1380;
  const qrBoxSize = 650;
  const qrBoxX = rightCenterX - qrBoxSize / 2;
  const qrBoxY = 120;
  const qrBoxRadius = 38;

  ctx.save();
  ctx.shadowColor = 'rgba(255, 168, 0, 0.22)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 12;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = darkCard;
  ctx.fill();
  ctx.lineWidth = 3.6;
  ctx.strokeStyle = yellow;
  ctx.stroke();
  ctx.restore();

  if (qrImage) {
    const qrInnerSize = 570;
    const qrInnerX = rightCenterX - qrInnerSize / 2;
    const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
    ctx.drawImage(qrImage, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
  }

  // Under QR: Manual Table Code box & hint
  const codeBoxW = 540;
  const codeBoxH = 90;
  const codeBoxX = rightCenterX - codeBoxW / 2;
  const codeBoxY = qrBoxY + qrBoxSize + 40;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(codeBoxX, codeBoxY, codeBoxW, codeBoxH, 20);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = yellow;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.fillStyle = textMuted;
  ctx.font = '600 18px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('ENTER TABLE CODE MANUALLY:', rightCenterX, codeBoxY + 32);

  ctx.fillStyle = yellow;
  ctx.font = '700 28px "Space Grotesk", monospace';
  ctx.fillText(tableCodeFormatted, rightCenterX, codeBoxY + 68);

  ctx.fillStyle = textMuted;
  ctx.font = '500 19px Inter, sans-serif';
  ctx.fillText('layoscancustomer.vercel.app', rightCenterX, codeBoxY + codeBoxH + 32);
  ctx.restore();
}
