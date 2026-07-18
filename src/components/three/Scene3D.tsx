"use client";

import dynamic from "next/dynamic";

// WebGL must be client-only; skip SSR entirely.
const FloatingScene = dynamic(() => import("./FloatingScene"), {
  ssr: false,
  loading: () => null,
});

/**
 * Wrapper so pages can drop the 3D scene in with a className for sizing/placement.
 * Marked aria-hidden — it's decorative.
 */
export function Scene3D({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <FloatingScene />
    </div>
  );
}
