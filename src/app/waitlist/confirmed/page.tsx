import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Waitlist confirmation — Estate Organizer",
};

type Status = "ok" | "already" | "expired" | "invalid" | "error";

const CONTENT: Record<
  Status,
  { icon: string; heading: string; body: string; tone: "good" | "bad" }
> = {
  ok: {
    icon: "🎉",
    heading: "You're confirmed!",
    body: "Thanks for verifying your email. You're on the waitlist — we'll be in touch as soon as there's something new to try.",
    tone: "good",
  },
  already: {
    icon: "✅",
    heading: "Already confirmed",
    body: "This email was already verified. You're all set — no need to do anything else.",
    tone: "good",
  },
  expired: {
    icon: "⌛",
    heading: "This link has expired",
    body: "Confirmation links are valid for 3 days. Head back and join the waitlist again to get a fresh link.",
    tone: "bad",
  },
  invalid: {
    icon: "⚠️",
    heading: "This link isn't valid",
    body: "The confirmation link is missing or has already been replaced by a newer one. Try joining the waitlist again.",
    tone: "bad",
  },
  error: {
    icon: "⚠️",
    heading: "Something went wrong",
    body: "We couldn't confirm your email just now. Please try the link again in a moment.",
    tone: "bad",
  },
};

export default async function WaitlistConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const key: Status = (status as Status) in CONTENT ? (status as Status) : "error";
  const c = CONTENT[key];

  return (
    <div className="mx-auto max-w-lg text-center">
      <div
        className={`card ${
          c.tone === "good" ? "border-teal-200" : "border-amber-200"
        }`}
      >
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-brand-dark text-2xl shadow">
          <span aria-hidden="true">{c.icon}</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">{c.heading}</h1>
        <p className="mx-auto mt-2 max-w-md text-slate-600">{c.body}</p>

        <div className="mt-6 flex justify-center gap-3">
          {c.tone === "bad" ? (
            <Link href="/waitlist" className="btn-primary">
              Back to the waitlist
            </Link>
          ) : (
            <Link href="/pricing" className="btn-primary">
              See the plans
            </Link>
          )}
          <Link href="/" className="btn-secondary">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
