/**
 * Dynamic typography fitting and WCAG 2.1 luminance/contrast analysis for card rendering.
 * Guarantees text fits within slot bounding boxes without overflow, wrapping or truncating cleanly.
 */

/**
 * Parses a hex color string into [r, g, b] (0..255).
 *
 * @param {string} hex - e.g. '#FFF', '#1B382B', 'rgba(0,0,0,0.5)'
 * @returns {[number, number, number]}
 */
export function parseColorToRgb(hex) {
  if (typeof hex !== 'string') return [0, 0, 0];
  const str = hex.trim();

  if (str.startsWith('#')) {
    const raw = str.slice(1);
    if (raw.length === 3) {
      return [
        parseInt(raw[0] + raw[0], 16),
        parseInt(raw[1] + raw[1], 16),
        parseInt(raw[2] + raw[2], 16),
      ];
    }
    if (raw.length >= 6) {
      return [
        parseInt(raw.slice(0, 2), 16),
        parseInt(raw.slice(2, 4), 16),
        parseInt(raw.slice(4, 6), 16),
      ];
    }
  }

  const rgbMatch = str.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)];
  }

  // Fallback
  return [0, 0, 0];
}

/**
 * Computes standard WCAG relative luminance from an sRGB component (0..255).
 */
function sRgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Computes WCAG 2.1 relative luminance for a color [r, g, b] or hex.
 * Range: 0.0 (darkest black) to 1.0 (lightest white).
 *
 * @param {string|[number, number, number]} color
 * @returns {number}
 */
export function getRelativeLuminance(color) {
  if (typeof color === 'number') {
    return Math.max(0, Math.min(1, color));
  }
  const [r, g, b] = Array.isArray(color) ? color : parseColorToRgb(color);
  return 0.2126 * sRgbToLinear(r) + 0.7152 * sRgbToLinear(g) + 0.0722 * sRgbToLinear(b);
}

/**
 * Computes the WCAG contrast ratio between two colors or luminance values.
 * Result ranges from 1.0 (no contrast) to 21.0 (black vs white).
 *
 * @param {string|number} colorA
 * @param {string|number} colorB
 * @returns {number}
 */
export function contrastRatio(colorA, colorB) {
  const lumA = typeof colorA === 'number' ? colorA : getRelativeLuminance(colorA);
  const lumB = typeof colorB === 'number' ? colorB : getRelativeLuminance(colorB);

  const l1 = Math.max(lumA, lumB);
  const l2 = Math.min(lumA, lumB);

  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Samples the average background luminance beneath a bounding box on the canvas.
 * Wrapped in try/catch to safely handle cross-origin tainted canvas situations without throwing.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Box X
 * @param {number} y - Box Y
 * @param {number} w - Box width
 * @param {number} h - Box height
 * @returns {number} Average luminance 0..1 (defaults to 0.5 on error/taint)
 */
export function sampleBackgroundLuminance(ctx, x, y, w, h) {
  if (!ctx || !ctx.getImageData || w <= 0 || h <= 0) {
    return 0.5;
  }

  try {
    const startX = Math.max(0, Math.floor(x));
    const startY = Math.max(0, Math.floor(y));
    const sampleW = Math.max(1, Math.min(Math.floor(w), ctx.canvas?.width - startX || 100));
    const sampleH = Math.max(1, Math.min(Math.floor(h), ctx.canvas?.height - startY || 100));

    // Sample across a grid for high performance on multi-megapixel print canvases
    const stepX = Math.max(1, Math.floor(sampleW / 12));
    const stepY = Math.max(1, Math.floor(sampleH / 12));

    const imgData = ctx.getImageData(startX, startY, sampleW, sampleH);
    const data = imgData.data;

    let totalLum = 0;
    let count = 0;

    for (let py = 0; py < sampleH; py += stepY) {
      for (let px = 0; px < sampleW; px += stepX) {
        const idx = (py * sampleW + px) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3] / 255;

        // If alpha is blended, blend with white
        const blendedR = Math.round(r * a + 255 * (1 - a));
        const blendedG = Math.round(g * a + 255 * (1 - a));
        const blendedB = Math.round(b * a + 255 * (1 - a));

        totalLum += getRelativeLuminance([blendedR, blendedG, blendedB]);
        count++;
      }
    }

    return count > 0 ? totalLum / count : 0.5;
  } catch (err) {
    // Cross-origin image or security error — fail silently and gracefully
    return 0.5;
  }
}

/**
 * Measures text width honoring optional letterSpacing.
 */
function measureTextWithSpacing(ctx, text, letterSpacing = 0) {
  if (!text) return 0;
  const baseWidth = ctx.measureText ? ctx.measureText(text).width : text.length * 10;
  return baseWidth + (text.length > 1 ? (text.length - 1) * letterSpacing : 0);
}

