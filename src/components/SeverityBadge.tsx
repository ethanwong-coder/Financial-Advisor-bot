const STYLES: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-200",
  LOW: "bg-sky-100 text-sky-800 border-sky-200",
  INFO: "bg-slate-100 text-slate-700 border-slate-200",
};

export function SeverityBadge({ severity }: { severity: string }) {
  const cls = STYLES[severity] ?? STYLES.INFO;
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm ${cls}`}
    >
      {severity}
    </span>
  );
}
