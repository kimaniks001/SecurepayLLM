# SecurePay Mini — Shared Checkout Contract v1 (Proposed)

**Date:** 9 November 2026  
**Status:** *Design contract for Phase 4B–5*. **NOT an implemented backend endpoint or production capability.**  
**Applies to:** SecurePay Digital Stores, ShortStays, My Ride, Storage, estate-connected merchant/fee flows and separately approved external sites.

## 1. One runtime product, two launch intentions

| Trigger | Launch intent | Required outcome |
| --- | --- | --- |
| “Ask KS001”, “Get help” or an invitation from a merchant | `ASK` | Compact conversation using the same SecurePay agent, approved site-scoped context and optional trade tools |
| “Pay”, “Book”, “Pay deposit” or “Pay invoice” | `CHECKOUT` | Compact agreement-linked payment/review journey, already linked to a trusted order/booking/invoice |
| Mini’s own reviewed trade | `CHECKOUT_FROM_MINI` | Exactly the same canonical agreement, quote and payment state as host checkout, not a new payment engine |

Opening `CHECKOUT` must not force a KS001 conversation before paying, but KS001 can be called inside it without leaving or losing the transaction. Mini must never automatically create a charge, agreement acceptance or KS identity simply because a host button was clicked.

## 2. Contract ownership

**Host owns:** merchant catalogue and published offers, genuine stock/room/trip/storage availability, fulfilment method, cancellation eligibility, hosting prices/taxes it is authorised to quote, user-facing host order/booking state, permitted merchant policy.

**SecurePayAPI owns:** registered host installation and origin permissions; participant/customer/merchant identity proof; one canonical Agreement/version/accepted terms; payment authority; available eligible funding rails; fees and quotes; payment intents and idempotency; provider-reconciled funding evidence; safeguarded money classification and allocation; release/refund/settlement authorisation; immutable audit/evidence.

**Mini owns:** a concise, readable UI and client-side lifecycle/visible state; it relays user intent but is not a bank, trust ledger, payment authority, merchant inventory system or record of funds. **No duplicated “Checkout Wallet”, local transaction ledger or independent KS001 brain.**

## 3. Host-to-SecurePay handoff — reuse audited backend first

**Existing service, already present in SecurePayAPI source:** `POST /api/v1/developer/money-sessions` (`DeveloperMoneySessionController`) creates an opaque short-lived Money Session under an API-key application holding `MONEY_SESSIONS_WRITE`, for an Agreement belonging to the application's administered organisation. The backend offers `GET /api/v1/money-sessions/{token}` to resolve the server-owned Agreement/obligation and `POST /api/v1/money-sessions/{token}/redeem` to redeem under authenticated participant authority. The developer input includes agreement/obligation IDs, a purpose from `OPEN|FUND|EXERCISE|RELEASE`, an optional amount cap, participant and allowlisted return URL.

**Important boundary:** customer-facing checkout must be restricted to a legitimate **FUND** path (and only after terms and participant authority are validated). Do not expose `EXERCISE` or `RELEASE` authority through a public Pay button. The same service may not automatically be appropriate for standalone informal sellers because its developer app authorisation requires a genuine administered Agreement organisation; never weaken that rule to force a Store checkout.

**Unresolved compatibility decision:** Hosted `FUND` currently delegates to Agreement-funded orchestration, while provider Payment Intent initiation has its own provider/callback process. The inspected source does **not** establish that they are equivalent to a customer paying via Choice Bank, M-Pesa or PesaLink. **Verify this before issuing any new session API or coding checkout**; use the existing hosted service where appropriate and add only a minimal, separately approved adapter if needed.

**Logical checkout context still required (not an implemented wire request):** registered host, exact host order/booking reference and immutable version, approved Agreement/obligation, merchant identity, buyer authority, origin/return binding and expiration. The host must first create or authenticate this context *on its own server* and securely bind it to the Agreement. The browser cannot supply authoritative order prices, beneficiaries, rail eligibility or fee amounts.

The following describes **design concepts only** (not a new `POST /checkout-sessions` endpoint):

```json
{
  "registeredInstallation": "<server-owned and approved host>",
  "hostOrderReference": "<opaque host-owned order or booking>",
  "sourceType": "STORE_ORDER | STAY_BOOKING | RIDE_ORDER | STORAGE_BOOKING | INVOICE | DIRECT_TRADE",
  "hostOrderVersion": "<server-validated immutable version>",
  "agreementReference": "<server-owned Agreement/obligation>",
  "userReturnIntent": "<registered return alias>",
  "requestedExperience": "CHECKOUT"
}
```

