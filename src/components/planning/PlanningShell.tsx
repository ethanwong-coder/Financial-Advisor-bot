"use client";

import Link from "next/link";
import { PLANNING_DISCLAIMER } from "@/lib/planning/constants";
import { Tier } from "@/lib/billing/tiers";
import { Gate } from "@/components/billing/Gate";

/** Consistent layout for every planning tool: back link, title, subtitle, body,
 * and the required informational disclaimer. When `requiredTier` is set, the
 * body is gated (UI); the tool's API routes enforce access server-side too. */
export function PlanningShell({
  title,
  subtitle,
  requiredTier,
  children,
}: {
  title: string;
  subtitle: string;
  requiredTier?: Tier;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="text-sm text-brand hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        <span className="text-gradient">{title}</span>
      </h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-6">
        {requiredTier && requiredTier !== "FREE" ? (
          <Gate requiredTier={requiredTier} label={title.toLowerCase()}>
            {children}
          </Gate>
        ) : (
          children
        )}
      </div>
      <p className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs italic text-amber-900">
        {PLANNING_DISCLAIMER}
      </p>
    </div>
  );
}
