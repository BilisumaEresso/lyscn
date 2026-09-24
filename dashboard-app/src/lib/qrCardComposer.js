import QRCodeStyling from 'qr-code-styling';
import JSZip from 'jszip';
import fileSaver from 'file-saver';
import { generateThemeFromColor } from './theme';
import logoImg from '../assets/logo.png';
import cafeLogoPlaceholder from '../assets/cafe_logo_placeholder.png';

const saveAs = fileSaver.saveAs || fileSaver;

const CUSTOMER_URL = import.meta.env.VITE_CUSTOMER_APP_URL || 'https://layoscancustomer.vercel.app';

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

/** Helper: Format 16-char hex qrToken into 4-char chunks for clean manual typing */
export function formatTableCode(token) {
  if (!token) return 'TABLE-CODE';
  const clean = token.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const chunks = clean.match(/.{1,4}/g);
  return chunks ? chunks.join('-') : clean;
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
      color: theme.primaryDark || theme.primary || '#884D25',
      type: 'rounded',
    },
    cornersSquareOptions: {
      color: theme.primaryDark || '#5C3317',
      type: 'extra-rounded',
    },
    cornersDotOptions: {
      color: theme.primaryDark || '#5C3317',
      type: 'dot',
    },
    backgroundOptions: {
      color: '#FFFFFF',
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
 * Helper to draw delicate botanical coffee leaf sprigs on the canvas
 */
function drawBotanicalLeafSprig(ctx, x, y, scale = 1, rotation = 0, color = 'rgba(136, 77, 37, 0.32)') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Central curved stem
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(40, 20, 90, 70, 130, 140);
  ctx.stroke();

  // Helper to draw a tapered leaf
  const drawLeaf = (startX, startY, tipX, tipY, ctrlW, leafScale = 1) => {
    ctx.save();
    ctx.beginPath();
    const dx = tipX - startX;
    const dy = tipY - startY;
    const perpX = -dy * 0.35 * leafScale;
    const perpY = dx * 0.35 * leafScale;

    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(
      startX + dx * 0.4 + perpX,
      startY + dy * 0.4 + perpY,
      startX + dx * 0.8 + perpX * 0.5,
      startY + dy * 0.8 + perpY * 0.5,
      tipX,
      tipY
    );
    ctx.bezierCurveTo(
      startX + dx * 0.8 - perpX * 0.5,
      startY + dy * 0.8 - perpY * 0.5,
      startX + dx * 0.4 - perpX,
      startY + dy * 0.4 - perpY,
      startX,
      startY
    );
    ctx.globalAlpha = 0.45;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.stroke();

    // Leaf center vein
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + dx * 0.88, startY + dy * 0.88);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  };

  // Leaves branching off
  drawLeaf(15, 8, 55, -8, 20, 0.9);
  drawLeaf(32, 22, -8, 48, 22, 0.95);
  drawLeaf(58, 44, 108, 32, 24, 1.05);
  drawLeaf(76, 68, 38, 105, 24, 1.1);
  drawLeaf(104, 102, 160, 96, 26, 1.15);
  drawLeaf(116, 122, 85, 168, 24, 1.0);
  // Terminal tip leaf
  drawLeaf(130, 140, 175, 185, 22, 0.85);

  ctx.restore();
}

/**
 * Draws vintage inner scalloped corner border
 */
