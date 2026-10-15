/**
 * Slot Compositing Engine for LayoScan Card Templates.
 * Iterates through declarative slot specifications and composites text, QR codes,
 * images, badges, and pills onto the canvas.
 */

import { drawRoundRect } from './drawRoundRect.js';
import { fitText, sampleBackgroundLuminance, contrastRatio, getRelativeLuminance } from './fitText.js';
import { drawQRWithQuietZone } from './qrQuietZone.js';

/**
 * Ensures 'Noto Sans Ethiopic' is included in every text slot's font stack for Amharic support.
 */
function ensureEthiopicFont(font) {
  if (!font) {
    return 'Inter, "Noto Sans Ethiopic", sans-serif';
  }
  if (font.includes('Noto Sans Ethiopic')) {
    return font;
  }
  // Inject before system fallbacks or append
  return `${font}, "Noto Sans Ethiopic", sans-serif`;
}

/**
 * Formats restaurant payment accounts into a single clean line.
 * e.g. "TELEBIRR: 0902882087  •  CBE: 1000594630107"
 */
export function formatPaymentAccounts(accounts) {
  if (!accounts || typeof accounts !== 'object') return '';

  const parts = [];
  if (accounts.telebirr) {
    parts.push(`TELEBIRR: ${accounts.telebirr}`);
  }
  if (accounts.cbe) {
    parts.push(`CBE: ${accounts.cbe}`);
  }
  if (accounts.cbeBirr) {
    parts.push(`CBE BIRR: ${accounts.cbeBirr}`);
  }
  if (accounts.boa) {
    parts.push(`BOA: ${accounts.boa}`);
  }
  if (accounts.awash) {
    parts.push(`AWASH: ${accounts.awash}`);
  }

  // Also support generic key/value if provided
  if (parts.length === 0) {
    for (const [k, v] of Object.entries(accounts)) {
      if (v && typeof v === 'string') {
        parts.push(`${k.toUpperCase()}: ${v}`);
      }
    }
  }

  return parts.join('   •   ');
}

/**
 * Resolves dynamic data source value for a slot.
 */
export function resolveSlotValue(slot, data) {
  const { restaurant, table, formattedTableCode } = data;

  switch (slot.source) {
    case 'name':
      return restaurant?.name || slot.fallback || 'Restaurant';

    case 'tagline':
      return restaurant?.description || slot.fallback || '';

    case 'tableLabel':
      return table?.label || slot.fallback || 'Table 1';

    case 'tableCode':
      return formattedTableCode || slot.fallback || 'TABLE-CODE';

    case 'payment': {
      const formatted = formatPaymentAccounts(restaurant?.paymentAccounts);
      return formatted || slot.fallback || '';
    }

    case 'footer':
      return slot.text || slot.fallback || 'POWERED BY LAYOSCAN • SCAN TO VIEW MENU & ORDER';

    case 'custom':
      return slot.text || slot.fallback || '';

    default:
      return slot.text || slot.fallback || '';
  }
}

/**
 * Aspect-fill image drawer inside bounded slot with optional border radius.
 */
export function drawImageFit(ctx, img, x, y, width, height, radius = 0) {
  if (!img) return;
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  if (!imgW || !imgH) return;

  const targetRatio = width / height;
  const imgRatio = imgW / imgH;

  let sWidth, sHeight, sx, sy;
  if (imgRatio > targetRatio) {
    sHeight = imgH;
    sWidth = imgH * targetRatio;
    sx = (imgW - sWidth) / 2;
    sy = 0;
  } else {
    sWidth = imgW;
    sHeight = imgW / targetRatio;
    sx = 0;
    sy = (imgH - sHeight) / 2;
  }

  ctx.save();
  if (radius > 0) {
    drawRoundRect(ctx, x, y, width, height, radius);
    ctx.clip();
  }
  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, width, height);
  ctx.restore();
}

/**
 * Renders every dynamic slot onto the canvas according to design specifications.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Array<Object>} slots - Array of slot objects from layout spec
 * @param {Object} data - Dynamic data payload: { restaurant, table, qrImage, logoImage, heroImage, formattedTableCode }
 * @param {Object} [options] - Optional render options
 */
