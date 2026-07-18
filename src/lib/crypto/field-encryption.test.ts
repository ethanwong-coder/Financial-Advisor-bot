import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { decryptField, encryptField, maskLast4 } from "./field-encryption";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("field encryption (AES-256-GCM)", () => {
  it("round-trips a value", () => {
    const secret = "123456789";
    const enc = encryptField(secret)!;
    expect(enc).not.toContain(secret); // ciphertext must not reveal plaintext
    expect(decryptField(enc)).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encryptField("same")).not.toBe(encryptField("same"));
  });

  it("returns null for empty/nullish input", () => {
    expect(encryptField("")).toBeNull();
    expect(encryptField(null)).toBeNull();
    expect(decryptField(null)).toBeNull();
  });

  it("detects tampering via the auth tag", () => {
    const enc = encryptField("tamper-me")!;
    const bytes = Buffer.from(enc, "base64");
    bytes[bytes.length - 1] ^= 0xff; // flip a ciphertext bit
    expect(() => decryptField(bytes.toString("base64"))).toThrow();
  });

  it("masks all but the last 4 characters", () => {
    expect(maskLast4("1234567890")).toBe("••••7890");
    expect(maskLast4("12")).toBe("••••");
  });
});
