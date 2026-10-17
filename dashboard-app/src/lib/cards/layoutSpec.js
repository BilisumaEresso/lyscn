/**
 * Declarative Layout Specifications for LayoScan Card Designs.
 * Defines dimensions, safe areas, color systems, and slot coordinate maps for 9 designs
 * across 3 orientations (Portrait A6, Landscape Folded Tent A5, and Menu Board Poster A4).
 */

import { getEffectiveQuietZoneRatio, MIN_QUIET_ZONE_RATIO } from './qrQuietZone.js';
import { getRelativeLuminance } from './fitText.js';

// ── Background Image Placeholder Asset URLs ──────────────────────────────────
// Uses new URL(..., import.meta.url).href for 100% universal compatibility across
// Vite bundling and plain Node.js execution environments.
const artisan_linen_portrait = new URL('../../assets/cards/artisan_linen_portrait.jpg', import.meta.url).href;
const artisan_linen_landscape = new URL('../../assets/cards/artisan_linen_landscape.jpg', import.meta.url).href;
const artisan_linen_menu_board = new URL('../../assets/cards/artisan_linen_menu_board.jpg', import.meta.url).href;

const bold_street_portrait = new URL('../../assets/cards/bold_street_portrait.jpg', import.meta.url).href;
const bold_street_landscape = new URL('../../assets/cards/bold_street_landscape.jpg', import.meta.url).href;
const bold_street_menu_board = new URL('../../assets/cards/bold_street_menu_board.jpg', import.meta.url).href;

const fresh_emerald_portrait = new URL('../../assets/cards/fresh_emerald_portrait.jpg', import.meta.url).href;
const fresh_emerald_landscape = new URL('../../assets/cards/fresh_emerald_landscape.jpg', import.meta.url).href;
const fresh_emerald_menu_board = new URL('../../assets/cards/fresh_emerald_menu_board.jpg', import.meta.url).href;

const midnight_gold_portrait = new URL('../../assets/cards/midnight_gold_portrait.jpg', import.meta.url).href;
const midnight_gold_landscape = new URL('../../assets/cards/midnight_gold_landscape.jpg', import.meta.url).href;
const midnight_gold_menu_board = new URL('../../assets/cards/midnight_gold_menu_board.jpg', import.meta.url).href;

const habesha_heritage_portrait = new URL('../../assets/cards/habesha_heritage_portrait.jpg', import.meta.url).href;
const habesha_heritage_landscape = new URL('../../assets/cards/habesha_heritage_landscape.jpg', import.meta.url).href;
const habesha_heritage_menu_board = new URL('../../assets/cards/habesha_heritage_menu_board.jpg', import.meta.url).href;

const velvet_lounge_portrait = new URL('../../assets/cards/velvet_lounge_portrait.jpg', import.meta.url).href;
const velvet_lounge_landscape = new URL('../../assets/cards/velvet_lounge_landscape.jpg', import.meta.url).href;
const velvet_lounge_menu_board = new URL('../../assets/cards/velvet_lounge_menu_board.jpg', import.meta.url).href;

const juice_spris_portrait = new URL('../../assets/cards/juice_spris_portrait.jpg', import.meta.url).href;
const juice_spris_landscape = new URL('../../assets/cards/juice_spris_landscape.jpg', import.meta.url).href;
const juice_spris_menu_board = new URL('../../assets/cards/juice_spris_menu_board.jpg', import.meta.url).href;

const cafe_tent_classic_portrait = new URL('../../assets/cards/cafe_tent_classic_portrait.jpg', import.meta.url).href;
const cafe_tent_classic_landscape = new URL('../../assets/cards/cafe_tent_classic_landscape.jpg', import.meta.url).href;
const cafe_tent_classic_menu_board = new URL('../../assets/cards/cafe_tent_classic_menu_board.jpg', import.meta.url).href;

const modern_minimal_portrait = new URL('../../assets/cards/modern_minimal_portrait.jpg', import.meta.url).href;
const modern_minimal_landscape = new URL('../../assets/cards/modern_minimal_landscape.jpg', import.meta.url).href;
const modern_minimal_menu_board = new URL('../../assets/cards/modern_minimal_menu_board.jpg', import.meta.url).href;

/**
 * Standard Canvas Formats
 */
export const CANVAS_FORMATS = {
  portrait: { width: 1240, height: 1748, dpi: 300, physical: 'A6 @ 300 DPI' },
  landscape: { width: 2480, height: 1748, dpi: 300, physical: 'A5 folded table tent @ 300 DPI' },
  menu_board: { width: 1654, height: 2339, dpi: 200, physical: 'A4 @ 200 DPI' },
};

/**
 * Common safe area margins guaranteeing print trim safety (>40px inset).
 */
export const STANDARD_SAFE_AREAS = {
  portrait: { top: 60, right: 60, bottom: 60, left: 60 },
  landscape: { top: 60, right: 60, bottom: 60, left: 60 },
  menu_board: { top: 80, right: 80, bottom: 80, left: 80 },
};

// ──────────────────────────────────────────────────────────────────────────────
// SLOT BUILDER FACTORY
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Builds standard slot definitions for Portrait (1240 × 1748)
 * Safe zone: x 60–1180 · y 60–1688
 *
 * Slot layout from top to bottom:
 *   Logo (optional)  y=75
 *   Restaurant name  y=200
 *   Tagline          y=315
 *   Table pill       y=430
 *   QR code          y=560  (600×600)
 *   Table code badge y=1195
 *   Telebirr payment y=1305
 *   LayoScan mark    y=1420
 */
function createPortraitSlots(palette, options = {}) {
  const {
    headerFont = 'Playfair Display, serif',
    bodyFont = 'Inter, sans-serif',
    qrContainerBg = '#FFFFFF',
    qrBorderColor = null,
    qrBorderWidth = 0,
    qrShadow = true,
    uppercaseName = false,
    trademarkStyle = {},
  } = options;

  const slots = [
    // 1. Restaurant Logo (only renders if logoImage is provided)
    {
      id: 'logo',
      type: 'image',
      source: 'logo',
      x: 495,
      y: 70,
      w: 250,
      h: 110,
      radius: 14,
      clip: false,
    },
    // 2. Restaurant Name
    {
      id: 'name',
      type: 'text',
      source: 'name',
      x: 80,
      y: 195,
      w: 1080,
      h: 115,
      maxFontPx: 64,
      minFontPx: 38,
      font: headerFont,
      weight: 700,
      uppercase: uppercaseName,
      color: palette.textPrimary,
      align: 'center',
      fallback: 'Restaurant',
      contrastCheck: true,
    },
    // 3. Tagline (single line, letter-spaced uppercase)
    {
      id: 'tagline',
      type: 'text',
      source: 'tagline',
      x: 100,
      y: 325,
      w: 1040,
      h: 56,
      maxFontPx: 28,
      minFontPx: 18,
      maxLines: 1,
      font: bodyFont,
      weight: 500,
      letterSpacing: 2,
      uppercase: true,
      color: palette.textMuted,
      align: 'center',
      fallback: 'FINE FOOD & BEVERAGES',
      contrastCheck: true,
    },
    // 4. Table Number Pill Badge
    {
      id: 'tableLabel',
      type: 'pill',
      source: 'tableLabel',
      x: 370,
      y: 420,
      w: 500,
      h: 96,
      radius: 48,
      bgColor: palette.accent,
      color: palette.onAccent,
      font: headerFont,
      weight: 700,
      maxFontPx: 46,
      minFontPx: 28,
      letterSpacing: 2,
      uppercase: true,
      shadowColor: 'rgba(0,0,0,0.18)',
      shadowBlur: 20,
      fallback: 'Table 1',
    },
    // 5. QR Code Slot — 660×660, qrSize 554 → 9.56% quiet zone ≥ 8%
    {
      id: 'qr',
      type: 'qr',
      source: 'qr',
      x: 290,
      y: 550,
      w: 660,
      h: 660,
      qrSize: 554,
      bgColor: qrContainerBg,
      borderColor: qrBorderColor,
      borderWidth: qrBorderWidth,
      radius: 38,
      shadowColor: qrShadow ? 'rgba(0,0,0,0.18)' : null,
      shadowBlur: qrShadow ? 26 : 0,
      shadowOffsetY: 8,
    },
  ];

  // 6. Table Code Badge
  const isDarkContainer = qrContainerBg && getRelativeLuminance(qrContainerBg) < 0.5;
  const tableCodeColor = isDarkContainer ? (palette.onAccent || '#FFFFFF') : '#111827';
  const tableCodeLabelColor = isDarkContainer ? (palette.textMuted || '#A0A0A8') : '#64748B';
  const tableCodeBorderColor = qrBorderColor || (isDarkContainer ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.1)');

  slots.push({
    id: 'tableCode',
    type: 'badge',
    source: 'tableCode',
    x: 310,
    y: 1245,
    w: 620,
    h: 84,
    radius: 22,
    bgColor: qrContainerBg,
    borderColor: tableCodeBorderColor,
    borderWidth: 1.5,
    labelColor: tableCodeLabelColor,
    color: tableCodeColor,
    labelPrefix: 'TABLE CODE: ',
    labelPx: 19,
    codePx: 25,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowBlur: 14,
    fallback: 'TABLE-CODE',
  });

  // 7. Telebirr Payment Slot (prominent, high-visibility)
  slots.push({
    id: 'payment',
    type: 'telebirr',
    source: 'payment',
    x: 80,
    y: 1365,
    w: 1080,
    h: 104,
    color: palette.textPrimary,
    labelColor: palette.textMuted,
    bodyFont,
  });

  // 8. LayoScan Trademark Footer (prominent, high-visibility)
  slots.push({
    id: 'footer',
    type: 'trademark',
    source: 'footer',
    x: 80,
    y: 1500,
    w: 1080,
    h: 104,
    color: palette.textMuted,
    trademarkStyle,
  });

  return slots;
}


