import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { badRequest, json, requireUser, serverError } from "@/lib/http";
import { loadCaseFile } from "@/lib/case-file";
import { runRulesEngine } from "@/lib/rules/engine";
import { isQcdEligible } from "@/lib/planning/qcd";
import { PLANNING_TAX_YEAR } from "@/lib/planning/constants";
import { requireTierFeature } from "@/lib/billing/entitlements";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const IRA_TYPES = new Set(["TRADITIONAL_IRA", "ROTH_IRA", "INHERITED_IRA"]);

/**
 * GET: the QCD tracker context — IRA accounts (with any RMD estimate READ from
 * the existing compliance engine), the year's logged QCD entries, and QCD
 * eligibility from the profile DOB. Nothing here modifies the engine or flags.
 */
export async function GET(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const gate = await requireTierFeature(userId, "calc_qcd");
  if (gate) return gate;

  const taxYear = Number(
    new URL(req.url).searchParams.get("taxYear") ?? PLANNING_TAX_YEAR,
  );

  try {
    // Read-only: run the engine to surface any inherited-IRA RMD estimate.
    const { snapshot } = await loadCaseFile(userId);
    const findings = runRulesEngine(snapshot, new Date());
    const engineRmdByAccount: Record<string, number> = {};
    for (const f of findings) {
      const est = (f.data as { estimatedRmd?: unknown } | undefined)?.estimatedRmd;
      if (f.ruleId === "INHERITED_IRA_10YR" && f.accountRef && typeof est === "number") {
        engineRmdByAccount[f.accountRef] = est;
      }
    }

    const [profile, allAccounts, entries] = await Promise.all([
      prisma.profile.findUnique({ where: { userId }, select: { dateOfBirth: true } }),
      prisma.account.findMany({
        where: { userId },
        select: { id: true, nickname: true, accountType: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.qcdEntry.findMany({
        where: { userId, taxYear },
        include: { account: { select: { nickname: true } } },
        orderBy: { distributionDate: "asc" },
      }),
    ]);

    const accounts = allAccounts
      .filter((a) => IRA_TYPES.has(a.accountType))
      .map((a) => ({
        id: a.id,
        nickname: a.nickname,
        accountType: a.accountType,
        engineRmdEstimate: engineRmdByAccount[a.id] ?? null,
      }));

    return json({
      taxYear,
      dateOfBirth: profile?.dateOfBirth ?? null,
      eligible: isQcdEligible(profile?.dateOfBirth ?? null, new Date()),
      accounts,
      entries: entries.map((e) => ({
        id: e.id,
        accountId: e.accountId,
        accountNickname: e.account.nickname,
        amount: Number(e.amount),
        distributionDate: e.distributionDate,
        charityName: e.charityName,
        taxYear: e.taxYear,
      })),
    });
  } catch (err) {
    log.error("qcd GET failed", err);
    return serverError("Could not load QCD data");
  }
}

const postSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().positive(),
  distributionDate: z.string().min(1),
  charityName: z.string().trim().optional().nullable(),
  taxYear: z.number().int().optional(),
});

export async function POST(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const gate = await requireTierFeature(userId, "calc_qcd");
  if (gate) return gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

  // Confirm the account belongs to the user.
  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, userId },
    select: { id: true },
  });
  if (!account) return badRequest("Account not found");

  try {
    const entry = await prisma.qcdEntry.create({
      data: {
        userId,
        accountId: parsed.data.accountId,
        amount: parsed.data.amount,
        distributionDate: new Date(parsed.data.distributionDate),
        charityName: parsed.data.charityName ?? undefined,
        taxYear: parsed.data.taxYear ?? PLANNING_TAX_YEAR,
      },
      select: { id: true },
    });
    return json({ id: entry.id }, 201);
  } catch (err) {
    log.error("qcd POST failed", err);
    return serverError("Could not log the QCD");
  }
}

export async function DELETE(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const gate = await requireTierFeature(userId, "calc_qcd");
  if (gate) return gate;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("Missing id");
  const res = await prisma.qcdEntry.deleteMany({ where: { id, userId } });
  if (res.count === 0) return badRequest("Not found");
  return json({ ok: true });
}
