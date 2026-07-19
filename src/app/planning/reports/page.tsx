"use client";

import { PlanningShell } from "@/components/planning/PlanningShell";

export default function ReportsPage() {
  return (
    <PlanningShell
      requiredTier="PRO"
      title="PDF reports"
      subtitle="Export a summary of your flags and planning outputs to hand to a CPA or attorney."
    >
      <div className="card text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-brand-dark text-white shadow">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
            <path d="M14 3v4h4M9 13h6M9 17h6" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="font-medium text-slate-900">Coming soon</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          A one-click export that compiles your open flags and the outputs of the planning tools into
          a clean PDF suitable to hand to a professional. Pro entitlement and gating are in place; the
          report generator is next on the roadmap.
        </p>
        <button className="btn-primary mt-4" disabled>
          Generate PDF (coming soon)
        </button>
      </div>
    </PlanningShell>
  );
}
