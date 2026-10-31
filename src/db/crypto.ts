/**
 * Browser-compatible cryptographic utilities using Web Crypto API (SubtleCrypto)
 */

const SALT = 'NIDHI_AICTE_SECURITY_SALT_2026';

/**
 * Computes SHA-256 hash string for passwords with application salt
 */
export async function hashPassword(plainText: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${SALT}:${plainText}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies a password against an expected hash
 */
export async function verifyPassword(plainText: string, expectedHash: string): Promise<boolean> {
  const computedHash = await hashPassword(plainText);
  return computedHash === expectedHash;
}

/**
 * Computes SHA-256 hash of an audit log entry chained with the previous entry's hash
 * This forms an tamper-evident chain of audit records.
 */
export async function computeAuditHash(
  previousHash: string,
  eventId: string,
  userId: string,
  action: string,
  timestamp: string,
  description: string
): Promise<string> {
  const enc = new TextEncoder();
  const payload = `${previousHash}|${eventId}|${userId}|${action}|${timestamp}|${description}`;
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(payload));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a cryptographically strong random token / reference suffix
 */
export function generateSecureId(prefix: string = 'ID'): string {
  const array = new Uint32Array(2);
  crypto.getRandomValues(array);
  const hex = Array.from(array).map(n => n.toString(16).padStart(8, '0')).join('');
  return `${prefix}-${hex.toUpperCase().slice(0, 8)}`;
}
