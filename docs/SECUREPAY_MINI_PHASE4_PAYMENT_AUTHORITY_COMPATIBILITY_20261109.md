# SecurePay Mini — Phase 4 Payment Authority Compatibility Gate

**9 November 2026 | Source-backed engineering decision | Owner roadmap preserved**

This is **not** a new checkout UI, payment gateway or provider certification. It is the
explicit prerequisite in the locked
`SECUREPAY_MINI_CHECKOUT_FIRST_MASTER_PLAN_20261109.md`: determine whether existing
Hosted Money Session `FUND` can serve as provider-backed checkout. It cannot be
treated as an equivalent funding call **in the source version inspected**.

## Source inspected

SecurePayAPI `main` (repository source, not a deployed production assertion):

1. `services/securepay-core/src/main/java/ke/securepay/core/moneysession/service/HostedMoneySessionService.java`
   - `createForSelf`/ `createForApplication` create time-limited capability
     scoped to an *existing* Agreement and monetary Obligation.
   - `resolve` is an authenticated read of the obligation and position.
   - `redeem` consumes the session token and branches on `OPEN|FUND|EXERCISE|RELEASE`.
   - Its `FUND` branch calls
     `orchestrationService.fund(agreementId,obligationId,amountMinorCap,idempotencyKey)`.
     **It does not call PaymentIntent `create` or `initiate`.**
   - Token consumption is idempotent at the session transition level, but is **not**
     evidence of bank/mobile-money collection.

2. `.../agreement/funding/AgreementFundedAuthorityOrchestrationService.java`
   - `fund` calls `fundedAuthorityPort.fundFromSelf(...)` after authenticated
     payer/Agreement/obligation authorisation and a financial environment guard.
   - This is an internal funded-authority/ledger action, not a provider instruction;
     the source documents production financial commands as blocked pending certification.
   - Same service also exposes `exercise` and `release`: never hand unrestricted
     hosted Money Session purposes to a public Pay/Book launcher.

3. `.../agreement/funding/ParticipantAgreementFundingOrchestrationService.java`
   - `createPaymentIntent` requires an exact current Agreement version, authorized
     payer, locked and version-bound READY quote and server-resolved source account.
     It creates a bound Payment Intent; it does not blindly accept browser money data.

4. `.../api/payment/controller/PaymentIntentController.java`
   - `initiate` is the distinct `PaymentInitiationService.initiate` provider path.
     Read-back and attempts have their own endpoints.
   - The Mini must show only API-supplied eligible rails and quote/fees, not its
     fictional Choice/M-Pesa/PesaLink simulation cards.

5. `.../api/payment/controller/ProviderCallbackController.java` and
   `.../payment/funding/ConfirmedPaymentFundingLedgerPostingService.java`
   - Accepted provider event + CONFIRMED Payment Intent lead to a distinct,
     deduplicated ledger posting to the payer's own identity account, subject to
     backend/provider/clearing-account conditions.
   - This **is not shown to automatically call `fundFromSelf` for an individual
     Agreement obligation**. A confirmed payer-account credit must not be mistaken
     for the separately funded obligation, protected custody, release or settlement.

6. `.../developer/money/DeveloperMoneySessionAuthorizationService.java`
   - A partner application may only create sessions for Agreements administered by
     its owning Business, with exact registered return URLs and an actual participant
     where one is named. Independent informal traders are **not** automatically
     covered by this authorization model; do not loosen it.

SecurepayLLM source:
- `src/api/securepay/payment-intent/index.ts` already exposes authenticated
  `fundingAuthority`, `fundingOptions`, `createVersionBoundQuote`,
  `createIntent`, `initiate`, `get`, `listAttempts`.
- `src/api/securepay/money-snapshot/index.ts` reads Agreement money status.
- `src/api/securepay/money-session/index.ts` has separate
  `create/resolve/redeem`. **Never alias `redeem(FUND)` to provider Pay.**

## Decision for the existing roadmap

**D1 — DO NOT use HostedMoneySession `FUND` redemption as the Pay, Book or
Deposit button's card/bank/M-Pesa collection step.**

**D2 — Use the existing provider-driven Payment Intent plus verified
provider/ledger status for an authenticated customer funding journey.**
Re-use Hosted Money Session *only* as a server-authorized opaque
Agreement/obligation context candidate, with its money-consequential purposes
unavailable to the Pay-button client until a reviewed, certified adapter
proves equivalence. There is no permission to invent or ship another checkout engine.

**D3 — Distinguish at least five events:**
`ORDER/BOOKING VALIDATED` ≠ `AGREEMENT ACCEPTED` ≠
`PROVIDER PAYMENT CONFIRMED` ≠ `AGREEMENT OBLIGATION FUNDED` ≠
`FULFILMENT OR RELEASE AUTHORIZED`.
Each must be independently true and version/actor/source-bound before the next
transition. A KSh 30,000 deposit *obligation* is not a paid deposit.

**D4 — Keep milestone and notification behaviour inside canonical Agreement
lifecycle, not inside a separate checkout project.** The Gate 5 illustrative
kitchen sample on draft PR #257 is a UX test case only. Its local workflow and
preview alerts are not an Agreement event store or delivery service.

## Next implementation gate (pending real backend)

Before calling Phase 4 production-ready, connect **one** authenticated
Store order and **one** authenticated ShortStays booking under the shared
checkout contract. The backend must prove:

1. Source-owned order/booking/version, seller and customer identity/role,
   stock/room hold, cancellation and expiry; no browser-authoritative prices.
2. A canonical Agreement and distinct monetary Obligation(s), exact-version
   participant consent and deposit/milestone schedule; no silent acceptance.
3. For each obligation: actual funding authority, valid backend rail options,
   quote of payer/platform/provider fees and quote expiry; identify who pays.
4. One idempotent Payment Intent and provider initiation per authorized action,
   with state-dependent retry/unknown/cancel semantics.
5. Accepted provider event, unique payer-ledger posting and **separate**
   obligation-funded authority evidence; reconcile rather than infer one from
   the other. Confirm whether a new minimal server-side transfer/adapter is
   needed; do not invoke legacy Hosted `FUND` at launch.
6. Server-owned next-action events on deposit due, funded, proof submitted,
   approval, dispute, release eligibility and retry; recipient permissions,
   deduplication, preference/quiet-hours gates and delivery audit.
7. Signed and replay-safe host notification OR authenticated read; never trust
   iframe close, browser success, SMS screenshot or simulated status.

## Verification / NO-GO boundaries

Focused *static source-contract* tests added on this branch preserve the
separation; these do not call a real API. When connectivity resumes, a backend
developer must run the actual Java/Gradle unit and Postgres integration tests,
including provider callback, ledger posting, Agreement money snapshot and
hosted-session access controls. SecurePayAPI PR #406 CI/startup and live Store
lookup 503 remain independent blockers.

**Current verdict:** architecture compatibility issue identified and the unsafe
`FUND` shortcut prohibited; **not** production or financial certification,
not a real funded transaction, not a demonstration of connected KS001.
No main UI redesign, no production merge and no partner-money activation.
