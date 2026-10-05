# SecurePay Money Completion Programme — Build 1 Completion Report

**Build:** M1 Money Home + M2 Rails & Funding Journey  
**Date:** 2026-10-05  
**Repository:** SecurepayLLM  
**PR:** #104  
**Head:** `535d3f830df3bfb608abdaad10d0f23c6be006ea`  
**Boundary:** UI composition only; no SecurePayAPI change.

## A. Files changed

- `src/features/money/SimpleMoneyDashboard.tsx`
- `tests/money-build1-m1-m2.test.mjs`
- `docs/MONEY_COMPLETION_BUILD1_REPORT.md`

The existing deeper Money record in `MoneyExperience.tsx` remains intact and is still available under **Full money record & controls**.

## B. UI surfaces changed

### Money Home / Agreement spine
- Agreements remain the first selection surface.
- Agreement cards show backend title, purpose, counterparty where available, status, amount and next action.
- The first backend-returned Agreement may open as the neutral landing selection; no financial priority is invented.
- The selected Agreement remains visually dominant through **What was agreed**, amount, terms and next step.

### Money at a glance
- Payment readiness remains sourced from `paymentReady`.
- Funding state remains sourced from Agreement Money positions.
- Release remains sourced from backend release-request authority.
- **Can money move?** remains sourced from movement preflight.
- Money responsibility is shown only when backend movement economics exposes `payerRole`.

### Agreement Money
Each established position now shows:
- authorised maximum;
- funded;
- progressed / exercised-or-settled;
- released / returned;
- remaining funded;
- masked beneficiary where the backend exposes it.

When `authorisedMaxAmountMinor` is known and positive, the UI may show a funding progress bar using that exact backend ceiling as its denominator. No percentage is shown when the denominator is unavailable.

### Rails & funding journey
A single mobile-safe sequence now explains:

**Agreement → Fund → Agreement Money → Settle**

The sequence exposes:
- M-PESA as funding / collection;
- PesaLink as bank-based Agreement funding;
- Agreement Money as Agreement-bound money;
- Choice Bank as bank/account infrastructure and authorised external-settlement rail where backend authority permits.

The UI states explicitly: **Visible does not mean executable.**

### Funding option details
Every backend-returned funding option now exposes:
- display name;
- currency;
- minimum amount when present;
- maximum amount when present;
- whether a backend Agreement-bound quote is available.

When `quoteAvailable=false`, the UI explicitly says SecurePay does not offer a quote step for that rail right now. It does not manufacture a quotation.

## C. Existing API endpoints / fields used

### Agreements
`GET /api/v1/me/agreements`
- title
- purpose
- counterparty
- status
- currency
- proposedAmountMinor
- nextActions
- attentionRequired

`GET /api/v1/agreements/{agreementId}/detail`
- overview
- current Agreement description/purpose
- terms / obligations
- milestones where already present in the detail contract

### Agreement Money snapshot
`GET /api/v1/agreements/{agreementId}/money-snapshot`
- positions
- paymentReady
- fundingOptions
- feeQuoteRequestsPermitted
- releaseRequest
- movement

### Agreement Money position fields
- authorisedMaxAmountMinor
- fundedTotalMinor
- exercisedOrSettledMinor
- releasedTotalMinor
- remainingFundedMinor
- closed
- beneficiaryMaskedKsNumber
- providerSettlementCertified

### Funding option fields
- railCode
- displayName
- currency
- minimumAmountMinor
- maximumAmountMinor
- quoteAvailable

### Movement fields
- state
- reasonCode
- authorityReasonCode
- amountMinor
- currency
- destinationClassification
- railCode
- evaluationId
- evaluationSequence
- economics.payerRole
- economics.recipientPrincipalMinor
- economics.securePayFeeMinor
- economics.providerRailChargeMinor
- economics.totalPayableMinor

### Regulated partner context
`GET /api/v1/regulated-accounts/partners`

Used only to describe whether Choice is a connected regulated bank partner when the current movement preflight has not selected `CHOICE_KS_ACCOUNT`. Partner presence never grants Agreement or settlement authority.

## D. What members can now see

A member opening Money can now see, without opening the deeper technical record:

1. which Agreement they are looking at;
2. what was agreed;
3. the Agreement amount and currency;
4. the counterparty where safely available;
5. the backend next action;
6. who the current movement economics identifies as the payer role, when available;
7. Payment Ready state;
8. funding state;
9. release-request authority;
10. whether the movement preflight says money can move;
11. authorised maximum, funded, progressed, returned and remaining funded per money position;
12. M-PESA, PesaLink and Choice Bank in their distinct roles;
13. which funding rails are actually returned for this Agreement;
14. funding limits and quote capability for returned rails;
15. authoritative movement charges when the backend exposes them;
16. the wider fair-trade finance categories: Banks, SACCOs, MMFs and Insurance.

## E. What members can now do