**Secure browser handoff:** use a short-lived bounded opaque capability with safe handling of URL/token leakage, expiry, binding and replay. No developer API keys, provider secrets, unrestricted return URL, KS Number allocation power or raw bank details inside Mini or host JavaScript. A copied/replayed reference must not grant a second financial effect.

**Server-owned checkout display:** show only permitted merchant, order/stay, exact version, amounts, terms and authenticated participant status. If amount/fees/booking changed, explicitly re-review before payment. Expired, revoked, unavailable or stale sessions must fail closed.

## 4. Review → authority → quote → intent → status (reuse real gateways)

The frontend money source already exposes these authenticated methods:

- `fundingAuthority(agreementId)` — permission must be server-confirmed.
- `fundingOptions(agreementId)` — **source of actual available rails**, not the simulator's three static cards.
- `createVersionBoundQuote(agreementId, railCode, expectedAgreementVersionId)` — financial quote and economic viability for the exact accepted terms.
- `createIntent(agreementId, expectedAgreementVersionId, quoteReference, idempotencyKey, externalReference?)` — strictly server-owned amount/currency/obligation.
- `initiate(paymentIntentId, providerIdentifier, idempotencyKey, quoteReference?)` — provider instruction only when approved.
- `get(paymentIntentId)` and `listAttempts(paymentIntentId)` — retrieve intent and provider attempt truth.
- `moneySnapshot.read(agreementId)` — distinguish confirmed payment, actual funded position, Payment Ready, release authority and movement status.

**Not every payment is a guaranteed escrow/funded position.** Do not infer regulated custody or release conditions from a green “CONFIRMED” status. Read the separate money position and applicable legal/provider terms.

The Phase 4 **owner simulator** shows Choice Bank, M-Pesa and PesaLink as selectable fictional methods. **Live checkout** only shows rails returned by authorised API/provider configuration, with valid quote/cost and eligibility. Choice Bank is a bank rail, M-Pesa mobile money, and PesaLink bank transfer service—distinct provider instructions and confirmation delays, not three equivalent wallets.

## 5. The customer-visible payment journey

1. **Ready to pay:** same contextual Mini popup opens from host order/booking, or directly from existing Mini work. Show what, from whom, amount, and a short “Review details” option.
2. **Review:** exact merchant, beneficiary, dates/quantity/condition/cancellation/refund policy, version and *real* provider/platform charges before user approves the relevant agreement.
3. **Choose rail:** Choice Bank, M-Pesa or PesaLink **only if actually enabled and eligible** for this Agreement. User may switch before an intent starts.
4. **Provider action:** M-Pesa may require an STK/customer approval; a bank rail may require redirect/authorised transfer instruction; PesaLink may require bank-side steps. Show only instructions returned by the provider, with no invented account/payment number.
5. **Pending:** differentiate action-required, initiation-pending, provider-pending, confirmation-pending, cancelled, expired and failed from actually provider-confirmed; unknown result must block blind retrial.
6. **Verified:** separate payment confirmation from actual protected funding and from fulfilment. Display only statuses the API can prove. Host sees its own booking/order status updated from trusted server evidence.
7. **Return:** customer sees the same order/booking, with receipt or “still pending” as justified; closing/reloading checkout must not create another charge.
8. **After trade:** evidence, issue handling, partial fulfilment, authorised release/refund and settlement occur under the Agreement lifecycle, not a second checkout.

The default customer view: **what am I paying for → how much → which option → pay/approve → clear result**. Textual compliance explanation and detailed fees are accessible but not repeatedly plastered across the compact panel. Mandatory material fee disclosures must still be visible *before authorisation*.

## 6. Host result contract (proposed, not an existing webhook)

Host receives **signed, time-limited server-to-server notifications** and/or performs authenticated API reads. Each event references registered host + order + immutable SecurePay Agreement/payment identifier, monotonic event sequencing and idempotency key. Verify signature, origin, merchant ownership, expected order version and replay status before mutating host state.

Host must not mark an order paid because:
- user returned to a success URL,
- iframe sent a `payment-success` message,
- Mini showed a simulated confirmation,
- merchant uploaded a screenshot or SMS,
- PSP initiated an instruction, or
- client page claims `CONFIRMED` without backend proof.

**Example derived host statuses** (host-specific, not interchangeable with the payment-intent enum):
`ORDER_DRAFT` / `AWAITING_AGREEMENT` / `AWAITING_FUNDING` / `FUNDING_PENDING` / `FUNDED_CONFIRMED` / `READY_TO_FULFIL` / `FULFILLED` / `CANCELLED` / `REFUND_PENDING` / `REFUNDED`.

A ShortStays **reservation hold** must still satisfy host availability/expiry policy. “Booking confirmed” needs correct room/date reservation and required payment evidence. A digital Store must distinguish stock “shown”, “reserved”, “dispatched”, and “delivered”; a shop quote alone is not an inventory reservation.

