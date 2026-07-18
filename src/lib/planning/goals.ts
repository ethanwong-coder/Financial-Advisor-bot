/**
 * Financial goal progress. Pure/deterministic.
 */

export interface GoalProgressInput {
  targetAmount: number;
  currentSaved: number;
  startDate?: Date | null;
  targetDate?: Date | null;
  now: Date;
}
export interface GoalProgressResult {
  progressFraction: number; // 0..1+ (currentSaved / target)
  remaining: number;
  monthsUntilTarget: number | null;
  requiredMonthlySavings: number | null;
  /** true/false when there's a start+target window; null otherwise. */
  onPace: boolean | null;
}

export function goalProgress(input: GoalProgressInput): GoalProgressResult {
  const target = Math.max(0, input.targetAmount);
  const saved = Math.max(0, input.currentSaved);
  const remaining = Math.max(0, target - saved);
  const progressFraction = target > 0 ? round4(saved / target) : 0;

  let monthsUntilTarget: number | null = null;
  let requiredMonthlySavings: number | null = null;
  if (input.targetDate) {
    monthsUntilTarget = Math.max(0, monthsBetween(input.now, input.targetDate));
    requiredMonthlySavings =
      monthsUntilTarget > 0 ? round2(remaining / monthsUntilTarget) : round2(remaining);
  }

  let onPace: boolean | null = null;
  if (input.startDate && input.targetDate && input.targetDate.getTime() > input.startDate.getTime()) {
    const timeFraction = clamp(
      (input.now.getTime() - input.startDate.getTime()) /
        (input.targetDate.getTime() - input.startDate.getTime()),
      0,
      1,
    );
    onPace = progressFraction >= timeFraction;
  }

  return { progressFraction, remaining: round2(remaining), monthsUntilTarget, requiredMonthlySavings, onPace };
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
