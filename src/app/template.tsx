"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * `template.tsx` re-mounts on every navigation (unlike `layout.tsx`), so this
 * gives every page a short fade/slide-in transition. Kept to 250ms and disabled
 * entirely under prefers-reduced-motion.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
