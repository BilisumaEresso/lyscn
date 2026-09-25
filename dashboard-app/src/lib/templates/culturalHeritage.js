import {
  drawPillBadge,
  drawStepFlowNodes,
  drawLayoScanFooter,
  formatTableCode,
} from '../canvasHelpers';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEMPLATE 5: ENAT (Authentic Ethiopian Cultural Heritage & Traditional Dining)
 * ─────────────────────────────────────────────────────────────────────────────
 * Inspired by traditional Ethiopian Brana (ብራና) parchment manuscripts,
 * royal Habesha Tibeb (ጥበብ) woven textile borders, and authentic
 * Mesob (መሶብ) and Jebena (ጀበና) dining heritage.
 */

// Cultural Palette
const ETH_BURGUNDY = '#781812';   // Deep Royal Crimson / Maroon
const ETH_GOLD     = '#DCA438';   // Ethiopian Imperial Gold
const ETH_UMBER    = '#2D1509';   // Dark Aged Earth / Clay
const ETH_GREEN    = '#1B4D2E';   // Emerald / Highland Green
const ETH_CREAM    = '#FAF3E3';   // Pure Cotton Cream

/**
 * Renders an authentic Ethiopian Brana (ብራና) aged parchment texture
 */
export function drawBranaParchmentBackground(ctx, width, height) {
  // 1. Base organic parchment gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#FAF3E5');
  bgGrad.addColorStop(0.3, '#F5EBDA');
  bgGrad.addColorStop(0.7, '#EFE0C9');
  bgGrad.addColorStop(1, '#E4D0B3');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Antique Vignette (Darkening towards parchment edges)
  const outerVignette = ctx.createRadialGradient(
    width / 2, height / 2, width * 0.35,
    width / 2, height / 2, width * 0.78
  );
  outerVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  outerVignette.addColorStop(0.65, 'rgba(75, 35, 12, 0.05)');
  outerVignette.addColorStop(1, 'rgba(50, 20, 5, 0.22)');
  ctx.fillStyle = outerVignette;
  ctx.fillRect(0, 0, width, height);

  // 3. Subtle tactile goatskin parchment stippling (deterministic micro-grain)
  ctx.save();
  ctx.fillStyle = 'rgba(75, 40, 15, 0.035)';
  for (let y = 15; y < height; y += 42) {
    for (let x = 15; x < width; x += 42) {
      const offset = ((x * 13 + y * 29) % 19) - 9;
      ctx.fillRect(x + offset, y + offset, 2.5, 2.5);
    }
  }
  ctx.restore();
}

/**
 * Draws an authentic Ethiopian Tibeb (ጥልፍ / ጥበብ) geometric woven border.
 * Features traditional interlocking diamond crosses (መስቀል motifs),
 * chevron triangles in gold, burgundy, and emerald, and braided boundary rules.
 */
