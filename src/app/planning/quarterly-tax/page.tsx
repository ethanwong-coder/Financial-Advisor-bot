"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PlanningShell } from "@/components/planning/PlanningShell";
import {
  computeQuarterlyTax,
  QuarterlyTaxResult,
} from "@/lib/planning/quarterly-tax";
import { FILING_STATUS_LABELS, FilingStatus } from "@/lib/planning/constants";
import { currency } from "@/lib/labels";

const QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4"];

export default function QuarterlyTaxPage() {
  const reduce = useReducedMotion();
  const [f, setF] = useState({
    filingStatus: "SINGLE" as FilingStatus,
    priorYearTaxLiability: "30000",
    priorYearAgi: "180000",
    currentYearEstimatedTax: "",
  });
  const [result, setResult] = useState<QuarterlyTaxResult | null>(null);

  function compute(e: React.FormEvent) {
    e.preventDefault();
    setResult(
      computeQuarterlyTax({
        filingStatus: f.filingStatus,
        priorYearTaxLiability: Number(f.priorYearTaxLiability) || 0,
        priorYearAgi: f.priorYearAgi ? Number(f.priorYearAgi) : undefined,
        currentYearEstimatedTax: f.currentYearEstimatedTax
          ? Number(f.currentYearEstimatedTax)
          : undefined,
      }),
    );
  }

  return (
    <PlanningShell
      title="Estimated quarterly tax calculator"
      subtitle="IRS safe-harbor estimate: the smaller of 90% of this year's tax or 100%/110% of last year's. Informational — confirm with your CPA."
    >
      <form onSubmit={compute} className="card grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Filing status</label>
          <select
            className="input"
            value={f.filingStatus}
            onChange={(e) => setF({ ...f, filingStatus: e.target.value as FilingStatus })}
          >
            {Object.entries(FILING_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Prior-year total tax liability ($)</label>
          <input type="number" step="any" className="input" value={f.priorYearTaxLiability} onChange={(e) => setF({ ...f, priorYearTaxLiability: e.target.value })} />
        </div>
        <div>
          <label className="label">Prior-year AGI ($)</label>
          <input type="number" step="any" className="input" value={f.priorYearAgi} onChange={(e) => setF({ ...f, priorYearAgi: e.target.value })} />
          <p className="mt-1 text-xs text-slate-400">Determines the 100% vs 110% multiplier.</p>
        </div>
        <div>
          <label className="label">Current-year projected tax ($, optional)</label>
          <input type="number" step="any" className="input" value={f.currentYearEstimatedTax} onChange={(e) => setF({ ...f, currentYearEstimatedTax: e.target.value })} />
          <p className="mt-1 text-xs text-slate-400">Enables the 90%-of-current-year test.</p>
        </div>
        <div className="sm:col-span-2">
          <button className="btn-primary">Calculate</button>
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
            <div>
              <p className="text-xs text-slate-500">Each quarterly payment</p>
              <p className="text-2xl font-semibold text-slate-900">{currency(result.perQuarter)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total for the year ({result.taxYear})</p>
              <p className="text-2xl font-semibold text-slate-900">{currency(result.requiredAnnualPayment)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Safe-harbor basis: <span className="font-medium">{result.basis}</span>.
          </p>
          {result.agiAssumed && (
            <p className="mt-1 text-xs text-amber-700">
              Prior-year AGI wasn&apos;t provided, so the 100% multiplier was assumed. If your prior-year
              AGI exceeded $150k the safe harbor is 110%.
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {result.dueDates.map((d, i) => (
              <div key={d} className="rounded-lg border border-slate-200/70 bg-white/60 px-3 py-2 text-center">
                <p className="text-xs text-slate-400">{QUARTER_LABELS[i]} due</p>
                <p className="text-sm font-medium text-slate-800">
                  {new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: "UTC" })}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Due dates shift to the next business day when they fall on a weekend or holiday.
          </p>
        </motion.div>
      )}
    </PlanningShell>
  );
}
