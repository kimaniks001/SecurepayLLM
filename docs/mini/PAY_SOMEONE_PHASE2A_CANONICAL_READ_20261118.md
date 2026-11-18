# SecurePay Mini — Pay Someone / Phase 2A: canonical read-only payment evidence
18 November 2026 · Stacked draft; no live Money; not a completed Phase 2.

## Engineering decision
The existing SecurePayAPI provides:
- owner-scoped `GET /api/v1/me/agreements` with current version, attention, deadlines and server next actions;
- owner-authorised Agreement detail `GET /api/v1/agreements/{agreementId}/detail`;
- authorised, version-bound read-only Money snapshot `GET /api/v1/agreements/{agreementId}/money-snapshot` and historical intents via existing gateway.

The existing `AgreementMoneySummaryService` explicitly says that aggregate funded data **cannot distinguish the caller's own money, money due to them or Business-authorised money**. Therefore a proper "you owe KSh X" total or list of independently payable obligations **does not yet exist in the API contract**. Neither `proposedAmountMinor` nor recorded funded positions may be presented as debt or as an eligible payment.

## What this slice implements
1. The Mini Pay doorway opens the first-party authenticated owner Agreement list with `paymentFocus`, not a sample list.
2. Pay mode shows exact server-owned Agreement title/status, attention reason, and next Agreement deadline with an explicit warning: not necessarily a payment due date.
3. Opening an Agreement rechecks the exact current version before showing terms. Version changes fail closed.
4. Within that Agreement the Money panel reads existing server positions, payment-ready state and payment-attempt history, with independent verification. No browser-calculated debt; no claim that a funded position is an unpaid balance.
5. **Pay mode unconditionally disables fee-quote POST and payment submission** even if separate staging flags are enabled. Read-only GET operations remain subject to SecurePay API authorisation and can fail unavailable.
6. Back returns to the Mini payment home. Unrelated Buy/Sell/KS001/Business UI remains unchanged.
7. Tests added to `tests/mini-pay-phase2a-canonical-read.test.mjs` and normal prebuild.

## Missing before Phase 2 completion
Backend-owned, caller-authorised *payer obligation* projection (not aggregated Agreement Money). Each row must be separately justified by:
- Agreement ID + exact accepted version, stage/period/obligation ID; the actor's paying capacity, responsible party, verified payee, beneficiary and current recipient consent;
- authoritative amount due, currency, provider funding/reconciliation credits and genuinely outstanding amount, independently from funded escrow balance;
- due window vs permitted early payment, verified completion / counterparty acknowledgement requirements, dispute/stale/cancel states;
- no Business/personal mixing, no unauthorised disclosure, no cross-currency grand total, no silent auto-payment;
- bounded paging and proper concurrent version/identity revocation handling.

These facts require separate SecurePayAPI implementation plus database/domain/regulatory review. Inventing `/payables` now or calculating the answer in React would violate SecurePay doctrine.

## Gate
This is **Phase 2A complete as a frontend engineering draft**, **Phase 2 overall still in progress**, **not certified or merged**. Funding/Money is deferred. Java 21 + PostgreSQL/Flyway + concurrency, provider certification and the 20-person acceptance group remain necessary before any real payment capability.
