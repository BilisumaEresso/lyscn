/**
 * High-Resolution Card Rendering Pipeline for LayoScan.
 * Background-image-first architecture: loads designer background art once,
 * composites brand washes, and draws declarative dynamic data slots on top.
 */

import { CANVAS_FORMATS } from './layoutSpec.js';
import { getTemplateById } from './designRegistry.js';
import { renderSlots } from './slotRenderer.js';
import { ensureFontsLoaded } from './fonts.js';

/**
 * Safely loads an image in browser environments; returns null in headless/Node.
 */
export function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    if (typeof Image === 'undefined') {
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

/**
 * Formats a 16-character token into 4-character chunks (e.g. 8E47-AFAA-9E5A).
 */
export function formatTableCode(token) {
  if (!token) return 'TABLE-CODE';
  const clean = String(token).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const chunks = clean.match(/.{1,4}/g);
  return chunks ? chunks.join('-') : clean;
}

/**
 * Module-level cache for background images keyed by `${designId}:${orientation}`.
 * Prevents re-fetching / re-decoding high-resolution JPEG assets across multi-table batch runs.
 */
const backgroundCache = new Map();

/**
 * Loads and caches background image for a given design and orientation.
 *
 * @param {string} designId
 * @param {string} orientation
 * @param {string} assetSrc
 * @returns {Promise<HTMLImageElement|null>}
 */
export function getCachedBackground(designId, orientation, assetSrc) {
  const cacheKey = `${designId}:${orientation}`;
  if (backgroundCache.has(cacheKey)) {
    return backgroundCache.get(cacheKey);
  }

  const loadPromise = loadImage(assetSrc);
  backgroundCache.set(cacheKey, loadPromise);
  return loadPromise;
}

/**
 * Clears background image cache (useful during development or memory flush).
 */
export function clearBackgroundCache() {
  backgroundCache.clear();
}

/**
 * Draws image onto canvas with cover semantics (fill canvas, preserve aspect ratio, crop overflow).
 * Never stretches, never letterboxes.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement|CanvasImageSource} img
 * @param {number} width
 * @param {number} height
 */
export function drawImageCover(ctx, img, width, height) {
  if (!img) return;

  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  if (!imgW || !imgH) return;

  const targetRatio = width / height;
  const imgRatio = imgW / imgH;

  let sWidth = imgW;
  let sHeight = imgH;
  let sx = 0;
  let sy = 0;

  if (imgRatio > targetRatio) {
    // Image is wider than canvas: crop horizontal sides
    sHeight = imgH;
    sWidth = imgH * targetRatio;
    sx = (imgW - sWidth) / 2;
    sy = 0;
  } else {
    // Image is taller than canvas: crop vertical overflow
    sWidth = imgW;
    sHeight = imgW / targetRatio;
    sx = 0;
    sy = (imgH - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, width, height);
}

/**
 * Full card rendering pipeline.
 *
 * Pipeline sequence:
 * 1. Await web fonts (Playfair Display, Inter, Noto Sans Ethiopic)
 * 2. Resolve design specification and target orientation format
 * 3. Fetch/cache background image
 * 4. Create target HTMLCanvasElement
 * 5. Draw background with drawImageCover
 * 6. Apply optional brand color wash if enabled
 * 7. Composite all dynamic data slots (QR code, text, badges, logo, table label)
 *
 * @param {Object} params
 * @param {Object} params.table - Table data { label, qrToken }
 * @param {Object} [params.restaurant] - Restaurant data { name, description, brandColor, logoUrl, paymentAccounts }
 * @param {string} [params.templateId='artisan_linen'] - Design ID or alias
 * @param {string} [params.orientation='portrait'] - 'portrait' | 'landscape' | 'menu_board'
 * @param {HTMLImageElement} [params.qrImage] - Pre-rendered QR code image
 * @param {HTMLImageElement} [params.logoImage] - Pre-loaded restaurant logo
 * @param {HTMLImageElement} [params.heroImage] - Pre-loaded hero image
 * @param {Object} [params.menuData] - Menu categories / products
 * @param {number} [params.washAlpha=0] - Optional brand wash opacity (0.06..0.14)
 * @param {HTMLCanvasElement} [params.targetCanvas] - Optional pre-allocated canvas
 * @returns {Promise<HTMLCanvasElement>} Resolves to rendered HTMLCanvasElement
 */
export async function renderCard({
  table,
  restaurant = {},
  templateId = 'artisan_linen',
  orientation = 'portrait',
  qrImage = null,
  logoImage = null,
  heroImage = null,
  menuData = null,
  washAlpha = 0,
  targetCanvas = null,
}) {
  // 1. Ensure all custom fonts are ready before any canvas text measurement/drawing (§5.1)
  await ensureFontsLoaded();

  // 2. Resolve design specification & canvas dimensions
  const design = getTemplateById(templateId);
  const normalizedOrientation = CANVAS_FORMATS[orientation] ? orientation : 'portrait';
  const format = CANVAS_FORMATS[normalizedOrientation];
  const { width, height } = format;

  const layout = design.layouts[normalizedOrientation] || design.layouts.portrait;

  // 3. Prepare Canvas
  const canvas = targetCanvas || (typeof document !== 'undefined' ? document.createElement('canvas') : null);
  if (!canvas) {
    throw new Error('Canvas element could not be created in this environment.');
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // 4. Load & Draw Background Image
  const bgSrc = design.backgrounds?.[normalizedOrientation];
  let bgImg = null;
  if (bgSrc) {
    bgImg = await getCachedBackground(design.id, normalizedOrientation, bgSrc);
  }

  if (bgImg) {
    drawImageCover(ctx, bgImg, width, height);
  } else {
    // Graceful solid tone fallback if image fails to load
    ctx.fillStyle = design.colors.background || '#FAFAFA';
    ctx.fillRect(0, 0, width, height);
  }

  // 5. Optional Brand Wash Overlay (§9.3)
  const effectiveWash = washAlpha > 0 ? washAlpha : (restaurant?.enableBrandWash ? 0.08 : 0);
  if (design.supportsBrandWash && restaurant?.brandColor && effectiveWash > 0) {
    ctx.save();
    ctx.fillStyle = restaurant.brandColor;
    ctx.globalAlpha = Math.min(0.2, Math.max(0.04, effectiveWash));
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 6. Format dynamic Table Code
  const formattedTableCode = formatTableCode(table?.qrToken);

  // 7. Composite Dynamic Slots
  // Deep clone references to guarantee input objects are never mutated (§9.8)
  const slotPayload = {
    restaurant: { ...restaurant },
    table: { ...table },
    qrImage,
    logoImage,
    heroImage,
    formattedTableCode,
    menuData,
  };

  renderSlots(ctx, layout.slots, slotPayload, {
    orientation: normalizedOrientation,
    width,
    height,
    design,
  });

  return canvas;
}
