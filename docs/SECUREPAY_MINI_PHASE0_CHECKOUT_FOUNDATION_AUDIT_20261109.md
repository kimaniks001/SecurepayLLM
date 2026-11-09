# SecurePay Mini — Checkout-First Phase 0 Source Audit & Decisions

**Date:** 9 November 2026  
**Classification:** Phase 0 product/architecture audit, NOT live checkout implementation or legal/partner certification.  
**Source baseline:** SecurepayLLM `main@535f5fcdbb53f45dc0fc635dadbb110e6f66a689`; SecurePayAPI `main@9b17b361de3e1e7df815281f578a5fca4b75ee99`. These pins establish exactly what was inspected, not what is deployed.
**Owner goal:** All Pay/Book/Pay Deposit buttons in our approved commerce ecosystem open one compact SecurePay Mini checkout, with KS001 available inside it. No parallel assistant or payment engine.

## Decision D0: one checkout, two entry intentions — LOCK FOR TEST DESIGN

- `ASK`: person calls KS001 intentionally; it may help prepare an Agreement and offer a safe checkout next step.
- `CHECKOUT`: person clicked Pay/Book/Pay Deposit; Mini opens *already attached to the trusted transaction*. User need not speak to KS001 before paying.
- Both share the same canonical identity, agreement, money status, escrow/safeguarding authority (when certified) and host context. A Store or ShortStays never creates its own bank/ledger state.

**Owner experience requirement:** one small quiet window, short labels, review the real total/terms, choose an eligible rail, follow provider action, get a truthful result and return. Details disclosed when needed; material total charges and policies visible before consent.

## Source audit — facts versus gaps

| Component | Inspected authoritative code | Phase 0 classification |
| --- | --- | --- |
| Live payment-intent gateway | `SecurepayLLM/src/api/securepay/payment-intent/index.ts`: `fundingAuthority`, `fundingOptions`, `createVersionBoundQuote`, `createIntent`, `initiate`, `get`, `listAttempts`; authenticated only | **Existing source**, no browser/partner certification |
| Canonical money read | `SecurepayLLM/src/api/securepay/money-snapshot/index.ts`: side-effect-free agreement money state, not a quote | **Existing source** |
| Developer-origin hosted Money | `SecurePayAPI/.../DeveloperMoneySessionController.java`: authenticated `MONEY_SESSIONS_WRITE`, developer-created session on an already existing administered Agreement | **Existing backend**, not a general item-to-checkout API |
| Customer Money session resolve/redeem | `SecurePayAPI/.../MoneySessionController.java` and `HostedMoneySessionService.java`: opaque token, short expiry, participant authentication, idempotency, one-time consumption | **Existing backend**; needs compatibility mapping to PaymentIntent provider funding |
| Money session operations | `MoneySessionPurpose.java`: `OPEN`, `FUND`, `EXERCISE`, `RELEASE` | **Critical least-authority gate:** host checkout must never accidentally create a money-release/exercise session. Decide whether `FUND` is appropriate for customer checkout, backed by provider confirmation |
| Hosted developer authorisation | `DeveloperMoneySessionAuthorizationService.java`: app's owning business must administer Agreement's organisation; return URLs pre-registered, optional participant checked against real active Agreement participant | **Existing check**; may exclude ordinary standalone seller/non-organisational transactions. Do not bypass |
| Source/Store product lookup | `SecurepayLLM/src/api/securepay/store/index.ts` and `dto.ts` return offers/availability and prices, not canonical held order/checkout sessions | **Gap:** Store order snapshot, quantity/version/stock reservation and host Pay button → Agreement bridge |
| ShortStays guest embed | `SecurepayLLM` draft PR #241 / separate ShortStays preview: guest assistant, not booking/payment authority | **Gap:** authoritative availability/booking hold → Agreement/session and host return |
| Developer webhooks | `SecurePayAPI/contracts/webhooks/EVENT_DELIVERY_CONTRACT.md` with HMAC timestamp/event ID, retry semantics; newer `AgreementMoneyWebhookNotifier.java` wires some Agreement money lifecycle notifications | **Reusable infrastructure**; exact paid/booking callback, order-level mapping and host-side verified acknowledgement not certified |
| Mini local rails | `SecurepayLLM` draft PR #246: Choice Bank/M-Pesa/PesaLink simulation and unknown/failure handling | **UI/test fixture only**, not a verified payment or supported partner list |
| Existing KS001 pilot | Mini draft PR #245 and API draft PRs #395–#399 | **Partially built**, live guest connection not certified |

### Critical discovery — do not build a second hosted session until compatibility review

The backend **already contains** `POST /api/v1/developer/money-sessions` (with `agreementId`, `obligationId`, `purpose`, optional amount cap, intended participant, registered return URL), `GET /api/v1/money-sessions/{token}` and `POST /api/v1/money-sessions/{token}/redeem`.

