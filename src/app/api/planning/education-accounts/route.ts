import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { badRequest, json, requireUser, serverError } from "@/lib/http";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const [accounts, profile] = await Promise.all([
    prisma.educationAccount.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.profile.findUnique({ where: { userId }, select: { stateOfResidence: true } }),
  ]);
  return json({
    stateOfResidence: profile?.stateOfResidence ?? null,
    accounts: accounts.map((a) => ({
      id: a.id,
      accountType: a.accountType,
      institutionName: a.institutionName,
      beneficiaryName: a.beneficiaryName,
      balance: a.balance != null ? Number(a.balance) : null,
      annualContribution: a.annualContribution != null ? Number(a.annualContribution) : null,
      stateOfPlan: a.stateOfPlan,
    })),
  });
}

const postSchema = z.object({
  accountType: z.enum(["PLAN_529", "COVERDELL"]),
  institutionName: z.string().trim().optional().nullable(),
  beneficiaryName: z.string().trim().optional().nullable(),
  balance: z.number().min(0).optional().nullable(),
  annualContribution: z.number().min(0).optional().nullable(),
  stateOfPlan: z.string().trim().max(2).optional().nullable(),
});

export async function POST(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
  const d = parsed.data;
  try {
    const acct = await prisma.educationAccount.create({
      data: {
        userId,
        accountType: d.accountType,
        institutionName: d.institutionName ?? undefined,
        beneficiaryName: d.beneficiaryName ?? undefined,
        balance: d.balance ?? undefined,
        annualContribution: d.annualContribution ?? undefined,
        stateOfPlan: d.stateOfPlan ?? undefined,
      },
      select: { id: true },
    });
    return json({ id: acct.id }, 201);
  } catch (err) {
    log.error("education account create failed", err);
    return serverError("Could not add the account");
  }
}

export async function DELETE(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("Missing id");
  const res = await prisma.educationAccount.deleteMany({ where: { id, userId } });
  if (res.count === 0) return badRequest("Not found");
  return json({ ok: true });
}
