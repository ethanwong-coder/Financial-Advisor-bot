"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Tier, TIER_LABELS } from "@/lib/billing/tiers";

/** Inline upgrade prompt shown where a lower-tier user hits a gated feature. */
export function UpgradePrompt({
  requiredTier,
  label,
}: {
  requiredTier: Tier;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const tierName = TIER_LABELS[requiredTier];
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
      <Link href="/pricing" className="btn-primary mt-4 inline-flex">
        See plans
      </Link>
    </motion.div>
  );
}
