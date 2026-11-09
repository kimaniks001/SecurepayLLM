# SecurePay Mini — Phase 3 Engineering Closeout Audit
Date: 9 November 2026

## Executive determination

**Sandbox user journeys:** built in Gates 1–4, with separate Store and ShortStays preview pages and one Mini. Customer/owner acceptance of earlier Gates 2–3 has been given. Gate 4 owner acceptance still needs an independent screen test.

**Real transaction infrastructure:** NOT complete or certified. It is technically incorrect to call Phase 3 production-ready merely because fictional flows pass. No live collection, agreement confirmation, booking fulfilment or payment release is activated by this work.

## Source repositories and deliverables

- **SecurepayLLM:** Gat​es 1–4 on stacked draft PRs #249–#254, plus an isolated final `storeCheckout` authenticated API adapter on this branch. No new checkout engine or Store UI redesign. Existing `paymentIntent` gateway is reused as the *future* real provider path, NEVER called by a buying intention.
- **SecurePayAPI:** draft PR #406 `feat/mini-phase3-server-owned-store-order-intents-20261109` with a Flyway table, buyer-authenticated Store request POST/GET, server-owned published-offer price/version, idempotency and an authenticated source/amount/current-confirmations Agreement readiness read. All permissions to pay, accept an order, reserve stock or fulfil remain false.
- **ShortStays (`kenya-stay-stories`):** draft PR #18 with persisted booking/active exact hold client preflight and server handoff contract. The existing ShortStays client has mock default and disables live sandbox/production SecurePay network calls.

## Real Store request client contract

The secure API gateway `storeCheckout.createIntent` submits only:
`idempotencyKey`, `sellerKsNumber`, `offerId`, `quantity`, `expectedOfferUpdatedAt`.

SecurePayAPI derives authenticated buyer identity, active merchant, currently published offer, KES unit price and total. It persists `REQUESTED` only. The client checks no `orderAccepted`, `agreementAccepted`, `inventoryReserved`, `paymentEnabled`, `paymentVerified` or `mayFulfil` claim is true. Source mismatches and expired responses fail closed.

The read-only `storeCheckout.agreementReadiness(intentId,agreementId)` requires real source and both parties' **current** Agreement confirmations; it still cannot initiate payment or authorise fulfilment.

## Remaining critical certification / deployment dependencies

1. **Backend connectivity and build:** SecurePayAPI public Store lookup returned `503 STORE_API_UNAVAILABLE` from the owner preview. Backend PR #406 GitHub Actions returned **startup_failure before tests**. A developer must run its targeted Gradle unit tests, migration integration test and API staging smoke against authentic PostgreSQL. Do not interpret a missing CI job as a pass.
2. **Seller order acceptance and inventory:** The new persistent buyer request is not a seller-accepted order. A concurrent, durable stock hold/reservation and seller acceptance/decline workflow is still needed. Only the Store source may confirm its own inventory.
3. **Canonical Agreement binding:** The readiness endpoint compares a *pre-existing* Agreement, but does not automatically create one or persist a binding to the Store order. Existing Agreement creation/invitation/version confirmation authority must handle both participants. Content changes invalidate old versions. No user click in Mini may serve as legal acceptance.
4. **ShortStays room authority:** The current booking repository can hold mock/Supabase requests but does not supply a server-signed SecurePay checkout handoff. Server-side authenticated booking, atomic room hold, cancellation/expiry and signed single-use handoff with audience/nonce still need deployment.
5. **Provider funding:** Only the existing Agreement-bound Payment Intent, provider adapters, verified signed callbacks, persistent ledger and reconciliation may say a payment occurred. Current `HostedMoneySession FUND` must NOT be treated as proof of external collection. No gateway/STK live money in this Phase 3 preview.
6. **Return/reconciliation:** A host must perform authenticated server reads of actual order/Agreement/payment events and consume idempotent signed notifications. The sandbox checks two expiring fictional tokens and **does not** provide real provider verification, durable attempts or settlement.
7. **Owner acceptance and partners:** Gate 4 Store and ShortStays owner test still open. Real provider sandbox certification, identity/permission decisions, provider credentials, terms/cancellation and operational rollback have not been performed.

## Focused operator checklist (Paul / API owner / ShortStays owner)

- Do NOT merge stacked draft frontend PRs directly to `main` or deploy new API migrations to production.
- First check whether PR #406 compiles and tests on an isolated staging DB; if it does not, fix source/test mismatches without changing existing Agreement or financial logic.
- Restore the real `GET /api/v1/stores/{KS}/offers/{UUID}` and `GET /api/v1/stores/search` endpoints from the preview runtime and verify published offer/KS identity truth.
- Add seller acceptance/stock hold and booking-specific server authority as independent operations before introducing a Pay action. Validate idempotency, race, cancellation, expired hold, wrong buyer, wrong seller, changing price and closed listing.
- Create/bind real Agreements only via the existing participant-owned Agreement APIs. Demand an immutable current version and both genuine confirmations.
- Only then test a **regulated partner's sandbox** through existing Payment Intent and provider callbacks; compare provider event, ledger state and authenticated host read. Hold unknown statuses, prevent duplicate attempts and reject browser-supplied paid flags.
- Perform the full owner-approved one Mini path in Store and ShortStays (mobile and desktop) and require explicit owner acceptance. Maintain independent production rollback points.

## Verdict

**Phase 3 sandbox product development:** delivered as draft, subject to Gate 4 owner acceptance.
**Phase 3 production/financial certification:** **NO-GO**, blocked by unresolved external/backend integration and provider evidence.

This status is deliberately honest. A preview UI, source consistency check or simulated confirmation is not a banking, booking or legally executed trade.
