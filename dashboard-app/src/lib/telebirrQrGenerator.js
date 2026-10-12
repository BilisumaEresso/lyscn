/**
 * Telebirr Dynamic EMVCo CPM (CPV01) QR Code Generator
 * Conforms to EMVCo Consumer-Presented Mode & Telebirr / Ethio Telecom specifications.
 * Generates dynamic payloads that prefill:
 * - Recipient Telebirr Mobile / Account Number
 * - Exact Transaction Bill Amount (Tag 9F24 in ETB)
 * - Real-time Millisecond Generation Timestamp
 * - Base64 Encoding
 */

/**
 * Cleans phone number into standard 12-digit Ethiopian format: 2519... or 2517...
 * @param {string|number} phone
 * @returns {string} 12-digit string
 */
export function formatTelebirrPhone(phone) {
  if (!phone) return '';
  let p = String(phone).replace(/[^0-9]/g, '');
  if (p.startsWith('0')) {
    p = '251' + p.slice(1);
  } else if (!p.startsWith('251')) {
    p = '251' + p;
  }
  return p.slice(0, 12);
}

/**
 * Builds dynamic Telebirr QR payload (Base64 encoded EMVCo CPV01)
 * @param {Object} params
 * @param {string} params.phone - Telebirr phone number (e.g. "0992087870" or "+251992087870")
 * @param {number|string} [params.amount] - Bill amount in ETB (e.g. 200 or 250.50)
 * @param {string} [params.staticPayload] - Optional decoded Base64 string of existing QR to reuse exact Track 2
 * @param {number|string} [params.timestamp] - Optional custom timestamp (defaults to Date.now())
 * @returns {string} Base64 string ready for QR rendering
 */
export function buildTelebirrDynamicQrPayload({
  phone,
  amount = null,
  staticPayload = null,
  timestamp = null,
}) {
  let track2Bytes = null;

  // Case 1: If an existing static QR payload was decoded, extract Track 2 bytes directly
  if (staticPayload && typeof staticPayload === 'string') {
    try {
      const decodedStr = atob(staticPayload.trim());
      const rawBytes = [];
      for (let i = 0; i < decodedStr.length; i++) {
        rawBytes.push(decodedStr.charCodeAt(i));
      }
      // Track 2 in standard Telebirr CPV01 starts at byte index 27 (Tag 57, Len 0x16)
      if (rawBytes[27] === 0x57 && rawBytes[28] === 0x16 && rawBytes.length >= 40) {
        track2Bytes = rawBytes.slice(27, 40);
      }
    } catch {
      track2Bytes = null;
    }
  }

  // Case 2: Synthesize Track 2 bytes from phone number
  if (!track2Bytes) {
    const cleanP = formatTelebirrPhone(phone);
    if (!cleanP || cleanP.length < 12) return '';

    // Expiry YYMM (current year and month)
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yymm = yy + mm;

    // Track 2 nibbles: 12-digit phone + 'd' + yymm (4) + '101' (3) + '51' (2) = 22 nibbles = 11 bytes
    const track2Hex = cleanP + 'd' + yymm + '10151';

    track2Bytes = [0x57, 0x16];
    for (let i = 0; i < track2Hex.length; i += 2) {
      track2Bytes.push(parseInt(track2Hex.substr(i, 2), 16));
    }
  }

  // 13-digit Millisecond Timestamp (Tag 52)
  const tsStr = String(timestamp || Date.now()).slice(0, 13);
  const tsBytes = Array.from(new TextEncoder().encode(tsStr));

  // Tag 61 Prefix: 4F 02 F0 52 0D
  const prefix = [0x4F, 0x02, 0xF0, 0x52, 0x0D];

  // Amount Tag: 9F 24 <len> <amountStr>
  let amountBytes = [];
  const numAmount = amount !== null && amount !== undefined ? Number(amount) : null;
  if (numAmount !== null && !isNaN(numAmount) && numAmount > 0) {
    const amtStr = numAmount.toFixed(2);
    const amtAscii = Array.from(new TextEncoder().encode(amtStr));
    amountBytes = [0x9F, 0x24, amtAscii.length, ...amtAscii];
  }

  // Application template payload (inside Tag 61)
  const payload = [...prefix, ...tsBytes, ...track2Bytes, ...amountBytes];

  // Length of Tag 61 is encoded in nibbles (bytes * 2)
  const tag61Len = payload.length * 2;

  // Outer Header: Tag 85 (len 5, 'CPV01')
  const header = [0x85, 0x05, 0x43, 0x50, 0x56, 0x30, 0x31];

  const fullBytes = new Uint8Array([...header, 0x61, tag61Len, ...payload]);

  // Convert Uint8Array to Base64
  let binary = '';
  for (let i = 0; i < fullBytes.length; i++) {
    binary += String.fromCharCode(fullBytes[i]);
  }
  return btoa(binary);
}
