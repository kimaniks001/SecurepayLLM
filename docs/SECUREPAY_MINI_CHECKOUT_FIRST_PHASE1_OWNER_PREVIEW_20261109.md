# SecurePay Mini — Checkout-First Phase 1: Two Hosts, One Pocket

**Date:** 9 November 2026  
**Delivery classification:** Working React/HTML/JS **owner-only checkout UX simulation**. Not a live or server-authenticated checkout, order, booking, payment, payment-intent or bank rail.  
**Base:** Checkout-first Phase 0 source audit and earlier Mini phases (draft/unmerged branches).  
**Production status:** NO-GO.

## Owner UX principle — no forced chat, no coaching

The owner requires **one tool that finishes the job without outside assistance**. This is a permanent product constraint:

- Checkout is complete in the same SecurePay Mini window: **review → select Choice/M-Pesa/PesaLink → provider outcome → return to the correct host**.
- **Ask KS001 is optional**, accessible inside Mini and never required before a standard checkout; it does not open a separate product, change financial authority or force a new explanation.
- In this owner-only **fictional simulation**, after the visitor selects a rail and clicks Continue, Mini shows a brief waiting state and generates an automatic **TEST-ONLY** response. The owner does **not** need to open the hidden Test a result control. That control remains available only in the standalone simulator for advanced error testing.
- A simulated result explicitly says **not paid/no money moved**. The main next action becomes **Return to Store** or **Return to ShortStays**. No real provider callback, booking confirmation or funds transfer exists.
- When changing Mini screens, scroll resets to the beginning; the customer should find the next action unaided.
- This does **not** authorise production auto-confirmation. A real checkout must wait for actual verified payment-intent/partner evidence, and unknown statuses must remain unresolved until reconciled.

## User-facing experience

Two isolated fictional websites are built as Vite multi-page entries:

- `/checkout-demo-store.html` — Sample Digital Store: test order `STORE-DEMO-01` (three packs, KSh 1,800).
- `/checkout-demo-shortstays.html` — Sample ShortStays: test booking `STAY-DEMO-01` (4–6 Dec 2026, two nights, two guests, KSh 9,000; **no room actually held**).

Each has **one Pay/Book button** that opens the existing **same** `/mini.html` in a compact ~342×510 px floating frame. No separate assistant, money widget, merchant checkout implementation or full-screen takeover.

Mini reads the **test reference only** (`demoCheckout=...`) and resolves one of two immutable, source-controlled fictional examples. It displays context and amount for review, without silently assuming an accepted Agreement, verified participant, booking, inventory or payment authorisation.

The user explicitly selects **Choose how to pay**, which mounts **the exact same** `MiniFundingPreview` used by the earlier direct Mini. All three rails—Choice Bank, M-Pesa and PesaLink—remain available as fictitious owner-test options. No STK push, bank instruction, fee quote, actual provider attempt, money movement, escrow or ledger entry occurs.

KS001 is a secondary **Ask KS001** action within this same window, preserving the shopper's Mini context when switching back. The guest model remains unavailable unless the separately registered sandbox API installation is properly configured. Do not claim actual AI replies in this branch.

**Return:** the test Mini can close and return to the correct Store order or ShortStays booking. When embedded, a same-origin `postMessage` signals **only a simulated preview return**; the host checks exact origin, exact frame, known fixture ID, version, simulated flag and a finite list of owner test outcomes. All received outcomes (including “simulated confirmed”) are visibly **NOT PAID**. Closing with X without a result is also NOT PAID. The Mini frame stays mounted while hidden, allowing the owner to reopen to an unresolved local simulated state.

**No actual order is modified.** No event in this demo is a signed webhook, proof of provider funding, confirmation of a room hold or a safe production return. A real Store/ShortStays integration will require server-authenticated event reads, replay protection and host-specific domain checks.

## Scope by file

