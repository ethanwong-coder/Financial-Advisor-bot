"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/Spinner";
import { TIER_LABELS, Tier } from "@/lib/billing/tiers";

interface BillingInfo {
  tier: Tier;
  status: string | null;
  billingInterval: string | null;
  currentPeriodEnd: string | null;
  billingConfigured: boolean;
}

export default function BillingSettingsPage() {
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setInfo(d));
  }, []);

  async function openPortal() {
    setBusy(true);
    setNotice(null);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      window.location.href = data.url;
      return;
    }
    setNotice(data.message ?? "Couldn't open the billing portal.");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">
        <span className="text-gradient">Billing</span>
      </h1>
      <p className="mt-1 text-sm text-slate-500">Manage your plan and payment method.</p>

      {!info ? (
        <div className="card mt-6"><Spinner /></div>
      ) : (
        <div className="card mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Current plan</p>
              <p className="text-xl font-semibold text-slate-900">{TIER_LABELS[info.tier]}</p>
            </div>
            {info.status && (
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {info.status}
              </span>
            )}
          </div>

          {info.tier !== "FREE" && info.currentPeriodEnd && (
            <p className="text-sm text-slate-600">
              {info.status === "CANCELED" ? "Access ends" : "Renews"} on{" "}
              {new Date(info.currentPeriodEnd).toLocaleDateString()}
              {info.billingInterval ? ` · billed ${info.billingInterval.toLowerCase()}` : ""}.
            </p>
          )}

          {notice && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              {notice}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {info.tier === "FREE" ? (
              <Link href="/pricing" className="btn-primary">Upgrade</Link>
            ) : (
              <button className="btn-primary" onClick={openPortal} disabled={busy}>
                {busy ? <><Spinner className="mr-2 h-4 w-4" /> Opening…</> : "Manage subscription"}
              </button>
            )}
            <Link href="/pricing" className="btn-secondary">View all plans</Link>
          </div>

          {!info.billingConfigured && (
            <p className="text-xs text-slate-400">
              Note: Stripe isn&apos;t configured yet, so upgrades and the billing portal aren&apos;t live.
              Tiers can be exercised via the database in the meantime.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
