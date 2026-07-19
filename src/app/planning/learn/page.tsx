import Link from "next/link";
import { GLOSSARY, GLOSSARY_CATEGORIES } from "@/lib/planning/glossary";

export const metadata = { title: "Learn — Advisr" };

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="text-sm text-brand hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        <span className="text-gradient">Learn</span> the basics
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Plain-language explainers for concepts used across these tools. General education only — not personalized advice.
      </p>

      <div className="mt-6 space-y-8">
        {GLOSSARY_CATEGORIES.map((cat) => (
          <section key={cat}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand">{cat}</h2>
            <div className="space-y-3">
              {GLOSSARY.filter((g) => g.category === cat).map((g) => (
                <div key={g.term} className="card">
                  <h3 className="font-medium text-slate-900">{g.term}</h3>
                  <p className="mt-1 text-sm text-slate-600">{g.definition}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
