import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { log } from "@/lib/log";

export const runtime = "nodejs";

function requestOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

/** Send the browser to the human-facing result page with a status reason. */
function resultRedirect(req: Request, status: string) {
  const url = new URL("/waitlist/confirmed", requestOrigin(req));
  url.searchParams.set("status", status);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token) return resultRedirect(req, "invalid");

  try {
    const signup = await prisma.waitlistSignup.findUnique({ where: { token } });

    // Unknown or superseded token (a re-signup rotates the token).
    if (!signup) return resultRedirect(req, "invalid");

    // Idempotent: clicking a still-valid link twice just says "already done".
    if (signup.confirmedAt) return resultRedirect(req, "already");

    // Expired link — offer to sign up again rather than crashing.
    if (signup.tokenExpiresAt.getTime() < Date.now()) {
      return resultRedirect(req, "expired");
    }

    await prisma.waitlistSignup.update({
      where: { id: signup.id },
      data: { confirmedAt: new Date() },
    });
    return resultRedirect(req, "ok");
  } catch (err) {
    log.error("waitlist confirm failed", err);
    return resultRedirect(req, "error");
  }
}
