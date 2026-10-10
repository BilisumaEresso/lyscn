/**
 * CBE Dynamic EMVCo QR Code Payload Generator
 * Conforms to EMVCo Merchant-Presented QR Specification & CBE / EthSwitch requirements.
 * Generates dynamic payloads that prefill:
 * - Recipient CBE Account Number
 * - Exact Transaction Amount (Ethiopian Birr - ISO 4217 code 230)
 * - Reason / Table & Bill Reference
 * - CRC-16 CCITT (0xFFFF polynomial 0x1021) Checksum
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
  // Byte length in UTF-8
  const len = new TextEncoder().encode(str).length;
  const lenStr = String(len).padStart(2, '0');
  return `${tag}${lenStr}${str}`;
}

/**
 * Builds the complete dynamic CBE QR payload
 * @param {Object} params
 * @param {string} params.accountNumber - CBE 13-digit account number (e.g. "1000594630107")
 * @param {string} [params.accountName] - Merchant / Account Holder name
 * @param {number|string} [params.amount] - Bill amount in ETB (e.g. 200 or "200.00")
 * @param {string} [params.reason] - Table / bill remark (e.g. "Table 4")
 * @param {string} [params.city] - Merchant city (defaults to "Addis Ababa")
 * @returns {string} - Complete valid EMVCo CBE QR string
 */
export function buildCbeDynamicQrPayload({
  accountNumber,
  accountName = 'LayoScan Merchant',
  amount = null,
  reason = 'Table Bill',
  city = 'Addis Ababa',
}) {
  if (!accountNumber) return '';

  const cleanAccount = String(accountNumber).replace(/[^0-9]/g, '');

  // Tag 28: CBE Merchant Account Template
  // Sub-tag 00: Bank Code ("CBE")
  // Sub-tag 01: SWIFT / BIC ("CBETETAA")
  // Sub-tag 02: Account Number (13 digits)
  const tag28Content =
    tlv('00', 'CBE') +
    tlv('01', 'CBETETAA') +
    tlv('02', cleanAccount);

  // Tag 87: CBE System routing
  const tag87Content =
    tlv('00', 'cbe') +
    tlv('01', '12');

  // Tag 80: EthSwitch purpose & reason
  // Sub-tag 00: System identifier ("etswitch")
  // Sub-tag 01: Payment remark / reason (e.g. "Table 4")
  const cleanReason = String(reason || 'Table Bill').slice(0, 25);
  const tag80Content =
    tlv('00', 'etswitch') +
    tlv('01', cleanReason);

  const cleanName = String(accountName || 'Merchant').slice(0, 25);
  const cleanCity = String(city || 'Addis Ababa').slice(0, 15);

  const numAmount = amount ? Number(amount) : null;
  const hasAmount = numAmount !== null && !isNaN(numAmount) && numAmount > 0;

  // Format amount as fixed 2 decimal places (or 1 decimal if .0)
  const formattedAmount = hasAmount ? (numAmount % 1 === 0 ? `${numAmount.toFixed(1)}` : numAmount.toFixed(2)) : null;

  // Point of Initiation Method:
  // Note: Standard EMVCo uses '12' for dynamic amounts, but CBE Mobile Banking
  // explicitly validates that Tag 01 equals '11'. Setting '12' causes CBE to reject
  // the QR with "Invalid QR". CBE prefilled dynamic amounts (Tag 54) and table remarks
  // (Tag 80) are accepted under initiation code '11'.
  const pointOfInitiation = '11';

  let rawPayload =
    tlv('00', '01') +
    tlv('01', pointOfInitiation) +
    tlv('28', tag28Content) +
    tlv('52', '0000') +
    tlv('53', '230'); // ISO 4217 code for Ethiopian Birr (ETB)

  if (hasAmount && formattedAmount) {
    rawPayload += tlv('54', formattedAmount);
  }

  rawPayload +=
    tlv('58', 'ET') +
    tlv('59', cleanName) +
    tlv('60', cleanCity) +
    tlv('87', tag87Content) +
    tlv('80', tag80Content) +
    '6304'; // Tag 63 with length 04 indicates checksum follows

  const checksum = crc16Ccitt(rawPayload);
  return `${rawPayload}${checksum}`;
}
