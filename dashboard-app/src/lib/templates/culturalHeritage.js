import {
  drawPillBadge,
  drawThemedCodeBadge,
  drawImageCover,
  drawStepFlowNodes,
  drawLayoScanFooter,
  formatTableCode,
} from '../canvasHelpers';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEMPLATE 5: HABESHA HERITAGE (Authentic Cultural Dining & Ethiopian Heritage)
 * ─────────────────────────────────────────────────────────────────────────────
 * Inspired by traditional Ethiopian Brana (ብራና) goatskin parchment manuscripts,
 * authentic Habesha Tibeb (ጥበብ) woven textile borders, sacred Lalibela & Gondar
 * cross rosettes (መስቀል), and iconic Mesob (መሶብ) and Jebena (ጀበና) dining heritage.
 */

// Authentic Ethiopian Cultural Palette
const ETH_BURGUNDY = '#781812';   // Deep Royal Crimson / Maroon (ደማቅ ቀይ / ሮያል)
const ETH_GOLD     = '#DCA438';   // Ethiopian Imperial Gold (ወርቅ)
const ETH_GOLD_DARK= '#B5811E';   // Deep Antique Ochre Gold
const ETH_UMBER    = '#2D1509';   // Dark Aged Earth / Leather Bindings
const ETH_GREEN    = '#1B4D2E';   // Highland Emerald Green (አረንጓዴ)
const ETH_CREAM    = '#FAF3E3';   // Pure Cotton Ivory (ጥጥ ነጭ)
const ETH_PARCHMENT= '#F7EBD2';   // Warm Aged Parchment (ብራና)

/**
 * Renders an authentic Ethiopian Brana (ብራና) aged parchment texture
 */
export function drawBranaParchmentBackground(ctx, width, height) {
  // 1. Base organic parchment gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#FAF3E5');
  bgGrad.addColorStop(0.3, '#F5EBDA');
  bgGrad.addColorStop(0.7, '#EFE0C9');
  bgGrad.addColorStop(1, '#E4D0B3');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Antique Vignette (Darkening towards parchment edges)
  const outerVignette = ctx.createRadialGradient(
    width / 2, height / 2, width * 0.35,
    width / 2, height / 2, width * 0.78
  );
  outerVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  outerVignette.addColorStop(0.65, 'rgba(75, 35, 12, 0.05)');
  outerVignette.addColorStop(1, 'rgba(50, 20, 5, 0.22)');
  ctx.fillStyle = outerVignette;
  ctx.fillRect(0, 0, width, height);

  // 3. Subtle tactile goatskin parchment stippling (deterministic micro-grain)
  ctx.save();
  ctx.fillStyle = 'rgba(75, 40, 15, 0.035)';
  for (let y = 15; y < height; y += 42) {
    for (let x = 15; x < width; x += 42) {
      const offset = ((x * 13 + y * 29) % 19) - 9;
      ctx.fillRect(x + offset, y + offset, 2.5, 2.5);
    }
  }
  ctx.restore();
}

/**
 * Draws an authentic Ethiopian Tibeb (ጥልፍ / ጥበብ) geometric woven border.
 * Features traditional interlocking diamond crosses (መስቀል motifs),
 * chevron triangles in gold, burgundy, and emerald, and braided boundary rules.
 * 
 * Mathematically partitioned:
 * - Top horizontal strip
 * - Bottom horizontal strip
 * - Left vertical strip (direct Y-mapping, ZERO rotation coordinate bug!)
 * - Right vertical strip (direct Y-mapping, ZERO right overflow!)
 * - 4 Traditional corner medallions with Ethiopian cross rosettes
 * - Inner parchment hairline with ornamental corner knots
 */
