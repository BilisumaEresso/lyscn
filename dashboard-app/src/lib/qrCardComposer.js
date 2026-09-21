import QRCodeStyling from 'qr-code-styling';
import JSZip from 'jszip';
import fileSaver from 'file-saver';
import { generateThemeFromColor } from './theme';
import logoImg from '../assets/logo.png';

const saveAs = fileSaver.saveAs || fileSaver;

const CUSTOMER_URL = import.meta.env.VITE_CUSTOMER_APP_URL;

/** Helper: Load an HTMLImageElement safely with fallback */
function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Helper: Sanitize string for clean filenames */
export function sanitizeFilename(str) {
  return (str || 'table')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Creates and configures a QRCodeStyling instance
 */
export function createStyledQR({ url, brandColor, logoUrl, size = 280 }) {
  const theme = generateThemeFromColor(brandColor);

  return new QRCodeStyling({
    width: size,
    height: size,
    data: url,
    image: logoUrl || logoImg,
    dotsOptions: {
      color: theme.primary,
      type: 'rounded',
    },
    cornersSquareOptions: {
      color: theme.primaryDark,
      type: 'extra-rounded',
    },
    cornersDotOptions: {
      color: theme.primaryDark,
      type: 'dot',
    },
    backgroundOptions: {
      color: '#FFFFFF',
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.22,
      margin: 3,
    },
    qrOptions: {
      errorCorrectionLevel: 'H',
    },
  });
}

/**
 * Renders a full 1200x1800 high-resolution print card onto an HTMLCanvasElement
 */
export async function renderPrintCardCanvas({ table, restaurant }) {
  const brandColor = restaurant?.brandColor || '#14B8A6';
  const theme = generateThemeFromColor(brandColor);
  const qrUrl = `${CUSTOMER_URL}/t/${table.qrToken}`;

  // 1. Generate high-res QR code image (600x600)
  const qrStyling = createStyledQR({
    url: qrUrl,
    brandColor,
    logoUrl: restaurant?.logoUrl,
    size: 600,
  });

  const qrBlob = await qrStyling.getRawData('png');
  const qrBlobUrl = URL.createObjectURL(qrBlob);
  const qrImage = await loadImage(qrBlobUrl);
  URL.revokeObjectURL(qrBlobUrl);

  // 2. Load restaurant logo (or fallback)
  let headerLogo = null;
  if (restaurant?.logoUrl) {
    headerLogo = await loadImage(restaurant.logoUrl);
  }
  if (!headerLogo) {
    headerLogo = await loadImage(logoImg);
  }

  // 3. Create 1200x1800 canvas
  const width = 1200;
  const height = 1800;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // --- Background ---
  // Fill surface wash background
  ctx.fillStyle = theme.surfaceWash || '#F5F8F7';
  ctx.fillRect(0, 0, width, height);

  // Soft ambient gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, theme.surfaceWash);
  bgGrad.addColorStop(0.5, '#FFFFFF');
  bgGrad.addColorStop(1, theme.surfaceWash);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Inner card frame (Margin 45px)
  const margin = 45;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;
  const cardRadius = 48;

  // Draw white inner card container
  ctx.save();
  ctx.shadowColor = 'rgba(18, 26, 44, 0.08)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;

  ctx.beginPath();
  ctx.roundRect(margin, margin, cardW, cardH, cardRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Subtle border around card
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(18, 26, 44, 0.08)';
  ctx.stroke();
  ctx.restore();

  // Decorative top color bar
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(margin, margin, cardW, 20, [cardRadius, cardRadius, 0, 0]);
  ctx.fillStyle = theme.primary;
  ctx.fill();
  ctx.restore();

  // --- Header: Logo & Restaurant Name ---
  const logoSize = 130;
  const logoX = width / 2 - logoSize / 2;
  const logoY = 120;

  if (headerLogo) {
    ctx.save();
    // Clip logo with rounded rect
    ctx.beginPath();
    ctx.roundRect(logoX, logoY, logoSize, logoSize, 28);
    ctx.clip();
    ctx.drawImage(headerLogo, logoX, logoY, logoSize, logoSize);
    ctx.restore();

    // Logo border
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(logoX, logoY, logoSize, logoSize, 28);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(18, 26, 44, 0.12)';
    ctx.stroke();
    ctx.restore();
  }

  // Restaurant Name
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#121A2C';
  ctx.font = '700 52px "Space Grotesk", Inter, sans-serif';
  const restName = restaurant?.name || 'LayoScan';
  ctx.fillText(restName, width / 2, logoY + logoSize + 65, cardW - 100);

  // Subtle accent line under name
  ctx.beginPath();
  ctx.moveTo(width / 2 - 120, logoY + logoSize + 95);
  ctx.lineTo(width / 2 + 120, logoY + logoSize + 95);
  ctx.lineWidth = 3;
  ctx.strokeStyle = theme.primaryLight || 'rgba(20, 184, 166, 0.3)';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  const location = restaurant?.contactInfo?.address;
  if (location) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#667085';
    ctx.font = '500 24px Inter, sans-serif';
    ctx.fillText(location, width / 2, logoY + logoSize + 130, cardW - 120);
    ctx.restore();
  }

  // --- Middle: QR Code Container + Scan Frame Brackets ---
  const qrBoxSize = 680;
  const qrBoxX = width / 2 - qrBoxSize / 2; // 260
  const qrBoxY = 460;
  const qrBoxRadius = 36;

  // QR Container background card
  ctx.save();
  ctx.shadowColor = 'rgba(18, 26, 44, 0.06)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(18, 26, 44, 0.06)';
  ctx.stroke();
  ctx.restore();

  // Draw QR image
  if (qrImage) {
    const qrSize = 600;
    const qrX = width / 2 - qrSize / 2; // 300
    const qrY = qrBoxY + (qrBoxSize - qrSize) / 2; // 500
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
  }

  // --- Decorative Scan-Frame Corner Brackets ---
  // Four corner brackets wrapping around the QR container
  const bracketOffset = 22; // Gap outside QR container
  const bx = qrBoxX - bracketOffset;
  const by = qrBoxY - bracketOffset;
  const bw = qrBoxSize + bracketOffset * 2;
  const bh = qrBoxSize + bracketOffset * 2;
  const armLen = 100;
  const armRadius = 24;

  ctx.save();
  ctx.strokeStyle = theme.primaryDark || theme.primary;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Top-Left Bracket
  ctx.beginPath();
  ctx.moveTo(bx, by + armLen);
  ctx.lineTo(bx, by + armRadius);
  ctx.arcTo(bx, by, bx + armRadius, by, armRadius);
  ctx.lineTo(bx + armLen, by);
  ctx.stroke();

  // Top-Right Bracket
  ctx.beginPath();
  ctx.moveTo(bx + bw - armLen, by);
  ctx.lineTo(bx + bw - armRadius, by);
  ctx.arcTo(bx + bw, by, bx + bw, by + armRadius, armRadius);
  ctx.lineTo(bx + bw, by + armLen);
  ctx.stroke();

  // Bottom-Left Bracket
  ctx.beginPath();
  ctx.moveTo(bx, by + bh - armLen);
  ctx.lineTo(bx, by + bh - armRadius);
  ctx.arcTo(bx, by + bh, bx + armRadius, by + bh, armRadius);
  ctx.lineTo(bx + armLen, by + bh);
  ctx.stroke();

  // Bottom-Right Bracket
  ctx.beginPath();
  ctx.moveTo(bx + bw - armLen, by + bh);
  ctx.lineTo(bx + bw - armRadius, by + bh);
  ctx.arcTo(bx + bw, by + bh, bx + bw, by + bh - armRadius, armRadius);
  ctx.lineTo(bx + bw, by + bh - armLen);
  ctx.stroke();
  ctx.restore();

  // --- Call To Action & Table Label ---
  const ctaY = qrBoxY + qrBoxSize + 85;

  ctx.save();
  ctx.textAlign = 'center';

  // "Scan to order"
  ctx.fillStyle = '#5B6B7A';
  ctx.font = '600 40px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Scan to order', width / 2, ctaY);

  // Table Label Pill / Badge
  const tableLabel = table.label || 'Table';
  const pillY = ctaY + 30;
  const pillW = 540;
  const pillH = 100;
  const pillX = width / 2 - pillW / 2;

  // Draw pill background
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 30);
  ctx.fillStyle = theme.surfaceWash || '#E6FAF8';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = theme.primaryLight || theme.primary;
  ctx.stroke();

  // Table label text inside pill
  ctx.fillStyle = theme.primaryDark || theme.primary;
  ctx.font = '700 58px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(tableLabel, width / 2, pillY + 68);
  ctx.restore();

  // --- Footer: Powered by LayoScan ---
  const footerY = height - 90;
  const markLogo = await loadImage(logoImg);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(91, 107, 122, 0.65)';
  ctx.font = '500 24px Inter, sans-serif';

  if (markLogo) {
    const markSize = 28;
    const textStr = 'Powered by LayoScan';
    ctx.font = '500 24px Inter, sans-serif';
    const textWidth = ctx.measureText(textStr).width;
    const totalW = markSize + 10 + textWidth;
    const startX = width / 2 - totalW / 2;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(startX, footerY - markSize + 4, markSize, markSize, 6);
    ctx.clip();
    ctx.drawImage(markLogo, startX, footerY - markSize + 4, markSize, markSize);
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillText(textStr, startX + markSize + 10, footerY);
  } else {
    ctx.fillText('Powered by LayoScan', width / 2, footerY);
  }
  ctx.restore();

  return canvas;
}

/**
 * Downloads a single table's print card PNG
 */
export async function downloadTableCard({ table, restaurant }) {
  const canvas = await renderPrintCardCanvas({ table, restaurant });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const restSlug = sanitizeFilename(restaurant?.name || 'restaurant');
        const tableSlug = sanitizeFilename(table.label || 'table');
        const filename = `${restSlug}-${tableSlug}-qr.png`;
        saveAs(blob, filename);
      }
      resolve();
    }, 'image/png');
  });
}

/**
 * Downloads all tables as a ZIP bundle
 */
export async function downloadAllTablesZip({ tables, restaurant, onProgress }) {
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

    const canvas = await renderPrintCardCanvas({ table, restaurant });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

    if (blob) {
      const tableSlug = sanitizeFilename(table.label || `table-${i + 1}`);
      zip.file(`${restSlug}-${tableSlug}-qr.png`, blob);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${restSlug}-all-qr-cards.zip`);
}
