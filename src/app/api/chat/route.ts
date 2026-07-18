import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { badRequest, json, requireUser, serverError } from "@/lib/http";
import { loadCaseFile } from "@/lib/case-file";
import { runChat, type CaseContext, type ChatTurn } from "@/lib/llm/claude";
import type { RuleFinding, RuleId, Severity } from "@/lib/rules/types";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const schema = z.object({ message: z.string().trim().min(1).max(4000) });

export async function POST(req: Request) {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

  try {
    const { profileGaps } = await loadCaseFile(userId);

    // Context = the OPEN flags the user actually sees, labeled by account name.
    const openFlags = await prisma.flag.findMany({
      where: { userId, status: "OPEN" },
      include: { account: { select: { nickname: true } } },
      orderBy: [{ severity: "desc" }, { lastSeenAt: "desc" }],
    });
    const findings: RuleFinding[] = openFlags.map((f) => ({
      ruleId: f.ruleId as RuleId,
      code: f.code,
      severity: f.severity as Severity,
      title: f.title,
      detail: f.detail,
      accountRef: f.account?.nickname ?? undefined,
      data: (f.dataJson as Record<string, unknown> | null) ?? undefined,
    }));
    const context: CaseContext = { profileGaps, findings };

    // Recent history (oldest first).
    const recent = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const history: ChatTurn[] = recent
      .reverse()
      .map((m) => ({
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }));

    // Persist the user turn, generate a reply, persist the assistant turn.
    await prisma.chatMessage.create({
      data: { userId, role: "USER", content: parsed.data.message },
    });
    const reply = await runChat({ history, userMessage: parsed.data.message, context });
    await prisma.chatMessage.create({
      data: { userId, role: "ASSISTANT", content: reply },
    });

    return json({ reply });
  } catch (err) {
    log.error("chat failed", err);
    const message =
      err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")
        ? "The chat assistant isn't configured yet (missing ANTHROPIC_API_KEY)."
        : "The chat assistant is temporarily unavailable.";
    return serverError(message);
  }
}

export async function GET() {
  const userId = await requireUser();
  if (userId instanceof Response) return userId;
  const messages = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return json({
    messages: messages.map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt })),
  });
}
