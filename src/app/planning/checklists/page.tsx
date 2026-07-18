"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlanningShell } from "@/components/planning/PlanningShell";
import { Spinner } from "@/components/Spinner";
import { CHECKLISTS, completionFraction } from "@/lib/planning/checklists";

const keyOf = (checklistKey: string, itemKey: string) => `${checklistKey}:${itemKey}`;

export default function ChecklistsPage() {
  const [checked, setChecked] = useState<Set<string> | null>(null);
  const [activeKey, setActiveKey] = useState(CHECKLISTS[0].key);

  const load = useCallback(async () => {
    const res = await fetch("/api/planning/checklists");
    if (res.ok) {
      const data = await res.json();
      setChecked(new Set(data.checked.map((c: { checklistKey: string; itemKey: string }) => keyOf(c.checklistKey, c.itemKey))));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const active = useMemo(() => CHECKLISTS.find((c) => c.key === activeKey)!, [activeKey]);

  async function toggle(itemKey: string, value: boolean) {
    if (!checked) return;
    const k = keyOf(active.key, itemKey);
    const next = new Set(checked);
    if (value) next.add(k);
    else next.delete(k);
    setChecked(next); // optimistic
    await fetch("/api/planning/checklists", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklistKey: active.key, itemKey, checked: value }),
    });
  }

  return (
    <PlanningShell
      title="Life-transition checklists"
      subtitle="Standard task lists for major life changes — not personalized advice. Check items off as you complete them."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {CHECKLISTS.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveKey(c.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              activeKey === c.key ? "bg-brand text-white shadow" : "border border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {!checked ? (
        <div className="card"><Spinner /></div>
      ) : (
        <div className="card">
          <p className="mb-1 text-sm text-slate-500">{active.blurb}</p>
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-brand"
              style={{ width: `${Math.round(completionFraction(active, new Set(Array.from(checked).filter((k) => k.startsWith(active.key + ":")).map((k) => k.split(":")[1]))) * 100)}%` }}
            />
          </div>
          <ul className="space-y-3">
            {active.items.map((item) => {
              const isChecked = checked.has(keyOf(active.key, item.key));
              return (
                <li key={item.key} className="flex gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={isChecked}
                    onChange={(e) => toggle(item.key, e.target.checked)}
                  />
                  <div>
                    <p className={`font-medium ${isChecked ? "text-slate-400 line-through" : "text-slate-900"}`}>{item.label}</p>
                    <p className="text-sm text-slate-500">{item.why}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </PlanningShell>
  );
}