## 7. Cross-merchant baskets, changes and cancellation

A multi-store cart can have **one human checkout experience** but cannot create a single unaudited merchant balance. Each seller owns distinct order lines, Agreement participant/obligation, funding allocation and delivery/release authority; backend handles correlation, fee/rail economics and cancellation without allowing one seller to draw another's funds.

Quantity, stay dates, pickup place, seller and amount changes invalidate stale accepted version/quotes; require a fresh reviewed agreement or authenticated amendment. Refunds/cancellations follow recorded policy and provider/authorised money status; they are **not automatically a new payment**.

## 8. Embedded security and privacy

- **Production third-party embeds must run from a separately controlled SecurePay origin**, with exact `frame-ancestors`, registered host binding, strict CORS/postMessage schema and no privileged same-origin access to a merchant's page.
- Existing Mini host HTML is a **fictional same-origin owner preview**, not a reusable public SDK; its sandbox `allow-scripts allow-same-origin` does not provide a real security boundary.
- Require explicit consent to bring personal host information into KS001, minimised allowed context, scoped visitor AI budgets and a clear guest-to-authenticated transition where needed.
- Never expose server payment/PSP secrets, raw customer records, bank details, signed server webhook credentials or full API access inside Mini.
- Disallow arbitrary return URLs, embedded site impersonation and unauthorised merchant switching.

## 9. Focused acceptance matrix — scenarios as behaviours, not product nouns

Each is a *test class* against permanent fictional trader cohort plus an **unseen swap**. None may become special-case KS001 answer logic.

| ID | General market behaviour | Must prove |
| --- | --- | --- |
| C01 | Direct Mini seller offer → buyer funding | One canonical Agreement and correct verified money status |
| C02 | Store Pay button → Mini → host return | Same order, merchant, amount and permitted next action |
| C03 | Accommodation Book/Pay → Mini → host return | True date/room hold, applicable policy, conditional booking confirmation |
| C04 | M-Pesa payment needs customer action | Provider-supplied instructions, no false funded/settled state |
| C05 | Choice Bank option selected | Bank-based role and funding status grounded in partner/API capability |
| C06 | PesaLink option selected | Bank-transfer role, pending until authoritative reconciliation |
| C07 | Initial price/quantity/date/merchant changes mid-checkout | Stale quote/version rejected; new consent required |
| C08 | Unknown outcome, weak connectivity, repeated button tap | One intent/attempt; no blind second charge; safe resume |
| C09 | Popup closed/reopened or device navigates away | Host and Mini still show correct authoritative state |
| C10 | Cross-store cart with one seller cancellation | Seller allocations and fulfilment/release separate |
| C11 | Partial or delayed service/delivery | Funding, fulfilment, dispute, release and settlement remain distinct |
| C12 | Cancel/refund/expired order | Authorised policy, real money/refund evidence, no fake completion |
| C13 | Wrong/copycat host, forged return event, stale payment signal | Denied with no information/funds leakage |
| C14 | Small-value trade and real quoted costs | No undisclosed fee, no false economic viability |
| C15 | First-time or lower-confidence customer | Independently understands amount, options, status and next action |
| C16 | Same person returns as business grows | Familiar Mini, preserved work/history, larger needs without new app |

**Focused test discipline:** begin with C02 and C03 vertical slices against *one order and one booking*, vary input item/stay types without scripting product nouns; protect C07–C09 and C13 as hard safety boundaries. Test simulated rails in all three variants with no bank network calls. Expand only when that complete journey passes; do not run indiscriminate massive suites.

## 10. Release gates

- **Contract gate:** host/backend/UX contract and ownership explicitly accepted; unknown wire endpoints clearly tagged proposed.
- **Sandbox vertical-slice gate:** one Store Pay click and one ShortStays booking Pay click both open the **same Mini** with correct canonical references and return safely; test all three *simulated* rail choices, pending, failure, unknown and cancellation. No financial actuation.
- **Identity gate:** real registered site, participant authentication and signed agreement version accepted only with backend authority.
- **Money integration gate:** actual partner-enabled rails and server-generated quotes; real callback reconciliation; regulated safeguarding, accurate ledger and dispute/release rights independently certified.
- **Human gate:** owner tests uncoached on small phone and sample host; later wider real-user evidence before broad rollout.
- **Production gate:** security review, partner sign-off, narrow controlled rollout and rollback. No preview or synthetic test result substitutes for a real bank/PSP confirmation.

**Next implementation candidate:** Phase 4B server-owned checkout-session contract plus Phase 5 host launcher/return *sandbox skeleton*, tested on Store and ShortStays. Preserve Phase 3 live-AI/identity blocker visibly. No duplicate payment engine.
