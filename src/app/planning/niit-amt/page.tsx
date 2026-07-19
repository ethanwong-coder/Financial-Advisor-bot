"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PlanningShell } from "@/components/planning/PlanningShell";
import { screenNiitAmt, NiitAmtResult } from "@/lib/planning/niit-amt";
import { FILING_STATUS_LABELS, FilingStatus } from "@/lib/planning/constants";
import { currency } from "@/lib/labels";

const EXPOSURE_STYLE: Record<string, string> = {
  NONE: "bg-slate-100 text-slate-600 border-slate-200",
  POSSIBLE: "bg-amber-50 text-amber-700 border-amber-200",
  ELEVATED: "bg-orange-50 text-orange-700 border-orange-200",
};

export default function NiitAmtPage() {
  const reduce = useReducedMotion();
  const [f, setF] = useState({
    filingStatus: "MARRIED_FILING_JOINTLY" as FilingStatus,
    modifiedAgi: "300000",
    netInvestmentIncome: "40000",
  });
  const [result, setResult] = useState<NiitAmtResult | null>(null);

  function compute(e: React.FormEvent) {
    e.preventDefault();
    setResult(
      screenNiitAmt({
        filingStatus: f.filingStatus,
        modifiedAgi: Number(f.modifiedAgi) || 0,
        netInvestmentIncome: Number(f.netInvestmentIncome) || 0,
      }),
    );
  }

  return (
    <PlanningShell
      requiredTier="PLUS"
      title="NIIT / AMT screener"
      subtitle="A quick screen for the 3.8% Net Investment Income Tax and a rough AMT exposure flag. Informational only."
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
          <label className="label">Modified AGI ($)</label>
          <input type="number" step="any" className="input" value={f.modifiedAgi} onChange={(e) => setF({ ...f, modifiedAgi: e.target.value })} />
        </div>
        <div>
          <label className="label">Net investment income ($)</label>
          <input type="number" step="any" className="input" value={f.netInvestmentIncome} onChange={(e) => setF({ ...f, netInvestmentIncome: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <button className="btn-primary">Screen</button>
        </div>
      </form>

      {result && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-6 grid gap-4 sm:grid-cols-2"
        >
          <div className="card">
            <h3 className="font-medium text-slate-900">Net Investment Income Tax (3.8%)</h3>
            {result.niit.applies ? (
              <>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{currency(result.niit.amount)}</p>
                <p className="mt-1 text-sm text-slate-600">
                  3.8% of {currency(result.niit.taxableBase)} (the lesser of your net investment income and
                  the {currency(result.niit.excessMagi)} by which your MAGI exceeds the {currency(result.niit.threshold)} threshold).
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                NIIT does not appear to apply — your MAGI is at or below the {currency(result.niit.threshold)} threshold
                for your filing status (or there is no net investment income).
              </p>
            )}
          </div>

          <div className="card">
            <h3 className="font-medium text-slate-900">AMT exposure (rough screen)</h3>
            <span
              className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                EXPOSURE_STYLE[result.amt.exposure]
              }`}
            >
              {result.amt.exposure}
            </span>
            <p className="mt-2 text-xs text-slate-500">
              Based on a {currency(result.amt.exemption)} AMT exemption (tax year {result.amt.taxYearBasis} figures)
              {result.amt.exemptionReduced ? ", partially phased out at this income." : "."}
            </p>
            <p className="mt-2 text-xs italic text-slate-500">{result.amt.note}</p>
          </div>
        </motion.div>
      )}
    </PlanningShell>
  );
}
