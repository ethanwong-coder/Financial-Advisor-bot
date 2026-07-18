/**
 * Plain-language glossary of concepts used across the planning tools.
 * Static, non-personalized educational content — safe to serve as-is.
 */

export interface GlossaryEntry {
  term: string;
  category: string;
  definition: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "RMD (Required Minimum Distribution)",
    category: "Retirement",
    definition:
      "The minimum amount you must withdraw each year from most tax-deferred retirement accounts once you reach your RMD age (73 for many people today). Missing it can trigger a penalty.",
  },
  {
    term: "Inherited-IRA 10-year rule",
    category: "Retirement",
    definition:
      "For most non-spouse beneficiaries of someone who died in 2020 or later, the entire inherited IRA must be emptied by the end of the 10th year after the original owner's death — sometimes with annual withdrawals along the way.",
  },
  {
    term: "QCD (Qualified Charitable Distribution)",
    category: "Retirement",
    definition:
      "A donation sent directly from your IRA to a charity once you're 70½ or older. It can count toward your RMD and is excluded from taxable income, up to an annual limit.",
  },
  {
    term: "Full Retirement Age (FRA)",
    category: "Retirement",
    definition:
      "The age (66–67 depending on birth year) at which you get your full Social Security benefit. Claiming earlier permanently reduces it; waiting past FRA (to 70) increases it.",
  },
  {
    term: "AMT (Alternative Minimum Tax)",
    category: "Taxes",
    definition:
      "A parallel tax system with its own exemption and rates, meant to ensure higher earners with lots of deductions or preference items (like exercised ISOs) pay a minimum amount.",
  },
  {
    term: "NIIT (Net Investment Income Tax)",
    category: "Taxes",
    definition:
      "An extra 3.8% tax on investment income (interest, dividends, capital gains) for people whose income is above a filing-status threshold.",
  },
  {
    term: "Safe harbor (estimated taxes)",
    category: "Taxes",
    definition:
      "Paying enough estimated tax during the year — generally 90% of this year's tax or 100%/110% of last year's — to avoid an underpayment penalty even if you owe more at filing.",
  },
  {
    term: "ISO vs NSO",
    category: "Equity comp",
    definition:
      "Two kinds of stock options. Incentive Stock Options (ISOs) can get favorable tax treatment but the exercise 'bargain element' is an AMT preference item. Non-qualified options (NSOs) create ordinary income at exercise.",
  },
  {
    term: "RSU (Restricted Stock Unit)",
    category: "Equity comp",
    definition:
      "Company shares granted to you that become yours as they vest. The value at vesting is taxed as ordinary income.",
  },
  {
    term: "Avalanche vs snowball",
    category: "Debt",
    definition:
      "Two debt-payoff strategies. Avalanche pays the highest-interest debt first (least total interest). Snowball pays the smallest balance first (quick wins for motivation).",
  },
  {
    term: "Emergency fund",
    category: "Cash flow",
    definition:
      "Cash set aside — commonly 3–6 months of essential expenses — to cover surprises like a job loss or major repair without borrowing.",
  },
  {
    term: "Refi breakeven",
    category: "Cash flow",
    definition:
      "How long it takes for the monthly savings from refinancing a mortgage to recoup the upfront closing costs. Past that point, the refinance is net-positive if you keep the loan.",
  },
  {
    term: "SAI (Student Aid Index)",
    category: "Education",
    definition:
      "A number colleges use (replacing the old EFC) to gauge how much a family can contribute toward college costs, based on income, assets, and household details.",
  },
  {
    term: "529 plan",
    category: "Education",
    definition:
      "A tax-advantaged account for education expenses. Growth is tax-free when used for qualified education costs; many states offer a deduction or credit for contributions.",
  },
  {
    term: "SEP vs SIMPLE vs Solo 401(k)",
    category: "Business",
    definition:
      "Three retirement plans for the self-employed / small business. They differ in contribution limits, complexity, and whether employees are involved.",
  },
];

export const GLOSSARY_CATEGORIES = Array.from(new Set(GLOSSARY.map((g) => g.category)));
