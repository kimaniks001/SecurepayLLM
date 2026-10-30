# SecurePay — Master Convergence Gate 4
## Identity, activation, pricing, privacy and Money authority
**28 October 2026 | Decision: source fix and frontend tests PASS; live end-to-end certification NO-GO.**

## 1. Candidate pair and guardrails

- Unified UI parent: Gate 3 UI PR #197, `625dec8d5f28ee192827690c504ea8721450f8b2`. Gate 4 candidate branch: `feature/master-convergence-gate4-ui-20261028`.
- Unified API parent: Gate 3 API PR #374, `29bc109df4707be621db934a45513ac44af23415`. Gate 4 API branch: `feature/master-convergence-gate4-api-20261028`.
- No production deployment, no merge to main, no activation funding request or Money transfer executed.
- Gate 2 six-real-journey certification and Gate 3 real KS001/provider checks are still outstanding. Gate 4 cannot substitute for them.

## 2. Production-impacting privacy risk repaired in UI source

Previously `ActivationExperience` watched `[sessionState.status]` only. A **signed-in A → signed-in B** session replacement did not trigger a reset/refetch. Meanwhile completed asynchronous activation reads could write A's previous plan, activation Agreement and funding data into the current component state. This is an account-scoping defect even though backend authorization must independently defend every call.

**Remediation:**
- Reset plan, Agreement, billing intent, funding status, error and loading state on each **exact session snapshot change**, including signed-in → signed-in and refresh.
- Add exact snapshot identity guard `isCurrentActivationSession` and reject late responses, including failures, from an obsolete session.
- Every activation action is scoped to its initiating session; a changed session stops **chained** mutations and result display.
- Immediately re-read `activationFundingStatus()` before funding steps; reject an action if the backend's `nextAction` no longer matches or funding has already become complete. Backend is still responsible for idempotency, authorisation and settlement.
- Funding callbacks on unknown state remain read-only. This UI still has **no fake Money completion or payment quote**.

**Files:** `src/features/activation/ActivationExperience.tsx`, `sessionBoundary.ts`. New regression suite exercises the actual in-memory `createSessionStore` plus source-level wiring. True browser account-switch integration remains to be certified with two authenticated people.

## 3. Authoritative economics — from current combined backend source, not assumed UI fees

| Domain | Exact currently implemented rule at Gate 4 API parent |
|---|---|
| KS identity | Issuance and authentication are distinct from financial activation and Trust Project membership |
| For You monthly | KES 100 |
| Business monthly | KES 200 |
| For You activation **funding** | KES 400: KES 100 first subscription + KES 100 returned settlement verification + KES 200 customer-owned Review Reserve |
| Business activation **funding** | KES 500: KES 200 first subscription + KES 100 returned verification + KES 200 Review Reserve |
| Standalone activation fee | None in this current version; those three buckets have different legal/accounting ownership |
| SecureLink up to KES 20,000 | KES 20 |
| Above KES 20,000 to KES 1,000,000 | KES 20 + 1% of the amount **above KES 20,000**, capped at KES 2,000 (cap reached at KES 218,000) |
| Above KES 1,000,000 through KES 5,000,000 | KES 2,000 + 0.2% of the excess over KES 1,000,000, capped at KES 10,000 |
| Above KES 5,000,000 | API refuses fee invention; no locked band |
| General collection | KES 20; welfare special case KES 10 |
| Dispute fee | KES 100; separate from customer Review Reserve |
| Pricing policy version | `phase31-v1.1-phase14-progressive` |

**These are source-verified definitions, NOT a claim that every currently deployed endpoint or live bank rail has this configuration.** The owner should confirm this schedule and activation decomposition as the intended public commercial promise before Gate 5 because historical simplified flat-1% and KES 500 activation-language would misdescribe the current code. Do not silently revert working pricing.

**Source of truth:** `CommercialPricingConstants`, `KeyContractFeePolicy`, `ActivationPromiseContent` and `SubscriptionController` in the combined API candidate. Fees are not computed in the UI.

## 4. Tests and instruments delivered

**API source:** `ConvergenceGate4ActivationEconomicsTest.java` tests separate funding buckets, first-month totals, authoritative promise text, 20,000/20,001/100,000/218,000/1m/5m platform fees and refusal above 5m. **Java test authored but not executed** on isolated private backend.

**UI source:** `tests/master-convergence-gate4-activation-privacy.test.mjs` verifies session swap/sign-out/token refresh invalidation, response guards, server-authorised funding step, unknown enum refusal and separate Agreement/Money semantics.

