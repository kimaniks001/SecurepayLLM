# SecurePay Mini Checkout-First — Phase 2 Server Context

**Date:** 9 November 2026  
**Status:** Implemented **server-backed fictional owner-preview**; the original full SecurePay UI stays locked. **NOT a live checkout** and not real Store/ShortStays backend integration.  
**PR base:** Checkout-first Phase 1 `feat/mini-checkout-first-phase1-store-stays-20261109`. Do not merge into production without separate review.

## What Phase 2 changes from Phase 1

Phase 1 used hard-coded *client-side* fictional checkout records. This branch introduces a **preview-only Vercel server function** at `/api/mini-checkout-preview`. Both sample websites now follow the same path:

1. Customer clicks **Pay with SecurePay** or **Book / Pay with SecurePay**.
2. The **same** host launcher `public/checkout-demo-server-host.js` posts only `{"source":"STORE"}` or `{"source":"SHORTSTAYS"}` to the preview server; it **does not submit a merchant, price, total, bank account, or booking status**.
3. The function looks up its own two immutable fictional order/booking snapshots, and issues an AES-256-GCM authenticated-encrypted reference bound to the exact deployment origin, source version and five-minute expiry. A random 128-bit nonce and IV prevent predictable repeated references. Browser cannot alter the record or extend expiry.
4. The host opens the existing **SecurePay Mini**, with `checkoutSession` (a short-lived *test-only* reference) instead of `demoCheckout`.
5. Mini calls `GET /api/mini-checkout-preview?session=...` with no cookies. A bad signature, wrong host/origin, changed version or expiry yields a safe error. The server returns only public fictional details.
6. The **same** `MiniHostedCheckoutDemo`, `MiniFundingPreview`, optional KS001 and three test rails are reused. The user completes the **fictional** journey without forced chat or manual testing controls. Return to the original Store/ShortStays is a same-origin **test-only** message, never a payment callback.
7. On expiry, Mini refuses to continue and clearly asks the user to return to their website and restart. On popup close/reopen within five minutes, the same local preview frame can resume. There is no real charged money.

The previous Phase 1 `demoCheckout` route and its tests remain available for regression; the actual two owner-host Pay buttons now use **only server reference mode**, and cannot automatically fall back to client-entered prices.

## Critical constraints: what Phase 2 is NOT

- **Server-controlled fictional fixtures do not mean live merchant orders.** There is no actual Digital Store inventory reservation, independent merchant's signature, real ShortStays calendar/room hold, cancellation eligibility or customer identity verification.
- No agreement has been accepted. The preview function has **no calls to SecurePayAPI**, Hosted Money Sessions, Payment Intents, provider quote/adapters, escrow, PSP, bank, STK, wallet, ledger, webhook, refund, release or settlement.
- The three selectable methods **Choice Bank, M-Pesa and PesaLink remain simulated**. Real available rails must be sourced from SecurePayAPI and partner eligibility after agreement acceptance.
- Neither a signed/opaque preview reference nor an iframe return is **financial authority**. AES-GCM helps test reference integrity in this isolated demo only. There is **no durable one-time token consumption, hold ledger, account authorisation or replay prevention for real money**.
- An existing Hosted Money Session `FUND` operation calls `AgreementFundedAuthorityOrchestrationService.fund` → `fundedAuthorityPort.fundFromSelf`, while real provider collection uses Payment Intent `initiate`. No proof they are equivalent. Do NOT connect them without an audited integration contract.
- `allow-scripts allow-same-origin` in the owner host is **not a production untrusted third-party iframe boundary**. All real Store/ShortStays partner embeddings will use a distinct SecurePay-controlled origin, exact merchant installation, CSP and a provider-safe SDK.

## Fail-closed preview runtime and secret policy

