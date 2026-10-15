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
  } = options;

  const slots = [
    // 1. Restaurant Logo (only renders if logoImage is provided)
    {
      id: 'logo',
      type: 'image',
      source: 'logo',
      x: 540,
      y: 90,
      w: 160,
      h: 80,
      radius: 12,
      clip: false,
    },
    // 2. Restaurant Name
    {
      id: 'name',
      type: 'text',
      source: 'name',
      x: 80,
      y: 180,
      w: 1080,
      h: 90,
      maxFontPx: 56,
      minFontPx: 34,
      font: headerFont,
      weight: 700,
      uppercase: uppercaseName,
      color: palette.textPrimary,
      align: 'center',
      fallback: 'Restaurant',
      contrastCheck: true,
    },
    // 3. Tagline (maxLines: 1, minFontPx >= 0.6 * maxFontPx)
    {
      id: 'tagline',
      type: 'text',
      source: 'tagline',
      x: 100,
      y: 280,
      w: 1040,
      h: 46,
      maxFontPx: 26,
      minFontPx: 16,
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
    // 4. Table Number Pill Badge (centered above QR card)
    {
      id: 'tableLabel',
      type: 'pill',
      source: 'tableLabel',
      x: 390,
      y: 490,
      w: 460,
      h: 84,
      radius: 42,
      bgColor: palette.accent,
      color: palette.onAccent,
      font: headerFont,
      weight: 700,
      maxFontPx: 42,
      minFontPx: 26,
      letterSpacing: 2,
      uppercase: true,
      shadowColor: 'rgba(0,0,0,0.16)',
      shadowBlur: 16,
      fallback: 'Table 1',
    },
    // 5. QR Code Slot (600 × 600, centered precisely on crosshair at 620, 920)
    {
      id: 'qr',
      type: 'qr',
      source: 'qr',
      x: 320,
      y: 620,
      w: 600,
      h: 600,
      qrSize: 504,
      bgColor: qrContainerBg,
      borderColor: qrBorderColor,
      borderWidth: qrBorderWidth,
      radius: 36,
      shadowColor: qrShadow ? 'rgba(0,0,0,0.18)' : null,
      shadowBlur: qrShadow ? 24 : 0,
      shadowOffsetY: 8,
    },
  ];

  // 6. Table Code Badge
  const isDarkContainer = qrContainerBg && getRelativeLuminance(qrContainerBg) < 0.5;
  const tableCodeColor = isDarkContainer ? (palette.onAccent || '#FFFFFF') : '#111827';
  const tableCodeLabelColor = isDarkContainer ? (palette.textMuted || '#A0A0A8') : '#64748B';

  slots.push({
    id: 'tableCode',
    type: 'badge',
    source: 'tableCode',
    x: 340,
    y: 1250,
    w: 560,
    h: 70,
    radius: 18,
    bgColor: qrContainerBg,
    borderColor: qrBorderColor || (isDarkContainer ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
    borderWidth: 1.5,
    labelColor: tableCodeLabelColor,
    color: tableCodeColor,
    labelPrefix: 'TABLE CODE: ',
    labelPx: 17,
    codePx: 22,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowBlur: 12,
    fallback: 'TABLE-CODE',
  });

  // 7. Payment Accounts Info
  slots.push({
    id: 'payment',
    type: 'text',
    source: 'payment',
    x: 80,
    y: 1355,
    w: 1080,
    h: 48,
    maxFontPx: 24,
    minFontPx: 16,
    maxLines: 1,
    font: bodyFont,
    weight: 600,
    color: palette.textPrimary,
    align: 'center',
    fallback: 'PAYMENT ACCEPTED: TELEBIRR • CBE BIRR • CASH',
    contrastCheck: true,
  });

  // 8. Footer Brand / CTA
  slots.push({
    id: 'footer',
    type: 'text',
    source: 'footer',
    x: 80,
    y: 1435,
    w: 1080,
    h: 40,
    maxFontPx: 20,
    minFontPx: 14,
    maxLines: 1,
    font: bodyFont,
    weight: 600,
    letterSpacing: 1.5,
    uppercase: true,
    color: palette.textMuted,
    align: 'center',
    fallback: 'POWERED BY LAYOSCAN • SCAN TO VIEW MENU & ORDER',
    contrastCheck: true,
  });

  return slots;
}

/**
 * Builds standard slot definitions for Landscape Folded Tent (2480 × 1748)
 * Left panel (x 60..1180): Brand, tagline, instructions, payment accounts, footer.
 * Right panel (x 1300..2420): Table pill, high-contrast QR code, table code badge.
 */
function createLandscapeSlots(palette, options = {}) {
  const {
    headerFont = 'Playfair Display, serif',
    bodyFont = 'Inter, sans-serif',
    qrContainerBg = '#FFFFFF',
    qrBorderColor = null,
    qrBorderWidth = 0,
    qrShadow = true,
  } = options;

  return [
    // ── LEFT TENT PANEL ──────────────────────────────────────────────────────
    {
      id: 'logo',
      type: 'image',
      source: 'logo',
      x: 520,
      y: 120,
      w: 200,
      h: 120,
      radius: 14,
      clip: false,
    },
    {
      id: 'name',
      type: 'text',
      source: 'name',
      x: 100,
      y: 260,
      w: 1040,
      h: 100,
      maxFontPx: 64,
      minFontPx: 38,
      font: headerFont,
      weight: 700,
      color: palette.textPrimary,
      align: 'center',
      fallback: 'Restaurant',
      contrastCheck: true,
    },
    {
      id: 'tagline',
      type: 'text',
      source: 'tagline',
      x: 120,
      y: 375,
      w: 1000,
      h: 52,
      maxFontPx: 28,
      minFontPx: 18,
      maxLines: 1,
      font: bodyFont,
      weight: 500,
      letterSpacing: 2,
      uppercase: true,
      color: palette.textMuted,
      align: 'center',
      fallback: 'DELICIOUS FLAVORS & WARM SERVICE',
      contrastCheck: true,
    },
    {
      id: 'leftInstruction',
      type: 'text',
      source: 'custom',
      x: 140,
      y: 480,
      w: 960,
      h: 60,
      text: '1. Scan QR with your phone   •   2. Browse menu   •   3. Place order',
      maxFontPx: 26,
      minFontPx: 18,
      maxLines: 1,
      font: bodyFont,
      weight: 600,
      color: palette.textPrimary,
      align: 'center',
      contrastCheck: true,
    },
    {
      id: 'payment',
      type: 'text',
      source: 'payment',
      x: 100,
      y: 1320,
      w: 1040,
      h: 60,
      maxFontPx: 26,
      minFontPx: 18,
      maxLines: 1,
      font: bodyFont,
      weight: 600,
      color: palette.textPrimary,
      align: 'center',
      fallback: 'ACCEPTED PAYMENTS: TELEBIRR • CBE BIRR • CASH',
      contrastCheck: true,
    },
    {
      id: 'footer',
      type: 'text',
      source: 'footer',
      x: 100,
      y: 1420,
      w: 1040,
      h: 50,
      maxFontPx: 22,
      minFontPx: 15,
      maxLines: 1,
      font: bodyFont,
      weight: 600,
      letterSpacing: 1.5,
      uppercase: true,
      color: palette.textMuted,
      align: 'center',
      fallback: 'POWERED BY LAYOSCAN • CONTACTLESS TABLE DINING',
      contrastCheck: true,
    },

    // ── RIGHT TENT PANEL ─────────────────────────────────────────────────────
    {
      id: 'tableLabel',
      type: 'pill',
      source: 'tableLabel',
      x: 1610,
      y: 180,
      w: 500,
      h: 90,
      radius: 45,
      bgColor: palette.accent,
      color: palette.onAccent,
      font: headerFont,
      weight: 700,
      maxFontPx: 46,
      minFontPx: 28,
      letterSpacing: 2,
      uppercase: true,
      shadowColor: 'rgba(0,0,0,0.16)',
      shadowBlur: 16,
      fallback: 'Table 1',
    },
    // QR Slot: 660 × 660, qrSize 550 -> 55px quiet zone = 10% >= 8%
    {
      id: 'qr',
      type: 'qr',
      source: 'qr',
      x: 1530,
      y: 320,
      w: 660,
      h: 660,
      qrSize: 550,
      bgColor: qrContainerBg,
      borderColor: qrBorderColor,
      borderWidth: qrBorderWidth,
      radius: 40,
      shadowColor: qrShadow ? 'rgba(0,0,0,0.18)' : null,
      shadowBlur: qrShadow ? 24 : 0,
      shadowOffsetY: 8,
    },
    {
      id: 'tableCode',
      type: 'badge',
      source: 'tableCode',
      x: 1560,
      y: 1030,
      w: 600,
      h: 76,
      radius: 20,
      bgColor: qrContainerBg,
      borderColor: qrBorderColor || ((qrContainerBg && getRelativeLuminance(qrContainerBg) < 0.5) ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
      borderWidth: 1.5,
      labelColor: (qrContainerBg && getRelativeLuminance(qrContainerBg) < 0.5) ? (palette.textMuted || '#A0A0A8') : '#64748B',
      color: (qrContainerBg && getRelativeLuminance(qrContainerBg) < 0.5) ? (palette.onAccent || '#FFFFFF') : '#111827',
      labelPrefix: 'TABLE CODE: ',
      labelPx: 18,
      codePx: 24,
      shadowColor: 'rgba(0,0,0,0.08)',
      shadowBlur: 12,
      fallback: 'TABLE-CODE',
    },
    {
      id: 'scanPrompt',
      type: 'text',
      source: 'custom',
      x: 1400,
      y: 1140,
      w: 920,
      h: 60,
      text: 'Scan with camera to view live menu & order',
      maxFontPx: 28,
      minFontPx: 18,
      maxLines: 1,
      font: bodyFont,
      weight: 600,
      color: palette.textPrimary,
      align: 'center',
      contrastCheck: true,
    },
  ];
}

/**
 * Builds standard slot definitions for Menu Board Poster (1654 × 2339)
 * Simpler poster layout (restaurant name, QR, "scan to view menu") without payment slots.
 */
function createMenuBoardSlots(palette, options = {}) {
  const {
    headerFont = 'Playfair Display, serif',
    bodyFont = 'Inter, sans-serif',
    qrContainerBg = '#FFFFFF',
    qrBorderColor = null,
    qrBorderWidth = 0,
    qrShadow = true,
  } = options;

  return [
    {
      id: 'logo',
      type: 'image',
      source: 'logo',
      x: 727,
      y: 140,
      w: 200,
      h: 140,
      radius: 16,
      clip: false,
    },
    {
      id: 'name',
      type: 'text',
      source: 'name',
      x: 100,
      y: 310,
      w: 1454,
      h: 130,
      maxFontPx: 84,
      minFontPx: 50,
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
      x: 150,
      y: 460,
      w: 1354,
      h: 64,
      maxFontPx: 36,
      minFontPx: 22,
      maxLines: 1,
      font: bodyFont,
      weight: 500,
      letterSpacing: 2,
      uppercase: true,
      color: palette.textMuted,
      align: 'center',
      fallback: 'SCAN BELOW TO VIEW FULL DIGITAL MENU & DAILY SPECIALS',
      contrastCheck: true,
    },
    {
      id: 'tableLabel',
      type: 'pill',
      source: 'tableLabel',
      x: 587,
      y: 560,
      w: 480,
      h: 96,
      radius: 48,
      bgColor: palette.accent,
      color: palette.onAccent,
      font: headerFont,
      weight: 700,
      maxFontPx: 48,
      minFontPx: 28,
      letterSpacing: 2,
      uppercase: true,
      shadowColor: 'rgba(0,0,0,0.16)',
      shadowBlur: 18,
      fallback: 'Table 1',
    },
    // QR Slot: 800 × 800, qrSize 672 -> 64px quiet zone = 9.52% >= 8%
    {
      id: 'qr',
      type: 'qr',
      source: 'qr',
      x: 427,
      y: 720,
      w: 800,
      h: 800,
      qrSize: 672,
      bgColor: qrContainerBg,
      borderColor: qrBorderColor,
      borderWidth: qrBorderWidth,
      radius: 48,
      shadowColor: qrShadow ? 'rgba(0,0,0,0.22)' : null,
      shadowBlur: qrShadow ? 32 : 0,
      shadowOffsetY: 12,
    },
    {
      id: 'scanPrompt',
      type: 'text',
      source: 'custom',
      x: 100,
      y: 1570,
      w: 1454,
      h: 80,
      text: 'POINT CAMERA AT QR CODE TO VIEW MENU & ORDER',
      maxFontPx: 38,
      minFontPx: 24,
      maxLines: 1,
      font: bodyFont,
      weight: 700,
      letterSpacing: 2,
      color: palette.textPrimary,
      align: 'center',
      contrastCheck: true,
    },
    {
      id: 'tableCode',
      type: 'badge',
      source: 'tableCode',
      x: 527,
      y: 1690,
      w: 600,
      h: 84,
      radius: 22,
      bgColor: qrContainerBg,
      borderColor: qrBorderColor || ((qrContainerBg && getRelativeLuminance(qrContainerBg) < 0.5) ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
      borderWidth: 1.5,
      labelColor: (qrContainerBg && getRelativeLuminance(qrContainerBg) < 0.5) ? (palette.textMuted || '#A0A0A8') : '#64748B',
      color: (qrContainerBg && getRelativeLuminance(qrContainerBg) < 0.5) ? (palette.onAccent || '#FFFFFF') : '#111827',
      labelPrefix: 'TABLE CODE: ',
      labelPx: 20,
      codePx: 26,
      shadowColor: 'rgba(0,0,0,0.08)',
      shadowBlur: 14,
      fallback: 'TABLE-CODE',
    },
    {
      id: 'footer',
      type: 'text',
      source: 'footer',
      x: 100,
      y: 1840,
      w: 1454,
      h: 60,
      maxFontPx: 26,
      minFontPx: 18,
      maxLines: 1,
      font: bodyFont,
      weight: 600,
      letterSpacing: 2,
      uppercase: true,
      color: palette.textMuted,
      align: 'center',
      fallback: 'POWERED BY LAYOSCAN • DIGITAL MENU SYSTEM',
      contrastCheck: true,
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
          { hasHero: true, headerFont: '"Playfair Display", Georgia, serif', qrContainerBg: '#FFFFFF' }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#1B382B', onAccent: '#FFFFFF', textPrimary: '#1B382B', textMuted: '#5C6F64' },
          { headerFont: '"Playfair Display", Georgia, serif', qrContainerBg: '#FFFFFF' }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#1B382B', onAccent: '#FFFFFF', textPrimary: '#1B382B', textMuted: '#5C6F64' },
          { headerFont: '"Playfair Display", Georgia, serif', qrContainerBg: '#FFFFFF' }
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
          { headerFont: '"Space Grotesk", Inter, sans-serif', uppercaseName: true, qrContainerBg: '#1A1A1E', qrBorderColor: '#FFA800', qrBorderWidth: 2 }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#FFA800', onAccent: '#141414', textPrimary: '#FFFFFF', textMuted: '#A0A0A8' },
          { headerFont: '"Space Grotesk", Inter, sans-serif', qrContainerBg: '#1A1A1E', qrBorderColor: '#FFA800', qrBorderWidth: 2 }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#FFA800', onAccent: '#141414', textPrimary: '#FFFFFF', textMuted: '#A0A0A8' },
          { headerFont: '"Space Grotesk", Inter, sans-serif', qrContainerBg: '#1A1A1E', qrBorderColor: '#FFA800', qrBorderWidth: 2 }
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
      textMuted: '#86EFAC',
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
          { accent: '#86EFAC', onAccent: '#0B3B24', textPrimary: '#F0FDF4', textMuted: '#86EFAC' },
          { hasHero: true, headerFont: '"Playfair Display", Georgia, serif', qrContainerBg: '#FFFFFF', qrBorderColor: '#86EFAC', qrBorderWidth: 2 }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#86EFAC', onAccent: '#0B3B24', textPrimary: '#F0FDF4', textMuted: '#86EFAC' },
          { headerFont: '"Playfair Display", Georgia, serif', qrContainerBg: '#FFFFFF', qrBorderColor: '#86EFAC', qrBorderWidth: 2 }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#86EFAC', onAccent: '#0B3B24', textPrimary: '#F0FDF4', textMuted: '#86EFAC' },
          { headerFont: '"Playfair Display", Georgia, serif', qrContainerBg: '#FFFFFF', qrBorderColor: '#86EFAC', qrBorderWidth: 2 }
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
          { hasHero: true, headerFont: '"Playfair Display", Georgia, serif', qrContainerBg: '#FFFFFF', qrBorderColor: '#E5C583', qrBorderWidth: 2 }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#E5C583', onAccent: '#0C192E', textPrimary: '#FFFFFF', textMuted: '#C5B083' },
          { headerFont: '"Playfair Display", Georgia, serif', qrContainerBg: '#FFFFFF', qrBorderColor: '#E5C583', qrBorderWidth: 2 }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#E5C583', onAccent: '#0C192E', textPrimary: '#FFFFFF', textMuted: '#C5B083' },
          { headerFont: '"Playfair Display", Georgia, serif', qrContainerBg: '#FFFFFF', qrBorderColor: '#E5C583', qrBorderWidth: 2 }
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
          { hasHero: true, headerFont: '"Noto Sans Ethiopic", "Playfair Display", Georgia, serif', qrContainerBg: '#FFFDF9', qrBorderColor: '#781812', qrBorderWidth: 2 }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#781812', onAccent: '#FFFFFF', textPrimary: '#381E11', textMuted: '#784931' },
          { headerFont: '"Noto Sans Ethiopic", "Playfair Display", Georgia, serif', qrContainerBg: '#FFFDF9', qrBorderColor: '#781812', qrBorderWidth: 2 }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#781812', onAccent: '#FFFFFF', textPrimary: '#381E11', textMuted: '#784931' },
          { headerFont: '"Noto Sans Ethiopic", "Playfair Display", Georgia, serif', qrContainerBg: '#FFFDF9', qrBorderColor: '#781812', qrBorderWidth: 2 }
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
          { hasHero: true, headerFont: '"Playfair Display", Georgia, serif', qrContainerBg: '#FFFDF7', qrBorderColor: '#E5C583', qrBorderWidth: 1.5 }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#E5C583', onAccent: '#0D0B08', textPrimary: '#FFFDF7', textMuted: '#C5B083' },
          { headerFont: '"Playfair Display", Georgia, serif', qrContainerBg: '#FFFDF7', qrBorderColor: '#E5C583', qrBorderWidth: 1.5 }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#E5C583', onAccent: '#0D0B08', textPrimary: '#FFFDF7', textMuted: '#C5B083' },
          { headerFont: '"Playfair Display", Georgia, serif', qrContainerBg: '#FFFDF7', qrBorderColor: '#E5C583', qrBorderWidth: 1.5 }
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
          { hasHero: true, headerFont: 'Inter, sans-serif', qrContainerBg: '#FFFFFF', qrBorderColor: '#FFCCBC', qrBorderWidth: 1.5 }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#FF5722', onAccent: '#FFFFFF', textPrimary: '#1E1B18', textMuted: '#6E6760' },
          { headerFont: 'Inter, sans-serif', qrContainerBg: '#FFFFFF', qrBorderColor: '#FFCCBC', qrBorderWidth: 1.5 }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#FF5722', onAccent: '#FFFFFF', textPrimary: '#1E1B18', textMuted: '#6E6760' },
          { headerFont: 'Inter, sans-serif', qrContainerBg: '#FFFFFF', qrBorderColor: '#FFCCBC', qrBorderWidth: 1.5 }
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
          { hasHero: true, headerFont: '"Playfair Display", Georgia, serif', qrContainerBg: '#FFFFFF' }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#2E7D32', onAccent: '#FFFFFF', textPrimary: '#1B382B', textMuted: '#4F6A5B' },
          { headerFont: '"Playfair Display", Georgia, serif', qrContainerBg: '#FFFFFF' }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#2E7D32', onAccent: '#FFFFFF', textPrimary: '#1B382B', textMuted: '#4F6A5B' },
          { headerFont: '"Playfair Display", Georgia, serif', qrContainerBg: '#FFFFFF' }
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
          { hasHero: false, headerFont: 'Inter, -apple-system, sans-serif', qrContainerBg: '#FFFFFF', qrBorderColor: '#E4E4E7', qrBorderWidth: 1.5, qrShadow: true }
        ),
      },
      landscape: {
        safeArea: STANDARD_SAFE_AREAS.landscape,
        slots: createLandscapeSlots(
          { accent: '#18181B', onAccent: '#FFFFFF', textPrimary: '#18181B', textMuted: '#71717A' },
          { headerFont: 'Inter, -apple-system, sans-serif', qrContainerBg: '#FFFFFF', qrBorderColor: '#E4E4E7', qrBorderWidth: 1.5, qrShadow: true }
        ),
      },
      menu_board: {
        safeArea: STANDARD_SAFE_AREAS.menu_board,
        slots: createMenuBoardSlots(
          { accent: '#18181B', onAccent: '#FFFFFF', textPrimary: '#18181B', textMuted: '#71717A' },
          { headerFont: 'Inter, -apple-system, sans-serif', qrContainerBg: '#FFFFFF', qrBorderColor: '#E4E4E7', qrBorderWidth: 1.5, qrShadow: true }
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
