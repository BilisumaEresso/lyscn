import {
  drawBotanicalSprig,
  drawCoffeeCupEmblem,
  drawPillBadge,
  drawThemedCodeBadge,
  drawImageCover,
  drawLayoScanFooter,
  drawCardPaymentAccounts,
  formatTableCode,
  drawMenuBridgeBar,
  drawDynamicMenuGrid,
  drawMenuBoardBottomBrand,
  drawMenuCategorySection,
} from '../canvasHelpers';
import { getMenuForCard } from '../menuDataHelpers';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEMPLATE 1: ARTISAN LINEN (Artisanal Coffee, Bakery & Roastery)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Template-scoped PNG asset URLs ───────────────────────────────────────────
// Vite resolves these at build time — correct hashed paths in production.
const _assetBranch  = new URL('../../assets/templates/artisan_linen/coffee_branch_top_flowers_cherries.png', import.meta.url).href;
const _assetBowl    = new URL('../../assets/templates/artisan_linen/coffee_beans_bowl.png',                  import.meta.url).href;
const _assetCloth   = new URL('../../assets/templates/artisan_linen/linen_cloth_folded.png',                 import.meta.url).href;
const _assetCup     = new URL('../../assets/templates/artisan_linen/coffee_cup_latte.png',                   import.meta.url).href;
const _assetLeaves  = new URL('../../assets/templates/artisan_linen/coffee_leaves_cluster.png',              import.meta.url).href;
const _assetBeans   = new URL('../../assets/templates/artisan_linen/coffee_beans_scattered.png',             import.meta.url).href;
const _assetLinenBg = new URL('../../assets/templates/artisan_linen/background_linen_portrait_1240x1748.jpg', import.meta.url).href;

// Module-level image cache — avoids re-decoding on every render call
const _imgCache = new Map();

