import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { badRequest, json, requireUser, serverError } from "@/lib/http";
import { requireTierFeature } from "@/lib/billing/entitlements";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const gate = await requireTierFeature(userId, "goals");
  if (gate) return gate;
  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return json({
    goals: goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      currentSaved: Number(g.currentSaved),
      targetDate: g.targetDate,
      startDate: g.startDate,
    })),
  });
}

const postSchema = z.object({
  name: z.string().trim().min(1),
  targetAmount: z.number().positive(),
  currentSaved: z.number().min(0).optional(),
  targetDate: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const gate = await requireTierFeature(userId, "goals");
  if (gate) return gate;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
  try {
    const g = await prisma.goal.create({
      data: {
        userId,
        name: parsed.data.name,
        targetAmount: parsed.data.targetAmount,
        currentSaved: parsed.data.currentSaved ?? 0,
        targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
      },
      select: { id: true },
    });
    return json({ id: g.id }, 201);
  } catch (err) {
    log.error("goal create failed", err);
    return serverError("Could not create the goal");
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  currentSaved: z.number().min(0).optional(),
  targetAmount: z.number().positive().optional(),
  targetDate: z.string().optional().nullable(),
});

export async function PATCH(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const gate = await requireTierFeature(userId, "goals");
  if (gate) return gate;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
  const existing = await prisma.goal.findFirst({
    where: { id: parsed.data.id, userId },
    select: { id: true },
  });
  if (!existing) return badRequest("Not found");
  try {
    await prisma.goal.update({
      where: { id: parsed.data.id },
      data: {
        currentSaved: parsed.data.currentSaved,
        targetAmount: parsed.data.targetAmount,
        targetDate:
          parsed.data.targetDate === undefined
            ? undefined
            : parsed.data.targetDate
              ? new Date(parsed.data.targetDate)
              : null,
      },
    });
    return json({ ok: true });
  } catch (err) {
    log.error("goal update failed", err);
    return serverError("Could not update the goal");
  }
}

export async function DELETE(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const gate = await requireTierFeature(userId, "goals");
  if (gate) return gate;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("Missing id");
  const res = await prisma.goal.deleteMany({ where: { id, userId } });
  if (res.count === 0) return badRequest("Not found");
  return json({ ok: true });
}
