/**
 * Life-transition checklists — STANDARD task lists, not personalized advice.
 * Static data plus a small completion helper. Each item has a plain-English
 * "why". Beneficiary items point back to the existing beneficiary-mismatch flag
 * system for awareness (they don't duplicate its logic).
 */

export interface ChecklistItem {
  key: string;
  label: string;
  why: string;
}
export interface Checklist {
  key: string;
  title: string;
  blurb: string;
  items: ChecklistItem[];
}

export const CHECKLISTS: Checklist[] = [
  {
    key: "marriage",
    title: "Getting married",
    blurb: "Common financial housekeeping after a marriage.",
    items: [
      { key: "beneficiaries", label: "Update beneficiary designations", why: "Retirement accounts and life insurance pass by beneficiary form, not your will. The dashboard's beneficiary checks can flag mismatches." },
      { key: "estate_docs", label: "Review/create will, POAs, and directives", why: "Marriage changes who you may want to make decisions or inherit." },
      { key: "insurance", label: "Re-evaluate insurance coverage", why: "A spouse may change your life and health insurance needs." },
      { key: "titling", label: "Review account titling and beneficiaries on joint accounts", why: "Decide what should be joint vs. separate." },
      { key: "tax_withholding", label: "Update tax withholding / filing status", why: "Filing status affects withholding and estimated taxes." },
    ],
  },
  {
    key: "divorce",
    title: "Divorce",
    blurb: "Financial items commonly addressed during/after a divorce.",
    items: [
      { key: "beneficiaries", label: "Change beneficiary designations", why: "An ex-spouse often remains listed unless you change it — the beneficiary checks can surface this." },
      { key: "estate_docs", label: "Update will, trust, and POAs", why: "Remove or change roles/inheritance tied to a former spouse." },
      { key: "accounts", label: "Separate joint accounts and credit", why: "Untangle shared finances and liability." },
      { key: "qdro", label: "Confirm any retirement-account division (QDRO) is completed", why: "Dividing a 401(k)/pension usually requires a court order." },
      { key: "insurance", label: "Reassess insurance and tax filing status", why: "Coverage needs and filing status usually change." },
    ],
  },
  {
    key: "job_change",
    title: "Job change / severance",
    blurb: "Financial checklist for changing jobs or a layoff.",
    items: [
      { key: "rollover", label: "Decide what to do with the old retirement plan", why: "Options include leaving it, rolling to an IRA, or to a new plan." },
      { key: "equity", label: "Note equity-comp deadlines (option exercise windows, RSUs)", why: "Post-termination exercise windows are often short; taxes can be significant." },
      { key: "benefits", label: "Review new benefits and any coverage gap (COBRA/marketplace)", why: "Avoid a lapse in health/disability coverage." },
      { key: "emergency_fund", label: "Check your emergency fund", why: "A gap between jobs is exactly what it's for." },
      { key: "severance_tax", label: "Plan for the tax on any severance / payout", why: "Lump sums can push you into higher withholding or estimated-tax territory." },
    ],
  },
  {
    key: "inheritance",
    title: "Inheritance / windfall",
    blurb: "Steps often taken after receiving an inheritance or windfall.",
    items: [
      { key: "pause", label: "Park the funds and avoid rushed decisions", why: "There's rarely a need to act immediately." },
      { key: "inherited_ira", label: "Understand inherited-IRA rules if applicable", why: "The 10-year rule and RMDs may apply — the dashboard's inherited-IRA checks cover this." },
      { key: "tax", label: "Understand the tax character of what you received", why: "Cash, retirement accounts, and appreciated assets are taxed very differently." },
      { key: "estate_docs", label: "Update your own estate documents and beneficiaries", why: "New assets should be coordinated with your plan." },
      { key: "professionals", label: "Consider assembling a CPA / attorney / advisor team", why: "Larger windfalls benefit from coordinated professional advice." },
    ],
  },
  {
    key: "relocation",
    title: "Moving to a new state",
    blurb: "Financial items when relocating across state lines.",
    items: [
      { key: "state_tax", label: "Confirm how state income tax rules changed", why: "States differ widely; some have no income tax and others tax retirement income. Confirm your new state's rules (this tool doesn't give state-specific tax advice)." },
      { key: "estate_docs", label: "Have your estate documents reviewed for the new state", why: "POAs, directives, and trusts can be state-specific." },
      { key: "insurance", label: "Update insurance (auto/home/health) for the new location", why: "Rates and required coverage vary by state." },
      { key: "residency", label: "Establish and document new-state residency", why: "Residency affects taxes and can matter if the old state is high-tax." },
      { key: "beneficiaries", label: "Re-check beneficiary and account information", why: "A good moment to confirm everything is current." },
    ],
  },
];

export function checklistByKey(key: string): Checklist | undefined {
  return CHECKLISTS.find((c) => c.key === key);
}

/** Fraction (0..1) of a checklist's items that are checked. */
export function completionFraction(checklist: Checklist, checkedItemKeys: Set<string>): number {
  if (checklist.items.length === 0) return 0;
  const done = checklist.items.filter((i) => checkedItemKeys.has(i.key)).length;
  return done / checklist.items.length;
}
