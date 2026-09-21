import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const source = path.join(rootDir, 'src', 'assets', 'logo.png');
  const outputDir = path.join(rootDir, 'public', 'icons');

  if (!fs.existsSync(source)) {
    throw new Error(`Source logo not found: ${source}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  await sharp(source)
    .resize(192, 192, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toFile(path.join(outputDir, 'icon-192.png'));

  await sharp(source)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toFile(path.join(outputDir, 'icon-512.png'));

  const maskable = await sharp(source)
    .resize(410, 410, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: maskable, left: 51, top: 51 }])
    .png()
    .toFile(path.join(outputDir, 'maskable-icon-512.png'));

  await sharp(source)
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));

  console.log('Generated PWA icons in:', outputDir);
}

main().catch((error) => {
  console.error('Error generating icons:', error);
  process.exit(1);
});
