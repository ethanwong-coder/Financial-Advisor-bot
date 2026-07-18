/**
 * Claude API integration for the conversational EXPLANATION layer only.
 *
 * The compliance calculations are done by the deterministic rules engine and
 * passed in as context — Claude never computes them. Guardrails are enforced by
 * the system prompt (see system-prompt.ts) and a light output post-check that
 * guarantees the not-advice disclaimer is present on flag-related replies.
 */
import Anthropic from "@anthropic-ai/sdk";
import { INFORMATIONAL_DISCLAIMER } from "@/lib/rules/constants";
import { RuleFinding } from "@/lib/rules/types";
import { buildSystemPrompt } from "./system-prompt";

// Default to the most capable model; override with ANTHROPIC_MODEL if desired.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
const MAX_TOKENS = 1500;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface CaseContext {
  profileGaps: string[];
  findings: RuleFinding[];
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your environment to enable the chat layer.",
    );
  }
  if (!client) client = new Anthropic();
  return client;
}

/** Build the trusted context block handed to Claude on each turn. */
export function buildContextBlock(context: CaseContext): string {
  const lines: string[] = [];
  lines.push("<case_file_context>");
  lines.push(
    "The following facts and flags come from the app's deterministic rules engine. Treat them as the only source of compliance facts. Do not add, compute, or infer new numbers or deadlines.",
  );

  if (context.profileGaps.length > 0) {
    lines.push("\nMissing profile facts you may ask about:");
    for (const gap of context.profileGaps) lines.push(`- ${gap}`);
  }

  if (context.findings.length === 0) {
    lines.push("\nNo open flags. The paperwork on file looks complete for the rules currently checked.");
  } else {
    lines.push("\nOpen flags:");
    for (const f of context.findings) {
      lines.push(
        `- [${f.severity}] (${f.ruleId} / ${f.code})${f.accountRef ? ` on account "${f.accountRef}"` : ""}: ${f.title} — ${f.detail}`,
      );
    }
  }
  lines.push("</case_file_context>");
  return lines.join("\n");
}

/** Extract concatenated text from a Claude message response. */
function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/** Belt-and-suspenders: if the reply discusses a flag but omits the disclaimer,
 * append it. The system prompt already requires it; this guarantees it. */
function ensureDisclaimer(text: string, hadFindings: boolean): string {
  if (!hadFindings) return text;
  if (text.includes(INFORMATIONAL_DISCLAIMER)) return text;
  return `${text}\n\n${INFORMATIONAL_DISCLAIMER}`;
}

/**
 * Run one chat turn. `history` is prior turns (oldest first). `context` carries
 * the current findings + profile gaps and is re-supplied each turn.
 */
export async function runChat(params: {
  history: ChatTurn[];
  userMessage: string;
  context: CaseContext;
}): Promise<string> {
  const { history, userMessage, context } = params;
  const contextBlock = buildContextBlock(context);

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `${contextBlock}\n\nAcknowledge you'll use only these facts, then wait for my question.`,
    },
    {
      role: "assistant",
      content:
        "Understood — I'll explain only these flags and facts in plain English, won't compute anything myself or give investment or legal advice, and I'll include the not-advice disclaimer on anything about a flag.",
    },
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user", content: userMessage },
  ];

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(),
    messages,
  });

  const text = extractText(response) || "I'm sorry — I couldn't generate a response. Please try again.";
  return ensureDisclaimer(text, context.findings.length > 0);
}

/**
 * Generate a plain-English opening summary of the current flags (used to seed
 * the chat when the user opens it).
 */
export async function summarizeFindings(context: CaseContext): Promise<string> {
  return runChat({
    history: [],
    userMessage:
      "Give me a short, friendly overview of my current flags and what each one is about. If there are none, reassure me.",
    context,
  });
}
