import {
  drawBotanicalSprig,
  drawCoffeeCupEmblem,
  drawPillBadge,
  drawStepFlowNodes,
  drawLayoScanFooter,
  formatTableCode,
} from '../canvasHelpers';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEMPLATE 1: ELILI CAFE (Artisanal Coffee & Bakery)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * PORTRAIT RENDERER (1200 x 1800)
 */
export async function renderCafeArtisanPortrait(ctx, {
  table,
  restaurant,
  qrImage,
  logoImage,
  heroImage,
  width = 1200,
  height = 1800,
}) {
  const brandDark = '#1B382B'; // Deep Forest Olive
  const textMuted = '#5A6B62';
  const tableLabel = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // 1. Warm Tactile Linen Parchment Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#FAF6EF');
  bgGrad.addColorStop(0.5, '#F4EDE1');
  bgGrad.addColorStop(1, '#ECE2D2');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Corner Botanical Sprigs
  drawBotanicalSprig(ctx, 60, 60, 1.1, -0.15, 'rgba(27, 56, 43, 0.32)');
  drawBotanicalSprig(ctx, width - 60, 60, 1.1, Math.PI / 2 + 0.15, 'rgba(27, 56, 43, 0.32)');

  // 3. Header: Emblem or Restaurant Logo
  const headerCenterY = 140;
  if (logoImage) {
    const logoSize = 110;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2 + 5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(27, 56, 43, 0.15)';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(27, 56, 43, 0.35)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, width / 2 - logoSize / 2, headerCenterY - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawCoffeeCupEmblem(ctx, width / 2, headerCenterY, 110, brandDark);
  }

  // 4. Restaurant Title
  const restName = restaurant?.name || 'Elili Cafe';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = brandDark;
  ctx.font = '700 56px "Playfair Display", "Times New Roman", Georgia, serif';
  ctx.fillText(restName, width / 2, 240, width - 240);

  // Tagline: 3-dot categories
  const tagline = (restaurant?.description || 'GOOD FOOD • GREAT COFFEE • BETTER DAYS').toUpperCase();
  ctx.fillStyle = textMuted;
  ctx.font = '600 20px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(tagline, width / 2, 276, width - 260);
  ctx.restore();

  // 5. QR Code Card Container
  const qrBoxSize = 610;
  const qrBoxX = width / 2 - qrBoxSize / 2;
  const qrBoxY = 320;
  const qrBoxRadius = 38;

  ctx.save();
  ctx.shadowColor = 'rgba(27, 56, 43, 0.14)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.lineWidth = 2.2;
  ctx.strokeStyle = 'rgba(27, 56, 43, 0.28)';
  ctx.stroke();
  ctx.restore();

  // Draw QR Image
  if (qrImage) {
    const qrInnerSize = 530;
    const qrInnerX = width / 2 - qrInnerSize / 2;
    const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
    ctx.drawImage(qrImage, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
  }

  // 6. Table Pill Badge
  const pillW = 380;
  const pillH = 76;
  const pillY = qrBoxY + qrBoxSize + 36; // ~966
  drawPillBadge(ctx, {
    x: width / 2 - pillW / 2,
    y: pillY,
    width: pillW,
    height: pillH,
    bgColor: brandDark,
    text: tableLabel,
    textColor: '#FFFFFF',
    font: '700 42px "Playfair Display", Georgia, serif',
  });

  // 7. 3-Step Instruction Flow Node Row
  const stepsY = pillY + pillH + 68; // ~1110
  drawStepFlowNodes(ctx, {
    cx: width / 2,
    cy: stepsY,
    color: brandDark,
    textColor: textMuted,
    circleRadius: 36,
    spacing: 215,
    orderIconType: 'cloche',
    labels: ['Scan', 'View Menu', 'Order'],
  });

  // 8. Script Catchphrase: "Good Food Good Vibes"
  const scriptY = stepsY + 95; // ~1205
  ctx.save();
  ctx.translate(width * 0.35, scriptY);
  ctx.rotate(-0.06); // Subtle -3.5 deg organic tilt
  ctx.textAlign = 'center';
  ctx.fillStyle = brandDark;
  ctx.font = 'italic 700 40px "Caveat", "Brush Script MT", Georgia, cursive, serif';
  ctx.fillText('Good Food', 0, 0);
  ctx.fillText('Good Vibes', 0, 44);
  ctx.restore();

  // 9. Bottom Hero Coffee Art Visual & Sweeping Green Wave
  const waveTopY = height - 380;

  // Sweeping fluid organic wave in deep forest green
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, waveTopY + 120);
  ctx.bezierCurveTo(
    width * 0.25, waveTopY + 140,
    width * 0.45, waveTopY - 20,
    width, waveTopY + 50
  );
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fillStyle = brandDark;
  ctx.fill();
  ctx.restore();

  // Draw Coffee Latte Hero photo (clipped in bottom right)
  if (heroImage) {
    const heroSize = 420;
    const heroX = width - heroSize - 30;
    const heroY = height - heroSize - 100;

    ctx.save();
    ctx.beginPath();
    ctx.arc(heroX + heroSize / 2, heroY + heroSize / 2, heroSize / 2 - 10, 0, Math.PI * 2);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#FAF6EF';
    ctx.stroke();

    ctx.clip();
    ctx.drawImage(heroImage, heroX, heroY, heroSize, heroSize);
    ctx.restore();
  }

  // 10. Manual Table Code Fallback (subtle floating pill on left)
  const codeBoxW = 420;
  const codeBoxH = 50;
  const codeBoxX = 50;
  const codeBoxY = height - 165;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(codeBoxX, codeBoxY, codeBoxW, codeBoxH, 16);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 17px "Space Grotesk", Inter, monospace';
  ctx.fillText(`CODE: ${tableCodeFormatted}`, codeBoxX + codeBoxW / 2, codeBoxY + codeBoxH / 2);
  ctx.restore();

  // 11. "Powered by LayoScan" Footer Badge
  await drawLayoScanFooter(ctx, {
    cx: width / 2,
    cy: height - 70,
    badgeW: 380,
    badgeH: 56,
    theme: 'light',
    accentColor: brandDark,
  });
}

