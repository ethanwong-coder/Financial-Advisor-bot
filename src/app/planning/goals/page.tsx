"use client";

import { useCallback, useEffect, useState } from "react";
import { PlanningShell } from "@/components/planning/PlanningShell";
import { Spinner } from "@/components/Spinner";
import { NumberField } from "@/components/planning/ui";
import { goalProgress } from "@/lib/planning/goals";
import { currency } from "@/lib/labels";

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentSaved: number;
  targetDate: string | null;
  startDate: string | null;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [form, setForm] = useState({ name: "", targetAmount: "", currentSaved: "", targetDate: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/planning/goals");
    if (res.ok) setGoals((await res.json()).goals);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.targetAmount) return;
    setSaving(true);
    const res = await fetch("/api/planning/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        targetAmount: Number(form.targetAmount),
        currentSaved: form.currentSaved ? Number(form.currentSaved) : 0,
        targetDate: form.targetDate || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setForm({ name: "", targetAmount: "", currentSaved: "", targetDate: "" });
      load();
    }
  }
  async function updateSaved(id: string, currentSaved: number) {
    const res = await fetch("/api/planning/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, currentSaved }),
    });
    if (res.ok) load();
  }
  async function remove(id: string) {
    const res = await fetch(`/api/planning/goals?id=${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <PlanningShell requiredTier="PRO" title="Goal tracking" subtitle="Set named financial goals and track progress toward them.">
      {!goals ? (
        <div className="card"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          {goals.map((g) => {
            const p = goalProgress({
              targetAmount: g.targetAmount,
              currentSaved: g.currentSaved,
              targetDate: g.targetDate ? new Date(g.targetDate) : null,
              startDate: g.startDate ? new Date(g.startDate) : null,
              now: new Date(),
            });
            const pct = Math.min(100, Math.round(p.progressFraction * 100));
            return (
              <div key={g.id} className="card">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-900">{g.name}</h3>
                  <div className="flex items-center gap-2">
                    {p.onPace != null && (
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${p.onPace ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                        {p.onPace ? "On pace" : "Behind pace"}
                      </span>
                    )}
                    <button className="text-xs text-slate-400 hover:text-rose-600" onClick={() => remove(g.id)}>Remove</button>
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {currency(g.currentSaved)} of {currency(g.targetAmount)} · {pct}%
                  {p.remaining > 0 ? ` · ${currency(p.remaining)} to go` : " · reached"}
                </p>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-brand" style={{ width: `${pct}%` }} />
                </div>
                {p.requiredMonthlySavings != null && p.remaining > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    ≈ {currency(p.requiredMonthlySavings)}/month needed{p.monthsUntilTarget ? ` over ${p.monthsUntilTarget} months` : ""}.
                  </p>
                )}
                <div className="mt-2 flex items-end gap-2">
                  <div className="w-40">
                    <label className="label">Update saved ($)</label>
                    <input
                      type="number"
                      className="input"
                      defaultValue={g.currentSaved}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v !== g.currentSaved) updateSaved(g.id, v);
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <form onSubmit={add} className="card grid gap-4 sm:grid-cols-2">
            <h3 className="font-medium text-slate-900 sm:col-span-2">Add a goal</h3>
            <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <NumberField label="Target amount ($)" value={form.targetAmount} onChange={(v) => setForm({ ...form, targetAmount: v })} />
            <NumberField label="Already saved ($)" value={form.currentSaved} onChange={(v) => setForm({ ...form, currentSaved: v })} />
            <div><label className="label">Target date (optional)</label><input type="date" className="input" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <button className="btn-primary" disabled={saving}>{saving ? <><Spinner className="mr-2 h-4 w-4" /> Saving…</> : "Add goal"}</button>
            </div>
          </form>
        </div>
      )}
    </PlanningShell>
  );
}
