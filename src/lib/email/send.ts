/**
 * Transactional email, behind a small adapter — mirrors the Plaid adapter.
 *
 * Right now there is NO email provider wired up, so this uses a MOCK adapter
 * that logs the message (and, for confirmation emails, the confirmation URL) to
 * the server console instead of delivering it. That is enough to exercise the
 * whole waitlist flow locally: copy the logged URL and open it.
 *
 * To send real email later, pick ONE provider and implement `deliver()` in a
 * new branch below (e.g. Resend, Postmark, SendGrid, or SMTP via nodemailer),
 * gated on its env var. Suggested shape:
 *
 *   if (process.env.RESEND_API_KEY) return resendAdapter;
 *
 * Keep the MOCK fallback so the app still runs with no email credentials.
 */
import { log } from "@/lib/log";

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain-text body. We intentionally keep templates simple (no HTML). */
  text: string;
}

export interface EmailAdapter {
  readonly mode: "live" | "mock";
  deliver(message: EmailMessage): Promise<{ id: string }>;
}

/** Logs the message instead of sending it. Never throws on "delivery". */
const mockAdapter: EmailAdapter = {
  mode: "mock",
  async deliver(message) {
    // Body is logged in full on purpose: for the waitlist confirmation email
    // the confirmation link lives in the text, and in mock mode the console is
    // the only way to "receive" it. No secrets beyond a single-use token.
    log.info("email (mock) — not actually sent", {
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return { id: `mock_${message.to}` };
  },
};

/**
 * Resolve the active adapter. When a real provider is configured, branch here
 * on its env var and return that adapter; otherwise fall back to mock/log.
 */
export function getEmailAdapter(): EmailAdapter {
  // No provider configured yet — see the file header for how to add one.
  return mockAdapter;
}

/** Returns true when a real (non-mock) email provider is wired up. */
export function isEmailConfigured(): boolean {
  return getEmailAdapter().mode === "live";
}

export async function sendEmail(message: EmailMessage): Promise<{ id: string }> {
  return getEmailAdapter().deliver(message);
}
