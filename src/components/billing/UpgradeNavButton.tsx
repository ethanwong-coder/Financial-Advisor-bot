"use client";

import Link from "next/link";
import { useTier } from "./useTier";

/**
 * Always-visible upgrade entry point for the main nav. Links to the plans page.
 * Hidden while the tier is loading and for Pro users (nothing left to upsell).
 */
export function UpgradeNavButton() {
  const tier = useTier();
  if (tier == null || tier === "PRO") return null;

  return (
    <Link
      href="/pricing"
      className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-teal-400 to-brand-dark px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l2.4 5.6L20 9.2l-4.2 3.9L17 19l-5-3-5 3 1.2-5.9L4 9.2l5.6-1.6z" />
      </svg>
      {tier === "PLUS" ? "Go Pro" : "Upgrade"}
    </Link>
  );
}
