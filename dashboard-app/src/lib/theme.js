/**
 * LayoScan Dashboard Theme Engine
 *
 * Dynamically applies the restaurant's brand color as CSS custom properties
 * on document.documentElement for live dashboard and customer app alignment.
 */

const DEFAULT_BRAND = '#14B8A6';
const INK = '#121A2C';

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHsl({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
      case gn: h = ((bn - rn) / d + 2) / 6; break;
      default: h = ((rn - gn) / d + 4) / 6;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }) {
  const sn = s / 100, ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function luminance({ r, g, b }) {
  const chan = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : ((sRGB + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function generateThemeFromColor(hex) {
  const safeHex = (hex && /^#[0-9A-Fa-f]{3,6}$/.test(hex)) ? hex : DEFAULT_BRAND;

  try {
    const rgb = hexToRgb(safeHex);
    const hsl = rgbToHsl(rgb);

    const darkHsl  = { ...hsl, l: Math.max(0, hsl.l - 12) };
    const lightHsl = { ...hsl, l: Math.min(88, hsl.l + 20) };
    const washHsl  = { ...hsl, s: Math.min(hsl.s, 40), l: Math.min(96, Math.max(92, 100 - hsl.l * 0.12)) };

    const primary      = safeHex;
    const primaryDark  = hslToHex(darkHsl);
    const primaryLight = hslToHex(lightHsl);
    const surfaceWash  = hslToHex(washHsl);

    const primaryLum    = luminance(rgb);
    const whiteLum      = 1;
    const inkLum        = luminance(hexToRgb(INK));
    const whiteContrast = contrastRatio(primaryLum, whiteLum);
    const inkContrast   = contrastRatio(primaryLum, inkLum);
    const onPrimary     = whiteContrast >= inkContrast ? '#FFFFFF' : INK;

    return { primary, primaryDark, primaryLight, surfaceWash, onPrimary };
  } catch {
    return {
      primary:      DEFAULT_BRAND,
      primaryDark:  '#0F8077',
      primaryLight: '#5EDDD4',
      surfaceWash:  '#E6FAF8',
      onPrimary:    '#FFFFFF',
    };
  }
}

export function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary',      theme.primary);
  root.style.setProperty('--color-primary-dark',  theme.primaryDark);
  root.style.setProperty('--color-primary-light', theme.primaryLight);
  root.style.setProperty('--color-surface-wash',  theme.surfaceWash);
  root.style.setProperty('--color-on-primary',    theme.onPrimary);
}

export function applyBrandColor(brandColor) {
  const theme = generateThemeFromColor(brandColor);
  applyTheme(theme);
  return theme;
}
