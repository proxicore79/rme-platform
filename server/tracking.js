/**
 * Tracking number engine.
 * Format: RME-{ORIGIN}-{YYMMDD}-{6 digits}-{2 check digits}
 * e.g.    RME-US-260904-482013-77
 * The final two digits are a base-36 modulo-97 checksum over the preceding
 * alphanumeric string, so mis-keyed numbers are rejected instantly.
 */
import crypto from 'node:crypto';

export function makeTracking(originCode, date = new Date()) {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const body = `RME${originCode.toUpperCase()}${yy}${mm}${dd}${crypto.randomInt(100000, 999999)}`;
  return prettyTracking(body + checksum(body));
}

export function checksum(body) {
  // Treat alphanumerics in base 36; compute mod 97 → 2 zero-padded digits.
  let rem = 0;
  for (const ch of body) {
    rem = (rem * 36 + parseInt(ch, 36)) % 97;
  }
  return String(rem).padStart(2, '0');
}

function prettyTracking(raw) {
  const m = raw.match(/^(RME)(.{2})(\d{6})(\d{6})(\d{2})$/);
  if (!m) return raw;
  return `${m[1]}-${m[2]}-${m[3]}-${m[4]}-${m[5]}`;
}

/** Normalise user input and validate format + checksum. Returns null if invalid. */
export function parseTracking(input) {
  if (!input) return null;
  const cleaned = String(input).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = cleaned.match(/^(RME)(.{2})(\d{6})(\d{6})(\d{2})$/);
  if (!m) return null;
  const body = `${m[1]}${m[2]}${m[3]}${m[4]}`;
  if (checksum(body) !== m[5]) return null;
  return prettyTracking(cleaned);
}

export function originFromTracking(tracking) {
  const m = tracking && tracking.replace(/[^A-Z0-9]/g, '').match(/^RME(.{2})/);
  return m ? m[1] : null;
}
