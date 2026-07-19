import { prisma } from "@/lib/db/prisma";
import { json, requireUser, serverError } from "@/lib/http";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { log } from "@/lib/log";

export const runtime = "nodejs";

/**
 * Opens Stripe's hosted Billing Portal so users update their card, switch plans,
 * or cancel — no custom UI from us. Returns { url } to redirect to.
 */
function requestOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;

  if (!isStripeConfigured()) {
    return json(
      {
        error: "billing_not_configured",
        message: "The billing portal isn't available yet — Stripe setup is pending.",
      },
      503,
    );
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });
  if (!sub?.stripeCustomerId) {
    return json(
      {
        error: "no_customer",
        message: "No billing account yet. Choose a plan first to set one up.",
      },
      400,
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${requestOrigin(req)}/settings/billing`,
    });
    return json({ url: session.url });
  } catch (err) {
    log.error("billing portal session failed", err);
    return serverError("Could not open the billing portal. Please try again.");
  }
}
