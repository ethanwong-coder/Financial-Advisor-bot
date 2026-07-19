/**
 * Equity-compensation tax modeling: ISO, NSO, RSU, ESPP.
 *
 * SIMPLIFIED illustrative estimates. Actual treatment depends on holding
 * periods, elections (e.g. 83(b)), disposition type, and the full return. This
 * reuses the Phase 1 NIIT/AMT screener for the ISO AMT-preference exposure.
 * Deterministic; no LLM.
 */
import { FilingStatus } from "./constants";
import { AmtExposure, screenNiitAmt } from "./niit-amt";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- NSO exercise: bargain element is ordinary income at exercise ---
export interface OptionInput {
  strikePrice: number;
  fairMarketValue: number;
  shares: number;
}
export interface NsoResult {
  bargainElement: number;
  ordinaryIncome: number;
}
export function nsoExercise(input: OptionInput): NsoResult {
  const bargain = Math.max(0, (input.fairMarketValue - input.strikePrice) * input.shares);
  return { bargainElement: round2(bargain), ordinaryIncome: round2(bargain) };
}

// --- ISO exercise: no ordinary income if held; bargain is an AMT preference ---
export interface IsoInput extends OptionInput {
  /** Optional — enables the AMT exposure screen (reuses Phase 1 logic). */
  filingStatus?: FilingStatus;
  otherModifiedAgi?: number;
}
export interface IsoResult {
  bargainElement: number;
  ordinaryIncomeAtExercise: number;
  amtPreferenceItem: number;
  amtExposure: AmtExposure | null;
  note: string;
}
export function isoExercise(input: IsoInput): IsoResult {
  const bargain = Math.max(0, (input.fairMarketValue - input.strikePrice) * input.shares);
  let amtExposure: AmtExposure | null = null;
  if (input.filingStatus && input.otherModifiedAgi != null) {
    amtExposure = screenNiitAmt({
      filingStatus: input.filingStatus,
      modifiedAgi: input.otherModifiedAgi + bargain,
      netInvestmentIncome: 0,
    }).amt.exposure;
  }
  return {
    bargainElement: round2(bargain),
    ordinaryIncomeAtExercise: 0,
    amtPreferenceItem: round2(bargain),
    amtExposure,
    note: "Holding an ISO past exercise adds the bargain element to AMT income for the year. A disqualifying (early) sale instead creates ordinary income.",
  };
}

// --- RSU: ordinary income at vest = shares * FMV ---
export interface RsuInput {
  sharesVesting: number;
  fairMarketValueAtVest: number;
}
export function rsuVesting(input: RsuInput): { ordinaryIncome: number } {
  return { ordinaryIncome: round2(input.sharesVesting * input.fairMarketValueAtVest) };
}

// --- ESPP: basic discount-based illustration ---
export interface EsppInput {
  purchasePrice: number;
  fairMarketValueAtPurchase: number;
  shares: number;
}
export interface EsppResult {
  bargainElement: number;
  disqualifyingOrdinaryIncome: number;
  note: string;
}
export function esppPurchase(input: EsppInput): EsppResult {
  const bargain = Math.max(
    0,
    (input.fairMarketValueAtPurchase - input.purchasePrice) * input.shares,
  );
  return {
    bargainElement: round2(bargain),
    disqualifyingOrdinaryIncome: round2(bargain),
    note: "Shown for a disqualifying disposition (sold before the holding periods). A qualifying disposition recognizes ordinary income equal to the lesser of the offering-date discount or the actual gain, with the rest as capital gain.",
  };
}
