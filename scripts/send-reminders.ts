/**
 * Quarterly check-in reminder job.
 *
 * Finds users whose next review date has arrived, re-runs the deterministic
 * compliance checks, ALSO surfaces broader planning items (incomplete
 * life-transition checklist items, goals behind pace, estate documents overdue
 * for review), (mock) notifies them, and schedules the next review ~3 months out.
 * Wire a real email/SMS provider where indicated — never put sensitive detail in
 * the message body; link the user back into the app instead.
 *
 * Run manually:  npm run reminders
 * Schedule (cron; daily is fine, it only acts on due users):
 *   0 13 * * *  cd /app && node --import tsx scripts/send-reminders.ts
 */
import { prisma } from "../src/lib/db/prisma";
import { evaluateAndReconcile } from "../src/lib/flags/reconcile";
import { computeDocumentStatus } from "../src/lib/planning/estate-documents";
import { goalProgress } from "../src/lib/planning/goals";
import { CHECKLISTS } from "../src/lib/planning/checklists";
import { getUserTier } from "../src/lib/billing/entitlements";

const QUARTER_DAYS = 91;

interface CheckInSummary {
  estateNeedsReview: number;
  goalsBehind: number;
  checklistItemsOutstanding: number;
}

async function buildCheckInSummary(userId: string, now: Date): Promise<CheckInSummary> {
  const [docs, lastEvent, goals, checklistStates] = await Promise.all([
    prisma.estateDocument.findMany({ where: { userId } }),
    prisma.lifeEvent.findFirst({ where: { userId }, orderBy: { eventDate: "desc" }, select: { eventDate: true } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.checklistItemState.findMany({ where: { userId, checked: true }, select: { checklistKey: true, itemKey: true } }),
  ]);

  const lastLifeEventDate = lastEvent?.eventDate ?? null;
  const estateNeedsReview = docs.filter(
    (d) =>
      computeDocumentStatus({ exists: d.exists, lastReviewed: d.lastReviewed }, { now, lastLifeEventDate })
        .status !== "UP_TO_DATE",
  ).length;

  const goalsBehind = goals.filter((g) => {
    const p = goalProgress({
      targetAmount: Number(g.targetAmount),
      currentSaved: Number(g.currentSaved),
      targetDate: g.targetDate,
      startDate: g.startDate,
      now,
    });
    return p.onPace === false;
  }).length;

  // Count outstanding items only for checklists the user has actually started.
  const checkedByList = new Map<string, Set<string>>();
  for (const s of checklistStates) {
    if (!checkedByList.has(s.checklistKey)) checkedByList.set(s.checklistKey, new Set());
    checkedByList.get(s.checklistKey)!.add(s.itemKey);
  }
  let checklistItemsOutstanding = 0;
  for (const cl of CHECKLISTS) {
    const started = checkedByList.get(cl.key);
    if (started && started.size > 0) {
      checklistItemsOutstanding += cl.items.filter((i) => !started.has(i.key)).length;
    }
  }

  return { estateNeedsReview, goalsBehind, checklistItemsOutstanding };
}

async function main() {
  const now = new Date();
  const due = await prisma.profile.findMany({
    where: { nextReviewDate: { lte: now } },
    include: { user: { select: { id: true, email: true } } },
  });

  // eslint-disable-next-line no-console
  console.log(`[reminders] ${due.length} user(s) due for a quarterly review.`);

  let processed = 0;
  let skippedFree = 0;

  for (const profile of due) {
    // FREE tier gets NO automatic re-evaluation — they run checks manually on
    // the dashboard. Skip without rescheduling so an upgrade takes effect next run.
    const tier = await getUserTier(profile.userId, now);
    if (tier === "FREE") {
      skippedFree += 1;
      continue;
    }

    const flagResult = await evaluateAndReconcile(profile.userId, now);

    // PRO gets the expanded check-in content; PLUS gets flag re-evaluation only.
    let extra = "";
    if (tier === "PRO") {
      const summary = await buildCheckInSummary(profile.userId, now);
      extra =
        `; ${summary.estateNeedsReview} estate document(s) needing review; ` +
        `${summary.goalsBehind} goal(s) behind pace; ` +
        `${summary.checklistItemsOutstanding} checklist item(s) outstanding`;
    }

    // TODO: send a real notification here (email/SMS). Link back into the app;
    // do NOT include sensitive details in the message body.
    // eslint-disable-next-line no-console
    console.log(
      `[reminders] notified ${profile.user.email} (${tier}): ` +
        `${flagResult.totalFindings} flag(s) checked (${flagResult.created} new)${extra}.`,
    );

    const next = new Date(now);
    next.setDate(next.getDate() + QUARTER_DAYS);
    await prisma.profile.update({
      where: { userId: profile.userId },
      data: { nextReviewDate: next },
    });
    processed += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`[reminders] processed ${processed}, skipped ${skippedFree} free-tier user(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
