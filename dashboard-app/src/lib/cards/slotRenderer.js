/**
 * Slot Compositing Engine for LayoScan Card Templates.
 * Iterates through declarative slot specifications and composites text, QR codes,
 * images, badges, and pills onto the canvas.
 */

import { drawRoundRect } from './drawRoundRect.js';
import { fitText, sampleBackgroundLuminance, contrastRatio, getRelativeLuminance } from './fitText.js';
import { drawQRWithQuietZone } from './qrQuietZone.js';
import { drawDynamicMenuGrid } from '../canvasHelpers.js';
import { getMenuForCard } from '../menuDataHelpers.js';

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
 * Safely extracts account data from an account entry, whether it's a primitive string/number
 * or an object containing account details.
 *
 * @param {string|number|Object} val
 * @returns {{ number: string, bankName?: string, accountName?: string } | null}
 */
function extractAccountData(val) {
  if (val == null) return null;

  if (typeof val === 'string' || typeof val === 'number') {
    const str = String(val).trim();
    return (str && str !== '[object Object]') ? { number: str } : null;
  }

  if (typeof val === 'object') {
    // If explicitly marked inactive, ignore it
    if (val.isActive === false) return null;

    const rawNum = val.accountNumber ?? val.number ?? val.value ?? val.phone ?? val.account;
    if (rawNum != null) {
      const str = String(rawNum).trim();
      if (str && str !== '[object Object]') {
        return {
          number: str,
          bankName: (typeof val.bankName === 'string' ? val.bankName.trim() : '') ||
                    (typeof val.name === 'string' ? val.name.trim() : ''),
          accountName: typeof val.accountName === 'string' ? val.accountName.trim() : '',
        };
      }
    }
  }

  return null;
}

/**
 * Extracts the Telebirr account number from the restaurant's payment accounts.
 * Returns the phone number string or '' if no active Telebirr account is configured.
 * (All other payment methods have been removed from card printing per product decision.)
 *
 * @param {Object|string} accounts - paymentAccounts from restaurant data
 * @returns {string}
 */
