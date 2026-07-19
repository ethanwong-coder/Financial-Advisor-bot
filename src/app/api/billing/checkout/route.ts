import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { badRequest, json, requireUser, serverError } from "@/lib/http";
import { getStripe, isStripeConfigured, priceIdFor } from "@/lib/billing/stripe";
import { log } from "@/lib/log";

export const runtime = "nodejs";

/**
 * Creates a Stripe Checkout Session for the selected plan and returns { url } to
 * redirect the user to Stripe's hosted, PCI-compliant checkout — we never touch
 * raw card data. Tier is granted only later by the signature-verified webhook.
 */
const schema = z.object({
  tier: z.enum(["PLUS", "PRO"]),
  interval: z.enum(["MONTHLY", "ANNUAL"]),
});

function requestOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
  const { tier, interval } = parsed.data;

  if (!isStripeConfigured()) {
    return json(
      {
        error: "billing_not_configured",
        message:
          "Billing isn't enabled yet — Stripe setup is pending. Once the Stripe keys and price IDs are added, this button will open secure checkout.",
      },
      503,
    );
  }

  const priceId = priceIdFor(tier, interval);
  if (!priceId) {
    return json(
      {
        error: "billing_not_configured",
        message: `The ${tier} (${interval.toLowerCase()}) plan isn't configured yet. Add its Stripe price ID to enable it.`,
      },
      503,
    );
  }

  try {
    const stripe = getStripe();

    // Find or create the Stripe Customer for this user, persisting the id so we
    // reuse it on every future checkout / portal visit.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, subscription: { select: { stripeCustomerId: true } } },
    });
    if (!user) return serverError("User not found.");

    let customerId = user.subscription?.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      customerId = customer.id;
      // Placeholder row (still FREE until the webhook upgrades it) that carries
      // the customer mapping.
      await prisma.subscription.upsert({
        where: { userId },
        create: { userId, stripeCustomerId: customerId },
        update: { stripeCustomerId: customerId },
      });
    }

    const origin = requestOrigin(req);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      // metadata on BOTH the session and the resulting subscription so the
      // webhook can resolve the user from either object.
      metadata: { userId, tier, interval },
      subscription_data: { metadata: { userId, tier, interval } },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?checkout=canceled`,
    });

    if (!session.url) return serverError("Stripe did not return a checkout URL.");
    return json({ url: session.url });
  } catch (err) {
    log.error("checkout session create failed", err);
    return serverError("Could not start checkout. Please try again.");
  }
}
