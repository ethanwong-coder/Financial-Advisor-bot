/**
 * Estate-document coordination tracker.
 *
 * TRACKING ONLY. This computes a simple status per document from user-entered
 * metadata (exists? last reviewed? life events?). It NEVER interprets a
 * document's contents and gives no legal advice about what a document should say.
 */

export type EstateDocType =
  | "WILL"
  | "REVOCABLE_TRUST"
  | "IRREVOCABLE_TRUST"
  | "FINANCIAL_POA"
  | "HEALTHCARE_POA";

export const ESTATE_DOC_LABELS: Record<EstateDocType, string> = {
  WILL: "Will",
  REVOCABLE_TRUST: "Revocable living trust",
  IRREVOCABLE_TRUST: "Irrevocable trust",
  FINANCIAL_POA: "Financial power of attorney",
  HEALTHCARE_POA: "Healthcare POA / advance directive",
};

export const ESTATE_DOC_ORDER: EstateDocType[] = [
  "WILL",
  "REVOCABLE_TRUST",
  "IRREVOCABLE_TRUST",
  "FINANCIAL_POA",
  "HEALTHCARE_POA",
];

/** Documents are flagged for review if not reviewed within this many years. */
export const REVIEW_STALE_YEARS = 3;

export type DocStatus = "MISSING" | "NEEDS_REVIEW" | "UP_TO_DATE";

export interface DocStatusInput {
  exists: boolean;
  lastReviewed?: Date | null;
}

export interface DocStatusContext {
  now: Date;
  /** Most recent logged major life event (marriage/divorce/etc.), if any. */
  lastLifeEventDate?: Date | null;
}

export interface DocStatusResult {
  status: DocStatus;
  reason: string;
}

export function computeDocumentStatus(
  input: DocStatusInput,
  ctx: DocStatusContext,
): DocStatusResult {
  if (!input.exists) {
    return { status: "MISSING", reason: "No document on record." };
  }
  if (!input.lastReviewed) {
    return { status: "NEEDS_REVIEW", reason: "No review date recorded." };
  }

  const staleCutoff = new Date(ctx.now);
  staleCutoff.setUTCFullYear(staleCutoff.getUTCFullYear() - REVIEW_STALE_YEARS);
  if (input.lastReviewed.getTime() < staleCutoff.getTime()) {
    return {
      status: "NEEDS_REVIEW",
      reason: `Last reviewed more than ${REVIEW_STALE_YEARS} years ago.`,
    };
  }

  if (
    ctx.lastLifeEventDate &&
    input.lastReviewed.getTime() < ctx.lastLifeEventDate.getTime()
  ) {
    return {
      status: "NEEDS_REVIEW",
      reason: "Last reviewed before your most recent major life event.",
    };
  }

  return { status: "UP_TO_DATE", reason: "Reviewed recently and since your latest life event." };
}
