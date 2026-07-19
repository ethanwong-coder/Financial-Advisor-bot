/**
 * The onboarding tour, as data. Add / reorder / edit steps here and the modal
 * walkthrough picks them up automatically — no component changes needed. Each
 * step is one section of the app; `items` lists the concrete tools in it with a
 * one-line "what it does / how to use it".
 *
 * Keep it client-safe (pure data, no imports) so both the UI and any future
 * server use can share it.
 */
export type StepTier = "PLUS" | "PRO";

export interface OnboardingItem {
  /** Tool / feature name. */
  label: string;
  /** One line: what it does and how to use it. */
  how: string;
  /** Optional plan badge shown next to the item. */
  tier?: StepTier;
}

export interface OnboardingStep {
  id: string;
  /** Emoji shown in the gradient tile. */
  icon: string;
  title: string;
  /** Short intro for the section (what it's for). */
  summary: string;
  /** The concrete tools in this section. */
  items?: OnboardingItem[];
  /** Optional plan badge for the whole section. */
  tier?: StepTier;
}

/**
 * Bump when the step list changes in a way you'd want returning users to see
 * again. (Not wired to re-show today — completion is a single timestamp — but
 * it's here so that behavior is easy to add later without a migration.)
 */
export const ONBOARDING_VERSION = 1;

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    icon: "👋",
    title: "Welcome to Advisr",
    summary:
      "A private “case file” that aggregates your accounts and key facts, then flags specific coordination gaps. It’s informational only — never investment or legal advice. This quick tour shows where everything lives; you can skip it anytime.",
  },
  {
    id: "dashboard",
    icon: "🏠",
    title: "Your dashboard",
    summary: "Your home base — everything starts here.",
    items: [
      { label: "Accounts snapshot", how: "See every linked account and your combined balance at a glance." },
      { label: "Open flags", how: "Coordination gaps the checks found — click one to see the detail and what to confirm." },
      { label: "Market Snapshot", how: "General index info for context only; it’s not tied to your holdings." },
    ],
  },
  {
    id: "accounts",
    icon: "🔗",
    title: "Connect your accounts",
    summary: "Add what you own so the checks have something to work with. Use “Add account” in the top nav.",
    items: [
      { label: "Add manually", how: "Enter an account type, balance, and beneficiary designation." },
      { label: "Connect via Plaid", how: "Pull account types and balances automatically (beneficiaries are always entered by hand)." },
      { label: "Free plan", how: "1 connected account; upgrade to Plus for unlimited." },
    ],
  },
  {
    id: "flags",
    icon: "🚩",
    title: "Flags & checks — the core",
    summary:
      "Deterministic checks (not a guess) scan your case file for paperwork gaps. Hit “Run checks” on the dashboard and open any flag.",
    items: [
      { label: "Inherited-IRA deadlines", how: "Tracks the SECURE Act 10-year rule and whether annual distributions look on track." },
      { label: "Beneficiary mismatches", how: "Catches an ex-spouse still listed, a missing designation, or one that predates a marriage/divorce." },
      { label: "Plain explanations", how: "Every flag says what’s wrong and which fact to confirm — then points you to a professional." },
    ],
  },
  {
    id: "assistant",
    icon: "💬",
    title: "The assistant",
    tier: "PLUS",
    summary:
      "Ask about your flags in plain English (e.g. “what does my inherited-IRA flag mean?”). It explains what the checks found — it never computes deadlines itself and never gives investment or legal advice.",
  },
  {
    id: "retirement-tax",
    icon: "📊",
    title: "Retirement & tax tools",
    summary: "Informational calculators under Planning. Every result carries a disclaimer and is deterministic.",
    items: [
      { label: "Retirement projection", how: "Project a balance and roughly how long it may last." },
      { label: "Social Security", how: "Compare benefits at 62, full retirement age, and 70, with breakeven ages.", tier: "PLUS" },
      { label: "Quarterly tax", how: "Estimate safe-harbor payments and see the due dates.", tier: "PLUS" },
      { label: "NIIT / AMT screener", how: "Gauge exposure to the 3.8% investment tax and a rough AMT.", tier: "PLUS" },
      { label: "QCD tracker", how: "Track charitable IRA distributions against your RMD.", tier: "PLUS" },
    ],
  },
  {
    id: "estate-insurance",
    icon: "🛡️",
    title: "Estate & insurance",
    summary: "Keep the paperwork side organized and spot coverage gaps.",
    items: [
      { label: "Estate documents", how: "Track your will, trust, POAs, and directive with last-reviewed status.", tier: "PLUS" },
      { label: "Insurance needs", how: "Estimate life, disability, and long-term-care cost-of-care gaps.", tier: "PLUS" },
    ],
  },
  {
    id: "cash-flow",
    icon: "💵",
    title: "Cash-flow tools",
    summary: "The day-to-day money tools, all on the Cash-flow page. Budget and emergency fund are free; debt and mortgage are Plus.",
    items: [
      { label: "Budget summary", how: "See income vs. spending and what’s left over." },
      { label: "Emergency fund", how: "Compare savings to a months-of-expenses target." },
      { label: "Debt payoff", how: "Model avalanche vs. snowball payoff order.", tier: "PLUS" },
      { label: "Mortgage / refi", how: "Check a refinance’s closing-cost breakeven.", tier: "PLUS" },
    ],
  },
  {
    id: "education-business",
    icon: "🎓",
    title: "Education & business",
    tier: "PRO",
    summary: "Deeper planning tools for school and self-employment.",
    items: [
      { label: "Education / 529", how: "Track 529/Coverdell savings, a simplified aid estimate, and student loans." },
      { label: "Business retirement", how: "Compare SEP vs. SIMPLE vs. Solo 401(k) contribution room." },
      { label: "Equity comp", how: "See ISO / NSO / RSU / ESPP tax illustrations (the ISO path reuses the AMT screen)." },
    ],
  },
  {
    id: "transitions-goals",
    icon: "🎯",
    title: "Life transitions & goals",
    tier: "PRO",
    summary: "Stay on top of big life changes and long-term targets.",
    items: [
      { label: "Life-transition checklists", how: "Standard task lists for marriage, divorce, job change, inheritance, and moving." },
      { label: "Goal tracking", how: "Name goals and watch progress bars toward each target." },
      { label: "Learn", how: "A plain-language glossary of every concept these tools use — free to browse." },
    ],
  },
  {
    id: "family-reports",
    icon: "📄",
    title: "Family & reports",
    tier: "PRO",
    summary: "Pro tools for households and professionals (coming soon; entitlements are already in place).",
    items: [
      { label: "Family accounts", how: "Link a second person’s finances under your plan." },
      { label: "PDF reports", how: "Export your flags and planning outputs to hand to a CPA or attorney." },
    ],
  },
  {
    id: "plans",
    icon: "⭐",
    title: "Plans, billing & replaying this tour",
    summary:
      "Start free and upgrade when you want the full toolkit. See Pricing for Free / Plus / Pro, manage your plan under Billing, or join the Waitlist for launch updates. You can replay this tour anytime from Settings → Billing. That’s it — you’re ready to go!",
  },
];
