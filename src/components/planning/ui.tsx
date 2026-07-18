"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Number input with label + optional hint. */
export function NumberField({
  label,
  value,
  onChange,
  hint,
  step = "any",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        step={step}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Stat({
  label,
  value,
  big,
  good,
  warn,
}: {
  label: string;
  value: string;
  big?: boolean;
  good?: boolean;
  warn?: boolean;
}) {
  const color = good ? "text-emerald-700" : warn ? "text-rose-600" : "text-slate-900";
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`${big ? "text-xl font-semibold" : "text-base font-medium"} ${color}`}>
        {value}
      </p>
    </div>
  );
}

/** Animated result container (respects reduced motion). */
export function ResultCard({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="card mt-6"
    >
      {children}
    </motion.div>
  );
}