**Real API test harness:** `testing/master-convergence-gate4-authority-live.mjs`
- Requires explicit `GATE4_DISPOSABLE_ACK=YES`, **loopback HTTP**, exact UI/API commit SHAs and two **different disposable authenticated tokens**.
- Makes **GET only** requests; tests unauthenticated subscription denial and two different self-scoped plans, Agreements, funding snapshots with matching subscription IDs.
- Checks KES split among three buckets, no false financially-enabled state and the existing Gate 2 **read-only pricing boundary probe** (6 positive prices and above-band refusal).
- Does NOT create new KS identities, trigger activation, create payment intent, confirm Agreement, transfer or release funds.
- Actual signed-in ownership/identity assertions and privacy tests must be examined independently in backend logs. The source harness alone does not prove token identity.
- Injected mock fetch results are labelled `SYNTHETIC_PROTOCOL_PASS`, never native real evidence.

**Synthetic tests:** `tests/master-convergence-gate4-authority-live.test.mjs` reject same subscription ID for two actors, anonymous disclosure, wrong funding bucket, false financial enablement and wrong subscription pricing.

**Release gate:** `testing/master-convergence-gate4-certification.mjs` with initial `testing/master-convergence-gate4-evidence.json` intentionally NO-GO, requiring **8 independently reviewed domains**: Java/schema, two-account authority, KS issuance, activation Agreement consent, distinct funding components, progressive fees, Money idempotency and signed-in mobile/privacy.

## 5. Executed evidence

- **16/16 focused Gate 4 tests passed** in isolated Vercel UI sandbox.
- `npm run typecheck`: PASS.
- `npm run test:final-convergence`: **2,382/2,382 PASS**, zero failures.
- `npm run build`: PASS, normal Vite bundle advisory.
- `npm run lint`: exit 0 (39 warnings, 0 errors).
- Actual GitHub API Java/Gradle/Postgres execution: **NOT VERIFIED**. Prior exact Gate 3 API workflow returned `startup_failure` with zero jobs; an isolated sandbox cannot clone private API.
- Real authenticated two-person staging, MFA, bank payout validation, ledger reconciliation, refund, reserve accounting, payment retries and live rail authorisation: **NOT EXECUTED**.

## 6. Paul's exact Gate 4 qualification sequence

Use disposable accounts and non-production credentials only. All payment and release operations must be disabled via **backend feature flags and rail controls**, not merely hidden in the UI.

```bash
# API branch (private authorised checkout):
git switch feature/master-convergence-gate4-api-20261028
git rev-parse HEAD
java -version
./gradlew :services:agreement:test :services:securepay-core:test
./gradlew :services:securepay-core:integrationTest
# Run current Flyway migrations in disposable PostgreSQL; retain JUnit and CI links.
# Start this exact API on loopback with a disposable DB and separate test identities.

# UI branch (the exact pair under test):
git switch feature/master-convergence-gate4-ui-20261028
git rev-parse HEAD
npm ci
npm run typecheck
npm run test:final-convergence
npm run build
npm run lint

# IMPORTANT: never place customer credentials or real bank tokens in the JSON fixture
# TWO pre-seeded test identities with independent access tokens:
GATE4_DISPOSABLE_ACK=YES \
GATE4_FIXTURE=/safe/gate4-two-test-accounts.json \
  node testing/master-convergence-gate4-authority-live.mjs

node testing/master-convergence-gate4-certification.mjs \
  --evidence testing/master-convergence-gate4-evidence.json \
  --ui-sha "$(git rev-parse HEAD)" \
  --api-sha "<exact actual Gate 4 API SHA>"
```

**Separately test real signed-in browser transitions**, 1440px, 390px and 320px. With a delayed GET from Account A in flight, switch to Account B and confirm none of A's plan, price, Agreement title/hash, payment intent, funding next action or error is displayed or accepted. Repeat after sign-out and after token refresh. Attempt one prohibited anonymous funding read and an actor-scoped read as another real user. Confirm backend rejects private access even if UI is bypassed.

**For Money:** verify payment-ready and complete activation are not inferred from an Agreement, quote, preference or simulated movement. Repeated verification/status requests must not result in duplicate debits, double returns, or reserve creation. Those tests require a sanctioned **non-monetary sandbox ledger**; do not use live funds.

## 7. Release decision

**Gate 4 implementation prepared, UI tests green, authenticated backend/security and financial certification still NO-GO.** No release, no merge to main, no live payment. Gate 5 must not treat the absence of a private API runner as proof of backend correctness. The complete Gate 2 and Gate 3 signed-in/provider evidence remains mandatory.
