"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Spinner } from "@/components/Spinner";
import { primeTier } from "@/components/billing/useTier";
import { Tier, TIER_LABELS } from "@/lib/billing/tiers";

// The webhook (source of truth) may land a beat after Stripe redirects here, so
// we poll our own tier endpoint until it flips to a paid tier.
const MAX_ATTEMPTS = 10;
const INTERVAL_MS = 1500;

export default function BillingSuccessPage() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"polling" | "done" | "timeout">("polling");
  const [tier, setTier] = useState<Tier>("FREE");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch("/api/billing/me", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        const t = (data.tier ?? "FREE") as Tier;
        if (t === "PLUS" || t === "PRO") {
          primeTier(t);
          setTier(t);
          setPhase("done");
          return;
        }
      } catch {
        // ignore and retry
      }
      if (attempts >= MAX_ATTEMPTS) {
        setPhase("timeout");
        return;
      }
      timer = setTimeout(poll, INTERVAL_MS);
    };

    poll();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="mx-auto max-w-lg text-center">
      {phase === "polling" && (
        <div className="card">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Finalizing your upgrade…</h1>
          <p className="mt-1 text-sm text-slate-600">
            Confirming your payment with Stripe. This only takes a moment.
          </p>
        </div>
      )}

      {phase === "done" && (
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="card border-teal-200"
        >
          <motion.div
            initial={reduce ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 18 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-brand-dark text-3xl shadow"
          >
            <span aria-hidden="true">🎉</span>
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-900">
            You&rsquo;re now on <span className="text-gradient">{TIER_LABELS[tier]}</span>!
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-slate-600">
            Your payment went through and every {TIER_LABELS[tier]} feature is unlocked. Thanks for
            upgrading.
          </p>
          {/* Full navigation so the nav + gates re-read the new tier app-wide. */}
          <a href="/dashboard" className="btn-primary mt-6 inline-flex">
            Go to your dashboard
          </a>
        </motion.div>
      )}

      {phase === "timeout" && (
        <div className="card border-amber-200">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-brand-dark text-3xl shadow">
            <span aria-hidden="true">🎉</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Payment received!</h1>
          <p className="mx-auto mt-2 max-w-sm text-slate-600">
            Thanks for upgrading. Your plan is finalizing — this can take a few seconds. Refresh to
            check, or head back in and it&rsquo;ll be ready shortly.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => window.location.reload()} className="btn-primary">
              Refresh
            </button>
            <a href="/dashboard" className="btn-secondary inline-flex">
              Go to dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
