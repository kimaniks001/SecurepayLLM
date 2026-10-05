# SecurePay Money Completion Programme — Build 2 Completion Report

**Build:** M3 Charges & Payment Journey + M4 Settlement & Destination Safety  
**Date:** 2026-10-05  
**Repository:** SecurepayLLM  
**PR:** #105  
**Certified code head:** `943e8e01469e7701cd4da483494c13cc41c8e128`  
**Boundary:** SecurepayLLM/UI only. No SecurePayAPI change.

## A. Files changed

- `src/features/money/MoneyPaymentSettlementJourney.tsx` — new Agreement-bound funding/payment/settlement workspace.
- `src/features/money/SimpleMoneyDashboard.tsx` — integrates Build 2 into the selected Agreement Money home and refreshes Agreement Money after confirmed funding.
- `src/features/money/MoneyExperience.tsx` — supplies the existing payment-intent, settlement-destination and payment-release gateways.
- `src/features/money/settlementDestination.ts` — carries customer-supplied destination purpose through the existing self-service register/replace contract.
- `tests/money-build2-m3-m4.test.mjs` — Build 2 safety and journey regressions.
- `docs/MONEY_COMPLETION_BUILD2_REPORT.md` — this completion record.

No SecurePayAPI files were changed.

## B. UI surfaces changed

Build 2 stays inside the selected Agreement workspace.

### Agreement Guide
A **Where we are / Next** surface now translates the existing backend state into an Agreement-bound stage:
- Agreement conditions in progress;
- Ready for funding;
- Payment prepared / starting / provider processing / confirmation pending;
- Funding confirmed;
- Release available;
- settlement instruction / processing / exception;
- Settled only when authoritative settlement completion evidence exists.

### Funding this Agreement
Returned funding rails are shown inside the Agreement, not as a detached checkout. Quote-capable rails can prepare a version-bound quote. Non-quote rails never get a fabricated quote action.

### Payment journey
The UI distinguishes the full Payment Intent lifecycle and exposes provider/customer action only from existing provider instructions.

### Where your money will go
The selected Agreement currency scopes destination reads. The member sees only backend-safe destination display, beneficiary, status, verification, cooling-off protection and read-only history.

### Release & settlement
Release authority, release instruction, provider/settlement state and settled completion are visibly separate.

## C. API contracts used

### Agreement
- `CurrentUserAgreementSummaryResponse`
- `AgreementDetailResponse`
- `currentAgreementVersionId` / current detail version
- Agreement next actions

### Funding / quote / payment
- `AgreementFundingOptionResponse`
- `AgreementFundingQuoteResponse`
- `AgreementPaymentIntentCreateResponse`
- `AgreementPaymentIntentSummaryResponse`
- `PaymentIntentResponse`
- `PaymentAttemptResponse`
- `InitiatePaymentResponse`

Existing gateway calls:
- Agreement funding options
- version-bound funding quote
- Agreement-bound Payment Intent creation
- Payment Intent list/read
- Payment attempt list
- Payment Intent initiation

### Money
- `AgreementMoneySnapshotResponse`
- backend movement economics
- Payment Ready
- funding options
- Agreement Money positions

### Settlement destination
- `SettlementDestinationResponse`
- `SettlementVerificationStatusResponse`
- `RegisterMySettlementDestinationRequest`
- current destination
- destination history
- verification status
- register / replace

### Release / settlement
- `ReleaseAuthorityResponse`
- `ReleaseInstructionResponse`
- `ReleaseSettlementStatusResponse`
- `ReleaseExceptionResponse`

## D. Charges / quote experience completed

Before a quote-capable funding action proceeds, the member can review:
- Agreement principal — backend quote `amountMinor`;
- SecurePay charge — backend `platformChargeMinor`;
- rail/provider charge — backend `providerChargeMinor`, with **Not confirmed** when null;
- total payable — backend `totalChargeMinor`, with **Not confirmed** when null;
- payer role — backend `payerRole`;
- SecurePay fee bearer — backend `feeBearer`;
- rail charge bearer — backend `railChargeBearer`;
- quote expiry;
- pricing version and economic state under details.

