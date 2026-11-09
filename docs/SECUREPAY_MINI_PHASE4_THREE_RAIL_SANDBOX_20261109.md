# SecurePay Mini — Phase 4 Three-Rail Funding Simulator

> **Revised master roadmap — 9 November 2026:** This Phase 4 file documents the **three-rail simulator only (Phase 4A)**. It does **not** establish checkout readiness. Phase 4B–4D must cover verified host/order checkout, reviewed agreement/authorisation, server-owned quote, payment status and return. See [Checkout-First Master Plan](SECUREPAY_MINI_CHECKOUT_FIRST_MASTER_PLAN_20261109.md) and [Shared Checkout Contract](SECUREPAY_MINI_CHECKOUT_CONTRACT_V1_20261109.md). Prior simulated tests remain valid in their limited scope.

**Date:** 9 November 2026
**Scope:** Owner-only, nonfinancial test experience. No authorised customer funds, bank API, ledger, fees, identity, signed agreement or real KS001 model execution added.
**Dependency:** Phase 3 frontend source and Phase 0 continuing fictional trader cohort. Stacked development PR; do not merge or deploy over live SecurePay without full gate review.

## Product intent

Mini should let a person **choose** how they could fund a trade, without being locked to one rail. In this deliberately fictional preview, all three approved discussion candidates are selectable:

- **Choice Bank** — bank-based funding experience (no bank account created/credited/safeguarded by demo).
- **M-Pesa** — mobile-money experience (no STK push, payment request, or phone collection).
- **PesaLink** — bank-transfer experience (no bank details or transfer initiated).

These are *fixed candidate methods for simulation only*. The future live list MUST come from SecurePayAPI's actual per-Agreement \`fundingOptions\` and authenticated funding authority; do not hardcode all three as available in production.

## Owner journey

1. Open Phase 4 standalone Mini or the **same compact popup** in a sample host.
2. Describe an ordinary sale, service or obligation and enter a positive amount as a local draft. Optional capture/quantity and guest KS001 remain intact.
3. Review the draft. It explicitly says it is **not sent, accepted or a canonical Agreement**.
4. Choose **Explore funding options (simulation)** from review.
5. Select Choice Bank, M-Pesa or PesaLink; the interface shows the difference as *descriptive test context*, not a verified method or fee. Service fee, provider charge and total payable show **not quoted/not authorised**, not invented amounts.
6. Select **Start simulated payment** to enter a fake pending state. No bank, phone or ledger call happens.
7. In the deliberately labelled **Testing controls** (hidden unless expanded), vary the fictional provider outcome: simulated confirmed, simulated failed or simulated unknown. Unknown cannot start another attempt or change rail; it must be resolved. Failed can start a new numbered fictional attempt or change method. Confirmed cannot spawn another attempt.
8. Reset and compare another rail. It is a fresh simulation, not a reversal, refund or settlement.

**Critical semantics:** “Provider confirmation simulated” does not mean money was collected or safeguarded, and no journal, funded Agreement position, settlement or release exists. No real payer/recipient is authenticated, no canonical Agreement version accepted and no real fees quoted. All test states vanish on exit or reset; no payment records are persisted.

## Reused canonical contracts (inspected, not called)

- \`src/api/securepay/payment-intent/index.ts\`: \`fundingAuthority\`, \`fundingOptions\`, backend version-bound quotes, backend-side amount/currency, idempotent intent creation/initiation, authoritative poll; **all methods require authenticated sessions**.
- \`src/api/securepay/payment-intent/dto.ts\`: status shapes including CREATED, INITIATION_PENDING, PROVIDER_PENDING, CONFIRMATION_PENDING, CONFIRMED and failures. The simulator DOES NOT claim to instantiate these DTOs or actual payment intents.
- \`src/api/securepay/money-snapshot/index.ts\`: authenticated read-only Agreement Money snapshot; must own verified evidence when enabled.
- \`src/features/money/MoneyPaymentSettlementJourney.tsx\`: existing full-workspace provider and settlement experience. **DO NOT duplicate** its production authority in Mini; use in later fully authenticated read/quote/instruction integration.

## Source implemented

- \`src/mini/miniFundingSimulator.ts\`: pure, fail-closed simulated funding transition model, three stable rail identifiers, exact positive minor-unit display amount parser, no fake fees/authority.
- \`src/mini/MiniFundingPreview.tsx\`: user-facing three-option funding chooser, conspicuous SIMULATION ONLY badge, no quote claims, status changes, safety explanations and tucked-away testing controls.
- \`src/mini/MiniExperience.tsx\`: adds funding preview only from the explicit local draft review.
- \`src/mini/mini.css\`: compact style, readable labels and touch-safe controls for standalone and popup.
- \`tests/securepay-mini-phase4.test.mjs\`: eight targeted tests including every candidate rail, failed vs unknown, terminal confirmation, exact amount, no real authority, no main UI edits.
- \`scripts/securepay-mini-preview-checks.mjs\`: runs existing Phase 0–4 focused suites and TypeScript; \`vercel.json\` remains below Vercel's 256-character build command limit.

## Owner test plan (not a rigid example)

Start with one unfamiliar sale and an arbitrary positive price; use all three methods on the **same fictional reviewed draft**. Explore the failed and unknown branches. Return to the draft and modify the amount. Then repeat with a service or obligation, including a collection with no fixed amount (the simulator must request the missing amount, not invent it).

Evaluation questions:
- Can a first-time user find and switch among **all three**, and distinguish bank funding, mobile money and bank transfer?
- Is any customer misled into thinking a fake M-Pesa prompt, bank deposit, safeguarded balance, fee quote or settlement occurred?
- Does unknown status correctly block a second charge until the original outcome is reconciled?
- Does a tiny trade reveal the absence of a reliable quote rather than silently charging an invented KSh 20 or other amount?
- Does the three-method view stay compact, and is the owner-only testing control separate from the future customer experience?
- Is the existing main SecurePay masterpiece unchanged?

## Remaining gates / non-completion claims

- **Phase 3 live KS001:** Backend installation and model-backed response still not certified.
- **Phase 3 identity/Agreement:** No verified KS participant, invitation issuance or exact-version customer acceptance in Mini.
- **Phase 4 money:** No partner authority, bank/MSISDN collection, money account, safeguarding, provider reconciliation, quote, idempotent real intent or real settlement. No production rail activation.
- **General rollout:** Independent human tests and audits not completed. User-facing simulator requires separate owner confirmation. All demo behaviours are illustrative; **actual fees and rail eligibility MUST be server-derived**.
- **Financial release belongs to Phase 5**, under independent secure identity, delivery evidence, authenticated permissions and actual bank/PSP agreement.

**Gate:** Source/test build may be called READY only when exact commit checks and preview deployment pass. Full Phase 4 remains *sandbox UX delivered, live finance/Agreement authority NO-GO* until independent upstream conditions are verified.