/**
 * Builds standard slot definitions for Landscape Folded Tent (2480 × 1748)
 * Safe zone: x 60–2420 · y 60–1688 · Fold line at center x=1240
 *
 * Left panel (Face A, center x=620):
 *   - Logo, Restaurant Name, Tagline
 *   - 3-Step Contactless Ordering Guide Container (eliminates the dead void)
 *   - Telebirr Payment Badge & LayoScan Trademark
 *
 * Right panel (Face B, center x=1860):
 *   - Mini Venue Header & Table Number Pill Badge
 *   - Large 700×700 QR Code Container (580px QR, 10.34% quiet zone)
 *   - Table Code Badge & Scan Prompt Call-to-Action
 *   - Symmetrical Telebirr Payment Badge & LayoScan Trademark
 */
function createLandscapeSlots(palette, options = {}) {
  const {
    headerFont = 'Playfair Display, serif',
    bodyFont = 'Inter, sans-serif',
    qrContainerBg = '#FFFFFF',
    qrBorderColor = null,
    qrBorderWidth = 0,
    qrShadow = true,
    trademarkStyle = {},
  } = options;

  const isDarkContainer = qrContainerBg && getRelativeLuminance(qrContainerBg) < 0.5;
  const isDarkCard = palette.textPrimary && getRelativeLuminance(palette.textPrimary) > 0.5;
  const dockBg = isDarkCard ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.035)';
  const dockBorder = qrBorderColor || (isDarkCard ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)');

  const tableCodeBorderColor = qrBorderColor || (isDarkContainer ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)');
  const tableCodeColor = isDarkContainer ? (palette.onAccent || '#FFFFFF') : '#111827';
  const tableCodeLabelColor = isDarkContainer ? (palette.textMuted || '#A0A0A8') : '#64748B';

  return [
    // ════════════════════════════════════════════════════════════════════════
    // LEFT TENT PANEL (Face A: Brand & Contactless Experience — center x=620)
    // ════════════════════════════════════════════════════════════════════════
    // 1. Restaurant Logo
    {
      id: 'logo',
      type: 'image',
      source: 'logo',
      x: 500,
      y: 75,
      w: 240,
      h: 130,
      radius: 16,
      clip: false,
    },
    // 2. Restaurant Name
    {
      id: 'name',
      type: 'text',
      source: 'name',
      x: 80,
      y: 220,
      w: 1080,
      h: 80,
      maxFontPx: 64,
      minFontPx: 38,
      font: headerFont,
      weight: 800,
      color: palette.textPrimary,
      align: 'center',
      fallback: 'Restaurant',
      contrastCheck: true,
    },
    // 3. Tagline / Cuisine Descriptor
    {
      id: 'tagline',
      type: 'text',
      source: 'tagline',
      x: 100,
      y: 310,
      w: 1040,
      h: 44,
      maxFontPx: 26,
      minFontPx: 16,
      maxLines: 1,
      font: bodyFont,
      weight: 600,
      letterSpacing: 2,
      uppercase: true,
      color: palette.textMuted,
      align: 'center',
      fallback: 'DELICIOUS FLAVORS & WARM SERVICE',
      contrastCheck: true,
    },
    // 4. Contactless Ordering 3-Step Guide Card (fills middle void)
    {
      id: 'leftDockBg',
      type: 'container',
      source: 'custom',
      x: 100,
      y: 375,
      w: 1040,
      h: 790,
      radius: 26,
      bgColor: dockBg,
      borderColor: dockBorder,
      borderWidth: 1.5,
    },
    {
      id: 'leftGuideTitle',
      type: 'text',
      source: 'custom',
      x: 120,
      y: 405,
      w: 1000,
      h: 44,
      text: '⚡ CONTACTLESS TABLE ORDERING',
      maxFontPx: 26,
      minFontPx: 18,
      maxLines: 1,
      font: headerFont,
      weight: 800,
      letterSpacing: 2,
      uppercase: true,
      color: palette.accent,
      align: 'center',
      contrastCheck: true,
    },
    // Step 01
    {
      id: 'step1Badge',
      type: 'pill',
      source: 'custom',
      x: 140,
      y: 480,
      w: 80,
      h: 56,
      radius: 28,
      bgColor: palette.accent,
      color: palette.onAccent,
      font: headerFont,
      weight: 800,
      maxFontPx: 26,
      minFontPx: 18,
      fallback: '01',
    },
    {
      id: 'step1Title',
      type: 'text',
      source: 'custom',
      x: 245,
      y: 480,
      w: 870,
      h: 30,
      text: 'POINT CAMERA AT TABLE QR',
      maxFontPx: 24,
      minFontPx: 16,
      maxLines: 1,
      font: bodyFont,
      weight: 700,
      color: palette.textPrimary,
      align: 'left',
      contrastCheck: true,
    },
    {
      id: 'step1Desc',
      type: 'text',
      source: 'custom',
      x: 245,
      y: 514,
      w: 870,
      h: 28,
      text: 'Scan the QR code on the opposite side of this tent stand',
      maxFontPx: 19,
      minFontPx: 13,
      maxLines: 1,
      font: bodyFont,
      weight: 500,
      color: palette.textMuted,
      align: 'left',
      contrastCheck: true,
    },
    // Step 02
    {
      id: 'step2Badge',
      type: 'pill',
      source: 'custom',
      x: 140,
      y: 585,
      w: 80,
      h: 56,
      radius: 28,
      bgColor: palette.accent,
      color: palette.onAccent,
      font: headerFont,
      weight: 800,
      maxFontPx: 26,
      minFontPx: 18,
      fallback: '02',
    },
    {
      id: 'step2Title',
      type: 'text',
      source: 'custom',
      x: 245,
      y: 585,
      w: 870,
      h: 30,
      text: 'EXPLORE LIVE DIGITAL MENU',
      maxFontPx: 24,
      minFontPx: 16,
      maxLines: 1,
      font: bodyFont,
      weight: 700,
      color: palette.textPrimary,
      align: 'left',
      contrastCheck: true,
    },
    {
      id: 'step2Desc',
      type: 'text',
      source: 'custom',
      x: 245,
      y: 619,
      w: 870,
      h: 28,
      text: 'Browse dishes, ingredients, prices, photos & daily chef specials',
      maxFontPx: 19,
      minFontPx: 13,
      maxLines: 1,
      font: bodyFont,
      weight: 500,
      color: palette.textMuted,
      align: 'left',
      contrastCheck: true,
    },
    // Step 03
    {
      id: 'step3Badge',
      type: 'pill',
      source: 'custom',
      x: 140,
      y: 690,
      w: 80,
      h: 56,
      radius: 28,
      bgColor: palette.accent,
      color: palette.onAccent,
      font: headerFont,
      weight: 800,
      maxFontPx: 26,
      minFontPx: 18,
      fallback: '03',
    },
    {
      id: 'step3Title',
      type: 'text',
      source: 'custom',
      x: 245,
      y: 690,
      w: 870,
      h: 30,
      text: 'ORDER & PAY DIRECTLY ON PHONE',
      maxFontPx: 24,
      minFontPx: 16,
      maxLines: 1,
      font: bodyFont,
      weight: 700,
      color: palette.textPrimary,
      align: 'left',
      contrastCheck: true,
    },
    {
      id: 'step3Desc',
      type: 'text',
      source: 'custom',
      x: 245,
      y: 724,
      w: 870,
      h: 28,
      text: 'Send orders straight to kitchen & complete payment with Telebirr',
      maxFontPx: 19,
      minFontPx: 13,
      maxLines: 1,
      font: bodyFont,
      weight: 500,
      color: palette.textMuted,
      align: 'left',
      contrastCheck: true,
    },
    // Feature highlight badge pill inside container
    {
      id: 'leftFeatureBadge',
      type: 'badge',
      source: 'custom',
      x: 140,
      y: 810,
      w: 960,
      h: 68,
      radius: 18,
      bgColor: qrContainerBg,
      borderColor: tableCodeBorderColor,
      borderWidth: 1.5,
      labelColor: tableCodeLabelColor,
      color: tableCodeColor,
      labelPrefix: 'SPEED: ',
      fallback: 'INSTANT KITCHEN DISPATCH • NO APP REQUIRED',
      labelPx: 16,
      codePx: 20,
      shadowColor: 'rgba(0,0,0,0.06)',
      shadowBlur: 10,
    },
    // Customer assurance note
    {
      id: 'leftCustomerNote',
      type: 'text',
      source: 'custom',
      x: 140,
      y: 920,
      w: 960,
      h: 36,
      text: 'Scan anytime for refills, add-ons, or bill payment during your visit',
      maxFontPx: 20,
      minFontPx: 14,
      maxLines: 1,
      font: bodyFont,
      weight: 600,
      color: palette.textPrimary,
      align: 'center',
      contrastCheck: true,
    },
    // 5. Telebirr Payment (Left Panel Footer)
    {
      id: 'payment',
      type: 'telebirr',
      source: 'payment',
      x: 80,
      y: 1220,
      w: 1080,
      h: 104,
      color: palette.textPrimary,
      labelColor: palette.textMuted,
      bodyFont,
    },
    // 6. LayoScan Trademark (Left Panel Bottom)
    {
      id: 'footer',
      type: 'trademark',
      source: 'footer',
      x: 80,
      y: 1360,
      w: 1080,
      h: 104,
      color: palette.textMuted,
      trademarkStyle,
    },

    // ════════════════════════════════════════════════════════════════════════
    // RIGHT TENT PANEL (Face B: Digital Ordering & QR Token — center x=1860)
    // ════════════════════════════════════════════════════════════════════════
    // 1. Mini Venue Identifier (so Face B identifies the restaurant)
    {
      id: 'rightVenueName',
      type: 'text',
      source: 'name',
      x: 1320,
      y: 75,
      w: 1080,
      h: 46,
      maxFontPx: 36,
      minFontPx: 22,
      maxLines: 1,
      font: headerFont,
      weight: 800,
      letterSpacing: 2,
      uppercase: true,
      color: palette.textPrimary,
      align: 'center',
      fallback: 'Restaurant',
      contrastCheck: true,
    },
    // 2. Table Number Pill Badge
    {
      id: 'tableLabel',
      type: 'pill',
      source: 'tableLabel',
      x: 1590,
      y: 140,
      w: 540,
      h: 90,
      radius: 45,
      bgColor: palette.accent,
      color: palette.onAccent,
      font: headerFont,
      weight: 800,
      maxFontPx: 46,
      minFontPx: 26,
      letterSpacing: 2,
      uppercase: true,
      shadowColor: 'rgba(0,0,0,0.18)',
      shadowBlur: 18,
      fallback: 'Table 1',
    },
    // 3. QR Code Slot: 700×700, qrSize 580 → 60px quiet zone = 10.34% ≥ 8%
    {
      id: 'qr',
      type: 'qr',
      source: 'qr',
      x: 1510,
      y: 265,
      w: 700,
      h: 700,
      qrSize: 580,
      bgColor: qrContainerBg,
      borderColor: qrBorderColor,
      borderWidth: qrBorderWidth,
      radius: 42,
      shadowColor: qrShadow ? 'rgba(0,0,0,0.18)' : null,
      shadowBlur: qrShadow ? 24 : 0,
      shadowOffsetY: 8,
    },
    // 4. Table Code Badge
    {
      id: 'tableCode',
      type: 'badge',
      source: 'tableCode',
      x: 1550,
      y: 1000,
      w: 620,
      h: 84,
      radius: 22,
      bgColor: qrContainerBg,
      borderColor: tableCodeBorderColor,
      borderWidth: 1.5,
      labelColor: tableCodeLabelColor,
      color: tableCodeColor,
      labelPrefix: 'TABLE CODE: ',
      labelPx: 19,
      codePx: 25,
      shadowColor: 'rgba(0,0,0,0.08)',
      shadowBlur: 12,
      fallback: 'TABLE-CODE',
    },
    // 5. Scan Prompts
    {
      id: 'scanPrompt',
      type: 'text',
      source: 'custom',
      x: 1320,
      y: 1105,
      w: 1080,
      h: 44,
      text: 'POINT CAMERA AT QR CODE TO VIEW MENU & ORDER',
      maxFontPx: 28,
      minFontPx: 18,
      maxLines: 1,
      font: bodyFont,
      weight: 700,
      letterSpacing: 1.5,
      color: palette.textPrimary,
      align: 'center',
      contrastCheck: true,
    },
    {
      id: 'scanSubPrompt',
      type: 'text',
      source: 'custom',
      x: 1320,
      y: 1155,
      w: 1080,
      h: 36,
      text: 'Instant digital ordering • No app download required',
      maxFontPx: 20,
      minFontPx: 14,
      maxLines: 1,
      font: bodyFont,
      weight: 500,
      color: palette.textMuted,
      align: 'center',
      contrastCheck: true,
    },
    // 6. Telebirr Payment (Right Panel Footer — Symmetrical with Left)
    {
      id: 'paymentRight',
      type: 'telebirr',
      source: 'payment',
      x: 1320,
      y: 1220,
      w: 1080,
      h: 104,
      color: palette.textPrimary,
      labelColor: palette.textMuted,
      bodyFont,
    },
    // 7. LayoScan Trademark (Right Panel Bottom — Symmetrical with Left)
    {
      id: 'footerRight',
      type: 'trademark',
      source: 'footer',
      x: 1320,
      y: 1360,
      w: 1080,
      h: 104,
      color: palette.textMuted,
      trademarkStyle,
    },
  ];
}

