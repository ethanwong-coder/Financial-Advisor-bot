"use client";

import { useState } from "react";
import { PlanningShell } from "@/components/planning/PlanningShell";
import { NumberField, ResultCard } from "@/components/planning/ui";
import { compareBusinessPlans, BusinessPlanComparison } from "@/lib/planning/business-retirement";
import { currency } from "@/lib/labels";

const PLAN_LABELS: Record<string, string> = {
  SEP_IRA: "SEP IRA",
  SIMPLE_IRA: "SIMPLE IRA",
  SOLO_401K: "Solo 401(k)",
};

export default function BusinessRetirementPage() {
  const [income, setIncome] = useState("120000");
  const [age, setAge] = useState("45");
  const [r, setR] = useState<BusinessPlanComparison | null>(null);

  return (
    <PlanningShell
      requiredTier="PRO"
      title="Business retirement plan comparison"
      subtitle="An educational side-by-side of SEP IRA, SIMPLE IRA, and Solo 401(k) contribution room. Not a recommendation on which to choose."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setR(compareBusinessPlans({ netSelfEmploymentIncome: Number(income) || 0, age: Number(age) || 0 }));
        }}
        className="card grid gap-4 sm:grid-cols-2"
      >
        <NumberField label="Net self-employment income ($)" value={income} onChange={setIncome} />
        <NumberField label="Age" value={age} onChange={setAge} />
        <div className="sm:col-span-2"><button className="btn-primary">Compare plans</button></div>
      </form>

      {r && (
        <ResultCard>
          <div className="grid gap-3 sm:grid-cols-3">
            {r.plans.map((p) => (
              <div key={p.plan} className="rounded-xl border border-slate-200/70 bg-white/60 p-4">
                <h4 className="font-medium text-slate-900">{PLAN_LABELS[p.plan]}</h4>
                <p className="mt-1 text-xl font-semibold text-slate-900">{currency(p.maxContribution)}</p>
                <p className="mt-1 text-xs text-slate-500">{p.breakdown}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {r.verifyNote} These are simplified estimates using an approximate ~20% effective employer rate for the
            self-employed. Consult a CPA or plan administrator to set one up.
          </p>
        </ResultCard>
      )}
    </PlanningShell>
  );
}