function drawVintageScallopedBorder(ctx, x, y, w, h, scallopRadius, color, lineWidth = 1.6) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const sr = scallopRadius;

  ctx.beginPath();
  // Top edge
  ctx.moveTo(x + sr, y);
  ctx.lineTo(x + w - sr, y);

  // Top-Right inward concave scallop
  ctx.arc(x + w, y, sr, Math.PI, Math.PI / 2, true);

  // Right edge
  ctx.lineTo(x + w, y + h - sr);

  // Bottom-Right inward concave scallop
  ctx.arc(x + w, y + h, sr, (3 * Math.PI) / 2, Math.PI, true);

  // Bottom edge
  ctx.lineTo(x + sr, y + h);

  // Bottom-Left inward concave scallop
  ctx.arc(x, y + h, sr, 0, (3 * Math.PI) / 2, true);

  // Left edge
  ctx.lineTo(x, y + sr);

  // Top-Left inward concave scallop
  ctx.arc(x, y, sr, Math.PI / 2, 0, true);

  ctx.closePath();
  ctx.stroke();

  // Small corner decorative dots inside the scallops
  const dotOffset = sr * 0.45;
  const dotR = 2.5;
  ctx.fillStyle = color;

  const dots = [
    [x + dotOffset, y + dotOffset],
    [x + w - dotOffset, y + dotOffset],
    [x + w - dotOffset, y + h - dotOffset],
    [x + dotOffset, y + h - dotOffset],
  ];

  for (const [dx, dy] of dots) {
    ctx.beginPath();
    ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Renders a full 1200x1800 high-resolution print card onto an HTMLCanvasElement
 * Styled with classic cafe stationery aesthetics, botanical flourishes,
 * custom brand palette, table code manual fallback, and prominent branding.
 */
export async function renderPrintCardCanvas({ table, restaurant }) {
  const brandColor = restaurant?.brandColor || '#884D25';
  const theme = generateThemeFromColor(brandColor);
  const qrUrl = `${CUSTOMER_URL}/t/${table.qrToken}`;
  const tableCodeFormatted = formatTableCode(table.qrToken);

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

  // 2. Load restaurant logo (or placeholder fallback)
  let headerLogo = null;
  if (restaurant?.logoUrl) {
    headerLogo = await loadImage(restaurant.logoUrl);
  }
  if (!headerLogo) {
    headerLogo = await loadImage(cafeLogoPlaceholder);
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

  // --- Background: Warm tactile cafe stationery ---
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#FAF7F1');
  bgGrad.addColorStop(0.5, '#F7F2EA');
  bgGrad.addColorStop(1, '#F3ECE2');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // --- Double Vintage Borders ---
  const outerMargin = 40;
  const outerW = width - outerMargin * 2;
  const outerH = height - outerMargin * 2;
  const outerRadius = 42;

  // Outer border with smooth rounded corners
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(outerMargin, outerMargin, outerW, outerH, outerRadius);
  ctx.strokeStyle = 'rgba(136, 77, 37, 0.4)';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.restore();

  // Inner border with vintage scalloped corners
  const innerMargin = 58;
  const innerW = width - innerMargin * 2;
  const innerH = height - innerMargin * 2;
  const scallopRadius = 36;
  drawVintageScallopedBorder(
    ctx,
    innerMargin,
    innerMargin,
    innerW,
    innerH,
    scallopRadius,
    'rgba(136, 77, 37, 0.32)',
    1.6
  );

  // --- Botanical Leaves Accents ---
  // Top-Left Botanical Sprig
  drawBotanicalLeafSprig(ctx, 80, 80, 1.05, -0.15, 'rgba(136, 77, 37, 0.35)');
  // Bottom-Right Botanical Sprig
  drawBotanicalLeafSprig(ctx, width - 80, height - 80, 1.05, Math.PI - 0.15, 'rgba(136, 77, 37, 0.35)');

  // --- Header: Circular Logo Badge ---
  const logoCenterY = 165;
  const logoSize = 136;
  const logoRadius = logoSize / 2;

  // Outer decorative ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(width / 2, logoCenterY, logoRadius + 7, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(136, 77, 37, 0.45)';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Circular white fill
  ctx.beginPath();
  ctx.arc(width / 2, logoCenterY, logoRadius + 5, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(35, 24, 18, 0.08)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  ctx.fill();
  ctx.restore();

  // Draw circular logo image
  if (headerLogo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, logoCenterY, logoRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      headerLogo,
      width / 2 - logoRadius,
      logoCenterY - logoRadius,
      logoSize,
      logoSize
    );
    ctx.restore();
  }

  // --- Restaurant Name ---
  const restName = restaurant?.name || 'LayoScan';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#241810';
  ctx.font = '700 58px "Playfair Display", "Times New Roman", Georgia, serif';
  ctx.fillText(restName, width / 2, 280, width - 240);
  ctx.restore();

  // Subtle accent line under name
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(width / 2 - 45, 305);
  ctx.lineTo(width / 2 + 45, 305);
  ctx.strokeStyle = 'rgba(136, 77, 37, 0.45)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  // --- Location Pin & Address ---
  const locationText =
    restaurant?.contactInfo?.address || 'Addis Ababa, Ethiopia';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#6E5C51';
  ctx.font = '500 24px Inter, -apple-system, BlinkMacSystemFont, sans-serif';

  // Measure text and draw pin icon
  const locWidth = ctx.measureText(locationText).width;
  const pinX = width / 2 - locWidth / 2 - 22;
  const pinY = 345;

  // Small pin icon
  ctx.beginPath();
  ctx.arc(pinX, pinY - 4, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#884D25';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(pinX - 5, pinY - 2);
  ctx.lineTo(pinX, pinY + 6);
  ctx.lineTo(pinX + 5, pinY - 2);
  ctx.fill();

  ctx.fillStyle = '#6E5C51';
  ctx.fillText(locationText, width / 2 + 8, pinY + 3, width - 240);
  ctx.restore();

  // --- Middle: QR Code Container Frame ---
  const qrBoxSize = 660;
  const qrBoxX = width / 2 - qrBoxSize / 2; // 270
  const qrBoxY = 390;
  const qrBoxRadius = 36;

  // Subtle warm shadow behind QR
  ctx.save();
  ctx.shadowColor = 'rgba(40, 26, 18, 0.1)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 12;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.lineWidth = 2.2;
  ctx.strokeStyle = 'rgba(136, 77, 37, 0.28)';
  ctx.stroke();
  ctx.restore();

  // Draw QR image
  if (qrImage) {
    const qrSize = 590;
    const qrX = width / 2 - qrSize / 2;
    const qrY = qrBoxY + (qrBoxSize - qrSize) / 2;
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
  }

  // --- Scan Viewfinder Divider & "SCAN TO ORDER" ---
  const dividerY = qrBoxY + qrBoxSize + 70; // ~1120

  // Left & right flanking accent lines
  const lineLen = 130;
  ctx.save();
  ctx.strokeStyle = 'rgba(136, 77, 37, 0.35)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 50 - lineLen, dividerY);
  ctx.lineTo(width / 2 - 50, dividerY);
  ctx.moveTo(width / 2 + 50, dividerY);
  ctx.lineTo(width / 2 + 50 + lineLen, dividerY);
  ctx.stroke();

  // Center viewfinder bracket icon [ - ]
  const vfSize = 34;
  const vfx = width / 2 - vfSize / 2;
  const vfy = dividerY - vfSize / 2;
  const vfArm = 9;

  ctx.strokeStyle = '#884D25';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 4 corners of viewfinder
  ctx.beginPath();
  // Top-left
  ctx.moveTo(vfx, vfy + vfArm);
  ctx.lineTo(vfx, vfy);
  ctx.lineTo(vfx + vfArm, vfy);
  // Top-right
  ctx.moveTo(vfx + vfSize - vfArm, vfy);
  ctx.lineTo(vfx + vfSize, vfy);
  ctx.lineTo(vfx + vfSize, vfy + vfArm);
  // Bottom-right
  ctx.moveTo(vfx + vfSize, vfy + vfSize - vfArm);
  ctx.lineTo(vfx + vfSize, vfy + vfSize);
  ctx.lineTo(vfx + vfSize - vfArm, vfy + vfSize);
  // Bottom-left
  ctx.moveTo(vfx + vfArm, vfy + vfSize);
  ctx.lineTo(vfx, vfy + vfSize);
  ctx.lineTo(vfx, vfy + vfSize - vfArm);
  // Center small horizontal tick
  ctx.moveTo(width / 2 - 6, dividerY);
  ctx.lineTo(width / 2 + 6, dividerY);
  ctx.stroke();
  ctx.restore();

  // "SCAN TO ORDER" in spaced uppercase tracking
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#6E5C51';
  ctx.font = '600 24px "Space Grotesk", Inter, sans-serif';
  const ctaText = 'S C A N   T O   O R D E R';
  ctx.fillText(ctaText, width / 2, dividerY + 45);
  ctx.restore();

  // --- Table Pill Badge (Vintage Cafe Button) ---
  const tableLabel = table.label || 'Table';
  const pillY = dividerY + 75; // ~1195
  const pillW = 440;
  const pillH = 88;
  const pillX = width / 2 - pillW / 2;
  const pillRadius = 44;

  ctx.save();
  ctx.shadowColor = 'rgba(40, 24, 15, 0.16)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;

  // Dark rich espresso pill fill
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, pillRadius);
  ctx.fillStyle = '#3E2415'; // Dark warm coffee tone
  ctx.fill();

  // Inner subtle border
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.stroke();

  // Table label text inside pill
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = '700 48px "Playfair Display", Georgia, serif';
  ctx.fillText(tableLabel, width / 2, pillY + 60);
  ctx.restore();

  // --- Manual Table Code Section (For customer manual entry) ---
  const manualBoxY = pillY + pillH + 35; // ~1318
  const manualBoxW = 540;
  const manualBoxH = 84;
  const manualBoxX = width / 2 - manualBoxW / 2;
  const manualRadius = 20;

  ctx.save();
  // Delicate dashed container
  ctx.beginPath();
  ctx.roundRect(manualBoxX, manualBoxY, manualBoxW, manualBoxH, manualRadius);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = 'rgba(136, 77, 37, 0.45)';
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash

  // "TABLE CODE" Label
  ctx.textAlign = 'center';
  ctx.fillStyle = '#856F62';
  ctx.font = '600 18px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('ENTER TABLE CODE MANUALLY:', width / 2, manualBoxY + 30);

  // Formatted Code: e.g. 8E47-AF83-AFAA-9E5A
  ctx.fillStyle = '#2D1B10';
  ctx.font = '700 28px "Space Grotesk", monospace';
  ctx.fillText(tableCodeFormatted, width / 2, manualBoxY + 64);

  // Web address hint
  ctx.fillStyle = '#856F62';
  ctx.font = '500 18px Inter, sans-serif';
  ctx.fillText('layoscancustomer.vercel.app', width / 2, manualBoxY + manualBoxH + 28);
  ctx.restore();

  // --- Footer: High Visibility "Powered by LayoScan" Badge ---
  const footerY = height - 105;
  const markLogo = await loadImage(logoImg);

  ctx.save();
  // Pill background for footer branding to ensure standout visibility
  const footBadgeW = 390;
  const footBadgeH = 58;
  const footBadgeX = width / 2 - footBadgeW / 2;
  const footBadgeRadius = 29;

  ctx.beginPath();
  ctx.roundRect(footBadgeX, footerY - 40, footBadgeW, footBadgeH, footBadgeRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(30, 20, 12, 0.08)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = 'rgba(136, 77, 37, 0.28)';
  ctx.stroke();

  // Icon + "Powered by LayoScan"
  const markSize = 34;
  const textStr = 'Powered by LayoScan';
  ctx.font = '700 23px "Space Grotesk", Inter, sans-serif';
  const textWidth = ctx.measureText(textStr).width;
  const totalW = markSize + 12 + textWidth;
  const startX = width / 2 - totalW / 2;

  if (markLogo) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(startX, footerY - 28, markSize, markSize, 8);
    ctx.clip();
    ctx.drawImage(markLogo, startX, footerY - 28, markSize, markSize);
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1E1510'; // High-contrast crisp dark text
    ctx.fillText('Powered by ', startX + markSize + 12, footerY - 3);

    const prefixWidth = ctx.measureText('Powered by ').width;
    ctx.fillStyle = '#884D25'; // Brand accent on LayoScan
    ctx.fillText('LayoScan', startX + markSize + 12 + prefixWidth, footerY - 3);
  } else {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1E1510';
    ctx.fillText('Powered by LayoScan', width / 2, footerY - 3);
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
