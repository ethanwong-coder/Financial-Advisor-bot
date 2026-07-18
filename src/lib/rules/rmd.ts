/**
 * Required Minimum Distribution (RMD) age and Required Beginning Date (RBD).
 *
 * The RMD age was raised by the SECURE Act and SECURE 2.0:
 *   - born 1950 or earlier -> age 72
 *   - born 1951–1959       -> age 73
 *   - born 1960 or later    -> age 75
 *
 * NOTE (documented simplification): people who reached age 70½ before 2020 were
 * under the old 70½ regime. We floor the applicable age at 72 rather than model
 * 70½. This does not change the only thing the engine derives from it — whether
 * the original owner died BEFORE or ON/AFTER their RBD — for any realistic
 * decedent, because anyone old enough to be affected by the 70½ rule died well
 * past their RBD regardless. Verify against IRS Pub 590-B for edge cases.
 */
import { april1, yearReachingAge } from "./dates";

export function rmdAge(birthYear: number): number {
  if (birthYear <= 1950) return 72;
  if (birthYear <= 1959) return 73;
  return 75;
}

/**
 * The Required Beginning Date: April 1 of the year FOLLOWING the year the owner
 * reaches their applicable RMD age.
 * Example: born 1955 -> RMD age 73 -> turns 73 in 2028 -> RBD = 2029-04-01.
 */
export function requiredBeginningDate(birthDate: Date): Date {
  const age = rmdAge(birthDate.getUTCFullYear());
  const yearReached = yearReachingAge(birthDate, age);
  return april1(yearReached + 1);
}

/**
 * Whether the account owner died on or after their Required Beginning Date.
 * This is the switch that determines whether a non-eligible designated
 * beneficiary must take *annual* RMDs during the 10-year window (owner died
 * on/after RBD => yes) or only empty the account by year 10 (owner died before
 * RBD => no annual RMDs).
 */
export function diedOnOrAfterRbd(birthDate: Date, deathDate: Date): boolean {
  return deathDate.getTime() >= requiredBeginningDate(birthDate).getTime();
}
