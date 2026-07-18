"use client";

import { useState } from "react";
import { PlanningShell } from "@/components/planning/PlanningShell";
import { Tabs } from "@/components/planning/Tabs";
import { NumberField, ResultCard, Stat } from "@/components/planning/ui";
import { emergencyFund, summarizeBudget, BudgetResult, EmergencyFundResult } from "@/lib/planning/cashflow";
import { compareRefinance, RefiResult } from "@/lib/planning/mortgage";
import { comparePayoff, Debt, PayoffComparison } from "@/lib/planning/debt-payoff";
import { currency } from "@/lib/labels";

function n(v: string): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

// --- Budget ---
function BudgetTab() {
  const [income, setIncome] = useState("8000");
  const [lines, setLines] = useState([
    { category: "Housing", amount: "2500" },
    { category: "Food", amount: "800" },
    { category: "Transportation", amount: "500" },
  ]);
  const [r, setR] = useState<BudgetResult | null>(null);
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setR(summarizeBudget(n(income), lines.map((l) => ({ category: l.category, amount: n(l.amount) }))));
        }}
        className="card space-y-3"
      >
        <NumberField label="Monthly income ($)" value={income} onChange={setIncome} />
        <p className="label">Monthly expenses</p>
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2">
            <input className="input" placeholder="Category" value={l.category} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)))} />
            <input className="input" type="number" placeholder="Amount" value={l.amount} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
            <button type="button" className="text-xs text-slate-400 hover:text-rose-600" onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button type="button" className="text-sm text-brand hover:underline" onClick={() => setLines([...lines, { category: "", amount: "" }])}>+ Add expense</button>
        <div><button className="btn-primary">Summarize</button></div>
      </form>
      {r && (
        <ResultCard>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Total expenses" value={currency(r.totalExpenses)} />
            <Stat label="Monthly net" value={currency(r.net)} big good={r.net >= 0} warn={r.net < 0} />
            <Stat label="Savings rate" value={`${(r.savingsRate * 100).toFixed(1)}%`} big />
          </div>
        </ResultCard>
      )}
    </>
  );
}

// --- Debt payoff ---
function DebtTab() {
  const [debts, setDebts] = useState([
    { name: "Credit card", balance: "8000", rate: "22", minPayment: "160" },
    { name: "Car loan", balance: "12000", rate: "6", minPayment: "300" },
  ]);
  const [extra, setExtra] = useState("300");
  const [r, setR] = useState<PayoffComparison | null>(null);
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const parsed: Debt[] = debts.map((d) => ({ name: d.name, balance: n(d.balance), rate: n(d.rate) / 100, minPayment: n(d.minPayment) }));
          setR(comparePayoff(parsed, n(extra)));
        }}
        className="card space-y-3"
      >
        <p className="label">Debts</p>
        <div className="hidden gap-2 text-xs text-slate-400 sm:grid sm:grid-cols-[1fr,1fr,1fr,1fr,auto]">
          <span>Name</span><span>Balance</span><span>Rate %</span><span>Min payment</span><span></span>
        </div>
        {debts.map((d, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr,1fr,1fr,1fr,auto]">
            <input className="input" placeholder="Name" value={d.name} onChange={(e) => setDebts(debts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input className="input" type="number" placeholder="Balance" value={d.balance} onChange={(e) => setDebts(debts.map((x, j) => (j === i ? { ...x, balance: e.target.value } : x)))} />
            <input className="input" type="number" placeholder="Rate %" value={d.rate} onChange={(e) => setDebts(debts.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)))} />
            <input className="input" type="number" placeholder="Min" value={d.minPayment} onChange={(e) => setDebts(debts.map((x, j) => (j === i ? { ...x, minPayment: e.target.value } : x)))} />
            <button type="button" className="text-xs text-slate-400 hover:text-rose-600" onClick={() => setDebts(debts.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button type="button" className="text-sm text-brand hover:underline" onClick={() => setDebts([...debts, { name: "", balance: "", rate: "", minPayment: "" }])}>+ Add debt</button>
        <NumberField label="Extra monthly payment ($)" value={extra} onChange={setExtra} />
        <div><button className="btn-primary">Compare methods</button></div>
      </form>
      {r && (
        <ResultCard>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200/70 bg-white/60 p-4">
              <h4 className="font-medium text-slate-900">Avalanche (highest rate first)</h4>
              <p className="mt-1 text-sm text-slate-600">Payoff in {payoffTime(r.avalanche.months)}</p>
              <p className="text-sm text-slate-600">Total interest: {currency(r.avalanche.totalInterest)}</p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/60 p-4">
              <h4 className="font-medium text-slate-900">Snowball (smallest balance first)</h4>
              <p className="mt-1 text-sm text-slate-600">Payoff in {payoffTime(r.snowball.months)}</p>
              <p className="text-sm text-slate-600">Total interest: {currency(r.snowball.totalInterest)}</p>
            </div>
          </div>
          {r.interestSavedByAvalanche > 0 && (
            <p className="mt-3 text-sm text-emerald-700">Avalanche saves about {currency(r.interestSavedByAvalanche)} in interest here.</p>
          )}
        </ResultCard>
      )}
    </>
  );
}

// --- Emergency fund ---
function EmergencyTab() {
  const [f, setF] = useState({ monthlyEssentialExpenses: "4000", monthsOfCoverage: "6", currentSavings: "10000" });
  const [r, setR] = useState<EmergencyFundResult | null>(null);
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setR(emergencyFund({ monthlyEssentialExpenses: n(f.monthlyEssentialExpenses), monthsOfCoverage: n(f.monthsOfCoverage), currentSavings: n(f.currentSavings) }));
        }}
        className="card grid gap-4 sm:grid-cols-2"
      >
        <NumberField label="Monthly essential expenses ($)" value={f.monthlyEssentialExpenses} onChange={(v) => setF({ ...f, monthlyEssentialExpenses: v })} />
        <NumberField label="Months of coverage" value={f.monthsOfCoverage} onChange={(v) => setF({ ...f, monthsOfCoverage: v })} hint="Commonly 3–6." />
        <NumberField label="Current savings ($)" value={f.currentSavings} onChange={(v) => setF({ ...f, currentSavings: v })} />
        <div className="sm:col-span-2"><button className="btn-primary">Calculate</button></div>
      </form>
      {r && (
        <ResultCard>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Target fund" value={currency(r.target)} big />
            <Stat label="Currently covers" value={`${r.monthsCovered} mo`} />
            <Stat label="Gap" value={r.fullyFunded ? "Fully funded" : currency(r.gap)} big good={r.fullyFunded} warn={!r.fullyFunded} />
          </div>
        </ResultCard>
      )}
    </>
  );
}

