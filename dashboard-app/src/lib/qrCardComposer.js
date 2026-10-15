import QRCodeStyling from 'qr-code-styling';
import JSZip from 'jszip';
import {
  loadImage,
  sanitizeFilename,
  formatTableCode,
  saveAs,
  getThemedQRIconDataUrl,
} from './canvasHelpers';
import logoImg from '../assets/logo.png';
import cafeLogoPlaceholder from '../assets/cafe_logo_placeholder.png';

// Import New Declarative Background Engine & Registry
import { renderCard } from './cards/renderEngine.js';
import { QR_TEMPLATES, getTemplateById } from './cards/designRegistry.js';
import { contrastRatio, getRelativeLuminance } from './cards/fitText.js';

const CUSTOMER_URL =
  import.meta.env.VITE_CUSTOMER_APP_URL || 'https://layoscancustomer.vercel.app';

// Re-export design registry for UI components (Tables.jsx, QRTemplateSelector, etc.)
export { QR_TEMPLATES, getTemplateById };

/**
 * Creates and configures a QRCodeStyling instance with high-error-correction (H)
 * and rounded corners.
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
 * using the new background-image-first declarative render engine.
 *
 * Dimensions:
 * - portrait: 1240 × 1748 (A6 @ 300 DPI)
 * - landscape: 2480 × 1748 (A5 folded table tent @ 300 DPI)
 * - menu_board: 1654 × 2339 (A4 @ 200 DPI)
 *
 * @param {Object} params
 * @param {Object} params.table - Table data { label, qrToken }
 * @param {Object} [params.restaurant] - Restaurant data
 * @param {string} [params.templateId='artisan_linen'] - Template/design ID or legacy alias
 * @param {'portrait'|'landscape'|'menu_board'} [params.orientation='portrait']
 * @param {Object} [params.menuData]
 * @returns {Promise<HTMLCanvasElement>} Resolves to rendered HTMLCanvasElement
 */
export async function renderPrintCardCanvas({
  table,
  restaurant,
  templateId = 'artisan_linen',
  orientation = 'portrait',
  menuData = null,
}) {
  const template = getTemplateById(templateId);
  const qrUrl = `${CUSTOMER_URL}/t/${table.qrToken}`;

  // 1. Generate QR Code with custom restaurant logo OR archetype-themed center icon
  const legacyId =
    template.id === 'artisan_linen' ? 'cafe_artisan' :
    template.id === 'bold_street' ? 'fast_casual' :
    template.id === 'fresh_emerald' ? 'fresh_mart' :
    template.id === 'midnight_gold' ? 'luxury_hotel' :
    template.id === 'habesha_heritage' ? 'cultural_heritage' :
    template.id === 'velvet_lounge' ? 'liquor_bar' :
    template.id;

  const fallbackLogo = getThemedQRIconDataUrl(legacyId);

  // Guarantee strong scannable contrast (>= 3.5:1) between QR dots and QR background
  let qrBgColor = template.backgroundColor || '#FFFFFF';
  let qrDotColor = template.dotColor || restaurant?.brandColor || template.accentColor;
  let qrCornerColor = template.cornerColor || qrDotColor;

  if (contrastRatio(qrDotColor, qrBgColor) < 3.5) {
    qrBgColor = getRelativeLuminance(qrDotColor) > 0.5 ? '#1A1A1E' : '#FFFFFF';
  }

  const qrStyling = createStyledQR({
    url: qrUrl,
    brandColor: qrDotColor,
    logoUrl: restaurant?.logoUrl || fallbackLogo,
    size: 600,
    dotColor: qrDotColor,
    cornerColor: qrCornerColor,
    backgroundColor: qrBgColor,
  });

  let qrBlob = null;
  try {
    qrBlob = await qrStyling.getRawData('png');
  } catch (err) {
    console.warn('Custom logo QR styling failed, falling back to themed center icon:', err);
    const fallbackStyling = createStyledQR({
      url: qrUrl,
      brandColor: qrDotColor,
      logoUrl: fallbackLogo,
      size: 600,
      dotColor: qrDotColor,
      cornerColor: qrCornerColor,
      backgroundColor: qrBgColor,
    });
    qrBlob = await fallbackStyling.getRawData('png');
  }

  const qrBlobUrl = URL.createObjectURL(qrBlob);
  const qrImage = await loadImage(qrBlobUrl);
  URL.revokeObjectURL(qrBlobUrl);

  // 2. Load restaurant custom logo (only if explicitly configured)
  let logoImage = null;
  if (restaurant?.logoUrl) {
    logoImage = await loadImage(restaurant.logoUrl);
  }

  const heroImage = template.defaultHero ? await loadImage(template.defaultHero) : null;

  // 3. Delegate to the new high-resolution background engine
  const canvas = await renderCard({
    table,
    restaurant,
    templateId: template.id,
    orientation,
    qrImage,
    logoImage,
    heroImage,
    menuData,
  });

  return canvas;
}

/**
 * Downloads a single table's print card PNG.
 * Releases canvas memory after blob creation (§9.9).
 */
export async function downloadTableCard({
  table,
  restaurant,
  templateId = 'artisan_linen',
  orientation = 'portrait',
  menuData = null,
}) {
  const canvas = await renderPrintCardCanvas({
    table,
    restaurant,
    templateId,
    orientation,
    menuData,
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const restSlug = sanitizeFilename(restaurant?.name || 'restaurant');
        const tableSlug = sanitizeFilename(table.label || 'table');
        const orientTag =
          orientation === 'landscape'
            ? '-tent'
            : orientation === 'menu_board'
            ? '-menu-board'
            : '-card';
        const filename = `${restSlug}-${tableSlug}-${templateId}${orientTag}.png`;
        saveAs(blob, filename);
      }
      // Release memory (§9.9)
      canvas.width = 0;
      canvas.height = 0;
      resolve();
    }, 'image/png');
  });
}

/**
 * Downloads all tables as a ZIP bundle.
 * Releases canvas memory after each table render (§9.9).
 */
export async function downloadAllTablesZip({
  tables,
  restaurant,
  templateId = 'artisan_linen',
  orientation = 'portrait',
  menuData = null,
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
      menuData,
    });

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

    // Release memory immediately (§9.9)
    canvas.width = 0;
    canvas.height = 0;

    if (blob) {
      const tableSlug = sanitizeFilename(table.label || `table-${i + 1}`);
      const orientTag =
        orientation === 'landscape'
          ? '-tent'
          : orientation === 'menu_board'
          ? '-menu-board'
          : '-card';
      zip.file(`${restSlug}-${tableSlug}-${templateId}${orientTag}.png`, blob);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const orientSuffix =
    orientation === 'landscape'
      ? '-tent-cards'
      : orientation === 'menu_board'
      ? '-menu-boards'
      : '-qr-cards';
  saveAs(content, `${restSlug}-all-${templateId}${orientSuffix}.zip`);
}

// Re-export helpers for backward compatibility (§7)
export { formatTableCode, sanitizeFilename };
