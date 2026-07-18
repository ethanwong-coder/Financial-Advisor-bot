# Estate Organizer (MVP)

An **informational, compliance-tracking** tool that helps people spot gaps in
their financial and estate paperwork. It keeps a persistent per-user "case file"
(accounts, key documents, life-event facts) and proactively flags specific,
well-defined coordination issues — starting with:

1. **Inherited-IRA 10-year distribution rule** (SECURE Act / SECURE 2.0), and
2. **Beneficiary-designation mismatches** (e.g., an ex-spouse still listed).

> ⚠️ **This is not an investment advisor.** It does not recommend buying,
> selling, or reallocating investments. It surfaces *facts* ("the beneficiary
> listed does not match your current marital status", "this account must be
> fully distributed by 12/31/2031") and always tells you to consult a licensed
> professional.

---

## Legal positioning (read this first)

**What this product is:** an *informational and organizational* tool. It helps
you **notice** and **track** paperwork issues. Every determination is made by
**deterministic code against published IRS rules**, and every user-facing flag
carries the disclaimer: *"This is informational only and is not financial, tax,
or legal advice. Consult your CPA and/or estate attorney before acting."*

**What this product is NOT, by design:**

- **Not a Registered Investment Adviser (RIA).** Under the Investment Advisers
  Act (and state analogues), "investment advice" generally means advice about
  the *value of, or advisability of investing in, buying, or selling securities*
  for compensation. This app deliberately never does that: it makes no
  securities recommendations, no allocation/rebalancing suggestions, and no
  buy/sell/hold guidance anywhere. It reports deadlines and paperwork
  mismatches — the same category as a calendar reminder or a document checklist.
- **Not a law firm / not legal advice.** The app *flags facts* ("the named
  beneficiary matches a former spouse on record") but never interprets a
  document's legal effect, validity, or meaning. It repeatedly directs users to
  an estate attorney.
- **Not a tax preparer / CPA.** RMD *deadlines* and whether a distribution was
  taken are surfaced as factual, published-rule outputs; the app does not file,
  advise on, or optimize taxes, and labels any dollar figure as an
  informational estimate to confirm with a professional.

**How the guardrails are enforced (defense in depth):**

- **Deterministic engine, not the LLM, does every calculation.** All RMD /
  deadline / beneficiary logic lives in pure, unit-tested code
  (`src/lib/rules/*`). The LLM never computes a compliance number.
- **The LLM is constrained by a hard system prompt** (`src/lib/llm/system-prompt.ts`)
  to *only* explain the engine's output, ask for missing profile facts, and
  attach the disclaimer — with explicit "never give investment advice / never
  interpret documents / never invent numbers" rules.
- **A post-check** (`ensureDisclaimer` in `src/lib/llm/claude.ts`) guarantees the
  not-advice disclaimer is present on any flag-related reply even if the model
  omits it.
- **The UI shows the disclaimer** on every page (footer) and inline on every
  flag (`src/components/DisclaimerBanner.tsx`).

None of this is a substitute for a compliance/legal review before real-world
launch — see **Expanding scope** below.

---

## What's in the box

| Deliverable | Where |
|---|---|
| Data model / schema for the case file | `prisma/schema.prisma` |
| Plaid integration (sandbox) with a no-credentials **mock** fallback | `src/lib/plaid/client.ts`, `src/app/api/plaid/*` |
| **Deterministic rules engine + unit tests** (inherited-IRA 10-year rule, beneficiary mismatch) | `src/lib/rules/*` (tests: `*.test.ts`) |
| Claude API explanation layer with guardrails | `src/lib/llm/*`, `src/app/api/chat` |
| Dashboard UI (accounts, flags with severity, resolve/dismiss) | `src/app/dashboard`, `src/app/accounts/new`, `src/app/profile`, `src/app/chat` |
| Encryption at rest + no-logging of sensitive fields | `src/lib/crypto/field-encryption.ts`, `src/lib/log.ts` |
| Quarterly check-in / reminder job | `scripts/send-reminders.ts` |
| Demo seed data | `scripts/seed.ts` |

**Stack:** Next.js 15 (App Router, TypeScript) · PostgreSQL + Prisma ·
Auth.js (email+password, JWT sessions) · Plaid (sandbox) · Anthropic Claude API ·
Tailwind CSS · Vitest.

---

## The rules engine (the core)

`src/lib/rules/` is **pure, dependency-free TypeScript** with no I/O, no LLM, and
no clock reads (the evaluation date is always injected) — so it is fully
deterministic and unit-tested. `runRulesEngine(snapshot, today)` returns neutral
`RuleFinding[]`.

**Inherited-IRA 10-year rule** (`inherited-ira.ts`) implements, for deaths after
2019-12-31:

- **EDB exemption** — surviving spouse, minor child of the owner, disabled,
  chronically ill, or someone not more than 10 years younger are Eligible
  Designated Beneficiaries and generally exempt (no false 10-year flag).
- **10-year deadline** — a non-eligible designated beneficiary must fully
  distribute by 12/31 of the 10th year after death (e.g., death 2020 → 2030),
  escalating to CRITICAL if the deadline has passed.
- **Annual RMDs inside the window** — required only if the owner died **on or
  after** their Required Beginning Date (SECURE 2.0 RMD ages 72/73/75). The IRS
  waived the penalty for missed annual RMDs for 2021–2024, so a *missed*-year
  flag is only raised from **2025** onward.
- **Informational RMD estimate** using the Single Life "reduce-by-one" method
  (see the table caveat below).

**Beneficiary mismatch** (`beneficiary-mismatch.ts`) flags: ex-spouse still
listed, a "spouse" beneficiary that contradicts current marital status, a
spouse-name mismatch, a missing beneficiary on a designation-based account, a
married-with-non-spouse ERISA-plan primary (spousal-consent note), and a
designation last confirmed before the most recent marriage/divorce.

**Tests** (`npm test`) assert these against known IRS examples — e.g. *owner dies
2020, adult child → distribute by 12/31/2030*; *owner died after RBD + missed
current-year distribution → HIGH "behind" flag*; *owner died before RBD → no
annual RMDs*.

> **⚠️ Single Life Table is a SAMPLE.** `single-life-table.ts` ships a small,
> high-confidence subset of the IRS 2022 Single Life Table so the RMD *estimate*
> works out of the box. **Before production, replace it with the complete table
> from IRS Publication 590-B, Appendix B.** The compliance *flags* do not depend
> on these factors (they check whether a required distribution was taken at
> all), so a missing factor only omits the dollar estimate.

---

## Running it

### Prerequisites
- Node.js 20+ and npm
- Docker (for the Postgres container) — or a local Postgres

### 1. Install & configure
```bash
npm install
cp .env.example .env
# then edit .env:
npx auth secret                 # sets AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # ENCRYPTION_KEY
# add your ANTHROPIC_API_KEY
```

### 2. Start Postgres (Docker Compose)
```bash
docker compose up -d db
```
(Compose also builds/runs the whole app with `docker compose up`, but for local
dev it's easier to run just the DB in Docker and `npm run dev` on the host.)

### 3. Migrate, seed, run
```bash
npm run prisma:migrate        # creates tables (first run: names the migration)
npm run db:seed               # optional demo user: demo@example.com / password123
npm run dev                   # http://localhost:3000
```

### 4. Try it
- Register (or log in as the seeded demo user).
- **Connect accounts** → pulls sandbox accounts (mock adapter unless Plaid keys
  are set). Plaid does not expose beneficiaries, so **add beneficiary and
  inherited-IRA details manually** via *Add account*.
- **Run checks** → the deterministic engine evaluates the case file and
  populates flags.
- Open the **Assistant** to have flags explained in plain English.

### Tests
```bash
npm test            # all tests
npm run test:rules  # just the rules engine
```

---

## Plaid notes

- **No credentials?** The app uses a built-in **mock adapter** so the
  link → exchange → fetch flow works offline (deterministic sandbox accounts).
- **Live sandbox:** set `PLAID_CLIENT_ID` / `PLAID_SECRET` / `PLAID_ENV=sandbox`.
  The `/api/plaid/link-token` endpoint returns a real link token; to complete
  the flow you must embed **Plaid Link** (the `react-plaid-link` SDK) in the
  client to obtain a `public_token`, then POST it to `/api/plaid/exchange`. The
  server-side exchange/fetch and encrypted-token storage are already wired.

---

## Security

- **Encryption at rest:** account numbers and Plaid access tokens are encrypted
  with AES-256-GCM (random IV + auth tag) via `src/lib/crypto/field-encryption.ts`,
  keyed by `ENCRYPTION_KEY`. Plaintext is never persisted.
- **No sensitive logging:** `src/lib/log.ts` redacts sensitive keys (account
  numbers, tokens, balances, beneficiary names, SSNs) before anything is
  written. Prisma query logging is disabled in production.
- **This MVP does not yet collect SSNs.** The encryption + redaction plumbing is
  in place should you add them; do so only with a clear need and legal review.
- Auth uses hashed passwords (bcrypt, 12 rounds) and JWT sessions.

---

## Expanding scope — what would need to change

This MVP is intentionally narrow and stays on the informational side of the
line. To broaden it responsibly:

- **If you add investment advice** (allocation, product, buy/sell guidance):
  you likely become an **investment adviser** and must register (SEC or state)
  as an **RIA**, deliver Form ADV, meet fiduciary/custody/recordkeeping rules,
  and add compliance oversight. Do not ship any such feature without counsel.
- **If you add legal interpretation** of documents (wills, trusts): involve
  **licensed attorneys**; unauthorized practice of law is a real risk.
- **If you add tax preparation/optimization:** involve **CPAs/EAs** and the
  associated regulatory obligations.
- **Complete the IRS tables & rules:** load the full Single Life Table and add
  the remaining regimes (pre-2020 deaths, non-person/trust beneficiaries, spouse
  elections, the 70½ edge, state-specific rules).
- **Security & compliance hardening:** move the encryption key into a **KMS/HSM**
  with rotation, pursue **SOC 2**, add audit logging, data-retention/`deletion`
  controls, and (if any health data) HIPAA/BAA considerations. Consider
  field-level access controls and per-tenant isolation.
- **Plaid production access:** complete Plaid's production/OAuth requirements,
  webhooks for balance/transaction updates, and item re-auth handling.
- **Real notifications:** wire `scripts/send-reminders.ts` to an email/SMS
  provider (link users back into the app; never put sensitive detail in the
  message body).
- **Human-in-the-loop review** for any new rule before it can flag, plus an
  expert-reviewed test suite per rule (the pattern is established in
  `src/lib/rules/*.test.ts`).

---

## Project layout

```
prisma/schema.prisma            # case-file data model
src/lib/rules/                  # PURE deterministic rules engine (+ tests)
src/lib/crypto/                 # AES-256-GCM field encryption (+ test)
src/lib/plaid/                  # Plaid adapter with mock fallback
src/lib/llm/                    # Claude explanation layer + guardrail system prompt
src/lib/flags/reconcile.ts      # findings -> persistent flags (status-preserving)
src/lib/case-file.ts            # DB rows -> pure engine snapshot
src/auth.ts, src/auth.config.ts # Auth.js (credentials + JWT, edge-safe split)
src/app/api/                    # REST endpoints (profile, accounts, plaid, flags, chat)
src/app/                        # dashboard, profile, accounts/new, chat, login/register
scripts/                        # seed + quarterly reminder job
```
