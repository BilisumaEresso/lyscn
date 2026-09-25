import {
  drawPillBadge,
  drawStepFlowNodes,
  drawLayoScanFooter,
  drawBotanicalSprig,
  formatTableCode,
} from '../canvasHelpers';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEMPLATE 3: GREENMART (Fresh Market, Grocery & Healthy Deli)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Twin Sprout Leaf Vector Emblem
 */
export function drawSproutLeavesLogo(ctx, cx, cy, size = 110, color = '#86EFAC') {
  ctx.save();
  ctx.translate(cx, cy);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.07;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Left leaf (curved left)
  ctx.save();
  ctx.rotate(-0.35);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.35);
  ctx.bezierCurveTo(-size * 0.5, size * 0.15, -size * 0.45, -size * 0.45, 0, -size * 0.5);
  ctx.bezierCurveTo(size * 0.1, -size * 0.25, 0, size * 0.1, 0, size * 0.35);
  ctx.fill();
  ctx.restore();

  // Right leaf (curved right, slightly smaller)
  ctx.save();
  ctx.rotate(0.35);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.35);
  ctx.bezierCurveTo(size * 0.5, size * 0.15, size * 0.45, -size * 0.45, 0, -size * 0.5);
  ctx.bezierCurveTo(-size * 0.1, -size * 0.25, 0, size * 0.1, 0, size * 0.35);
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.restore();

  // Small center stem base
  ctx.beginPath();
  ctx.moveTo(0, size * 0.3);
  ctx.bezierCurveTo(0, size * 0.45, -size * 0.05, size * 0.52, -size * 0.08, size * 0.58);
  ctx.stroke();

  ctx.restore();
}

/**
 * PORTRAIT RENDERER (1200 x 1800)
 */
