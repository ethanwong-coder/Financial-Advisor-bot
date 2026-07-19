"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  PRICING,
  annualSavingsPercent,
  meetsTier,
  monthlyEquivalentOfAnnual,
} from "@/lib/billing/tiers";
import { useTier } from "@/components/billing/useTier";

const FEATURES = {
  FREE: [
    "1 connected account (Plaid or manual)",
    "Manual flag checks (run on demand)",
    "Basic calculators: retirement, budgeting, emergency fund",
  ],
  PLUS: [
    "Unlimited connected accounts",
    "Automatic quarterly flag re-evaluation",
    "Full chat assistant",
    "Social Security, taxes, NIIT/AMT, QCD, insurance, debt payoff, mortgage/refi",
    "Estate document coordination tracker",
  ],
  PRO: [
    "Education planning, business retirement, equity-comp modeling",
    "Life-transition checklists & goal tracking",
    "Expanded quarterly check-ins",
    "Multi-user / family accounts",
    "Exportable PDF reports for your CPA/attorney",
  ],
};

export default function PricingPage() {
  const router = useRouter();
  const userTier = useTier();
  const [annual, setAnnual] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Surface a returned-from-Stripe cancel gracefully (no charge was made).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "canceled") {
      setNotice(
        "Checkout canceled — you haven't been charged. Pick a plan whenever you're ready.",
      );
    }
  }, []);

  // The right CTA for a paid-plan card given the user's current tier: manage if
  // it's their plan (or lower than their plan), otherwise start checkout.
  function planCta(cardTier: "PLUS" | "PRO") {
    if (userTier === cardTier) {
      return (
        <Link href="/settings/billing" className="btn-secondary inline-flex w-full justify-center">
          Current plan · Manage
        </Link>
      );
    }
    if (userTier && meetsTier(userTier, cardTier)) {
      return (
        <Link href="/settings/billing" className="btn-secondary inline-flex w-full justify-center">
          Manage plan
        </Link>
      );
    }
    return (
      <button
        className="btn-primary w-full"
        disabled={busy === cardTier}
        onClick={() => subscribe(cardTier)}
      >
        {busy === cardTier ? "Starting…" : `Choose ${cardTier === "PRO" ? "Pro" : "Plus"}`}
      </button>
    );
  }

  async function subscribe(tier: "PLUS" | "PRO") {
    setBusy(tier);
    setNotice(null);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier, interval: annual ? "ANNUAL" : "MONTHLY" }),
    });
    setBusy(null);
    if (res.status === 401) {
      router.push("/register");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      window.location.href = data.url;
      return;
    }
    setNotice(data.message ?? "Couldn't start checkout. Please try again.");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">
          Simple, <span className="text-gradient">honest</span> pricing
        </h1>
        <p className="mt-2 text-slate-600">
          Start free. Upgrade when you want the full planning toolkit.
        </p>

        {/* Monthly / annual toggle */}
        <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/70 p-1 backdrop-blur">
          <button
            onClick={() => setAnnual(false)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${!annual ? "bg-brand text-white shadow" : "text-slate-600"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${annual ? "bg-brand text-white shadow" : "text-slate-600"}`}
          >
            Annual
            <span className="ml-1 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">
              2 months free
            </span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="mx-auto mt-6 max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
          {notice}
        </div>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {/* FREE */}
        <PlanCard title="Free" price="$0" cadence="forever" features={FEATURES.FREE}>
          {userTier === "PLUS" || userTier === "PRO" ? (
            <button className="btn-secondary w-full" disabled>
              Included in your plan
            </button>
          ) : (
            <button className="btn-secondary w-full" onClick={() => router.push("/register")}>
              Get started
            </button>
          )}
        </PlanCard>

        {/* PLUS */}
        <PlanCard
          title="Plus"
          highlight
          price={annual ? `$${monthlyEquivalentOfAnnual(PRICING.PLUS.annual).toFixed(2)}` : `$${PRICING.PLUS.monthly}`}
          cadence={annual ? "/mo billed annually" : "/month"}
          sub={annual ? `$${PRICING.PLUS.annual}/yr · save ${annualSavingsPercent(PRICING.PLUS.monthly, PRICING.PLUS.annual)}%` : undefined}
          everythingIn="Free"
          features={FEATURES.PLUS}
        >
          {planCta("PLUS")}
        </PlanCard>

        {/* PRO */}
        <PlanCard
          title="Pro"
          price={annual ? `$${monthlyEquivalentOfAnnual(PRICING.PRO.annual).toFixed(2)}` : `$${PRICING.PRO.monthly}`}
          cadence={annual ? "/mo billed annually" : "/month"}
          sub={annual ? `$${PRICING.PRO.annual}/yr · save ${annualSavingsPercent(PRICING.PRO.monthly, PRICING.PRO.annual)}%` : undefined}
          everythingIn="Plus"
          features={FEATURES.PRO}
        >
          {planCta("PRO")}
        </PlanCard>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Payments are handled by Stripe — we never see your card details. Cancel anytime.
      </p>
      <p className="mt-2 text-center text-sm text-slate-500">
        Not ready to pick a plan?{" "}
        <Link href="/waitlist" className="font-medium text-brand hover:underline">
          Join the waitlist
        </Link>{" "}
        for launch updates.
      </p>
    </div>
  );
}

function PlanCard({
  title,
  price,
  cadence,
  sub,
  features,
  everythingIn,
  highlight,
  children,
}: {
  title: string;
  price: string;
  cadence: string;
  sub?: string;
  features: string[];
  everythingIn?: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={false}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`card flex flex-col ${highlight ? "ring-2 ring-brand/50" : ""}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {highlight && (
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
            Most popular
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900">{price}</span>
        <span className="text-sm text-slate-500">{cadence}</span>
      </div>
      {sub && <p className="mt-0.5 text-xs font-medium text-teal-700">{sub}</p>}

      <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
        {everythingIn && (
          <li className="font-medium text-slate-800">Everything in {everythingIn}, plus:</li>
        )}
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-5">{children}</div>
    </motion.div>
  );
}