- choose an Agreement;
- move between their Agreements;
- understand the selected Agreement before looking at its money;
- inspect the current Agreement Money state;
- understand why a rail is visible but not necessarily available;
- see which returned funding routes are currently available to the Agreement;
- understand the role of M-PESA, PesaLink and Choice Bank;
- inspect funding limits and whether a quote path exists;
- open the existing **Full money record & controls** for deeper Money, FX, settlement, activity and partner detail.

Build 1 deliberately remains read-first. It does not add a new funding, release or settlement command.

## F. What deliberately remains unavailable

Not built in Build 1:
- new rail activation;
- frontend-created payer authority;
- frontend-created Payment Ready;
- frontend-created fees;
- generic wallet balance;
- cross-Agreement money aggregation redesign;
- Financial Partner marketplace;
- Financial Partner application/onboarding;
- loans / credit journeys;
- insurance claims;
- bank / SACCO price ranking;
- Community Saver in Money;
- full FX redesign;
- settlement-destination redesign;
- dispute/review redesign;
- new SecurePayAPI endpoints.

## G. Rail truth table

| Rail | Visible? | Current role | Availability source | Executable from Build 1? | Blocked / non-selected meaning |
|---|---|---|---|---|---|
| M-PESA | Yes | Funding / collection into an Agreement | `money-snapshot.fundingOptions` contains `MPESA_STK` | No new execution control added | If `MPESA_STK` is absent: not currently available for this Agreement |
| PesaLink | Yes | Bank-based funding into an Agreement where eligible | `money-snapshot.fundingOptions` contains `PESALINK` | No new execution control added | If `PESALINK` is absent: not currently available for this Agreement |
| Choice Bank | Yes | Bank/account infrastructure and authorised external settlement | Selected only when `money-snapshot.movement.railCode === CHOICE_KS_ACCOUNT`; partner connection context may come from regulated-partner read | No new settlement command added | Connected partner does not imply Agreement-level executability; if movement does not select Choice, it is architecture/context only |

## H. Test results

### Vision Money Gap Validation
- Vision Money Gap regressions: **5 / 5 passed**
- Phase 8 money doctrine: **42 / 42 passed**
- Money experience regressions: **30 / 30 passed**
- Full frontend regression: **1,725 / 1,725 passed**
- Typecheck: **PASS**
- ESLint errors-only: **PASS**
- Production build: **PASS**

### Final UI Convergence Certification
- Full frontend regression: **1,725 / 1,725 passed**
- Typecheck: **PASS**
- ESLint errors-only: **PASS**
- Production build: **PASS**

### Build 1 regression
`tests/money-build1-m1-m2.test.mjs` adds **11 Build-1-specific assertions**, included in the 1,725-test full regression.

**Failures: 0**

## I. Screens / states reviewed

Source-level responsive visual review completed for:
- Money landing with Agreements;
- selected unfunded Agreement;
- established / partially funded Agreement;
- Payment Ready blocked;
- Payment Ready satisfied;
- no eligible funding rails;
- M-PESA eligible;
- PesaLink eligible;
- Choice settlement selected by movement preflight;
- movement blocked;
- movement ready;
- mobile composition.

Responsive review:
- Agreement cards collapse naturally below desktop.
- The Agreement → Fund → Agreement Money → Settle flow becomes a vertical stack on small screens.
- Desktop-only horizontal arrows are hidden below `xl`, avoiding an unreadable horizontal rail diagram on mobile.
- Rail states use text as well as colour.

**Runtime browser screenshot review was not performed in this build session because no local/browser runtime is connected and the owner instruction explicitly prohibits deployment before approval.** A rendered production/preview visual check remains the first post-merge/deployment verification step.

## J. Regressions found and fixed

- PR #103 was inspected rather than copied wholesale.
- Its useful three-rail Agreement flow was retained conceptually.
- The Financial Partner directory / “Become a financial partner” expansion from PR #103 was intentionally not brought into Build 1 because that belongs mainly to later M6/M7.
- Rail availability is tied strictly to backend `fundingOptions`.
- Choice is not presented as an identical funding button beside M-PESA and PesaLink.
- Funding-option min/max/quote details were added so returned rails are useful rather than decorative.
- Agreement Money restored the missing authorised maximum and kept multi-position meaning intact.
- The partial-funding bar only appears when the backend supplies a valid authorised maximum.

## K. Remaining gaps for Build 2

Build 1 stops here. Do not automatically start M3/M4.

Candidate next-slice work must be separately approved. The known later work includes deeper payment execution / release presentation, richer Financial Partner capability journeys, and any broader financial-services experience explicitly assigned to later M3+ slices.

## Certification verdict

**BUILD 1 — CODE COMPLETE AND AUTOMATED CERTIFICATION GREEN.**

No SecurePayAPI incompatibility was discovered.

The one remaining evidence item before calling the experience visually production-verified is a rendered browser review after owner-approved merge/deployment.
