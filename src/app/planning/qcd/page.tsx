"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PlanningShell } from "@/components/planning/PlanningShell";
import { Spinner } from "@/components/Spinner";
import { Skeleton } from "@/components/Skeleton";
import { summarizeQcd } from "@/lib/planning/qcd";
import { currency } from "@/lib/labels";

interface Account {
  id: string;
  nickname: string;
  accountType: string;
  engineRmdEstimate: number | null;
}
interface Entry {
  id: string;
  accountId: string;
  accountNickname: string;
  amount: number;
  distributionDate: string;
  charityName: string | null;
  taxYear: number;
}
interface Data {
  taxYear: number;
  eligible: boolean;
  dateOfBirth: string | null;
  accounts: Account[];
  entries: Entry[];
}

export default function QcdPage() {
  const reduce = useReducedMotion();
  const [data, setData] = useState<Data | null>(null);
  const [manualRmd, setManualRmd] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ accountId: "", amount: "", distributionDate: "", charityName: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/planning/qcd");
    if (res.ok) setData(await res.json());
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!form.accountId || !form.amount || !form.distributionDate) return;
    setSaving(true);
    const res = await fetch("/api/planning/qcd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: form.accountId,
        amount: Number(form.amount),
        distributionDate: form.distributionDate,
        charityName: form.charityName || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setForm({ accountId: "", amount: "", distributionDate: "", charityName: "" });
      await load();
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/planning/qcd?id=${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  const subtitle =
    "Log Qualified Charitable Distributions from an IRA and see how much of the account's RMD they satisfy. RMD figures are read from your existing inherited-IRA checks; for other IRAs, enter the RMD from your custodian.";

  return (
    <PlanningShell title="QCD tracker" subtitle={subtitle}>
      {!data ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="space-y-6">
          {!data.eligible && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              QCDs generally require the account owner to be age 70½ or older. Based on your profile date of
              birth, you may not be eligible yet — this tracker is shown for reference.
            </div>
          )}

          {data.accounts.length === 0 ? (
            <div className="card text-sm text-slate-600">
              No IRA accounts on file. Add a Traditional or Inherited IRA on the dashboard first.
            </div>
          ) : (
            <div className="space-y-4">
              {data.accounts.map((a) => {
                const total = data.entries
                  .filter((e) => e.accountId === a.id)
                  .reduce((s, e) => s + e.amount, 0);
                const rmd = a.engineRmdEstimate ?? Number(manualRmd[a.id] || 0);
                const summary = summarizeQcd({ rmdAmount: rmd, qcdTotal: total });
                return (
                  <div key={a.id} className="card">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-slate-900">{a.nickname}</h3>
                      <span className="text-xs text-slate-400">Tax year {data.taxYear}</span>
                    </div>

                    {a.engineRmdEstimate != null ? (
                      <p className="mt-1 text-sm text-slate-600">
                        RMD estimate (from your inherited-IRA check): {currency(a.engineRmdEstimate)}
                      </p>
                    ) : (
                      <div className="mt-2 max-w-xs">
                        <label className="label">This account&apos;s RMD for the year ($)</label>
                        <input
                          type="number"
                          step="any"
                          className="input"
                          placeholder="From your custodian"
                          value={manualRmd[a.id] ?? ""}
                          onChange={(ev) => setManualRmd({ ...manualRmd, [a.id]: ev.target.value })}
                        />
                      </div>
                    )}

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <Stat label="QCDs logged" value={currency(summary.qcdTotal)} />
                      <Stat label="Applied to RMD" value={currency(summary.qcdAppliedToRmd)} />
                      <Stat
                        label="RMD remaining"
                        value={rmd > 0 ? currency(summary.rmdRemaining) : "enter RMD"}
                        good={summary.rmdFullySatisfied}
                      />
                    </div>
                    {summary.rmdFullySatisfied && (
                      <p className="mt-2 text-sm font-medium text-emerald-700">
                        ✓ QCDs satisfy this account&apos;s RMD for the year.
                      </p>
                    )}
                    {summary.exceedsAnnualLimit && (
                      <p className="mt-2 text-sm text-amber-700">
                        Total QCDs exceed the annual QCD exclusion limit ({currency(summary.annualLimit)}); amounts
                        above the limit aren&apos;t excludable.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Log a QCD */}
          {data.accounts.length > 0 && (
            <form onSubmit={addEntry} className="card grid gap-4 sm:grid-cols-2">
              <h3 className="font-medium text-slate-900 sm:col-span-2">Log a QCD</h3>
              <div>
                <label className="label">From account</label>
                <select className="input" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                  <option value="">Select an IRA…</option>
                  {data.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nickname}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Amount ($)</label>
                <input type="number" step="any" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <label className="label">Distribution date</label>
                <input type="date" className="input" value={form.distributionDate} onChange={(e) => setForm({ ...form, distributionDate: e.target.value })} />
              </div>
              <div>
                <label className="label">Charity (optional)</label>
                <input className="input" value={form.charityName} onChange={(e) => setForm({ ...form, charityName: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <button className="btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" /> Saving…
                    </>
                  ) : (
                    "Log QCD"
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Entries */}
          {data.entries.length > 0 && (
            <div>
              <h3 className="mb-2 font-medium text-slate-900">Logged this year</h3>
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {data.entries.map((e) => (
                    <motion.div
                      key={e.id}
                      layout={!reduce}
                      initial={reduce ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      transition={{ duration: reduce ? 0 : 0.2 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="mb-2 flex items-center justify-between rounded-lg border border-slate-200/70 bg-white/60 px-3 py-2 text-sm">
                        <span>
                          <span className="font-medium">{currency(e.amount)}</span> · {e.accountNickname}
                          {e.charityName ? ` · ${e.charityName}` : ""} ·{" "}
                          {new Date(e.distributionDate).toLocaleDateString(undefined, { timeZone: "UTC" })}
                        </span>
                        <button className="text-xs text-slate-500 hover:text-rose-600 hover:underline" onClick={() => remove(e.id)}>
                          Remove
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}
    </PlanningShell>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200/70 bg-white/60 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-medium ${good ? "text-emerald-700" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}
