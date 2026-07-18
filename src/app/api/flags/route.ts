import { prisma } from "@/lib/db/prisma";
import { json, requireUser } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;

  const status = new URL(req.url).searchParams.get("status"); // OPEN|DISMISSED|RESOLVED
  const flags = await prisma.flag.findMany({
    where: {
      userId,
      ...(status ? { status: status as "OPEN" | "DISMISSED" | "RESOLVED" } : {}),
    },
    include: { account: { select: { nickname: true } } },
    orderBy: [{ severity: "desc" }, { lastSeenAt: "desc" }],
  });

  return json({
    flags: flags.map((f) => ({
      id: f.id,
      ruleId: f.ruleId,
      code: f.code,
      severity: f.severity,
      title: f.title,
      detail: f.detail,
      status: f.status,
      accountNickname: f.account?.nickname ?? null,
      dismissedReason: f.dismissedReason,
      firstDetectedAt: f.firstDetectedAt,
      lastSeenAt: f.lastSeenAt,
    })),
  });
}
