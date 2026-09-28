// ============================================================
// FILE: src/lib/phone.js
// Indian mobile numbers. The +91 is fixed on screen, so forms keep
// only the 10 local digits and add the country code when sending.
// ============================================================

export const COUNTRY_CODE = '+91';

/** Any typed, pasted or stored number ("+91 98765 43210", "09876543210") -> "9876543210". */
export function localDigits(value) {
  let d = String(value ?? '').replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  else if (d.length > 10 && d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 10);
}

/** "9265679968" -> "92656 79968", the way the number is read aloud. */
export function formatLocal(digits) {
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}

/** Indian mobiles are 10 digits and start with 6-9. */
export const isValidMobile = (digits) => /^[6-9]\d{9}$/.test(digits);

/** What the API stores: "+919265679968". */
export const toE164 = (digits) => `${COUNTRY_CODE}${digits}`;
