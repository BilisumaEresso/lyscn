import defaultBgImg from '../../assets/templates/liquor_bg.jpg';
import defaultHeroImg from '../../assets/templates/liquor_bar_hero.jpg';
import {
  loadImage,
  drawPillBadge,
  drawThemedCodeBadge,
  drawImageCover,
  drawLayoScanFooter,
  formatTableCode,
} from '../canvasHelpers';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEMPLATE 6: VELVET LOUNGE (Liquor, Bar, Nightclub & Speakeasy)
 * ─────────────────────────────────────────────────────────────────────────────
 * Aesthetic: Luxurious dark moody bar atmosphere with warm amber bokeh,
 * whiskey/cocktail glassware, gold L-bracket QR framing, beer & cocktail
 * line emblem, and high-contrast table badges for dim lounge lighting.
 */

/**
 * Draw stylized tropical palm sprig peeking from the top-left corner
 */
export function drawLoungePalmSprig(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Central stem
  ctx.strokeStyle = '#1E3D2C';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-15, -25);
  ctx.quadraticCurveTo(45, 45, 80, 125);
  ctx.stroke();

  // Leaf fronds radiating out
  const drawFrond = (ox, oy, angle, length, width, color) => {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(width, length * 0.45, 0, length);
    ctx.quadraticCurveTo(-width, length * 0.45, 0, 0);
    ctx.fillStyle = color;
    ctx.fill();

    // Frond center rib
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(0, length * 0.88);
    ctx.stroke();
    ctx.restore();
  };

  drawFrond(8, 8, 0.35, 75, 20, '#193626');
  drawFrond(24, 32, 0.62, 85, 22, '#214732');
  drawFrond(42, 60, 0.88, 92, 24, '#27533B');
  drawFrond(60, 90, 1.15, 82, 21, '#1E422E');
  drawFrond(18, 16, -0.22, 62, 18, '#152E20');
  drawFrond(32, 42, -0.04, 74, 20, '#1B3B29');
  drawFrond(48, 70, 0.18, 70, 19, '#183525');

  ctx.restore();
}

/**
 * Draw Beer Mug + Martini Glass duo emblem with radiant rays
 */
