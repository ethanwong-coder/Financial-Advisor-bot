"use client";

import { useCallback, useEffect, useState } from "react";
import { PlanningShell } from "@/components/planning/PlanningShell";
import { Spinner } from "@/components/Spinner";
import { ESTATE_DOC_LABELS } from "@/lib/planning/estate-documents";

interface Doc {
  docType: string;
  exists: boolean;
  lastReviewed: string | null;
  attorneyName: string | null;
  attorneyContact: string | null;
  storageLocation: string | null;
  notes: string | null;
  status: "MISSING" | "NEEDS_REVIEW" | "UP_TO_DATE";
  statusReason: string;
}

const STATUS_STYLE: Record<string, string> = {
  MISSING: "bg-slate-100 text-slate-600 border-slate-200",
  NEEDS_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  UP_TO_DATE: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const STATUS_LABEL: Record<string, string> = {
  MISSING: "Missing",
  NEEDS_REVIEW: "Needs review",
  UP_TO_DATE: "Up to date",
};

function dateInput(v: string | null): string {
  return v ? new Date(v).toISOString().slice(0, 10) : "";
}

export default function EstateDocumentsPage() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [savingType, setSavingType] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/planning/estate-documents");
    if (res.ok) setDocs((await res.json()).documents);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function save(doc: Doc) {
    setSavingType(doc.docType);
    const res = await fetch("/api/planning/estate-documents", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docType: doc.docType,
        exists: doc.exists,
        lastReviewed: doc.lastReviewed || null,
        attorneyName: doc.attorneyName || null,
        attorneyContact: doc.attorneyContact || null,
        storageLocation: doc.storageLocation || null,
        notes: doc.notes || null,
      }),
    });
    setSavingType(null);
    if (res.ok) load();
  }

  function update(docType: string, patch: Partial<Doc>) {
    setDocs((prev) => prev?.map((d) => (d.docType === docType ? { ...d, ...patch } : d)) ?? null);
  }

  return (
    <PlanningShell
      requiredTier="PLUS"
      title="Estate document tracker"
      subtitle="Track whether your key documents exist and when they were last reviewed. Tracking only — this never interprets a document or gives legal advice."
    >
      {!docs ? (
        <div className="card"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          {docs.map((d) => (
            <div key={d.docType} className="card">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-900">{ESTATE_DOC_LABELS[d.docType as keyof typeof ESTATE_DOC_LABELS]}</h3>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[d.status]}`}>
                  {STATUS_LABEL[d.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{d.statusReason}</p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={d.exists} onChange={(e) => update(d.docType, { exists: e.target.checked })} />
                  This document exists
                </label>
                <div>
                  <label className="label">Last reviewed / signed</label>
                  <input type="date" className="input" value={dateInput(d.lastReviewed)} onChange={(e) => update(d.docType, { lastReviewed: e.target.value })} />
                </div>
                <div>
                  <label className="label">Attorney (optional)</label>
                  <input className="input" value={d.attorneyName ?? ""} onChange={(e) => update(d.docType, { attorneyName: e.target.value })} />
                </div>
                <div>
                  <label className="label">Storage location (optional)</label>
                  <input className="input" placeholder="e.g. safe deposit box" value={d.storageLocation ?? ""} onChange={(e) => update(d.docType, { storageLocation: e.target.value })} />
                </div>
              </div>
              <div className="mt-3">
                <button className="btn-secondary" onClick={() => save(d)} disabled={savingType === d.docType}>
                  {savingType === d.docType ? <><Spinner className="mr-2 h-4 w-4" /> Saving…</> : "Save"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PlanningShell>
  );
}
