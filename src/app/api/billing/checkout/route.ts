import { z } from "zod";
import { badRequest, json, requireUser } from "@/lib/http";

export const runtime = "nodejs";

/**
 * Stripe Checkout — PENDING STRIPE SETUP.
 *
 * When Stripe is configured, this creates a Checkout Session for the selected
 * price and returns { url } to redirect the user to Stripe's hosted checkout
 * (so we never touch raw card data). Until STRIPE_SECRET_KEY + the price IDs are
 * set, it returns a clear "billing not configured" 503 instead of crashing.
 *
 * TODO (when the user says Stripe is ready):
 *   - `npm i stripe`; `const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)`
 *   - map { tier: PLUS|PRO, interval: MONTHLY|ANNUAL } -> the STRIPE_*_PRICE_ID env
 *   - find-or-create a Stripe Customer for this user (store stripeCustomerId)
 *   - stripe.checkout.sessions.create({ mode: "subscription", line_items:[{price, quantity:1}],
 *       customer, success_url, cancel_url, metadata:{ userId } })
 *   - return json({ url: session.url })
 */
const schema = z.object({
  tier: z.enum(["PLUS", "PRO"]),
  interval: z.enum(["MONTHLY", "ANNUAL"]),
});

const PRICE_ENV: Record<string, string> = {
  PLUS_MONTHLY: "STRIPE_PLUS_MONTHLY_PRICE_ID",
  PLUS_ANNUAL: "STRIPE_PLUS_ANNUAL_PRICE_ID",
  PRO_MONTHLY: "STRIPE_PRO_MONTHLY_PRICE_ID",
  PRO_ANNUAL: "STRIPE_PRO_ANNUAL_PRICE_ID",
};

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

  const priceEnv = PRICE_ENV[`${parsed.data.tier}_${parsed.data.interval}`];
  if (!process.env.STRIPE_SECRET_KEY || !process.env[priceEnv]) {
    return json(
      {
        error: "billing_not_configured",
        message:
          "Billing isn't enabled yet — Stripe setup is pending. Once the Stripe keys and price IDs are added, this button will open secure checkout.",
      },
      503,
    );
  }

  // Reached only once Stripe env is present; implementation lands with Stripe setup.
  return json(
    { error: "billing_not_configured", message: "Checkout implementation pending Stripe setup." },
    503,
  );
}