export function drawBarHeaderEmblem(ctx, cx, cy, size = 90, color = '#E5C583') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.045;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const scale = size / 90;

  // 1. Radiant rays at top
  ctx.beginPath();
  // Center ray
  ctx.moveTo(0, -38 * scale);
  ctx.lineTo(0, -48 * scale);
  // Left ray
  ctx.moveTo(-14 * scale, -34 * scale);
  ctx.lineTo(-21 * scale, -43 * scale);
  // Right ray
  ctx.moveTo(14 * scale, -34 * scale);
  ctx.lineTo(21 * scale, -43 * scale);
  ctx.stroke();

  // 2. Beer Mug (Left side)
  const bx = -16 * scale;
  const by = 2 * scale;
  const bw = 24 * scale;
  const bh = 30 * scale;

  // Foam bubbles on top of mug
  ctx.beginPath();
  ctx.arc(bx - 6 * scale, by - bh / 2, 6 * scale, Math.PI, 0);
  ctx.arc(bx + 4 * scale, by - bh / 2 - 2 * scale, 7 * scale, Math.PI, 0);
  ctx.arc(bx + 12 * scale, by - bh / 2, 5 * scale, Math.PI, 0);
  ctx.stroke();

  // Mug Body
  ctx.beginPath();
  ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, [0, 0, 4 * scale, 4 * scale]);
  ctx.stroke();

  // Vertical foam/liquid ridges
  ctx.beginPath();
  ctx.moveTo(bx - 4 * scale, by - bh / 2 + 5 * scale);
  ctx.lineTo(bx - 4 * scale, by + bh / 2 - 4 * scale);
  ctx.moveTo(bx + 4 * scale, by - bh / 2 + 5 * scale);
  ctx.lineTo(bx + 4 * scale, by + bh / 2 - 4 * scale);
  ctx.stroke();

  // Mug Handle (on left)
  ctx.beginPath();
  ctx.arc(bx - bw / 2, by, 8 * scale, Math.PI * 0.5, Math.PI * 1.5, false);
  ctx.stroke();

  // 3. Martini Glass (Right side)
  const mx = 18 * scale;
  const my = -2 * scale;

  // Triangular bowl
  ctx.beginPath();
  ctx.moveTo(mx - 18 * scale, my - 12 * scale);
  ctx.lineTo(mx + 18 * scale, my - 12 * scale);
  ctx.lineTo(mx, my + 14 * scale);
  ctx.closePath();
  ctx.stroke();

  // Stem
  ctx.beginPath();
  ctx.moveTo(mx, my + 14 * scale);
  ctx.lineTo(mx, my + 34 * scale);
  ctx.stroke();

  // Base
  ctx.beginPath();
  ctx.moveTo(mx - 12 * scale, my + 34 * scale);
  ctx.lineTo(mx + 12 * scale, my + 34 * scale);
  ctx.stroke();

  // Olive with toothpick skewer
  ctx.beginPath();
  ctx.moveTo(mx - 14 * scale, my - 16 * scale);
  ctx.lineTo(mx + 6 * scale, my + 4 * scale);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(mx - 2 * scale, my - 4 * scale, 3.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw decorative gold L-shaped brackets around the QR Code container
 */
export function drawGoldBracketFrame(ctx, x, y, size, bracketLen = 44, color = '#E5C583', lineWidth = 3.6, offset = 14) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const left = x - offset;
  const right = x + size + offset;
  const top = y - offset;
  const bottom = y + size + offset;

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(left, top + bracketLen);
  ctx.lineTo(left, top);
  ctx.lineTo(left + bracketLen, top);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(right - bracketLen, top);
  ctx.lineTo(right, top);
  ctx.lineTo(right, top + bracketLen);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(left, bottom - bracketLen);
  ctx.lineTo(left, bottom);
  ctx.lineTo(left + bracketLen, bottom);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(right - bracketLen, bottom);
  ctx.lineTo(right, bottom);
  ctx.lineTo(right, bottom - bracketLen);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw "SCAN TO ORDER" callout with phone icon and flanking horizontal rules
 */
export function drawScanToOrderCallout(ctx, cx, cy, color = '#E5C583') {
  ctx.save();

  // Text measurement
  ctx.font = '700 20px "Space Grotesk", Inter, sans-serif';
  const label = 'SCAN TO ORDER';
  const textW = ctx.measureText(label).width;

  // Phone Icon metrics
  const phoneW = 16;
  const phoneH = 26;
  const phoneX = cx - (textW + phoneW + 16) / 2;
  const textX = phoneX + phoneW + 14;

  // Phone Outline
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.roundRect(phoneX, cy - phoneH / 2, phoneW, phoneH, 3.5);
  ctx.stroke();

  // Phone Screen bar & home dot
  ctx.beginPath();
  ctx.moveTo(phoneX + 4, cy - phoneH / 2 + 4);
  ctx.lineTo(phoneX + phoneW - 4, cy - phoneH / 2 + 4);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(phoneX + phoneW / 2, cy + phoneH / 2 - 4.5, 1.2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Text
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(label, textX, cy);

  // Flanking rules
  const ruleLen = 110;
  const gap = 24;
  const leftEnd = phoneX - gap;
  const rightStart = textX + textW + gap;

  ctx.strokeStyle = 'rgba(229, 197, 131, 0.5)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(leftEnd - ruleLen, cy);
  ctx.lineTo(leftEnd, cy);
  ctx.moveTo(rightStart, cy);
  ctx.lineTo(rightStart + ruleLen, cy);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw the 5 bar category circular nodes:
 * 1. Beer, 2. Cocktails, 3. Spirits, 4. Wine, 5. Snacks
 */
export function drawBarCategoriesRow(ctx, cx, cy, color = '#E5C583', textColor = '#D6D3D1') {
  const categories = [
    { label: 'Beer', icon: 'beer' },
    { label: 'Cocktails', icon: 'cocktails' },
    { label: 'Spirits', icon: 'spirits' },
    { label: 'Wine', icon: 'wine' },
    { label: 'Snacks', icon: 'snacks' },
  ];

  const count = categories.length;
  const spacing = 110;
  const totalW = (count - 1) * spacing;
  const startX = cx - totalW / 2;
  const circleRadius = 24;

  ctx.save();
  categories.forEach((cat, index) => {
    const nodeX = startX + index * spacing;

    // Node Circle
    ctx.beginPath();
    ctx.arc(nodeX, cy, circleRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(18, 14, 11, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(229, 197, 131, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Node Vector Icon
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (cat.icon === 'beer') {
      // Mini beer mug
      ctx.beginPath();
      ctx.roundRect(nodeX - 6, cy - 8, 12, 16, 2);
      ctx.stroke();
      // Handle
      ctx.beginPath();
      ctx.arc(nodeX - 6, cy, 4, Math.PI * 0.5, Math.PI * 1.5, false);
      ctx.stroke();
      // Foam top
      ctx.beginPath();
      ctx.arc(nodeX - 2, cy - 8, 3, Math.PI, 0);
      ctx.arc(nodeX + 3, cy - 8, 3, Math.PI, 0);
      ctx.stroke();
    } else if (cat.icon === 'cocktails') {
      // Martini glass
      ctx.beginPath();
      ctx.moveTo(nodeX - 9, cy - 7);
      ctx.lineTo(nodeX + 9, cy - 7);
      ctx.lineTo(nodeX, cy + 4);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(nodeX, cy + 4);
      ctx.lineTo(nodeX, cy + 10);
      ctx.moveTo(nodeX - 6, cy + 10);
      ctx.lineTo(nodeX + 6, cy + 10);
      ctx.stroke();
      // Olive dot
      ctx.beginPath();
      ctx.arc(nodeX, cy - 3, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (cat.icon === 'spirits') {
      // Liquor bottle
      ctx.beginPath();
      // Neck
      ctx.moveTo(nodeX - 2.5, cy - 10);
      ctx.lineTo(nodeX + 2.5, cy - 10);
      ctx.lineTo(nodeX + 2.5, cy - 4);
      // Body
      ctx.lineTo(nodeX + 6, cy - 1);
      ctx.lineTo(nodeX + 6, cy + 10);
      ctx.lineTo(nodeX - 6, cy + 10);
      ctx.lineTo(nodeX - 6, cy - 1);
      ctx.lineTo(nodeX - 2.5, cy - 4);
      ctx.closePath();
      ctx.stroke();
      // Label line
      ctx.beginPath();
      ctx.moveTo(nodeX - 4, cy + 4);
      ctx.lineTo(nodeX + 4, cy + 4);
      ctx.stroke();
    } else if (cat.icon === 'wine') {
      // Wine glass
      ctx.beginPath();
      ctx.moveTo(nodeX - 6, cy - 8);
      ctx.bezierCurveTo(nodeX - 8, cy + 2, nodeX + 8, cy + 2, nodeX + 6, cy - 8);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(nodeX, cy + 2);
      ctx.lineTo(nodeX, cy + 10);
      ctx.moveTo(nodeX - 6, cy + 10);
      ctx.lineTo(nodeX + 6, cy + 10);
      ctx.stroke();
    } else if (cat.icon === 'snacks') {
      // Snack Bowl
      ctx.beginPath();
      ctx.arc(nodeX, cy + 1, 9, 0, Math.PI, false);
      ctx.closePath();
      ctx.stroke();
      // Snack pieces
      ctx.beginPath();
      ctx.arc(nodeX - 4, cy - 1, 2, 0, Math.PI * 2);
      ctx.arc(nodeX, cy - 3, 2.2, 0, Math.PI * 2);
      ctx.arc(nodeX + 4, cy - 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.font = '600 16px "Space Grotesk", Inter, sans-serif';
    ctx.fillText(cat.label, nodeX, cy + 38);
  });
  ctx.restore();
}

/**
 * Draw custom Table Pill Badge with Martini Icon on the left
 */
export function drawBarTablePill(ctx, { cx, cy, width = 380, height = 64, tableLabel = 'Table 1', color = '#E5C583' }) {
  ctx.save();
  const radius = height / 2;
  const x = cx - width / 2;
  const y = cy - height / 2;

  // Dark background pill with gold stroke
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = '#0D0B08';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Left Martini Icon
  const iconX = x + 44;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(iconX - 12, cy - 10);
  ctx.lineTo(iconX + 12, cy - 10);
  ctx.lineTo(iconX, cy + 4);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(iconX, cy + 4);
  ctx.lineTo(iconX, cy + 14);
  ctx.moveTo(iconX - 9, cy + 14);
  ctx.lineTo(iconX + 9, cy + 14);
  ctx.stroke();

  // Olive dot
  ctx.beginPath();
  ctx.arc(iconX + 1, cy - 4, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Vertical Divider
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.4)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x + 84, cy - 18);
  ctx.lineTo(x + 84, cy + 18);
  ctx.stroke();

  // Table Label Text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 36px "Playfair Display", Georgia, serif';
  ctx.fillText(tableLabel, cx + 32, cy);

  ctx.restore();
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PORTRAIT RENDERER (1200 x 1800)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function renderLiquorBarPortrait(ctx, {
  table,
  restaurant,
  qrImage,
  logoImage,
  heroImage,
  bgImage,
  width = 1200,
  height = 1800,
}) {
  const goldAccent = '#E5C583';
  const textMuted = '#CBD5E1';
  const tableLabel = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // Load default assets if not provided
  const backgroundToUse = bgImage || (await loadImage(defaultBgImg));
  const heroToUse = heroImage || (await loadImage(defaultHeroImg));

  // 1. Base Dark Slate Layer
  ctx.fillStyle = '#0D0B08';
  ctx.fillRect(0, 0, width, height);

  // 2. Atmospheric Bar Photography (Full Cover from liquor_bg.jpg)
  if (backgroundToUse) {
    ctx.save();
    drawImageCover(ctx, backgroundToUse, 0, 0, width, height, 0, 0.35);
    ctx.restore();
  }

  // 3. Luxurious Moody Scrim Overlay (allows bar bokeh & bottles to subtly show)
  const scrim = ctx.createLinearGradient(0, 0, 0, height);
  scrim.addColorStop(0, 'rgba(10, 8, 6, 0.88)');
  scrim.addColorStop(0.2, 'rgba(12, 10, 8, 0.92)');
  scrim.addColorStop(0.55, 'rgba(12, 10, 8, 0.94)');
  scrim.addColorStop(0.78, 'rgba(10, 8, 6, 0.82)');
  scrim.addColorStop(1, 'rgba(6, 5, 4, 0.92)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height);

  // 4. Outer Gold Border with Rounded Corners
  ctx.save();
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.7)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.roundRect(32, 32, width - 64, height - 64, 30);
  ctx.stroke();

  // Inner hairline accent
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(42, 42, width - 84, height - 84, 24);
  ctx.stroke();

  // Bottom-Right Dynamic Swoop Accent Curves
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.65)';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(width * 0.62, height - 32);
  ctx.bezierCurveTo(width * 0.78, height - 32, width * 0.88, height - 90, width - 32, height - 62);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(229, 197, 131, 0.35)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(width * 0.7, height - 32);
  ctx.bezierCurveTo(width * 0.84, height - 32, width * 0.92, height - 110, width - 32, height - 90);
  ctx.stroke();
  ctx.restore();

  // 5. Stylized Tropical Palm Sprig at top-left
  drawLoungePalmSprig(ctx, 36, 36, 1.1);

  // 6. Header: Beer & Martini Line Emblem OR Brand Logo
  const headerCenterY = 125;
  if (logoImage) {
    const logoSize = 98;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#0D0B08';
    ctx.shadowColor = 'rgba(229, 197, 131, 0.35)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = goldAccent;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, width / 2 - logoSize / 2, headerCenterY - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawBarHeaderEmblem(ctx, width / 2, headerCenterY, 88, goldAccent);
  }

  // 7. Main Restaurant Name: Bold Serif
  const restName = (restaurant?.name || 'BAR HOUSE').toUpperCase();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 52px "Playfair Display", Georgia, serif';
  ctx.shadowColor = 'rgba(229, 197, 131, 0.25)';
  ctx.shadowBlur = 14;
  ctx.fillText(restName, width / 2, 216, width - 200);

  // Tagline: GOOD DRINKS • GREAT VIBES • ALWAYS
  const tagline = (restaurant?.description || 'GOOD DRINKS • GREAT VIBES • ALWAYS').toUpperCase();
  ctx.fillStyle = goldAccent;
  ctx.font = '700 18px "Space Grotesk", Inter, sans-serif';
  ctx.shadowBlur = 0;
  ctx.fillText(tagline, width / 2, 264, width - 220);
  ctx.restore();

  // 9. QR Code Container (510 x 510) in Cream/Ivory with Gold Bracket Framing
  const qrBoxSize = 510;
  const qrBoxX = width / 2 - qrBoxSize / 2;
  const qrBoxY = 320;
  const qrBoxRadius = 32;

  ctx.save();
  // Warm gold glow
  ctx.shadowColor = 'rgba(229, 197, 131, 0.35)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 10;

  // Cream container for 100% scan contrast
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFDF7';
  ctx.fill();

  ctx.lineWidth = 2.2;
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.6)';
  ctx.stroke();
  ctx.restore();

  // 4 Gold Corner Brackets around container
  drawGoldBracketFrame(ctx, qrBoxX, qrBoxY, qrBoxSize, 46, goldAccent, 3.8, 14);

  // Draw QR Image inside container
  if (qrImage) {
    const qrInnerSize = 440;
    const qrInnerX = width / 2 - qrInnerSize / 2;
    const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
    ctx.drawImage(qrImage, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
  }

  // 10. SCAN TO ORDER Callout with Phone Icon and rules
  drawScanToOrderCallout(ctx, width / 2, 880, goldAccent);

  // 11. Table Pill Badge with Martini Icon
  const pillY = 942;
  drawBarTablePill(ctx, {
    cx: width / 2,
    cy: pillY,
    width: 390,
    height: 64,
    tableLabel,
    color: goldAccent,
  });

  // 12. Prominent Table CODE Capsule Badge (High-contrast for dim lounge lighting)
  const codeY = 1024;
  drawThemedCodeBadge(ctx, {
    cx: width / 2,
    cy: codeY,
    code: tableCodeFormatted,
    bgColor: '#0A0806',
    borderColor: goldAccent,
    borderWidth: 1.8,
    textColor: '#F59E0B',
    labelColor: textMuted,
    width: 460,
    height: 50,
    radius: 14,
    shadow: true,
    shadowColor: 'rgba(229, 197, 131, 0.3)',
  });

  // 13. 5-Item Category Flow Row (Beer, Cocktails, Spirits, Wine, Snacks)
  const catY = 1102;
  drawBarCategoriesRow(ctx, width / 2, catY, goldAccent, textMuted);

  // 14. Script Catchphrase: "Sip • Relax • Enjoy"
  const scriptY = 1205;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = goldAccent;
  ctx.font = 'italic 700 42px "Playfair Display", "Caveat", Georgia, cursive';
  ctx.fillText('Sip  •  Relax  •  Enjoy', width / 2, scriptY);
  ctx.restore();

  // 15. Bottom Hero Cocktail Presentation (liquor_bar_hero.jpg)
  if (heroToUse) {
    const heroH = 370;
    const heroY = height - heroH - 85;

    ctx.save();
    // Rounded frame with drawImageCover
    drawImageCover(ctx, heroToUse, 44, heroY, width - 88, heroH, 24, 0.45);

    // Dark gradient feather overlay on top of photo to blend seamlessly
    const topFeather = ctx.createLinearGradient(0, heroY, 0, heroY + 130);
    topFeather.addColorStop(0, '#0D0B08');
    topFeather.addColorStop(1, 'rgba(13, 11, 8, 0)');
    ctx.fillStyle = topFeather;
    ctx.beginPath();
    ctx.roundRect(44, heroY, width - 88, 130, [24, 24, 0, 0]);
    ctx.fill();

    // Subtle gold border
    ctx.strokeStyle = 'rgba(229, 197, 131, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(44, heroY, width - 88, heroH, 24);
    ctx.stroke();

    ctx.restore();
  }

  // 16. "Powered by LayoScan" Footer Badge
  await drawLayoScanFooter(ctx, {
    cx: width / 2,
    cy: height - 58,
    badgeW: 390,
    badgeH: 56,
    theme: 'dark',
    accentColor: goldAccent,
  });
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LANDSCAPE RENDERER (1800 x 1200) — Mini Table Tent / Counter Stand
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function renderLiquorBarLandscape(ctx, {
  table,
  restaurant,
  qrImage,
  logoImage,
  heroImage,
  bgImage,
  width = 1800,
  height = 1200,
}) {
  const goldAccent = '#E5C583';
  const textMuted = '#CBD5E1';
  const tableLabel = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // Load default assets if not provided
  const backgroundToUse = bgImage || (await loadImage(defaultBgImg));
  const heroToUse = heroImage || (await loadImage(defaultHeroImg));

  // 1. Base Dark Slate
  ctx.fillStyle = '#0D0B08';
  ctx.fillRect(0, 0, width, height);

  // 2. Atmospheric Bar Photography
  if (backgroundToUse) {
    ctx.save();
    drawImageCover(ctx, backgroundToUse, 0, 0, width, height, 0, 0.4);
    ctx.restore();
  }

  // 3. Dual-scrim overlay
  const scrim = ctx.createLinearGradient(0, 0, width, height);
  scrim.addColorStop(0, 'rgba(10, 8, 6, 0.92)');
  scrim.addColorStop(0.5, 'rgba(12, 10, 8, 0.94)');
  scrim.addColorStop(1, 'rgba(8, 6, 5, 0.92)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height);

  // 4. Outer Gold Border & Vertical Dividing Accent
  ctx.save();
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(28, 28, width - 56, height - 56, 26);
  ctx.stroke();

  // Center vertical divider
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(width / 2, 40);
  ctx.lineTo(width / 2, height - 40);
  ctx.stroke();

  // Bottom-Right Dynamic Swoop Accent Curves
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.6)';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(width - 340, height - 28);
  ctx.bezierCurveTo(width - 220, height - 28, width - 100, height - 85, width - 28, height - 60);
  ctx.stroke();
  ctx.restore();

  // 5. Stylized Palm Sprig at top-left
  drawLoungePalmSprig(ctx, 32, 32, 0.95);

  // ───────────────────────────────────────────────────────────────────────────
  // LEFT COLUMN: BRANDING, TABLE IDENTITY, CATEGORIES & AMBIENCE (cx = 450)
  // ───────────────────────────────────────────────────────────────────────────
  const leftCenterX = 450;

  // Header Emblem or Logo
  const headerCenterY = 110;
  if (logoImage) {
    const logoSize = 88;
    ctx.save();
    ctx.beginPath();
    ctx.arc(leftCenterX, headerCenterY, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#0D0B08';
    ctx.shadowColor = 'rgba(229, 197, 131, 0.3)';
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
    drawBarHeaderEmblem(ctx, leftCenterX, headerCenterY, 80, goldAccent);
  }

  // Restaurant Name
  const restName = (restaurant?.name || 'BAR HOUSE').toUpperCase();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 46px "Playfair Display", Georgia, serif';
  ctx.fillText(restName, leftCenterX, 192, 780);

  // Tagline
  const tagline = (restaurant?.description || 'GOOD DRINKS • GREAT VIBES • ALWAYS').toUpperCase();
  ctx.fillStyle = goldAccent;
  ctx.font = '700 17px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(tagline, leftCenterX, 236, 800);
  ctx.restore();

  // Table Pill Badge
  const pillY = 305;
  drawBarTablePill(ctx, {
    cx: leftCenterX,
    cy: pillY,
    width: 360,
    height: 60,
    tableLabel,
    color: goldAccent,
  });

  // Table CODE Badge on Left
  const codeY = 378;
  drawThemedCodeBadge(ctx, {
    cx: leftCenterX,
    cy: codeY,
    code: tableCodeFormatted,
    bgColor: '#0A0806',
    borderColor: goldAccent,
    borderWidth: 1.8,
    textColor: '#F59E0B',
    labelColor: textMuted,
    width: 440,
    height: 48,
    radius: 14,
    shadow: true,
    shadowColor: 'rgba(229, 197, 131, 0.25)',
  });

  // 5 Category nodes row
  const catY = 460;
  drawBarCategoriesRow(ctx, leftCenterX, catY, goldAccent, textMuted);

  // Script Catchphrase
  const scriptY = 560;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = goldAccent;
  ctx.font = 'italic 700 38px "Playfair Display", "Caveat", Georgia, cursive';
  ctx.fillText('Sip  •  Relax  •  Enjoy', leftCenterX, scriptY);
  ctx.restore();

  // Bottom circular cocktail highlight frame on Left
  if (heroToUse) {
    const heroSize = 340;
    const hx = leftCenterX - heroSize / 2;
    const hy = height - heroSize - 110;

    ctx.save();
    ctx.beginPath();
    ctx.arc(leftCenterX, hy + heroSize / 2, heroSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#0D0B08';
    ctx.shadowColor = 'rgba(229, 197, 131, 0.35)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    ctx.fill();

    // Clipped image
    drawImageCover(ctx, heroToUse, hx, hy, heroSize, heroSize, heroSize / 2);

    ctx.beginPath();
    ctx.arc(leftCenterX, hy + heroSize / 2, heroSize / 2, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = goldAccent;
    ctx.stroke();
    ctx.restore();
  }

  // Left Footer
  await drawLayoScanFooter(ctx, {
    cx: leftCenterX,
    cy: height - 52,
    badgeW: 360,
    badgeH: 50,
    theme: 'dark',
    accentColor: goldAccent,
  });

  // ───────────────────────────────────────────────────────────────────────────
  // RIGHT COLUMN: LARGE QR CODE, SCAN PROMPT & CODE (cx = 1350)
  // ───────────────────────────────────────────────────────────────────────────
  const rightCenterX = 1350;

  // Header prompt above QR
  drawScanToOrderCallout(ctx, rightCenterX, 115, goldAccent);

  // Large QR Code Container (540 x 540)
  const qrBoxSize = 540;
  const qrBoxX = rightCenterX - qrBoxSize / 2;
  const qrBoxY = 175;
  const qrBoxRadius = 32;

  ctx.save();
  ctx.shadowColor = 'rgba(229, 197, 131, 0.35)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 8;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFDF7';
  ctx.fill();

  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(229, 197, 131, 0.65)';
  ctx.stroke();
  ctx.restore();

  // 4 Gold Corner Brackets around container
  drawGoldBracketFrame(ctx, qrBoxX, qrBoxY, qrBoxSize, 48, goldAccent, 3.8, 15);

  // Draw QR Image inside container
  if (qrImage) {
    const qrInnerSize = 465;
    const qrInnerX = rightCenterX - qrInnerSize / 2;
    const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
    ctx.drawImage(qrImage, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
  }

  // Right Table Label Badge & Table CODE Badge
  const rightPillY = 780;
  drawBarTablePill(ctx, {
    cx: rightCenterX,
    cy: rightPillY,
    width: 380,
    height: 58,
    tableLabel,
    color: goldAccent,
  });

  const rightCodeY = 855;
  drawThemedCodeBadge(ctx, {
    cx: rightCenterX,
    cy: rightCodeY,
    code: tableCodeFormatted,
    bgColor: '#0A0806',
    borderColor: goldAccent,
    borderWidth: 1.8,
    textColor: '#F59E0B',
    labelColor: textMuted,
    width: 450,
    height: 48,
    radius: 14,
    shadow: true,
    shadowColor: 'rgba(229, 197, 131, 0.25)',
  });

  // Call-to-action Subtext below badges
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textMuted;
  ctx.font = '600 20px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Scan for Cocktails, Bottles, VIP Service & Food', rightCenterX, 930);

  ctx.fillStyle = goldAccent;
  ctx.font = 'italic 700 26px "Playfair Display", Georgia, cursive';
  ctx.fillText('Order directly to your table', rightCenterX, 970);
  ctx.restore();

  // Right Footer
  await drawLayoScanFooter(ctx, {
    cx: rightCenterX,
    cy: height - 52,
    badgeW: 360,
    badgeH: 50,
    theme: 'dark',
    accentColor: goldAccent,
  });
}
