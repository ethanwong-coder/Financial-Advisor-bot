/**
 * Field-level encryption for sensitive data at rest (account numbers, and SSNs
 * if ever collected). Uses AES-256-GCM with a random IV per value and an
 * authentication tag, so tampering is detectable.
 *
 * The key comes from ENCRYPTION_KEY (base64 of 32 bytes). Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * Stored format (base64):  IV(12) || AUTH_TAG(16) || CIPHERTEXT
 *
 * NEVER log decrypted values. See src/lib/log.ts for the redaction helper.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const IV_LENGTH = 12; // GCM standard nonce length
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate one with: " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). Provide a base64-encoded 32-byte key.`,
    );
  }
  return key;
}

/** Encrypt a plaintext string. Returns null for null/empty input. */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === "") return null;
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/** Decrypt a value produced by encryptField. Returns null for null input. */
export function decryptField(stored: string | null | undefined): string | null {
  if (stored == null || stored === "") return null;
  const key = getKey();
  const buf = Buffer.from(stored, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/** Show only the last 4 characters of a sensitive value, for display. */
export function maskLast4(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.replace(/\s+/g, "");
  if (trimmed.length <= 4) return `••••`;
  return `••••${trimmed.slice(-4)}`;
}
