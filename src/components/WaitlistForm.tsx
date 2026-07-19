"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Spinner } from "@/components/Spinner";

type Result =
  | { kind: "pending" }
  | { kind: "confirmed" }
  | { kind: "error"; message: string };

export function WaitlistForm() {
  const reduce = useReducedMotion();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — stays empty for humans
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({
          kind: "error",
          message: data.message ?? data.error ?? "Something went wrong. Please try again.",
        });
        return;
      }
      setResult({ kind: data.status === "confirmed" ? "confirmed" : "pending" });
      setEmail("");
    } catch {
      setResult({ kind: "error", message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.kind === "pending" || result?.kind === "confirmed") {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 text-sm text-teal-900"
        role="status"
      >
        {result.kind === "confirmed" ? (
          <>You&rsquo;re already on the list — see you soon! 🎉</>
        ) : (
          <>
            Almost there — check your inbox for a confirmation link to lock in your
            spot. (In this preview, the link is printed to the server console.)
          </>
        )}
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          className="input flex-1"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          autoComplete="email"
          aria-label="Email address"
        />
        <button className="btn-primary shrink-0" disabled={submitting || !email.trim()}>
          {submitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" /> Joining…
            </>
          ) : (
            "Join the waitlist"
          )}
        </button>
      </div>

      {/* Honeypot: off-screen, not display:none, hidden from real users and AT. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden">
        <label>
          Leave this field empty
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {result?.kind === "error" && (
        <p className="text-sm text-rose-600">{result.message}</p>
      )}
      <p className="text-xs text-slate-500">
        No spam. One confirmation email, then occasional launch updates. Unsubscribe anytime.
      </p>
    </form>
  );
}
