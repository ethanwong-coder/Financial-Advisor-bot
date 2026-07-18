import { INFORMATIONAL_DISCLAIMER } from "@/lib/rules/constants";

/** The persistent not-advice disclaimer. Rendered in the footer on every page,
 * and inline anywhere flags are shown. */
export function DisclaimerBanner({ inline = false }: { inline?: boolean }) {
  if (inline) {
    return (
      <p className="mt-2 text-xs italic text-slate-500">
        {INFORMATIONAL_DISCLAIMER}
      </p>
    );
  }
  return (
    <div className="border-t border-slate-200 bg-amber-50 px-4 py-3 text-center text-xs text-amber-900">
      {INFORMATIONAL_DISCLAIMER}{" "}
      This tool is not a registered investment adviser and does not provide
      investment or legal advice.
    </div>
  );
}
