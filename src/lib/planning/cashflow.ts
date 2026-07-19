/**
 * Cash-flow basics: household budget summary and emergency-fund gap.
 * Pure/deterministic.
 */

export interface BudgetLine {
  category: string;
  amount: number;
}
export interface BudgetResult {
  monthlyIncome: number;
  totalExpenses: number;
  net: number;
  savingsRate: number; // net / income (0 if no income)
}

export function summarizeBudget(monthlyIncome: number, expenses: BudgetLine[]): BudgetResult {
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const net = monthlyIncome - totalExpenses;
  return {
    monthlyIncome: round2(monthlyIncome),
    totalExpenses: round2(totalExpenses),
    net: round2(net),
    savingsRate: monthlyIncome > 0 ? round4(net / monthlyIncome) : 0,
  };
}

export interface EmergencyFundInput {
  monthlyEssentialExpenses: number;
  monthsOfCoverage: number; // typically 3–6
  currentSavings: number;
}
export interface EmergencyFundResult {
  target: number;
  gap: number;
  monthsCovered: number;
  fullyFunded: boolean;
}

export function emergencyFund(input: EmergencyFundInput): EmergencyFundResult {
  const target = input.monthlyEssentialExpenses * input.monthsOfCoverage;
  const gap = Math.max(0, target - input.currentSavings);
  return {
    target: round2(target),
    gap: round2(gap),
    monthsCovered:
      input.monthlyEssentialExpenses > 0
        ? round2(input.currentSavings / input.monthlyEssentialExpenses)
        : 0,
    fullyFunded: input.currentSavings >= target,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
