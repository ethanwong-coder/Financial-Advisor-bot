/**
 * Minimal logger that redacts sensitive fields before anything is written.
 * Use this instead of raw console.* when logging objects that might contain
 * account numbers, SSNs, tokens, balances, or beneficiary names.
 */

const SENSITIVE_KEYS = new Set([
  "accountnumber",
  "accountnumberenc",
  "ssn",
  "taxid",
  "password",
  "passwordhash",
  "accesstoken",
  "accesstokenenc",
  "plaidaccesstoken",
  "public_token",
  "authorization",
  "apikey",
  "anthropic_api_key",
  "balance",
  "beneficiaryprimaryname",
  "beneficiarycontingentname",
]);

const REDACTED = "[REDACTED]";

export function redact<T>(value: T, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.has(k.toLowerCase())
        ? REDACTED
        : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export const log = {
  info(message: string, meta?: unknown) {
    // eslint-disable-next-line no-console
    console.log(`[info] ${message}`, meta ? redact(meta) : "");
  },
  warn(message: string, meta?: unknown) {
    // eslint-disable-next-line no-console
    console.warn(`[warn] ${message}`, meta ? redact(meta) : "");
  },
  error(message: string, meta?: unknown) {
    // eslint-disable-next-line no-console
    console.error(`[error] ${message}`, meta ? redact(meta) : "");
  },
};