export function renderSlots(ctx, slots = [], data = {}, options = {}) {
  if (!ctx || !Array.isArray(slots)) return;

  const {
    restaurant = {},
    table = {},
    qrImage = null,
    logoImage = null,
    heroImage = null,
    formattedTableCode = 'TABLE-CODE',
  } = data;

  const isDev = typeof process !== 'undefined'
    ? process.env?.NODE_ENV !== 'production'
    : Boolean(import.meta.env?.DEV);

  for (const slot of slots) {
    if (!slot) continue;

    const {
      id,
      type = 'text',
      x = 0,
      y = 0,
      w,
      h,
      opacity = 1,
      color = '#18181B',
      bgColor,
      radius = 0,
      borderColor,
      borderWidth = 1,
      shadowColor,
      shadowBlur,
      shadowOffsetY = 4,
      align = 'center',
      contrastCheck = false,
    } = slot;

    // Apply slot opacity
    ctx.save();
    if (typeof opacity === 'number' && opacity < 1 && opacity >= 0) {
      ctx.globalAlpha = opacity;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. TEXT SLOTS
    // ──────────────────────────────────────────────────────────────────────────
    if (type === 'text') {
      const rawText = resolveSlotValue(slot, { restaurant, table, formattedTableCode });
      const displayText = rawText || slot.fallback || '';

      if (displayText) {
        const slotW = w || 600;
        const slotH = h || 80;

        // Contrast Check (Dev warning)
        if (contrastCheck && isDev) {
          const bgLum = sampleBackgroundLuminance(ctx, x, y, slotW, slotH);
          const ratio = contrastRatio(color, bgLum);
          if (ratio < 4.5) {
            console.warn(
              `[LayoScan Engine Contrast Warning] Slot "${id}" contrast ratio is ${ratio.toFixed(2)}:1 (minimum 4.5:1 recommended) against sampled background.`
            );
          }
        }

        // Clip slot boundaries if w & h set (§9.4)
        if (slot.clip !== false && w && h) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, w, h);
          ctx.clip();
        }

        const fontStack = ensureEthiopicFont(slot.font);
        const fitted = fitText(ctx, displayText, {
          w: slotW,
          maxFontPx: slot.maxFontPx || 36,
          minFontPx: slot.minFontPx || Math.max(16, Math.floor((slot.maxFontPx || 36) * 0.6)),
          font: fontStack,
          weight: slot.weight || 600,
          italic: slot.italic || false,
          letterSpacing: slot.letterSpacing || 0,
          uppercase: slot.uppercase || false,
          maxLines: slot.maxLines || 1,
          lineHeight: slot.lineHeight || 1.2,
        });

        // Setup typography context
        ctx.font = fitted.fontString;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';

        if (shadowColor && shadowBlur) {
          ctx.shadowColor = shadowColor;
          ctx.shadowBlur = shadowBlur;
          ctx.shadowOffsetY = shadowOffsetY;
        }

        // Calculate horizontal alignment anchor
        let textX = x;
        if (align === 'center') {
          textX = x + slotW / 2;
        } else if (align === 'right') {
          textX = x + slotW;
        }

        // Render each line
        const totalTextHeight = fitted.totalHeight || fitted.lineHeightPx;
        const startY = y + (slotH - totalTextHeight) / 2 + fitted.lineHeightPx / 2;

        for (let i = 0; i < fitted.lines.length; i++) {
          const lineY = startY + i * fitted.lineHeightPx;
          ctx.fillText(fitted.lines[i], textX, lineY);
        }

        if (slot.clip !== false && w && h) {
          ctx.restore();
        }
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. QR CODE SLOTS
    // ──────────────────────────────────────────────────────────────────────────
    else if (type === 'qr') {
      if (qrImage) {
        drawQRWithQuietZone(ctx, qrImage, slot, {
          bgColor: bgColor || slot.containerBg,
          radius: radius || 28,
          borderColor,
          borderWidth,
          shadowColor,
          shadowBlur,
          shadowOffsetY,
        });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. IMAGE SLOTS (Logo, Hero Image, Decorative Badges)
    // ──────────────────────────────────────────────────────────────────────────
    else if (type === 'image') {
      let targetImg = null;
      if (slot.source === 'logo') {
        targetImg = logoImage;
      } else if (slot.source === 'heroImage') {
        targetImg = heroImage;
      } else if (slot.image) {
        targetImg = slot.image;
      }

      if (targetImg && w && h) {
        if (shadowColor && shadowBlur) {
          ctx.save();
          ctx.shadowColor = shadowColor;
          ctx.shadowBlur = shadowBlur;
          ctx.shadowOffsetY = shadowOffsetY;
          drawRoundRect(ctx, x, y, w, h, radius);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.restore();
        }

        drawImageFit(ctx, targetImg, x, y, w, h, radius);

        if (borderColor) {
          ctx.save();
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = borderWidth;
          drawRoundRect(ctx, x, y, w, h, radius);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. PILL BADGES (e.g. "Table 1" High-Visibility Badge)
    // ──────────────────────────────────────────────────────────────────────────
    else if (type === 'pill') {
      const slotW = w || 420;
      const slotH = h || 80;
      const pillRadius = radius || slotH / 2;

      // Draw container shadow & background
      ctx.save();
      if (shadowColor && shadowBlur) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetY = shadowOffsetY;
      }

      ctx.fillStyle = bgColor || '#1B382B';
      drawRoundRect(ctx, x, y, slotW, slotH, pillRadius);
      ctx.fill();

      if (borderColor) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        drawRoundRect(ctx, x, y, slotW, slotH, pillRadius);
        ctx.stroke();
      }
      ctx.restore();

      // Render inner label text
      const rawText = resolveSlotValue(slot, { restaurant, table, formattedTableCode });
      const textVal = rawText || slot.fallback || 'Table 1';

      if (textVal) {
        ctx.save();
        const fontStack = ensureEthiopicFont(slot.font);
        const fitted = fitText(ctx, textVal, {
          w: slotW - 40,
          maxFontPx: slot.maxFontPx || 40,
          minFontPx: slot.minFontPx || 22,
          font: fontStack,
          weight: slot.weight || 700,
          italic: slot.italic || false,
          letterSpacing: slot.letterSpacing || 1,
          uppercase: slot.uppercase || false,
        });

        ctx.font = fitted.fontString;
        ctx.fillStyle = color || '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fitted.lines[0] || textVal, x + slotW / 2, y + slotH / 2 + 1);
        ctx.restore();
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. STRUCTURED TABLE CODE CAPSULE BADGE
    // ──────────────────────────────────────────────────────────────────────────
    else if (type === 'badge') {
      const slotW = w || 460;
      const slotH = h || 60;
      const badgeRadius = radius || 18;

      // Container
      ctx.save();
      if (shadowColor && shadowBlur) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetY = shadowOffsetY;
      }

      ctx.fillStyle = bgColor || '#FFFFFF';
      drawRoundRect(ctx, x, y, slotW, slotH, badgeRadius);
      ctx.fill();

      if (borderColor) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        drawRoundRect(ctx, x, y, slotW, slotH, badgeRadius);
        ctx.stroke();
      }
      ctx.restore();

      // Content: "TABLE CODE: 8E47-AFAA-9E5A"
      const labelPrefix = slot.labelPrefix ?? 'TABLE CODE: ';
      const codeVal = formattedTableCode || slot.fallback || 'TABLE-CODE';

      ctx.save();
      ctx.textBaseline = 'middle';

      const labelFont = `600 ${slot.labelPx || 18}px "Space Grotesk", Inter, sans-serif`;
      const codeFont = `700 ${slot.codePx || 24}px "Space Grotesk", monospace`;

      ctx.font = labelFont;
      const labelW = labelPrefix ? ctx.measureText(labelPrefix).width : 0;

      ctx.font = codeFont;
      const codeW = ctx.measureText(codeVal).width;

      const totalContentW = labelW + codeW;
      const startX = x + (slotW - totalContentW) / 2;
      const centerY = y + slotH / 2 + 1;

      const badgeBg = bgColor || '#FFFFFF';
      const bgLum = getRelativeLuminance(badgeBg);

      let effectiveCodeColor = color;
      if (!effectiveCodeColor || contrastRatio(effectiveCodeColor, bgLum) < 3.0) {
        effectiveCodeColor = bgLum > 0.5 ? '#111827' : '#FFFFFF';
      }

      let effectiveLabelColor = slot.labelColor;
      if (!effectiveLabelColor || contrastRatio(effectiveLabelColor, bgLum) < 2.5) {
        effectiveLabelColor = bgLum > 0.5 ? '#64748B' : '#A0A0A8';
      }

      if (labelPrefix) {
        ctx.fillStyle = effectiveLabelColor;
        ctx.font = labelFont;
        ctx.textAlign = 'left';
        ctx.fillText(labelPrefix, startX, centerY);
      }

      ctx.fillStyle = effectiveCodeColor;
      ctx.font = codeFont;
      ctx.textAlign = 'left';
      ctx.fillText(codeVal, startX + labelW, centerY);

      ctx.restore();
    }

    ctx.restore();
  }
}
