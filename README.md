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

## Market snapshot (informational — kept separate from compliance)

The dashboard shows a small **Market Snapshot** card (S&P 500, Dow, Nasdaq via
the SPY/DIA/QQQ ETF proxies, with daily % change color-coded green/red). It is
deliberately isolated:

- Lives in its own module ([src/lib/market/quotes.ts](src/lib/market/quotes.ts))
  and route ([src/app/api/market/route.ts](src/app/api/market/route.ts)) — it
  does **not** touch `src/lib/rules` or `src/lib/flags`.
- Shows **general index levels only** — it never references your accounts,
  balances, or holdings, and never influences a flag.
- Rendered at the **bottom** of the dashboard, clearly labeled as general market
  information and *not* investment advice, well away from the flags and the
  assistant.
- Provider: **Finnhub** free tier. Set `MARKET_DATA_API_KEY` in `.env`. Responses
  are cached **60s server-side** so the free-tier rate limit isn't a concern. If
  the key is missing or a request fails, the card shows “Market data
  unavailable” and the rest of the dashboard is unaffected.

## Planning tools (Phase 1 — informational calculators)

Five deterministic, unit-tested calculators live under
[src/lib/planning/](src/lib/planning/) — **fully separate from the rules engine
and flags** (`src/lib/rules` / `src/lib/flags` are untouched). No LLM is ever
involved in the math; each is pure code with tests, and every result screen
carries: *“Informational estimate only — not financial or tax advice. Consult a
CPA or financial advisor before making decisions.”* Reached from the **Planning
tools** section of the dashboard; each has a page under `src/app/planning/*`.

| Tool | What it does | Key assumptions / limits |
|---|---|---|
| **Retirement projection** | Projects balance at retirement (monthly compounding) and a simple year-by-year depletion estimate. | Default return **6% nominal** (user-adjustable); inflation optional (default 0 = nominal). Simple depletion, **not Monte Carlo**. An illustration, not a guarantee. |
| **Social Security illustrator** | Estimated monthly benefit at 62 / FRA / 70 with breakeven ages + chart. | Public SSA formulas (5/9%/mo early, 8%/yr delayed; FRA from birth year). Ignores COLA and the Jan-1 birthday edge. |
| **Quarterly tax estimate** | Safe-harbor estimated payments + the four due dates. | 90% of current year vs 100%/110% of prior year ($150k AGI split; $75k MFS). Due dates shift for weekends/holidays. |
| **NIIT / AMT screener** | Exact 3.8% NIIT; a rough AMT **exposure flag**. | NIIT thresholds are statutory/fixed. AMT is a **screening flag only** (uses MAGI as a crude AMTI proxy; tax-year-2025 exemption figures) — a real AMT calc needs Form 6251. |
| **QCD tracker** | Logs Qualified Charitable Distributions and shows how much of an IRA's RMD they satisfy. | RMD is **read** from the existing engine's inherited-IRA estimate where available, else entered from your custodian. Requires age 70½+. Annual QCD exclusion limit checked (2025 figure). |

**Data model:** QCD tracking adds one **additive** `QcdEntry` model (migration
`prisma/migrations/20260718010000_add_qcd_entry`) with relations to `User` and
`Account`; no existing model columns were changed. **Tax constants** (AMT
exemptions, QCD limit, tax year) are documented and must be updated annually.

## Planning tools (Phases 2–4)

The dashboard's **Planning tools** section is organized into five sub-categories
(Retirement & tax · Estate & insurance · Cash flow · Education & business · Life
transitions & goals). Everything remains additive, deterministic (pure code +
Vitest, no LLM math), auth-guarded, and disclaimer-wrapped.

- **Estate document tracker** — logs will / trust / financial POA / healthcare
  directive with an existence + last-reviewed status (flags 3+ years or a review
  predating a logged life event). Tracking only; no document interpretation.
- **Insurance needs** — life (needs-based), disability (income replacement), and
  LTC (national-average cost-of-care gap; figures adjustable). Every result ends
  with the "licensed agent required; no product recommended" note.
- **Cash flow** — budget summary, avalanche-vs-snowball debt payoff, emergency
  fund gap, and mortgage/refi with a closing-cost breakeven.
- **Education** — 529/Coverdell tracking (with a generic state-deduction note),
  a **simplified, clearly-labeled** SAI-style aid estimate, and a standard-vs-IDR
  student-loan comparison.
- **Business retirement** — SEP vs SIMPLE vs Solo 401(k) contribution room using
  documented **2026** IRS limits (flagged for annual verification).
- **Equity comp** — ISO / NSO / RSU / ESPP tax illustrations; the ISO path reuses
  the Phase 1 AMT screener for exposure.
- **Life-transition checklists** — standard task lists (marriage, divorce, job
  change, inheritance, relocation) with plain-English "why"s; beneficiary items
  point back to the existing flag system for awareness.
- **Goal tracking** — named goals with progress bars and on-pace flags.
- **Learn** — a static, plain-language glossary of the concepts these tools use.

Quarterly check-ins ([scripts/send-reminders.ts](scripts/send-reminders.ts)) now
also surface incomplete checklist items, goals behind pace, and estate documents
overdue for review, alongside the flag re-evaluation.