export function formatPaymentAccounts(accounts) {
  if (!accounts) return '';
  if (typeof accounts === 'string') {
    // Legacy plain-string Telebirr number stored directly
    const str = accounts.trim();
    return str.includes('[object Object]') ? '' : str;
  }
  if (typeof accounts !== 'object') return '';

  // Check all known Telebirr key variants
  const telebirrVal =
    accounts.telebirr ??
    accounts.tele_birr ??
    accounts.tele;

  if (!telebirrVal) return '';

  // Handle string/number primitive (legacy format)
  if (typeof telebirrVal === 'string' || typeof telebirrVal === 'number') {
    const str = String(telebirrVal).trim();
    return str && str !== '[object Object]' ? str : '';
  }

  // Handle rich object format { accountNumber, isActive, ... }
  if (typeof telebirrVal === 'object') {
    if (telebirrVal.isActive === false) return '';
    const rawNum =
      telebirrVal.accountNumber ??
      telebirrVal.number ??
      telebirrVal.value ??
      telebirrVal.phone;
    if (rawNum != null) {
      const str = String(rawNum).trim();
      return str && str !== '[object Object]' ? str : '';
    }
  }

  return '';
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
      const pa =
        restaurant?.paymentAccounts || {
          telebirr: restaurant?.telebirr,
          cbeBirr: restaurant?.cbeBirr || restaurant?.cbe,
          awashBank: restaurant?.awashBank || restaurant?.awash,
          otherBank: restaurant?.otherBank,
        };
      const formatted = formatPaymentAccounts(pa);
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
    layoscanLogoImage = null,
    telebirrLogoImage = null,
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
    // 0. CONTAINER / BOX SLOTS (Background panels, bridge docks, cards)
    // ──────────────────────────────────────────────────────────────────────────
    if (type === 'container' || type === 'box') {
      const slotW = w || 600;
      const slotH = h || 200;
      const boxRadius = radius || 0;

      ctx.save();
      if (shadowColor && shadowBlur) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetY = shadowOffsetY;
      }

      if (bgColor) {
        ctx.fillStyle = bgColor;
        if (boxRadius > 0) {
          drawRoundRect(ctx, x, y, slotW, slotH, boxRadius);
        } else {
          ctx.beginPath();
          ctx.rect(x, y, slotW, slotH);
        }
        ctx.fill();
      }

      if (borderColor && borderWidth > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        if (boxRadius > 0) {
          drawRoundRect(ctx, x, y, slotW, slotH, boxRadius);
        } else {
          ctx.beginPath();
          ctx.rect(x, y, slotW, slotH);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. TEXT SLOTS
    // ──────────────────────────────────────────────────────────────────────────
    else if (type === 'text') {
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

    // ──────────────────────────────────────────────────────────────────────────
    // 6. TELEBIRR PAYMENT SLOT
    // Renders a vector Telebirr brand icon + phone number. Skips silently if no
    // Telebirr account is configured (no fallback text).
    // ──────────────────────────────────────────────────────────────────────────
    else if (type === 'telebirr') {
      const pa = restaurant?.paymentAccounts || {};
      // Resolve Telebirr number from all known key variants
      const telebirrVal = pa.telebirr ?? pa.tele_birr ?? pa.tele;
      let phoneNumber = null;

      if (telebirrVal) {
        if (typeof telebirrVal === 'string' || typeof telebirrVal === 'number') {
          const s = String(telebirrVal).trim();
          if (s && s !== '[object Object]') phoneNumber = s;
        } else if (typeof telebirrVal === 'object' && telebirrVal.isActive !== false) {
          const raw = telebirrVal.accountNumber ?? telebirrVal.number ?? telebirrVal.phone;
          if (raw != null) phoneNumber = String(raw).trim();
        }
      }
      // Fallback to top-level restaurant.telebirr
      if (!phoneNumber && restaurant?.telebirr) {
        phoneNumber = String(restaurant.telebirr).trim();
      }

      if (phoneNumber) {
        const slotW = w || 600;
        const slotH = h || 80;
        const centerX = x + slotW / 2;
        const centerY = y + slotH / 2;

        const iconSize = Math.max(48, Math.min(Math.round(slotH * 0.78), 86));
        const iconR = iconSize / 2;
        const fontStack = ensureEthiopicFont(slot.bodyFont || 'Inter, sans-serif');
        const fontSize = Math.max(22, Math.min(Math.round(slotH * 0.40), 40));

        // Measure text for centering
        ctx.font = `600 ${fontSize}px ${fontStack}`;
        const labelText = 'Telebirr  ';
        const labelW_tb = ctx.measureText(labelText).width;
        ctx.font = `700 ${Math.round(fontSize * 1.15)}px "Space Grotesk", monospace`;
        const numW = ctx.measureText(phoneNumber).width;

        const totalW = iconSize + 14 + labelW_tb + numW;
        let drawX = centerX - totalW / 2;

        // ── Telebirr Brand Logo / Icon ──
        if (telebirrLogoImage) {
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
          ctx.shadowBlur = 8;
          ctx.drawImage(telebirrLogoImage, drawX, centerY - iconR, iconSize, iconSize);
          ctx.restore();
        } else {
          // Fallback vector icon if image not available
          ctx.save();
          ctx.shadowColor = 'rgba(11, 147, 213, 0.28)';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(drawX + iconR, centerY, iconR, 0, Math.PI * 2);
          ctx.fillStyle = '#0B93D5';
          ctx.fill();
          ctx.restore();

          // "T" inside icon
          ctx.save();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `900 ${Math.round(iconSize * 0.56)}px "Space Grotesk", Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('T', drawX + iconR, centerY + 1);
          ctx.restore();
        }

        drawX += iconSize + 14;

        // ── "Telebirr" label ──
        ctx.save();
        const labelCol = slot.labelColor || (color && getRelativeLuminance(color) < 0.4 ? '#94A3B8' : '#64748B');
        ctx.fillStyle = labelCol;
        ctx.font = `600 ${fontSize}px ${fontStack}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, drawX, centerY);
        ctx.restore();

        // ── Phone number ──
        ctx.save();
        ctx.fillStyle = slot.numberColor || color || '#111827';
        ctx.font = `700 ${Math.round(fontSize * 1.15)}px "Space Grotesk", monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(phoneNumber, drawX + labelW_tb, centerY);
        ctx.restore();
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. LAYOSCAN TRADEMARK SLOT
    // Renders the LayoScan logo + per-design creative typography treatment.
    // Each archetype has a unique trademarkStyle: { prefix, suffix, textColor,
    // font, weight, italic, letterSpacing, uppercase, bgPill, bgColor,
    // borderColor, showLines, lineColor, subtext, subtextColor }
    // ──────────────────────────────────────────────────────────────────────────
    else if (type === 'trademark') {
      const ts = slot.trademarkStyle || {};
      const slotW = w || 600;
      const slotH = h || 80;
      const centerX = x + slotW / 2;
      const centerY = y + slotH / 2;

      const textColor = ts.textColor || color || '#18181B';
      const fontFamily = ensureEthiopicFont(ts.font || 'Inter, sans-serif');
      const fontWeight = ts.weight || 700;
      const fontItalic = ts.italic ? 'italic ' : '';
      const fontLetterSpacing = ts.letterSpacing || 0;
      const hasSubtext = Boolean(ts.subtext);

      const logoSize = Math.max(38, Math.min(Math.round(slotH * 0.62), 70));
      const fontSize = Math.max(22, Math.min(Math.round(slotH * (hasSubtext ? 0.38 : 0.46)), 40));
      const subtextSize = Math.max(14, Math.round(fontSize * 0.60));

      // Vertical anchor: if subtext, shift main line up
      const mainLineY = hasSubtext ? centerY - subtextSize * 0.65 : centerY;

      // ── Measure content for horizontal centering ──
      const prefix = ts.prefix ? `${ts.prefix}  ` : '';
      const suffix = ts.suffix ? `  ${ts.suffix}` : '';
      const brandName = ts.uppercase ? 'LAYOSCAN' : 'LayoScan';

      ctx.save();
      ctx.font = `${fontItalic}${fontWeight} ${fontSize}px ${fontFamily}`;
      const prefixW = prefix ? ctx.measureText(prefix).width : 0;
      const brandW = ctx.measureText(brandName).width + (fontLetterSpacing * (brandName.length - 1));
      const suffixW = suffix ? ctx.measureText(suffix).width : 0;
      ctx.restore();

      const hasLogo = Boolean(layoscanLogoImage);
      const logoRenderSize = hasLogo ? logoSize : 0;
      const logoGap = hasLogo ? 12 : 0;

      const totalContentW = logoRenderSize + logoGap + prefixW + brandW + suffixW;
      let drawX = centerX - totalContentW / 2;

      // ── Optional background pill (wraps content with aesthetic padding) ──
      if (ts.bgPill) {
        ctx.save();
        const pillH = slotH - 4;
        const pillRadius = pillH / 2;
        const pillW = Math.min(slotW, totalContentW + 56);
        const pillX = centerX - pillW / 2;
        if (ts.bgColor) {
          ctx.fillStyle = ts.bgColor;
          drawRoundRect(ctx, pillX, y + 2, pillW, pillH, pillRadius);
          ctx.fill();
        }
        if (ts.borderColor) {
          ctx.strokeStyle = ts.borderColor;
          ctx.lineWidth = 1.5;
          drawRoundRect(ctx, pillX, y + 2, pillW, pillH, pillRadius);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── Flanking horizontal rules ──
      if (ts.showLines) {
        const ruleColor = ts.lineColor || `${textColor}60`;
        const gap = 16;
        ctx.save();
        ctx.strokeStyle = ruleColor;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        // Left rule
        if (drawX - gap - x > 20) {
          ctx.beginPath();
          ctx.moveTo(x + 12, mainLineY);
          ctx.lineTo(drawX - gap, mainLineY);
          ctx.stroke();
        }
        // Right rule
        const rightEdge = drawX + totalContentW + gap;
        if (x + slotW - rightEdge > 20) {
          ctx.beginPath();
          ctx.moveTo(rightEdge, mainLineY);
          ctx.lineTo(x + slotW - 12, mainLineY);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── LayoScan logo image ──
      if (hasLogo) {
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const logoTopY = mainLineY - logoRenderSize / 2;
        ctx.drawImage(layoscanLogoImage, drawX, logoTopY, logoRenderSize, logoRenderSize);
        ctx.restore();
        drawX += logoRenderSize + logoGap;
      }

      // ── Prefix ──
      if (prefix) {
        ctx.save();
        ctx.fillStyle = textColor;
        ctx.font = `${fontItalic}${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(prefix, drawX, mainLineY);
        ctx.restore();
        drawX += prefixW;
      }

      // ── "LayoScan" brand name ──
      ctx.save();
      ctx.fillStyle = textColor;
      ctx.font = `${fontItalic}${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      if (fontLetterSpacing > 0) {
        // Manual letter-spacing for canvas
        let lx = drawX;
        for (const char of brandName) {
          ctx.fillText(char, lx, mainLineY);
          lx += ctx.measureText(char).width + fontLetterSpacing;
        }
      } else {
        ctx.fillText(brandName, drawX, mainLineY);
      }
      ctx.restore();
      drawX += brandW;

      // ── Suffix ──
      if (suffix) {
        ctx.save();
        ctx.fillStyle = textColor;
        ctx.font = `${fontItalic}${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(suffix, drawX, mainLineY);
        ctx.restore();
      }

      // ── Subtext (secondary line) ──
      if (hasSubtext) {
        ctx.save();
        const stColor = ts.subtextColor || `${textColor}88`;
        ctx.fillStyle = stColor;
        ctx.font = `500 ${subtextSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(ts.subtext, centerX, mainLineY + fontSize * 0.62);
        ctx.restore();
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 8. DYNAMIC MENU GRID SPREAD (Menu Board Poster A4 format)
    // ──────────────────────────────────────────────────────────────────────────
    else if (type === 'menu_grid') {
      const menu = getMenuForCard({
        restaurant,
        categories: data.menuData?.categories || restaurant?.categories || [],
        products: data.menuData?.products || restaurant?.products || [],
      });

      const categories = menu?.categories || [];
      const currency = menu?.currency || slot.currency || 'Br';

      const slotW = w || 1454;
      const slotH = h || 1384;

      const hFont = ensureEthiopicFont(slot.headerFont || '700 40px "Playfair Display", Georgia, serif');
      const iFont = ensureEthiopicFont(slot.itemFont || '700 26px "Playfair Display", Georgia, serif');
      const pFont = slot.priceFont || '800 26px "Space Grotesk", monospace';

      const col1X = slot.col1X ?? (x + 10);
      const col2X = slot.col2X ?? (x + slotW / 2 + 30);
      const colWidth = slot.colWidth ?? (slotW / 2 - 40);
      const startY = slot.startY ?? y;
      const endY = slot.endY ?? (y + slotH);

      ctx.save();

      // Render 2-column menu layout
      drawDynamicMenuGrid(ctx, {
        categories,
        currency,
        col1X,
        col2X,
        colWidth,
        startY,
        endY,
        theme: slot.theme || (color && getRelativeLuminance(color) > 0.5 ? 'dark' : 'light'),
        accentColor: slot.accentColor || color || '#1B382B',
        titleColor: slot.titleColor || color || '#18181B',
        bodyColor: slot.bodyColor || slot.labelColor || '#64748B',
        priceColor: slot.priceColor || slot.accentColor || color || '#1B382B',
        headerFont: hFont,
        itemFont: iFont,
        priceFont: pFont,
        priceStyle: slot.priceStyle || 'dots',
        showDivider: slot.showDivider ?? true,
        dividerColor: slot.dividerColor || slot.accentColor || 'rgba(0,0,0,0.15)',
      });

      // Subtle vertical center divider between column 1 and column 2
      if (slot.showCenterDivider !== false && categories.length > 1) {
        const dividerX = Math.round((col1X + colWidth + col2X) / 2);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(dividerX, startY + 16);
        ctx.lineTo(dividerX, endY - 16);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = slot.dividerColor || (slot.theme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)');
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }

    ctx.restore();
  }
}
