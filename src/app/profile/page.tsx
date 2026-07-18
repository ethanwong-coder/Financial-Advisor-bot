"use client";

import { useCallback, useEffect, useState } from "react";
import { RELATIONSHIP_LABELS } from "@/lib/labels";

interface Profile {
  fullName: string | null;
  stateOfResidence: string | null;
  dateOfBirth: string | null;
  maritalStatus: string;
  currentSpouseName: string | null;
  dependentsCount: number;
}

interface FamilyMember {
  id: string;
  relationship: string;
  fullName: string;
  dateOfBirth: string | null;
  marriageDate: string | null;
  divorceDate: string | null;
}

const MARITAL = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "SEPARATED"];
const FAMILY_RELATIONSHIPS = [
  "SPOUSE",
  "FORMER_SPOUSE",
  "CHILD",
  "DEPENDENT",
  "PARENT",
  "SIBLING",
  "OTHER",
];

function dateInput(v: string | null | undefined): string {
  return v ? new Date(v).toISOString().slice(0, 10) : "";
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({
    fullName: "",
    stateOfResidence: "",
    dateOfBirth: "",
    maritalStatus: "SINGLE",
    currentSpouseName: "",
    dependentsCount: 0,
  });
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const [pRes, fRes] = await Promise.all([
      fetch("/api/profile"),
      fetch("/api/family"),
    ]);
    if (pRes.ok) {
      const p = (await pRes.json()).profile;
      if (p)
        setProfile({
          fullName: p.fullName ?? "",
          stateOfResidence: p.stateOfResidence ?? "",
          dateOfBirth: dateInput(p.dateOfBirth),
          maritalStatus: p.maritalStatus ?? "SINGLE",
          currentSpouseName: p.currentSpouseName ?? "",
          dependentsCount: p.dependentsCount ?? 0,
        });
    }
    if (fRes.ok) setFamily((await fRes.json()).familyMembers);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: profile.fullName || null,
        stateOfResidence: profile.stateOfResidence || null,
        dateOfBirth: profile.dateOfBirth || null,
        maritalStatus: profile.maritalStatus,
        currentSpouseName: profile.currentSpouseName || null,
        dependentsCount: Number(profile.dependentsCount) || 0,
      }),
    });
    if (res.ok) setSaved(true);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>

      <form onSubmit={saveProfile} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              value={profile.fullName ?? ""}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">State of residence (2-letter)</label>
            <input
              className="input"
              maxLength={2}
              value={profile.stateOfResidence ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, stateOfResidence: e.target.value.toUpperCase() })
              }
            />
          </div>
          <div>
            <label className="label">Date of birth</label>
            <input
              type="date"
              className="input"
              value={profile.dateOfBirth ?? ""}
              onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Marital status</label>
            <select
              className="input"
              value={profile.maritalStatus}
              onChange={(e) => setProfile({ ...profile, maritalStatus: e.target.value })}
            >
              {MARITAL.map((m) => (
                <option key={m} value={m}>
                  {m[0] + m.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Current spouse name (if married)</label>
            <input
              className="input"
              value={profile.currentSpouseName ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, currentSpouseName: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Number of dependents</label>
            <input
              type="number"
              min={0}
              className="input"
              value={profile.dependentsCount}
              onChange={(e) =>
                setProfile({ ...profile, dependentsCount: Number(e.target.value) })
              }
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary">Save profile</button>
          {saved && <span className="text-sm text-emerald-700">Saved.</span>}
        </div>
      </form>

      <FamilySection family={family} onChange={load} />
    </div>
  );
}

function FamilySection({
  family,
  onChange,
}: {
  family: FamilyMember[];
  onChange: () => void;
}) {
  const [form, setForm] = useState({
    relationship: "CHILD",
    fullName: "",
    dateOfBirth: "",
    marriageDate: "",
    divorceDate: "",
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/family", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        relationship: form.relationship,
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth || null,
        marriageDate: form.marriageDate || null,
        divorceDate: form.divorceDate || null,
      }),
    });
    if (res.ok) {
      setForm({ relationship: "CHILD", fullName: "", dateOfBirth: "", marriageDate: "", divorceDate: "" });
      onChange();
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/family?id=${id}`, { method: "DELETE" });
    if (res.ok) onChange();
  }

  const showMarriageDates =
    form.relationship === "SPOUSE" || form.relationship === "FORMER_SPOUSE";

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        Family &amp; prior marriages
      </h2>
      <p className="mb-3 text-sm text-slate-500">
        Recording a <strong>former spouse</strong> lets the checks catch an
        ex-spouse still listed as a beneficiary. Marriage/divorce dates help
        catch designations that predate a major life event.
      </p>

      {family.length > 0 && (
        <ul className="mb-4 space-y-2">
          {family.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{m.fullName}</span>{" "}
                <span className="text-slate-500">
                  · {RELATIONSHIP_LABELS[m.relationship] ?? m.relationship}
                </span>
              </span>
              <button
                className="text-xs text-red-600 hover:underline"
                onClick={() => remove(m.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="card grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Relationship</label>
          <select
            className="input"
            value={form.relationship}
            onChange={(e) => setForm({ ...form, relationship: e.target.value })}
          >
            {FAMILY_RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {RELATIONSHIP_LABELS[r] ?? r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Full name</label>
          <input
            className="input"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Date of birth (optional)</label>
          <input
            type="date"
            className="input"
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
          />
        </div>
        {showMarriageDates && (
          <>
            <div>
              <label className="label">Marriage date</label>
              <input
                type="date"
                className="input"
                value={form.marriageDate}
                onChange={(e) => setForm({ ...form, marriageDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Divorce date (if applicable)</label>
              <input
                type="date"
                className="input"
                value={form.divorceDate}
                onChange={(e) => setForm({ ...form, divorceDate: e.target.value })}
              />
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <button className="btn-secondary">Add family member</button>
        </div>
      </form>
    </section>
  );
}
