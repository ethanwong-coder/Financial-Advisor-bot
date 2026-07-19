/**
 * Shared waitlist helpers: single-use confirmation tokens and the (plain-text)
 * confirmation email. Kept provider-agnostic — see src/lib/email/send.ts.
 */
import { randomBytes } from "node:crypto";

/** Confirmation links are valid for this long after signup. */
export const CONFIRM_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 3; // 3 days

/** 32 bytes of entropy, URL-safe hex. Long enough to be unguessable. */
export function generateConfirmToken(): string {
  return randomBytes(32).toString("hex");
}

/** Absolute URL a recipient clicks to confirm. `origin` comes from the request. */
export function buildConfirmUrl(origin: string, token: string): string {
  const url = new URL("/api/waitlist/confirm", origin);
  url.searchParams.set("token", token);
  return url.toString();
}

export function buildConfirmationEmail(
  origin: string,
  token: string,
): { subject: string; text: string } {
  const confirmUrl = buildConfirmUrl(origin, token);
  return {
    subject: "Confirm your spot on the Advisr waitlist",
    text: [
      "Thanks for joining the Advisr waitlist!",
      "",
      "Please confirm your email by opening the link below:",
      confirmUrl,
      "",
      "This link expires in 3 days. If you didn't request this, you can ignore",
      "this email and nothing will happen.",
      "",
      "— Advisr",
    ].join("\n"),
  };
}