/**
 * Builds standard slot definitions for Menu Board Poster (1654 × 2339)
 * Safe zone: x 80–1574 · y 80–2259
 *
 * Slot layout from top to bottom:
 *   1. Branded Header (y: 80..290): Logo, Restaurant Name, Tagline
 *   2. Digital Ordering Bridge Dock (y: 312..556): Dock card, Table pill, Table code,
 *      scan instruction, and compact 220×220 scannable QR (10.4% quiet zone)
 *   3. Dynamic Two-Column Menu Spread (y: 576..1960): 2-column menu items with dot leaders and prices
 *   4. Payment & Trademark Dock (y: 1980..2220): Telebirr badge and LayoScan creative trademark mark
 */
function createMenuBoardSlots(palette, options = {}) {
  const {
    headerFont = 'Playfair Display, serif',
    bodyFont = 'Inter, sans-serif',
    qrContainerBg = '#FFFFFF',
    qrBorderColor = null,
    qrBorderWidth = 0,
    qrShadow = true,
    trademarkStyle = {},
  } = options;

  const isDarkContainer = qrContainerBg && getRelativeLuminance(qrContainerBg) < 0.5;
  const isDarkCard = palette.textPrimary && getRelativeLuminance(palette.textPrimary) > 0.5;
  const dockBg = isDarkCard ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.035)';
  const dockBorder = qrBorderColor || (isDarkCard ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)');

  const tableCodeBorderColor = qrBorderColor || (isDarkContainer ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)');
  const tableCodeColor = isDarkContainer ? (palette.onAccent || '#FFFFFF') : '#111827';
  const tableCodeLabelColor = isDarkContainer ? (palette.textMuted || '#A0A0A8') : '#64748B';

  return [
    // ── 1. BRANDED HEADER ZONE (y: 80..290) ─────────────────────────────────
    {
      id: 'logo',
      type: 'image',
      source: 'logo',
      x: 727,
      y: 80,
      w: 200,
      h: 96,
      radius: 16,
      clip: false,
    },
    {
      id: 'name',
      type: 'text',
      source: 'name',
      x: 80,
      y: 185,
      w: 1494,
      h: 68,
      maxFontPx: 56,
      minFontPx: 36,
      font: headerFont,
      weight: 800,
      color: palette.textPrimary,
      align: 'center',
      fallback: 'Restaurant',
      contrastCheck: true,
    },
    {
      id: 'tagline',
      type: 'text',
      source: 'tagline',
      x: 100,
      y: 258,
      w: 1454,
      h: 40,
      maxFontPx: 24,
      minFontPx: 16,
      maxLines: 1,
      font: bodyFont,
      weight: 600,
      letterSpacing: 2,
      uppercase: true,
      color: palette.textMuted,
      align: 'center',
      fallback: 'DELICIOUS FLAVORS & WARM SERVICE',
      contrastCheck: true,
    },

    // ── 2. DIGITAL ORDERING BRIDGE DOCK (y: 312..556) ───────────────────────
    {
      id: 'dockBg',
      type: 'container',
      source: 'custom',
      x: 100,
      y: 312,
      w: 1454,
      h: 244,
      radius: 24,
      bgColor: dockBg,
      borderColor: dockBorder,
      borderWidth: 1.5,
    },
    {
      id: 'tableLabel',
      type: 'pill',
      source: 'tableLabel',
      x: 140,
      y: 340,
      w: 260,
      h: 64,
      radius: 32,
      bgColor: palette.accent,
      color: palette.onAccent,
      font: headerFont,
      weight: 700,
      maxFontPx: 30,
      minFontPx: 20,
      letterSpacing: 2,
      uppercase: true,
      shadowColor: 'rgba(0,0,0,0.12)',
      shadowBlur: 14,
      fallback: 'Table 1',
    },
    {
      id: 'tableCode',
      type: 'badge',
      source: 'tableCode',
      x: 425,
      y: 340,
      w: 460,
      h: 64,
      radius: 18,
      bgColor: qrContainerBg,
      borderColor: tableCodeBorderColor,
      borderWidth: 1.5,
      labelColor: tableCodeLabelColor,
      color: tableCodeColor,
      labelPrefix: 'CODE: ',
      labelPx: 18,
      codePx: 24,
      shadowColor: 'rgba(0,0,0,0.06)',
      shadowBlur: 10,
      fallback: 'TABLE-CODE',
    },
    {
      id: 'scanPrompt',
      type: 'text',
      source: 'custom',
      x: 140,
      y: 424,
      w: 780,
      h: 40,
      text: 'Scan QR with phone camera to view live menu & order',
      maxFontPx: 22,
      minFontPx: 16,
      maxLines: 1,
      font: bodyFont,
      weight: 600,
      color: palette.textPrimary,
      align: 'left',
      contrastCheck: true,
    },
    {
      id: 'scanSubPrompt',
      type: 'text',
      source: 'custom',
      x: 140,
      y: 470,
      w: 780,
      h: 36,
      text: 'Instant digital ordering • No app download required',
      maxFontPx: 17,
      minFontPx: 13,
      maxLines: 1,
      font: bodyFont,
      weight: 500,
      color: palette.textMuted,
      align: 'left',
      contrastCheck: true,
    },
    // QR Code Slot: 220×220, qrSize: 182 → 19px padding → 10.4% quiet zone ≥ 8%
    {
      id: 'qr',
      type: 'qr',
      source: 'qr',
      x: 1290,
      y: 324,
      w: 220,
      h: 220,
      qrSize: 182,
      bgColor: qrContainerBg,
      borderColor: qrBorderColor,
      borderWidth: qrBorderWidth,
      radius: 20,
      shadowColor: qrShadow ? 'rgba(0,0,0,0.16)' : null,
      shadowBlur: qrShadow ? 20 : 0,
      shadowOffsetY: 6,
    },

    // ── 3. DYNAMIC TWO-COLUMN MENU SPREAD (y: 576..1960) ────────────────────
    {
      id: 'menu',
      type: 'menu_grid',
      source: 'menu',
      x: 100,
      y: 576,
      w: 1454,
      h: 1384,
      col1X: 110,
      col2X: 860,
      colWidth: 684,
      startY: 576,
      endY: 1960,
      headerFont: `700 40px ${headerFont}`,
      itemFont: `700 26px ${headerFont}`,
      priceFont: '800 26px "Space Grotesk", monospace',
      theme: isDarkCard ? 'dark' : 'light',
      accentColor: palette.accent,
      titleColor: palette.textPrimary,
      bodyColor: palette.textMuted,
      priceColor: palette.accent,
      showDivider: true,
      dividerColor: palette.accent,
    },

    // ── 4. FOOTER & TELEBIRR PAYMENT DOCK (y: 1980..2220) ───────────────────
    {
      id: 'payment',
      type: 'telebirr',
      source: 'payment',
      x: 100,
      y: 1995,
      w: 1454,
      h: 96,
      color: palette.textPrimary,
      labelColor: palette.textMuted,
      bodyFont,
    },
    {
      id: 'footer',
      type: 'trademark',
      source: 'footer',
      x: 100,
      y: 2105,
      w: 1454,
      h: 96,
      color: palette.textMuted,
      trademarkStyle,
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// 9 DESIGN DEFINITIONS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * @type {Array<CardDesign>}
 */
export const CARD_DESIGNS = [
  // ── 1. ARTISAN LINEN ───────────────────────────────────────────────────────
  /**
   * Concept: Warm cream textured linen parchment, botanical corner accents,
   * latte hero tier, with sophisticated Playfair Display serifs and Inter body.
   * Suited for cafes, artisanal bakeries, and boutique roasteries.
   */
  {
    id: 'artisan_linen',
    name: 'Artisan Linen',
    category: 'Cafe & Bakery',
    icon: '☕',
    description: 'Warm textured linen parchment with delicate botanical sprigs and latte art',
    venueType: 'Café / bakery / roastery',
    colors: {
      accent: '#1B382B',
      onAccent: '#FFFFFF',
      textPrimary: '#1B382B',
      textMuted: '#5C6F64',
      background: '#F8F6F0',
    },
    backgrounds: {
      portrait: artisan_linen_portrait,
      landscape: artisan_linen_landscape,
      menu_board: artisan_linen_menu_board,
    },
    supportsBrandWash: true,
    layouts: {
      portrait: {
        safeArea: STANDARD_SAFE_AREAS.portrait,
        slots: createPortraitSlots(
          { accent: '#1B382B', onAccent: '#FFFFFF', textPrimary: '#1B382B', textMuted: '#5C6F64' },
          {
            hasHero: true,
            headerFont: '"Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFFFF',
            trademarkStyle: { prefix: '✿', textColor: '#1B382B', font: '"Playfair Display", Georgia, serif', italic: true, weight: 700, letterSpacing: 1, showLines: false, subtext: 'Scan. Dine. Done.' },
          }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#1B382B', onAccent: '#FFFFFF', textPrimary: '#1B382B', textMuted: '#5C6F64' },
          {
            headerFont: '"Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFFFF',
            trademarkStyle: { prefix: '✿', textColor: '#1B382B', font: '"Playfair Display", Georgia, serif', italic: true, weight: 700, letterSpacing: 1, showLines: false, subtext: 'Scan. Dine. Done.' },
          }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#1B382B', onAccent: '#FFFFFF', textPrimary: '#1B382B', textMuted: '#5C6F64' },
          {
            headerFont: '"Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFFFF',
            trademarkStyle: { prefix: '✿', textColor: '#1B382B', font: '"Playfair Display", Georgia, serif', italic: true, weight: 700, letterSpacing: 1, showLines: false, subtext: 'Scan. Dine. Done.' },
          }
        ),
      },
    },
  },

  // ── 2. BOLD STREET ─────────────────────────────────────────────────────────
  /**
   * Concept: Matte dark charcoal background with high-voltage amber-gold ribbon waves,
   * huge condensed headlines, and high-energy street food styling.
   *
   * Coordinate Reasoning:
   * - Charcoal background demands pure white textPrimary (#FFFFFF) and luminous amber (#FFA800)
   *   accent for maximum contrast and legibility under dim quick-service lighting.
   * - In Portrait: Restaurant name receives a wide 1080px slot at y=190 with heavy bold weighting,
   *   anchored by an oversized amber Table Pill (y=360) and a crisp white QR card (y=480, 600×600)
   *   with an effective 9.52% quiet zone that pops off the dark canvas.
   * - In Landscape: Dual-panel layout separates ordering flow on left from scannable table token on right,
   *   perfect for busy burger joints and pizza counters where diners sit facing across the table.
   */
  {
    id: 'bold_street',
    name: 'Bold Street',
    category: 'Fast Casual & Street Food',
    icon: '🍔',
    description: 'Matte dark charcoal mode with radiant amber-gold ribbon waves and street energy',
    venueType: 'Fast food / burger / pizza',
    colors: {
      accent: '#FFA800',
      onAccent: '#141414',
      textPrimary: '#FFFFFF',
      textMuted: '#A0A0A8',
      background: '#1A1A1E',
    },
    backgrounds: {
      portrait: bold_street_portrait,
      landscape: bold_street_landscape,
      menu_board: bold_street_menu_board,
    },
    supportsBrandWash: false,
    layouts: {
      portrait: {
        safeArea: STANDARD_SAFE_AREAS.portrait,
        slots: createPortraitSlots(
          { accent: '#FFA800', onAccent: '#141414', textPrimary: '#FFFFFF', textMuted: '#A0A0A8' },
          {
            headerFont: '"Space Grotesk", Inter, sans-serif',
            uppercaseName: true,
            qrContainerBg: '#1A1A1E',
            qrBorderColor: '#FFA800',
            qrBorderWidth: 2,
            trademarkStyle: { prefix: '⚡', textColor: '#FFA800', font: '"Space Grotesk", Inter, sans-serif', weight: 800, letterSpacing: 3, uppercase: true, bgPill: true, bgColor: 'rgba(255,168,0,0.12)', borderColor: 'rgba(255,168,0,0.5)', subtext: 'CONTACTLESS ORDERING' },
          }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#FFA800', onAccent: '#141414', textPrimary: '#FFFFFF', textMuted: '#A0A0A8' },
          {
            headerFont: '"Space Grotesk", Inter, sans-serif',
            qrContainerBg: '#1A1A1E',
            qrBorderColor: '#FFA800',
            qrBorderWidth: 2,
            trademarkStyle: { prefix: '⚡', textColor: '#FFA800', font: '"Space Grotesk", Inter, sans-serif', weight: 800, letterSpacing: 3, uppercase: true, bgPill: true, bgColor: 'rgba(255,168,0,0.12)', borderColor: 'rgba(255,168,0,0.5)', subtext: 'CONTACTLESS ORDERING' },
          }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#FFA800', onAccent: '#141414', textPrimary: '#FFFFFF', textMuted: '#A0A0A8' },
          {
            headerFont: '"Space Grotesk", Inter, sans-serif',
            qrContainerBg: '#1A1A1E',
            qrBorderColor: '#FFA800',
            qrBorderWidth: 2,
            trademarkStyle: { prefix: '⚡', textColor: '#FFA800', font: '"Space Grotesk", Inter, sans-serif', weight: 800, letterSpacing: 3, uppercase: true, bgPill: true, bgColor: 'rgba(255,168,0,0.12)', borderColor: 'rgba(255,168,0,0.5)', subtext: 'CONTACTLESS ORDERING' },
          }
        ),
      },
    },
  },

  // ── 3. FRESH EMERALD ───────────────────────────────────────────────────────
  /**
   * Concept: Deep organic emerald background with garden harvest produce bleed,
   * mint green accents, and botanical vitality. Perfect for juice bars and organic markets.
   */
  {
    id: 'fresh_emerald',
    name: 'Fresh Emerald',
    category: 'Market & Deli',
    icon: '🥗',
    description: 'Lush deep emerald gradient with fresh harvest produce and botanical vitality',
    venueType: 'Juice / health / market',
    colors: {
      accent: '#86EFAC',
      onAccent: '#0B3B24',
      textPrimary: '#F0FDF4',
      textMuted: '#A7F3C0',
      background: '#0B3B24',
    },
    backgrounds: {
      portrait: fresh_emerald_portrait,
      landscape: fresh_emerald_landscape,
      menu_board: fresh_emerald_menu_board,
    },
    supportsBrandWash: true,
    layouts: {
      portrait: {
        safeArea: STANDARD_SAFE_AREAS.portrait,
        slots: createPortraitSlots(
          { accent: '#86EFAC', onAccent: '#0B3B24', textPrimary: '#F0FDF4', textMuted: '#A7F3C0' },
          {
            hasHero: true,
            headerFont: '"Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFFFF',
            qrBorderColor: '#86EFAC',
            qrBorderWidth: 2,
            trademarkStyle: { prefix: '▲', suffix: '▲', textColor: '#86EFAC', font: '"Playfair Display", Georgia, serif', weight: 700, letterSpacing: 2, showLines: true, lineColor: 'rgba(134,239,172,0.5)', subtext: 'Fresh Tech. Fresh Taste.' },
          }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#86EFAC', onAccent: '#0B3B24', textPrimary: '#F0FDF4', textMuted: '#A7F3C0' },
          {
            headerFont: '"Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFFFF',
            qrBorderColor: '#86EFAC',
            qrBorderWidth: 2,
            trademarkStyle: { prefix: '▲', suffix: '▲', textColor: '#86EFAC', font: '"Playfair Display", Georgia, serif', weight: 700, letterSpacing: 2, showLines: true, lineColor: 'rgba(134,239,172,0.5)', subtext: 'Fresh Tech. Fresh Taste.' },
          }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#86EFAC', onAccent: '#0B3B24', textPrimary: '#F0FDF4', textMuted: '#A7F3C0' },
          {
            headerFont: '"Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFFFF',
            qrBorderColor: '#86EFAC',
            qrBorderWidth: 2,
            trademarkStyle: { prefix: '▲', suffix: '▲', textColor: '#86EFAC', font: '"Playfair Display", Georgia, serif', weight: 700, letterSpacing: 2, showLines: true, lineColor: 'rgba(134,239,172,0.5)', subtext: 'Fresh Tech. Fresh Taste.' },
          }
        ),
      },
    },
  },

  // ── 4. MIDNIGHT GOLD ───────────────────────────────────────────────────────
  /**
   * Concept: Architectural midnight navy with corner gold dot insets, champagne gold
   * typography tiers, and refined hospitality presence for hotels and fine dining.
   */
  {
    id: 'midnight_gold',
    name: 'Midnight Gold',
    category: 'Hotel & Fine Dining',
    icon: '🏨',
    description: 'Midnight navy with architectural gold framing and refined hospitality',
    venueType: 'Hotel / fine dining',
    colors: {
      accent: '#E5C583',
      onAccent: '#0C192E',
      textPrimary: '#FFFFFF',
      textMuted: '#C5B083',
      background: '#0C192E',
    },
    backgrounds: {
      portrait: midnight_gold_portrait,
      landscape: midnight_gold_landscape,
      menu_board: midnight_gold_menu_board,
    },
    supportsBrandWash: false,
    layouts: {
      portrait: {
        safeArea: STANDARD_SAFE_AREAS.portrait,
        slots: createPortraitSlots(
          { accent: '#E5C583', onAccent: '#0C192E', textPrimary: '#FFFFFF', textMuted: '#C5B083' },
          {
            hasHero: true,
            headerFont: '"Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFFFF',
            qrBorderColor: '#E5C583',
            qrBorderWidth: 2,
            trademarkStyle: { prefix: '—', suffix: '—', textColor: '#E5C583', font: '"Playfair Display", Georgia, serif', italic: true, weight: 600, letterSpacing: 1.5, showLines: true, lineColor: 'rgba(229,197,131,0.4)', subtext: 'Digital Hospitality' },
          }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#E5C583', onAccent: '#0C192E', textPrimary: '#FFFFFF', textMuted: '#C5B083' },
          {
            headerFont: '"Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFFFF',
            qrBorderColor: '#E5C583',
            qrBorderWidth: 2,
            trademarkStyle: { prefix: '—', suffix: '—', textColor: '#E5C583', font: '"Playfair Display", Georgia, serif', italic: true, weight: 600, letterSpacing: 1.5, showLines: true, lineColor: 'rgba(229,197,131,0.4)', subtext: 'Digital Hospitality' },
          }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#E5C583', onAccent: '#0C192E', textPrimary: '#FFFFFF', textMuted: '#C5B083' },
          {
            headerFont: '"Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFFFF',
            qrBorderColor: '#E5C583',
            qrBorderWidth: 2,
            trademarkStyle: { prefix: '—', suffix: '—', textColor: '#E5C583', font: '"Playfair Display", Georgia, serif', italic: true, weight: 600, letterSpacing: 1.5, showLines: true, lineColor: 'rgba(229,197,131,0.4)', subtext: 'Digital Hospitality' },
          }
        ),
      },
    },
  },

  // ── 5. HABESHA HERITAGE ────────────────────────────────────────────────────
  /**
   * Concept: Aged Brana parchment paper tone, royal Ethiopian Tibeb woven ribbon border,
   * Mesob feast motif, and full native support for Ge'ez / Amharic typography.
   */
  {
    id: 'habesha_heritage',
    name: 'Habesha Heritage',
    category: 'Cultural Dining',
    icon: '🍲',
    description: 'Aged Brana parchment with authentic royal Tibeb woven border and Mesob feast',
    venueType: 'Traditional Ethiopian',
    colors: {
      accent: '#781812',
      onAccent: '#FFFFFF',
      textPrimary: '#381E11',
      textMuted: '#784931',
      background: '#F5EBE1',
    },
    backgrounds: {
      portrait: habesha_heritage_portrait,
      landscape: habesha_heritage_landscape,
      menu_board: habesha_heritage_menu_board,
    },
    supportsBrandWash: true,
    layouts: {
      portrait: {
        safeArea: STANDARD_SAFE_AREAS.portrait,
        slots: createPortraitSlots(
          { accent: '#781812', onAccent: '#FFFFFF', textPrimary: '#381E11', textMuted: '#784931' },
          {
            hasHero: true,
            headerFont: '"Noto Sans Ethiopic", "Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFDF9',
            qrBorderColor: '#781812',
            qrBorderWidth: 2,
            trademarkStyle: { prefix: '✦', suffix: '✦', textColor: '#781812', font: '"Noto Sans Ethiopic", "Playfair Display", serif', weight: 700, letterSpacing: 2, bgPill: true, bgColor: 'rgba(120,24,18,0.07)', borderColor: 'rgba(120,24,18,0.25)', subtext: 'ዲጂታል ምናሌ · Digital Menu' },
          }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#781812', onAccent: '#FFFFFF', textPrimary: '#381E11', textMuted: '#784931' },
          {
            headerFont: '"Noto Sans Ethiopic", "Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFDF9',
            qrBorderColor: '#781812',
            qrBorderWidth: 2,
            trademarkStyle: { prefix: '✦', suffix: '✦', textColor: '#781812', font: '"Noto Sans Ethiopic", "Playfair Display", serif', weight: 700, letterSpacing: 2, bgPill: true, bgColor: 'rgba(120,24,18,0.07)', borderColor: 'rgba(120,24,18,0.25)', subtext: 'ዲጂታል ምናሌ · Digital Menu' },
          }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#781812', onAccent: '#FFFFFF', textPrimary: '#381E11', textMuted: '#784931' },
          {
            headerFont: '"Noto Sans Ethiopic", "Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFDF9',
            qrBorderColor: '#781812',
            qrBorderWidth: 2,
            trademarkStyle: { prefix: '✦', suffix: '✦', textColor: '#781812', font: '"Noto Sans Ethiopic", "Playfair Display", serif', weight: 700, letterSpacing: 2, bgPill: true, bgColor: 'rgba(120,24,18,0.07)', borderColor: 'rgba(120,24,18,0.25)', subtext: 'ዲጂታል ምናሌ · Digital Menu' },
          }
        ),
      },
    },
  },

  // ── 6. VELVET LOUNGE ───────────────────────────────────────────────────────
  /**
   * Concept: Luxurious dark velvet ambiance with amber bokeh, gold brackets,
   * and craft cocktail photography bleed for upscale bars and lounges.
   */
  {
    id: 'velvet_lounge',
    name: 'Velvet Lounge',
    category: 'Bar, Lounge & Club',
    icon: '🍸',
    description: 'Luxurious dark velvet ambiance with amber bokeh, gold brackets, and craft cocktails',
    venueType: 'Bar / lounge / club',
    colors: {
      accent: '#E5C583',
      onAccent: '#0D0B08',
      textPrimary: '#FFFDF7',
      textMuted: '#C5B083',
      background: '#14110E',
    },
    backgrounds: {
      portrait: velvet_lounge_portrait,
      landscape: velvet_lounge_landscape,
      menu_board: velvet_lounge_menu_board,
    },
    supportsBrandWash: false,
    layouts: {
      portrait: {
        safeArea: STANDARD_SAFE_AREAS.portrait,
        slots: createPortraitSlots(
          { accent: '#E5C583', onAccent: '#0D0B08', textPrimary: '#FFFDF7', textMuted: '#C5B083' },
          {
            hasHero: true,
            headerFont: '"Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFDF7',
            qrBorderColor: '#E5C583',
            qrBorderWidth: 1.5,
            trademarkStyle: { prefix: '✦', suffix: '✦', textColor: '#E5C583', font: '"Playfair Display", Georgia, serif', italic: true, weight: 700, letterSpacing: 2, bgPill: true, bgColor: 'rgba(229,197,131,0.07)', borderColor: 'rgba(229,197,131,0.3)', subtext: 'Premium Digital Experience' },
          }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#E5C583', onAccent: '#0D0B08', textPrimary: '#FFFDF7', textMuted: '#C5B083' },
          {
            headerFont: '"Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFDF7',
            qrBorderColor: '#E5C583',
            qrBorderWidth: 1.5,
            trademarkStyle: { prefix: '✦', suffix: '✦', textColor: '#E5C583', font: '"Playfair Display", Georgia, serif', italic: true, weight: 700, letterSpacing: 2, bgPill: true, bgColor: 'rgba(229,197,131,0.07)', borderColor: 'rgba(229,197,131,0.3)', subtext: 'Premium Digital Experience' },
          }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#E5C583', onAccent: '#0D0B08', textPrimary: '#FFFDF7', textMuted: '#C5B083' },
          {
            headerFont: '"Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFDF7',
            qrBorderColor: '#E5C583',
            qrBorderWidth: 1.5,
            trademarkStyle: { prefix: '✦', suffix: '✦', textColor: '#E5C583', font: '"Playfair Display", Georgia, serif', italic: true, weight: 700, letterSpacing: 2, bgPill: true, bgColor: 'rgba(229,197,131,0.07)', borderColor: 'rgba(229,197,131,0.3)', subtext: 'Premium Digital Experience' },
          }
        ),
      },
    },
  },

  // ── 7. JUICE & SPRIS ───────────────────────────────────────────────────────
  /**
   * Concept: Vivid layered tropical gradient, fruit slices stack, tall glass hero,
   * lively blood-orange and lime accents for fresh juice houses and smoothie bars.
   */
  {
    id: 'juice_spris',
    name: 'Juice & Spris',
    category: 'Juice & Beverage',
    icon: '🍹',
    description: 'Vivid layered gradient, fruit stack, and fresh spris vitality',
    venueType: 'Juice house / spris bar',
    colors: {
      accent: '#FF5722',
      onAccent: '#FFFFFF',
      textPrimary: '#1E1B18',
      textMuted: '#6E6760',
      background: '#FFF8F0',
    },
    backgrounds: {
      portrait: juice_spris_portrait,
      landscape: juice_spris_landscape,
      menu_board: juice_spris_menu_board,
    },
    supportsBrandWash: true,
    layouts: {
      portrait: {
        safeArea: STANDARD_SAFE_AREAS.portrait,
        slots: createPortraitSlots(
          { accent: '#FF5722', onAccent: '#FFFFFF', textPrimary: '#1E1B18', textMuted: '#6E6760' },
          {
            hasHero: true,
            headerFont: 'Inter, sans-serif',
            qrContainerBg: '#FFFFFF',
            qrBorderColor: '#FFCCBC',
            qrBorderWidth: 1.5,
            trademarkStyle: { prefix: '☀', textColor: '#FF5722', font: 'Inter, sans-serif', weight: 800, letterSpacing: 1, showLines: false, subtext: 'Fresh Order. Fast Service.' },
          }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#FF5722', onAccent: '#FFFFFF', textPrimary: '#1E1B18', textMuted: '#6E6760' },
          {
            headerFont: 'Inter, sans-serif',
            qrContainerBg: '#FFFFFF',
            qrBorderColor: '#FFCCBC',
            qrBorderWidth: 1.5,
            trademarkStyle: { prefix: '☀', textColor: '#FF5722', font: 'Inter, sans-serif', weight: 800, letterSpacing: 1, showLines: false, subtext: 'Fresh Order. Fast Service.' },
          }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#FF5722', onAccent: '#FFFFFF', textPrimary: '#1E1B18', textMuted: '#6E6760' },
          {
            headerFont: 'Inter, sans-serif',
            qrContainerBg: '#FFFFFF',
            qrBorderColor: '#FFCCBC',
            qrBorderWidth: 1.5,
            trademarkStyle: { prefix: '☀', textColor: '#FF5722', font: 'Inter, sans-serif', weight: 800, letterSpacing: 1, showLines: false, subtext: 'Fresh Order. Fast Service.' },
          }
        ),
      },
    },
  },

  // ── 8. CAFÉ TENT CLASSIC ───────────────────────────────────────────────────
  /**
   * Concept: Classic field green stationery, oversized vertical "MENU" typography watermark,
   * clean white rounded QR card, and photo strip layout for family diners and bistros.
   */
  {
    id: 'cafe_tent_classic',
    name: 'Café Tent Classic',
    category: 'Casual Dining',
    icon: '🍽️',
    description: 'Field green accents, oversized vertical typography, and clean photo strip',
    venueType: 'General / family',
    colors: {
      accent: '#2E7D32',
      onAccent: '#FFFFFF',
      textPrimary: '#1B382B',
      textMuted: '#4F6A5B',
      background: '#F3F7F4',
    },
    backgrounds: {
      portrait: cafe_tent_classic_portrait,
      landscape: cafe_tent_classic_landscape,
      menu_board: cafe_tent_classic_menu_board,
    },
    supportsBrandWash: true,
    layouts: {
      portrait: {
        safeArea: STANDARD_SAFE_AREAS.portrait,
        slots: createPortraitSlots(
          { accent: '#2E7D32', onAccent: '#FFFFFF', textPrimary: '#1B382B', textMuted: '#4F6A5B' },
          {
            hasHero: true,
            headerFont: '"Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFFFF',
            trademarkStyle: { prefix: '●', textColor: '#2E7D32', font: '"Playfair Display", Georgia, serif', weight: 700, letterSpacing: 1, showLines: true, lineColor: 'rgba(46,125,50,0.4)', subtext: 'Contactless Table Dining' },
          }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#2E7D32', onAccent: '#FFFFFF', textPrimary: '#1B382B', textMuted: '#4F6A5B' },
          {
            headerFont: '"Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFFFF',
            trademarkStyle: { prefix: '●', textColor: '#2E7D32', font: '"Playfair Display", Georgia, serif', weight: 700, letterSpacing: 1, showLines: true, lineColor: 'rgba(46,125,50,0.4)', subtext: 'Contactless Table Dining' },
          }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#2E7D32', onAccent: '#FFFFFF', textPrimary: '#1B382B', textMuted: '#4F6A5B' },
          {
            headerFont: '"Playfair Display", Georgia, serif',
            qrContainerBg: '#FFFFFF',
            trademarkStyle: { prefix: '●', textColor: '#2E7D32', font: '"Playfair Display", Georgia, serif', weight: 700, letterSpacing: 1, showLines: true, lineColor: 'rgba(46,125,50,0.4)', subtext: 'Contactless Table Dining' },
          }
        ),
      },
    },
  },

  // ── 9. MODERN MINIMAL ──────────────────────────────────────────────────────
  /**
   * Concept: Off-white architectural aesthetic, single accent rule, generous whitespace,
   * type-only elegance. The universal commercial default that looks striking with NO photography,
   * NO logo, and NO brand color.
   *
   * Coordinate Reasoning:
   * - In Portrait: Logo and hero are explicitly omitted (hasHero: false). The restaurant name
   *   is placed at y=190 in a wide 1080px slot with Inter 600 weighting and generous letter spacing,
   *   followed by an ultra-crisp uppercase tagline.
   * - The Table Pill sits at y=360 with a deep ink background (#18181B) and sharp white text.
   * - The QR code container sits at y=480 (w: 600, h: 600) with a 504px QR code, guaranteeing
   *   a 48px quiet zone (9.52% > 8% threshold) surrounded by a subtle 1px border.
   * - Below the QR code sits the structured Table Code badge at y=1110 and payment accounts at y=1205.
   * - When a 40-character restaurant name or 90-character tagline is tested, fitText steps down cleanly
   *   within the 1080px box without overflow or clipping.
   */
  {
    id: 'modern_minimal',
    name: 'Modern Minimal',
    category: 'Minimalist & Modern',
    icon: '✨',
    description: 'Off-white architectural chalk, single accent rule, generous whitespace, type-only',
    venueType: 'Any — safe default',
    colors: {
      accent: '#18181B',
      onAccent: '#FFFFFF',
      textPrimary: '#18181B',
      textMuted: '#71717A',
      background: '#FAFAFA',
    },
    backgrounds: {
      portrait: modern_minimal_portrait,
      landscape: modern_minimal_landscape,
      menu_board: modern_minimal_menu_board,
    },
    supportsBrandWash: true,
    layouts: {
      portrait: {
        safeArea: STANDARD_SAFE_AREAS.portrait,
        slots: createPortraitSlots(
          { accent: '#18181B', onAccent: '#FFFFFF', textPrimary: '#18181B', textMuted: '#71717A' },
          {
            hasHero: false,
            headerFont: 'Inter, -apple-system, sans-serif',
            qrContainerBg: '#FFFFFF',
            qrBorderColor: '#D4D4D8',
            qrBorderWidth: 1.5,
            qrShadow: true,
            trademarkStyle: { prefix: '·', suffix: '·', textColor: '#18181B', font: 'Inter, -apple-system, sans-serif', weight: 600, letterSpacing: 4, uppercase: true, showLines: true, lineColor: 'rgba(24,24,27,0.18)', subtext: 'Scan to Order' },
          }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#18181B', onAccent: '#FFFFFF', textPrimary: '#18181B', textMuted: '#71717A' },
          {
            headerFont: 'Inter, -apple-system, sans-serif',
            qrContainerBg: '#FFFFFF',
            qrBorderColor: '#D4D4D8',
            qrBorderWidth: 1.5,
            qrShadow: true,
            trademarkStyle: { prefix: '·', suffix: '·', textColor: '#18181B', font: 'Inter, -apple-system, sans-serif', weight: 600, letterSpacing: 4, uppercase: true, showLines: true, lineColor: 'rgba(24,24,27,0.18)', subtext: 'Scan to Order' },
          }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#18181B', onAccent: '#FFFFFF', textPrimary: '#18181B', textMuted: '#71717A' },
          {
            headerFont: 'Inter, -apple-system, sans-serif',
            qrContainerBg: '#FFFFFF',
            qrBorderColor: '#D4D4D8',
            qrBorderWidth: 1.5,
            qrShadow: true,
            trademarkStyle: { prefix: '·', suffix: '·', textColor: '#18181B', font: 'Inter, -apple-system, sans-serif', weight: 600, letterSpacing: 4, uppercase: true, showLines: true, lineColor: 'rgba(24,24,27,0.18)', subtext: 'Scan to Order' },
          }
        ),
      },
    },
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// SPEC VALIDATION & INTEGRITY ASSERTIONS (§10.6)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Validates layout specifications against all architectural constraints:
 * - Exactly 9 designs defined
 * - All 3 orientations present per design with valid dimensions
 * - Safe areas inset by at least 40px
 * - Every slot completely contained inside its orientation's safe area
 * - Every QR slot has quiet zone >= 8% of QR size
 * - Every tagline has maxLines: 1 and minFontPx >= 0.6 * maxFontPx
 *
 * @param {Array<CardDesign>} designs
 * @returns {{ valid: boolean, checkedCount: number, qrCount: number, errors: string[] }}
 */
export function validateLayoutSpecs(designs = CARD_DESIGNS) {
  const errors = [];
  let checkedCount = 0;
  let qrCount = 0;

  if (!Array.isArray(designs) || designs.length !== 9) {
    errors.push(`Expected exactly 9 card designs in spec, found ${designs?.length || 0}`);
  }

  const requiredOrientations = ['portrait', 'landscape', 'menu_board'];

  for (const design of designs || []) {
    if (!design.id) errors.push(`Design missing id`);
    if (!design.name) errors.push(`Design ${design.id} missing name`);
    if (!design.backgrounds) errors.push(`Design ${design.id} missing backgrounds object`);

    for (const orientKey of requiredOrientations) {
      const format = CANVAS_FORMATS[orientKey];
      if (!format) {
        errors.push(`Unknown canvas format ${orientKey}`);
        continue;
      }

      const layout = design.layouts?.[orientKey];
      if (!layout) {
        errors.push(`Design "${design.id}" is missing layout for orientation "${orientKey}"`);
        continue;
      }

      const { safeArea, slots } = layout;
      if (!safeArea) {
        errors.push(`Design "${design.id}" (${orientKey}) is missing safeArea definition`);
        continue;
      }

      // Assert safe area insets >= 40px
      if (
        safeArea.top < 40 ||
        safeArea.right < 40 ||
        safeArea.bottom < 40 ||
        safeArea.left < 40
      ) {
        errors.push(
          `Design "${design.id}" (${orientKey}) safeArea violates minimum 40px inset rule: ${JSON.stringify(safeArea)}`
        );
      }

      const maxSafeX = format.width - safeArea.right;
      const maxSafeY = format.height - safeArea.bottom;

      if (!Array.isArray(slots) || slots.length === 0) {
        errors.push(`Design "${design.id}" (${orientKey}) has no slots defined`);
        continue;
      }

      let foundQR = false;

      for (const slot of slots) {
        checkedCount++;

        // 1. Verify Slot is within Safe Area bounds
        const slotW = slot.w || 0;
        const slotH = slot.h || 0;

        if (slot.x < safeArea.left) {
          errors.push(
            `Slot "${slot.id}" in "${design.id}" (${orientKey}) left edge (${slot.x}px) exceeds safeArea.left (${safeArea.left}px)`
          );
        }
        if (slot.y < safeArea.top) {
          errors.push(
            `Slot "${slot.id}" in "${design.id}" (${orientKey}) top edge (${slot.y}px) exceeds safeArea.top (${safeArea.top}px)`
          );
        }
        if (slot.x + slotW > maxSafeX) {
          errors.push(
            `Slot "${slot.id}" in "${design.id}" (${orientKey}) right edge (${slot.x + slotW}px) exceeds safe area boundary (${maxSafeX}px)`
          );
        }
        if (slot.y + slotH > maxSafeY) {
          errors.push(
            `Slot "${slot.id}" in "${design.id}" (${orientKey}) bottom edge (${slot.y + slotH}px) exceeds safe area boundary (${maxSafeY}px)`
          );
        }

        // 2. Verify QR Quiet Zone Scannability (§10.6)
        if (slot.type === 'qr') {
          foundQR = true;
          qrCount++;
          const quietRatio = getEffectiveQuietZoneRatio(slot);
          if (quietRatio < MIN_QUIET_ZONE_RATIO) {
            errors.push(
              `QR Slot "${slot.id}" in "${design.id}" (${orientKey}) quiet zone ratio (${(quietRatio * 100).toFixed(1)}%) is below required ${(MIN_QUIET_ZONE_RATIO * 100)}% minimum`
            );
          }
        }

        // 3. Verify Tagline Constraint (§2)
        if (slot.source === 'tagline') {
          if (slot.maxLines !== 1) {
            errors.push(
              `Tagline slot in "${design.id}" (${orientKey}) must have maxLines: 1, got ${slot.maxLines}`
            );
          }
          const minRatio = slot.minFontPx / slot.maxFontPx;
          if (minRatio < 0.6) {
            errors.push(
              `Tagline slot in "${design.id}" (${orientKey}) minFontPx (${slot.minFontPx}) is below 60% of maxFontPx (${slot.maxFontPx})`
            );
          }
        }
      }

      if (!foundQR) {
        errors.push(`Design "${design.id}" (${orientKey}) does not contain a QR slot`);
      }
    }
  }

  if (errors.length > 0) {
    const errorMsg = `[LayoutSpec Validation Failed]\n- ${errors.join('\n- ')}`;
    throw new Error(errorMsg);
  }

  return {
    valid: true,
    checkedCount,
    qrCount,
    errors: [],
  };
}

// Execute validation immediately upon module import
export const VALIDATION_RESULT = validateLayoutSpecs(CARD_DESIGNS);