export async function renderFreshMartPortrait(ctx, {
  table,
  restaurant,
  qrImage,
  logoImage,
  heroImage,
  width = 1200,
  height = 1800,
}) {
  const deepEmerald = '#0B3B24';
  const mintAccent = '#86EFAC';
  const textMuted = '#A7F3D0';
  const tableLabel = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // 1. Deep Lush Emerald Green Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#0B3B24');
  bgGrad.addColorStop(0.5, '#072E1B');
  bgGrad.addColorStop(1, '#041B10');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Corner Foliage Sprigs
  drawBotanicalSprig(ctx, 60, 60, 1.15, -0.15, 'rgba(134, 239, 172, 0.25)');
  drawBotanicalSprig(ctx, width - 60, 60, 1.15, Math.PI / 2 + 0.15, 'rgba(134, 239, 172, 0.25)');

  // 3. Header: Sprout Emblem or Custom Brand Logo
  const headerCenterY = 145;
  if (logoImage) {
    const logoSize = 110;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2 + 5, 0, Math.PI * 2);
    ctx.fillStyle = deepEmerald;
    ctx.shadowColor = 'rgba(134, 239, 172, 0.25)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = mintAccent;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, width / 2 - logoSize / 2, headerCenterY - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawSproutLeavesLogo(ctx, width / 2, headerCenterY, 110, mintAccent);
  }

  // 4. Restaurant Title: Clean Modern Sans
  const restName = restaurant?.name || 'GreenMart';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 58px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(restName, width / 2, 246, width - 240);

  // Tagline: 3-dot categories
  const tagline = (restaurant?.description || 'GROCERY • BAR • DAILY NEEDS').toUpperCase();
  ctx.fillStyle = textMuted;
  ctx.font = '700 20px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(tagline, width / 2, 284, width - 260);
  ctx.restore();

  // 5. QR Code Card Container (Crisp white with emerald drop shadow)
  const qrBoxSize = 610;
  const qrBoxX = width / 2 - qrBoxSize / 2;
  const qrBoxY = 325;
  const qrBoxRadius = 38;

  ctx.save();
  ctx.shadowColor = 'rgba(11, 59, 36, 0.35)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(134, 239, 172, 0.4)';
  ctx.stroke();
  ctx.restore();

  // Draw QR Image
  if (qrImage) {
    const qrInnerSize = 530;
    const qrInnerX = width / 2 - qrInnerSize / 2;
    const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
    ctx.drawImage(qrImage, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
  }

  // 6. Table Pill Badge: Soft Pistachio Mint Green
  const pillW = 380;
  const pillH = 76;
  const pillY = qrBoxY + qrBoxSize + 36; // ~971
  drawPillBadge(ctx, {
    x: width / 2 - pillW / 2,
    y: pillY,
    width: pillW,
    height: pillH,
    bgColor: mintAccent,
    text: tableLabel,
    textColor: deepEmerald,
    font: '800 42px "Space Grotesk", Inter, sans-serif',
  });

  // 7. 3-Step Instruction Flow Node Row
  const stepsY = pillY + pillH + 68; // ~1115
  drawStepFlowNodes(ctx, {
    cx: width / 2,
    cy: stepsY,
    color: mintAccent,
    textColor: textMuted,
    circleRadius: 36,
    spacing: 215,
    orderIconType: 'cart',
    labels: ['Scan', 'View Menu', 'Order'],
  });

  // 8. Script Catchphrase: "Fresh Choices Every Day"
  const scriptY = stepsY + 98; // ~1213
  ctx.save();
  ctx.translate(width / 2, scriptY);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'italic 700 40px "Caveat", "Brush Script MT", cursive, sans-serif';
  ctx.fillText('Fresh Choices Every Day', 0, 0);
  ctx.restore();

  // 9. Bottom Hero Harvest Photograph (Feathered seamlessly into dark background)
  if (heroImage) {
    const heroH = 430;
    const heroY = height - heroH - 60;

    ctx.save();
    // Rounded container with soft upward fade
    ctx.beginPath();
    ctx.roundRect(40, heroY, width - 80, heroH, 32);
    ctx.clip();

    ctx.drawImage(heroImage, 40, heroY, width - 80, heroH);

    // Dark gradient feather overlay on top of photo to blend seamlessly
    const topFeather = ctx.createLinearGradient(0, heroY, 0, heroY + 120);
    topFeather.addColorStop(0, deepEmerald);
    topFeather.addColorStop(1, 'rgba(11, 59, 36, 0)');
    ctx.fillStyle = topFeather;
    ctx.fillRect(40, heroY, width - 80, 120);

    ctx.restore();
  }

  // 10. Manual Table Code Fallback Pill
  const codeBoxW = 440;
  const codeBoxH = 50;
  const codeBoxX = width / 2 - codeBoxW / 2;
  const codeBoxY = height - 150;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(codeBoxX, codeBoxY, codeBoxW, codeBoxH, 16);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = 'rgba(134, 239, 172, 0.4)';
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
    theme: 'light',
    accentColor: deepEmerald,
  });
}

/**
 * LANDSCAPE RENDERER (1800 x 1200) — Mini Table Tent / Counter Stand
 */
