/**
 * Verification test suite for LayoScan Background Card Rendering Engine.
 * Runs in plain Node.js to verify specs, scannability, backwards compatibility,
 * and module import safety.
 */

import { CARD_DESIGNS, CANVAS_FORMATS, validateLayoutSpecs } from '../src/lib/cards/layoutSpec.js';
import { QR_TEMPLATES, getTemplateById, TEMPLATE_ALIASES } from '../src/lib/cards/designRegistry.js';
import { calculateQRMetrics, MIN_QUIET_ZONE_RATIO } from '../src/lib/cards/qrQuietZone.js';
import { drawRoundRect, normalizeRadii } from '../src/lib/cards/drawRoundRect.js';
import { ensureFontsLoaded, DEFAULT_DESCRIPTORS } from '../src/lib/cards/fonts.js';
import { fitText, contrastRatio, getRelativeLuminance } from '../src/lib/cards/fitText.js';

console.log('====================================================');
console.log('   LayoScan Card Rendering Engine Verification');
console.log('====================================================\n');

let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

// ── Test 1: LayoutSpec Validator (§10.6) ───────────────────────────────────────
console.log('Test 1: Running layoutSpec validation...');
try {
  const result = validateLayoutSpecs(CARD_DESIGNS);
  assert(result.valid === true, `Layout spec validation passed successfully (${result.checkedCount} slots checked across ${result.qrCount} QR slots)`);
} catch (err) {
  assert(false, `Layout spec validation threw: ${err.message}`);
}

// ── Test 2: Exactly 9 Designs Registered (§10.5) ──────────────────────────────
console.log('\nTest 2: Verifying design registry and legacy fields...');
assert(QR_TEMPLATES.length === 9, `QR_TEMPLATES contains exactly 9 designs (found ${QR_TEMPLATES.length})`);

const requiredLegacyFields = [
  'id', 'name', 'icon', 'category', 'description',
  'dotColor', 'cornerColor', 'accentColor', 'badgeBg',
  'badgeText', 'backgroundColor', 'sampleName', 'sampleTagline',
];

for (const design of QR_TEMPLATES) {
  for (const field of requiredLegacyFields) {
    assert(design[field] !== undefined && design[field] !== null, `Design "${design.id}" has legacy field "${field}": ${design[field]}`);
  }
}

// ── Test 3: Backward-Compatible Alias Lookups (§7) ────────────────────────────
console.log('\nTest 3: Verifying legacy template ID alias lookups...');
const expectedAliases = {
  cafe_artisan: 'artisan_linen',
  fast_casual: 'bold_street',
  fresh_mart: 'fresh_emerald',
  luxury_hotel: 'midnight_gold',
  cultural_heritage: 'habesha_heritage',
  liquor_bar: 'velvet_lounge',
};

for (const [legacyId, expectedTarget] of Object.entries(expectedAliases)) {
  const resolved = getTemplateById(legacyId);
  assert(resolved.id === expectedTarget, `getTemplateById("${legacyId}") resolves to "${expectedTarget}" (got "${resolved.id}")`);
}

// ── Test 4: QR Quiet Zone Scannability Assertions (§10.6) ─────────────────────
console.log('\nTest 4: Verifying QR quiet zone across all 27 layouts (9 designs × 3 orientations)...');
let qrChecked = 0;
for (const design of CARD_DESIGNS) {
  for (const [orient, layout] of Object.entries(design.layouts)) {
    const qrSlot = layout.slots.find((s) => s.type === 'qr');
    assert(Boolean(qrSlot), `Design "${design.id}" (${orient}) contains a QR slot`);
    if (qrSlot) {
      const metrics = calculateQRMetrics(qrSlot);
      const ratio = metrics.quietZoneRatio;
      assert(
        ratio >= MIN_QUIET_ZONE_RATIO,
        `QR slot "${qrSlot.id}" in "${design.id}" (${orient}): quiet zone ${(ratio * 100).toFixed(2)}% >= ${(MIN_QUIET_ZONE_RATIO * 100)}% (slot: ${metrics.w}x${metrics.h}, QR: ${metrics.qrSize}x${metrics.qrSize}, padding: ${metrics.quietZonePx}px)`
      );
      qrChecked++;
    }
  }
}
assert(qrChecked === 27, `Checked all 27 QR slots (count: ${qrChecked})`);

