import { getMarketSnapshot } from "@/lib/market/quotes";
import { json, requireUser } from "@/lib/http";

export const runtime = "nodejs";

/**
 * Informational market snapshot. Requires a session (only dashboard users hit
 * it) but carries NO user data — it returns general index levels only. Results
 * are cached 60s inside getMarketSnapshot(), so this is safe to poll.
 */
export async function GET() {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const snapshot = await getMarketSnapshot();
  return json(snapshot);
}
