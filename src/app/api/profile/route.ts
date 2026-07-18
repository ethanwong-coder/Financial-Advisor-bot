import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { badRequest, json, requireUser, serverError } from "@/lib/http";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const optionalDate = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? new Date(v) : null));

const schema = z.object({
  fullName: z.string().trim().optional().nullable(),
  stateOfResidence: z.string().trim().max(2).optional().nullable(),
  dateOfBirth: optionalDate,
  maritalStatus: z
    .enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "SEPARATED"])
    .optional(),
  currentSpouseName: z.string().trim().optional().nullable(),
  dependentsCount: z.number().int().min(0).max(30).optional(),
});

export async function GET() {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const profile = await prisma.profile.findUnique({ where: { userId } });
  return json({ profile });
}

export async function PUT(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

  const data = parsed.data;
  try {
    const profile = await prisma.profile.upsert({
      where: { userId },
      create: { userId, ...cleanUndefined(data) },
      update: cleanUndefined(data),
    });
    return json({ profile });
  } catch (err) {
    log.error("profile update failed", err);
    return serverError("Could not save profile");
  }
}

// Drop keys that are `undefined` so they don't overwrite existing values.
function cleanUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