// --- Mortgage / refi ---
function MortgageTab() {
  const [f, setF] = useState({ balance: "300000", currentRate: "7", remainingYears: "27", newRate: "5.5", newTermYears: "30", closingCosts: "6000" });
  const [r, setR] = useState<RefiResult | null>(null);
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setR(
            compareRefinance({
              currentBalance: n(f.balance),
              currentAnnualRate: n(f.currentRate) / 100,
              currentRemainingMonths: Math.round(n(f.remainingYears) * 12),
              newAnnualRate: n(f.newRate) / 100,
              newTermMonths: Math.round(n(f.newTermYears) * 12),
              closingCosts: n(f.closingCosts),
            }),
          );
        }}
        className="card grid gap-4 sm:grid-cols-2"
      >
        <NumberField label="Current balance ($)" value={f.balance} onChange={(v) => setF({ ...f, balance: v })} />
        <NumberField label="Current rate (%)" value={f.currentRate} onChange={(v) => setF({ ...f, currentRate: v })} />
        <NumberField label="Years remaining" value={f.remainingYears} onChange={(v) => setF({ ...f, remainingYears: v })} />
        <NumberField label="New rate (%)" value={f.newRate} onChange={(v) => setF({ ...f, newRate: v })} />
        <NumberField label="New term (years)" value={f.newTermYears} onChange={(v) => setF({ ...f, newTermYears: v })} />
        <NumberField label="Closing costs ($)" value={f.closingCosts} onChange={(v) => setF({ ...f, closingCosts: v })} />
        <div className="sm:col-span-2"><button className="btn-primary">Compare</button></div>
      </form>
      {r && (
        <ResultCard>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Current payment" value={currency(r.currentPayment)} />
            <Stat label="New payment" value={currency(r.newPayment)} />
            <Stat label="Monthly change" value={`${r.monthlySavings >= 0 ? "−" : "+"}${currency(Math.abs(r.monthlySavings))}`} big good={r.monthlySavings > 0} warn={r.monthlySavings < 0} />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {r.breakevenMonths == null
              ? "This refinance does not lower the payment, so there's no closing-cost breakeven."
              : `Breakeven on closing costs: about ${r.breakevenMonths} months. Note a longer term can raise total interest even when the payment drops.`}
          </p>
        </ResultCard>
      )}
    </>
  );
}

function payoffTime(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y ? `${y} yr ` : ""}${m} mo`;
}

export default function CashFlowPage() {
  return (
    <PlanningShell
      title="Cash-flow tools"
      subtitle="Budget, debt payoff, emergency fund, and mortgage/refi calculators. Informational estimates."
    >
      <Tabs
        tabs={[
          { key: "budget", label: "Budget", content: <BudgetTab /> },
          { key: "debt", label: "Debt payoff", content: <DebtTab /> },
          { key: "emergency", label: "Emergency fund", content: <EmergencyTab /> },
          { key: "mortgage", label: "Mortgage / refi", content: <MortgageTab /> },
        ]}
      />
    </PlanningShell>
  );
}