/**
 * Builds standard CSS font declaration string.
 */
function buildFontString({ font, weight = 400, italic = false, size }) {
  const style = italic ? 'italic ' : '';
  return `${style}${weight} ${Math.round(size)}px ${font}`;
}

/**
 * Fits a string into a bounded box width, stepping down font size in 1px increments,
 * and truncating with ellipsis (…) if it still overflows at minFontPx.
 *
 * @param {CanvasRenderingContext2D} ctx - 2D canvas context
 * @param {string} rawText - Input string
 * @param {Object} options - Typography and bounding options
 * @returns {{
 *   lines: string[],
 *   fontSize: number,
 *   lineHeightPx: number,
 *   totalHeight: number,
 *   fontString: string
 * }}
 */
export function fitText(ctx, rawText, options = {}) {
  const {
    w = 600,
    maxFontPx = 48,
    minFontPx = 20,
    font = 'Inter, sans-serif',
    weight = 400,
    italic = false,
    letterSpacing = 0,
    uppercase = false,
    maxLines = 1,
    lineHeight = 1.2,
  } = options;

  let text = String(rawText || '').trim();
  if (uppercase) {
    text = text.toUpperCase();
  }

  if (!text) {
    return {
      lines: [],
      fontSize: maxFontPx,
      lineHeightPx: maxFontPx * lineHeight,
      totalHeight: 0,
      fontString: buildFontString({ font, weight, italic, size: maxFontPx }),
    };
  }

  // 1. Single Line Path
  if (maxLines <= 1) {
    let chosenSize = maxFontPx;

    while (chosenSize >= minFontPx) {
      ctx.font = buildFontString({ font, weight, italic, size: chosenSize });
      const currentWidth = measureTextWithSpacing(ctx, text, letterSpacing);
      if (currentWidth <= w) {
        return {
          lines: [text],
          fontSize: chosenSize,
          lineHeightPx: chosenSize * lineHeight,
          totalHeight: chosenSize * lineHeight,
          fontString: ctx.font,
        };
      }
      chosenSize--;
    }

    // At minFontPx, string still overflows: truncate with ellipsis (…)
    chosenSize = minFontPx;
    ctx.font = buildFontString({ font, weight, italic, size: chosenSize });

    let truncated = text;
    while (truncated.length > 0) {
      const candidate = `${truncated.trim()}…`;
      if (measureTextWithSpacing(ctx, candidate, letterSpacing) <= w) {
        return {
          lines: [candidate],
          fontSize: chosenSize,
          lineHeightPx: chosenSize * lineHeight,
          totalHeight: chosenSize * lineHeight,
          fontString: ctx.font,
        };
      }
      truncated = truncated.slice(0, -1);
    }

    return {
      lines: ['…'],
      fontSize: chosenSize,
      lineHeightPx: chosenSize * lineHeight,
      totalHeight: chosenSize * lineHeight,
      fontString: ctx.font,
    };
  }

  // 2. Multi-line wrapping path (e.g. descriptions, multi-line headers)
  let chosenSize = maxFontPx;
  const words = text.split(/\s+/);

  while (chosenSize >= minFontPx) {
    ctx.font = buildFontString({ font, weight, italic, size: chosenSize });
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (measureTextWithSpacing(ctx, testLine, letterSpacing) <= w) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    if (lines.length <= maxLines) {
      return {
        lines,
        fontSize: chosenSize,
        lineHeightPx: chosenSize * lineHeight,
        totalHeight: lines.length * chosenSize * lineHeight,
        fontString: ctx.font,
      };
    }

    chosenSize--;
  }

  // Force wrap to maxLines at minFontPx with ellipsis truncation on final line
  chosenSize = minFontPx;
  ctx.font = buildFontString({ font, weight, italic, size: chosenSize });

  const lines = [];
  let currentLine = '';
  let wordIndex = 0;

  for (; wordIndex < words.length; wordIndex++) {
    const word = words[wordIndex];
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (measureTextWithSpacing(ctx, testLine, letterSpacing) <= w) {
      currentLine = testLine;
    } else {
      if (lines.length + 1 === maxLines) {
        // This is the last line permitted — truncate remainder with ellipsis
        let candidate = currentLine;
        while (candidate.length > 0) {
          const test = `${candidate.trim()}…`;
          if (measureTextWithSpacing(ctx, test, letterSpacing) <= w) {
            currentLine = test;
            break;
          }
          candidate = candidate.slice(0, -1);
        }
        lines.push(currentLine);
        currentLine = '';
        break;
      }
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return {
    lines,
    fontSize: chosenSize,
    lineHeightPx: chosenSize * lineHeight,
    totalHeight: lines.length * chosenSize * lineHeight,
    fontString: ctx.font,
  };
}
