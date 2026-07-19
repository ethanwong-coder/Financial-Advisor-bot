"use client";

import { useState } from "react";
import { PlanningShell } from "@/components/planning/PlanningShell";
import { Tabs } from "@/components/planning/Tabs";
import { NumberField, ResultCard, SelectField, Stat } from "@/components/planning/ui";
import {
  disabilityNeed,
  DisabilityNeedResult,
  lifeInsuranceNeed,
  LifeNeedResult,
  ltcNeed,
  LtcNeedResult,
} from "@/lib/planning/insurance";
import { CARE_TYPE_LABELS, CareType, LTC_VERIFY_NOTE } from "@/lib/planning/ltc-costs";
import { currency } from "@/lib/labels";

const INS_NOTE =
  "This shows an estimated coverage gap only. Choosing a specific policy requires a licensed insurance agent — this tool does not recommend or sell any product.";

function InsNote() {
  return <p className="mt-3 text-xs italic text-slate-500">{INS_NOTE}</p>;
}

function LifeTab() {
  const [f, setF] = useState({
    annualIncome: "100000",
    incomeReplacementYears: "10",
    outstandingDebts: "250000",
    finalExpenses: "20000",
    educationGoals: "150000",
    existingCoverage: "500000",
    liquidAssets: "100000",
  });
  const [r, setR] = useState<LifeNeedResult | null>(null);
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setR(
            lifeInsuranceNeed({
              annualIncome: n(f.annualIncome),
              incomeReplacementYears: n(f.incomeReplacementYears),
              outstandingDebts: n(f.outstandingDebts),
              finalExpenses: n(f.finalExpenses),
              educationGoals: n(f.educationGoals),
              existingCoverage: n(f.existingCoverage),
              liquidAssets: n(f.liquidAssets),
            }),
          );
        }}
        className="card grid gap-4 sm:grid-cols-2"
      >
        <NumberField label="Annual income ($)" value={f.annualIncome} onChange={(v) => setF({ ...f, annualIncome: v })} />
        <NumberField label="Years of income to replace" value={f.incomeReplacementYears} onChange={(v) => setF({ ...f, incomeReplacementYears: v })} />
        <NumberField label="Outstanding debts ($)" value={f.outstandingDebts} onChange={(v) => setF({ ...f, outstandingDebts: v })} />
        <NumberField label="Final expenses ($)" value={f.finalExpenses} onChange={(v) => setF({ ...f, finalExpenses: v })} />
        <NumberField label="Education goals ($)" value={f.educationGoals} onChange={(v) => setF({ ...f, educationGoals: v })} />
        <NumberField label="Existing coverage ($)" value={f.existingCoverage} onChange={(v) => setF({ ...f, existingCoverage: v })} />
        <NumberField label="Liquid assets ($)" value={f.liquidAssets} onChange={(v) => setF({ ...f, liquidAssets: v })} />
        <div className="sm:col-span-2">
          <button className="btn-primary">Estimate gap</button>
        </div>
      </form>
      {r && (
        <ResultCard>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Total need" value={currency(r.totalNeed)} big />
            <Stat label="Existing resources" value={currency(r.existingResources)} />
            {r.gap > 0 ? (
              <Stat label="Estimated coverage gap" value={currency(r.gap)} big warn />
            ) : (
              <Stat label="Estimated surplus" value={currency(r.surplus)} big good />
            )}
          </div>
          <InsNote />
        </ResultCard>
      )}
    </>
  );
}

function DisabilityTab() {
  const [f, setF] = useState({ annualIncome: "100000", replacementPct: "60", existingMonthlyBenefit: "1000" });
  const [r, setR] = useState<DisabilityNeedResult | null>(null);
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setR(
            disabilityNeed({
              annualIncome: n(f.annualIncome),
              replacementPct: n(f.replacementPct) / 100,
              existingMonthlyBenefit: n(f.existingMonthlyBenefit),
            }),
          );
        }}
        className="card grid gap-4 sm:grid-cols-2"
      >
        <NumberField label="Annual income ($)" value={f.annualIncome} onChange={(v) => setF({ ...f, annualIncome: v })} />
        <NumberField label="Income to replace (%)" value={f.replacementPct} onChange={(v) => setF({ ...f, replacementPct: v })} hint="Typically 60%." />
        <NumberField label="Existing monthly benefit ($)" value={f.existingMonthlyBenefit} onChange={(v) => setF({ ...f, existingMonthlyBenefit: v })} />
        <div className="sm:col-span-2">
          <button className="btn-primary">Estimate gap</button>
        </div>
      </form>
      {r && (
        <ResultCard>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Target monthly benefit" value={currency(r.targetMonthlyBenefit)} big />
            <Stat label="Existing monthly benefit" value={currency(r.existingMonthlyBenefit)} />
            <Stat label="Monthly gap" value={currency(r.monthlyGap)} big warn={r.monthlyGap > 0} />
          </div>
          <InsNote />
        </ResultCard>
      )}
    </>
  );
}

function LtcTab() {
  const [f, setF] = useState({ careType: "ASSISTED_LIVING", yearsOfCare: "3", earmarkedSavings: "100000", override: "" });
  const [r, setR] = useState<LtcNeedResult | null>(null);
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setR(
            ltcNeed({
              careType: f.careType as CareType,
              yearsOfCare: n(f.yearsOfCare),
              earmarkedSavings: n(f.earmarkedSavings),
              annualCostOverride: f.override ? n(f.override) : undefined,
            }),
          );
        }}
        className="card grid gap-4 sm:grid-cols-2"
      >
        <SelectField
          label="Type of care"
          value={f.careType}
          onChange={(v) => setF({ ...f, careType: v })}
          options={Object.entries(CARE_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <NumberField label="Years of care" value={f.yearsOfCare} onChange={(v) => setF({ ...f, yearsOfCare: v })} />
        <NumberField label="Savings earmarked for care ($)" value={f.earmarkedSavings} onChange={(v) => setF({ ...f, earmarkedSavings: v })} />
        <NumberField label="Override annual cost ($, optional)" value={f.override} onChange={(v) => setF({ ...f, override: v })} hint={LTC_VERIFY_NOTE} />
        <div className="sm:col-span-2">
          <button className="btn-primary">Estimate gap</button>
        </div>
      </form>
      {r && (
        <ResultCard>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Annual cost used" value={currency(r.annualCost)} />
            <Stat label="Estimated total cost" value={currency(r.estimatedTotalCost)} big />
            <Stat label="Coverage gap" value={currency(r.gap)} big warn={r.gap > 0} />
          </div>
          <InsNote />
        </ResultCard>
      )}
    </>
  );
}

export default function InsurancePage() {
  return (
    <PlanningShell
      requiredTier="PLUS"
      title="Insurance needs analysis"
      subtitle="Estimate coverage gaps for life, disability, and long-term-care insurance. Gaps only — no products recommended."
    >
      <Tabs
        tabs={[
          { key: "life", label: "Life", content: <LifeTab /> },
          { key: "disability", label: "Disability", content: <DisabilityTab /> },
          { key: "ltc", label: "Long-term care", content: <LtcTab /> },
        ]}
      />
    </PlanningShell>
  );
}

function n(v: string): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
