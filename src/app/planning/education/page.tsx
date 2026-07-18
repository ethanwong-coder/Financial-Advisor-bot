"use client";

import { useCallback, useEffect, useState } from "react";
import { PlanningShell } from "@/components/planning/PlanningShell";
import { Tabs } from "@/components/planning/Tabs";
import { NumberField, ResultCard, SelectField, Stat } from "@/components/planning/ui";
import { Spinner } from "@/components/Spinner";
import { compareStudentLoan, estimateAid, superfundMax, AidResult, StudentLoanResult } from "@/lib/planning/education";
import { currency } from "@/lib/labels";

function n(v: string): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

// --- 529 / Coverdell tracking (persisted) ---
interface EdAccount {
  id: string;
  accountType: string;
  institutionName: string | null;
  beneficiaryName: string | null;
  balance: number | null;
  annualContribution: number | null;
  stateOfPlan: string | null;
}

function Ed529Tab() {
  const [data, setData] = useState<{ stateOfResidence: string | null; accounts: EdAccount[] } | null>(null);
  const [form, setForm] = useState({ accountType: "PLAN_529", institutionName: "", beneficiaryName: "", balance: "", annualContribution: "", stateOfPlan: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/planning/education-accounts");
    if (res.ok) setData(await res.json());
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/planning/education-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountType: form.accountType,
        institutionName: form.institutionName || null,
        beneficiaryName: form.beneficiaryName || null,
        balance: form.balance ? Number(form.balance) : null,
        annualContribution: form.annualContribution ? Number(form.annualContribution) : null,
        stateOfPlan: form.stateOfPlan || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setForm({ accountType: "PLAN_529", institutionName: "", beneficiaryName: "", balance: "", annualContribution: "", stateOfPlan: "" });
      load();
    }
  }
  async function remove(id: string) {
    const res = await fetch(`/api/planning/education-accounts?id=${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (!data) return <div className="card"><Spinner /></div>;

  return (
    <div className="space-y-4">
      {data.accounts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.accounts.map((a) => (
            <div key={a.id} className="card">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-slate-900">{a.accountType === "PLAN_529" ? "529 plan" : "Coverdell ESA"}</h4>
                <button className="text-xs text-slate-400 hover:text-rose-600" onClick={() => remove(a.id)}>Remove</button>
              </div>
              <p className="text-sm text-slate-500">{a.institutionName ?? "—"}{a.stateOfPlan ? ` · ${a.stateOfPlan}` : ""}</p>
              <p className="mt-1 text-lg font-semibold text-slate-800">{currency(a.balance)}</p>
              <p className="text-xs text-slate-500">Beneficiary: {a.beneficiaryName ?? "—"} · Annual: {currency(a.annualContribution)}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add} className="card grid gap-4 sm:grid-cols-2">
        <h4 className="font-medium text-slate-900 sm:col-span-2">Add an education account</h4>
        <SelectField label="Type" value={form.accountType} onChange={(v) => setForm({ ...form, accountType: v })} options={[{ value: "PLAN_529", label: "529 plan" }, { value: "COVERDELL", label: "Coverdell ESA" }]} />
        <div><label className="label">Institution</label><input className="input" value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} /></div>
        <div><label className="label">Beneficiary</label><input className="input" value={form.beneficiaryName} onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })} /></div>
        <div><label className="label">Plan state (2-letter)</label><input className="input" maxLength={2} value={form.stateOfPlan} onChange={(e) => setForm({ ...form, stateOfPlan: e.target.value.toUpperCase() })} /></div>
        <NumberField label="Balance ($)" value={form.balance} onChange={(v) => setForm({ ...form, balance: v })} />
        <NumberField label="Annual contribution ($)" value={form.annualContribution} onChange={(v) => setForm({ ...form, annualContribution: v })} />
        <div className="sm:col-span-2">
          <button className="btn-primary" disabled={saving}>{saving ? <><Spinner className="mr-2 h-4 w-4" /> Saving…</> : "Add account"}</button>
        </div>
      </form>

      <p className="text-xs text-slate-500">
        State tax note: many states offer a deduction or credit for contributions to their own 529 plan, and a few are
        &ldquo;tax-parity&rdquo; states that allow any plan. Based on your profile state
        {data.stateOfResidence ? ` (${data.stateOfResidence})` : ""}, check your state&apos;s specific 529 rules — this is
        informational only, not state-specific tax advice. Front-loading (&ldquo;superfunding&rdquo;) can front-load up to{" "}
        {currency(superfundMax())} (5× the annual gift exclusion) per beneficiary.
      </p>
    </div>
  );
}

// --- Financial aid (simplified) ---
function AidTab() {
  const [f, setF] = useState({ parentIncome: "130000", parentAssets: "80000", householdSize: "4", numberInCollege: "1" });
  const [r, setR] = useState<AidResult | null>(null);
  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); setR(estimateAid({ parentIncome: n(f.parentIncome), parentAssets: n(f.parentAssets), householdSize: n(f.householdSize), numberInCollege: n(f.numberInCollege) })); }} className="card grid gap-4 sm:grid-cols-2">
        <NumberField label="Parent income ($)" value={f.parentIncome} onChange={(v) => setF({ ...f, parentIncome: v })} />
        <NumberField label="Parent assets ($)" value={f.parentAssets} onChange={(v) => setF({ ...f, parentAssets: v })} />
        <NumberField label="Household size" value={f.householdSize} onChange={(v) => setF({ ...f, householdSize: v })} />
        <NumberField label="Number in college" value={f.numberInCollege} onChange={(v) => setF({ ...f, numberInCollege: v })} />
        <div className="sm:col-span-2"><button className="btn-primary">Estimate</button></div>
      </form>
      {r && (
        <ResultCard>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Estimated Student Aid Index" value={currency(r.estimatedSai)} big />
            <Stat label="From income" value={currency(r.contributionFromIncome)} />
            <Stat label="Per student" value={currency(r.perStudent)} />
          </div>
          <p className="mt-3 text-xs italic text-slate-500">Rough estimate using a simplified public methodology — NOT an official FAFSA / SAI or CSS Profile result.</p>
        </ResultCard>
      )}
    </>
  );
}

// --- Student loans ---
function LoansTab() {
  const [f, setF] = useState({ balance: "30000", rate: "6", income: "60000", household: "1" });
  const [r, setR] = useState<StudentLoanResult | null>(null);
  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); setR(compareStudentLoan({ balance: n(f.balance), annualRate: n(f.rate) / 100, annualIncome: n(f.income), householdSize: n(f.household) })); }} className="card grid gap-4 sm:grid-cols-2">
        <NumberField label="Loan balance ($)" value={f.balance} onChange={(v) => setF({ ...f, balance: v })} />
        <NumberField label="Interest rate (%)" value={f.rate} onChange={(v) => setF({ ...f, rate: v })} />
        <NumberField label="Annual income ($)" value={f.income} onChange={(v) => setF({ ...f, income: v })} />
        <NumberField label="Household size" value={f.household} onChange={(v) => setF({ ...f, household: v })} />
        <div className="sm:col-span-2"><button className="btn-primary">Compare</button></div>
      </form>
      {r && (
        <ResultCard>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200/70 bg-white/60 p-4">
              <h4 className="font-medium text-slate-900">Standard (10-year)</h4>
              <p className="mt-1 text-xl font-semibold text-slate-900">{currency(r.standard.monthly)}<span className="text-sm font-normal text-slate-400">/mo</span></p>
              <p className="text-sm text-slate-600">Total: {currency(r.standard.totalCost)}</p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/60 p-4">
              <h4 className="font-medium text-slate-900">Income-driven (illustrative)</h4>
              <p className="mt-1 text-xl font-semibold text-slate-900">{currency(r.incomeDriven.monthly)}<span className="text-sm font-normal text-slate-400">/mo</span></p>
              <p className="text-xs text-slate-500">{r.incomeDriven.note}</p>
            </div>
          </div>
        </ResultCard>
      )}
    </>
  );
}

export default function EducationPage() {
  return (
    <PlanningShell
      title="Education planning"
      subtitle="Track 529/Coverdell accounts, get a rough aid estimate, and compare student-loan repayment. Informational only."
    >
      <Tabs
        tabs={[
          { key: "accounts", label: "529 / Coverdell", content: <Ed529Tab /> },
          { key: "aid", label: "Aid estimator", content: <AidTab /> },
          { key: "loans", label: "Student loans", content: <LoansTab /> },
        ]}
      />
    </PlanningShell>
  );
}
