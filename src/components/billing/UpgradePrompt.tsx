"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { PRICING, Tier, TIER_LABELS } from "@/lib/billing/tiers";
import { Spinner } from "@/components/Spinner";
import { startCheckout } from "./checkout";

/**
 * Inline upgrade prompt shown where a lower-tier user hits a gated feature.
 * Primary CTA goes straight to Stripe Checkout for the required tier (annual, the
 * best value); a secondary link compares all plans.
 */
export function UpgradePrompt({
  requiredTier,
  label,
}: {
  requiredTier: Tier;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const tierName = TIER_LABELS[requiredTier];
  const paidTier = requiredTier === "PRO" ? "PRO" : "PLUS";
  const annual = PRICING[paidTier].annual;

  async function upgrade() {
    setBusy(true);
    setNotice(null);
    const result = await startCheckout(paidTier, "ANNUAL");
    if (!result.ok) {
      setBusy(false);
      if (result.status === 401) {
        router.push("/register");
        return;
      }
      setNotice(result.message);
    }
    // On success the browser is redirecting to Stripe; leave busy=true.
  }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="card border-brand/30 text-center"
    >
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-brand-dark text-white shadow">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <h3 className="font-semibold text-slate-900">This is a {tierName} feature</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
        Upgrade to {tierName} to unlock {label ?? "this tool"}.
      </p>

      {notice && (
        <div className="mx-auto mt-3 max-w-sm rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {notice}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button onClick={upgrade} disabled={busy} className="btn-primary inline-flex">
          {busy ? (
            <>
              <Spinner className="mr-2 h-4 w-4" /> Starting…
            </>
          ) : (
            `Upgrade to ${tierName} — $${annual}/yr`
          )}
        </button>
        <Link href="/pricing" className="btn-secondary inline-flex">
          Compare plans
        </Link>
      </div>
    </motion.div>
  );
}
