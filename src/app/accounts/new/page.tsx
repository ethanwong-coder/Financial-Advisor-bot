"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACCOUNT_TYPE_LABELS,
  INHERITED_CLASS_LABELS,
  RELATIONSHIP_LABELS,
} from "@/lib/labels";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { Spinner } from "@/components/Spinner";

const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_LABELS);
const BENEFICIARY_RELATIONSHIPS = Object.keys(RELATIONSHIP_LABELS);
const INHERITED_CLASSES = Object.keys(INHERITED_CLASS_LABELS);

export default function NewAccountPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [f, setF] = useState({
    nickname: "",
    accountType: "TRADITIONAL_IRA",
    institutionName: "",
    balance: "",
    accountNumber: "",
    beneficiaryPrimaryName: "",
    beneficiaryPrimaryRelationship: "NONE",
    beneficiaryLastConfirmed: "",
  });

  const [ira, setIra] = useState({
    originalOwnerName: "",
    originalOwnerDateOfDeath: "",
    originalOwnerDateOfBirth: "",
    beneficiaryClass: "NON_ELIGIBLE",
    beneficiaryDateOfBirth: "",
    currentYearDistribution: "",
    priorYearEndBalance: "",
  });

  const isInheritedIra = f.accountType === "INHERITED_IRA";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const body: Record<string, unknown> = {
      nickname: f.nickname,
      accountType: f.accountType,
      institutionName: f.institutionName || null,
      balance: f.balance ? Number(f.balance) : null,
      accountNumber: f.accountNumber || null,
      beneficiaryPrimaryName: f.beneficiaryPrimaryName || null,
      beneficiaryPrimaryRelationship: f.beneficiaryPrimaryRelationship || null,
      beneficiaryLastConfirmed: f.beneficiaryLastConfirmed || null,
    };
    if (isInheritedIra) {
      if (!ira.originalOwnerDateOfDeath) {
        setError("Inherited IRA requires the original owner's date of death.");
        setSaving(false);
        return;
      }
      body.inheritedIra = {
        originalOwnerName: ira.originalOwnerName || null,
        originalOwnerDateOfDeath: ira.originalOwnerDateOfDeath,
        originalOwnerDateOfBirth: ira.originalOwnerDateOfBirth || null,
        beneficiaryClass: ira.beneficiaryClass,
        beneficiaryDateOfBirth: ira.beneficiaryDateOfBirth || null,
        currentYearDistribution: ira.currentYearDistribution
          ? Number(ira.currentYearDistribution)
          : null,
        priorYearEndBalance: ira.priorYearEndBalance
          ? Number(ira.priorYearEndBalance)
          : null,
      };
    }

    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? data.error ?? "Could not add the account.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Add an account</h1>

      <form onSubmit={submit} className="card space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Nickname</label>
            <input
              className="input"
              value={f.nickname}
              onChange={(e) => setF({ ...f, nickname: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Account type</label>
            <select
              className="input"
              value={f.accountType}
              onChange={(e) => setF({ ...f, accountType: e.target.value })}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACCOUNT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Institution (optional)</label>
            <input
              className="input"
              value={f.institutionName}
              onChange={(e) => setF({ ...f, institutionName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Balance (optional)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={f.balance}
              onChange={(e) => setF({ ...f, balance: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">
              Account number (optional — stored encrypted)
            </label>
            <input
              className="input"
              value={f.accountNumber}
              onChange={(e) => setF({ ...f, accountNumber: e.target.value })}
              autoComplete="off"
            />
          </div>
        </div>

        <fieldset className="rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-sm font-medium text-slate-700">
            Beneficiary designation
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Primary beneficiary name</label>
              <input
                className="input"
                value={f.beneficiaryPrimaryName}
                onChange={(e) =>
                  setF({ ...f, beneficiaryPrimaryName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Relationship</label>
              <select
                className="input"
                value={f.beneficiaryPrimaryRelationship}
                onChange={(e) =>
                  setF({ ...f, beneficiaryPrimaryRelationship: e.target.value })
                }
              >
                {BENEFICIARY_RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>
                    {RELATIONSHIP_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Beneficiary last confirmed on</label>
              <input
                type="date"
                className="input"
                value={f.beneficiaryLastConfirmed}
                onChange={(e) =>
                  setF({ ...f, beneficiaryLastConfirmed: e.target.value })
                }
              />
            </div>
          </div>
        </fieldset>

        {isInheritedIra && (
          <fieldset className="rounded-lg border border-brand/40 bg-teal-50/40 p-4">
            <legend className="px-1 text-sm font-medium text-brand">
              Inherited IRA details
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Original owner name</label>
                <input
                  className="input"
                  value={ira.originalOwnerName}
                  onChange={(e) =>
                    setIra({ ...ira, originalOwnerName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Owner date of death *</label>
                <input
                  type="date"
                  className="input"
                  value={ira.originalOwnerDateOfDeath}
                  onChange={(e) =>
                    setIra({ ...ira, originalOwnerDateOfDeath: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Owner date of birth</label>
                <input
                  type="date"
                  className="input"
                  value={ira.originalOwnerDateOfBirth}
                  onChange={(e) =>
                    setIra({ ...ira, originalOwnerDateOfBirth: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Your beneficiary classification</label>
                <select
                  className="input"
                  value={ira.beneficiaryClass}
                  onChange={(e) =>
                    setIra({ ...ira, beneficiaryClass: e.target.value })
                  }
                >
                  {INHERITED_CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {INHERITED_CLASS_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Your date of birth (beneficiary)</label>
                <input
                  type="date"
                  className="input"
                  value={ira.beneficiaryDateOfBirth}
                  onChange={(e) =>
                    setIra({ ...ira, beneficiaryDateOfBirth: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Distributions taken this year</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={ira.currentYearDistribution}
                  onChange={(e) =>
                    setIra({ ...ira, currentYearDistribution: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Prior year-end balance</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={ira.priorYearEndBalance}
                  onChange={(e) =>
                    setIra({ ...ira, priorYearEndBalance: e.target.value })
                  }
                />
              </div>
            </div>
            <DisclaimerBanner inline />
          </fieldset>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button className="btn-primary" disabled={saving}>
            {saving ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Saving…
              </>
            ) : (
              "Save account"
            )}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push("/dashboard")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
