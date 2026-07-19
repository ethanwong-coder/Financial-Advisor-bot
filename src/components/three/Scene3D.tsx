"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// WebGL must be client-only; skip SSR entirely.
const FloatingScene = dynamic(() => import("./FloatingScene"), {
  ssr: false,
  loading: () => null,
});

/**
 * Wrapper so pages can drop the 3D scene in with a className for sizing/placement.
 * Decorative (aria-hidden), and skipped entirely for users who prefer reduced
 * motion — the floating animation is continuous, so we render nothing rather
 * than freeze a frame.
 */
export function Scene3D({ className }: { className?: string }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAllowed(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!allowed) return null;

  return (
    <div className={className} aria-hidden="true">
      <FloatingScene />
    </div>
  );
}
