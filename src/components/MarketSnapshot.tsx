"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Skeleton } from "./Skeleton";
import type { MarketResult } from "@/lib/market/quotes";

/** Presentational view — pure, so it can be previewed/tested with mock data. */
export function MarketSnapshotView({ result }: { result: MarketResult | null }) {
  const reduce = useReducedMotion();

  if (result === null) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (result.status === "unavailable") {
    return (
      <div className="rounded-xl border border-slate-200/70 bg-white/60 px-4 py-6 text-center text-sm text-slate-500">
        Market data unavailable right now.
        {result.reason === "no_api_key" && (
          <span className="mt-1 block text-xs text-slate-400">
            Add MARKET_DATA_API_KEY to enable the snapshot.
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {result.quotes.map((q, i) => {
        const up = q.changePercent >= 0;
        return (
          <motion.div
            key={q.symbol}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: reduce ? 0 : i * 0.05 }}
            className="rounded-xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-slate-700">{q.label}</span>
              <span className="text-[11px] text-slate-400">{q.symbol}</span>
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
              {q.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div
              className={`mt-0.5 text-sm font-medium tabular-nums ${
                up ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {up ? "▲" : "▼"} {up ? "+" : ""}
              {q.change.toFixed(2)} ({up ? "+" : ""}
              {q.changePercent.toFixed(2)}%)
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/** Container — fetches the snapshot and refreshes each minute (server caches). */
export function MarketSnapshot() {
  const [result, setResult] = useState<MarketResult | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/market")
        .then((r) =>
          r.ok ? r.json() : ({ status: "unavailable", reason: "request_failed" } as MarketResult),
        )
        .then((d: MarketResult) => alive && setResult(d))
        .catch(() =>
          alive && setResult({ status: "unavailable", reason: "request_failed" }),
        );
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return <MarketSnapshotView result={result} />;
}