The server function is gated by **all** of:
- Vercel runtime `VERCEL_ENV=preview` (production and development deny),
- exact `VERCEL_GIT_COMMIT_REF=feat/mini-checkout-phase2-server-context-20261109`,
- `VERCEL_URL` matching an immutable `*.vercel.app` hostname,
- a strong `MINI_CHECKOUT_PREVIEW_SECRET` stored as an **encrypted Preview environment variable, scoped only to this Git branch** (not in browser, GitHub or production),
- request `Host` matching that deployment and optional browser `Origin` matching the same origin.

The server returns a `503 PREVIEW_NOT_CONFIGURED` when any required runtime setting is missing; browser displays a safe unavailable state. It denies cross-origin POST and sends no permissive CORS header. Error responses do not echo tokens. Expiring encrypted references cannot be minted on production.

The branch-scoped Preview environment variable has been provisioned without exposing it to client bundles. A **new preview deployment after provisioning** is required to confirm it is available at runtime. Do not copy the secret to live environments.

## Source touched

- `api/mini-checkout-preview.js`: preview-only server-owned snapshots, signed and encrypted five-minute reference issue/resolve, strict runtime gating, host/origin checks, status and no-store headers.
- `public/checkout-demo-server-host.js`: shared responsive Pay/Book launcher, same-origin POST, safe close/resume, strict test event validation.
- `checkout-demo-store.html`, `checkout-demo-shortstays.html`: switch to server-backed launcher.
- `src/mini/checkoutServerClient.ts`: validate response before allowing any display, fail closed if invalid.
- `src/mini/MiniServerCheckout.tsx`: fetch exact reference and render same Mini or clear error.
- `src/mini/MiniExperience.tsx`: additive `checkoutSession` route; preserved standalone Ask KS001 and prior demonstration.
- `src/mini/MiniHostedCheckoutDemo.tsx`: session expiry and safe host return; preserves compact checkout.
- `tests/securepay-mini-checkout-phase2.test.mjs`: focused positive/negative tests for host/source, origin, tamper, session expiry, no real-money authority and source display.
- `scripts/securepay-mini-preview-checks.mjs`: enforces Phase 2 suite plus prior cohort and Mini checks during Vercel preview build.
- Existing three-panel main SecurePay interface and SecurePayAPI **unchanged**.

## Owner acceptance path

**One test Store Pay button; one ShortStays Book/Pay button**:
- No instruction from an assistant. Click Pay/Book; see correct order/stay and amount that came from the preview server; choose Choice Bank, M-Pesa or PesaLink; see the **simulated** result; return to the same website. Ask KS001 is optional.
- Press close/reopen mid-test; state must remain consistent or show a safe expired message.
- Try an invalid `checkoutSession` URL; must show unavailable/expired, never guess a transaction or render old source as a fallback.
- Browser must never claim **Paid, Booking Confirmed, Payment Ready, Funded, Released or Settled** from this test.

### Automated evidence versus still-open evidence

The new focused Phase 2 tests validate protocol and runtime server function **in process**, with injected ephemeral test keys; they are NOT a real provider integration nor a production-grade application security audit. The Vercel build verifies code/typechecking and compiles both host and Mini pages. Owner uncoached browser testing and real server route availability require separate confirmation, including the preview protection/login boundary.

## Real Phase 3 prerequisites (not claimed done)

1. Implement authoritative Store order/ShortStays booking hold in the actual host backend with stock/date/version and authenticated merchants.
2. Bind that host record to one canonical SecurePay Agreement/obligation, with verified participants and acceptance.
3. Reconcile existing Hosted Money Session permission to genuine provider-driven Payment Intent collection (idempotent quote, provider events and safe ledger state) rather than creating another funding engine.
4. Introduce exact host installation ownership and a **separately hosted SecurePay iframe** for external websites, signed server events and idempotent host status reads.
5. Certify each actually available Choice/M-Pesa/PesaLink partner rail and economic fees before enabling it, alongside independent release/refund policies.

**Gate:** Phase 2 owner-preview code is ready for synthetic testing when deployment is READY, but **real checkout authority and ShortStays booking confirmation remain NO-GO**.
