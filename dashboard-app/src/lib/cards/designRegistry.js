/**
 * Design Registry for LayoScan Card Engine.
 * Exposes the 9 card designs while maintaining 100% backwards compatibility
 * with all legacy UI metadata fields and archetype ID aliases.
 */

import { CARD_DESIGNS } from './layoutSpec.js';

/**
 * Historical archetype ID aliases mapping old template IDs to the new declarative designs.
 */
export const TEMPLATE_ALIASES = {
  cafe_artisan: 'artisan_linen',
  fast_casual: 'bold_street',
  fresh_mart: 'fresh_emerald',
  luxury_hotel: 'midnight_gold',
  cultural_heritage: 'habesha_heritage',
  liquor_bar: 'velvet_lounge',
};

/**
 * Legacy sample metadata map for UI previews.
 */
const LEGACY_SAMPLE_METADATA = {
  artisan_linen: {
    sampleName: 'Elili Cafe',
    sampleTagline: 'WE SERVE QUALITY, WE THRIVE FOR YOUR SATISFACTION.',
    dotColor: '#0C301F',
    cornerColor: '#0C301F',
    accentColor: '#0C301F',
    badgeBg: '#0C301F',
    badgeText: '#FFFFFF',
    backgroundColor: '#F8F6F0',
  },
  bold_street: {
    sampleName: 'Elili Cafe',
    sampleTagline: 'GOOD FOOD • GREAT VIBES • ALWAYS',
    dotColor: '#101012',
    cornerColor: '#101012',
    accentColor: '#FF7300',
    badgeBg: '#FC7100',
    badgeText: '#141414',
    backgroundColor: '#FFFFFF',
  },
  fresh_emerald: {
    sampleName: 'GreenMart',
    sampleTagline: 'GROCERY • BAR • DAILY NEEDS',
    dotColor: '#0B3B24',
    cornerColor: '#0B3B24',
    accentColor: '#86EFAC',
    badgeBg: '#86EFAC',
    badgeText: '#0B3B24',
    backgroundColor: '#FFFFFF',
  },
  midnight_gold: {
    sampleName: 'SkyView Hotel',
    sampleTagline: 'STAY • DINE • RELAX',
    dotColor: '#0C192E',
    cornerColor: '#0C192E',
    accentColor: '#E5C583',
    badgeBg: '#E5C583',
    badgeText: '#0C192E',
    backgroundColor: '#FFFFFF',
  },
  habesha_heritage: {
    sampleName: 'Enat',
    sampleTagline: 'TRADITIONAL FOOD & DRINK',
    dotColor: '#781812',
    cornerColor: '#781812',
    accentColor: '#781812',
    badgeBg: '#781812',
    badgeText: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  velvet_lounge: {
    sampleName: 'Bar House',
    sampleTagline: 'GOOD DRINKS • GREAT VIBES • ALWAYS',
    dotColor: '#120F0D',
    cornerColor: '#120F0D',
    accentColor: '#E5C583',
    badgeBg: '#E5C583',
    badgeText: '#0D0B08',
    backgroundColor: '#FFFDF7',
  },
  juice_spris: {
    sampleName: 'SunSpris Juice',
    sampleTagline: 'FRESH FRUITS • NATURAL VITAMINS • SPRIS',
    dotColor: '#FF5722',
    cornerColor: '#FF5722',
    accentColor: '#FF5722',
    badgeBg: '#FF5722',
    badgeText: '#FFFFFF',
    backgroundColor: '#FFF8F0',
  },
  cafe_tent_classic: {
    sampleName: 'Green Garden Bistro',
    sampleTagline: 'FRESH BITES • FAMILY FAVORITES',
    dotColor: '#1B382B',
    cornerColor: '#1B382B',
    accentColor: '#2E7D32',
    badgeBg: '#2E7D32',
    badgeText: '#FFFFFF',
    backgroundColor: '#F3F7F4',
  },
  modern_minimal: {
    sampleName: 'The Table',
    sampleTagline: 'CONTEMPORARY CUISINE & COFFEE',
    dotColor: '#18181B',
    cornerColor: '#18181B',
    accentColor: '#18181B',
    badgeBg: '#18181B',
    badgeText: '#FFFFFF',
    backgroundColor: '#FAFAFA',
  },
};

/**
 * Array of 9 card design entries populated with all legacy UI fields:
 * id, name, icon, category, description, dotColor, cornerColor, accentColor,
 * badgeBg, badgeText, backgroundColor, sampleName, sampleTagline.
 */
export const QR_TEMPLATES = CARD_DESIGNS.map((design) => {
  const meta = LEGACY_SAMPLE_METADATA[design.id] || {};
  return {
    ...design,
    sampleName: meta.sampleName || 'Restaurant',
    sampleTagline: meta.sampleTagline || 'TASTE • HOSPITALITY • SERVICE',
    dotColor: meta.dotColor || design.colors.accent,
    cornerColor: meta.cornerColor || design.colors.accent,
    accentColor: meta.accentColor || design.colors.accent,
    badgeBg: meta.badgeBg || design.colors.accent,
    badgeText: meta.badgeText || design.colors.onAccent,
    backgroundColor: meta.backgroundColor || design.colors.background || '#FFFFFF',
  };
});

export const DESIGNS = QR_TEMPLATES;

/**
 * Resolves a design object by id, supporting both current IDs and historical aliases.
 * If not found, falls back safely to 'modern_minimal' or the first registered design.
 *
 * @param {string} id - Design ID or legacy template alias
 * @returns {Object} Design specification object
 */
export function getCanonicalTemplateId(id) {
  if (!id) return 'artisan_linen';
  return TEMPLATE_ALIASES[id] || id;
}

export function getTemplateById(id) {
  if (!id) return QR_TEMPLATES[0];

  const canonicalId = TEMPLATE_ALIASES[id] || id;
  const match = QR_TEMPLATES.find((t) => t.id === canonicalId || t.id === id);

  return match || QR_TEMPLATES[0];
}

export const getDesignById = getTemplateById;
