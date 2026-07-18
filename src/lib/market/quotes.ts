/**
 * Market snapshot — INFORMATIONAL ONLY.
 *
 * This module is intentionally isolated from the rules engine and flags system.
 * It shows general index levels and has NO connection to the user's accounts,
 * holdings, or any compliance logic. It never influences a flag and is never
 * shown near the flags/assistant.
 *
 * Provider: Finnhub (https://finnhub.io) free tier (~60 calls/min). The free
 * tier doesn't expose raw index symbols, so we use the standard ETF proxies:
 *   SPY -> S&P 500, DIA -> Dow Jones, QQQ -> Nasdaq-100.
 * These are labeled as proxies in the UI so nothing is misrepresented.
 *
 * Responses are cached in-process for 60s so we never hit the API on every
 * page load. If the key is missing or a request fails, we return an
 * "unavailable" result and the dashboard degrades gracefully.
 */
import { log } from "@/lib/log";

export interface IndexQuote {
  symbol: string; // ETF proxy ticker
  label: string; // human label
  price: number;
  change: number; // absolute daily change
  changePercent: number; // daily % change
}

export type MarketResult =
  | { status: "ok"; quotes: IndexQuote[]; asOf: string }
  | { status: "unavailable"; reason: "no_api_key" | "request_failed" };

const INDICES: ReadonlyArray<{ symbol: string; label: string }> = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "DIA", label: "Dow Jones" },
  { symbol: "QQQ", label: "Nasdaq-100" },
];

const TTL_MS = 60_000;

// Process-level cache. Persists across requests on a long-lived server; on
// serverless it's per-instance but still bounds API calls.
let cache: { data: MarketResult; fetchedAt: number } | null = null;

export async function getMarketSnapshot(now: number = Date.now()): Promise<MarketResult> {
  if (cache && now - cache.fetchedAt < TTL_MS) return cache.data;

  const key = process.env.MARKET_DATA_API_KEY;
  if (!key) {
    return store({ status: "unavailable", reason: "no_api_key" }, now);
  }

  try {
    const quotes: IndexQuote[] = [];
    for (const idx of INDICES) {
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(idx.symbol)}&token=${encodeURIComponent(key)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
      const q = (await res.json()) as {
        c?: number; // current
        d?: number; // change
        dp?: number; // percent change
      };
      if (typeof q.c !== "number" || q.c === 0) {
        throw new Error(`Bad quote for ${idx.symbol}`);
      }
      quotes.push({
        symbol: idx.symbol,
        label: idx.label,
        price: q.c,
        change: q.d ?? 0,
        changePercent: q.dp ?? 0,
      });
    }
    return store({ status: "ok", quotes, asOf: new Date(now).toISOString() }, now);
  } catch (err) {
    // Never log the API key (it's in the URL, which we do not log).
    log.warn("market snapshot fetch failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
    // Cache the failure briefly too, so a broken key doesn't hammer the API.
    return store({ status: "unavailable", reason: "request_failed" }, now);
  }
}

function store(data: MarketResult, now: number): MarketResult {
  cache = { data, fetchedAt: now };
  return data;
}
