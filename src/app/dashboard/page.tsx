"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SeverityBadge } from "@/components/SeverityBadge";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import {
  ACCOUNT_TYPE_LABELS,
  RELATIONSHIP_LABELS,
  currency,
} from "@/lib/labels";

interface Flag {
  id: string;
  ruleId: string;
  code: string;
  severity: string;
  title: string;
  detail: string;
  status: "OPEN" | "DISMISSED" | "RESOLVED";
  accountNickname: string | null;
  dismissedReason: string | null;
}

interface Account {
  id: string;
  nickname: string;
  accountType: string;
  institutionName: string | null;
  balance: number | null;
  source: string;
  beneficiaryPrimaryName: string | null;
  beneficiaryPrimaryRelationship: string | null;
  accountNumberMasked: string | null;
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [nextReviewDate, setNextReviewDate] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [aRes, fRes, pRes] = await Promise.all([
      fetch("/api/accounts"),
      fetch("/api/flags"),
      fetch("/api/profile"),
    ]);
    if (aRes.ok) setAccounts((await aRes.json()).accounts);
    if (fRes.ok) setFlags((await fRes.json()).flags);
    if (pRes.ok) setNextReviewDate((await pRes.json()).profile?.nextReviewDate ?? null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function evaluate() {
    setBusy("evaluate");
    setMessage(null);
    const res = await fetch("/api/flags/evaluate", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage(
        `Checked ${data.result.totalFindings} item(s): ${data.result.created} new, ${data.result.updated} updated, ${data.result.autoResolved} auto-resolved.`,
      );
      await load();
    } else {
      setMessage(data.error ?? "Evaluation failed.");
    }
    setBusy(null);
  }

  async function connectSandbox() {
    setBusy("plaid");
    setMessage(null);
    const tokenRes = await fetch("/api/plaid/link-token", { method: "POST" });
    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok) {
      setMessage(tokenData.error ?? "Could not start Plaid link.");
      setBusy(null);
      return;
    }
    if (tokenData.mode === "mock") {
      // Mock mode: exchange immediately, no Plaid Link UI required.
      const exRes = await fetch("/api/plaid/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const exData = await exRes.json().catch(() => ({}));
      setMessage(
        exRes.ok
          ? `Linked ${exData.linked} sandbox account(s). ${exData.note}`
          : exData.error ?? "Could not link accounts.",
      );
      await load();
    } else {
      setMessage(
        "Live Plaid detected. Embed Plaid Link with this link token in the client to complete the flow (see README).",
      );
    }
    setBusy(null);
  }

  async function updateFlag(id: string, status: Flag["status"]) {
    const reason =
      status === "DISMISSED"
        ? window.prompt("Optional: why are you dismissing this?") ?? undefined
        : undefined;
    const res = await fetch(`/api/flags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, dismissedReason: reason }),
    });
    if (res.ok) await load();
  }

  const openFlags = flags.filter((f) => f.status === "OPEN");
  const closedFlags = flags.filter((f) => f.status !== "OPEN");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">
          Your <span className="text-gradient">case file</span>
        </h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={connectSandbox} disabled={busy !== null}>
            {busy === "plaid" ? "Linking…" : "Connect accounts"}
          </button>
          <button className="btn-primary" onClick={evaluate} disabled={busy !== null}>
            {busy === "evaluate" ? "Checking…" : "Run checks"}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-brand/30 bg-teal-50 px-4 py-2 text-sm text-teal-900">
          {message}
        </div>
      )}

      <ReviewBanner nextReviewDate={nextReviewDate} />

      {/* Flags */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Flags &amp; warnings{" "}
          <span className="text-sm font-normal text-slate-500">
            ({openFlags.length} open)
          </span>
        </h2>
        {openFlags.length === 0 ? (
          <div className="card text-sm text-slate-600">
            No open flags. Add accounts and life-event details, then “Run checks”
            to scan for coordination gaps.
            <DisclaimerBanner inline />
          </div>
        ) : (
          <div className="space-y-3">
            {openFlags.map((f) => (
              <div key={f.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={f.severity} />
                      {f.accountNickname && (
                        <span className="text-xs text-slate-500">
                          {f.accountNickname}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-medium text-slate-900">{f.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{f.detail}</p>
                    <DisclaimerBanner inline />
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      className="text-xs text-emerald-700 hover:underline"
                      onClick={() => updateFlag(f.id, "RESOLVED")}
                    >
                      Mark resolved
                    </button>
                    <button
                      className="text-xs text-slate-500 hover:underline"
                      onClick={() => updateFlag(f.id, "DISMISSED")}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {closedFlags.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-600">
            Resolved / dismissed ({closedFlags.length})
          </summary>
          <div className="mt-3 space-y-2">
            {closedFlags.map((f) => (
              <div key={f.id} className="card flex items-center justify-between">
                <div>
                  <span className="mr-2 text-xs uppercase text-slate-400">
                    {f.status}
                  </span>
                  <span className="text-slate-700">{f.title}</span>
                  {f.dismissedReason && (
                    <span className="ml-2 text-xs text-slate-400">
                      ({f.dismissedReason})
                    </span>
                  )}
                </div>
                <button
                  className="text-xs text-brand hover:underline"
                  onClick={() => updateFlag(f.id, "OPEN")}
                >
                  Reopen
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Accounts */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Accounts{" "}
            <span className="text-sm font-normal text-slate-500">
              ({accounts.length})
            </span>
          </h2>
          <Link href="/accounts/new" className="text-sm text-brand hover:underline">
            + Add account manually
          </Link>
        </div>
        {accounts.length === 0 ? (
          <div className="card text-sm text-slate-600">
            No accounts yet. “Connect accounts” pulls types and balances from
            Plaid (sandbox), or add one manually — manual entry is how you record
            beneficiaries and inherited-IRA details, which custodians rarely
            expose.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {accounts.map((a) => (
              <div key={a.id} className="card card-hover">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-900">{a.nickname}</h3>
                  <span className="text-xs text-slate-400">
                    {a.source === "PLAID" ? "Linked" : "Manual"}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {ACCOUNT_TYPE_LABELS[a.accountType] ?? a.accountType}
                  {a.institutionName ? ` · ${a.institutionName}` : ""}
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-800">
                  {currency(a.balance)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Beneficiary:{" "}
                  {a.beneficiaryPrimaryName
                    ? `${a.beneficiaryPrimaryName}${
                        a.beneficiaryPrimaryRelationship
                          ? ` (${RELATIONSHIP_LABELS[a.beneficiaryPrimaryRelationship] ?? a.beneficiaryPrimaryRelationship})`
                          : ""
                      }`
                    : "not recorded"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ReviewBanner({ nextReviewDate }: { nextReviewDate: string | null }) {
  if (!nextReviewDate) return null;
  const due = new Date(nextReviewDate);
  const isDue = due.getTime() <= Date.now();
  return (
    <div
      className={`rounded-lg border px-4 py-2 text-sm ${
        isDue
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {isDue ? "A quarterly review is due. " : "Next quarterly review: "}
      {due.toLocaleDateString()} — re-run checks to keep your flags current.
    </div>
  );
}