/**
 * LANDSCAPE RENDERER (1800 x 1200) — Mini Table Tent / Counter Stand
 */
export async function renderCafeArtisanLandscape(ctx, {
  table,
  restaurant,
  qrImage,
  logoImage,
  heroImage,
  width = 1800,
  height = 1200,
}) {
  const brandDark = '#1B382B';
  const textMuted = '#5A6B62';
  const tableLabel = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // 1. Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#FAF6EF');
  bgGrad.addColorStop(0.6, '#F4EDE1');
  bgGrad.addColorStop(1, '#ECE2D2');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Corner Sprigs
  drawBotanicalSprig(ctx, 50, 50, 1.0, -0.15, 'rgba(27, 56, 43, 0.3)');
  drawBotanicalSprig(ctx, 50, height - 50, 1.0, -Math.PI / 2, 'rgba(27, 56, 43, 0.25)');

  // 3. Left Section: Brand & Story (x: 0 -> 980)
  const leftCenterX = 480;

  // Header Logo or Coffee Emblem
  if (logoImage) {
    const logoSize = 100;
    ctx.save();
    ctx.beginPath();
    ctx.arc(leftCenterX, 115, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(27, 56, 43, 0.12)';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = 'rgba(27, 56, 43, 0.3)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(leftCenterX, 115, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, leftCenterX - logoSize / 2, 115 - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawCoffeeCupEmblem(ctx, leftCenterX, 115, 95, brandDark);
  }

  // Restaurant Name
  const restName = restaurant?.name || 'Elili Cafe';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = brandDark;
  ctx.font = '700 52px "Playfair Display", Georgia, serif';
  ctx.fillText(restName, leftCenterX, 205, 860);

  // Tagline
  const tagline = (restaurant?.description || 'GOOD FOOD • GREAT COFFEE • BETTER DAYS').toUpperCase();
  ctx.fillStyle = textMuted;
  ctx.font = '600 18px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(tagline, leftCenterX, 240, 860);
  ctx.restore();

  // Table Pill Badge
  const pillW = 340;
  const pillH = 70;
  drawPillBadge(ctx, {
    x: leftCenterX - pillW / 2,
    y: 280,
    width: pillW,
    height: pillH,
    bgColor: brandDark,
    text: tableLabel,
    textColor: '#FFFFFF',
    font: '700 38px "Playfair Display", Georgia, serif',
  });

  // 3-Step Flow Nodes
  drawStepFlowNodes(ctx, {
    cx: leftCenterX,
    cy: 430,
    color: brandDark,
    textColor: textMuted,
    circleRadius: 34,
    spacing: 190,
    orderIconType: 'cloche',
    labels: ['Scan', 'View Menu', 'Order'],
  });

  // Script Catchphrase
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = brandDark;
  ctx.font = 'italic 700 42px "Caveat", "Brush Script MT", Georgia, cursive, serif';
  ctx.fillText('Good Food, Good Vibes', leftCenterX, 555);
  ctx.restore();

  // Bottom Wave & Hero Image on Left
  const waveY = height - 280;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, waveY + 80);
  ctx.bezierCurveTo(200, waveY + 90, 500, waveY - 40, 960, waveY + 60);
  ctx.lineTo(960, height);
  ctx.closePath();
  ctx.fillStyle = brandDark;
  ctx.fill();
  ctx.restore();

  if (heroImage) {
    const heroSize = 360;
    const hx = 600;
    const hy = height - heroSize - 40;
    ctx.save();
    ctx.beginPath();
    ctx.arc(hx + heroSize / 2, hy + heroSize / 2, heroSize / 2 - 8, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#FAF6EF';
    ctx.stroke();

    ctx.clip();
    ctx.drawImage(heroImage, hx, hy, heroSize, heroSize);
    ctx.restore();
  }

  // Left Footer
  await drawLayoScanFooter(ctx, {
    cx: 320,
    cy: height - 60,
    badgeW: 360,
    badgeH: 52,
    theme: 'light',
    accentColor: brandDark,
  });

  // 4. Right Section: Large QR Code Presentation (x: 980 -> 1800)
  const rightCenterX = 1380;
  const qrBoxSize = 650;
  const qrBoxX = rightCenterX - qrBoxSize / 2;
  const qrBoxY = 120;
  const qrBoxRadius = 38;

  ctx.save();
  ctx.shadowColor = 'rgba(27, 56, 43, 0.16)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(27, 56, 43, 0.28)';
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
  const codeBoxY = qrBoxY + qrBoxSize + 40; // ~810

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(codeBoxX, codeBoxY, codeBoxW, codeBoxH, 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = 'rgba(27, 56, 43, 0.4)';
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.fillStyle = textMuted;
  ctx.font = '600 18px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('ENTER TABLE CODE MANUALLY:', rightCenterX, codeBoxY + 32);

  ctx.fillStyle = brandDark;
  ctx.font = '700 28px "Space Grotesk", monospace';
  ctx.fillText(tableCodeFormatted, rightCenterX, codeBoxY + 68);

  ctx.fillStyle = textMuted;
  ctx.font = '500 19px Inter, sans-serif';
  ctx.fillText('layoscancustomer.vercel.app', rightCenterX, codeBoxY + codeBoxH + 32);
  ctx.restore();
}
