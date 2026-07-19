import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/SignOutButton";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { UpgradeNavButton } from "@/components/billing/UpgradeNavButton";

export const metadata: Metadata = {
  title: "Advisr — informational paperwork tracker",
  description:
    "Spot gaps in your financial and estate paperwork. Informational only — not investment or legal advice.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const loggedIn = !!session?.user;

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <div className="bg-mesh" />
        <header className="site-header">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link
              href={loggedIn ? "/dashboard" : "/"}
              className="flex items-center gap-2 font-semibold text-brand"
            >
              <span className="inline-block h-6 w-6 rounded-lg bg-gradient-to-br from-teal-400 to-brand-dark shadow-sm" />
              Advisr
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {loggedIn ? (
                <>
                  <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
                    Dashboard
                  </Link>
                  <Link href="/accounts/new" className="text-slate-600 hover:text-slate-900">
                    Add account
                  </Link>
                  <Link href="/profile" className="text-slate-600 hover:text-slate-900">
                    Profile
                  </Link>
                  <Link href="/chat" className="text-slate-600 hover:text-slate-900">
                    Assistant
                  </Link>
                  <Link href="/settings/billing" className="text-slate-600 hover:text-slate-900">
                    Billing
                  </Link>
                  <UpgradeNavButton />
                  <SignOutButton />
                </>
              ) : (
                <Link href="/login" className="text-slate-600 hover:text-slate-900">
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

        {/* First-run walkthrough (self-gates via /api/onboarding); only for
            signed-in users. Replayable from Settings → Billing. */}
        {loggedIn && <OnboardingTour />}

        <footer>
          <DisclaimerBanner />
        </footer>
      </body>
    </html>
  );
}
