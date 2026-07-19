"use client";

import { useEffect, useState } from "react";
import { Tier } from "@/lib/billing/tiers";

// Module-level cache so multiple gates on one page share a single request.
let cache: Tier | null = null;
let inflight: Promise<Tier> | null = null;

async function fetchTier(): Promise<Tier> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch("/api/billing/me")
      .then((r) => (r.ok ? r.json() : { tier: "FREE" as Tier }))
      .then((d: { tier?: Tier }) => {
        cache = d.tier ?? "FREE";
        return cache;
      })
      .catch(() => "FREE" as Tier);
  }
  return inflight;
}

/** Returns the current user's tier, or null while loading. UI only — real
 * enforcement is server-side on the gated routes. */
export function useTier(): Tier | null {
  const [tier, setTier] = useState<Tier | null>(cache);
  useEffect(() => {
    let alive = true;
    fetchTier().then((t) => {
      if (alive) setTier(t);
    });
    return () => {
      alive = false;
    };
  }, []);
  return tier;
}
