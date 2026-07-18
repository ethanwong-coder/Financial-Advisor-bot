import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getPlaidAdapter } from "@/lib/plaid/client";
import { encryptField } from "@/lib/crypto/field-encryption";
import { badRequest, json, requireUser, serverError } from "@/lib/http";
import { log } from "@/lib/log";

export const runtime = "nodejs";

// In mock mode the client can call this with no public_token.
const schema = z.object({ publicToken: z.string().optional() });

export async function POST(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // allow empty body (mock mode)
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

  const adapter = getPlaidAdapter();
  if (adapter.mode === "live" && !parsed.data.publicToken) {
    return badRequest("publicToken is required in live mode");
  }

  try {
    const { accessToken, itemId, institutionName } =
      await adapter.exchangePublicToken(parsed.data.publicToken ?? "");

    // Store the access token ENCRYPTED at rest, never in plaintext.
    await prisma.plaidItem.upsert({
      where: { itemId },
      create: {
        userId,
        itemId,
        accessTokenEnc: encryptField(accessToken)!,
        institutionName,
      },
      update: { accessTokenEnc: encryptField(accessToken)!, institutionName },
    });

    const accounts = await adapter.getAccounts(accessToken);

    // Upsert linked accounts (dedupe by plaidAccountId).
    let linked = 0;
    for (const a of accounts) {
      const existing = await prisma.account.findFirst({
        where: { userId, plaidAccountId: a.plaidAccountId },
        select: { id: true },
      });
      if (existing) {
        await prisma.account.update({
          where: { id: existing.id },
          data: {
            balance: a.balance ?? undefined,
            balanceAsOf: new Date(),
            institutionName: a.institutionName ?? undefined,
          },
        });
      } else {
        await prisma.account.create({
          data: {
            userId,
            source: "PLAID",
            plaidItemId: itemId,
            plaidAccountId: a.plaidAccountId,
            institutionName: a.institutionName,
            accountType: a.accountType,
            nickname: a.nickname,
            balance: a.balance ?? undefined,
            balanceAsOf: new Date(),
          },
        });
        linked += 1;
      }
    }

    return json({
      linked,
      total: accounts.length,
      mode: adapter.mode,
      note:
        "Plaid does not provide beneficiary designations. Add beneficiaries manually on each linked account.",
    });
  } catch (err) {
    log.error("plaid exchange failed", err);
    return serverError("Could not link accounts via Plaid");
  }
}
