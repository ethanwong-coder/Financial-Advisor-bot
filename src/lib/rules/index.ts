/**
 * Public surface of the deterministic rules engine.
 *
 * This module is pure (no I/O, no LLM, no clock reads) so it can be unit-tested
 * in isolation and, if needed, extracted into a standalone package.
 */
export * from "./types";
export * from "./constants";
export { runRulesEngine } from "./engine";
export type { CaseFileSnapshot, AccountSnapshot } from "./engine";
export { evaluateInheritedIra } from "./inherited-ira";
export type { InheritedIraInput } from "./inherited-ira";
export {
  evaluateBeneficiaryMismatch,
  normalizeName,
} from "./beneficiary-mismatch";
export type { BeneficiaryMismatchInput } from "./beneficiary-mismatch";
export { rmdAge, requiredBeginningDate, diedOnOrAfterRbd } from "./rmd";
export {
  singleLifeFactor,
  reducedFactor,
  estimateAnnualRmd,
} from "./single-life-table";
