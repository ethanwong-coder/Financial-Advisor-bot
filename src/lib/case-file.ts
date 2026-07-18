/**
 * Builds the pure engine snapshot from the database, and derives the list of
 * missing profile facts the chat layer may ask about. Keeps the DB shape and
 * the (pure) rules-engine shape decoupled.
 */
import { prisma } from "@/lib/db/prisma";
import {
  AccountSnapshot,
  CaseFileSnapshot,
} from "@/lib/rules/engine";
import {
  AccountType,
  BeneficiaryRelationship,
  InheritedIraBeneficiaryClass,
  MaritalStatus,
  PASSES_BY_BENEFICIARY,
} from "@/lib/rules/types";
import type { Prisma } from "@prisma/client";

type UserWithCaseFile = Prisma.UserGetPayload<{
  include: {
    profile: true;
    familyMembers: true;
    lifeEvents: true;
    accounts: { include: { inheritedIraDetail: true } };
  };
}>;

function maxDate(dates: (Date | null | undefined)[]): Date | undefined {
  const valid = dates.filter((d): d is Date => d instanceof Date);
  if (valid.length === 0) return undefined;
  return valid.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b));
}

export interface LoadedCaseFile {
  snapshot: CaseFileSnapshot;
  /** account id -> human label (nickname) for display in chat/UI. */
  accountLabels: Record<string, string>;
  /** Missing facts the chat layer may ask the user to fill in. */
  profileGaps: string[];
}

export async function loadCaseFile(userId: string): Promise<LoadedCaseFile> {
  const user = (await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      familyMembers: true,
      lifeEvents: true,
      accounts: { include: { inheritedIraDetail: true } },
    },
  })) as UserWithCaseFile | null;

  if (!user) {
    return {
      snapshot: { profile: { maritalStatus: "SINGLE" }, accounts: [] },
      accountLabels: {},
      profileGaps: [],
    };
  }

  const formerSpouseNames = user.familyMembers
    .filter((m) => m.relationship === "FORMER_SPOUSE")
    .map((m) => m.fullName);

  const spouseMember = user.familyMembers.find((m) => m.relationship === "SPOUSE");
  const currentSpouseName =
    user.profile?.currentSpouseName ?? spouseMember?.fullName ?? undefined;

  const lastMarriageDate = maxDate([
    ...user.lifeEvents.filter((e) => e.type === "MARRIAGE").map((e) => e.eventDate),
    ...user.familyMembers.map((m) => m.marriageDate),
  ]);
  const lastDivorceDate = maxDate([
    ...user.lifeEvents.filter((e) => e.type === "DIVORCE").map((e) => e.eventDate),
    ...user.familyMembers.map((m) => m.divorceDate),
  ]);

  const accountLabels: Record<string, string> = {};
  const accounts: AccountSnapshot[] = user.accounts.map((a) => {
    accountLabels[a.id] = a.nickname;
    const snapshot: AccountSnapshot = {
      ref: a.id,
      accountType: a.accountType as AccountType,
      beneficiaryPrimaryName: a.beneficiaryPrimaryName ?? undefined,
      beneficiaryPrimaryRelationship:
        (a.beneficiaryPrimaryRelationship as BeneficiaryRelationship | null) ??
        undefined,
      beneficiaryLastConfirmed: a.beneficiaryLastConfirmed ?? undefined,
    };
    if (a.accountType === "INHERITED_IRA" && a.inheritedIraDetail) {
      const d = a.inheritedIraDetail;
      snapshot.inheritedIra = {
        ownerDateOfDeath: d.originalOwnerDateOfDeath,
        ownerDateOfBirth: d.originalOwnerDateOfBirth ?? undefined,
        beneficiaryClass: d.beneficiaryClass as InheritedIraBeneficiaryClass,
        beneficiaryDateOfBirth: d.beneficiaryDateOfBirth ?? undefined,
        currentYearDistribution:
          d.currentYearDistribution != null
            ? Number(d.currentYearDistribution)
            : undefined,
        priorYearEndBalance:
          d.priorYearEndBalance != null
            ? Number(d.priorYearEndBalance)
            : undefined,
      };
    }
    return snapshot;
  });

  const snapshot: CaseFileSnapshot = {
    profile: {
      maritalStatus: (user.profile?.maritalStatus as MaritalStatus) ?? "SINGLE",
      currentSpouseName,
      formerSpouseNames,
      lastMarriageDate,
      lastDivorceDate,
    },
    accounts,
  };

  return { snapshot, accountLabels, profileGaps: deriveProfileGaps(user) };
}

function deriveProfileGaps(user: UserWithCaseFile): string[] {
  const gaps: string[] = [];
  if (!user.profile?.dateOfBirth) gaps.push("your date of birth");
  if (!user.profile?.stateOfResidence) gaps.push("your state of residence");
  for (const a of user.accounts) {
    if (a.accountType === "INHERITED_IRA" && !a.inheritedIraDetail?.originalOwnerDateOfBirth) {
      gaps.push(`the original owner's date of birth for "${a.nickname}"`);
    }
    if (
      PASSES_BY_BENEFICIARY.has(a.accountType as AccountType) &&
      !a.beneficiaryPrimaryName &&
      (!a.beneficiaryPrimaryRelationship || a.beneficiaryPrimaryRelationship === "NONE")
    ) {
      gaps.push(`the beneficiary on "${a.nickname}"`);
    }
  }
  return gaps;
}
