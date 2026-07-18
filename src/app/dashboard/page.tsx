"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SeverityBadge } from "@/components/SeverityBadge";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { Spinner } from "@/components/Spinner";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { MarketSnapshot } from "@/components/MarketSnapshot";
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

const PLANNING_TOOLS = [
  {
    href: "/planning/retirement",
    title: "Retirement projection",
    blurb: "Illustrate your projected balance and how long it may last.",
  },
  {
    href: "/planning/social-security",
    title: "Social Security illustrator",
    blurb: "Estimated benefit at 62, FRA, and 70, with breakeven ages.",
  },
  {
    href: "/planning/quarterly-tax",
    title: "Quarterly tax estimate",
    blurb: "Safe-harbor estimated payments and due dates.",
  },
  {
    href: "/planning/niit-amt",
    title: "NIIT / AMT screener",
    blurb: "Screen the 3.8% investment tax and rough AMT exposure.",
  },
  {
    href: "/planning/qcd",
    title: "QCD tracker",
    blurb: "Log charitable IRA distributions against your RMD.",
  },
];

export default function DashboardPage() {
  const reduce = useReducedMotion();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [nextReviewDate, setNextReviewDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
    setLoading(false);
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
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">
          Your <span className="text-gradient">case file</span>
        </h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={connectSandbox} disabled={busy !== null}>
            {busy === "plaid" ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Linking…
              </>
            ) : (
              "Connect accounts"
            )}
          </button>
          <button className="btn-primary" onClick={evaluate} disabled={busy !== null}>
            {busy === "evaluate" ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Checking…
              </>
            ) : (
              "Run checks"
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-lg border border-brand/30 bg-teal-50 px-4 py-2 text-sm text-teal-900"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      <ReviewBanner nextReviewDate={nextReviewDate} />

      {/* Flags */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Flags &amp; warnings{" "}
          <span className="text-sm font-normal text-slate-500">
            ({loading ? "…" : `${openFlags.length} open`})
          </span>
        </h2>

        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : openFlags.length === 0 ? (
          <div className="card text-sm text-slate-600">
            No open flags. Add accounts and life-event details, then “Run checks”
            to scan for coordination gaps.
            <DisclaimerBanner inline />
          </div>
        ) : (
          <div>
            <AnimatePresence initial={false}>
              {openFlags.map((f) => (
                <motion.div
                  key={f.id}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="card mb-3">
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
                          className="text-xs font-medium text-emerald-700 hover:underline"
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
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {!loading && closedFlags.length > 0 && (
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
              ({loading ? "…" : accounts.length})
            </span>
          </h2>
          <Link href="/accounts/new" className="text-sm text-brand hover:underline">
            + Add account manually
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : accounts.length === 0 ? (
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

      {/* Planning Tools — informational calculators, separate from the Flags
          compliance section. Each is deterministic and not a recommendation. */}
      <section className="border-t border-slate-200/70 pt-8">
        <h2 className="text-lg font-semibold text-slate-900">Planning tools</h2>
        <p className="mb-3 mt-1 text-sm text-slate-500">
          Informational, educational calculators. Each computes with deterministic
          code and is not a recommendation — always confirm with a CPA or advisor.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLANNING_TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="card card-hover block">
              <div className="mb-2 h-8 w-8 rounded-lg bg-gradient-to-br from-teal-400 to-brand-dark shadow" />
              <h3 className="font-medium text-slate-900">{t.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{t.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Market snapshot — GENERAL market info, deliberately separated from the
          flags/assistant and unrelated to the user's accounts or holdings. */}
      <section className="border-t border-slate-200/70 pt-8">
        <h2 className="text-lg font-semibold text-slate-900">Market snapshot</h2>
        <p className="mb-3 mt-1 text-xs text-slate-500">
          General market information — ETF proxies for major indices (SPY, DIA,
          QQQ). Not related to your accounts, holdings, or the flags above, and
          not investment advice.
        </p>
        <MarketSnapshot />
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
