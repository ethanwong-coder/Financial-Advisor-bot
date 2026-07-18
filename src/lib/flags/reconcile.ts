/**
 * Reconciles the deterministic engine's findings into persistent Flag rows.
 *
 * - New finding -> new OPEN flag.
 * - Existing finding -> refresh title/detail/severity/lastSeenAt, PRESERVE the
 *   user's status (a DISMISSED or RESOLVED flag stays that way).
 * - An OPEN flag no longer detected -> auto-resolved ("No longer detected").
 *
 * Stability comes from `dedupeKey = "<accountId|profile>:<code>"`, unique per
 * user, so status survives every re-evaluation.
 */
import { prisma } from "@/lib/db/prisma";
import { runRulesEngine } from "@/lib/rules/engine";
import type { RuleFinding } from "@/lib/rules/types";
import { loadCaseFile } from "@/lib/case-file";
import type { Prisma, RuleId, Severity } from "@prisma/client";

export interface ReconcileResult {
  created: number;
  updated: number;
  autoResolved: number;
  totalFindings: number;
}

export async function evaluateAndReconcile(
  userId: string,
  today: Date = new Date(),
): Promise<ReconcileResult> {
  const { snapshot } = await loadCaseFile(userId);
  const findings = runRulesEngine(snapshot, today);
  return reconcileFindings(userId, findings, today);
}

export async function reconcileFindings(
  userId: string,
  findings: RuleFinding[],
  now: Date = new Date(),
): Promise<ReconcileResult> {
  // Which accountRefs are real accounts owned by this user?
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true },
  });
  const accountIds = new Set(accounts.map((a) => a.id));

  const result: ReconcileResult = {
    created: 0,
    updated: 0,
    autoResolved: 0,
    totalFindings: findings.length,
  };
  const seenKeys = new Set<string>();

  for (const f of findings) {
    const accountId =
      f.accountRef && accountIds.has(f.accountRef) ? f.accountRef : null;
    const dedupeKey = `${accountId ?? "profile"}:${f.code}`;
    seenKeys.add(dedupeKey);

    const dataJson = (f.data ?? undefined) as Prisma.InputJsonValue | undefined;

    const existing = await prisma.flag.findUnique({
      where: { userId_dedupeKey: { userId, dedupeKey } },
      select: { id: true },
    });

    await prisma.flag.upsert({
      where: { userId_dedupeKey: { userId, dedupeKey } },
      create: {
        userId,
        accountId,
        ruleId: f.ruleId as RuleId,
        code: f.code,
        severity: f.severity as Severity,
        title: f.title,
        detail: f.detail,
        dataJson,
        dedupeKey,
      },
      update: {
        // Refresh the descriptive fields; do NOT touch `status`.
        ruleId: f.ruleId as RuleId,
        severity: f.severity as Severity,
        title: f.title,
        detail: f.detail,
        dataJson,
        lastSeenAt: now,
      },
    });

    if (existing) result.updated += 1;
    else result.created += 1;
  }

  // Auto-resolve OPEN flags that are no longer detected.
  const stillOpen = await prisma.flag.findMany({
    where: { userId, status: "OPEN" },
    select: { id: true, dedupeKey: true },
  });
  const toResolve = stillOpen.filter((f) => !seenKeys.has(f.dedupeKey));
  if (toResolve.length > 0) {
    await prisma.flag.updateMany({
      where: { id: { in: toResolve.map((f) => f.id) } },
      data: {
        status: "RESOLVED",
        resolvedAt: now,
        dismissedReason: "No longer detected",
      },
    });
    result.autoResolved = toResolve.length;
  }

  return result;
}
