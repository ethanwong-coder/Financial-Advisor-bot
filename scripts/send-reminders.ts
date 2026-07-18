/**
 * Quarterly check-in reminder job.
 *
 * Finds users whose next review date has arrived, (mock) notifies them, re-runs
 * the deterministic checks so their flags are current, and schedules the next
 * review ~3 months out. Wire a real email/SMS provider where indicated.
 *
 * Run manually:  npm run reminders
 * Schedule (cron, quarterly-ish — daily is fine, it only acts on due users):
 *   0 13 * * *  cd /app && node --import tsx scripts/send-reminders.ts
 */
import { prisma } from "../src/lib/db/prisma";
import { evaluateAndReconcile } from "../src/lib/flags/reconcile";

const QUARTER_DAYS = 91;

async function main() {
  const now = new Date();
  const due = await prisma.profile.findMany({
    where: { nextReviewDate: { lte: now } },
    include: { user: { select: { id: true, email: true } } },
  });

  // eslint-disable-next-line no-console
  console.log(`[reminders] ${due.length} user(s) due for a quarterly review.`);

  for (const profile of due) {
    const result = await evaluateAndReconcile(profile.userId, now);

    // TODO: send a real notification here (email/SMS). Do NOT include sensitive
    // details in the message body — link the user back into the app instead.
    // eslint-disable-next-line no-console
    console.log(
      `[reminders] notified ${profile.user.email}: ${result.totalFindings} item(s) checked, ${result.created} new flag(s).`,
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
