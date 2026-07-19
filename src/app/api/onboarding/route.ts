import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { badRequest, json, requireUser, serverError } from "@/lib/http";
import { log } from "@/lib/log";

export const runtime = "nodejs";

/** Current user's onboarding status. */
export async function GET() {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompletedAt: true },
    });
    const completedAt = user?.onboardingCompletedAt ?? null;
    return json({ completed: completedAt != null, completedAt });
  } catch (err) {
    log.error("onboarding status failed", err);
    return serverError("Could not load onboarding status.");
  }
}

const schema = z.object({
  // "complete" is used both when the tour is finished AND when it's skipped —
  // either way it shouldn't auto-open again. "reset" clears it (unused by the
  // replay button, which just force-opens, but handy for future use).
  action: z.enum(["complete", "reset"]).default("complete"),
});

export async function POST(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;

  // Tolerate an empty body — a bare POST means "complete".
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

  try {
    const completedAt = parsed.data.action === "reset" ? null : new Date();
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: completedAt },
    });
    return json({ completed: completedAt != null, completedAt });
  } catch (err) {
    log.error("onboarding update failed", err);
    return serverError("Could not save onboarding status.");
  }
}
