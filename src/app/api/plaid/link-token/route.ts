import { getPlaidAdapter } from "@/lib/plaid/client";
import { json, requireUser, serverError } from "@/lib/http";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST() {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  try {
    const adapter = getPlaidAdapter();
    const linkToken = await adapter.createLinkToken(userId);
    return json({ linkToken, mode: adapter.mode });
  } catch (err) {
    log.error("plaid link-token failed", err);
    return serverError("Could not create a Plaid link token");
  }
}
