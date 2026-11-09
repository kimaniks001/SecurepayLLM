# SecurePay Mini — Phase 3 Gate 3
## Checkout and server-simulated payment states

**Date:** 9 November 2026
**Status:** Owner-preview development, **NOT REAL PAYMENT READINESS**.

### User experience

**Digital Store or ShortStays → Pay/Book → same Mini → sample order/terms review → choose Choice Bank/M-Pesa/PesaLink → server-simulated attempt → pending/confirmed/failed/unknown → return.** Ask KS001 remains optional. The accepted Gate 2 order/terms review and the main SecurePay three-panel masterpiece are unchanged.

The two new Gate 3 owner pages are `/checkout-gate3-store.html` and `/checkout-gate3-shortstays.html`. Both use the same `/public/checkout-gate3-host.js`, and the existing Mini is routed using `/mini.html?sandboxPayment=` to the Gate 2 reviewed order and the new Gate 3 payment-status component.

### Technical flow

1. **Sample context:** `api/mini-gate2-sandbox.js` still creates a server-defined fictitious order/booking and unsigned example agreement. The owner reviews terms, resulting in a signed mock `TERMS_REVIEWED` session. This does **not** constitute legal acceptance, an invitation to pay, stock reservation, or verified identity.
2. **Start mock attempt:** `POST /api/mini-gate3-sandbox` accepts **only** `{action:"START_SIMULATED_ATTEMPT",reviewSession,rail,scenario}`. Its server validates the encrypted reviewed mock terms against the original order and amount, checks one of three fixed simulated rail names and one of four explicit test scenarios, and issues a **new** encrypted attempt claim. No price, seller, fee, beneficiary, settlement account or payment authority is accepted from the browser.
3. **Server-derived status:** `GET /api/mini-gate3-sandbox?attempt=` decrypts and authenticates the reference, confirms version, amount, order ID, source fingerprint and deployment origin. From the signed test scenario and server clock, it derives `SIMULATED_PENDING`, `SIMULATED_CONFIRMED`, `SIMULATED_FAILED` or `SIMULATED_UNKNOWN`. **No browser timer sets provider status**. The default test simulates confirmation after roughly 2.5s; the Mini makes bounded periodic GET requests. This is a fictional provider result, NOT real payment confirmation.
4. **Other scenarios:** A collapsed **Other test outcomes** control lets the owner test failure, unknown or delayed pending before starting. It does not interrupt the normal one-tool journey. Unknown stays unresolved and the UI offers **Check original attempt**, not another payment attempt or a silent success. Failure may begin a new **fictional** attempt. A slow scenario stays pending ~30s then returns a *fictional* confirmation.
5. **Resume:** The browser tab stores the preview-only signed reviewed-terms token and simulated attempt reference in `sessionStorage` solely to resume a sample journey after iframe reload. On reuse Mini validates the reviewed agreement against the original order ID/version/amount **with the server**, then retrieves the existing attempt status. Storage is not authorisation for anything live; tokens expire. The original Gate 2 sample pages remain intact.
6. **Host status:** The single Mini sends same-origin, exact-iframe `SECUREPAY_MINI_SANDBOX_PROGRESS_V1` and `SECUREPAY_MINI_OWNER_DEMO_RETURN_V1` for display only. The host refuses fake source, wrong fixture or any `agreementAccepted:true` or `orderCreated:true`. Host labels always **NOT PAID**, even if the scenario says simulated confirmation. These messages **must never** be used as proof of funds, order fulfilment or booking confirmation.

### Security and engineering constraints

- Vercel Preview on **exact branch** `feat/mini-phase3-gate3-sandbox-payment-status-20261109`, with encrypted, branch-scoped `MINI_GATE2_SANDBOX_SECRET` and `MINI_GATE3_SANDBOX_SECRET`, no client secret, no production keys, no live rail activation.
- All responses are no-store/no-referrer/noindex and bounded. Wrong host/origin, tampered or expired tokens, unreviewed terms, unsupported rails/scenarios or any browser-supplied amount/beneficiary/action `FUND` / `RELEASE` fail closed.
- Every server outcome explicitly declares `simulationOnly:true`, `paymentInitiated:false`, `paymentEnabled:false`, `realProviderEvent:false`, `financialAuthority:false`, `agreementAccepted:false`, `orderCreated:false`, `inventoryReserved:false`, `accommodationHeld:false` and `paymentReference:null`.
- **No payment intent, bank API, STK request, PSP, ledger, escrow, wallet, fiat deposit, refund, release or settlement.** No API write or deployment to SecurePayAPI.
- This simulation is **stateless**; the server decrypts tokens and derives outcomes from the clock. There is no durable idempotency key, database record, real provider callback signature, reconciliation, event ordering or cross-device synchronisation. A malicious user with access to the mock can start multiple fictional attempts. The UI prevents accidental duplicates, but **this design MUST NOT be promoted as a production payment-state engine**.
- The current real Store offer API still cannot be verified from the Vercel source lookup (previously 503). This simulator never fabricates a real listing when upstream fails.

### Test boundaries and next Gate

`tests/securepay-mini-phase3-gate3.test.mjs` validates the preview gate, required Gate 2 review, server-derived timing for all outcomes, expiry/tamper, rejection of forged authorisation, no real payment claims, same Mini/host status, and preservation of accepted Gate 2 pages. All prior focused suites and TypeScript/Vite remain in the preview build checks.

The owner must independently verify both complete Gate 3 journeys, especially **unknown status → no automatic retry** and **close/reopen → same attempt**. Live financial readiness remains **NO-GO**.

**Gate 4:** signed/idempotent host return and verified backend reads once SecurePayAPI and actual StoreOrder/ShortStays booking authority are implemented, followed by real provider sandbox certification. Do not use UI `postMessage` as payment proof.
