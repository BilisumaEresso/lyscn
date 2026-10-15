import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TARGET_DIR = path.resolve(__dirname, '../src/assets/cards');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

function escapeXml(unsafe) {
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

const DESIGNS = [
  { id: 'artisan_linen', name: 'Artisan Linen', bg: '#F6F3EC', fg: '#1B382B', accent: '#558B2F' },
  { id: 'bold_street', name: 'Bold Street', bg: '#1A1A1E', fg: '#FFA800', accent: '#E0E0E0' },
  { id: 'fresh_emerald', name: 'Fresh Emerald', bg: '#0B3B24', fg: '#86EFAC', accent: '#E2E8F0' },
  { id: 'midnight_gold', name: 'Midnight Gold', bg: '#0C192E', fg: '#E5C583', accent: '#E2E8F0' },
  { id: 'habesha_heritage', name: 'Habesha Heritage', bg: '#F5EBE1', fg: '#781812', accent: '#D97706' },
  { id: 'velvet_lounge', name: 'Velvet Lounge', bg: '#14110E', fg: '#E5C583', accent: '#E2E8F0' },
  { id: 'juice_spris', name: 'Juice & Spris', bg: '#FFF8F0', fg: '#FF5722', accent: '#4CAF50' },
  { id: 'cafe_tent_classic', name: 'Café Tent Classic', bg: '#F3F7F4', fg: '#2E7D32', accent: '#1B382B' },
  { id: 'modern_minimal', name: 'Modern Minimal', bg: '#FAFAFA', fg: '#18181B', accent: '#71717A' },
];

const ORIENTATIONS = [
  { key: 'portrait', width: 1240, height: 1748, qrCenter: { x: 620, y: 920 }, label: 'Portrait (A6 @ 300 DPI)' },
  { key: 'landscape', width: 2480, height: 1748, qrCenter: { x: 1860, y: 780 }, label: 'Landscape Tent (A5 @ 300 DPI)' },
  { key: 'menu_board', width: 1654, height: 2339, qrCenter: { x: 827, y: 1250 }, label: 'Menu Board (A4 @ 200 DPI)' },
];

async function generate() {
  console.log(`Generating card placeholders in ${TARGET_DIR}...`);

  for (const design of DESIGNS) {
    for (const orient of ORIENTATIONS) {
      const filename = `${design.id}_${orient.key}.jpg`;
      const outputPath = path.join(TARGET_DIR, filename);

      const { width, height, qrCenter, label } = orient;
      const { bg, fg, accent } = design;

      const safeInset = orient.key === 'menu_board' ? 80 : 60;
      const safeW = width - safeInset * 2;
      const safeH = height - safeInset * 2;

      const escapedName = escapeXml(design.name.toUpperCase());
      const escapedLabel = escapeXml(label);

      // SVG with flat colors and clean lines
      const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background Base -->
  <rect width="${width}" height="${height}" fill="${bg}"/>

  <!-- Safe Area Trim Border -->
  <rect x="${safeInset}" y="${safeInset}" width="${safeW}" height="${safeH}"
        fill="none" stroke="${fg}" stroke-opacity="0.15" stroke-width="2" stroke-dasharray="16,12" rx="20"/>

  <!-- Subtle Top Margin Labels (outside dynamic text zones) -->
  <text x="${safeInset + 20}" y="${safeInset - 16}"
        fill="${fg}" fill-opacity="0.35" font-family="sans-serif" font-size="14" font-weight="bold">
    TRIM SAFE AREA (${safeInset}px)
  </text>
  <text x="${width - safeInset - 20}" y="${safeInset - 16}" text-anchor="end"
        fill="${fg}" fill-opacity="0.35" font-family="sans-serif" font-size="14" font-weight="bold">
    ${escapedName} · ${escapedLabel}
  </text>

  <!-- QR Slot Guide & Crosshair -->
  <g transform="translate(${qrCenter.x}, ${qrCenter.y})">
    <!-- QR Slot quiet zone outer frame -->
    <rect x="-300" y="-300" width="600" height="600" rx="36"
          fill="${fg}" fill-opacity="0.02" stroke="${fg}" stroke-opacity="0.18" stroke-width="2" stroke-dasharray="8,8"/>

    <!-- Subtle Crosshairs -->
    <line x1="-360" y1="0" x2="360" y2="0" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.3"/>
    <line x1="0" y1="-360" x2="0" y2="360" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.3"/>

    <circle cx="0" cy="0" r="48" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.35"/>
    <circle cx="0" cy="0" r="4" fill="${accent}" fill-opacity="0.5"/>
  </g>

  <!-- Footer notice -->
  <text x="${width / 2}" y="${height - (safeInset - 24)}" text-anchor="middle"
        fill="${fg}" fill-opacity="0.3" font-family="sans-serif" font-size="14" font-weight="500">
    LayoScan Background Engine · Target Artwork: ${width}×${height} px
  </text>
</svg>
`;

      await sharp(Buffer.from(svg))
        .jpeg({ quality: 60, mozjpeg: true })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);
      const kb = (stats.size / 1024).toFixed(1);
      console.log(`  ✓ ${filename} (${kb} KB)`);
    }
  }

  console.log('All 27 card placeholder images successfully generated.');
}

generate().catch((err) => {
  console.error('Error generating card placeholders:', err);
  process.exit(1);
});
