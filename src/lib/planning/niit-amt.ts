/**
 * NIIT / AMT informational screener.
 *
 * NIIT (Net Investment Income Tax): 3.8% on the LESSER of net investment income
 * and the amount of MAGI above the filing-status threshold. Thresholds are
 * STATUTORY and fixed (not inflation-indexed): $250k MFJ/QSS, $200k Single/HoH,
 * $125k MFS. This part is a precise calculation.
 *
 * AMT: only a ROUGH EXPOSURE FLAG. A real AMT determination requires a full
 * Form 6251 (adding back preference items and comparing tentative minimum tax to
 * regular tax) — which this does not do. We use MAGI as a crude AMTI proxy and
 * report exposure as NONE / POSSIBLE / ELEVATED against the AMT exemption and its
 * phaseout. This is a screening indicator only, not a substitute for tax
 * software or a CPA.
 */
import { FilingStatus } from "./constants";

const NIIT_RATE = 0.038;

const NIIT_THRESHOLDS: Record<FilingStatus, number> = {
  MARRIED_FILING_JOINTLY: 250000,
  QUALIFYING_SURVIVING_SPOUSE: 250000,
  SINGLE: 200000,
  HEAD_OF_HOUSEHOLD: 200000,
  MARRIED_FILING_SEPARATELY: 125000,
};

// AMT constants — TAX YEAR 2025 figures. These ARE inflation-indexed annually;
// verify/update against the current-year IRS figures before relying on them.
const AMT_TAX_YEAR = 2025;
const AMT_EXEMPTION: Record<FilingStatus, number> = {
  MARRIED_FILING_JOINTLY: 137000,
  QUALIFYING_SURVIVING_SPOUSE: 137000,
  SINGLE: 88100,
  HEAD_OF_HOUSEHOLD: 88100,
  MARRIED_FILING_SEPARATELY: 68500,
};
const AMT_PHASEOUT_START: Record<FilingStatus, number> = {
  MARRIED_FILING_JOINTLY: 1252700,
  QUALIFYING_SURVIVING_SPOUSE: 1252700,
  SINGLE: 626350,
  HEAD_OF_HOUSEHOLD: 626350,
  MARRIED_FILING_SEPARATELY: 626350,
};

export interface NiitAmtInput {
  filingStatus: FilingStatus;
  modifiedAgi: number;
  netInvestmentIncome: number;
}

export type AmtExposure = "NONE" | "POSSIBLE" | "ELEVATED";

export interface NiitAmtResult {
  niit: {
    applies: boolean;
    threshold: number;
    excessMagi: number;
    taxableBase: number; // the lesser of NII and excess MAGI
    amount: number;
    rate: number;
  };
  amt: {
    exposure: AmtExposure;
    exemption: number;
    phaseoutStart: number;
    exemptionReduced: boolean;
    taxYearBasis: number;
    note: string;
  };
}

export function screenNiitAmt(input: NiitAmtInput): NiitAmtResult {
  const threshold = NIIT_THRESHOLDS[input.filingStatus];
  const excessMagi = Math.max(0, input.modifiedAgi - threshold);
  const nii = Math.max(0, input.netInvestmentIncome);
  const taxableBase = Math.min(nii, excessMagi);
  const amount = round2(taxableBase * NIIT_RATE);
  const applies = amount > 0;

  // --- AMT rough screen ---
  const exemptionFull = AMT_EXEMPTION[input.filingStatus];
  const phaseoutStart = AMT_PHASEOUT_START[input.filingStatus];
  const amtiProxy = input.modifiedAgi;
  const exemptionReduced = amtiProxy > phaseoutStart;
  // Reduce exemption by 25% of the amount over the phaseout start (floored at 0).
  const exemption = Math.max(
    0,
    exemptionFull - (exemptionReduced ? 0.25 * (amtiProxy - phaseoutStart) : 0),
  );

  let exposure: AmtExposure;
  if (amtiProxy <= exemptionFull) {
    exposure = "NONE";
  } else if (!exemptionReduced) {
    exposure = "POSSIBLE";
  } else {
    exposure = "ELEVATED";
  }

  return {
    niit: {
      applies,
      threshold,
      excessMagi: round2(excessMagi),
      taxableBase: round2(taxableBase),
      amount,
      rate: NIIT_RATE,
    },
    amt: {
      exposure,
      exemption: round2(exemption),
      phaseoutStart,
      exemptionReduced,
      taxYearBasis: AMT_TAX_YEAR,
      note:
        "Rough screening indicator only. A real AMT determination requires Form 6251 " +
        "(adding back preference items and comparing tentative minimum tax to regular tax). " +
        "Use tax software or a CPA.",
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
