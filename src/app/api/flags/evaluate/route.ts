import { evaluateAndReconcile } from "@/lib/flags/reconcile";
import { json, requireUser, serverError } from "@/lib/http";
import { log } from "@/lib/log";

export const runtime = "nodejs";

/** Re-run the deterministic rules engine and reconcile flags. */
export async function POST() {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  try {
    const result = await evaluateAndReconcile(userId, new Date());
    return json({ result });
  } catch (err) {
    log.error("evaluate failed", err);
    return serverError("Could not evaluate your case file");
  }
}
