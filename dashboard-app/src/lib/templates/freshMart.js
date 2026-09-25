import {
  drawPillBadge,
  drawThemedCodeBadge,
  drawImageCover,
  drawStepFlowNodes,
  drawLayoScanFooter,
  drawBotanicalSprig,
  formatTableCode,
} from '../canvasHelpers';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEMPLATE 3: FRESH EMERALD (Fresh Market, Grocery & Organic Deli)
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

  // Subtle organic texture
  ctx.save();
  ctx.fillStyle = 'rgba(134, 239, 172, 0.025)';
  for (let y = 14; y < height; y += 38) {
    for (let x = 14; x < width; x += 38) {
      ctx.fillRect(x + ((y * 5) % 13), y, 2.5, 2.5);
    }
  }
  ctx.restore();

  // 2. Corner Foliage Sprigs
  drawBotanicalSprig(ctx, 60, 60, 1.15, -0.15, 'rgba(134, 239, 172, 0.3)');
  drawBotanicalSprig(ctx, width - 60, 60, 1.15, Math.PI / 2 + 0.15, 'rgba(134, 239, 172, 0.3)');

  // 3. Header: Sprout Emblem or Custom Brand Logo
  const headerCenterY = 148;
  if (logoImage) {
    const logoSize = 105;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = deepEmerald;
    ctx.shadowColor = 'rgba(134, 239, 172, 0.3)';
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
    drawSproutLeavesLogo(ctx, width / 2, headerCenterY, 105, mintAccent);
  }

  // 4. Restaurant Title: Clean Modern Sans (generous spacing below emblem)
  const restName = restaurant?.name || 'GreenMart';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 54px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(restName, width / 2, 245, width - 200);

  // Tagline: 3-dot categories (cleanly spaced)
  const tagline = (restaurant?.description || 'GROCERY • BAR • DAILY NEEDS').toUpperCase();
  ctx.fillStyle = textMuted;
  ctx.font = '700 21px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(tagline, width / 2, 292, width - 220);
  ctx.restore();

  // 5. QR Code Card Container (balanced 510px size gives vertical air)
  const qrBoxSize = 510;
  const qrBoxX = width / 2 - qrBoxSize / 2;
  const qrBoxY = 345;
  const qrBoxRadius = 32;

  ctx.save();
  ctx.shadowColor = 'rgba(11, 59, 36, 0.4)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(134, 239, 172, 0.45)';
  ctx.stroke();
  ctx.restore();

  // Draw QR Image inside container
  if (qrImage) {
    const qrInnerSize = 440;
    const qrInnerX = width / 2 - qrInnerSize / 2;
    const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
    ctx.drawImage(qrImage, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
  }

  // 6. Table Pill Badge: Soft Pistachio Mint Green
  const pillW = 360;
  const pillH = 64;
  const pillY = qrBoxY + qrBoxSize + 40; // ~895
  drawPillBadge(ctx, {
    x: width / 2 - pillW / 2,
    y: pillY,
    width: pillW,
    height: pillH,
    bgColor: mintAccent,
    text: tableLabel,
    textColor: deepEmerald,
    font: '800 38px "Space Grotesk", Inter, sans-serif',
  });

  // 7. Prominent Table CODE Capsule Badge (Directly below table badge - crisp mint green!)
  const codeY = pillY + pillH + 34; // ~993
  drawThemedCodeBadge(ctx, {
    cx: width / 2,
    cy: codeY,
    code: tableCodeFormatted,
    bgColor: '#041B10',
    borderColor: mintAccent,
    borderWidth: 1.8,
    textColor: mintAccent,
    labelColor: textMuted,
    width: 460,
    height: 50,
    radius: 14,
    shadow: true,
    shadowColor: 'rgba(134, 239, 172, 0.25)',
  });

  // 8. 3-Step Instruction Flow Node Row (generous spacing below code badge)
  const stepsY = codeY + 70; // ~1063
  drawStepFlowNodes(ctx, {
    cx: width / 2,
    cy: stepsY,
    color: mintAccent,
    textColor: textMuted,
    circleRadius: 28,
    spacing: 210,
    orderIconType: 'cart',
    labels: ['Scan', 'View Menu', 'Order'],
  });

  // 9. Script Catchphrase: "Fresh Choices Every Day" (ample breathing space below step labels!)
  const scriptY = stepsY + 98; // ~1161 (label ends at 1103, so 58px of clear space!)
  ctx.save();
  ctx.translate(width / 2, scriptY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'italic 700 44px "Caveat", "Brush Script MT", cursive, sans-serif';
  ctx.fillText('Fresh Choices Every Day', 0, 0);
  ctx.restore();

  // 10. Bottom Hero Harvest Photograph (Undistorted via drawImageCover + feathered seamlessly)
  if (heroImage) {
    const heroH = 390;
    const heroY = height - heroH - 85;

    ctx.save();
    // Rounded frame with drawImageCover
    drawImageCover(ctx, heroImage, 40, heroY, width - 80, heroH, 30);

    // Dark gradient feather overlay on top of photo to blend seamlessly into background
    const topFeather = ctx.createLinearGradient(0, heroY, 0, heroY + 140);
    topFeather.addColorStop(0, deepEmerald);
    topFeather.addColorStop(1, 'rgba(11, 59, 36, 0)');
    ctx.fillStyle = topFeather;
    ctx.beginPath();
    ctx.roundRect(40, heroY, width - 80, 140, [30, 30, 0, 0]);
    ctx.fill();

    ctx.restore();
  }

  // 11. "Powered by LayoScan" Footer Badge (Cleanly anchored, zero collision!)
  await drawLayoScanFooter(ctx, {
    cx: width / 2,
    cy: height - 60,
    badgeW: 390,
    badgeH: 56,
    templateId: 'fresh_mart',
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
  const headerCenterY = 125;
  if (logoImage) {
    const logoSize = 96;
    ctx.save();
    ctx.beginPath();
    ctx.arc(leftCenterX, headerCenterY, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = deepEmerald;
    ctx.shadowColor = 'rgba(134, 239, 172, 0.25)';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = mintAccent;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(leftCenterX, headerCenterY, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, leftCenterX - logoSize / 2, headerCenterY - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawSproutLeavesLogo(ctx, leftCenterX, headerCenterY, 96, mintAccent);
  }

  // Restaurant Name (ample spacing below emblem)
  const restName = restaurant?.name || 'GreenMart';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 50px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(restName, leftCenterX, 218, 860);

  // Tagline (cleanly spaced)
  const tagline = (restaurant?.description || 'GROCERY • BAR • DAILY NEEDS').toUpperCase();
  ctx.fillStyle = textMuted;
  ctx.font = '700 19px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(tagline, leftCenterX, 262, 860);
  ctx.restore();

  // Table Pill Badge
  const pillW = 340;
  const pillH = 62;
  const pillY = 304;
  drawPillBadge(ctx, {
    x: leftCenterX - pillW / 2,
    y: pillY,
    width: pillW,
    height: pillH,
    bgColor: mintAccent,
    text: tableLabel,
    textColor: deepEmerald,
    font: '800 36px "Space Grotesk", Inter, sans-serif',
  });

  // Prominent Table CODE Capsule Badge on Left (Under Table 1 Badge)
  const codeY = pillY + pillH + 30; // ~396
  drawThemedCodeBadge(ctx, {
    cx: leftCenterX,
    cy: codeY,
    code: tableCodeFormatted,
    bgColor: '#041B10',
    borderColor: mintAccent,
    borderWidth: 1.8,
    textColor: mintAccent,
    labelColor: textMuted,
    width: 440,
    height: 48,
    radius: 14,
    shadow: true,
    shadowColor: 'rgba(134, 239, 172, 0.25)',
  });

  // 3-Step Flow Nodes (generous spacing below code badge)
  const stepsY = codeY + 68; // ~464
  drawStepFlowNodes(ctx, {
    cx: leftCenterX,
    cy: stepsY,
    color: mintAccent,
    textColor: textMuted,
    circleRadius: 26,
    spacing: 180,
    orderIconType: 'cart',
    labels: ['Scan', 'View Menu', 'Order'],
  });

  // Script Catchphrase (ample breathing space below step labels - zero overlap!)
  const scriptY = stepsY + 92; // ~556 (step labels end at 502, 54px clear space!)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'italic 700 42px "Caveat", "Brush Script MT", cursive, sans-serif';
  ctx.fillText('Fresh Choices Every Day', leftCenterX, scriptY);
  ctx.restore();

  // Bottom Hero Image on Left if available
  if (heroImage) {
    const heroSize = 350;
    const hx = 580;
    const hy = height - heroSize - 70;
    ctx.save();
    ctx.beginPath();
    ctx.arc(hx + heroSize / 2, hy + heroSize / 2, heroSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#041B10';
    ctx.shadowColor = 'rgba(134, 239, 172, 0.3)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    ctx.fill();

    // Photo clipped to circle with object-fit cover
    drawImageCover(ctx, heroImage, hx, hy, heroSize, heroSize, heroSize / 2);

    ctx.beginPath();
    ctx.arc(hx + heroSize / 2, hy + heroSize / 2, heroSize / 2, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = mintAccent;
    ctx.stroke();
    ctx.restore();
  }

  // Left Footer
  await drawLayoScanFooter(ctx, {
    cx: 320,
    cy: height - 55,
    badgeW: 360,
    badgeH: 52,
    templateId: 'fresh_mart',
    theme: 'dark',
    accentColor: mintAccent,
  });

  // 4. Right Section: Large QR Code Presentation (x: 980 -> 1800)
  const rightCenterX = 1380;
  const qrBoxSize = 560;
  const qrBoxX = rightCenterX - qrBoxSize / 2;
  const qrBoxY = 110;
  const qrBoxRadius = 36;

  ctx.save();
  ctx.shadowColor = 'rgba(11, 59, 36, 0.4)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(134, 239, 172, 0.45)';
  ctx.stroke();
  ctx.restore();

  if (qrImage) {
    const qrInnerSize = 490;
    const qrInnerX = rightCenterX - qrInnerSize / 2;
    const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
    ctx.drawImage(qrImage, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
  }

  // Scan Callout below QR
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = mintAccent;
  ctx.font = '700 22px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('POINT CAMERA TO SCAN OR ORDER', rightCenterX, qrBoxY + qrBoxSize + 36);
  ctx.restore();

  // Under QR: Prominent Manual Table Code Box
  const codeBoxW = 560;
  const codeBoxH = 92;
  const codeBoxX = rightCenterX - codeBoxW / 2;
  const codeBoxY = qrBoxY + qrBoxSize + 60; // ~730

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(codeBoxX, codeBoxY, codeBoxW, codeBoxH, 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = 'rgba(134, 239, 172, 0.5)';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#065F46';
  ctx.font = '700 17px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('ENTER TABLE CODE MANUALLY:', rightCenterX, codeBoxY + 30);

  ctx.fillStyle = deepEmerald;
  ctx.font = '800 32px "Space Grotesk", monospace';
  ctx.fillText(tableCodeFormatted, rightCenterX, codeBoxY + 65);
  ctx.restore();

  // Web address link
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textMuted;
  ctx.font = '600 20px Inter, sans-serif';
  ctx.fillText('🌐 layoscancustomer.vercel.app', rightCenterX, codeBoxY + codeBoxH + 34);
  ctx.restore();

  // Right Footer (matching left side)
  await drawLayoScanFooter(ctx, {
    cx: rightCenterX,
    cy: height - 55,
    badgeW: 360,
    badgeH: 52,
    templateId: 'fresh_mart',
    theme: 'dark',
    accentColor: mintAccent,
  });
}