- `src/mini/checkoutDemoFixtures.ts`: two immutable fictional fixtures and allowlisted resolver. **Never import this fixture as production order authority**.
- `src/mini/MiniHostedCheckoutDemo.tsx`: shared contextual review, optional KS001, same funding selector, safe return. No API calls or financial authority.
- `src/mini/MiniExperience.tsx`: additive route from `demoCheckout` reference; invalid reference renders “Checkout unavailable”. Existing standalone Mini unaffected.
- `src/mini/MiniFundingPreview.tsx`: optional test-status and return callbacks; all previous local rail-state behaviour preserved.
- `public/checkout-demo-host.js`: same minimal launcher on both sample pages, with strict **demo-only** origin/frame/reference validation; rejects `PAID`, unexpected host and spoofed result.
- `checkout-demo-store.html`, `checkout-demo-shortstays.html`, `checkout-demo.css`: two owner reference host pages only.
- `vite.config.ts`: builds both demo pages in addition to full SecurePay `index.html`, Mini and original mock host.
- `tests/securepay-mini-checkout-phase1.test.mjs`: 9 focused fixture, host-controller, return and source-authority checks.
- `scripts/securepay-mini-preview-checks.mjs`: continues previous all focused tests and TypeScript before Vite build.

## Critical backend compatibility decision

**Confirmed by reading SecurePayAPI source, not by guesswork:**

1. `HostedMoneySessionService.redeem()` consumes the one-time token and delegates purpose `FUND` to `AgreementFundedAuthorityOrchestrationService.fund()`.
2. `AgreementFundedAuthorityOrchestrationService.fund()` calls `fundedAuthorityPort.fundFromSelf(...)` under an authenticated actor and environment guard.
3. `PaymentIntentController.initiate()` separately calls `PaymentInitiationService.initiate(...)`, using a provider identifier and optional quote reference.

**Implication:** Hosted Money Sessions and provider Payment Intents are *not proven to be a single bank funding path*. An existing `FUND` session must NOT be wired as if redeeming it performed a confirmed M-Pesa, Choice Bank or PesaLink collection. The code's production participant-money environment guard further restricts direct money operations. Reuse existing Money Sessions where appropriate, but first design and test the minimal **authenticated checkout authorisation → provider intent and reconciliation bridge**. No new backend endpoints have been created in Phase 1.

The source has genuine organisation-administered Agreement restrictions for developer-origin sessions; do not bypass them for individual shopkeepers. A real Store order/ShortStays booking-to-Agreement binding is still missing.

## Focused acceptance gate

Source/harness tests prove (within the fictional owner demo):
- Store/ShortStays link to **identical** Mini checkout code and different frozen records.
- A forged origin, wrong frame/fixture, fake paid status or unrelated event cannot change test host status.
- A test confirmed result still reads **NOT PAID**.
- Closing/reopening doesn't destroy the iframe's in-memory simulated attempt.
- No client payment API, payment release, real money state or bank credentials used.
- Existing full three-panel SecurePay app remains in `src/main.tsx`/`RuntimeApp`.

**Not yet tested/certified:** real owner clicking on mobile, live KS001 replies, real host order/room availability, participant acceptance, bank/PSP, fee quote, provider callback, ledger, escrow, refund or settlement. The owner's experience decides whether the checkout is genuinely simple.

## Next Phase 2 foundation (not silently built here)

- Review the authenticated Money Session / Payment Intent bridging design, including idempotency and money state.
- Build one **server-owned** Store order snapshot + one ShortStays room/date hold bound to exact Agreement/obligation.
- Replace immutable demo context with an opaque, expiring, host-bound backend reference (never browser-created amount).
- Issue eligible rail choices and real fee quotes only from the backend; preserve Choice/M-Pesa/PesaLink in explicitly labelled nonfinancial simulator until providers are authorised.
- Host receives signed, replay-protected events or authenticated reads and confirms its own business requirements before updating an order/booking.
- Continue uncoached owner/mobile tests against both host journeys and same fictional trader cohort, with a fresh unseen trade after each correction.

**Release decision:** GO for inspectable Phase 1 sandbox experience; NO-GO for production Pay-button replacement or real money.
