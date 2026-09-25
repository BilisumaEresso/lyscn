import {
  drawBotanicalSprig,
  drawCoffeeCupEmblem,
  drawPillBadge,
  drawThemedCodeBadge,
  drawImageCover,
  drawStepFlowNodes,
  drawLayoScanFooter,
  formatTableCode,
} from '../canvasHelpers';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEMPLATE 1: ARTISAN LINEN (Artisanal Coffee, Bakery & Roastery)
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
  const textMuted = '#415349';
  const tableLabel = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // 1. Warm Tactile Linen Parchment Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#FAF6EF');
  bgGrad.addColorStop(0.5, '#F4EDE1');
  bgGrad.addColorStop(1, '#ECE2D2');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle linen micro-texture
  ctx.save();
  ctx.fillStyle = 'rgba(27, 56, 43, 0.025)';
  for (let y = 12; y < height; y += 36) {
    for (let x = 12; x < width; x += 36) {
      ctx.fillRect(x + ((y * 7) % 11), y, 2, 2);
    }
  }
  ctx.restore();

  // 2. Corner Botanical Sprigs
  drawBotanicalSprig(ctx, 60, 60, 1.15, -0.15, 'rgba(27, 56, 43, 0.35)');
  drawBotanicalSprig(ctx, width - 60, 60, 1.15, Math.PI / 2 + 0.15, 'rgba(27, 56, 43, 0.35)');

  // 3. Header: Emblem or Custom Restaurant Logo
  const headerCenterY = 148;
  if (logoImage) {
    const logoSize = 105;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(27, 56, 43, 0.18)';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = 'rgba(27, 56, 43, 0.4)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, width / 2 - logoSize / 2, headerCenterY - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawCoffeeCupEmblem(ctx, width / 2, headerCenterY, 105, brandDark);
  }

  // 4. Restaurant Title (generous spacing below emblem)
  const restName = restaurant?.name || 'Elili Cafe';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = brandDark;
  ctx.font = '700 54px "Playfair Display", "Times New Roman", Georgia, serif';
  ctx.fillText(restName, width / 2, 245, width - 200);

  // Tagline: 3-dot categories (cleanly spaced)
  const tagline = (restaurant?.description || 'GOOD FOOD • GREAT COFFEE • BETTER DAYS').toUpperCase();
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
  ctx.shadowColor = 'rgba(27, 56, 43, 0.16)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 8;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.lineWidth = 2.2;
  ctx.strokeStyle = 'rgba(27, 56, 43, 0.28)';
  ctx.stroke();
  ctx.restore();

  // Draw QR Image inside container
  if (qrImage) {
    const qrInnerSize = 440;
    const qrInnerX = width / 2 - qrInnerSize / 2;
    const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
    ctx.drawImage(qrImage, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
  }

  // 6. Table Pill Badge (clean separation below QR box)
  const pillW = 360;
  const pillH = 64;
  const pillY = qrBoxY + qrBoxSize + 40; // ~895
  drawPillBadge(ctx, {
    x: width / 2 - pillW / 2,
    y: pillY,
    width: pillW,
    height: pillH,
    bgColor: brandDark,
    text: tableLabel,
    textColor: '#FFFFFF',
    font: '700 38px "Playfair Display", Georgia, serif',
  });

  // 7. Prominent Table CODE Capsule Badge (Directly below table badge)
  const codeY = pillY + pillH + 34; // ~993
  drawThemedCodeBadge(ctx, {
    cx: width / 2,
    cy: codeY,
    code: tableCodeFormatted,
    bgColor: '#FFFFFF',
    borderColor: 'rgba(27, 56, 43, 0.35)',
    borderWidth: 1.8,
    textColor: brandDark,
    labelColor: textMuted,
    width: 460,
    height: 50,
    radius: 14,
    shadow: true,
  });

  // 8. 3-Step Instruction Flow Node Row (generous 54px spacing below code badge)
  const stepsY = codeY + 70; // ~1063
  drawStepFlowNodes(ctx, {
    cx: width / 2,
    cy: stepsY,
    color: brandDark,
    textColor: textMuted,
    circleRadius: 28,
    spacing: 210,
    orderIconType: 'cloche',
    labels: ['Scan', 'View Menu', 'Order'],
  });

  // 9. Script Catchphrase: "Good Food, Good Vibes" (ample breathing space below step labels!)
  const scriptY = stepsY + 98; // ~1161 (label ends at 1103, so 58px of clear space!)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = brandDark;
  ctx.font = 'italic 700 44px "Caveat", "Brush Script MT", Georgia, cursive, serif';
  ctx.fillText('Good Food, Good Vibes', width / 2, scriptY);
  ctx.restore();

  // 10. Bottom Hero Coffee Art Visual & Sweeping Green Wave
  const waveTopY = height - 490; // ~1310

  // Sweeping fluid organic wave in deep forest green
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, waveTopY + 140);
  ctx.bezierCurveTo(
    width * 0.25, waveTopY + 160,
    width * 0.48, waveTopY - 10,
    width, waveTopY + 70
  );
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fillStyle = brandDark;
  ctx.fill();
  ctx.restore();

  // Draw Coffee Latte Hero photo using drawImageCover (zero distortion!)
  if (heroImage) {
    const heroSize = 400;
    const heroX = width - heroSize - 35;
    const heroY = height - heroSize - 100;

    ctx.save();
    // Shadow ring
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.beginPath();
    ctx.arc(heroX + heroSize / 2, heroY + heroSize / 2, heroSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Photo inside circular mask
    drawImageCover(ctx, heroImage, heroX, heroY, heroSize, heroSize, heroSize / 2);

    // Decorative ring stroke
    ctx.beginPath();
    ctx.arc(heroX + heroSize / 2, heroY + heroSize / 2, heroSize / 2, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#FAF6EF';
    ctx.stroke();
    ctx.restore();
  }

  // 11. "Powered by LayoScan" Footer Badge (Cleanly anchored, zero collision!)
  await drawLayoScanFooter(ctx, {
    cx: width / 2,
    cy: height - 60,
    badgeW: 390,
    badgeH: 56,
    templateId: 'cafe_artisan',
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
  const headerCenterY = 125;
  if (logoImage) {
    const logoSize = 96;
    ctx.save();
    ctx.beginPath();
    ctx.arc(leftCenterX, headerCenterY, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(27, 56, 43, 0.14)';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(27, 56, 43, 0.35)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(leftCenterX, headerCenterY, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, leftCenterX - logoSize / 2, headerCenterY - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawCoffeeCupEmblem(ctx, leftCenterX, headerCenterY, 96, brandDark);
  }

  // Restaurant Name (ample spacing below emblem)
  const restName = restaurant?.name || 'Elili Cafe';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = brandDark;
  ctx.font = '700 50px "Playfair Display", Georgia, serif';
  ctx.fillText(restName, leftCenterX, 218, 860);

  // Tagline (cleanly spaced)
  const tagline = (restaurant?.description || 'GOOD FOOD • GREAT COFFEE • BETTER DAYS').toUpperCase();
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
    bgColor: brandDark,
    text: tableLabel,
    textColor: '#FFFFFF',
    font: '700 36px "Playfair Display", Georgia, serif',
  });

  // Prominent Table CODE Capsule Badge on Left (Under Table 1 Badge)
  const codeY = pillY + pillH + 30; // ~396
  drawThemedCodeBadge(ctx, {
    cx: leftCenterX,
    cy: codeY,
    code: tableCodeFormatted,
    bgColor: '#FFFFFF',
    borderColor: 'rgba(27, 56, 43, 0.35)',
    borderWidth: 1.8,
    textColor: brandDark,
    labelColor: textMuted,
    width: 440,
    height: 48,
    radius: 14,
    shadow: true,
  });

  // 3-Step Flow Nodes (generous spacing below code badge)
  const stepsY = codeY + 68; // ~464
  drawStepFlowNodes(ctx, {
    cx: leftCenterX,
    cy: stepsY,
    color: brandDark,
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
  ctx.fillStyle = brandDark;
  ctx.font = 'italic 700 42px "Caveat", "Brush Script MT", Georgia, cursive, serif';
  ctx.fillText('Good Food, Good Vibes', leftCenterX, scriptY);
  ctx.restore();

  // Bottom Wave & Hero Image on Left
  const waveY = height - 460;
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
    const heroSize = 350;
    const hx = 580;
    const hy = height - heroSize - 70;
    ctx.save();
    ctx.beginPath();
    ctx.arc(hx + heroSize / 2, hy + heroSize / 2, heroSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    ctx.fill();

    // Photo clipped to circle with object-fit cover
    drawImageCover(ctx, heroImage, hx, hy, heroSize, heroSize, heroSize / 2);

    ctx.beginPath();
    ctx.arc(hx + heroSize / 2, hy + heroSize / 2, heroSize / 2, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#FAF6EF';
    ctx.stroke();
    ctx.restore();
  }

  // Left Footer
  await drawLayoScanFooter(ctx, {
    cx: 320,
    cy: height - 55,
    badgeW: 360,
    badgeH: 52,
    templateId: 'cafe_artisan',
    theme: 'light',
    accentColor: brandDark,
  });

  // 4. Right Section: Large QR Code Presentation (x: 980 -> 1800)
  const rightCenterX = 1380;
  const qrBoxSize = 560;
  const qrBoxX = rightCenterX - qrBoxSize / 2;
  const qrBoxY = 110;
  const qrBoxRadius = 36;

  ctx.save();
  ctx.shadowColor = 'rgba(27, 56, 43, 0.16)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(27, 56, 43, 0.28)';
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
  ctx.fillStyle = brandDark;
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
  ctx.strokeStyle = 'rgba(27, 56, 43, 0.35)';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textMuted;
  ctx.font = '700 17px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('ENTER TABLE CODE MANUALLY:', rightCenterX, codeBoxY + 30);

  ctx.fillStyle = brandDark;
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
    templateId: 'cafe_artisan',
    theme: 'light',
    accentColor: brandDark,
  });
}
