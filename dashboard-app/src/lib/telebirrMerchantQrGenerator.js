/**
 * Telebirr Dynamic & Static Merchant QR Payload Generator
 * Conforms to EMVCo Merchant-Presented QR Specification & Ethio Telecom / EthSwitch specifications.
 * Generates dynamic payloads that prefill:
 * - Recipient Telebirr Merchant ID / Till Number
 * - Operator ID (optional)
 * - Exact Transaction Bill Amount (Tag 54 in ETB - ISO 4217 code 230)
 * - Table & Bill Remark (Tag 62 / Tag 80)
 * - CRC-16 CCITT (0xFFFF, 0x1021) Checksum
 */

/**
 * Calculates CRC-16 CCITT (polynomial 0x1021, initial value 0xFFFF)
 */
export function crc16Ccitt(str) {
  let crc = 0xFFFF;
  const bytes = new TextEncoder().encode(str);
  for (let i = 0; i < bytes.length; i++) {
    crc ^= (bytes[i] << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Encodes Tag-Length-Value (TLV) with 2-digit length
 */
function tlv(tag, value) {
  if (value === null || value === undefined || value === '') return '';
  const str = String(value);
  const len = new TextEncoder().encode(str).length;
  const lenStr = String(len).padStart(2, '0');
  return `${tag}${lenStr}${str}`;
}

/**
 * Builds dynamic Telebirr Merchant QR payload conforming to EMVCo MPM & EthSwitch specifications
 * @param {Object} params
 * @param {string} params.merchantId - Telebirr Merchant Till / Shortcode ID (e.g. "516172")
 * @param {string} [params.operatorId] - Telebirr Operator ID (e.g. "452089")
 * @param {string} [params.merchantName] - Registered Merchant name (e.g. "Artisan Cafe")
 * @param {number|string} [params.amount] - Bill amount in ETB (e.g. 200 or "200.00")
 * @param {string} [params.reason] - Table / bill remark (e.g. "Table 4")
 * @param {string} [params.billId] - Short order / bill reference
 * @param {string} [params.city] - Merchant city (defaults to "Addis Ababa")
 * @returns {string} - Complete valid EMVCo Telebirr QR string
 */
export function buildTelebirrDynamicQrPayload({
  merchantId,
  operatorId = '',
  merchantName = 'LayoScan Merchant',
  amount = null,
  reason = 'Table Bill',
  billId = '',
  city = 'Addis Ababa',
}) {
  if (!merchantId) return '';

  const cleanMerchantId = String(merchantId).replace(/[^0-9]/g, '');
  if (!cleanMerchantId) return '';

  const cleanOperatorId = operatorId ? String(operatorId).replace(/[^0-9]/g, '') : '';
  const cleanName = String(merchantName || 'LayoScan Merchant').slice(0, 25);
  const cleanCity = String(city || 'Addis Ababa').slice(0, 15);
  const cleanReason = String(reason || 'Table Bill').slice(0, 25);
  const cleanBillId = String(billId || '').slice(0, 15);

  // Tag 28: National Interoperable EthSwitch / IPS ET Template for Telebirr
  // Sub-tag 00: "TELEBIRR"
  // Sub-tag 01: "ETHTETAA" (Ethio Telecom SWIFT/BIC)
  // Sub-tag 02: Merchant ID / Till Number
  // Sub-tag 03: Operator ID (if provided)
  const tag28Content =
    tlv('00', 'TELEBIRR') +
    tlv('01', 'ETHTETAA') +
    tlv('02', cleanMerchantId) +
    (cleanOperatorId ? tlv('03', cleanOperatorId) : '');

  // Tag 26: Ethio Telecom proprietary Telebirr Merchant Template
  const tag26Content =
    tlv('00', 'telebirr') +
    tlv('01', cleanMerchantId) +
    (cleanOperatorId ? tlv('02', cleanOperatorId) : '');

  // Tag 62: Additional Data Template (Bill Number, Table Ref, Terminal)
  const tag62Content =
    (cleanBillId ? tlv('01', cleanBillId) : '') +
    (cleanReason ? tlv('05', cleanReason) : '') +
    (cleanOperatorId ? tlv('07', cleanOperatorId) : tlv('07', 'POS'));

  // Tag 80: EthSwitch / Telebirr context
  const tag80Content =
    tlv('00', 'telebirr') +
    tlv('01', cleanReason);

  const numAmount = amount ? Number(amount) : null;
  const hasAmount = numAmount !== null && !isNaN(numAmount) && numAmount > 0;
  const formattedAmount = hasAmount ? (numAmount % 1 === 0 ? `${numAmount.toFixed(1)}` : numAmount.toFixed(2)) : null;

  // Point of Initiation Method:
  // '11' for standard mobile wallet scanning; compatible across camera apps
  const pointOfInitiation = '11';

  let rawPayload =
    tlv('00', '01') +
    tlv('01', pointOfInitiation) +
    tlv('26', tag26Content) +
    tlv('28', tag28Content) +
    tlv('52', '5812') + // ISO 18245 MCC for Eating Places and Restaurants
    tlv('53', '230');   // ISO 4217 Currency code for ETB (Ethiopian Birr)

  if (hasAmount && formattedAmount) {
    rawPayload += tlv('54', formattedAmount);
  }

  rawPayload +=
    tlv('58', 'ET') +
    tlv('59', cleanName) +
    tlv('60', cleanCity) +
    (tag62Content ? tlv('62', tag62Content) : '') +
    tlv('80', tag80Content) +
    '6304'; // Tag 63 with length 04 indicates checksum follows

  const checksum = crc16Ccitt(rawPayload);
  return `${rawPayload}${checksum}`;
}
