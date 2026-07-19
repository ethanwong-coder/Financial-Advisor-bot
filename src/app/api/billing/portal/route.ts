import { json, requireUser } from "@/lib/http";

export const runtime = "nodejs";

/**
 * Stripe Billing Portal — PENDING STRIPE SETUP.
 *
 * When configured, returns { url } to Stripe's hosted Billing Portal so users
 * upgrade / downgrade / cancel / update their card without any custom UI from us.
 *
 * TODO (when Stripe is ready):
 *   - look up the user's stripeCustomerId from the Subscription row
 *   - stripe.billingPortal.sessions.create({ customer, return_url })
 *   - return json({ url: session.url })
 */
export async function POST() {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;

  if (!process.env.STRIPE_SECRET_KEY) {
    return json(
      {
        error: "billing_not_configured",
        message: "The billing portal isn't available yet — Stripe setup is pending.",
      },
      503,
    );
  }

  return json(
    { error: "billing_not_configured", message: "Portal implementation pending Stripe setup." },
    503,
  );
}
