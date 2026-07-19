import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { badRequest, json, requireUser, serverError } from "@/lib/http";
import { encryptField } from "@/lib/crypto/field-encryption";
import { getUserTier } from "@/lib/billing/entitlements";
import { accountLimit } from "@/lib/billing/tiers";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const optionalDate = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? new Date(v) : null));

const ACCOUNT_TYPES = [
  "TRADITIONAL_IRA",
  "ROTH_IRA",
  "INHERITED_IRA",
  "PLAN_401K",
  "PLAN_403B",
  "HSA",
  "LIFE_INSURANCE",
  "ANNUITY",
  "BROKERAGE",
  "BANK_CHECKING",
  "BANK_SAVINGS",
  "OTHER",
] as const;

const BENEFICIARY_RELATIONSHIPS = [
  "SPOUSE",
  "FORMER_SPOUSE",
  "CHILD",
  "GRANDCHILD",
  "PARENT",
  "SIBLING",
  "TRUST",
  "ESTATE",
  "CHARITY",
  "OTHER",
  "NONE",
] as const;

const INHERITED_CLASSES = [
  "SPOUSE",
  "MINOR_CHILD_OF_OWNER",
  "DISABLED",
  "CHRONICALLY_ILL",
  "NOT_MORE_THAN_10_YEARS_YOUNGER",
  "NON_ELIGIBLE",
  "NON_PERSON",
] as const;

const inheritedIraSchema = z.object({
  originalOwnerName: z.string().trim().optional().nullable(),
  originalOwnerDateOfBirth: optionalDate,
  originalOwnerDateOfDeath: z.string().min(1),
  beneficiaryClass: z.enum(INHERITED_CLASSES),
  beneficiaryDateOfBirth: optionalDate,
  currentYearDistribution: z.number().min(0).optional().nullable(),
  priorYearEndBalance: z.number().min(0).optional().nullable(),
});

const schema = z.object({
  nickname: z.string().trim().min(1),
  accountType: z.enum(ACCOUNT_TYPES),
  institutionName: z.string().trim().optional().nullable(),
  balance: z.number().optional().nullable(),
  accountNumber: z.string().trim().optional().nullable(),
  beneficiaryPrimaryName: z.string().trim().optional().nullable(),
  beneficiaryPrimaryRelationship: z.enum(BENEFICIARY_RELATIONSHIPS).optional().nullable(),
  beneficiaryContingentName: z.string().trim().optional().nullable(),
  beneficiaryLastConfirmed: optionalDate,
  inheritedIra: inheritedIraSchema.optional().nullable(),
});

export async function GET() {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const accounts = await prisma.account.findMany({
    where: { userId },
    include: { inheritedIraDetail: true },
    orderBy: { createdAt: "asc" },
  });
  // Never return the encrypted account number; return a masked hint only.
  const safe = accounts.map(({ accountNumberEnc, ...a }) => ({
    ...a,
    balance: a.balance != null ? Number(a.balance) : null,
    accountNumberMasked: accountNumberEnc ? "••••" : null,
    inheritedIraDetail: a.inheritedIraDetail
      ? {
          ...a.inheritedIraDetail,
          currentYearDistribution:
            a.inheritedIraDetail.currentYearDistribution != null
              ? Number(a.inheritedIraDetail.currentYearDistribution)
              : null,
          priorYearEndBalance:
            a.inheritedIraDetail.priorYearEndBalance != null
              ? Number(a.inheritedIraDetail.priorYearEndBalance)
              : null,
        }
      : null,
  }));
  return json({ accounts: safe });
}

export async function POST(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;

  // Free tier is limited to a single connected account.
  const tier = await getUserTier(userId);
  const existingCount = await prisma.account.count({ where: { userId } });
  if (existingCount >= accountLimit(tier)) {
    return json(
      {
        error: "upgrade_required",
        feature: "unlimited_accounts",
        currentTier: tier,
        requiredTier: "PLUS",
        message: "The Free plan is limited to 1 connected account. Upgrade to Plus for unlimited accounts.",
      },
      403,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
  const d = parsed.data;

  if (d.accountType === "INHERITED_IRA" && !d.inheritedIra) {
    return badRequest("Inherited IRA accounts require inherited-IRA details");
  }

  try {
    const account = await prisma.account.create({
      data: {
        userId,
        source: "MANUAL",
        nickname: d.nickname,
        accountType: d.accountType,
        institutionName: d.institutionName ?? undefined,
        balance: d.balance ?? undefined,
        accountNumberEnc: encryptField(d.accountNumber) ?? undefined,
        beneficiaryPrimaryName: d.beneficiaryPrimaryName ?? undefined,
        beneficiaryPrimaryRelationship: d.beneficiaryPrimaryRelationship ?? undefined,
        beneficiaryContingentName: d.beneficiaryContingentName ?? undefined,
        beneficiaryLastConfirmed: d.beneficiaryLastConfirmed ?? undefined,
        inheritedIraDetail:
          d.accountType === "INHERITED_IRA" && d.inheritedIra
            ? {
                create: {
                  originalOwnerName: d.inheritedIra.originalOwnerName ?? undefined,
                  originalOwnerDateOfBirth:
                    d.inheritedIra.originalOwnerDateOfBirth ?? undefined,
                  originalOwnerDateOfDeath: new Date(
                    d.inheritedIra.originalOwnerDateOfDeath,
                  ),
                  beneficiaryClass: d.inheritedIra.beneficiaryClass,
                  beneficiaryDateOfBirth:
                    d.inheritedIra.beneficiaryDateOfBirth ?? undefined,
                  currentYearDistribution:
                    d.inheritedIra.currentYearDistribution ?? undefined,
                  priorYearEndBalance:
                    d.inheritedIra.priorYearEndBalance ?? undefined,
                },
              }
            : undefined,
      },
      include: { inheritedIraDetail: true },
    });
    return json(
      {
        account: {
          id: account.id,
          nickname: account.nickname,
          accountType: account.accountType,
          accountNumberMasked: account.accountNumberEnc ? "••••" : null,
        },
      },
      201,
    );
  } catch (err) {
    log.error("account create failed", err);
    return serverError("Could not add account");
  }
}