Source currently models hosted `FUND` as a call into `AgreementFundedAuthorityOrchestrationService.fund`. Separately, Payment Intent funding `initiate` hands an intent to eligible provider adapters. **No inspected source establishes that redeeming a hosted `FUND` session automatically performs the exact same provider-driven collection, quote, reconciliation and eventual protected funding transition as Payment Intent `initiate`.** This is a hard architecture question, not a reason to create a parallel payment rail.

**Required compatibility review at beginning of implementation:** trace `FUND` orchestration, payment intent, provider confirmation and ledger journal together, and decide how hosted Money Session can safely *launch or authorise* the existing payment-intent journey. If the existing hosted session is not adequate, propose only the missing minimal adapter in SecurePayAPI, with clear ownership and doctrine tests.

### Additional genuine gaps

1. **Canonical order/booking binding:** map a Store item/basket or ShortStays date/room hold to a server-owned versioned Agreement obligation; buyer browser is not source of price or inventory.
2. **Initial agreement/participant onboarding:** a Pay click cannot skip necessary identity, review, joining/acceptance or money authority; first-time guest should see a simple guided route, not a silent signing or deposit.
3. **Stable merchant mapping:** organisation-administered agreement restriction is intentional; determine a legitimate path for independent shopkeepers and merchants rather than weakening developer authorisation.
4. **Host checkout mode** in Mini: `CHECKOUT` with trusted context, no mandatory chat; `ASK` remains the same product and same KS001.
5. **3-rail provider truth:** Choice Bank, M-Pesa and PesaLink tested together as simulated candidates. Real rails and fees from backend `fundingOptions` and `createVersionBoundQuote`; Choice connector remains subject to executed provider documents and certification.
6. **Host completion source:** a signed, scoped, deduplicated webhook/event or backend read must drive host paid/booking status. Popup close/return URL doesn't.
7. **Failure recovery:** expired sessions, lost connection, duplicate clicks, provider unknown, booking hold expiry, stale quote and declined payment must not create a second charge or false confirmation.
8. **One-cart, many sellers:** one checkout experience but independent seller agreement/positions/charges and release, with no cross-merchant balance mixing.
9. **Origin/session security:** iframe controlled by SecurePay origin, explicit allowlist and safe return destination. The current same-origin demonstration is not the public embed contract.
10. **Money state honesty:** `CONFIRMED` payment intent, safeguarded Agreement funding, booking confirmation, release authorisation and settlement are distinct statuses.

## Phase 0 test population and reusable acceptance gates

The existing 20 stable synthetic trader/customer IDs (`TR-001`–`TR-020`) are **preserved**, not replaced or seeded as real KS accounts. Checkout-specific test classes `C01`–`C16` and two first vertical-slice definitions are kept in `tests/fixtures/securepay-mini/checkout-acceptance.v1.json`. Each has stable ID, fictional actors, exact scenario domain, a required invariant, a future implementation phase and `NOT_TESTED` status. The tests validate the test *definition*, not real payment success.

First vertical slices to build *together*, reusing one checkout:

- **V-STORE:** a Digital Store Pay action for an owned versioned order/offer. Host must not supply money authority. Verify same seller/order/quantity/version on Mini; simulate all three rails; safe return to correct host order.
- **V-STAY:** a ShortStays Book/Pay action for an actual date/room hold on the ShortStays backend. Preserve expiry/cancellation policy; simulate all three rails; close/return with no false booking confirmation.

Cross-cutting first hard tests: **C07** stale price/booking version, **C08** duplicate/unknown payment, **C09** popup close/reopen, **C13** malicious host/forged return. No owner-specific item noun or screenshot becomes business logic.

## Explicit phase gate

**Phase 0 (checkout-first audit and test specification):** Source ownership mapped and reusable foundations identified. **GO** to *isolated Phase 4B/5 combined sandbox design/implementation* using existing Money Sessions and Payment Intent contracts as candidate foundations, after resolving their compatibility. **NO-GO** for real provider initiation, live booking confirmations, production embedded checkout, fund release or settlement.

No new API endpoint is approved by this document. The “proposed checkout session” in the prior roadmap is a **logical checkout context**; implementation must evaluate reusing the existing hosted Money Session first rather than cloning it.

### Owner experience gate (later)

Real owner on actual mobile/small browser must be able to pay for an ordinary Store item and a ShortStays booking without coaching, and understand **what**, **how much**, **which rail**, **what happened** and **what is next**. Simulation marks are obvious but not wordy. Revisit same trader IDs as first-use/repeat/business-growth tests. Independent real merchants required before broad market claims.

**Decision:** Phase 0 checkout-first *source audit and defined test requirements ready for review*, not human acceptance or money execution. Future phase work proceeds only as nonfinancial, isolated checkout vertical slice until upstream evidence exists.