**Data model:** four additive models — `EstateDocument`, `Goal`,
`ChecklistItemState`, `EducationAccount` (migration
`prisma/migrations/20260718020000_add_planning_models`) — each related to `User`
only; no existing model columns changed. **Assumptions to verify/update yearly**
are centralized in [src/lib/planning/limits.ts](src/lib/planning/limits.ts)
(IRS 2026 limits) and [src/lib/planning/ltc-costs.ts](src/lib/planning/ltc-costs.ts)
(LTC averages); the aid/IDR estimates are deliberately simplified and labeled as
rough, not official.

> The rules engine (`src/lib/rules`) and flag logic (`src/lib/flags`) are
> unchanged across all planning phases — the planning tools only *read* from the
> engine (e.g. the QCD tracker reads the inherited-IRA RMD estimate).

## Subscriptions & billing (freemium)

Three tiers gate access to the feature set. The **tier is stored in the database**
(`Subscription` row) and is the **single source of truth** — nothing reads
entitlements from Stripe directly.

| Tier | Price | Unlocks |
| --- | --- | --- |
| **Free** | $0 | 1 connected account · manual "run checks" only · basic calculators (retirement, budgeting, emergency fund) |
| **Plus** | $9/mo · $89/yr | Unlimited accounts · automatic quarterly flag re-eval · full chat · full tax/SS/NIIT-AMT/QCD/insurance/debt/mortgage calculators · estate document tracker |
| **Pro** | $24/mo · $199/yr | Everything in Plus · education / business-retirement / equity-comp tools · life-transition checklists & goals · expanded check-ins · family accounts · PDF reports |

**How gating works**

- [`src/lib/billing/tiers.ts`](src/lib/billing/tiers.ts) — pure, client-safe:
  the `Feature → minimum tier` map, `hasFeature()`, `accountLimit()`, and pricing
  math. Imported by both the server guard and the UI so they never drift.
- [`src/lib/billing/entitlements.ts`](src/lib/billing/entitlements.ts) — server:
  `getUserTier(userId)` (expired / canceled / past-due → `FREE`) and
  `requireTierFeature(userId, feature)` which returns a `403 upgrade_required`
  before any gated work runs. Unit-tested in `entitlements.test.ts`.
- **Server-side on every gated route** — chat, the Plus/Pro planning APIs, the
  account-creation limit, and the Plaid link loop all call the guard. Client-side
  `useTier()` + `<Gate>` and the dashboard tier badges are *UX only*; the server
  is authoritative. `src/lib/rules` and `src/lib/flags` are never modified — only
  access to the routes that call them is gated.
- **Pages:** `/pricing` (monthly/annual toggle) and `/settings/billing` (current
  plan + Stripe Billing Portal link).

**Turning on Stripe** (deferred — the app runs fully on the Free tier without it)

1. In the Stripe Dashboard create **4 recurring Prices**: Plus monthly, Plus
   annual, Pro monthly, Pro annual.
2. Set the env vars in [`.env.example`](.env.example): `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, and the four `STRIPE_*_PRICE_ID`s.
3. Finish the three route stubs in `src/app/api/billing/` (`checkout`, `portal`,
   `webhook`) — each documents exactly what to implement. **Checkout** uses a
   hosted Stripe Checkout session; **portal** uses the Billing Portal; **webhook**
   must **verify the signature** and upsert the `Subscription` row on
   `checkout.session.completed` / `customer.subscription.updated|deleted` /
   `invoice.payment_failed`. Until configured, `/api/billing/*` returns
   `503 billing_not_configured` and the pricing page shows a notice.

> Card data is never stored or handled by this app — Stripe Checkout and the
> Billing Portal own all of it. The webhook must reject unsigned/invalid requests.

The seed ([scripts/seed.ts](scripts/seed.ts)) gives `demo@example.com` a **Pro**
subscription so every gated feature is exercisable without Stripe.

## Waitlist

An embeddable email-capture flow with double opt-in confirmation.

- **Form:** [`src/components/WaitlistForm.tsx`](src/components/WaitlistForm.tsx)
  (single email input + honeypot), shown on the public `/waitlist` page and
  linked from `/pricing`.
- **Signup** (`POST /api/waitlist`): validates the email, applies a honeypot +
  simple in-memory per-IP rate limit (no CAPTCHA), **dedupes** (an existing
  confirmed email is treated as already-registered, not an error), issues a
  single-use token, and sends the confirmation email.
- **Confirm** (`GET /api/waitlist/confirm?token=…`): validates the token, handles
  expired / invalid / already-confirmed gracefully, sets `confirmedAt`, and
  redirects to `/waitlist/confirmed` with a status. No crashes on bad tokens.
- **Email:** [`src/lib/email/send.ts`](src/lib/email/send.ts) is a **mock/log
  adapter** — no provider is wired up, so the confirmation email (including the
  link) is printed to the server console. Copy it from the log to confirm
  locally. To send real email, implement a provider branch (e.g. Resend) as the
  file header describes and keep the mock fallback.

**Data model:** one additive `WaitlistSignup` model (migration
`prisma/migrations/20260718030000_add_billing_waitlist`, alongside
`Subscription` + its enums); no existing columns changed.

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
