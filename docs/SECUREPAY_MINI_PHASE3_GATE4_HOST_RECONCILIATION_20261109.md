# SecurePay Mini — Phase 3 Gate 4
## Independent host read-back and simulated reconciliation

**Date:** 9 November 2026
**Scope:** Isolated, fictional owner preview. The Gate 2 sample order/terms flow and Gate 3 rail picker remain inside one compact Mini, with KS001 optional. The full SecurePay three-panel workspace is unchanged.

## What changed

1. New `/checkout-gate4-store.html` and `/checkout-gate4-shortstays.html` share `/public/checkout-gate4-host.js`, loading the same Mini with `/mini.html?sandboxReconcile=<signed-Gate2-checkout>`.
2. The host starts a fictional checkout using the existing server-controlled `api/mini-gate2-sandbox.js`; it preserves the opaque checkout reference in browser-tab sessionStorage only for refresh/reopen (no new checkout after reload).
3. Mini reviews **sample, unsigned** transaction terms, then opens the existing compact three-rail simulator. `MiniGate3Funding` sends the parent only an **opaque simulated attempt reference**. It sends no payment result for host authority. The parent only accepts exact same-origin and same-iframe messages with correct fixture, gate number and explicit `simulated:true`, `orderCreated:false`, `agreementAccepted:false`.
4. The host independently requests `GET /api/mini-gate4-return?checkout=...&attempt=...`. The server decrypts both tokens using separate Preview-only secrets and checks: exact deployment origin, same order ID, source, version, immutable fixture digest and amount. A mismatched, altered, expired or cross-order attempt yields a safe error. No browser-supplied `PAID` state is accepted.
5. The host displays the server-derived **fictional** status only: no attempt, pending, unknown, simulated failed or simulated confirmed. All visibly say **NOT PAID**. The simulated confirmation expressly means **no genuine provider funds, signed agreement, stock reservation or room booking**.
6. Customers can close Mini, reload the same page and use **Check original test attempt** to reconcile. While Mini is open, the host periodically refreshes from its server. A return event only closes the UI and triggers that read; it is not a paid callback.
7. An optional test scenario shows `UNKNOWN_THEN_CONFIRMED` or `UNKNOWN_THEN_FAILED`. The mock server first returns PENDING, then UNKNOWN, then—after 15 seconds total—derives the eventual **simulated** result from a signed token and its clock. No frontend timer fabricates confirmation, no unknown attempt is automatically retried, and the original attempt ID stays constant.
8. The original Gate 2, Gate 3 and Phase 2 checkout sample pages remain accessible from the owner page. The independent read-only public Store-offer route continues to fail closed if the upstream SecurePayAPI is unavailable; it never silently substitutes fictional products.

## Technical implementation

- `api/mini-gate4-return.js`: read-only, GET-only, Preview-exact-branch server function; cross-token consistency and no real-money output.
- `api/mini-gate3-sandbox.js`: two added delayed-reconciliation scenarios accessible **only in Gate 4**; still stateless and wholly fictional.
- `api/mini-gate2-sandbox.js`: exact Gate 4 branch permitted to reuse the prior sample agreement review.
- `src/mini/MiniGate3Funding.tsx`: optional reconciliation scenario picker, encrypted attempt reference notification and server polling while UNKNOWN.
- `src/mini/MiniGate2Sandbox.tsx`: Gate 4 return signal contains **no result**; retains previous Gate 2/3 paths.
- `public/checkout-gate4-host.js`: independent server GET, safe host status, session restore/reopen and strict origin/iframe checks.
- `tests/securepay-mini-phase3-gate4.test.mjs`: ten focused scenarios—preview gates, Store/ShortStays source match, cross-order swap, unknown delayed outcome, expiry/tamper, no fake money status, preserved UI, host-only GET and **executing both host interactions and refresh**.
- Vercel Preview branch `feat/mini-phase3-gate4-verified-return-20261109`; encrypted `MINI_GATE2_SANDBOX_SECRET`, `MINI_GATE3_SANDBOX_SECRET`, and previous demo/read-only source secrets are scoped exclusively to this branch's preview. Production was not changed.

## Meaning of verification

A **server-matched fictional attempt** is not a financial reconciliation. There is NO durable Order/Agreement record, authenticated buyer/seller acceptance, real payment receipt, provider callbacks, partner idempotency, bank transfer, STK, ledger, protected escrow or signed event stream.

The simulated values are intentionally explicit:
`simulationOnly:true`, `realPaymentVerified:false`, `providerVerified:false`, `acceptedAgreement:false`, `orderCreated:false`, `bookingConfirmed:false`, `inventoryReserved:false`, `accommodationHeld:false`, `moneyMoved:false`, `mayFulfil:false`, `paymentReceipt:null`.

The sandbox uses stateless, expiring authenticated-encrypted references. They may be replayed until expiry. The host-GET design validates **consistency of fictional order/attempt information**, not real payment confirmation. Never transfer its token or status code to production money logic.

For production: use SecurePayAPI's canonical persistent StoreOrder/ShortStays reservation records and accepted Agreement version. Use the existing Payment Intent authority, signed provider events and persisted reconciliation/ledger state. The actual host must query authenticated authoritative backend state, with idempotent webhook handling, unknown-state safeguards, escrow separation and proper permission to fulfil. A browser postMessage can only request navigation/refresh, never assert PAID. The existing HostedMoneySession `FUND` path is not independently certified as external provider collection.

## Acceptance and release gate

The code and focused tests must be green before an owner Preview is offered. Owner should perform both Store and ShortStays journeys, choose the optional **Other test outcomes → Unknown → reconciled confirmation**, close and reopen, then check that the original test ID stays the same and host remains NOT PAID. Try the failure scenario too.

**Gate 4 development may be owner-approved for sandbox UX, but Phase 3 live integration and payment certification remain NO-GO until real SecurePayAPI/partner contracts are implemented and tested.** No production release or merging into `main`.
