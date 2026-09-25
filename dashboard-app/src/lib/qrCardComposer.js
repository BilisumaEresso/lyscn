import QRCodeStyling from 'qr-code-styling';
import JSZip from 'jszip';
import { loadImage, sanitizeFilename, formatTableCode, saveAs } from './canvasHelpers';
import logoImg from '../assets/logo.png';
import cafeLogoPlaceholder from '../assets/cafe_logo_placeholder.png';
import cafeLatteHeroImg from '../assets/templates/cafe_latte_hero.jpg';
import greenMartHeroImg from '../assets/templates/green_mart_harvest_hero.jpg';
import skyViewSuiteHeroImg from '../assets/templates/skyview_hotel_suite_hero.jpg';
import enatFeastHeroImg from '../assets/templates/enat_feast_hero.jpg';

// Import Templates
import {
  renderCafeArtisanPortrait,
  renderCafeArtisanLandscape,
} from './templates/cafeArtisan';
import {
  renderFastCasualPortrait,
  renderFastCasualLandscape,
} from './templates/fastCasual';
import {
  renderFreshMartPortrait,
  renderFreshMartLandscape,
} from './templates/freshMart';
import {
  renderLuxuryHotelPortrait,
  renderLuxuryHotelLandscape,
} from './templates/luxuryHotel';
import {
  renderCulturalHeritagePortrait,
  renderCulturalHeritageLandscape,
} from './templates/culturalHeritage';

const CUSTOMER_URL = import.meta.env.VITE_CUSTOMER_APP_URL || 'https://layoscancustomer.vercel.app';

// ── Master Template Registry (All 5 Archetypes) ──────────────────────────────
export const QR_TEMPLATES = [
  {
    id: 'cafe_artisan',
    name: 'Elili Cafe',
    icon: '☕',
    category: 'Artisanal Cafe & Bakery',
    description: 'Warm linen stationery with botanical leaves & latte art hero',
    dotColor: '#1B382B',
    cornerColor: '#1B382B',
    accentColor: '#1B382B',
    badgeBg: '#1B382B',
    badgeText: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    defaultHero: cafeLatteHeroImg,
    renderPortrait: renderCafeArtisanPortrait,
    renderLandscape: renderCafeArtisanLandscape,
  },
  {
    id: 'fast_casual',
    name: 'GoodBite',
    icon: '🍔',
    category: 'Burgers, Pizza & Street Food',
    description: 'Matte dark mode with radiant amber-orange waves & food doodles',
    dotColor: '#FFFFFF',
    cornerColor: '#FFFFFF',
    accentColor: '#FFA800',
    badgeBg: '#FFA800',
    badgeText: '#141414',
    backgroundColor: '#1A1A1E',
    defaultHero: null,
    renderPortrait: renderFastCasualPortrait,
    renderLandscape: renderFastCasualLandscape,
  },
  {
    id: 'fresh_mart',
    name: 'GreenMart',
    icon: '🥗',
    category: 'Fresh Market, Grocery & Deli',
    description: 'Lush emerald gradient with fresh harvest imagery & sprout logo',
    dotColor: '#0B3B24',
    cornerColor: '#0B3B24',
    accentColor: '#86EFAC',
    badgeBg: '#86EFAC',
    badgeText: '#0B3B24',
    backgroundColor: '#FFFFFF',
    defaultHero: greenMartHeroImg,
    renderPortrait: renderFreshMartPortrait,
    renderLandscape: renderFreshMartLandscape,
  },
  {
    id: 'luxury_hotel',
    name: 'SkyView Hotel',
    icon: '🏨',
    category: 'Luxury Hotel, Stay & Fine Dining',
    description: 'Midnight navy with architectural gold crown & suite photography',
    dotColor: '#0C192E',
    cornerColor: '#0C192E',
    accentColor: '#E5C583',
    badgeBg: '#E5C583',
    badgeText: '#0C192E',
    backgroundColor: '#FFFFFF',
    defaultHero: skyViewSuiteHeroImg,
    renderPortrait: renderLuxuryHotelPortrait,
    renderLandscape: renderLuxuryHotelLandscape,
  },
  {
    id: 'cultural_heritage',
    name: 'Enat',
    icon: '🍲',
    category: 'Cultural Heritage & Traditional Dining',
    description: 'Ethiopian Tibeb woven border with parchment & traditional Mesob feast',
    dotColor: '#7A1D16',
    cornerColor: '#7A1D16',
    accentColor: '#7A1D16',
    badgeBg: '#7A1D16',
    badgeText: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    defaultHero: enatFeastHeroImg,
    renderPortrait: renderCulturalHeritagePortrait,
    renderLandscape: renderCulturalHeritageLandscape,
  },
];

export function getTemplateById(id) {
  return QR_TEMPLATES.find((t) => t.id === id) || QR_TEMPLATES[0];
}

/**
 * Creates and configures a QRCodeStyling instance
 */
