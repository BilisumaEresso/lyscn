/**
 * Safe, cross-platform rounded rectangle drawing utility and polyfill for CanvasRenderingContext2D.
 * Prevents crashes on older Android / WebKit browsers lacking native ctx.roundRect.
 */

/**
 * Normalizes radii input to [topLeft, topRight, bottomRight, bottomLeft]
 * and clamps to prevent overlapping corner arcs.
 *
 * @param {number|number[]} radii - Radius value or array of 1, 2, or 4 corner values
 * @param {number} width - Box width
 * @param {number} height - Box height
 * @returns {[number, number, number, number]} [tl, tr, br, bl]
 */
export function normalizeRadii(radii, width = 0, height = 0) {
  let tl = 0;
  let tr = 0;
  let br = 0;
  let bl = 0;

  if (typeof radii === 'number') {
    tl = tr = br = bl = Math.max(0, radii);
  } else if (Array.isArray(radii)) {
    if (radii.length === 1) {
      tl = tr = br = bl = Math.max(0, radii[0]);
    } else if (radii.length === 2) {
      tl = br = Math.max(0, radii[0]);
      tr = bl = Math.max(0, radii[1]);
    } else if (radii.length >= 4) {
      tl = Math.max(0, radii[0]);
      tr = Math.max(0, radii[1]);
      br = Math.max(0, radii[2]);
      bl = Math.max(0, radii[3]);
    } else if (radii.length === 3) {
      tl = Math.max(0, radii[0]);
      tr = bl = Math.max(0, radii[1]);
      br = Math.max(0, radii[2]);
    }
  }

  // Clamp radii if they exceed dimensions
  if (width > 0 && height > 0) {
    const maxTop = tl + tr;
    if (maxTop > width && maxTop > 0) {
      const scale = width / maxTop;
      tl *= scale;
      tr *= scale;
    }
    const maxBottom = bl + br;
    if (maxBottom > width && maxBottom > 0) {
      const scale = width / maxBottom;
      bl *= scale;
      br *= scale;
    }
    const maxLeft = tl + bl;
    if (maxLeft > height && maxLeft > 0) {
      const scale = height / maxLeft;
      tl *= scale;
      bl *= scale;
    }
    const maxRight = tr + br;
    if (maxRight > height && maxRight > 0) {
      const scale = height / maxRight;
      tr *= scale;
      br *= scale;
    }
  }

  return [tl, tr, br, bl];
}

/**
 * Constructs a rounded rectangle path on the given 2D context using arcTo.
 * Completely immune to platform-specific roundRect bugs.
 *
 * @param {CanvasRenderingContext2D} ctx - Target 2D rendering context
 * @param {number} x - Left coordinate
 * @param {number} y - Top coordinate
 * @param {number} width - Box width
 * @param {number} height - Box height
 * @param {number|number[]} [radii=0] - Corner radii
 */
export function drawRoundRect(ctx, x, y, width, height, radii = 0) {
  if (!ctx) return;

  const [tl, tr, br, bl] = normalizeRadii(radii, width, height);

  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + width - tr, y);
  ctx.arcTo(x + width, y, x + width, y + tr, tr);
  ctx.lineTo(x + width, y + height - br);
  ctx.arcTo(x + width, y + height, x + width - br, y + height, br);
  ctx.lineTo(x + bl, y + height);
  ctx.arcTo(x, y + height, x, y + height - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

/**
 * Fills a rounded rectangle with the current or supplied fillStyle.
 */
export function fillRoundRect(ctx, x, y, width, height, radii = 0, fillStyle = null) {
  if (!ctx) return;
  ctx.save();
  if (fillStyle) ctx.fillStyle = fillStyle;
  drawRoundRect(ctx, x, y, width, height, radii);
  ctx.fill();
  ctx.restore();
}

/**
 * Strokes a rounded rectangle with the current or supplied stroke parameters.
 */
export function strokeRoundRect(ctx, x, y, width, height, radii = 0, strokeStyle = null, lineWidth = 1) {
  if (!ctx) return;
  ctx.save();
  if (strokeStyle) ctx.strokeStyle = strokeStyle;
  if (lineWidth) ctx.lineWidth = lineWidth;
  drawRoundRect(ctx, x, y, width, height, radii);
  ctx.stroke();
  ctx.restore();
}

// Polyfill native CanvasRenderingContext2D.prototype.roundRect if missing in environment
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    drawRoundRect(this, x, y, w, h, radii);
    return this;
  };
}
