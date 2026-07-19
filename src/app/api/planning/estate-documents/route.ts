import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { badRequest, json, requireUser, serverError } from "@/lib/http";
import { computeDocumentStatus, EstateDocType } from "@/lib/planning/estate-documents";
import { requireTierFeature } from "@/lib/billing/entitlements";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const DOC_TYPES = [
  "WILL",
  "REVOCABLE_TRUST",
  "IRREVOCABLE_TRUST",
  "FINANCIAL_POA",
  "HEALTHCARE_POA",
] as const;

export async function GET() {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const gate = await requireTierFeature(userId, "estate_documents");
  if (gate) return gate;

  const [docs, lastEvent] = await Promise.all([
    prisma.estateDocument.findMany({ where: { userId } }),
    prisma.lifeEvent.findFirst({
      where: { userId },
      orderBy: { eventDate: "desc" },
      select: { eventDate: true },
    }),
  ]);

  const now = new Date();
  const byType = new Map(docs.map((d) => [d.docType, d]));
  const result = DOC_TYPES.map((docType) => {
    const doc = byType.get(docType);
    const status = computeDocumentStatus(
      { exists: doc?.exists ?? false, lastReviewed: doc?.lastReviewed ?? null },
      { now, lastLifeEventDate: lastEvent?.eventDate ?? null },
    );
    return {
      docType,
      exists: doc?.exists ?? false,
      lastReviewed: doc?.lastReviewed ?? null,
      attorneyName: doc?.attorneyName ?? null,
      attorneyContact: doc?.attorneyContact ?? null,
      storageLocation: doc?.storageLocation ?? null,
      notes: doc?.notes ?? null,
      status: status.status,
      statusReason: status.reason,
    };
  });

  return json({ documents: result });
}

const putSchema = z.object({
  docType: z.enum(DOC_TYPES),
  exists: z.boolean(),
  lastReviewed: z.string().optional().nullable(),
  attorneyName: z.string().trim().optional().nullable(),
  attorneyContact: z.string().trim().optional().nullable(),
  storageLocation: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export async function PUT(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const gate = await requireTierFeature(userId, "estate_documents");
  if (gate) return gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
  const d = parsed.data;

  const data = {
    exists: d.exists,
    lastReviewed: d.lastReviewed ? new Date(d.lastReviewed) : null,
    attorneyName: d.attorneyName ?? null,
    attorneyContact: d.attorneyContact ?? null,
    storageLocation: d.storageLocation ?? null,
    notes: d.notes ?? null,
  };

  try {
    await prisma.estateDocument.upsert({
      where: { userId_docType: { userId, docType: d.docType as EstateDocType } },
      create: { userId, docType: d.docType, ...data },
      update: data,
    });
    return json({ ok: true });
  } catch (err) {
    log.error("estate doc upsert failed", err);
    return serverError("Could not save the document");
  }
}