/** Loads and caches a single image; resolves null on error. */
function _loadAsset(src) {
  if (_imgCache.has(src)) return _imgCache.get(src);
  const p = new Promise((res) => {
    if (typeof Image === 'undefined') { res(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
  _imgCache.set(src, p);
  return p;
}

/**
 * Places a PNG asset onto the canvas at (x, y) with optional rotation around
 * the image centre and an opacity override. Safe if img is null.
 */
function _placeAsset(ctx, img, x, y, w, h, rotationRad = 0, opacity = 1) {
  if (!img) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  if (rotationRad !== 0) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rotationRad);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    ctx.drawImage(img, x, y, w, h);
  }
  ctx.restore();
}

/**
 * PORTRAIT RENDERER (1240 x 1748) — matches Elili Cafe reference design
 *
 * Dynamic data kept from the server:
 *   restaurant.name             → headline (Playfair serif, 66 px)
 *   restaurant.description      → dash-flanked tagline with coffee icon
 *   restaurant.logoUrl          → logoImage (drawn at natural ratio, no circle clip)
 *   table.label                 → "TABLE N" pill badge with botanical flankers
 *   table.qrToken               → formatted table code badge
 *   qrImage                     → full QR code with restaurant logo in centre
 *   restaurant.paymentAccounts  → Telebirr row (official logo + phone number)
 *   LayoScan trademark          → footer with real logo + "Scan. Dine. Done."
 *
 * Visual improvements over previous version:
 *   + Real PNG props composited at 6 corner zones (branch, bowl, cloth, cup,
 *     leaves, beans) — matching the reference photo-realistic collage style
 *   + Linen parchment background from template asset
 *   + Removed: 3-step flow nodes, italic slogan, dark wave sweep, circular hero
 */
export async function renderCafeArtisanPortrait(ctx, {
  table,
  restaurant,
  qrImage,
  logoImage,
  heroImage,   // kept for API compatibility — unused in this layout
  width  = 1240,
  height = 1748,
}) {
  const brandDark          = '#1B382B'; // Deep Forest Olive
  const textMuted          = '#5C6F64';
  const cx                 = width / 2;
  const tableLabel         = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // ── Pre-load all decorative PNG assets in parallel ────────────────────────
  const [
    imgBranch, imgBowl, imgCloth,
    imgCup, imgLeaves, imgBeans, imgLinenBg,
  ] = await Promise.all([
    _loadAsset(_assetBranch),
    _loadAsset(_assetBowl),
    _loadAsset(_assetCloth),
    _loadAsset(_assetCup),
    _loadAsset(_assetLeaves),
    _loadAsset(_assetBeans),
    _loadAsset(_assetLinenBg),
  ]);

  // ── 1. Background — real linen parchment texture ──────────────────────────
  if (imgLinenBg) {
    // Cover semantics: fills canvas, no distortion, no letterboxing
    drawImageCover(ctx, imgLinenBg, 0, 0, width, height);
  } else {
    // Graceful fallback: warm three-stop gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0,   '#FAF8F2');
    bgGrad.addColorStop(0.4, '#F6EFE3');
    bgGrad.addColorStop(1,   '#E8DCCA');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // Warm radial centre glow — keeps the main content zone light and legible
  const centreGlow = ctx.createRadialGradient(cx, height * 0.42, 0, cx, height * 0.42, width * 0.74);
  centreGlow.addColorStop(0, 'rgba(255, 252, 244, 0.50)');
  centreGlow.addColorStop(1, 'rgba(255, 252, 244, 0)');
  ctx.fillStyle = centreGlow;
  ctx.fillRect(0, 0, width, height);

  // ── 2. Decorative PNG corner assets ──────────────────────────────────────
  // Each image can bleed outside the canvas edge for a natural composition.

  // TOP-LEFT: Coffee branch with flowers & cherries — dragged outward to top-left corner
  _placeAsset(ctx, imgBranch, -140,         -90,           500, 320, -0.28, 1.0);

  // TOP-RIGHT: Wooden bowl filled with coffee beans
  _placeAsset(ctx, imgBowl,   width - 320,  -80,           370, 300,  0.10, 1.0);

  // TOP-RIGHT: Folded linen cloth — tucked behind the bowl for depth
  _placeAsset(ctx, imgCloth,  width - 200,   120,          250, 180, -0.08, 0.82);

  // BOTTOM-LEFT: Green ceramic latte cup — dragged outward to bottom-left corner clear of payment row
  _placeAsset(ctx, imgCup,   -210,           height - 430, 480, 410,  0.02, 1.0);

  // BOTTOM-RIGHT: Leaves cluster with flowers and red cherries
  _placeAsset(ctx, imgLeaves, width - 420,   height - 390, 480, 380,  0.28, 1.0);

  // BOTTOM-RIGHT: A handful of scattered coffee beans
  _placeAsset(ctx, imgBeans,  width - 190,   height - 160, 220, 160, -0.18, 0.88);

  // Faint ghost-leaf sprig (line-art) on right-centre — subtle depth layer
  drawBotanicalSprig(ctx, width - 88, Math.round(height * 0.46), 1.05, Math.PI * 0.55, 'rgba(27, 56, 43, 0.09)');

  // ── 3. Restaurant Logo ─────────────────────────────────────────────────────
  // Reference: logo at top-center, displayed at natural aspect ratio, no clip.
  const logoAreaY = 72;

  if (logoImage) {
    const maxLogoW  = 200;
    const maxLogoH  = 120;
    const natW      = logoImage.naturalWidth  || logoImage.width  || maxLogoW;
    const natH      = logoImage.naturalHeight || logoImage.height || maxLogoH;
    const logoScale = Math.min(maxLogoW / natW, maxLogoH / natH, 1);
    const drawW     = Math.round(natW * logoScale);
    const drawH     = Math.round(natH * logoScale);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(logoImage, cx - drawW / 2, logoAreaY, drawW, drawH);
    ctx.restore();
  } else {
    // Fallback: crisp vector coffee-cup emblem (identical colours to reference)
    drawCoffeeCupEmblem(ctx, cx, logoAreaY + 52, 100, brandDark);
  }

  // ── 4. Restaurant Name ─────────────────────────────────────────────────────
  const restName = restaurant?.name || 'Elili Cafe';
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = brandDark;
  ctx.font         = '700 66px "Playfair Display", "Times New Roman", Georgia, serif';
  ctx.fillText(restName, cx, 280, width - 180);
  ctx.restore();

  // ── 5. Dash-flanked tagline with ☕ icon ──────────────────────────────────
  // Reference: ─── WE SERVE QUALITY, WE THRIVE FOR YOUR SATISFACTION.  ENJOY ☕ ───
  const taglineRaw = restaurant?.description || 'WE SERVE QUALITY, WE THRIVE FOR YOUR SATISFACTION.  ENJOY';
  const tagline    = taglineRaw.toUpperCase();
  const tagY       = 348;
  const ICON_STR   = '  ☕';

  ctx.save();
  ctx.font         = '600 21px "Space Grotesk", Inter, sans-serif';
  ctx.fillStyle    = textMuted;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  const tagTextW   = ctx.measureText(tagline).width;
  const iconW      = ctx.measureText(ICON_STR).width;
  const totalTagW  = tagTextW + iconW;
  const dashGap    = 22;
  const dashLen    = Math.max(30, (width - totalTagW - dashGap * 4 - 120) / 2);

  // Left dash rule
  ctx.strokeStyle = 'rgba(92, 111, 100, 0.55)';
  ctx.lineWidth   = 1.6;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(60,                   tagY);
  ctx.lineTo(60 + dashLen,         tagY);
  ctx.stroke();

  // Right dash rule
  ctx.beginPath();
  ctx.moveTo(width - 60 - dashLen, tagY);
  ctx.lineTo(width - 60,           tagY);
  ctx.stroke();

  // Tagline text
  ctx.fillText(tagline, cx - iconW / 2, tagY, width - dashLen * 2 - 180);

  // ☕ icon at end of text block
  ctx.textAlign = 'left';
  ctx.fillText(ICON_STR, cx + tagTextW / 2 - iconW * 0.1, tagY);
  ctx.restore();

  // ── 6. TABLE N Pill Badge with ✾ botanical flankers ──────────────────────
  const pillW = 440, pillH = 76;
  const pillY = 410;
  const pillX = cx - pillW / 2;

  drawPillBadge(ctx, {
    x:         pillX,
    y:         pillY,
    width:     pillW,
    height:    pillH,
    bgColor:   brandDark,
    text:      tableLabel,
    textColor: '#FFFFFF',
    font:      '700 40px "Playfair Display", Georgia, serif',
    shadow:    true,
  });

  // Botanical ✾ flankers inside pill (matching reference leaf-sprig motif)
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font         = '400 28px serif';
  ctx.fillStyle    = 'rgba(255, 255, 255, 0.70)';
  ctx.fillText('✾', pillX + 48,          pillY + pillH / 2);
  ctx.fillText('✾', pillX + pillW - 48,   pillY + pillH / 2);
  ctx.restore();

  // ── 7. QR Code Container ──────────────────────────────────────────────────
  // Reference: large white rounded rect with a soft green shadow
  const qrBoxSize = 660;
  const qrBoxX    = cx - qrBoxSize / 2;
  const qrBoxY    = 524;
  const qrBoxR    = 38;

  ctx.save();
  ctx.shadowColor   = 'rgba(27, 56, 43, 0.18)';
  ctx.shadowBlur    = 36;
  ctx.shadowOffsetY = 10;
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxR);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.shadowColor   = 'transparent';
  ctx.lineWidth     = 1.8;
  ctx.strokeStyle   = 'rgba(27, 56, 43, 0.20)';
  ctx.stroke();
  ctx.restore();

  // QR image centred inside container (qrSize 554 → ~53 px quiet-zone padding)
  if (qrImage) {
    const qrSize = 554;
    const qrPad  = (qrBoxSize - qrSize) / 2;
    ctx.drawImage(qrImage, qrBoxX + qrPad, qrBoxY + qrPad, qrSize, qrSize);
  }

  // ── 8. Table Code Badge ───────────────────────────────────────────────────
  const codeY = qrBoxY + qrBoxSize + 32;  // tight gap directly below QR box

  drawThemedCodeBadge(ctx, {
    cx,
    cy:          codeY,
    code:        tableCodeFormatted,
    bgColor:     '#FFFFFF',
    borderColor: 'rgba(27, 56, 43, 0.28)',
    borderWidth: 1.8,
    textColor:   brandDark,
    labelColor:  textMuted,
    width:       560,
    height:      68,
    radius:      20,
    shadow:      true,
  });

  // ── 9. Telebirr Payment Row ───────────────────────────────────────────────
  // drawCardPaymentAccounts composites:
  //   • official Telebirr logo (from public/banks_logo/telebirr.png in new engine,
  //     or the legacy vector-T fallback here)
  //   • "Telebirr" label
  //   • phone number in bold monospace
  const payY = codeY + 92;

  drawCardPaymentAccounts(ctx, {
    cx,
    cy:         payY,
    restaurant,
    width:      760,
    theme:      'light',
  });

  // ── 10. LayoScan Footer ───────────────────────────────────────────────────
  // Renders: LayoScan logo mark + "LayoScan" bold + italic "Scan. Dine. Done."
  await drawLayoScanFooter(ctx, {
    cx,
    cy:          height - 68,
    badgeW:      440,
    badgeH:      68,
    templateId:  'cafe_artisan',
    theme:       'light',
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

  // Botanical flankers
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '400 22px serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.70)';
  ctx.fillText('✾', leftCenterX - pillW / 2 + 38, pillY + pillH / 2);
  ctx.fillText('✾', leftCenterX + pillW / 2 - 38, pillY + pillH / 2);
  ctx.restore();

  // Payment Accounts
  drawCardPaymentAccounts(ctx, {
    cx: leftCenterX,
    cy: height - 120,
    restaurant,
    width: 540,
    theme: 'light',
  });

  // Right Footer
  await drawLayoScanFooter(ctx, {
    cx: leftCenterX,
    cy: height - 55,
    badgeW: 360,
    badgeH: 52,
    templateId: 'cafe_artisan',
    theme: 'light',
    accentColor: brandDark,
  });

  // 4. Right Section: Large QR Code Presentation (x: 980 -> 1800)
  const rightCenterX = 1390;
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
  ctx.fillText('Point your camera here to order', rightCenterX, qrBoxY + qrBoxSize + 36);
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

  // Payment Accounts Strip (Telebirr / CBE)
  drawCardPaymentAccounts(ctx, {
    cx: rightCenterX,
    cy: codeBoxY + codeBoxH + 82,
    restaurant,
    width: 520,
    theme: 'light',
  });

  // Right Footer
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

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FULL MENU BOARD RENDERER (2400 x 3400) — Big Printed Table Card / Placemat
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function renderCafeArtisanMenuBoard(ctx, {
  table,
  restaurant,
  qrImage,
  logoImage,
  menuData,
  width = 2400,
  height = 3400,
}) {
  const brandDark = '#1B382B'; // Deep Forest Olive
  const brandSage = '#2D5A43';
  const textMuted = '#4A5B51';
  const tableLabel = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // 1. Tactile Warm Linen Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#FAF6EF');
  bgGrad.addColorStop(0.5, '#F5EDE2');
  bgGrad.addColorStop(1, '#ECE3D4');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Linen texture dots
  ctx.save();
  ctx.fillStyle = 'rgba(27, 56, 43, 0.022)';
  for (let y = 16; y < height; y += 40) {
    for (let x = 16; x < width; x += 40) {
      ctx.fillRect(x + ((y * 7) % 13), y, 2.5, 2.5);
    }
  }
  ctx.restore();

  // Outer framing rule
  ctx.save();
  ctx.strokeStyle = 'rgba(27, 56, 43, 0.25)';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(60, 60, width - 120, height - 120);

  ctx.strokeStyle = 'rgba(27, 56, 43, 0.12)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(72, 72, width - 144, height - 144);
  ctx.restore();

  // Four Corner Botanical Sprigs
  drawBotanicalSprig(ctx, 100, 100, 1.8, -0.15, 'rgba(27, 56, 43, 0.45)');
  drawBotanicalSprig(ctx, width - 100, 100, 1.8, Math.PI / 2 + 0.15, 'rgba(27, 56, 43, 0.45)');
  drawBotanicalSprig(ctx, 100, height - 100, 1.8, -Math.PI / 2 - 0.15, 'rgba(27, 56, 43, 0.45)');
  drawBotanicalSprig(ctx, width - 100, height - 100, 1.8, Math.PI + 0.15, 'rgba(27, 56, 43, 0.45)');

  // 2. Header Section (Y: 85 - 380) — Generously spaced Logo, Title & Slogan
  const restName = (restaurant?.name || 'Elili Cafe').toUpperCase();
  const restTagline = restaurant?.tagline || 'SPECIALTY ROASTERY • ARTISAN BAKERY • FRESH ALL-DAY BRUNCH';

  // Logo or Artisan Coffee Emblem (Diameter: 130px, centered with generous padding)
  const logoCenterY = 155;
  if (logoImage) {
    const logoSize = 130;
    const logoX = 1200 - logoSize / 2;
    const logoY = logoCenterY - logoSize / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(1200, logoCenterY, logoSize / 2 + 3, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(27, 56, 43, 0.16)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
    ctx.fill();
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = brandDark;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(1200, logoCenterY, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
    ctx.restore();
  } else {
    drawCoffeeCupEmblem(ctx, 1200, logoCenterY, 96, brandDark);
  }

  // Restaurant Name (Spaced with breathing room below logo)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = brandDark;
  ctx.font = '700 72px "Playfair Display", Georgia, serif';
  ctx.fillText(restName, 1200, 285);

  // Tagline (Cleanly spaced below restaurant name)
  ctx.fillStyle = textMuted;
  ctx.font = '600 23px "Space Grotesk", Inter, sans-serif';
  ctx.letterSpacing = '2.5px';
  ctx.fillText(restTagline, 1200, 345);
  ctx.restore();

  // 3. Prominent Digital QR & Table Credentials Dock (Y: 410 - 680, Height: 270px)
  drawMenuBridgeBar(ctx, {
    x: 140,
    y: 410,
    width: 2120,
    height: 270,
    qrImage,
    tableLabel,
    tableCodeFormatted,
    theme: 'light',
    accentColor: brandDark,
    bgColor: '#FFFFFF',
    borderColor: 'rgba(27, 56, 43, 0.28)',
    titleColor: brandDark,
    subtitleColor: textMuted,
  });

  // 4. Unified Restaurant Menu Data
  const menu = getMenuForCard({
    restaurant,
    categories: menuData?.categories,
    products: menuData?.products,
  });

  // Center Decorative Vertical Divider Line
  ctx.save();
  ctx.setLineDash([5, 8]);
  ctx.beginPath();
  ctx.moveTo(1200, 720);
  ctx.lineTo(1200, 3160);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = 'rgba(27, 56, 43, 0.25)';
  ctx.stroke();

  // Center coffee bean emblem in middle of divider
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(1200, 1940, 24, 0, Math.PI * 2);
  ctx.fillStyle = '#FAF6EF';
  ctx.fill();
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = brandDark;
  ctx.stroke();

  ctx.fillStyle = brandDark;
  ctx.beginPath();
  ctx.ellipse(1200, 1940, 11, 7, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Dynamic Two-Column Menu Spread (Balanced items, dynamic row heights, no dead space)
  drawDynamicMenuGrid(ctx, {
    categories: menu.categories || [],
    currency: menu.currency,
    col1X: 140,
    col2X: 1260,
    colWidth: 1000,
    startY: 720,
    endY: 3160,
    theme: 'light',
    accentColor: brandDark,
    titleColor: brandDark,
    bodyColor: textMuted,
    priceColor: brandDark,
    tagBg: 'rgba(27, 56, 43, 0.08)',
    tagText: brandDark,
    headerFont: '700 54px "Playfair Display", Georgia, serif',
    itemFont: '700 32px "Playfair Display", Georgia, serif',
    priceFont: '800 32px "Space Grotesk", monospace',
    priceStyle: 'dots',
    dividerColor: brandDark,
  });

  // 5. Bottom Brand Element (Fills void with elegant motto & framing)
  drawMenuBoardBottomBrand(ctx, {
    x: 140,
    y: 3170,
    width: 2120,
    height: 80,
    accentColor: brandDark,
    theme: 'light',
    tagline: restaurant?.slogan || restaurant?.description || 'Crafted with passion • Served with pride',
  });

  // 6. Official LayoScan Footer (Y: 3280, clean, no unasked clutter)
  await drawLayoScanFooter(ctx, {
    cx: 1200,
    cy: 3280,
    badgeW: 460,
    badgeH: 68,
    templateId: 'cafe_artisan',
    theme: 'light',
    accentColor: brandDark,
  });
}
