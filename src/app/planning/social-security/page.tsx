"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PlanningShell } from "@/components/planning/PlanningShell";
import {
  illustrateSocialSecurity,
  SocialSecurityResult,
} from "@/lib/planning/social-security";
import { currency } from "@/lib/labels";

export default function SocialSecurityPage() {
  const reduce = useReducedMotion();
  const [birthDate, setBirthDate] = useState("1960-06-15");
  const [benefit, setBenefit] = useState("2000");
  const [result, setResult] = useState<SocialSecurityResult | null>(null);

  function compute(e: React.FormEvent) {
    e.preventDefault();
    const birthYear = birthDate ? new Date(birthDate).getUTCFullYear() : 0;
    setResult(
      illustrateSocialSecurity({
        birthYear,
        monthlyBenefitAtFra: Number(benefit) || 0,
      }),
    );
  }

  return (
    <PlanningShell
      title="Social Security claiming illustrator"
      subtitle="Public SSA reduction/credit formulas show your estimated monthly benefit at 62, Full Retirement Age, and 70. This is an illustration, not a claim-age recommendation."
    >
      <form onSubmit={compute} className="card grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Date of birth</label>
          <input type="date" className="input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Estimated monthly benefit at FRA ($)</label>
          <input type="number" step="any" className="input" value={benefit} onChange={(e) => setBenefit(e.target.value)} />
          <p className="mt-1 text-xs text-slate-400">From your SSA statement (ssa.gov).</p>
        </div>
        <div className="sm:col-span-2">
          <button className="btn-primary">Illustrate</button>
        </div>
      </form>

      {result && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-6 space-y-6"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <ClaimCard label="Claim at 62" monthly={result.at62.monthlyBenefit} factor={result.at62.factor} />
            <ClaimCard
              label={`Claim at FRA (${result.fra.years}y ${result.fra.months}m)`}
              monthly={result.atFra.monthlyBenefit}
              factor={result.atFra.factor}
              highlight
            />
            <ClaimCard label="Claim at 70" monthly={result.at70.monthlyBenefit} factor={result.at70.factor} />
          </div>

          <div className="card">
            <h3 className="mb-1 font-medium text-slate-900">Cumulative benefits &amp; breakeven</h3>
            <p className="mb-3 text-xs text-slate-500">
              Where the later, larger benefit&apos;s running total overtakes the earlier one (ignores COLA).
            </p>
            <BreakevenChart result={result} />
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <Breakeven label="FRA overtakes 62 at age" age={result.breakevens.earlyVsFra} />
              <Breakeven label="Age 70 overtakes 62 at age" age={result.breakevens.earlyVsLate} />
              <Breakeven label="Age 70 overtakes FRA at age" age={result.breakevens.fraVsLate} />
            </div>
          </div>
        </motion.div>
      )}
    </PlanningShell>
  );
}

function ClaimCard({
  label,
  monthly,
  factor,
  highlight,
}: {
  label: string;
  monthly: number;
  factor: number;
  highlight?: boolean;
}) {
  return (
    <div className={`card ${highlight ? "ring-1 ring-brand/40" : ""}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{currency(monthly)}<span className="text-sm font-normal text-slate-400">/mo</span></p>
      <p className="mt-0.5 text-xs text-slate-400">{Math.round(factor * 100)}% of FRA benefit</p>
    </div>
  );
}

function Breakeven({ label, age }: { label: string; age: number | null }) {
  return (
    <div className="rounded-lg border border-slate-200/70 bg-white/60 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-800">{age == null ? "—" : `${age.toFixed(1)}`}</p>
    </div>
  );
}

/** Simple cumulative-benefit line chart from age 62 to 90. */
function BreakevenChart({ result }: { result: SocialSecurityResult }) {
  const W = 560;
  const H = 200;
  const PAD = 34;
  const minAge = 62;
  const maxAge = 90;

  const series = [
    { start: 62, monthly: result.at62.monthlyBenefit, color: "#0ea5e9", label: "62" },
    { start: result.atFra.ageMonths / 12, monthly: result.atFra.monthlyBenefit, color: "#0f766e", label: "FRA" },
    { start: 70, monthly: result.at70.monthlyBenefit, color: "#f97316", label: "70" },
  ];

  const cum = (start: number, monthly: number, age: number) =>
    age < start ? 0 : monthly * 12 * (age - start);
  const maxY = Math.max(...series.map((s) => cum(s.start, s.monthly, maxAge)), 1);

  const x = (age: number) => PAD + ((age - minAge) / (maxAge - minAge)) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - (v / maxY) * (H - 2 * PAD);

  const path = (s: (typeof series)[number]) => {
    const pts: string[] = [];
    for (let age = minAge; age <= maxAge; age += 1) {
      pts.push(`${x(age).toFixed(1)},${y(cum(s.start, s.monthly, age)).toFixed(1)}`);
    }
    return pts.join(" ");
  };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[420px]">
        {/* axes */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#cbd5e1" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#cbd5e1" />
        {[62, 70, 80, 90].map((age) => (
          <text key={age} x={x(age)} y={H - PAD + 14} fontSize="10" fill="#94a3b8" textAnchor="middle">
            {age}
          </text>
        ))}
        {series.map((s) => (
          <polyline key={s.label} points={path(s)} fill="none" stroke={s.color} strokeWidth="2" />
        ))}
        {/* legend */}
        {series.map((s, i) => (
          <g key={s.label} transform={`translate(${PAD + 8 + i * 84}, ${PAD - 8})`}>
            <rect width="10" height="3" y="-3" fill={s.color} />
            <text x="14" y="1" fontSize="10" fill="#64748b">
              Claim {s.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
