import {
  drawPillBadge,
  drawStepFlowNodes,
  drawLayoScanFooter,
  formatTableCode,
} from '../canvasHelpers';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEMPLATE 4: SKYVIEW HOTEL (Luxury Hotel, Stay & Fine Dining)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Geometric Architectural Crown / Hotel Emblem
 */
export function drawArchitecturalCrownLogo(ctx, cx, cy, size = 110, color = '#E5C583') {
  ctx.save();
  ctx.translate(cx, cy);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.065;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const w = size * 0.82;
  const h = size * 0.62;

  // Central Gable / Peak
  ctx.beginPath();
  ctx.moveTo(-w / 2, h * 0.35);
  ctx.lineTo(-w * 0.35, -h * 0.1);
  ctx.lineTo(-w * 0.18, h * 0.15);
  ctx.lineTo(0, -h * 0.45); // Highest center peak
  ctx.lineTo(w * 0.18, h * 0.15);
  ctx.lineTo(w * 0.35, -h * 0.1);
  ctx.lineTo(w / 2, h * 0.35);
  ctx.stroke();

  // Floating Roofline / Chevrons
  ctx.beginPath();
  ctx.moveTo(-w * 0.45, -h * 0.12);
  ctx.lineTo(0, -h * 0.65);
  ctx.lineTo(w * 0.45, -h * 0.12);
  ctx.stroke();

  // Bottom Base Platform rule
  ctx.beginPath();
  ctx.moveTo(-w * 0.52, h * 0.45);
  ctx.lineTo(w * 0.52, h * 0.45);
  ctx.lineWidth = size * 0.05;
  ctx.stroke();

  ctx.restore();
}

/**
 * PORTRAIT RENDERER (1200 x 1800)
 */
export async function renderLuxuryHotelPortrait(ctx, {
  table,
  restaurant,
  qrImage,
  logoImage,
  heroImage,
  width = 1200,
  height = 1800,
}) {
  const midnightNavy = '#0C192E';
  const goldAccent = '#E5C583';
  const textMuted = '#CBD5E1';
  const tableLabel = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // 1. Midnight Blue Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#0E1E38');
  bgGrad.addColorStop(0.5, '#0B172C');
  bgGrad.addColorStop(1, '#060E1C');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Vertical Gold Hairline Borders (Signature Luxury Frame)
  ctx.save();
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.35)';
  ctx.lineWidth = 1.6;

  // Left vertical rule
  ctx.beginPath();
  ctx.moveTo(50, 40);
  ctx.lineTo(50, height - 40);
  ctx.stroke();

  // Right vertical rule
  ctx.beginPath();
  ctx.moveTo(width - 50, 40);
  ctx.lineTo(width - 50, height - 40);
  ctx.stroke();
  ctx.restore();

  // 3. Header: Architectural Crown or Custom Brand Logo
  const headerCenterY = 145;
  if (logoImage) {
    const logoSize = 110;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2 + 5, 0, Math.PI * 2);
    ctx.fillStyle = midnightNavy;
    ctx.shadowColor = 'rgba(229, 197, 131, 0.3)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = goldAccent;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, width / 2 - logoSize / 2, headerCenterY - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawArchitecturalCrownLogo(ctx, width / 2, headerCenterY, 110, goldAccent);
  }

  // 4. Restaurant Title: Refined Serif
  const restName = restaurant?.name || 'SkyView Hotel';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 58px "Playfair Display", Georgia, serif';
  ctx.fillText(restName, width / 2, 246, width - 240);

  // Tagline: 3-dot categories
  const tagline = (restaurant?.description || 'STAY • DINE • RELAX').toUpperCase();
  ctx.fillStyle = goldAccent;
  ctx.font = '600 20px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(tagline, width / 2, 284, width - 260);
  ctx.restore();

  // 5. QR Code Card Container (Pure white luxury card with subtle gold aura)
  const qrBoxSize = 610;
  const qrBoxX = width / 2 - qrBoxSize / 2;
  const qrBoxY = 325;
  const qrBoxRadius = 38;

  ctx.save();
  ctx.shadowColor = 'rgba(229, 197, 131, 0.25)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 10;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.5)';
  ctx.stroke();
  ctx.restore();

  // Draw QR Image
  if (qrImage) {
    const qrInnerSize = 530;
    const qrInnerX = width / 2 - qrInnerSize / 2;
    const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
    ctx.drawImage(qrImage, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
  }

  // 6. Table Pill Badge: Brushed Champagne Gold
  const pillW = 380;
  const pillH = 76;
  const pillY = qrBoxY + qrBoxSize + 36; // ~971
  drawPillBadge(ctx, {
    x: width / 2 - pillW / 2,
    y: pillY,
    width: pillW,
    height: pillH,
    bgColor: goldAccent,
    text: tableLabel,
    textColor: midnightNavy,
    font: '700 42px "Playfair Display", Georgia, serif',
  });

  // 7. 3-Step Instruction Flow Node Row
  const stepsY = pillY + pillH + 68; // ~1115
  drawStepFlowNodes(ctx, {
    cx: width / 2,
    cy: stepsY,
    color: goldAccent,
    textColor: textMuted,
    circleRadius: 36,
    spacing: 215,
    orderIconType: 'cloche',
    labels: ['Scan', 'View Menu', 'Order'],
  });

  // 8. Script Catchphrase: "Comfort in Every Stay"
  const scriptY = stepsY + 98; // ~1213
  ctx.save();
  ctx.translate(width / 2, scriptY);
  ctx.textAlign = 'center';
  ctx.fillStyle = goldAccent;
  ctx.font = 'italic 700 40px "Playfair Display", "Caveat", Georgia, cursive, serif';
  ctx.fillText('Comfort in Every Stay', 0, 0);
  ctx.restore();

  // 9. Bottom Hero Suite Photograph (High-end architectural suite view)
  if (heroImage) {
    const heroH = 430;
    const heroY = height - heroH - 60;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(40, heroY, width - 80, heroH, 32);
    ctx.clip();

    ctx.drawImage(heroImage, 40, heroY, width - 80, heroH);

    // Dark gradient feather overlay on top of photo to blend into midnight blue
    const topFeather = ctx.createLinearGradient(0, heroY, 0, heroY + 130);
    topFeather.addColorStop(0, '#0B172C');
    topFeather.addColorStop(1, 'rgba(11, 23, 44, 0)');
    ctx.fillStyle = topFeather;
    ctx.fillRect(40, heroY, width - 80, 130);

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
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.4)';
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
    accentColor: goldAccent,
  });
}

