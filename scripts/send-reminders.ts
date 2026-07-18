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

  for (const profile of due) {
    const flagResult = await evaluateAndReconcile(profile.userId, now);
    const summary = await buildCheckInSummary(profile.userId, now);

    // TODO: send a real notification here (email/SMS). Link back into the app;
    // do NOT include sensitive details in the message body.
    // eslint-disable-next-line no-console
    console.log(
      `[reminders] notified ${profile.user.email}: ` +
        `${flagResult.totalFindings} flag(s) checked (${flagResult.created} new); ` +
        `${summary.estateNeedsReview} estate document(s) needing review; ` +
        `${summary.goalsBehind} goal(s) behind pace; ` +
        `${summary.checklistItemsOutstanding} checklist item(s) outstanding.`,
    );

    const next = new Date(now);
    next.setDate(next.getDate() + QUARTER_DAYS);
    await prisma.profile.update({
      where: { userId: profile.userId },
      data: { nextReviewDate: next },
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
