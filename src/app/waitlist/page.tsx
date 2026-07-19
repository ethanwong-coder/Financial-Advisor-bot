import type { Metadata } from "next";
import Link from "next/link";
import { WaitlistForm } from "@/components/WaitlistForm";

export const metadata: Metadata = {
  title: "Join the waitlist — Estate Organizer",
  description:
    "Be first to know when new Estate Organizer planning tools and plans go live.",
};

export default function WaitlistPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <section className="text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-200/70 bg-white/70 px-3 py-1 text-xs font-medium text-brand backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
          Early access
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Join the <span className="text-gradient">waitlist</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-600">
          We&rsquo;re rolling out new planning tools and subscription plans. Drop your
          email and we&rsquo;ll send a single confirmation link — then let you know the
          moment there&rsquo;s something new to try.
        </p>
      </section>

      <div className="card mt-8">
        <WaitlistForm />
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>{" "}
        or{" "}
        <Link href="/pricing" className="font-medium text-brand hover:underline">
          see the plans
        </Link>
        .
      </p>
    </div>
  );
}
