# SecurePay Mini — Phase 3 Gate 2
## Sandbox Order → Sample Agreement → Payment Simulation

**Date:** 9 November 2026
**Owner requirement:** One compact Mini completes Store or ShortStays checkout unaided. Ask KS001 is optional. Preserve the three-panel full SecurePay UI. Build through simulation while SecurePayAPI is unavailable. **No live money.**

### What was implemented

Separate Gate 2 owner experiences:
- `checkout-gate2-store.html`
- `checkout-gate2-shortstays.html`

Both use the **same** `public/checkout-gate2-host.js` and the **same** `mini.html` route with `sandboxAgreement=`. No separate conversation, app, financial backend or money rail.

Shared user experience:
**Click Pay / Book → Mini reviews a server-controlled sample transaction and its terms → one click acknowledges sample review → same Mini opens three simulated rails → test outcome → return to the original site labelled NOT PAID.** The user does not need to open Ask KS001; the optional Help/Chat button remains inside Mini.

Server simulation `api/mini-gate2-sandbox.js`:
1. `POST {action:"BEGIN",source:"STORE"|"SHORTSTAYS"}` issues a random, AES-256-GCM authenticated-encrypted reference to a fictional order and sample Agreement. The **source-controlled server fixture** is the only source of merchant, amount, quantity, booking description, seller obligation and terms. Browser-supplied amounts are rejected.
2. `GET ?session=<opaque>` reconstitutes the fictional transaction and agreement. The sample reference contains a random order ID, immutable source digest, fixture version, exact Vercel deployment origin, 10-minute expiry and stage `REVIEW`.
3. `POST {action:"REVIEW_TERMS",session,reviewed:true}` verifies the token and returns a new encrypted reference for stage `TERMS_REVIEWED`. This **only unlocks the fictional three-rail simulation** and is expressly NOT a signature or acceptance under Kenyan law or SecurePayAPI.
4. A second GET confirms identical order ID, amount and version and a server-derived `mayExploreSimulatedRails:true`. The existing `MiniFundingPreview` is mounted only in this reviewed stage.
5. The host receives a same-origin, same-iframe **UI notification only**. It accepts only a known simulated outcome with `agreementAccepted:false` and `orderCreated:false`; its status never reads PAID/BOOKED. Closing a damaged or expired token returns safely with `NOT PAID`.

### Security constraints

- Vercel `preview` **only** and exact Git branch `feat/mini-phase3-gate2-sandbox-order-agreement-20261109`.
- A dedicated encrypted `MINI_GATE2_SANDBOX_SECRET` is **scoped to this preview branch**, never to production, main, or the browser. Missing it disables the endpoint.
- Exact deployment hostname and same-origin request check, no cross-origin cookies, no arbitrary merchant/price/return URL, no permissive CORS, no-cache/no-referrer/noindex.
- AES-GCM protects mock review-state integrity but does NOT provide durable one-time token consumption; older REVIEW tokens may still decrypt before expiry. This is acceptable **only** because the sandbox has no actual consequences. Real agreements require persistent authenticated state, idempotent commands and an audit trail, not a browser-held token.
- Each simulated stage returns `orderCreated:false`, `agreementAccepted:false`, `inventoryReserved:false`, `accommodationHeld:false`, `paymentEnabled:false`, `financialAuthority:false`, `buyerVerified:false`, `sellerVerified:false`. Sample `signed:false`, `accepted:false`, `legallyBinding:false` in *all* stages.
- No call to SecurePayAPI funding, Money Session FUND, Payment Intent, PSP, bank, mobile money, payment callback, escrow, release, refund or settlement. This code must **never be reused as financial infrastructure**.
- No production deployment, and no changes to actual SecurePayAPI, existing Phase 2 Store/ShortStays demo, previously approved Mini capabilities, or the full three-panel interface.

### Meaning of the Gate 2 simulator

This proves **how customers should behave and how contract states should drive the UI**, not that a real Store order or legal Agreement exists. A serverless signed mock token is **not a persistent StoreOrder**. No identity has been checked, no real stock held, no actual accommodation booked, and no payment completed. The original Store API integration remains separately blocked by upstream 503, with no automatic fake fallback.

### Real backend implementation contract when SecurePayAPI returns

Use the existing SecurePayAPI identity, Store, Agreement and Payment Intent authorities. A real StoreOrder service is missing in the inspected API:
- **Create authoritative order:** authenticated buyer and seller KS identity; actual offer identity, seller ownership, quantity, currency, deliverables, availability, real quote and tax/fees; stable order ID and idempotency key; expiry and order version; explicit inventory/capacity reserve with atomic concurrency rules where needed; no client-set price.
- **Bind one Agreement:** exact order ID/version and source snapshot; verified counterparties; fulfilment terms and evidence obligations; informed explicit participant consent with a signature/audit log as required. Modifications invalidate old terms and quotes. No artificial `accepted` flag inferred from a sample button.
- **Financial authority:** agreement acceptance precedes a version-bound quote and available provider methods; use `PaymentIntentController.initiate` / appropriate partner callbacks for actual external collection. Current HostedMoneySession `FUND` calls `AgreementFundedAuthorityOrchestrationService.fundFromSelf` and **is not proven equivalent to provider collection**; do not substitute it.
- **Return/status:** host queries authenticated server-owned order/agreement/payment states and receives signed/idempotent backend events. `postMessage` is only for UI navigation, never payment confirmation. Unknown/pending attempts cannot be reported paid or auto-retried.
- **ShortStays:** same Mini adapter but authoritative reservation/room inventory, date, cancellation and expiry contract. The Stay source must be kept distinct from a Store stock item.

### Test gates

`tests/securepay-mini-phase3-gate2.test.mjs` exercises ten focused cases (protocol, both hosts, mock review, tamper, expiry, config, false claims, launcher, same-origin messaging, original-preview preservation) and is included in the Vercel `scripts/securepay-mini-preview-checks.mjs` chain.

**Owner acceptance:** independently click both Pay and Book. Confirm a single compact Mini reviews sample agreement, does not require chat, goes to Choice/M-Pesa/PesaLink simulation after one sample review action, and returns to the correct host as NOT PAID. Inspect narrow/mobile display and close/reopen. This cannot certify live financial operations.

**Phase 3 status:** Gate 2 sandbox code complete when tests and preview build pass; **Gate 2 live authority incomplete** and Phase 3 remains open.
