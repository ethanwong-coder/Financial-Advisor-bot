import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Stripe webhook — PENDING STRIPE SETUP. THE SINGLE SOURCE OF TRUTH FOR TIER.
 *
 * Client state is never trusted for gating; only this signature-verified webhook
 * writes the Subscription row (tier / status / currentPeriodEnd). Signature
 * verification is MANDATORY — unsigned / invalid requests must be rejected.
 *
 * TODO (when the user says Stripe is ready), implement:
 *   1. Read the raw body (do NOT JSON-parse first) and the `stripe-signature` header.
 *   2. event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
 *      — on failure return 400 (reject unsigned/invalid).
 *   3. Handle:
 *      - checkout.session.completed        -> upsert Subscription (customer + sub id, tier
 *                                             from the price, status ACTIVE, currentPeriodEnd)
 *      - customer.subscription.updated     -> update tier/interval/status/currentPeriodEnd
 *      - customer.subscription.deleted     -> status CANCELED (getUserTier then returns FREE)
 *      - invoice.payment_failed            -> status PAST_DUE
 *      Map the Stripe price id back to { tier, interval } via the STRIPE_*_PRICE_ID envs,
 *      and map Stripe statuses (active/trialing/past_due/canceled/unpaid) to our enum.
 *   4. Always return 200 quickly for handled events so Stripe doesn't retry.
 *
 * Until STRIPE_WEBHOOK_SECRET is set, we reject so nothing can spoof a tier change.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    // Not configured yet — refuse rather than accept unverified events.
    return NextResponse.json(
      { error: "billing_not_configured", message: "Webhook handling pending Stripe setup." },
      { status: 503 },
    );
  }

  // Signature verification is mandatory. Reject anything unsigned.
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  // Implementation lands with Stripe setup (see TODO above).
  return NextResponse.json({ error: "not_implemented" }, { status: 503 });
}
