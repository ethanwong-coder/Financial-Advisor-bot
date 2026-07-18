import Link from "next/link";
import { PLANNING_DISCLAIMER } from "@/lib/planning/constants";

/** Consistent layout for every planning tool: back link, title, subtitle, body,
 * and the required informational disclaimer. */
export function PlanningShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="text-sm text-brand hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        <span className="text-gradient">{title}</span>
      </h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-6">{children}</div>
      <p className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs italic text-amber-900">
        {PLANNING_DISCLAIMER}
      </p>
    </div>
  );
}
