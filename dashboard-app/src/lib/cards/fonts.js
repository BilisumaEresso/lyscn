/**
 * Web font preloader for HTML5 Canvas card rendering.
 * Ensures custom web fonts (Playfair Display, Inter, Noto Sans Ethiopic) are fully loaded
 * into the browser document prior to canvas drawing, preventing silent fallback to Arial/Georgia.
 */

export const DEFAULT_DESCRIPTORS = [
  // Playfair Display (Serif / Luxury / Artisan)
  '600 16px "Playfair Display"',
  '700 16px "Playfair Display"',
  'italic 600 16px "Playfair Display"',
  'italic 700 16px "Playfair Display"',

  // Inter (Clean Sans / UI / Body)
  '400 16px Inter',
  '500 16px Inter',
  '600 16px Inter',
  '700 16px Inter',

  // Noto Sans Ethiopic (Amharic & Ge'ez script support)
  '400 16px "Noto Sans Ethiopic"',
  '600 16px "Noto Sans Ethiopic"',
  '700 16px "Noto Sans Ethiopic"',

  // Space Grotesk (Display / Modern Monospace badges)
  '600 16px "Space Grotesk"',
  '700 16px "Space Grotesk"',

  // Permanent Marker (Street / Fast Casual brush typography)
  '400 16px "Permanent Marker"',

  // Caveat (Artisan Cafe flowing cursive typography)
  '700 16px "Caveat"',
];

let fontsPromise = null;

/**
 * Loads and awaits every font descriptor required by the card rendering specs.
 * Safe to call repeatedly; caches the loading promise.
 * In non-browser (Node.js) or legacy browser environments, resolves immediately without throwing.
 *
 * @param {string[]} [descriptors=DEFAULT_DESCRIPTORS] - List of font descriptors to load
 * @returns {Promise<void>}
 */
export function ensureFontsLoaded(descriptors = DEFAULT_DESCRIPTORS) {
  if (fontsPromise) {
    return fontsPromise;
  }

  // Guard against non-browser environments (e.g. Node.js unit tests / CLI scripts)
  if (
    typeof document === 'undefined' ||
    !document.fonts ||
    typeof document.fonts.load !== 'function'
  ) {
    fontsPromise = Promise.resolve();
    return fontsPromise;
  }

  fontsPromise = (async () => {
    try {
      const loadTasks = descriptors.map(async (desc) => {
        try {
          await document.fonts.load(desc);
        } catch (err) {
          // Log and continue gracefully; canvas falls back to system font
          console.warn(`[fonts] Failed to load font "${desc}":`, err?.message || err);
        }
      });

      await Promise.allSettled(loadTasks);

      // Await document.fonts.ready for good measure if available
      if (document.fonts.ready) {
        await document.fonts.ready.catch(() => {});
      }
    } catch (err) {
      console.warn('[fonts] Error during font preloading pipeline:', err);
    }
  })();

  return fontsPromise;
}

/**
 * Resets the cached font loading promise (useful for testing).
 */
export function resetFontCache() {
  fontsPromise = null;
}
