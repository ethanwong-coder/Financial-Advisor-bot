import { prisma } from "@/lib/db/prisma";
import { getUserTier } from "@/lib/billing/entitlements";
import { json, requireUser } from "@/lib/http";

export const runtime = "nodejs";

/** Current user's tier + subscription snapshot, for UI gating and the settings page. */
export async function GET() {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;

  const [tier, sub] = await Promise.all([
    getUserTier(userId),
    prisma.subscription.findUnique({
      where: { userId },
      select: { status: true, billingInterval: true, currentPeriodEnd: true },
    }),
  ]);

  return json({
    tier,
    status: sub?.status ?? null,
    billingInterval: sub?.billingInterval ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    billingConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
  });
}
