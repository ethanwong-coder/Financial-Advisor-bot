import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { badRequest, json, requireUser, serverError } from "@/lib/http";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const rows = await prisma.checklistItemState.findMany({
    where: { userId, checked: true },
    select: { checklistKey: true, itemKey: true },
  });
  return json({
    checked: rows.map((r) => ({ checklistKey: r.checklistKey, itemKey: r.itemKey })),
  });
}

const putSchema = z.object({
  checklistKey: z.string().min(1),
  itemKey: z.string().min(1),
  checked: z.boolean(),
});

export async function PUT(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
  const { checklistKey, itemKey, checked } = parsed.data;
  try {
    await prisma.checklistItemState.upsert({
      where: { userId_checklistKey_itemKey: { userId, checklistKey, itemKey } },
      create: { userId, checklistKey, itemKey, checked },
      update: { checked },
    });
    return json({ ok: true });
  } catch (err) {
    log.error("checklist update failed", err);
    return serverError("Could not update the checklist");
  }
}
