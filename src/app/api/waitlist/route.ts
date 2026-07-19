import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { badRequest, json, serverError } from "@/lib/http";
import { sendEmail } from "@/lib/email/send";
import {
  CONFIRM_TOKEN_TTL_MS,
  buildConfirmationEmail,
  generateConfirmToken,
} from "@/lib/waitlist";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  // Honeypot: a real <input> hidden from humans. Bots fill it; humans leave it
  // empty. Any value here => treat as spam and no-op with a fake success. We
  // accept any string and enforce "must be empty" in code (below).
  website: z.string().optional(),
});

// --- Simple in-memory rate limit (no CAPTCHA), per client IP. ---------------
// Best-effort spam protection. Resets on server restart and is per-instance,
// which is fine for a waitlist. Map growth is bounded in practice by pruning
// expired windows on each hit.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function requestOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  if (rateLimited(clientIp(req))) {
    return json(
      { ok: false, error: "rate_limited", message: "Too many attempts. Please try again in a few minutes." },
      429,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Please enter a valid email address.", parsed.error.flatten());
  }
  const { email, website } = parsed.data;

  // Honeypot tripped — respond exactly like the happy path but do nothing, so a
  // bot can't tell it was filtered.
  if (website && website.length > 0) {
    return json({ ok: true, status: "pending" });
  }

  try {
    const existing = await prisma.waitlistSignup.findUnique({ where: { email } });

    // Already confirmed — dedupe quietly, don't resend or error.
    if (existing?.confirmedAt) {
      return json({ ok: true, status: "confirmed" });
    }

    // New signup, or an unconfirmed one re-submitting: (re)issue a fresh token.
    const token = generateConfirmToken();
    const tokenExpiresAt = new Date(Date.now() + CONFIRM_TOKEN_TTL_MS);
    await prisma.waitlistSignup.upsert({
      where: { email },
      create: { email, token, tokenExpiresAt },
      update: { token, tokenExpiresAt },
    });

    const { subject, text } = buildConfirmationEmail(requestOrigin(req), token);
    await sendEmail({ to: email, subject, text });

    return json({ ok: true, status: "pending" });
  } catch (err) {
    log.error("waitlist signup failed", err);
    return serverError("Could not join the waitlist. Please try again.");
  }
}