export function drawAuthenticTibebBorder(ctx, x, y, w, h, thickness = 34) {
  ctx.save();

  // ── Helper: Draw Horizontal Tibeb Strip ─────────────────────────────
  const drawHorizontalStrip = (sx, sy, len) => {
    ctx.save();
    // 1. Dark umber leather outer bounding rails
    ctx.fillStyle = ETH_UMBER;
    ctx.fillRect(sx, sy, len, 3);
    ctx.fillRect(sx, sy + thickness - 3, len, 3);

    // 2. Inner gold braided pinstripes
    ctx.fillStyle = ETH_GOLD;
    ctx.fillRect(sx, sy + 3, len, 2);
    ctx.fillRect(sx, sy + thickness - 5, len, 2);

    // 3. Band core background (warm ivory textile)
    ctx.fillStyle = ETH_CREAM;
    ctx.fillRect(sx, sy + 5, len, thickness - 10);

    // 4. Repeating geometric diamond and cross weave
    const unitSize = 32;
    const count = Math.floor(len / unitSize);
    const startX = sx + (len - count * unitSize) / 2;

    for (let i = 0; i < count; i++) {
      const bx = startX + i * unitSize;
      const cy = sy + thickness / 2;

      // Outer diamond (Burgundy)
      ctx.beginPath();
      ctx.moveTo(bx + unitSize / 2, cy - 8.5);
      ctx.lineTo(bx + unitSize - 3, cy);
      ctx.lineTo(bx + unitSize / 2, cy + 8.5);
      ctx.lineTo(bx + 3, cy);
      ctx.closePath();
      ctx.fillStyle = ETH_BURGUNDY;
      ctx.fill();

      // Middle diamond (Alternating Gold & Highland Emerald)
      const isAlt = i % 2 === 0;
      ctx.beginPath();
      ctx.moveTo(bx + unitSize / 2, cy - 5);
      ctx.lineTo(bx + unitSize - 7, cy);
      ctx.lineTo(bx + unitSize / 2, cy + 5);
      ctx.lineTo(bx + 7, cy);
      ctx.closePath();
      ctx.fillStyle = isAlt ? ETH_GOLD : ETH_GREEN;
      ctx.fill();

      // Central core dot (Ivory)
      ctx.beginPath();
      ctx.arc(bx + unitSize / 2, cy, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = ETH_CREAM;
      ctx.fill();

      // Top & bottom flanking chevron triangles (Gold)
      ctx.fillStyle = ETH_GOLD;
      ctx.beginPath();
      ctx.moveTo(bx + 3, sy + 5);
      ctx.lineTo(bx + 8, sy + 10);
      ctx.lineTo(bx + 13, sy + 5);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(bx + 3, sy + thickness - 5);
      ctx.lineTo(bx + 8, sy + thickness - 10);
      ctx.lineTo(bx + 13, sy + thickness - 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  // ── Helper: Draw Vertical Tibeb Strip (Pure direct mapping — zero rotation bug!) ──
  const drawVerticalStrip = (sx, sy, len) => {
    ctx.save();
    // 1. Dark umber leather outer bounding rails
    ctx.fillStyle = ETH_UMBER;
    ctx.fillRect(sx, sy, 3, len);
    ctx.fillRect(sx + thickness - 3, sy, 3, len);

    // 2. Inner gold braided pinstripes
    ctx.fillStyle = ETH_GOLD;
    ctx.fillRect(sx + 3, sy, 2, len);
    ctx.fillRect(sx + thickness - 5, sy, 2, len);

    // 3. Band core background (warm ivory textile)
    ctx.fillStyle = ETH_CREAM;
    ctx.fillRect(sx + 5, sy, thickness - 10, len);

    // 4. Repeating geometric diamond and cross weave along Y
    const unitSize = 32;
    const count = Math.floor(len / unitSize);
    const startY = sy + (len - count * unitSize) / 2;

    for (let i = 0; i < count; i++) {
      const by = startY + i * unitSize;
      const cx = sx + thickness / 2;

      // Outer diamond (Burgundy)
      ctx.beginPath();
      ctx.moveTo(cx, by + 3);
      ctx.lineTo(cx + 8.5, by + unitSize / 2);
      ctx.lineTo(cx, by + unitSize - 3);
      ctx.lineTo(cx - 8.5, by + unitSize / 2);
      ctx.closePath();
      ctx.fillStyle = ETH_BURGUNDY;
      ctx.fill();

      // Middle diamond (Alternating Gold & Highland Emerald)
      const isAlt = i % 2 === 0;
      ctx.beginPath();
      ctx.moveTo(cx, by + 7);
      ctx.lineTo(cx + 5, by + unitSize / 2);
      ctx.lineTo(cx, by + unitSize - 7);
      ctx.lineTo(cx - 5, by + unitSize / 2);
      ctx.closePath();
      ctx.fillStyle = isAlt ? ETH_GOLD : ETH_GREEN;
      ctx.fill();

      // Central core dot (Ivory)
      ctx.beginPath();
      ctx.arc(cx, by + unitSize / 2, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = ETH_CREAM;
      ctx.fill();

      // Left & right flanking chevron triangles (Gold)
      ctx.fillStyle = ETH_GOLD;
      ctx.beginPath();
      ctx.moveTo(sx + 5, by + 3);
      ctx.lineTo(sx + 10, by + 8);
      ctx.lineTo(sx + 5, by + 13);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(sx + thickness - 5, by + 3);
      ctx.lineTo(sx + thickness - 10, by + 8);
      ctx.lineTo(sx + thickness - 5, by + 13);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  // ── Helper: Draw Corner Medallion (Ethiopian Cross) ─────────────────
  const drawCornerMedallion = (cx, cy) => {
    ctx.save();
    ctx.translate(cx, cy);

    // Umber square block
    ctx.fillStyle = ETH_UMBER;
    ctx.fillRect(-thickness / 2, -thickness / 2, thickness, thickness);

    // Gold diamond
    ctx.beginPath();
    ctx.moveTo(0, -thickness / 2 + 3);
    ctx.lineTo(thickness / 2 - 3, 0);
    ctx.lineTo(0, thickness / 2 - 3);
    ctx.lineTo(-thickness / 2 + 3, 0);
    ctx.closePath();
    ctx.fillStyle = ETH_GOLD;
    ctx.fill();

    // Central burgundy cross
    ctx.beginPath();
    ctx.moveTo(0, -thickness * 0.28);
    ctx.lineTo(0, thickness * 0.28);
    ctx.moveTo(-thickness * 0.28, 0);
    ctx.lineTo(thickness * 0.28, 0);
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = ETH_BURGUNDY;
    ctx.stroke();

    // Center gold/cream dot
    ctx.beginPath();
    ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = ETH_CREAM;
    ctx.fill();

    ctx.restore();
  };

  // 1. Draw 4 perimeter strips (strictly contained between corner squares)
  drawHorizontalStrip(x + thickness, y, w - 2 * thickness);                         // Top
  drawHorizontalStrip(x + thickness, y + h - thickness, w - 2 * thickness);         // Bottom
  drawVerticalStrip(x, y + thickness, h - 2 * thickness);                          // Left
  drawVerticalStrip(x + w - thickness, y + thickness, h - 2 * thickness);          // Right (ZERO overflow!)

  // 2. Draw 4 Corner Medallions
  drawCornerMedallion(x + thickness / 2, y + thickness / 2);
  drawCornerMedallion(x + w - thickness / 2, y + thickness / 2);
  drawCornerMedallion(x + w - thickness / 2, y + h - thickness / 2);
  drawCornerMedallion(x + thickness / 2, y + h - thickness / 2);

  // 3. Delicate inner parchment framing hairline with ornamental corner knots
  const innerInset = thickness + 12;
  const ix = x + innerInset;
  const iy = y + innerInset;
  const iw = w - innerInset * 2;
  const ih = h - innerInset * 2;

  ctx.beginPath();
  ctx.rect(ix, iy, iw, ih);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(120, 24, 18, 0.45)';
  ctx.stroke();

  // Corner ornamental Ge'ez cross flourishes at the 4 inner corners
  const drawCornerFlourish = (fx, fy, angle) => {
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(angle);
    ctx.fillStyle = ETH_BURGUNDY;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(12, 0);
    ctx.lineTo(0, 12);
    ctx.closePath();
    ctx.fillStyle = ETH_GOLD;
    ctx.fill();
    ctx.restore();
  };

  drawCornerFlourish(ix, iy, 0);
  drawCornerFlourish(ix + iw, iy, Math.PI / 2);
  drawCornerFlourish(ix + iw, iy + ih, Math.PI);
  drawCornerFlourish(ix, iy + ih, (3 * Math.PI) / 2);

  ctx.restore();
}

/**
 * Authentic Ethiopian Ethnic Cross Rosette Motif (Inspired by Reference Image 3)
 * Traditional Ethiopian sacred cross with 4 flared stepped arms, center diamond, and sunburst rays.
 */
export function drawEthiopianCrossRosette(ctx, cx, cy, size = 100) {
  ctx.save();
  ctx.translate(cx, cy);

  const half = size / 2;
  const burgundy = ETH_BURGUNDY;
  const gold = ETH_GOLD;
  const green = ETH_GREEN;
  const umber = ETH_UMBER;

  // 1. Center diamond core
  const coreR = size * 0.16;
  ctx.beginPath();
  ctx.moveTo(0, -coreR);
  ctx.lineTo(coreR, 0);
  ctx.lineTo(0, coreR);
  ctx.lineTo(-coreR, 0);
  ctx.closePath();
  ctx.fillStyle = gold;
  ctx.fill();
  ctx.lineWidth = size * 0.02;
  ctx.strokeStyle = umber;
  ctx.stroke();

  // Mini cross inside core
  ctx.beginPath();
  ctx.moveTo(0, -coreR * 0.55);
  ctx.lineTo(0, coreR * 0.55);
  ctx.moveTo(-coreR * 0.55, 0);
  ctx.lineTo(coreR * 0.55, 0);
  ctx.lineWidth = size * 0.035;
  ctx.strokeStyle = burgundy;
  ctx.stroke();

  // 2. 4 Radiating Flared Cross Arms
  for (let rot = 0; rot < 4; rot++) {
    ctx.save();
    ctx.rotate((rot * Math.PI) / 2);

    const armBaseY = -coreR;
    const armEndY = -half * 0.88;
    const armTopW = size * 0.22;
    const armMidW = size * 0.14;

    // Outer tapered cross arm in burgundy
    ctx.beginPath();
    ctx.moveTo(-size * 0.06, armBaseY);
    ctx.lineTo(-armMidW / 2, (armBaseY + armEndY) / 2);
    ctx.lineTo(-armTopW / 2, armEndY);
    ctx.lineTo(0, -half);
    ctx.lineTo(armTopW / 2, armEndY);
    ctx.lineTo(armMidW / 2, (armBaseY + armEndY) / 2);
    ctx.lineTo(size * 0.06, armBaseY);
    ctx.closePath();
    ctx.fillStyle = burgundy;
    ctx.fill();
    ctx.lineWidth = size * 0.022;
    ctx.strokeStyle = umber;
    ctx.stroke();

    // Inner stepped chevron in gold
    ctx.beginPath();
    ctx.moveTo(0, armBaseY - 4);
    ctx.lineTo(-armMidW * 0.35, (armBaseY + armEndY) * 0.52);
    ctx.lineTo(0, armEndY + 4);
    ctx.lineTo(armMidW * 0.35, (armBaseY + armEndY) * 0.52);
    ctx.closePath();
    ctx.fillStyle = gold;
    ctx.fill();

    // End cross finial dot
    ctx.beginPath();
    ctx.arc(0, -half - size * 0.035, size * 0.032, 0, Math.PI * 2);
    ctx.fillStyle = gold;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = umber;
    ctx.stroke();

    // Side diagonal sunbeam leaves (45 degrees)
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, -coreR * 1.1);
    ctx.bezierCurveTo(-size * 0.065, -half * 0.45, -size * 0.045, -half * 0.65, 0, -half * 0.72);
    ctx.bezierCurveTo(size * 0.045, -half * 0.65, size * 0.065, -half * 0.45, 0, -coreR * 1.1);
    ctx.closePath();
    ctx.fillStyle = green;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = gold;
    ctx.stroke();

    // Mini gold dot at leaf tip
    ctx.beginPath();
    ctx.arc(0, -half * 0.76, size * 0.025, 0, Math.PI * 2);
    ctx.fillStyle = gold;
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Traditional Woven Straw Ethiopian Mesob (መሶብ) Basket (Inspired by Reference Images 1 & 2)
 * Features traditional flared foot pedestal, woven straw belly, conical stepped lid, and spherical top knob.
 */
export function drawTraditionalMesobBasket(ctx, cx, cy, size = 120) {
  ctx.save();
  ctx.translate(cx, cy);

  const strawBase = '#E0B066';
  const strawWarm = '#C9933B';
  const strawDark = '#8C5A14';
  const burgundy  = ETH_BURGUNDY;
  const green     = ETH_GREEN;
  const umber     = ETH_UMBER;
  const gold      = ETH_GOLD;

  const w = size * 0.85;
  const h = size * 0.88;

  // 1. Pedestal Foot (Flared base)
  const footY = h * 0.38;
  const footW = w * 0.62;
  const footH = h * 0.14;

  ctx.beginPath();
  ctx.moveTo(-footW * 0.45, footY - footH);
  ctx.lineTo(-footW / 2, footY);
  ctx.lineTo(footW / 2, footY);
  ctx.lineTo(footW * 0.45, footY - footH);
  ctx.closePath();
  ctx.fillStyle = strawWarm;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = umber;
  ctx.stroke();

  // Foot zigzag weave band
  ctx.beginPath();
  ctx.moveTo(-footW * 0.48, footY - footH * 0.4);
  for (let x = -footW * 0.48; x < footW * 0.48; x += 10) {
    ctx.lineTo(x + 5, footY - footH * 0.7);
    ctx.lineTo(x + 10, footY - footH * 0.4);
  }
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = burgundy;
  ctx.stroke();

  // 2. Bowl / Body (Cylindrical basket belly)
  const bodyY = footY - footH;
  const bodyH = h * 0.22;
  const bodyW = w * 0.78;

  ctx.beginPath();
  ctx.moveTo(-footW * 0.45, bodyY);
  ctx.bezierCurveTo(-bodyW * 0.54, bodyY - bodyH * 0.5, -bodyW * 0.52, bodyY - bodyH, -bodyW / 2, bodyY - bodyH);
  ctx.lineTo(bodyW / 2, bodyY - bodyH);
  ctx.bezierCurveTo(bodyW * 0.52, bodyY - bodyH, bodyW * 0.54, bodyY - bodyH * 0.5, footW * 0.45, bodyY);
  ctx.closePath();
  ctx.fillStyle = strawBase;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = umber;
  ctx.stroke();

  // Geometric woven diamond band on body
  const bandY = bodyY - bodyH * 0.5;
  const bandStep = 14;
  for (let bx = -bodyW * 0.45; bx < bodyW * 0.45 - bandStep; bx += bandStep) {
    ctx.beginPath();
    ctx.moveTo(bx + bandStep / 2, bandY - 7);
    ctx.lineTo(bx + bandStep, bandY);
    ctx.lineTo(bx + bandStep / 2, bandY + 7);
    ctx.lineTo(bx, bandY);
    ctx.closePath();
    ctx.fillStyle = (Math.abs(Math.floor(bx / bandStep)) % 2 === 0) ? burgundy : green;
    ctx.fill();
  }

  // 3. Mesob Conical Woven Lid (tall pointed cone with stepped shoulder)
  const rimY = bodyY - bodyH;
  const rimW = w * 0.84;
  // Rim lip
  ctx.beginPath();
  ctx.roundRect(-rimW / 2, rimY - 6, rimW, 10, 4);
  ctx.fillStyle = strawDark;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = umber;
  ctx.stroke();

  // Conical dome
  const topY = -h * 0.44;
  ctx.beginPath();
  ctx.moveTo(-rimW * 0.46, rimY - 6);
  ctx.bezierCurveTo(-w * 0.38, rimY - h * 0.16, -w * 0.22, topY + h * 0.14, 0, topY);
  ctx.bezierCurveTo(w * 0.22, topY + h * 0.14, w * 0.38, rimY - h * 0.16, rimW * 0.46, rimY - 6);
  ctx.closePath();
  ctx.fillStyle = strawBase;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = umber;
  ctx.stroke();

  // Woven colorful zigzag chevron tiers on lid
  const tiers = [
    { y: rimY - h * 0.08, w: w * 0.62, color: burgundy },
    { y: rimY - h * 0.16, w: w * 0.46, color: green },
    { y: rimY - h * 0.24, w: w * 0.32, color: burgundy },
  ];

  for (const t of tiers) {
    ctx.beginPath();
    ctx.moveTo(-t.w / 2, t.y);
    for (let x = -t.w / 2; x < t.w / 2; x += 12) {
      ctx.lineTo(x + 6, t.y - 6);
      ctx.lineTo(x + 12, t.y);
    }
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = t.color;
    ctx.stroke();
  }

  // 4. Top Spherical Handle Knob with neck
  ctx.beginPath();
  ctx.roundRect(-w * 0.08, topY - 8, w * 0.16, 10, 2);
  ctx.fillStyle = strawDark;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, topY - 14, size * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = burgundy;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = gold;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, topY - 14, size * 0.025, 0, Math.PI * 2);
  ctx.fillStyle = gold;
  ctx.fill();

  ctx.restore();
}

/**
 * Traditional Ethiopian Clay Cooking Pot / Dist (ድስት) Emblem
 * Authentic handcrafted clay pot with loop handles, domed lid, and aromatic steam
 */
export function drawTraditionalClayPotEmblem(ctx, cx, cy, size = 110, color = ETH_BURGUNDY) {
  ctx.save();
  ctx.translate(cx, cy);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.068;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const potW = size * 0.72;
  const potH = size * 0.46;

  // Handcrafted rounded clay pot bowl
  ctx.beginPath();
  ctx.moveTo(-potW / 2, -potH * 0.12);
  ctx.lineTo(potW / 2, -potH * 0.12);
  ctx.bezierCurveTo(
    potW * 0.58, potH * 0.78,
    -potW * 0.58, potH * 0.78,
    -potW / 2, -potH * 0.12
  );
  ctx.closePath();
  ctx.stroke();

  // Side ear handles (Traditional looped clay ears)
  ctx.beginPath();
  ctx.arc(-potW / 2 - size * 0.07, potH * 0.15, size * 0.13, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(potW / 2 + size * 0.07, potH * 0.15, size * 0.13, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  // Pot lid (Domed clay cover)
  ctx.beginPath();
  ctx.arc(0, -potH * 0.14, potW * 0.44, Math.PI, 0);
  ctx.stroke();

  // Lid top spherical knob
  ctx.beginPath();
  ctx.arc(0, -potH * 0.14 - potW * 0.44 - size * 0.06, size * 0.055, 0, Math.PI * 2);
  ctx.fill();

  // Rising aromatic steam curls (3 graceful wavy tendrils)
  const drawSteamPlume = (sx, sy, h, waveScale) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(
      sx + 8 * waveScale, sy - h * 0.4,
      sx - 8 * waveScale, sy - h * 0.75,
      sx + 3 * waveScale, sy - h
    );
    ctx.lineWidth = size * 0.052;
    ctx.stroke();
  };

  drawSteamPlume(-size * 0.13, -potH * 0.74, size * 0.32, 1);
  drawSteamPlume(0, -potH * 0.8, size * 0.4, -1);
  drawSteamPlume(size * 0.13, -potH * 0.74, size * 0.32, 1);

  ctx.restore();
}

/**
 * Traditional Ethiopian Mesob / Injera Dish Icon (for Step 3)
 */
export function drawMesobStepIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const w = size * 0.76;
  const h = size * 0.52;

  // Base tray
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy + h * 0.28);
  ctx.lineTo(cx + w / 2, cy + h * 0.28);
  ctx.stroke();

  // Mesob conical woven lid
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.42, cy + h * 0.24);
  ctx.bezierCurveTo(cx - w * 0.2, cy - h * 0.3, cx + w * 0.2, cy - h * 0.3, cx + w * 0.42, cy + h * 0.24);
  ctx.stroke();

  // Top knob
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.35, size * 0.06, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 3-Step Instruction Flow Node Row for Traditional Ethiopian Dining
 */
export function drawEthiopianStepFlow(ctx, {
  cx,
  cy,
  color = ETH_BURGUNDY,
  textColor = '#5C3317',
  circleRadius = 26,
  spacing = 180,
}) {
  const nodeCount = 3;
  const startX = cx - ((nodeCount - 1) * spacing) / 2;

  const icons = [
    (x, y) => {
      // Phone Icon
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      const w = 24;
      const h = 38;
      ctx.strokeRect(x - w / 2, y - h / 2, w, h);
      ctx.beginPath();
      ctx.arc(x, y + h / 2 - 5, 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    },
    (x, y) => {
      // Menu / Scroll Icon
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      const w = 26;
      const h = 34;
      ctx.strokeRect(x - w / 2, y - h / 2, w, h);
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 6);
      ctx.lineTo(x + 7, y - 6);
      ctx.moveTo(x - 7, y);
      ctx.lineTo(x + 7, y);
      ctx.moveTo(x - 7, y + 6);
      ctx.lineTo(x + 7, y + 6);
      ctx.stroke();
      ctx.restore();
    },
    (x, y) => drawMesobStepIcon(ctx, x, y, circleRadius * 1.05, color),
  ];

  const labels = ['Scan', 'View Menu', 'Order'];

  for (let i = 0; i < nodeCount; i++) {
    const nx = startX + i * spacing;
    const ny = cy;

    // Outer Circle with warm golden drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(120, 24, 18, 0.2)';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(nx, ny, circleRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Draw the icon
    icons[i](nx, ny);

    // Label below
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = textColor;
    ctx.font = '700 20px "Space Grotesk", Inter, sans-serif';
    ctx.fillText(labels[i], nx, ny + circleRadius + 12);
    ctx.restore();

    // Arrow '>' between circles in Ethiopian gold
    if (i < nodeCount - 1) {
      const arrowX = nx + spacing / 2;
      ctx.save();
      ctx.strokeStyle = ETH_GOLD;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(arrowX - 7, ny - 8);
      ctx.lineTo(arrowX + 4, ny);
      ctx.lineTo(arrowX - 7, ny + 8);
      ctx.stroke();
      ctx.restore();
    }
  }
}

/**
 * PORTRAIT RENDERER (1200 x 1800)
 */
export async function renderCulturalHeritagePortrait(ctx, {
  table,
  restaurant,
  qrImage,
  logoImage,
  heroImage,
  width = 1200,
  height = 1800,
}) {
  const tableLabel = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // 1. Aged Brana Parchment Background
  drawBranaParchmentBackground(ctx, width, height);

  // 2. Authentic Ethiopian Tibeb Woven Border (Strictly contained, ZERO overflow!)
  const borderMargin = 22;
  const borderWidth = width - borderMargin * 2;
  const borderHeight = height - borderMargin * 2;
  const bandThickness = 36;
  drawAuthenticTibebBorder(ctx, borderMargin, borderMargin, borderWidth, borderHeight, bandThickness);

  // 3. Header: Traditional Ethiopian Cross Rosette or Custom Brand Logo
  const headerCenterY = 140;
  if (logoImage) {
    const logoSize = 100;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(120, 24, 18, 0.25)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = ETH_BURGUNDY;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width / 2, headerCenterY, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, width / 2 - logoSize / 2, headerCenterY - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawEthiopianCrossRosette(ctx, width / 2, headerCenterY, 96);
  }

  // 4. Restaurant Title: Regal Traditional Serif (ample spacing below emblem)
  const restName = restaurant?.name || 'Enat';

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Restaurant Name in regal serif
  ctx.fillStyle = ETH_BURGUNDY;
  ctx.font = '700 58px "Playfair Display", "Times New Roman", Georgia, serif';
  ctx.fillText(restName, width / 2, 245, width - 200);

  // Tagline (cleanly spaced cultural description)
  const tagline = (restaurant?.description || 'AUTHENTIC HABESHA CUISINE & TRADITIONAL DINING').toUpperCase();
  ctx.fillStyle = ETH_UMBER;
  ctx.font = '700 20px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(tagline, width / 2, 292, width - 220);
  ctx.restore();

  // 5. QR Code Card Container (balanced 510px size gives vertical air)
  const qrBoxSize = 510;
  const qrBoxX = width / 2 - qrBoxSize / 2;
  const qrBoxY = 350;
  const qrBoxRadius = 32;

  ctx.save();
  ctx.shadowColor = 'rgba(45, 21, 9, 0.22)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 8;

  // Ivory parchment base card
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Outer Burgundy Border
  ctx.lineWidth = 2.8;
  ctx.strokeStyle = ETH_BURGUNDY;
  ctx.stroke();

  // Inner Gold Accent Border
  ctx.beginPath();
  ctx.roundRect(qrBoxX + 6, qrBoxY + 6, qrBoxSize - 12, qrBoxSize - 12, qrBoxRadius - 6);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = ETH_GOLD;
  ctx.stroke();

  // Corner Ethiopian Cross Rosettes on QR Card
  drawEthiopianCrossRosette(ctx, qrBoxX + 22, qrBoxY + 22, 24);
  drawEthiopianCrossRosette(ctx, qrBoxX + qrBoxSize - 22, qrBoxY + 22, 24);
  drawEthiopianCrossRosette(ctx, qrBoxX + qrBoxSize - 22, qrBoxY + qrBoxSize - 22, 24);
  drawEthiopianCrossRosette(ctx, qrBoxX + 22, qrBoxY + qrBoxSize - 22, 24);
  ctx.restore();

  // Draw QR Image inside container
  if (qrImage) {
    const qrInnerSize = 440;
    const qrInnerX = width / 2 - qrInnerSize / 2;
    const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
    ctx.drawImage(qrImage, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
  }

  // 6. Table Pill Badge: Royal Ethiopian Burgundy with Gold Accent Rule
  const pillW = 360;
  const pillH = 64;
  const pillY = qrBoxY + qrBoxSize + 40; // ~900
  drawPillBadge(ctx, {
    x: width / 2 - pillW / 2,
    y: pillY,
    width: pillW,
    height: pillH,
    bgColor: ETH_BURGUNDY,
    borderColor: ETH_GOLD,
    borderWidth: 2.2,
    text: tableLabel,
    textColor: '#FFFFFF',
    font: '700 38px "Playfair Display", Georgia, serif',
  });

  // 7. Prominent Table CODE Capsule Badge (High-contrast ivory parchment theme!)
  const codeY = pillY + pillH + 34; // ~998
  drawThemedCodeBadge(ctx, {
    cx: width / 2,
    cy: codeY,
    code: tableCodeFormatted,
    bgColor: '#FAF3E3',
    borderColor: ETH_BURGUNDY,
    borderWidth: 2.4,
    textColor: ETH_BURGUNDY,
    labelColor: ETH_UMBER,
    width: 460,
    height: 52,
    radius: 14,
    shadow: true,
    shadowColor: 'rgba(120, 24, 18, 0.25)',
  });

  // 8. 3-Step Instruction Flow Node Row (generous spacing below code badge)
  const stepsY = codeY + 72; // ~1070
  drawEthiopianStepFlow(ctx, {
    cx: width / 2,
    cy: stepsY,
    color: ETH_BURGUNDY,
    textColor: ETH_UMBER,
    circleRadius: 28,
    spacing: 210,
  });

  // 9. Script Catchphrase: "Our Culture, Your Taste"
  const scriptY = stepsY + 98; // ~1168 (zero collision with step labels!)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ETH_BURGUNDY;
  ctx.font = 'italic 700 44px "Playfair Display", "Caveat", Georgia, cursive, serif';
  ctx.fillText('Our Culture, Your Taste', width / 2, scriptY);
  ctx.restore();

  // 10. Bottom Hero Feast Visual (Traditional Mesob, Injera, Beyaynetu, Jebena via drawImageCover)
  if (heroImage) {
    const heroH = 380;
    const heroY = height - heroH - 90;
    const heroX = 58;
    const heroW = width - 116;

    ctx.save();
    // Rounded photo frame with drawImageCover
    drawImageCover(ctx, heroImage, heroX, heroY, heroW, heroH, 30);

    // Cultural burgundy gradient banner at the bottom base
    const bottomBand = ctx.createLinearGradient(0, height - 190, 0, height - 90);
    bottomBand.addColorStop(0, 'rgba(120, 24, 18, 0)');
    bottomBand.addColorStop(0.5, 'rgba(120, 24, 18, 0.7)');
    bottomBand.addColorStop(1, ETH_BURGUNDY);
    ctx.fillStyle = bottomBand;
    ctx.beginPath();
    ctx.roundRect(heroX, height - 190, heroW, 100, [0, 0, 30, 30]);
    ctx.fill();

    // Golden frame stroke
    ctx.lineWidth = 3;
    ctx.strokeStyle = ETH_GOLD;
    ctx.beginPath();
    ctx.roundRect(heroX, heroY, heroW, heroH, 30);
    ctx.stroke();

    ctx.restore();

    // Traditional Mesob Basket in bottom-right corner (Just like Reference Images 1 & 2!)
    drawTraditionalMesobBasket(ctx, width - 150, height - 180, 150);
  }

  // 11. "Powered by LayoScan" Footer Badge
  await drawLayoScanFooter(ctx, {
    cx: width / 2,
    cy: height - 55,
    badgeW: 390,
    badgeH: 54,
    theme: 'light',
    accentColor: ETH_BURGUNDY,
    templateId: 'cultural_heritage',
  });
}

/**
 * LANDSCAPE RENDERER (1800 x 1200) — Mini Table Tent / Counter Stand
 */
export async function renderCulturalHeritageLandscape(ctx, {
  table,
  restaurant,
  qrImage,
  logoImage,
  heroImage,
  width = 1800,
  height = 1200,
}) {
  const tableLabel = table?.label || 'Table 1';
  const tableCodeFormatted = formatTableCode(table?.qrToken);

  // 1. Aged Brana Parchment Background
  drawBranaParchmentBackground(ctx, width, height);

  // 2. Authentic Tibeb Border (Strictly contained, ZERO overflow on right!)
  const borderMargin = 22;
  const borderWidth = width - borderMargin * 2;
  const borderHeight = height - borderMargin * 2;
  const bandThickness = 30;
  drawAuthenticTibebBorder(ctx, borderMargin, borderMargin, borderWidth, borderHeight, bandThickness);

  // 3. Left Section: Brand & Story (x: 0 -> 980)
  const leftCenterX = 480;

  // Header Logo or Ethiopian Cross Rosette
  const headerCenterY = 125;
  if (logoImage) {
    const logoSize = 96;
    ctx.save();
    ctx.beginPath();
    ctx.arc(leftCenterX, headerCenterY, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(120, 24, 18, 0.22)';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = ETH_BURGUNDY;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(leftCenterX, headerCenterY, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImage, leftCenterX - logoSize / 2, headerCenterY - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  } else {
    drawEthiopianCrossRosette(ctx, leftCenterX, headerCenterY, 86);
  }

  // Restaurant Name (Regal Classical Serif)
  const restName = restaurant?.name || 'Enat';

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Restaurant Name in classical serif
  ctx.fillStyle = ETH_BURGUNDY;
  ctx.font = '700 50px "Playfair Display", Georgia, serif';
  ctx.fillText(restName, leftCenterX, 218, 860);

  // Tagline
  const tagline = (restaurant?.description || 'AUTHENTIC HABESHA CUISINE & TRADITIONAL DINING').toUpperCase();
  ctx.fillStyle = ETH_UMBER;
  ctx.font = '700 19px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(tagline, leftCenterX, 262, 860);
  ctx.restore();

  // Table Pill Badge
  const pillW = 340;
  const pillH = 62;
  const pillY = 304;
  drawPillBadge(ctx, {
    x: leftCenterX - pillW / 2,
    y: pillY,
    width: pillW,
    height: pillH,
    bgColor: ETH_BURGUNDY,
    borderColor: ETH_GOLD,
    borderWidth: 2.2,
    text: tableLabel,
    textColor: '#FFFFFF',
    font: '700 36px "Playfair Display", Georgia, serif',
  });

  // Prominent Table CODE Capsule Badge on Left (Under Table 1 Badge)
  const codeY = pillY + pillH + 30; // ~396
  drawThemedCodeBadge(ctx, {
    cx: leftCenterX,
    cy: codeY,
    code: tableCodeFormatted,
    bgColor: '#FAF3E3',
    borderColor: ETH_BURGUNDY,
    borderWidth: 2.2,
    textColor: ETH_BURGUNDY,
    labelColor: ETH_UMBER,
    width: 440,
    height: 48,
    radius: 14,
    shadow: true,
    shadowColor: 'rgba(120, 24, 18, 0.25)',
  });

  // 3-Step Flow Nodes (generous spacing below code badge)
  const stepsY = codeY + 68; // ~464
  drawEthiopianStepFlow(ctx, {
    cx: leftCenterX,
    cy: stepsY,
    color: ETH_BURGUNDY,
    textColor: ETH_UMBER,
    circleRadius: 26,
    spacing: 180,
  });

  // Script Catchphrase (ample breathing space below step labels - zero overlap!)
  const scriptY = stepsY + 92; // ~556 (step labels end at 502, 54px clear space!)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ETH_BURGUNDY;
  ctx.font = 'italic 700 42px "Playfair Display", "Caveat", Georgia, cursive, serif';
  ctx.fillText('Our Culture, Your Taste', leftCenterX, scriptY);
  ctx.restore();

  // Bottom Hero Cultural Feast on Left
  if (heroImage) {
    const heroSize = 350;
    const hx = 580;
    const hy = height - heroSize - 70;
    ctx.save();
    ctx.beginPath();
    ctx.arc(hx + heroSize / 2, hy + heroSize / 2, heroSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(120, 24, 18, 0.25)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    ctx.fill();

    // Photo clipped to circle with object-fit cover
    drawImageCover(ctx, heroImage, hx, hy, heroSize, heroSize, heroSize / 2);

    ctx.beginPath();
    ctx.arc(hx + heroSize / 2, hy + heroSize / 2, heroSize / 2, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = ETH_BURGUNDY;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(hx + heroSize / 2, hy + heroSize / 2, heroSize / 2 - 4, 0, Math.PI * 2);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = ETH_GOLD;
    ctx.stroke();
    ctx.restore();

    // Traditional Mesob Basket paired with feast visual on bottom left
    drawTraditionalMesobBasket(ctx, 160, height - 190, 150);
  }

  // Left Footer
  await drawLayoScanFooter(ctx, {
    cx: 320,
    cy: height - 55,
    badgeW: 360,
    badgeH: 52,
    theme: 'light',
    accentColor: ETH_BURGUNDY,
    templateId: 'cultural_heritage',
  });

  // 4. Right Section: Large QR Code Presentation (x: 980 -> 1800)
  const rightCenterX = 1380;
  const qrBoxSize = 560;
  const qrBoxX = rightCenterX - qrBoxSize / 2;
  const qrBoxY = 110;
  const qrBoxRadius = 36;

  ctx.save();
  ctx.shadowColor = 'rgba(45, 21, 9, 0.22)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2.8;
  ctx.strokeStyle = ETH_BURGUNDY;
  ctx.stroke();

  // Inner gold rule
  ctx.beginPath();
  ctx.roundRect(qrBoxX + 6, qrBoxY + 6, qrBoxSize - 12, qrBoxSize - 12, qrBoxRadius - 6);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = ETH_GOLD;
  ctx.stroke();

  // Corner Ethiopian Cross Rosettes on QR container
  drawEthiopianCrossRosette(ctx, qrBoxX + 22, qrBoxY + 22, 24);
  drawEthiopianCrossRosette(ctx, qrBoxX + qrBoxSize - 22, qrBoxY + 22, 24);
  drawEthiopianCrossRosette(ctx, qrBoxX + qrBoxSize - 22, qrBoxY + qrBoxSize - 22, 24);
  drawEthiopianCrossRosette(ctx, qrBoxX + 22, qrBoxY + qrBoxSize - 22, 24);
  ctx.restore();

  if (qrImage) {
    const qrInnerSize = 490;
    const qrInnerX = rightCenterX - qrInnerSize / 2;
    const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
    ctx.drawImage(qrImage, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
  }

  // Scan Callout below QR
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ETH_BURGUNDY;
  ctx.font = '700 22px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('POINT CAMERA TO SCAN OR ORDER', rightCenterX, qrBoxY + qrBoxSize + 36);
  ctx.restore();

  // Under QR: Prominent Manual Table Code Box
  const codeBoxW = 560;
  const codeBoxH = 92;
  const codeBoxX = rightCenterX - codeBoxW / 2;
  const codeBoxY = qrBoxY + qrBoxSize + 60; // ~730

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(codeBoxX, codeBoxY, codeBoxW, codeBoxH, 20);
  ctx.fillStyle = '#FAF3E3';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = ETH_BURGUNDY;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ETH_UMBER;
  ctx.font = '700 17px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('ENTER TABLE CODE MANUALLY:', rightCenterX, codeBoxY + 30);

  ctx.fillStyle = ETH_BURGUNDY;
  ctx.font = '800 34px "Space Grotesk", monospace';
  ctx.fillText(tableCodeFormatted, rightCenterX, codeBoxY + 65);
  ctx.restore();

  // Web address link
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5C3317';
  ctx.font = '600 20px Inter, sans-serif';
  ctx.fillText('🌐 layoscancustomer.vercel.app', rightCenterX, codeBoxY + codeBoxH + 34);
  ctx.restore();

  // Right Footer (matching left side)
  await drawLayoScanFooter(ctx, {
    cx: rightCenterX,
    cy: height - 55,
    badgeW: 360,
    badgeH: 52,
    theme: 'light',
    accentColor: ETH_BURGUNDY,
    templateId: 'cultural_heritage',
  });
}
