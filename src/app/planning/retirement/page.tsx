"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PlanningShell } from "@/components/planning/PlanningShell";
import { projectRetirement, RetirementResult } from "@/lib/planning/retirement";
import { DEFAULT_EXPECTED_RETURN } from "@/lib/planning/constants";
import { currency } from "@/lib/labels";

export default function RetirementPage() {
  const reduce = useReducedMotion();
  const [f, setF] = useState({
    currentAge: "45",
    retirementAge: "65",
    currentBalance: "200000",
    monthlyContribution: "1000",
    expectedReturnPct: String(DEFAULT_EXPECTED_RETURN * 100),
    inflationPct: "0",
    estimatedAnnualSocialSecurity: "24000",
    desiredAnnualSpending: "60000",
  });
  const [result, setResult] = useState<RetirementResult | null>(null);

  function compute(e: React.FormEvent) {
    e.preventDefault();
    setResult(
      projectRetirement({
        currentAge: num(f.currentAge),
        retirementAge: num(f.retirementAge),
        currentBalance: num(f.currentBalance),
        monthlyContribution: num(f.monthlyContribution),
        expectedAnnualReturn: num(f.expectedReturnPct) / 100,
        annualInflation: num(f.inflationPct) / 100,
        estimatedAnnualSocialSecurity: num(f.estimatedAnnualSocialSecurity),
        desiredAnnualSpending: num(f.desiredAnnualSpending),
      }),
    );
  }

  return (
    <PlanningShell
      title="Retirement income projection"
      subtitle="A simple “can I retire?” illustration. Enter your assumptions — everything here is adjustable and nothing is a recommendation."
    >
      <form onSubmit={compute} className="card grid gap-4 sm:grid-cols-2">
        <Field label="Current age" value={f.currentAge} onChange={(v) => setF({ ...f, currentAge: v })} />
        <Field label="Target retirement age" value={f.retirementAge} onChange={(v) => setF({ ...f, retirementAge: v })} />
        <Field label="Current savings balance ($)" value={f.currentBalance} onChange={(v) => setF({ ...f, currentBalance: v })} />
        <Field label="Monthly contribution ($)" value={f.monthlyContribution} onChange={(v) => setF({ ...f, monthlyContribution: v })} />
        <Field label="Expected annual return (%)" value={f.expectedReturnPct} onChange={(v) => setF({ ...f, expectedReturnPct: v })} hint="Default 6% (conservative). Adjustable." />
        <Field label="Expected inflation (%)" value={f.inflationPct} onChange={(v) => setF({ ...f, inflationPct: v })} hint="0 = nominal (today's-dollar results if > 0)." />
        <Field label="Est. annual Social Security ($)" value={f.estimatedAnnualSocialSecurity} onChange={(v) => setF({ ...f, estimatedAnnualSocialSecurity: v })} />
        <Field label="Desired annual spending ($)" value={f.desiredAnnualSpending} onChange={(v) => setF({ ...f, desiredAnnualSpending: v })} />
        <div className="sm:col-span-2">
          <button className="btn-primary">Project</button>
        </div>
      </form>

      {result && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card mt-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Projected balance at retirement" value={currency(result.projectedBalanceAtRetirement)} big />
            <Stat
              label="How long the balance would last"
              value={
                result.socialSecurityCoversSpending
                  ? "Social Security covers your spending"
                  : result.yearsBalanceLasts == null
                    ? "60+ years (does not deplete in the modeled horizon)"
                    : `≈ ${result.yearsBalanceLasts} years (to about age ${result.depletionAge})`
              }
              big
            />
            <Stat label="Years until retirement" value={`${result.yearsToRetirement}`} />
            <Stat label="Annual withdrawal needed (spending − Social Security)" value={currency(result.annualWithdrawalNeeded)} />
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Assumptions: {(result.assumptions.expectedAnnualReturn * 100).toFixed(1)}% nominal return
            {result.assumptions.annualInflation > 0
              ? `, ${(result.assumptions.annualInflation * 100).toFixed(1)}% inflation (results in today's dollars)`
              : ", no inflation adjustment (nominal dollars)"}
            . This is an illustration based on your inputs and assumptions, not a guarantee or a
            recommendation. It uses a simple depletion model, not a Monte Carlo simulation.
          </p>
        </motion.div>
      )}
    </PlanningShell>
  );
}

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        step="any"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={big ? "text-xl font-semibold text-slate-900" : "text-base font-medium text-slate-800"}>
        {value}
      </p>
    </div>
  );
}