The current funding quote response has no separate `taxMinor` field. Build 2 therefore does not invent tax or borrow a tax value from a different movement context. It states that tax is not separately provided by that funding quote. Existing movement economics elsewhere in Money may show tax when its own authoritative contract supplies it.

Quotes use `createVersionBoundQuote`. Before creating an intent, the UI re-reads Agreement detail and compares the live Agreement version with the version that was quoted. A changed Agreement blocks continuation and requires refreshed payment details.

`quoteAvailable=false` never calls a quote endpoint.

## E. Payment state journey completed

The UI has distinct human states for:
- CREATED;
- INITIATION_PENDING;
- ACTION_REQUIRED;
- PROVIDER_PENDING;
- CONFIRMATION_PENDING;
- CONFIRMED;
- FAILED;
- EXPIRED;
- CANCELLED.

PROVIDER_PENDING and CONFIRMATION_PENDING explicitly warn the member not to make another payment yet.

Provider instructions are bounded:
- `STK_PUSH` → **Check your phone**;
- HTTPS redirect → **Continue with provider**;
- generic ACTION_REQUIRED → provider action required.

Raw `clientInstructionMetadata` is not dumped or interpreted as financial authority.

Consequential create/initiate requests use stable in-memory idempotency attempt stores. A timeout/network/5xx is treated as uncertain, not failed. The same unresolved request reuses the same logical request key.

Terminal retry guidance requires a fresh funding attempt and fresh current quote; the UI never re-initiates the old terminal Payment Intent.

A confirmed Payment Intent is described as Agreement funding — **[amount] has been funded into [Agreement]** — and triggers a refresh of Agreement Money.

Payment details provide backend attempt number, provider identifier, initiation status, timestamps and provider reference under details.

## F. Settlement destination experience completed

For the selected Agreement currency the UI can:
- read the current destination;
- show masked destination only;
- show backend-returned beneficiary name;
- show destination status;
- show verification status;
- request detailed verification status;
- show provider verification reference under evidence/details;
- register a destination;
- replace a destination;
- accept BANK or MOBILE_MONEY customer input;
- accept customer destination purpose;
- show cooling-off protection;
- show destination history as read-only evidence.

The member is never asked for internal mapping IDs, identity IDs, destination fingerprints or provider tokens.

### Contract honesty
The current `SettlementDestinationResponse` does **not** expose saved account kind/destination type. Build 2 therefore does not infer BANK versus MOBILE_MONEY after reload. The register/replace request can accept those customer facts, while the current destination display stays masked and backend-authoritative.

## G. Settlement state journey completed

The release area separates:

1. **Release authority** — whether the current evaluated scope permits release.
2. **Settlement instruction** — whether a current-version instruction exists.
3. **Provider / settlement state** — the backend settlement phase / exception.
4. **Settled** — rendered only when `settledAt` exists.

Even a backend `settlementPhase === 'SETTLED'` without `settledAt` is deliberately shown as provider processing rather than customer-facing Settled.

Settlement exceptions use backend `customerSafeReason` and the existing customer-safe `requiredActionWords` translation. No remedy is invented.

Successful settlement shows the Agreement, masked authorised destination and authoritative settlement time.

### Contract honesty
The current `ReleaseSettlementStatusResponse` does not expose settlement amount, settlement currency or settlement rail. Build 2 does not extend the TypeScript response with imaginary optional fields and does not borrow those facts from another context. The Money record explicitly says it will not invent them.

## H. Safety cases verified

