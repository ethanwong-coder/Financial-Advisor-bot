/**
 * Seed a demo user whose case file intentionally triggers several flags, so the
 * dashboard and rules engine can be exercised end-to-end.
 *
 * Run: npm run db:seed   (after `prisma migrate dev`)
 * Login: demo@example.com / password123
 */
import { prisma } from "../src/lib/db/prisma";
import { hashPassword } from "../src/lib/password";
import { evaluateAndReconcile } from "../src/lib/flags/reconcile";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

async function main() {
  const email = "demo@example.com";
  const passwordHash = await hashPassword("password123");

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: "Demo User" },
  });

  // Reset the demo case file for idempotency.
  await prisma.flag.deleteMany({ where: { userId: user.id } });
  await prisma.account.deleteMany({ where: { userId: user.id } });
  await prisma.familyMember.deleteMany({ where: { userId: user.id } });

  const nextReviewDate = new Date(); // due now

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      maritalStatus: "DIVORCED",
      dateOfBirth: d("1968-07-04"),
      stateOfResidence: "TX",
      nextReviewDate,
    },
    create: {
      userId: user.id,
      maritalStatus: "DIVORCED",
      dateOfBirth: d("1968-07-04"),
      stateOfResidence: "TX",
      nextReviewDate,
    },
  });

  await prisma.familyMember.create({
    data: {
      userId: user.id,
      relationship: "FORMER_SPOUSE",
      fullName: "Alex Rivera",
      divorceDate: d("2021-03-01"),
    },
  });

  // 401(k) still naming the ex-spouse -> EX_SPOUSE_LISTED (HIGH).
  await prisma.account.create({
    data: {
      userId: user.id,
      source: "MANUAL",
      nickname: "Old employer 401(k)",
      accountType: "PLAN_401K",
      institutionName: "Fidelity",
      balance: "142000.00",
      beneficiaryPrimaryName: "Alex Rivera",
      beneficiaryPrimaryRelationship: "FORMER_SPOUSE",
      beneficiaryLastConfirmed: d("2015-06-01"),
    },
  });

  // Inherited IRA: owner died 2021, born 1945 (well past RBD), non-eligible
  // beneficiary, no distribution recorded -> 10-year deadline + BEHIND flag.
  await prisma.account.create({
    data: {
      userId: user.id,
      source: "MANUAL",
      nickname: "Inherited IRA (from Dad)",
      accountType: "INHERITED_IRA",
      institutionName: "Schwab",
      balance: "88000.00",
      inheritedIraDetail: {
        create: {
          originalOwnerName: "Robert Rivera",
          originalOwnerDateOfDeath: d("2021-08-15"),
          originalOwnerDateOfBirth: d("1945-02-10"),
          beneficiaryClass: "NON_ELIGIBLE",
          beneficiaryDateOfBirth: d("1968-07-04"),
          currentYearDistribution: "0",
          priorYearEndBalance: "90000.00",
        },
      },
    },
  });

  // Give the demo user a PRO subscription so every gated feature (chat, the
  // full calculator suite, checklists, goals, family, reports) is exercisable
  // without Stripe. Tier is read from this row — the single source of truth.
  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 10);
  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      tier: "PRO",
      status: "ACTIVE",
      billingInterval: "ANNUAL",
      currentPeriodEnd: farFuture,
    },
    create: {
      userId: user.id,
      tier: "PRO",
      status: "ACTIVE",
      billingInterval: "ANNUAL",
      currentPeriodEnd: farFuture,
    },
  });

  const result = await evaluateAndReconcile(user.id, new Date());
  // eslint-disable-next-line no-console
  console.log("Seed complete. Flags reconciled:", result);
  // eslint-disable-next-line no-console
  console.log("Login: demo@example.com / password123  (tier: PRO)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