export function createStyledQR({
  url,
  brandColor = '#1B382B',
  logoUrl = null,
  size = 600,
  dotColor = null,
  cornerColor = null,
  backgroundColor = '#FFFFFF',
}) {
  const primaryColor = dotColor || brandColor;
  const squareColor = cornerColor || brandColor;

  return new QRCodeStyling({
    width: size,
    height: size,
    data: url,
    image: logoUrl || logoImg,
    dotsOptions: {
      color: primaryColor,
      type: 'rounded',
    },
    cornersSquareOptions: {
      color: squareColor,
      type: 'extra-rounded',
    },
    cornersDotOptions: {
      color: squareColor,
      type: 'dot',
    },
    backgroundOptions: {
      color: backgroundColor,
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.22,
      margin: 4,
    },
    qrOptions: {
      errorCorrectionLevel: 'H',
    },
  });
}

/**
 * Renders a full high-resolution print card onto an HTMLCanvasElement
 * Supports both 'portrait' (1200x1800) and 'landscape' (1800x1200)
 */
export async function renderPrintCardCanvas({
  table,
  restaurant,
  templateId = 'cafe_artisan',
  orientation = 'portrait',
}) {
  const template = getTemplateById(templateId);
  const qrUrl = `${CUSTOMER_URL}/t/${table.qrToken}`;

  // 1. Generate QR Code
  const qrStyling = createStyledQR({
    url: qrUrl,
    brandColor: restaurant?.brandColor || template.accentColor,
    logoUrl: restaurant?.logoUrl,
    size: 600,
    dotColor: template.dotColor,
    cornerColor: template.cornerColor,
    backgroundColor: template.backgroundColor || '#FFFFFF',
  });

  const qrBlob = await qrStyling.getRawData('png');
  const qrBlobUrl = URL.createObjectURL(qrBlob);
  const qrImage = await loadImage(qrBlobUrl);
  URL.revokeObjectURL(qrBlobUrl);

  // 2. Load restaurant logo & hero assets
  let logoImage = null;
  if (restaurant?.logoUrl) {
    logoImage = await loadImage(restaurant.logoUrl);
  }
  if (!logoImage) {
    logoImage = await loadImage(cafeLogoPlaceholder);
  }
  if (!logoImage) {
    logoImage = await loadImage(logoImg);
  }

  const heroImage = await loadImage(template.defaultHero);

  // 3. Create Canvas
  const isLandscape = orientation === 'landscape';
  const width = isLandscape ? 1800 : 1200;
  const height = isLandscape ? 1200 : 1800;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 4. Delegate to template renderer
  const renderFn = isLandscape ? template.renderLandscape : template.renderPortrait;
  await renderFn(ctx, {
    table,
    restaurant,
    qrImage,
    logoImage,
    heroImage,
    width,
    height,
  });

  return canvas;
}

/**
 * Downloads a single table's print card PNG
 */
export async function downloadTableCard({
  table,
  restaurant,
  templateId = 'cafe_artisan',
  orientation = 'portrait',
}) {
  const canvas = await renderPrintCardCanvas({ table, restaurant, templateId, orientation });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const restSlug = sanitizeFilename(restaurant?.name || 'restaurant');
        const tableSlug = sanitizeFilename(table.label || 'table');
        const orientTag = orientation === 'landscape' ? '-tent' : '-card';
        const filename = `${restSlug}-${tableSlug}-${templateId}${orientTag}.png`;
        saveAs(blob, filename);
      }
      resolve();
    }, 'image/png');
  });
}

/**
 * Downloads all tables as a ZIP bundle
 */
export async function downloadAllTablesZip({
  tables,
  restaurant,
  templateId = 'cafe_artisan',
  orientation = 'portrait',
  onProgress,
}) {
  const zip = new JSZip();
  const activeTables = tables.filter((t) => t.isActive !== false);

  if (activeTables.length === 0) {
    throw new Error('No active tables to download.');
  }

  const restSlug = sanitizeFilename(restaurant?.name || 'restaurant');

  for (let i = 0; i < activeTables.length; i++) {
    const table = activeTables[i];
    if (onProgress) {
      onProgress(i + 1, activeTables.length, table.label);
    }

    const canvas = await renderPrintCardCanvas({
      table,
      restaurant,
      templateId,
      orientation,
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

    if (blob) {
      const tableSlug = sanitizeFilename(table.label || `table-${i + 1}`);
      const orientTag = orientation === 'landscape' ? '-tent' : '-card';
      zip.file(`${restSlug}-${tableSlug}-${templateId}${orientTag}.png`, blob);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const orientSuffix = orientation === 'landscape' ? '-tent-cards' : '-qr-cards';
  saveAs(content, `${restSlug}-all-${templateId}${orientSuffix}.zip`);
}

// Re-export helpers for backward compatibility
export { formatTableCode, sanitizeFilename };
