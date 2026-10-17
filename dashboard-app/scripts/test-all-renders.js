/**
 * Tests renderCard across all 9 designs × 3 orientations = 27 combinations.
 */

import { renderCard } from '../src/lib/cards/renderEngine.js';
import { CARD_DESIGNS } from '../src/lib/cards/layoutSpec.js';

const sampleRestaurant = {
  name: 'Elili Cafe',
  brandColor: '#1B382B',
  description: 'WE SERVE QUALITY, WE THRIVE FOR YOUR SATISFACTION',
  logoUrl: null,
  paymentAccounts: {
    telebirr: { accountNumber: '0902882087', isActive: true },
    cbeBirr: { accountNumber: '1000594630107', isActive: true },
  },
};

const sampleTable = {
  label: 'Table 1',
  qrToken: '8E47AF83AFAA9E5A',
};

// Create a robust Mock Canvas and Context for headless Node verification
function createMockCanvas(width, height) {
  const ctx = {
    canvas: { width, height },
    globalAlpha: 1,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '16px sans-serif',
    textAlign: 'center',
    textBaseline: 'middle',
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetY: 0,
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    rect: () => {},
    roundRect: () => {},
    setLineDash: () => {},
    getLineDash: () => [],
    clip: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    clearRect: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    arcTo: () => {},
    bezierCurveTo: () => {},
    quadraticCurveTo: () => {},
    drawImage: () => {},
    measureText: (txt) => ({ width: (txt || '').length * 10 }),
    fillText: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray(400).fill(255) }),
  };

  return {
    width,
    height,
    getContext: () => ctx,
    toDataURL: () => 'data:image/png;base64,mock',
  };
}

const mockQRImage = { width: 600, height: 600, naturalWidth: 600, naturalHeight: 600 };
const orientations = ['portrait', 'landscape', 'menu_board'];

console.log('Testing renderCard across 9 designs × 3 orientations (27 combinations)...');

let passed = 0;
for (const design of CARD_DESIGNS) {
  for (const orient of orientations) {
    const mockCanvas = createMockCanvas(0, 0);
    try {
      await renderCard({
        table: sampleTable,
        restaurant: sampleRestaurant,
        templateId: design.id,
        orientation: orient,
        qrImage: mockQRImage,
        targetCanvas: mockCanvas,
      });

      // Verify canvas size matches spec
      const expectedSizes = {
        portrait: { w: 1240, h: 1748 },
        landscape: { w: 2480, h: 1748 },
        menu_board: { w: 1654, h: 2339 },
      };

      const expected = expectedSizes[orient];
      if (mockCanvas.width !== expected.w || mockCanvas.height !== expected.h) {
        throw new Error(`Size mismatch for ${design.id} (${orient}): got ${mockCanvas.width}x${mockCanvas.height}, expected ${expected.w}x${expected.h}`);
      }

      console.log(`  ✓ ${design.id} (${orient}) rendered cleanly [${mockCanvas.width}×${mockCanvas.height}]`);
      passed++;
    } catch (err) {
      console.error(`  ✗ Error rendering ${design.id} (${orient}):`, err);
    }
  }
}

// Also test modern_minimal with heroImage: null and logoImage: null
console.log('\nTesting modern_minimal with heroImage: null, logoImage: null, 40-char name, 90-char tagline...');
const stressCanvas = createMockCanvas(0, 0);
await renderCard({
  table: { label: 'VIP 99', qrToken: '1234567890ABCDEF' },
  restaurant: {
    name: 'The Grand Royal Ethiopian Gourmet Bistro',
    description: 'AUTHENTIC HERITAGE CUISINE, SPECIALTY COFFEE, HANDCRAFTED PASTRIES DAILY FOR EVERY GUEST',
    logoUrl: null,
    paymentAccounts: {},
  },
  templateId: 'modern_minimal',
  orientation: 'portrait',
  qrImage: mockQRImage,
  logoImage: null,
  heroImage: null,
  targetCanvas: stressCanvas,
});
console.log('  ✓ modern_minimal stress render succeeded!');

console.log(`\nCompleted ${passed}/27 combinations successfully!`);
if (passed === 27) {
  process.exit(0);
} else {
  process.exit(1);
}
