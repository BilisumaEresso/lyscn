/**
 * Phone number utilities for Ethiopian and international formats.
 */

/**
 * Normalizes phone numbers into a clean standard format.
 * Primarily handles Ethiopian mobile formats:
 * - 0911234567 -> 0911234567
 * - +251911234567 -> 0911234567
 * - 251911234567 -> 0911234567
 * - 0711234567 -> 0711234567
 * - +251711234567 -> 0711234567
 * Strips whitespace, dashes, dots, and parentheses.
 *
 * @param {string} phone 
 * @returns {string} Normalized phone number
 */
function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  
  // Remove all non-digits except a leading +
  let cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '');

  // If starts with +251 or 251 (Ethiopia country code)
  if (cleaned.startsWith('+251')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('251') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(3);
  }

  return cleaned;
}

/**
 * Checks if a string looks like a valid phone number.
 * Accepts Ethiopian numbers (09..., 07..., +251...) or general digits of length 9-15.
 *
 * @param {string} phone 
 * @returns {boolean}
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const normalized = normalizePhone(phone);
  // Ethiopian format: starts with 09 or 07 and followed by 8 digits (10 total digits)
  // or general international 8-15 digits
  return /^(09|07)\d{8}$/.test(normalized) || /^\+?\d{8,15}$/.test(normalized);
}

module.exports = {
  normalizePhone,
  isValidPhone,
};