/**
 * LANDSCAPE RENDERER (1800 x 1200) — Mini Table Tent / Counter Stand
 */
export async function renderLuxuryHotelLandscape(ctx, {
  table,
  restaurant,
  qrImage,
  logoImage,
  heroImage,
  width = 1800,
  height = 1200,
}) {
  const midnightNavy = '#0C192E';
  const goldAccent = '#E5C583';
  const textMuted = '#CBD5E1';
  const tableLabel = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // 1. Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0E1E38');
  bgGrad.addColorStop(0.5, '#0B172C');
  bgGrad.addColorStop(1, '#060E1C');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Gold Border rules
  ctx.save();
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.35)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(40, 30);
  ctx.lineTo(40, height - 30);
  ctx.moveTo(width - 40, 30);
  ctx.lineTo(width - 40, height - 30);
  ctx.stroke();
  ctx.restore();

  // 3. Left Section: Brand & Story (x: 0 -> 980)
  const leftCenterX = 480;

  // Header Logo or Crown
  if (logoImage) {
    const logoSize = 100;
    ctx.save();
    ctx.beginPath();
    ctx.arc(leftCenterX, 115, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = midnightNavy;
    ctx.shadowColor = 'rgba(229, 197, 131, 0.25)';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = goldAccent;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(leftCenterX, 115, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, leftCenterX - logoSize / 2, 115 - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawArchitecturalCrownLogo(ctx, leftCenterX, 115, 100, goldAccent);
  }

  // Restaurant Name
  const restName = restaurant?.name || 'SkyView Hotel';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 52px "Playfair Display", Georgia, serif';
  ctx.fillText(restName, leftCenterX, 205, 860);

  // Tagline
  const tagline = (restaurant?.description || 'STAY • DINE • RELAX').toUpperCase();
  ctx.fillStyle = goldAccent;
  ctx.font = '600 18px "Space Grotesk", Inter, sans-serif';
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
    bgColor: goldAccent,
    text: tableLabel,
    textColor: midnightNavy,
    font: '700 38px "Playfair Display", Georgia, serif',
  });

  // 3-Step Flow Nodes
  drawStepFlowNodes(ctx, {
    cx: leftCenterX,
    cy: 430,
    color: goldAccent,
    textColor: textMuted,
    circleRadius: 34,
    spacing: 190,
    orderIconType: 'cloche',
    labels: ['Scan', 'View Menu', 'Order'],
  });

  // Catchphrase
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = goldAccent;
  ctx.font = 'italic 700 42px "Playfair Display", Georgia, serif';
  ctx.fillText('Comfort in Every Stay', leftCenterX, 555);
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
    fade.addColorStop(0, '#0B172C');
    fade.addColorStop(1, 'rgba(11, 23, 44, 0)');
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
    theme: 'dark',
    accentColor: goldAccent,
  });

  // 4. Right Section: Large QR Code Presentation (x: 980 -> 1800)
  const rightCenterX = 1380;
  const qrBoxSize = 650;
  const qrBoxX = rightCenterX - qrBoxSize / 2;
  const qrBoxY = 120;
  const qrBoxRadius = 38;

  ctx.save();
  ctx.shadowColor = 'rgba(229, 197, 131, 0.28)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 12;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.5)';
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
  ctx.strokeStyle = goldAccent;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = '600 18px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('ENTER TABLE / ROOM CODE MANUALLY:', rightCenterX, codeBoxY + 32);

  ctx.fillStyle = midnightNavy;
  ctx.font = '700 28px "Space Grotesk", monospace';
  ctx.fillText(tableCodeFormatted, rightCenterX, codeBoxY + 68);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '500 19px Inter, sans-serif';
  ctx.fillText('layoscancustomer.vercel.app', rightCenterX, codeBoxY + codeBoxH + 32);
  ctx.restore();
}