- Unknown remains unknown.
- Pending remains pending.
- Timeout / network / 5xx is uncertain, never auto-failure.
- Fees are backend-derived.
- Null provider charge is not rendered as zero.
- Fee bearers are backend-derived.
- Quote expiry blocks continuation.
- Agreement/version mismatch blocks quote reuse.
- `quoteAvailable=false` cannot create a fake quote.
- Pending provider states cannot render success/failure.
- Terminal intent retry does not re-initiate the old intent.
- Confirmed funding refreshes Agreement Money.
- Destination display stays masked.
- Verification is never inferred from user entry.
- Destination replacement preserves exact-request retry and cooling-off.
- Destination history is not an old-destination activation surface.
- Release authority is not settlement.
- Instruction is not settlement.
- Settlement exception text comes from safe backend evidence.
- Only authoritative `settledAt` renders **Settled**.
- Build 2 contains no Community Saver, Financial Partner marketplace/ranking, loan or insurance-claim flow.

## I. Mobile / desktop screens reviewed

Source-level responsive composition was reviewed for the required Build 2 states:
- funding route available / absent;
- quote ready / blocked / expired / stale;
- payment action required;
- provider pending;
- confirmation pending;
- confirmed / failed / expired / retry eligible;
- no destination;
- verified / pending verification presentation;
- replacement + cooling-off;
- destination history;
- release unavailable / authorised;
- settlement processing / exception / settled.

The workspace uses stacked mobile composition and expands to a two-column funding/settlement layout at `xl`. Primary form controls and action buttons use 44px-class minimum heights where applicable. Status always has text, not colour alone.

A rendered browser screenshot review was **not** performed because this build is intentionally not deployed before owner approval and no connected local browser runtime is available. Runtime visual proof is therefore a post-merge/deployment verification item, not fabricated evidence.

## J. Exact CI / test results

Certified head: `943e8e01469e7701cd4da483494c13cc41c8e128`

### Vision Money Gap Validation — PASS
- Vision Money Gap regressions: **5 / 5 passed**
- Phase 8 Money doctrine: **42 / 42 passed**
- Money experience regressions: **30 / 30 passed**
- Full frontend regression: **1,749 / 1,749 passed**
- Typecheck: **PASS**
- ESLint errors-only: **PASS**
- Production build: **PASS**

### Final UI Convergence Certification — PASS
- Full frontend regression: **1,749 / 1,749 passed**
- Typecheck: **PASS**
- ESLint errors-only: **PASS**
- Production build: **PASS**

### Build 2 targeted regression
- `tests/money-build2-m3-m4.test.mjs`: **24 Build-2-specific tests**
- All are included in the 1,749-test full regression.
- Failures: **0**

## K. Regressions / contract issues found and fixed

1. An early Build 2 draft had added optional `destinationType` to `SettlementDestinationResponse`, but SecurePayAPI does not return that field. Removed.
2. An early draft had added optional settlement `amountMinor`, `currency` and `railCode` to `ReleaseSettlementStatusResponse`, but SecurePayAPI does not return them. Removed.
3. Settlement success presentation was corrected to avoid inventing amount/rail from unsupported response fields.
4. Settlement exception required action now passes through the existing customer-safe translator.
5. Confirmed payment copy now describes funding into the Agreement rather than generic “payment success.”
6. New regression tests prevent those frontend/API-contract drifts from returning.

No SecurePayAPI incompatibility requiring a code change was found.

## L. Remaining gaps for Build 3

Build 3 has **not** been started.

Retained, explicit limits:
- The funding quote response has no separate tax field, so a funding quote cannot show a separately authoritative tax line beyond saying it is not separately provided.
- The settlement destination read does not return saved BANK/MOBILE_MONEY kind, so Build 2 cannot label the existing masked destination type after reload without an API contract change.
- The settlement-status read does not return amount/currency/rail, so settled evidence cannot safely display those values from that response.
- Current Agreement funding discovery only returns routes that the backend considers executable under its economics contract. In particular, M-PESA remains visible in the Money architecture but no quote or executable funding action is fabricated when the backend does not return it.
- Full rendered browser verification remains to be done after an owner-approved merge/deployment.

## Certification verdict

**BUILD 2 — CODE COMPLETE; AUTOMATED CERTIFICATION GREEN; RUNTIME VISUAL VERIFICATION PENDING DEPLOYMENT.**

No merge or deployment has been performed.