export function drawAuthenticTibebBorder(ctx, x, y, w, h, thickness = 36) {
  ctx.save();

  // Helper to draw a horizontal or vertical Tibeb woven strip
  const drawStrip = (sx, sy, len, isVertical = false) => {
    ctx.save();
    ctx.translate(sx, sy);
    if (isVertical) {
      ctx.rotate(Math.PI / 2);
    }

    // Outer framing rails (Dark umber leather bounds)
    ctx.fillStyle = ETH_UMBER;
    ctx.fillRect(0, 0, len, 3);
    ctx.fillRect(0, thickness - 3, len, 3);

    // Inner gold braided pinstripes
    ctx.fillStyle = ETH_GOLD;
    ctx.fillRect(0, 3, len, 2);
    ctx.fillRect(0, thickness - 5, len, 2);

    // Band core background (Warm cream textile weave)
    ctx.fillStyle = ETH_CREAM;
    ctx.fillRect(0, 5, len, thickness - 10);

    // Continuous geometric Habesha diamond & cross pattern
    const unitSize = 34;
    const count = Math.floor(len / unitSize);
    const startX = (len - count * unitSize) / 2;

    for (let i = 0; i < count; i++) {
      const bx = startX + i * unitSize;
      const cy = thickness / 2;

      // Outer diamond (Burgundy)
      ctx.beginPath();
      ctx.moveTo(bx + unitSize / 2, cy - 9);
      ctx.lineTo(bx + unitSize - 3, cy);
      ctx.lineTo(bx + unitSize / 2, cy + 9);
      ctx.lineTo(bx + 3, cy);
      ctx.closePath();
      ctx.fillStyle = ETH_BURGUNDY;
      ctx.fill();

      // Middle geometric diamond (Highland Emerald or Gold)
      const isAlt = i % 2 === 0;
      ctx.beginPath();
      ctx.moveTo(bx + unitSize / 2, cy - 5.5);
      ctx.lineTo(bx + unitSize - 7, cy);
      ctx.lineTo(bx + unitSize / 2, cy + 5.5);
      ctx.lineTo(bx + 7, cy);
      ctx.closePath();
      ctx.fillStyle = isAlt ? ETH_GOLD : ETH_GREEN;
      ctx.fill();

      // Central core dot (Cream / Gold)
      ctx.beginPath();
      ctx.arc(bx + unitSize / 2, cy, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = ETH_CREAM;
      ctx.fill();

      // Top & bottom flanking chevron triangles (Gold)
      ctx.fillStyle = ETH_GOLD;
      ctx.beginPath();
      ctx.moveTo(bx + 3, 5);
      ctx.lineTo(bx + 9, 11);
      ctx.lineTo(bx + 15, 5);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(bx + 3, thickness - 5);
      ctx.lineTo(bx + 9, thickness - 11);
      ctx.lineTo(bx + 15, thickness - 5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };

  // 1. Draw 4 perimeter strips
  drawStrip(x, y, w, false);                         // Top
  drawStrip(x, y + h - thickness, w, false);         // Bottom
  drawStrip(x, y, h, true);                          // Left
  drawStrip(x + w - thickness, y, h, true);          // Right

  // 2. Corner Medallions (Traditional Ethiopian Diamond Cross in 4 corners)
  const drawCornerMedallion = (cx, cy) => {
    ctx.save();
    ctx.translate(cx, cy);

    // Umber square block
    ctx.fillStyle = ETH_UMBER;
    ctx.fillRect(-thickness / 2, -thickness / 2, thickness, thickness);

    // Gold diamond
    ctx.beginPath();
    ctx.moveTo(0, -thickness / 2 + 3);
    ctx.lineTo(thickness / 2 - 3, 0);
    ctx.lineTo(0, thickness / 2 - 3);
    ctx.lineTo(-thickness / 2 + 3, 0);
    ctx.closePath();
    ctx.fillStyle = ETH_GOLD;
    ctx.fill();

    // Central burgundy cross
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, 8);
    ctx.moveTo(-8, 0);
    ctx.lineTo(8, 0);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = ETH_BURGUNDY;
    ctx.stroke();

    // Center gold dot
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = ETH_CREAM;
    ctx.fill();

    ctx.restore();
  };

  drawCornerMedallion(x + thickness / 2, y + thickness / 2);
  drawCornerMedallion(x + w - thickness / 2, y + thickness / 2);
  drawCornerMedallion(x + w - thickness / 2, y + h - thickness / 2);
  drawCornerMedallion(x + thickness / 2, y + h - thickness / 2);

  // 3. Delicate inner parchment framing hairline
  const innerInset = thickness + 12;
  ctx.beginPath();
  ctx.rect(x + innerInset, y + innerInset, w - innerInset * 2, h - innerInset * 2);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(120, 24, 18, 0.45)';
  ctx.stroke();

  ctx.restore();
}

/**
 * Traditional Ethiopian Clay Cooking Pot / Dist (ድስት) Emblem
 * Authentic handcrafted clay pot with loop handles, domed lid, and aromatic steam
 */
export function drawTraditionalClayPotEmblem(ctx, cx, cy, size = 110, color = ETH_BURGUNDY) {
  ctx.save();
  ctx.translate(cx, cy);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.068;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const potW = size * 0.72;
  const potH = size * 0.46;

  // Handcrafted rounded clay pot bowl
  ctx.beginPath();
  ctx.moveTo(-potW / 2, -potH * 0.12);
  ctx.lineTo(potW / 2, -potH * 0.12);
  ctx.bezierCurveTo(
    potW * 0.58, potH * 0.78,
    -potW * 0.58, potH * 0.78,
    -potW / 2, -potH * 0.12
  );
  ctx.closePath();
  ctx.stroke();

  // Subtle interior warm clay shadow fill
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fill();
  ctx.restore();

  // Side ear handles (Traditional looped clay ears)
  ctx.beginPath();
  ctx.arc(-potW / 2 - size * 0.07, potH * 0.15, size * 0.13, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(potW / 2 + size * 0.07, potH * 0.15, size * 0.13, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  // Pot lid (Domed clay cover)
  ctx.beginPath();
  ctx.arc(0, -potH * 0.14, potW * 0.44, Math.PI, 0);
  ctx.stroke();

  // Lid top spherical knob
  ctx.beginPath();
  ctx.arc(0, -potH * 0.14 - potW * 0.44 - size * 0.06, size * 0.055, 0, Math.PI * 2);
  ctx.fill();

  // Rising aromatic steam curls (3 graceful wavy tendrils)
  const drawSteamPlume = (sx, sy, h, waveScale) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(
      sx + 8 * waveScale, sy - h * 0.4,
      sx - 8 * waveScale, sy - h * 0.75,
      sx + 3 * waveScale, sy - h
    );
    ctx.lineWidth = size * 0.052;
    ctx.stroke();
  };

  drawSteamPlume(-size * 0.13, -potH * 0.74, size * 0.32, 1);
  drawSteamPlume(0, -potH * 0.8, size * 0.4, -1);
  drawSteamPlume(size * 0.13, -potH * 0.74, size * 0.32, 1);

  ctx.restore();
}

/**
 * Traditional Ethiopian Mesob / Injera Dish Icon (for Step 3)
 */
export function drawMesobStepIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const w = size * 0.76;
  const h = size * 0.52;

  // Base tray
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy + h * 0.28);
  ctx.lineTo(cx + w / 2, cy + h * 0.28);
  ctx.stroke();

  // Mesob conical woven lid
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.42, cy + h * 0.24);
  ctx.bezierCurveTo(cx - w * 0.2, cy - h * 0.3, cx + w * 0.2, cy - h * 0.3, cx + w * 0.42, cy + h * 0.24);
  ctx.stroke();

  // Top knob
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.35, size * 0.06, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 3-Step Instruction Flow Node Row for Traditional Ethiopian Dining
 */
export function drawEthiopianStepFlow(ctx, {
  cx,
  cy,
  color = ETH_BURGUNDY,
  textColor = '#5C3317',
  circleRadius = 38,
  spacing = 220,
}) {
  const nodeCount = 3;
  const startX = cx - ((nodeCount - 1) * spacing) / 2;

  const icons = [
    (x, y) => {
      // Phone Icon
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      const w = 24;
      const h = 38;
      ctx.strokeRect(x - w / 2, y - h / 2, w, h);
      ctx.beginPath();
      ctx.arc(x, y + h / 2 - 5, 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    },
    (x, y) => {
      // Menu Icon
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      const w = 28;
      const h = 36;
      ctx.strokeRect(x - w / 2, y - h / 2, w, h);
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 7);
      ctx.lineTo(x + 8, y - 7);
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x + 8, y);
      ctx.moveTo(x - 8, y + 7);
      ctx.lineTo(x + 8, y + 7);
      ctx.stroke();
      ctx.restore();
    },
    (x, y) => drawMesobStepIcon(ctx, x, y, circleRadius * 1.05, color),
  ];

  const labels = ['Scan', 'View Menu', 'Order'];

  for (let i = 0; i < nodeCount; i++) {
    const nx = startX + i * spacing;
    const ny = cy;

    // Outer Circle with warm golden drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(120, 24, 18, 0.2)';
    ctx.shadowBlur = 14;
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
    ctx.font = '700 20px "Space Grotesk", Inter, sans-serif';
    ctx.fillText(labels[i], nx, ny + circleRadius + 14);
    ctx.restore();

    // Arrow '>' between circles in Ethiopian gold
    if (i < nodeCount - 1) {
      const arrowX = nx + spacing / 2;
      ctx.save();
      ctx.strokeStyle = ETH_GOLD;
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
 * PORTRAIT RENDERER (1200 x 1800)
 */
export async function renderCulturalHeritagePortrait(ctx, {
  table,
  restaurant,
  qrImage,
  logoImage,
  heroImage,
  width = 1200,
  height = 1800,
}) {
  const tableLabel = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // 1. Aged Brana Parchment Background
  drawBranaParchmentBackground(ctx, width, height);

  // 2. Authentic Ethiopian Tibeb Woven Border
  const borderMargin = 22;
  const borderWidth = width - borderMargin * 2;
  const borderHeight = height - borderMargin * 2;
  const bandThickness = 34;
  drawAuthenticTibebBorder(ctx, borderMargin, borderMargin, borderWidth, borderHeight, bandThickness);

  // 3. Header: Traditional Clay Pot Emblem or Custom Brand Logo
  const headerCenterY = 152;
  if (logoImage) {
    const logoSize = 110;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2 + 5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(120, 24, 18, 0.25)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = ETH_BURGUNDY;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, width / 2 - logoSize / 2, headerCenterY - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawTraditionalClayPotEmblem(ctx, width / 2, headerCenterY, 115, ETH_BURGUNDY);
  }

  // 4. Restaurant Title: Regal Traditional Serif
  const restName = restaurant?.name || 'Enat';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = ETH_BURGUNDY;
  ctx.font = '700 64px "Playfair Display", "Times New Roman", Georgia, serif';
  ctx.fillText(restName, width / 2, 252, width - 240);

  // Tagline: 3-dot categories
  const tagline = (restaurant?.description || 'TRADITIONAL FOOD & DRINK').toUpperCase();
  ctx.fillStyle = ETH_UMBER;
  ctx.font = '700 20px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(tagline, width / 2, 290, width - 260);
  ctx.restore();

  // 5. QR Code Card Container (Ivory parchment card with double border)
  const qrBoxSize = 610;
  const qrBoxX = width / 2 - qrBoxSize / 2;
  const qrBoxY = 330;
  const qrBoxRadius = 38;

  ctx.save();
  ctx.shadowColor = 'rgba(45, 21, 9, 0.18)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 10;

  // White base card
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Outer Burgundy Border
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = ETH_BURGUNDY;
  ctx.stroke();

  // Inner Gold Accent Border
  ctx.beginPath();
  ctx.roundRect(qrBoxX + 6, qrBoxY + 6, qrBoxSize - 12, qrBoxSize - 12, qrBoxRadius - 6);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = ETH_GOLD;
  ctx.stroke();
  ctx.restore();

  // Draw QR Image
  if (qrImage) {
    const qrInnerSize = 530;
    const qrInnerX = width / 2 - qrInnerSize / 2;
    const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
    ctx.drawImage(qrImage, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
  }

  // 6. Table Pill Badge: Royal Ethiopian Burgundy with Gold Accent Rule
  const pillW = 380;
  const pillH = 76;
  const pillY = qrBoxY + qrBoxSize + 36; // ~976
  drawPillBadge(ctx, {
    x: width / 2 - pillW / 2,
    y: pillY,
    width: pillW,
    height: pillH,
    bgColor: ETH_BURGUNDY,
    borderColor: ETH_GOLD,
    borderWidth: 2.2,
    text: tableLabel,
    textColor: '#FFFFFF',
    font: '700 42px "Playfair Display", Georgia, serif',
  });

  // 7. 3-Step Instruction Flow Node Row
  const stepsY = pillY + pillH + 68; // ~1120
  drawEthiopianStepFlow(ctx, {
    cx: width / 2,
    cy: stepsY,
    color: ETH_BURGUNDY,
    textColor: ETH_UMBER,
    circleRadius: 36,
    spacing: 215,
  });

  // 8. Script Catchphrase: "Our Culture Your Taste"
  const scriptY = stepsY + 98; // ~1218
  ctx.save();
  ctx.translate(width / 2, scriptY);
  ctx.textAlign = 'center';
  ctx.fillStyle = ETH_BURGUNDY;
  ctx.font = 'italic 700 42px "Playfair Display", "Caveat", Georgia, cursive, serif';
  ctx.fillText('Our Culture Your Taste', 0, 0);
  ctx.restore();

  // 9. Bottom Hero Feast Visual (Traditional Mesob, Injera, Beyaynetu, Jebena)
  if (heroImage) {
    const heroH = 430;
    const heroY = height - heroH - 68;
    const heroX = 58;
    const heroW = width - 116;

    ctx.save();
    // Rounded photo frame
    ctx.beginPath();
    ctx.roundRect(heroX, heroY, heroW, heroH, 30);
    ctx.clip();

    ctx.drawImage(heroImage, heroX, heroY, heroW, heroH);

    // Cultural burgundy gradient banner at the bottom base
    const bottomBand = ctx.createLinearGradient(0, height - 190, 0, height - 68);
    bottomBand.addColorStop(0, 'rgba(120, 24, 18, 0)');
    bottomBand.addColorStop(0.5, 'rgba(120, 24, 18, 0.7)');
    bottomBand.addColorStop(1, ETH_BURGUNDY);
    ctx.fillStyle = bottomBand;
    ctx.fillRect(heroX, height - 190, heroW, 125);

    ctx.restore();
  }

  // 10. Manual Table Code Fallback Pill
  const codeBoxW = 440;
  const codeBoxH = 50;
  const codeBoxX = width / 2 - codeBoxW / 2;
  const codeBoxY = height - 155;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(codeBoxX, codeBoxY, codeBoxW, codeBoxH, 16);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = ETH_BURGUNDY;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ETH_UMBER;
  ctx.font = '700 18px "Space Grotesk", monospace';
  ctx.fillText(`CODE: ${tableCodeFormatted}`, width / 2, codeBoxY + codeBoxH / 2);
  ctx.restore();

  // 11. "Powered by LayoScan" Footer Badge
  await drawLayoScanFooter(ctx, {
    cx: width / 2,
    cy: height - 72,
    badgeW: 380,
    badgeH: 56,
    theme: 'light',
    accentColor: ETH_BURGUNDY,
  });
}

/**
 * LANDSCAPE RENDERER (1800 x 1200) — Mini Table Tent / Counter Stand
 */
export async function renderCulturalHeritageLandscape(ctx, {
  table,
  restaurant,
  qrImage,
  logoImage,
  heroImage,
  width = 1800,
  height = 1200,
}) {
  const tableLabel = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // 1. Aged Brana Parchment Background
  drawBranaParchmentBackground(ctx, width, height);

  // 2. Authentic Tibeb Border
  const borderMargin = 20;
  const borderWidth = width - borderMargin * 2;
  const borderHeight = height - borderMargin * 2;
  const bandThickness = 30;
  drawAuthenticTibebBorder(ctx, borderMargin, borderMargin, borderWidth, borderHeight, bandThickness);

  // 3. Left Section: Brand & Story (x: 0 -> 980)
  const leftCenterX = 480;

  // Header Logo or Clay Pot
  if (logoImage) {
    const logoSize = 100;
    ctx.save();
    ctx.beginPath();
    ctx.arc(leftCenterX, 115, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(120, 24, 18, 0.22)';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = ETH_BURGUNDY;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(leftCenterX, 115, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, leftCenterX - logoSize / 2, 115 - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawTraditionalClayPotEmblem(ctx, leftCenterX, 115, 100, ETH_BURGUNDY);
  }

  // Restaurant Name
  const restName = restaurant?.name || 'Enat';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = ETH_BURGUNDY;
  ctx.font = '700 54px "Playfair Display", Georgia, serif';
  ctx.fillText(restName, leftCenterX, 205, 860);

  // Tagline
  const tagline = (restaurant?.description || 'TRADITIONAL FOOD & DRINK').toUpperCase();
  ctx.fillStyle = ETH_UMBER;
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
    bgColor: ETH_BURGUNDY,
    borderColor: ETH_GOLD,
    borderWidth: 2,
    text: tableLabel,
    textColor: '#FFFFFF',
    font: '700 38px "Playfair Display", Georgia, serif',
  });

  // 3-Step Flow Nodes
  drawEthiopianStepFlow(ctx, {
    cx: leftCenterX,
    cy: 430,
    color: ETH_BURGUNDY,
    textColor: ETH_UMBER,
    circleRadius: 34,
    spacing: 190,
  });

  // Catchphrase
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = ETH_BURGUNDY;
  ctx.font = 'italic 700 42px "Playfair Display", Georgia, serif';
  ctx.fillText('Our Culture, Your Taste', leftCenterX, 555);
  ctx.restore();

  // Bottom Hero Cultural Feast on Left
  if (heroImage) {
    const heroW = 440;
    const heroH = 340;
    const hx = leftCenterX - heroW / 2;
    const hy = height - heroH - 95;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(hx, hy, heroW, heroH, 24);
    ctx.clip();
    ctx.drawImage(heroImage, hx, hy, heroW, heroH);

    const fade = ctx.createLinearGradient(0, hy, 0, hy + 90);
    fade.addColorStop(0, '#EFE0C9');
    fade.addColorStop(1, 'rgba(239, 224, 201, 0)');
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
    accentColor: ETH_BURGUNDY,
  });

  // 4. Right Section: Large QR Code Presentation (x: 980 -> 1800)
  const rightCenterX = 1380;
  const qrBoxSize = 650;
  const qrBoxX = rightCenterX - qrBoxSize / 2;
  const qrBoxY = 120;
  const qrBoxRadius = 38;

  ctx.save();
  ctx.shadowColor = 'rgba(45, 21, 9, 0.22)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 12;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = ETH_BURGUNDY;
  ctx.stroke();

  // Inner gold rule
  ctx.beginPath();
  ctx.roundRect(qrBoxX + 6, qrBoxY + 6, qrBoxSize - 12, qrBoxSize - 12, qrBoxRadius - 6);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = ETH_GOLD;
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
  ctx.strokeStyle = ETH_BURGUNDY;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.fillStyle = ETH_UMBER;
  ctx.font = '600 18px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('ENTER TABLE CODE MANUALLY:', rightCenterX, codeBoxY + 32);

  ctx.fillStyle = ETH_BURGUNDY;
  ctx.font = '700 28px "Space Grotesk", monospace';
  ctx.fillText(tableCodeFormatted, rightCenterX, codeBoxY + 68);

  ctx.fillStyle = '#6B4A3A';
  ctx.font = '500 19px Inter, sans-serif';
  ctx.fillText('layoscancustomer.vercel.app', rightCenterX, codeBoxY + codeBoxH + 32);
  ctx.restore();
}
