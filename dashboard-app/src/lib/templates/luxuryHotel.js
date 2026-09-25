import {
  drawPillBadge,
  drawThemedCodeBadge,
  drawImageCover,
  drawStepFlowNodes,
  drawLayoScanFooter,
  formatTableCode,
} from '../canvasHelpers';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEMPLATE 4: MIDNIGHT GOLD (Luxury Hotel, Suite & Fine Dining)
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

  // 2. Full Luxury Architectural Gold Framing with Corner Medallions
  ctx.save();
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  // Inner delicate hairline
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(46, 46, width - 92, height - 92);

  // 4 Corner Gold Medallions
  const drawGoldCorner = (cx, cy) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = goldAccent;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = goldAccent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };
  drawGoldCorner(46, 46);
  drawGoldCorner(width - 46, 46);
  drawGoldCorner(width - 46, height - 46);
  drawGoldCorner(46, height - 46);
  ctx.restore();

  // 3. Header: Architectural Crown or Custom Brand Logo
  const headerCenterY = 148;
  if (logoImage) {
    const logoSize = 105;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = midnightNavy;
    ctx.shadowColor = 'rgba(229, 197, 131, 0.35)';
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
    drawArchitecturalCrownLogo(ctx, width / 2, headerCenterY, 105, goldAccent);
  }

  // 4. Restaurant Title: Refined Serif (ample spacing below crown)
  const restName = restaurant?.name || 'SkyView Hotel';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 54px "Playfair Display", Georgia, serif';
  ctx.fillText(restName, width / 2, 245, width - 200);

  // Tagline: 3-dot categories (cleanly spaced)
  const tagline = (restaurant?.description || 'STAY • DINE • RELAX').toUpperCase();
  ctx.fillStyle = goldAccent;
  ctx.font = '700 21px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(tagline, width / 2, 292, width - 220);
  ctx.restore();

  // 5. QR Code Card Container (balanced 510px size gives vertical air)
  const qrBoxSize = 510;
  const qrBoxX = width / 2 - qrBoxSize / 2;
  const qrBoxY = 345;
  const qrBoxRadius = 32;

  ctx.save();
  ctx.shadowColor = 'rgba(229, 197, 131, 0.3)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 8;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.55)';
  ctx.stroke();
  ctx.restore();

  // Draw QR Image inside container
  if (qrImage) {
    const qrInnerSize = 440;
    const qrInnerX = width / 2 - qrInnerSize / 2;
    const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
    ctx.drawImage(qrImage, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
  }

  // 6. Table Pill Badge: Brushed Champagne Gold
  const pillW = 360;
  const pillH = 64;
  const pillY = qrBoxY + qrBoxSize + 40; // ~895
  drawPillBadge(ctx, {
    x: width / 2 - pillW / 2,
    y: pillY,
    width: pillW,
    height: pillH,
    bgColor: goldAccent,
    text: tableLabel,
    textColor: midnightNavy,
    font: '700 38px "Playfair Display", Georgia, serif',
  });

  // 7. Prominent Table CODE Capsule Badge (Directly below table badge - champagne gold!)
  const codeY = pillY + pillH + 34; // ~993
  drawThemedCodeBadge(ctx, {
    cx: width / 2,
    cy: codeY,
    code: tableCodeFormatted,
    bgColor: '#060E1C',
    borderColor: goldAccent,
    borderWidth: 1.8,
    textColor: goldAccent,
    labelColor: textMuted,
    width: 460,
    height: 50,
    radius: 14,
    shadow: true,
    shadowColor: 'rgba(229, 197, 131, 0.3)',
  });

  // 8. 3-Step Instruction Flow Node Row (generous spacing below code badge)
  const stepsY = codeY + 70; // ~1063
  drawStepFlowNodes(ctx, {
    cx: width / 2,
    cy: stepsY,
    color: goldAccent,
    textColor: textMuted,
    circleRadius: 28,
    spacing: 210,
    orderIconType: 'cloche',
    labels: ['Scan', 'View Menu', 'Order'],
  });

  // 9. Script Catchphrase: "Comfort in Every Stay" (ample breathing space below step labels!)
  const scriptY = stepsY + 98; // ~1161 (label ends at 1103, so 58px of clear space!)
  ctx.save();
  ctx.translate(width / 2, scriptY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = goldAccent;
  ctx.font = 'italic 700 44px "Playfair Display", "Caveat", Georgia, cursive, serif';
  ctx.fillText('Comfort in Every Stay', 0, 0);
  ctx.restore();

  // 10. Bottom Hero Suite Photograph (Undistorted via drawImageCover + feathered seamlessly)
  if (heroImage) {
    const heroH = 390;
    const heroY = height - heroH - 85;

    ctx.save();
    // Rounded frame with drawImageCover
    drawImageCover(ctx, heroImage, 40, heroY, width - 80, heroH, 30);

    // Dark gradient feather overlay on top of photo to blend into midnight blue
    const topFeather = ctx.createLinearGradient(0, heroY, 0, heroY + 140);
    topFeather.addColorStop(0, '#0B172C');
    topFeather.addColorStop(1, 'rgba(11, 23, 44, 0)');
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
  const headerCenterY = 125;
  if (logoImage) {
    const logoSize = 96;
    ctx.save();
    ctx.beginPath();
    ctx.arc(leftCenterX, headerCenterY, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = midnightNavy;
    ctx.shadowColor = 'rgba(229, 197, 131, 0.25)';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = goldAccent;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(leftCenterX, headerCenterY, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, leftCenterX - logoSize / 2, headerCenterY - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawArchitecturalCrownLogo(ctx, leftCenterX, headerCenterY, 96, goldAccent);
  }

  // Restaurant Name (ample spacing below emblem)
  const restName = restaurant?.name || 'SkyView Hotel';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 50px "Playfair Display", Georgia, serif';
  ctx.fillText(restName, leftCenterX, 218, 860);

  // Tagline (cleanly spaced)
  const tagline = (restaurant?.description || 'STAY • DINE • RELAX').toUpperCase();
  ctx.fillStyle = goldAccent;
  ctx.font = '600 19px "Space Grotesk", Inter, sans-serif';
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
    bgColor: goldAccent,
    text: tableLabel,
    textColor: midnightNavy,
    font: '700 36px "Playfair Display", Georgia, serif',
  });

  // Prominent Table CODE Capsule Badge on Left (Under Table 1 Badge)
  const codeY = pillY + pillH + 30; // ~396
  drawThemedCodeBadge(ctx, {
    cx: leftCenterX,
    cy: codeY,
    code: tableCodeFormatted,
    bgColor: '#060E1C',
    borderColor: goldAccent,
    borderWidth: 1.8,
    textColor: goldAccent,
    labelColor: textMuted,
    width: 440,
    height: 48,
    radius: 14,
    shadow: true,
    shadowColor: 'rgba(229, 197, 131, 0.25)',
  });

  // 3-Step Flow Nodes (generous spacing below code badge)
  const stepsY = codeY + 68; // ~464
  drawStepFlowNodes(ctx, {
    cx: leftCenterX,
    cy: stepsY,
    color: goldAccent,
    textColor: textMuted,
    circleRadius: 26,
    spacing: 180,
    orderIconType: 'cloche',
    labels: ['Scan', 'View Menu', 'Order'],
  });

  // Script Catchphrase (ample breathing space below step labels - zero overlap!)
  const scriptY = stepsY + 92; // ~556 (step labels end at 502, 54px clear space!)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = goldAccent;
  ctx.font = 'italic 700 42px "Playfair Display", Georgia, serif';
  ctx.fillText('Comfort in Every Stay', leftCenterX, scriptY);
  ctx.restore();

  // Bottom Hero Image on Left if available
  if (heroImage) {
    const heroSize = 350;
    const hx = 580;
    const hy = height - heroSize - 70;
    ctx.save();
    ctx.beginPath();
    ctx.arc(hx + heroSize / 2, hy + heroSize / 2, heroSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#060E1C';
    ctx.shadowColor = 'rgba(229, 197, 131, 0.3)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    ctx.fill();

    // Photo clipped to circle with object-fit cover
    drawImageCover(ctx, heroImage, hx, hy, heroSize, heroSize, heroSize / 2);

    ctx.beginPath();
    ctx.arc(hx + heroSize / 2, hy + heroSize / 2, heroSize / 2, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = goldAccent;
    ctx.stroke();
    ctx.restore();
  }

  // Left Footer
  await drawLayoScanFooter(ctx, {
    cx: 320,
    cy: height - 55,
    badgeW: 360,
    badgeH: 52,
    theme: 'dark',
    accentColor: goldAccent,
  });

  // 4. Right Section: Large QR Code Presentation (x: 980 -> 1800)
  const rightCenterX = 1380;
  const qrBoxSize = 560;
  const qrBoxX = rightCenterX - qrBoxSize / 2;
  const qrBoxY = 110;
  const qrBoxRadius = 36;

  ctx.save();
  ctx.shadowColor = 'rgba(229, 197, 131, 0.28)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.5)';
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
  ctx.fillStyle = goldAccent;
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
  ctx.strokeStyle = goldAccent;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#64748B';
  ctx.font = '700 17px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('ENTER TABLE / ROOM CODE MANUALLY:', rightCenterX, codeBoxY + 30);

  ctx.fillStyle = midnightNavy;
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
    theme: 'dark',
    accentColor: goldAccent,
  });
}
