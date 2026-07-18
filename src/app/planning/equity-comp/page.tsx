"use client";

import { useState } from "react";
import { PlanningShell } from "@/components/planning/PlanningShell";
import { Tabs } from "@/components/planning/Tabs";
import { NumberField, ResultCard, SelectField, Stat } from "@/components/planning/ui";
import { esppPurchase, isoExercise, nsoExercise, rsuVesting } from "@/lib/planning/equity-comp";
import { FILING_STATUS_LABELS, FilingStatus } from "@/lib/planning/constants";
import { currency } from "@/lib/labels";

const EQUITY_NOTE =
  "This is a simplified tax illustration. Actual tax treatment depends on your full situation — consult a CPA before exercising, selling, or making elections.";

function EqNote() {
  return <p className="mt-3 text-xs italic text-slate-500">{EQUITY_NOTE}</p>;
}

function n(v: string): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function IsoTab() {
  const [f, setF] = useState({ strike: "10", fmv: "40", shares: "1000", filingStatus: "SINGLE", otherIncome: "250000" });
  const [r, setR] = useState<ReturnType<typeof isoExercise> | null>(null);
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setR(
            isoExercise({
              strikePrice: n(f.strike),
              fairMarketValue: n(f.fmv),
              shares: n(f.shares),
              filingStatus: f.filingStatus as FilingStatus,
              otherModifiedAgi: n(f.otherIncome),
            }),
          );
        }}
        className="card grid gap-4 sm:grid-cols-2"
      >
        <NumberField label="Strike price ($/share)" value={f.strike} onChange={(v) => setF({ ...f, strike: v })} />
        <NumberField label="Current FMV ($/share)" value={f.fmv} onChange={(v) => setF({ ...f, fmv: v })} />
        <NumberField label="Shares" value={f.shares} onChange={(v) => setF({ ...f, shares: v })} />
        <SelectField label="Filing status" value={f.filingStatus} onChange={(v) => setF({ ...f, filingStatus: v })} options={Object.entries(FILING_STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
        <NumberField label="Other income / MAGI ($)" value={f.otherIncome} onChange={(v) => setF({ ...f, otherIncome: v })} hint="Used to screen AMT exposure (Phase 1 logic)." />
        <div className="sm:col-span-2"><button className="btn-primary">Model exercise</button></div>
      </form>
      {r && (
        <ResultCard>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Bargain element" value={currency(r.bargainElement)} big />
            <Stat label="Ordinary income at exercise" value={currency(r.ordinaryIncomeAtExercise)} />
            <Stat label="AMT exposure" value={r.amtExposure ?? "—"} big warn={r.amtExposure === "ELEVATED"} />
          </div>
          <p className="mt-2 text-xs text-slate-500">{r.note}</p>
          <EqNote />
        </ResultCard>
      )}
    </>
  );
}

function NsoTab() {
  const [f, setF] = useState({ strike: "10", fmv: "40", shares: "1000" });
  const [r, setR] = useState<ReturnType<typeof nsoExercise> | null>(null);
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setR(nsoExercise({ strikePrice: n(f.strike), fairMarketValue: n(f.fmv), shares: n(f.shares) }));
        }}
        className="card grid gap-4 sm:grid-cols-3"
      >
        <NumberField label="Strike ($/share)" value={f.strike} onChange={(v) => setF({ ...f, strike: v })} />
        <NumberField label="FMV ($/share)" value={f.fmv} onChange={(v) => setF({ ...f, fmv: v })} />
        <NumberField label="Shares" value={f.shares} onChange={(v) => setF({ ...f, shares: v })} />
        <div className="sm:col-span-3"><button className="btn-primary">Model exercise</button></div>
      </form>
      {r && (
        <ResultCard>
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Bargain element" value={currency(r.bargainElement)} />
            <Stat label="Ordinary income at exercise" value={currency(r.ordinaryIncome)} big />
          </div>
          <EqNote />
        </ResultCard>
      )}
    </>
  );
}

function RsuTab() {
  const [f, setF] = useState({ shares: "200", fmv: "50" });
  const [r, setR] = useState<ReturnType<typeof rsuVesting> | null>(null);
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setR(rsuVesting({ sharesVesting: n(f.shares), fairMarketValueAtVest: n(f.fmv) }));
        }}
        className="card grid gap-4 sm:grid-cols-2"
      >
        <NumberField label="Shares vesting" value={f.shares} onChange={(v) => setF({ ...f, shares: v })} />
        <NumberField label="FMV at vest ($/share)" value={f.fmv} onChange={(v) => setF({ ...f, fmv: v })} />
        <div className="sm:col-span-2"><button className="btn-primary">Model vesting</button></div>
      </form>
      {r && (
        <ResultCard>
          <Stat label="Ordinary income recognized at vesting" value={currency(r.ordinaryIncome)} big />
          <EqNote />
        </ResultCard>
      )}
    </>
  );
}

function EsppTab() {
  const [f, setF] = useState({ purchase: "8.5", fmv: "10", shares: "500" });
  const [r, setR] = useState<ReturnType<typeof esppPurchase> | null>(null);
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setR(esppPurchase({ purchasePrice: n(f.purchase), fairMarketValueAtPurchase: n(f.fmv), shares: n(f.shares) }));
        }}
        className="card grid gap-4 sm:grid-cols-3"
      >
        <NumberField label="Purchase price ($/share)" value={f.purchase} onChange={(v) => setF({ ...f, purchase: v })} />
        <NumberField label="FMV at purchase ($/share)" value={f.fmv} onChange={(v) => setF({ ...f, fmv: v })} />
        <NumberField label="Shares" value={f.shares} onChange={(v) => setF({ ...f, shares: v })} />
        <div className="sm:col-span-3"><button className="btn-primary">Model purchase</button></div>
      </form>
      {r && (
        <ResultCard>
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Bargain element" value={currency(r.bargainElement)} />
            <Stat label="Ordinary income (disqualifying sale)" value={currency(r.disqualifyingOrdinaryIncome)} big />
          </div>
          <p className="mt-2 text-xs text-slate-500">{r.note}</p>
          <EqNote />
        </ResultCard>
      )}
    </>
  );
}

export default function EquityCompPage() {
  return (
    <PlanningShell
      title="Equity compensation modeling"
      subtitle="Simplified tax illustrations for ISOs, NSOs, RSUs, and ESPP. Not tax advice."
    >
      <Tabs
        tabs={[
          { key: "iso", label: "ISO", content: <IsoTab /> },
          { key: "nso", label: "NSO", content: <NsoTab /> },
          { key: "rsu", label: "RSU", content: <RsuTab /> },
          { key: "espp", label: "ESPP", content: <EsppTab /> },
        ]}
      />
    </PlanningShell>
  );
}
