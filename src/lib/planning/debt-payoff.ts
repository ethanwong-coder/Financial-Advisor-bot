/**
 * Debt-payoff comparison: avalanche (highest interest first) vs snowball
 * (smallest balance first). Deterministic month-by-month simulation with
 * payment rollover as debts are cleared. Pure — no LLM, no recommendation
 * (it just shows both methods side by side).
 */

export interface Debt {
  name: string;
  balance: number;
  /** Annual interest rate as a decimal, e.g. 0.199 for 19.9%. */
  rate: number;
  minPayment: number;
}

export interface PayoffResult {
  months: number;
  totalInterest: number;
  totalPaid: number;
  /** false if the payments can't overcome interest within the horizon. */
  amortizes: boolean;
}

export interface PayoffComparison {
  avalanche: PayoffResult;
  snowball: PayoffResult;
  interestSavedByAvalanche: number;
}

const MAX_MONTHS = 1200; // 100-year safety cap

function simulate(
  debts: Debt[],
  extraMonthly: number,
  order: (a: Debt, b: Debt) => number,
): PayoffResult {
  const list = debts.map((d) => ({ ...d }));
  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;

  while (list.some((d) => d.balance > 0.005) && month < MAX_MONTHS) {
    month += 1;

    // Accrue one month of interest.
    for (const d of list) {
      if (d.balance > 0) {
        const interest = d.balance * (d.rate / 12);
        d.balance += interest;
        totalInterest += interest;
      }
    }

    // Pay minimums on every active debt; any minimum beyond a balance is freed
    // into the pool, along with the extra payment.
    let pool = extraMonthly;
    for (const d of list) {
      if (d.balance > 0) {
        const pay = Math.min(d.minPayment, d.balance);
        d.balance -= pay;
        totalPaid += pay;
        pool += d.minPayment - pay;
      }
    }

    // Direct the pool at the ordered target(s), rolling over as they clear.
    const active = list.filter((d) => d.balance > 0).sort(order);
    for (const d of active) {
      if (pool <= 0.005) break;
      const pay = Math.min(pool, d.balance);
      d.balance -= pay;
      totalPaid += pay;
      pool -= pay;
    }
  }

  return {
    months: month,
    totalInterest: round2(totalInterest),
    totalPaid: round2(totalPaid),
    amortizes: list.every((d) => d.balance <= 0.005),
  };
}

export function comparePayoff(debts: Debt[], extraMonthly: number): PayoffComparison {
  const avalanche = simulate(debts, extraMonthly, (a, b) => b.rate - a.rate);
  const snowball = simulate(debts, extraMonthly, (a, b) => a.balance - b.balance);
  return {
    avalanche,
    snowball,
    interestSavedByAvalanche: round2(
      Math.max(0, snowball.totalInterest - avalanche.totalInterest),
    ),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
