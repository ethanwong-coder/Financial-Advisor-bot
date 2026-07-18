import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Scene3D } from "@/components/three/Scene3D";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-4xl">
      {/* Hero with the 3D scene layered behind the headline */}
      <section className="relative isolate flex min-h-[440px] flex-col items-center justify-center text-center">
        <Scene3D className="pointer-events-none absolute inset-0 -z-10 opacity-90" />
        {/* Soft glow keeps the headline legible over the floating shapes. */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -z-[1] h-[320px] w-[620px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(244,250,249,0.92) 0%, rgba(244,250,249,0.7) 45%, rgba(244,250,249,0) 72%)",
          }}
        />

        <span className="animate-fade-up mb-5 inline-flex items-center gap-2 rounded-full border border-teal-200/70 bg-white/70 px-3 py-1 text-xs font-medium text-brand backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
          Informational only · not investment or legal advice
        </span>

        <h1 className="animate-fade-up text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Keep your financial &amp; estate
          <br />
          <span className="text-gradient">paperwork straight.</span>
        </h1>

        <p className="animate-fade-up mt-5 max-w-2xl text-lg text-slate-600">
          A private “case file” that aggregates your accounts, key documents, and
          life-event facts — then flags specific coordination gaps like
          inherited-IRA 10-year deadlines and beneficiary-designation mismatches.
        </p>

        <div className="animate-fade-up mt-8 flex justify-center gap-3">
          <Link href="/register" className="btn-primary px-6 py-2.5 text-base">
            Get started
          </Link>
          <Link href="/login" className="btn-secondary px-6 py-2.5 text-base">
            Sign in
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <FeatureCard
          title="Inherited-IRA deadlines"
          body="Tracks the SECURE Act 10-year rule and whether required annual distributions look on track — computed by deterministic code, not a guess."
        />
        <FeatureCard
          title="Beneficiary mismatches"
          body="Catches an ex-spouse still listed, a missing designation, or a beneficiary that predates your latest marriage or divorce."
        />
        <FeatureCard
          title="Plain-English help"
          body="An assistant explains each flag in plain language and always reminds you to confirm with a CPA or estate attorney."
        />
      </section>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card card-hover animate-fade-up">
      <div className="mb-3 h-9 w-9 rounded-xl bg-gradient-to-br from-teal-400 to-brand-dark shadow-md" />
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}
