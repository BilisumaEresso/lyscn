/**
 * QR Code Quiet Zone Guardian.
 * Enforces ISO/IEC 18004 scanning specifications by guaranteeing an uninhibited,
 * high-contrast quiet zone around any dynamic QR code drawn onto the card canvas.
 */

import { drawRoundRect } from './drawRoundRect.js';

/**
 * Standard minimum quiet zone ratio required relative to the rendered QR code size.
 * 0.08 = 8% quiet zone border.
 */
export const MIN_QUIET_ZONE_RATIO = 0.08;

/**
 * Default scaling factor of QR code relative to container size.
 * S * 0.84 provides (1 - 0.84) / (2 * 0.84) = ~9.52% quiet zone, safely above the 8% minimum.
 */
export const DEFAULT_QR_SCALE = 0.84;

/**
 * Maximum permitted scale of QR code inside its slot.
 * Guarantees at least (1 - 0.86) / 2 = 7% padding on every side.
 */
export const MAX_QR_SCALE = 0.86;

/**
 * Computes exact dimensions, offsets, and effective quiet zone metrics for a QR slot.
 *
 * @param {Object} slot - QR slot definition with { x, y, w, h, qrSize? }
 * @returns {{
 *   x: number,
 *   y: number,
 *   w: number,
 *   h: number,
 *   qrX: number,
 *   qrY: number,
 *   qrSize: number,
 *   quietZonePx: number,
 *   quietZoneRatio: number,
 *   isScannable: boolean
 * }}
 */
export function calculateQRMetrics(slot) {
  const w = slot.w || 500;
  const h = slot.h || slot.w || 500;
  const boxMin = Math.min(w, h);

  let qrSize;
  if (typeof slot.qrSize === 'number' && slot.qrSize > 0) {
    // If explicitly specified, ensure it doesn't exceed MAX_QR_SCALE * boxMin
    qrSize = Math.min(slot.qrSize, Math.floor(boxMin * MAX_QR_SCALE));
  } else {
    qrSize = Math.floor(boxMin * DEFAULT_QR_SCALE);
  }

  const quietZonePxX = (w - qrSize) / 2;
  const quietZonePxY = (h - qrSize) / 2;
  const quietZonePx = Math.min(quietZonePxX, quietZonePxY);
  const quietZoneRatio = qrSize > 0 ? quietZonePx / qrSize : 0;

  const qrX = slot.x + quietZonePxX;
  const qrY = slot.y + quietZonePxY;

  return {
    x: slot.x,
    y: slot.y,
    w,
    h,
    qrX,
    qrY,
    qrSize,
    quietZonePx,
    quietZoneRatio,
    isScannable: quietZoneRatio >= MIN_QUIET_ZONE_RATIO,
  };
}

/**
 * Returns the effective quiet zone ratio (as fraction of QR size) for a slot.
 * Used by layoutSpec validation to assert scannability.
 *
 * @param {Object} slot
 * @returns {number}
 */
export function getEffectiveQuietZoneRatio(slot) {
  return calculateQRMetrics(slot).quietZoneRatio;
}

/**
 * Renders a QR code onto the canvas, honoring container backgrounds, borders,
 * shadows, and guaranteeing the quiet zone padding.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement|CanvasImageSource} qrImage
 * @param {Object} slot
 * @param {Object} [options]
 */
export function drawQRWithQuietZone(ctx, qrImage, slot, options = {}) {
  if (!ctx || !qrImage) return;

  const metrics = calculateQRMetrics(slot);

  ctx.save();

  // 1. Draw Container Background Card / Pill if requested or specified
  const hasBg = Boolean(slot.bgColor || slot.containerBg || options.bgColor);
  const bgColor = slot.bgColor || slot.containerBg || options.bgColor || '#FFFFFF';
  const radius = slot.radius ?? options.radius ?? 28;

  if (hasBg) {
    if (slot.shadowColor || options.shadowColor) {
      ctx.shadowColor = slot.shadowColor || options.shadowColor || 'rgba(0,0,0,0.12)';
      ctx.shadowBlur = slot.shadowBlur ?? options.shadowBlur ?? 20;
      ctx.shadowOffsetY = slot.shadowOffsetY ?? options.shadowOffsetY ?? 8;
    }

    ctx.fillStyle = bgColor;
    drawRoundRect(ctx, slot.x, slot.y, metrics.w, metrics.h, radius);
    ctx.fill();

    // Clear shadow for borders
    ctx.shadowColor = 'transparent';

    if (slot.borderColor || options.borderColor) {
      ctx.strokeStyle = slot.borderColor || options.borderColor;
      ctx.lineWidth = slot.borderWidth ?? options.borderWidth ?? 2;
      drawRoundRect(ctx, slot.x, slot.y, metrics.w, metrics.h, radius);
      ctx.stroke();
    }

    // 1b. Optional Inner White Card (for high-contrast nested QR cards, e.g. Bold Street)
    const innerBgColor = slot.innerBgColor || options.innerBgColor;
    if (innerBgColor) {
      const pad = slot.innerPadding ?? options.innerPadding ?? 24;
      const innerRadius = slot.innerRadius ?? options.innerRadius ?? Math.max(12, radius - 6);
      ctx.fillStyle = innerBgColor;
      drawRoundRect(ctx, slot.x + pad, slot.y + pad, metrics.w - pad * 2, metrics.h - pad * 2, innerRadius);
      ctx.fill();

      const innerBorderColor = slot.innerBorderColor || options.innerBorderColor;
      if (innerBorderColor) {
        ctx.strokeStyle = innerBorderColor;
        ctx.lineWidth = slot.innerBorderWidth ?? options.innerBorderWidth ?? 2;
        drawRoundRect(ctx, slot.x + pad, slot.y + pad, metrics.w - pad * 2, metrics.h - pad * 2, innerRadius);
        ctx.stroke();
      }
    }
  }

  // 2. Draw the QR code image centered inside the quiet zone
  ctx.drawImage(
    qrImage,
    metrics.qrX,
    metrics.qrY,
    metrics.qrSize,
    metrics.qrSize
  );

  ctx.restore();
}
