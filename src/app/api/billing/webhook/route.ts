import Stripe from "stripe";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  getStripe,
  periodEndOf,
  priceIdOf,
  statusFromStripe,
  tierIntervalForPriceId,
  type Interval,
} from "@/lib/billing/stripe";
import type { Tier } from "@/lib/billing/tiers";
import { log } from "@/lib/log";

export const runtime = "nodejs";

/**
 * Stripe webhook — THE SINGLE SOURCE OF TRUTH FOR TIER.
 *
 * Client state is never trusted for gating; only this signature-verified handler
 * writes the Subscription row that getUserTier() reads. Unsigned / invalid
 * requests are rejected (400). Handled events return 200 so Stripe won't retry.
 */
function customerIdOf(customer: string | { id: string } | null): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

/** Upsert our Subscription row from a Stripe subscription object. */
async function applySubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = customerIdOf(sub.customer);
  if (!customerId) return;

  // Resolve the user: prefer the metadata we stamped at checkout, else fall back
  // to the stored customer mapping.
  let userId = (sub.metadata?.userId as string | undefined) || undefined;
  if (!userId) {
    const existing = await prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
      select: { userId: true },
    });
    userId = existing?.userId;
  }
  if (!userId) {
    log.warn("webhook: could not resolve user for subscription", { sub: sub.id });
    return;
  }

  const mapped = tierIntervalForPriceId(priceIdOf(sub));
  const tier: Tier | undefined = mapped?.tier ?? (sub.metadata?.tier as Tier | undefined);
  const interval: Interval | undefined =
    mapped?.interval ?? (sub.metadata?.interval as Interval | undefined);
  const status = statusFromStripe(sub.status);
  const currentPeriodEnd = periodEndOf(sub);

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      tier: tier ?? "FREE",
      billingInterval: interval ?? null,
      status,
      currentPeriodEnd,
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      ...(tier ? { tier } : {}),
      ...(interval ? { billingInterval: interval } : {}),
      status,
      currentPeriodEnd,
    },
  });
  log.info("webhook: subscription applied", { userId, tier: tier ?? "FREE", status });
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    // Not configured — refuse rather than accept unverified events.
    return NextResponse.json(
      { error: "billing_not_configured", message: "Webhook handling pending Stripe setup." },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  // Verify against the RAW body — do not JSON-parse first.
  const raw = await req.text();
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    log.warn("webhook: signature verification failed", { message: (err as Error).message });
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          if (!sub.metadata?.userId) {
            const uid =
              session.client_reference_id ?? (session.metadata?.userId as string | undefined);
            if (uid) sub.metadata = { ...sub.metadata, userId: uid };
          }
          await applySubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await applySubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = customerIdOf(sub.customer);
        if (customerId) {
          await prisma.subscription.updateMany({
            where: { stripeCustomerId: customerId },
            data: { status: "CANCELED" },
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = customerIdOf(invoice.customer);
        if (customerId) {
          await prisma.subscription.updateMany({
            where: { stripeCustomerId: customerId },
            data: { status: "PAST_DUE" },
          });
        }
        break;
      }
      default:
        // Unhandled event types are acknowledged so Stripe stops sending them.
        break;
    }
  } catch (err) {
    log.error("webhook: handler failed", err);
    // 500 so Stripe retries (transient DB issues, etc.).
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
