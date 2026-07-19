"use client";

import { PlanningShell } from "@/components/planning/PlanningShell";

export default function FamilyPage() {
  return (
    <PlanningShell
      requiredTier="PRO"
      title="Family & multi-user accounts"
      subtitle="Link a second person's finances (e.g. a parent) under your Pro subscription."
    >
      <div className="card text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-brand-dark text-white shadow">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="9" cy="8" r="3" />
            <circle cx="17" cy="9" r="2.5" />
            <path d="M3 20a6 6 0 0 1 12 0M14.5 20a5 5 0 0 1 6.5-4.8" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="font-medium text-slate-900">Coming soon</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          Multi-user / family accounts let a Pro subscriber invite a second person and track their
          finances alongside their own under one subscription. Pro entitlement and gating are in
          place; the invite-and-link flow (with its own access-control model) is next on the roadmap.
        </p>
      </div>
    </PlanningShell>
  );
}
