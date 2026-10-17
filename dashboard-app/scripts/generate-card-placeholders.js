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

      // Clean, production-ready background without broken dashed lines or debug text annotations
      const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="ambientGrad_${design.id}_${orient.key}" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="${bg}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${bg}" stop-opacity="0.96"/>
    </radialGradient>
  </defs>

  <!-- Clean Background Base -->
  <rect width="${width}" height="${height}" fill="url(#ambientGrad_${design.id}_${orient.key})"/>
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
