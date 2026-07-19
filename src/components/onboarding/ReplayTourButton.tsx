"use client";

import { useRouter } from "next/navigation";
import { REPLAY_FLAG } from "./OnboardingTour";

/**
 * Re-opens the onboarding tour. Sets a sessionStorage flag and navigates to the
 * dashboard; the layout-mounted <OnboardingTour> sees the flag on the path
 * change and opens (see OnboardingTour's pathname effect).
 */
export function ReplayTourButton({ className }: { className?: string }) {
  const router = useRouter();

  function replay() {
    try {
      window.sessionStorage.setItem(REPLAY_FLAG, "1");
    } catch {
      // sessionStorage can throw in private modes — fall through to navigation.
    }
    router.push("/dashboard");
  }

  return (
    <button onClick={replay} className={className ?? "btn-secondary"}>
      Replay tutorial
    </button>
  );
}
