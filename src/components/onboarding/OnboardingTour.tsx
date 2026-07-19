"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ONBOARDING_STEPS,
  type OnboardingStep,
  type StepTier,
} from "@/lib/onboarding/steps";

/** sessionStorage flag the "Replay tutorial" button sets before navigating. */
export const REPLAY_FLAG = "eo:replayTour";

const N = ONBOARDING_STEPS.length;

function TierBadge({ tier }: { tier: StepTier }) {
  const cls =
    tier === "PRO"
      ? "bg-violet-100 text-violet-800"
      : "bg-teal-100 text-teal-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {tier === "PRO" ? "Pro" : "Plus"}
    </span>
  );
}

export function OnboardingTour() {
  const reduce = useReducedMotion();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const statusChecked = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const step: OnboardingStep = ONBOARDING_STEPS[index];
  const isFirst = index === 0;
  const isLast = index === N - 1;

  // Persist completion (used for both "finished" and "skipped").
  const markComplete = useCallback(() => {
    // Fire-and-forget; the modal closes immediately regardless of the result.
    fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    }).catch(() => {});
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
    markComplete();
  }, [markComplete]);

  // First-run gating: check status once on mount, open if not completed.
  useEffect(() => {
    if (statusChecked.current) return;
    statusChecked.current = true;
    let cancelled = false;
    fetch("/api/onboarding")
      .then((r) => (r.ok ? r.json() : { completed: true }))
      .then((d) => {
        if (!cancelled && !d.completed) {
          setIndex(0);
          setOpen(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Replay: the button sets a sessionStorage flag then navigates here. The
  // layout-level component doesn't remount on navigation, so we re-check the
  // flag whenever the path changes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(REPLAY_FLAG)) {
      window.sessionStorage.removeItem(REPLAY_FLAG);
      setIndex(0);
      setOpen(true);
    }
  }, [pathname]);

  // Focus the dialog on open, and restore focus to the previously-focused
  // element on close.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, [open]);

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, N - 1));
  }, []);
  const back = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Keyboard: Esc skips; ←/→ navigate; Tab is trapped inside the dialog.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        return;
      }
      if (e.key === "ArrowRight" && !isLast) {
        next();
        return;
      }
      if (e.key === "ArrowLeft" && !isFirst) {
        back();
        return;
      }
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [dismiss, next, back, isFirst, isLast],
  );

  const pct = Math.round(((index + 1) / N) * 100);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop — click to skip. */}
          <button
            aria-label="Skip tour"
            tabIndex={-1}
            onClick={dismiss}
            className="absolute inset-0 h-full w-full cursor-default bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            aria-describedby="onboarding-summary"
            tabIndex={-1}
            onKeyDown={onKeyDown}
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="card relative z-10 w-full max-w-lg outline-none"
          >
            {/* Header row: progress + skip */}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Step {index + 1} of {N}
              </span>
              <button
                onClick={dismiss}
                className="text-sm font-medium text-slate-400 transition hover:text-slate-700"
              >
                Skip tour
              </button>
            </div>

            {/* Progress bar */}
            <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-brand-dark"
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ duration: reduce ? 0 : 0.3, ease: "easeOut" }}
              />
            </div>

            {/* Animated step content */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step.id}
                initial={reduce ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-brand-dark text-2xl shadow">
                    <span aria-hidden="true">{step.icon}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <h2
                      id="onboarding-title"
                      className="text-lg font-semibold text-slate-900"
                    >
                      {step.title}
                    </h2>
                    {step.tier && <TierBadge tier={step.tier} />}
                  </div>
                </div>

                <p id="onboarding-summary" className="text-sm leading-relaxed text-slate-600">
                  {step.summary}
                </p>

                {step.items && step.items.length > 0 && (
                  <ul className="mt-4 space-y-2.5">
                    {step.items.map((it) => (
                      <li key={it.label} className="flex gap-2.5 text-sm">
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0 text-brand"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          aria-hidden="true"
                        >
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-slate-600">
                          <span className="font-medium text-slate-800">{it.label}</span>
                          {it.tier && (
                            <>
                              {" "}
                              <TierBadge tier={it.tier} />
                            </>
                          )}{" "}
                          — {it.how}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Footer nav */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={back}
                disabled={isFirst}
                className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>

              {/* Dots */}
              <div className="hidden items-center gap-1.5 sm:flex">
                {ONBOARDING_STEPS.map((s, i) => (
                  <span
                    key={s.id}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index ? "w-4 bg-brand" : "w-1.5 bg-slate-200"
                    }`}
                  />
                ))}
              </div>

              {isLast ? (
                <button onClick={dismiss} className="btn-primary">
                  Finish
                </button>
              ) : (
                <button onClick={next} className="btn-primary">
                  Next
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
