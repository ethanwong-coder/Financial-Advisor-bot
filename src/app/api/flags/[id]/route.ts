import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { badRequest, json, requireUser, serverError } from "@/lib/http";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const schema = z.object({
  status: z.enum(["OPEN", "DISMISSED", "RESOLVED"]),
  dismissedReason: z.string().trim().max(500).optional().nullable(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

  // Confirm ownership before mutating.
  const existing = await prisma.flag.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return badRequest("Not found");

  try {
    const flag = await prisma.flag.update({
      where: { id },
      data: {
        status: parsed.data.status,
        dismissedReason: parsed.data.dismissedReason ?? null,
        resolvedAt: parsed.data.status === "RESOLVED" ? new Date() : null,
      },
    });
    return json({ flag: { id: flag.id, status: flag.status } });
  } catch (err) {
    log.error("flag update failed", err);
    return serverError("Could not update the flag");
  }
}
