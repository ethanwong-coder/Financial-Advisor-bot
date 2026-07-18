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
  relationship: z.enum([
    "SPOUSE",
    "FORMER_SPOUSE",
    "CHILD",
    "DEPENDENT",
    "PARENT",
    "SIBLING",
    "OTHER",
  ]),
  fullName: z.string().trim().min(1),
  dateOfBirth: optionalDate,
  marriageDate: optionalDate,
  divorceDate: optionalDate,
  notes: z.string().trim().optional().nullable(),
});

export async function GET() {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const familyMembers = await prisma.familyMember.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return json({ familyMembers });
}

export async function POST(req: Request) {
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
  try {
    const member = await prisma.familyMember.create({
      data: { userId, ...parsed.data },
    });
    return json({ member }, 201);
  } catch (err) {
    log.error("family create failed", err);
    return serverError("Could not add family member");
  }
}

export async function DELETE(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("Missing id");
  // Scope the delete to the current user.
  const res = await prisma.familyMember.deleteMany({ where: { id, userId } });
  if (res.count === 0) return badRequest("Not found");
  return json({ ok: true });
}