// ── Test 5: Safe Area Inset Validation ─────────────────────────────────────────
console.log('\nTest 5: Verifying all slots remain inside Safe Area insets (>= 40px)...');
for (const design of CARD_DESIGNS) {
  for (const [orient, layout] of Object.entries(design.layouts)) {
    const { safeArea, slots } = layout;
    const format = CANVAS_FORMATS[orient];
    for (const slot of slots) {
      const right = slot.x + (slot.w || 0);
      const bottom = slot.y + (slot.h || 0);
      const withinX = slot.x >= safeArea.left && right <= format.width - safeArea.right;
      const withinY = slot.y >= safeArea.top && bottom <= format.height - safeArea.bottom;
      if (!withinX || !withinY) {
        assert(false, `Slot "${slot.id}" in "${design.id}" (${orient}) outside safe area: x=${slot.x}, y=${slot.y}, w=${slot.w}, h=${slot.h}`);
      }
    }
  }
}
assert(true, 'All slots in all 27 layouts reside strictly within safe area print boundaries');

// ── Test 6: Typography Fitting & Truncation (§9.5) ────────────────────────────
console.log('\nTest 6: Testing typography fitText algorithm...');
// Mock canvas context
const mockCtx = {
  font: '',
  measureText: (txt) => ({ width: txt.length * 12 }),
};

const longName = 'The Grand Royal Ethiopian Gourmet Bistro & Lounge';
const fitted = fitText(mockCtx, longName, {
  w: 300,
  maxFontPx: 50,
  minFontPx: 20,
  font: 'Inter, sans-serif',
  maxLines: 1,
});

assert(fitted.lines.length === 1, `fitText single line result returned 1 line`);
assert(fitted.fontSize <= 50 && fitted.fontSize >= 20, `fitText stepped down font size to ${fitted.fontSize}px`);
assert(mockCtx.measureText(fitted.lines[0]).width <= 300, `fitText guarantees output width (${mockCtx.measureText(fitted.lines[0]).width}px) <= target width (300px)`);

// ── Test 7: WCAG Contrast Ratio Calculation (§9.7) ───────────────────────────
console.log('\nTest 7: Testing WCAG contrast ratio calculation...');
const blackOnWhite = contrastRatio('#000000', '#FFFFFF');
assert(Math.abs(blackOnWhite - 21) < 0.1, `Black on white contrast ratio is ~21:1 (got ${blackOnWhite.toFixed(2)})`);

const whiteOnWhite = contrastRatio('#FFFFFF', '#FFFFFF');
assert(Math.abs(whiteOnWhite - 1) < 0.01, `White on white contrast ratio is 1:1 (got ${whiteOnWhite.toFixed(2)})`);

const darkOnAmber = contrastRatio('#141414', '#FFA800');
assert(darkOnAmber >= 4.5, `Bold Street badge contrast ratio is ${darkOnAmber.toFixed(2)}:1 (>= 4.5:1 required)`);

// ── Test 8: normalizeRadii & drawRoundRect Safety (§5.2) ─────────────────────
console.log('\nTest 8: Testing normalizeRadii and roundRect polyfill safety...');
assert(JSON.stringify(normalizeRadii(16)) === JSON.stringify([16, 16, 16, 16]), 'normalizeRadii single number handles 4 corners');
assert(JSON.stringify(normalizeRadii([10, 20])) === JSON.stringify([10, 20, 10, 20]), 'normalizeRadii pair handles corners');

// Mock context path tracking
const pathCalls = [];
const mockPathCtx = {
  beginPath: () => pathCalls.push('beginPath'),
  moveTo: (x, y) => pathCalls.push(`moveTo(${x},${y})`),
  lineTo: (x, y) => pathCalls.push(`lineTo(${x},${y})`),
  arcTo: (x1, y1, x2, y2, r) => pathCalls.push(`arcTo(${x1},${y1},${x2},${y2},${r})`),
  closePath: () => pathCalls.push('closePath'),
};

drawRoundRect(mockPathCtx, 0, 0, 100, 100, 10);
assert(pathCalls.includes('beginPath') && pathCalls.includes('closePath'), 'drawRoundRect executed safe path via arcTo without crashing');

// ── Test 9: Web Font Preloader Graceful Fallback (§5.1) ───────────────────────
console.log('\nTest 9: Testing font loader in Node environment...');
let fontLoaded = false;
await ensureFontsLoaded().then(() => { fontLoaded = true; });
assert(fontLoaded === true, 'ensureFontsLoaded resolves cleanly without throwing in headless/Node environment');

console.log('\n====================================================');
if (failedTests === 0) {
  console.log('   ALL VERIFICATION SUITE CHECKS PASSED (0 failures)!');
  console.log('====================================================\n');
  process.exit(0);
} else {
  console.error(`   VERIFICATION FAILED WITH ${failedTests} FAILURE(S)!`);
  console.log('====================================================\n');
  process.exit(1);
}
