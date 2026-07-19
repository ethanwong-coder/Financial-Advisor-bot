/**
 * Color-coded, icon-tagged severity badge. Palette stays calm and trustworthy:
 * only CRITICAL uses an alarming red; HIGH is orange, MEDIUM amber, LOW blue,
 * INFO gray.
 */
type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

const STYLES: Record<string, string> = {
  CRITICAL: "bg-red-50 text-red-700 border-red-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW: "bg-sky-50 text-sky-700 border-sky-200",
  INFO: "bg-slate-100 text-slate-600 border-slate-200",
};

function Icon({ severity }: { severity: string }) {
  const common = "h-3.5 w-3.5";
  switch (severity) {
    case "CRITICAL":
      // octagon + exclamation
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M7.9 2.5h8.2L21.5 7.9v8.2L16.1 21.5H7.9L2.5 16.1V7.9z" strokeLinejoin="round" />
          <line x1="12" y1="8" x2="12" y2="13" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "HIGH":
      // warning triangle
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 3.5 22 20H2z" strokeLinejoin="round" />
          <line x1="12" y1="10" x2="12" y2="14" strokeLinecap="round" />
          <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "MEDIUM":
      // circle + exclamation
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="13" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      // info circle (LOW + INFO)
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="11" x2="12" y2="16" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

export function SeverityBadge({ severity }: { severity: string }) {
  const cls = STYLES[severity] ?? STYLES.INFO;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm ${cls}`}
    >
      <Icon severity={severity} />
      {severity}
    </span>
  );
}

export type { Severity };
