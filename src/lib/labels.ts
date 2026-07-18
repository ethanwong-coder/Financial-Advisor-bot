export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  TRADITIONAL_IRA: "Traditional IRA",
  ROTH_IRA: "Roth IRA",
  INHERITED_IRA: "Inherited IRA",
  PLAN_401K: "401(k)",
  PLAN_403B: "403(b)",
  HSA: "HSA",
  LIFE_INSURANCE: "Life insurance",
  ANNUITY: "Annuity",
  BROKERAGE: "Brokerage",
  BANK_CHECKING: "Checking",
  BANK_SAVINGS: "Savings",
  OTHER: "Other",
};

export const RELATIONSHIP_LABELS: Record<string, string> = {
  SPOUSE: "Spouse",
  FORMER_SPOUSE: "Former spouse",
  CHILD: "Child",
  GRANDCHILD: "Grandchild",
  PARENT: "Parent",
  SIBLING: "Sibling",
  TRUST: "Trust",
  ESTATE: "Estate",
  CHARITY: "Charity",
  OTHER: "Other",
  NONE: "None",
};

export const INHERITED_CLASS_LABELS: Record<string, string> = {
  SPOUSE: "Surviving spouse (EDB)",
  MINOR_CHILD_OF_OWNER: "Minor child of the owner (EDB)",
  DISABLED: "Disabled (EDB)",
  CHRONICALLY_ILL: "Chronically ill (EDB)",
  NOT_MORE_THAN_10_YEARS_YOUNGER: "Not >10 years younger than owner (EDB)",
  NON_ELIGIBLE: "Non-eligible designated beneficiary (10-year rule)",
  NON_PERSON: "Estate / charity / non-qualifying trust",
};

export function currency(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}