export async function renderFreshMartLandscape(ctx, {
  table,
  restaurant,
  qrImage,
  logoImage,
  heroImage,
  width = 1800,
  height = 1200,
}) {
  const deepEmerald = '#0B3B24';
  const mintAccent = '#86EFAC';
  const textMuted = '#A7F3D0';
  const tableLabel = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // 1. Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0B3B24');
  bgGrad.addColorStop(0.5, '#072E1B');
  bgGrad.addColorStop(1, '#041B10');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Corner Sprigs
  drawBotanicalSprig(ctx, 50, 50, 1.0, -0.15, 'rgba(134, 239, 172, 0.2)');
  drawBotanicalSprig(ctx, 50, height - 50, 1.0, -Math.PI / 2, 'rgba(134, 239, 172, 0.15)');

  // 3. Left Section: Brand & Story (x: 0 -> 980)
  const leftCenterX = 480;

  // Header Logo or Sprout Emblem
  if (logoImage) {
    const logoSize = 100;
    ctx.save();
    ctx.beginPath();
    ctx.arc(leftCenterX, 115, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = deepEmerald;
    ctx.shadowColor = 'rgba(134, 239, 172, 0.25)';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = mintAccent;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(leftCenterX, 115, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, leftCenterX - logoSize / 2, 115 - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawSproutLeavesLogo(ctx, leftCenterX, 115, 100, mintAccent);
  }

  // Restaurant Name
  const restName = restaurant?.name || 'GreenMart';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 52px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(restName, leftCenterX, 205, 860);

  // Tagline
  const tagline = (restaurant?.description || 'GROCERY • BAR • DAILY NEEDS').toUpperCase();
  ctx.fillStyle = textMuted;
  ctx.font = '700 18px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(tagline, leftCenterX, 242, 860);
  ctx.restore();

  // Table Pill Badge
  const pillW = 340;
  const pillH = 70;
  drawPillBadge(ctx, {
    x: leftCenterX - pillW / 2,
    y: 285,
    width: pillW,
    height: pillH,
    bgColor: mintAccent,
    text: tableLabel,
    textColor: deepEmerald,
    font: '800 38px "Space Grotesk", Inter, sans-serif',
  });

  // 3-Step Flow Nodes
  drawStepFlowNodes(ctx, {
    cx: leftCenterX,
    cy: 430,
    color: mintAccent,
    textColor: textMuted,
    circleRadius: 34,
    spacing: 190,
    orderIconType: 'cart',
    labels: ['Scan', 'View Menu', 'Order'],
  });

  // Catchphrase
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'italic 700 42px "Caveat", "Brush Script MT", cursive, sans-serif';
  ctx.fillText('Fresh Choices Every Day', leftCenterX, 555);
  ctx.restore();

  // Bottom Hero Image on Left
  if (heroImage) {
    const heroW = 440;
    const heroH = 340;
    const hx = leftCenterX - heroW / 2;
    const hy = height - heroH - 90;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(hx, hy, heroW, heroH, 24);
    ctx.clip();
    ctx.drawImage(heroImage, hx, hy, heroW, heroH);

    const fade = ctx.createLinearGradient(0, hy, 0, hy + 90);
    fade.addColorStop(0, deepEmerald);
    fade.addColorStop(1, 'rgba(11, 59, 36, 0)');
    ctx.fillStyle = fade;
    ctx.fillRect(hx, hy, heroW, 90);
    ctx.restore();
  }

  // Left Footer
  await drawLayoScanFooter(ctx, {
    cx: 320,
    cy: height - 60,
    badgeW: 360,
    badgeH: 52,
    theme: 'light',
    accentColor: deepEmerald,
  });

  // 4. Right Section: Large QR Code Presentation (x: 980 -> 1800)
  const rightCenterX = 1380;
  const qrBoxSize = 650;
  const qrBoxX = rightCenterX - qrBoxSize / 2;
  const qrBoxY = 120;
  const qrBoxRadius = 38;

  ctx.save();
  ctx.shadowColor = 'rgba(11, 59, 36, 0.4)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 12;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(134, 239, 172, 0.4)';
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
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = 'rgba(134, 239, 172, 0.5)';
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#065F46';
  ctx.font = '600 18px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('ENTER TABLE CODE MANUALLY:', rightCenterX, codeBoxY + 32);

  ctx.fillStyle = deepEmerald;
  ctx.font = '700 28px "Space Grotesk", monospace';
  ctx.fillText(tableCodeFormatted, rightCenterX, codeBoxY + 68);

  ctx.fillStyle = '#A7F3D0';
  ctx.font = '500 19px Inter, sans-serif';
  ctx.fillText('layoscancustomer.vercel.app', rightCenterX, codeBoxY + codeBoxH + 32);
  ctx.restore();
}
