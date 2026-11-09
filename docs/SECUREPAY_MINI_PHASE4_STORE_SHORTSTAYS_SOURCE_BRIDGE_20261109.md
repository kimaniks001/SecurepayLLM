# SecurePay Mini — One Store / One ShortStays source review bridge

**9 November 2026 · Phase 4B/5 vertical slice, pre-payment source contract · Draft**

## Locked objective

**One Mini, one Agreement authority, one eventual checkout.** We are not
building a new app around a demonstration. The existing Store and ShortStays
sandbox already launch the same Mini; this development gate prepares the *real
source* to enter it without pretending browser data or a demo payment can
authorize funds.

The cross-source interface is
`SECUREPAY_CHECKOUT_SOURCE_REVIEW_V1` in
`src/mini/checkoutSourceReview.ts`:

| Field | Store source | ShortStays source |
| --- | --- | --- |
| `source` | `STORE` | `SHORTSTAYS` |
| `sourceReference` | Authenticated API Store intention ID | Browser-visible booking code |
| `sourceVersion` | Server-listed offer update timestamp | Browser-visible booking version timestamp |
| `sourceContext` | `SERVER_STORE_INTENT_UNACCEPTED` | `BROWSER_BOOKING_PRECHECK` |
| `displayAmountMinor` | Server-priced KES intended amount | Optional browser estimate if valid preflight and unexpired hold |
| `nextAction` | `ACCEPT_ORDER_AND_AGREEMENT_ON_SERVER` | `VERIFY_BOOKING_HOLD_ON_SERVER` |
| `blockers` | Seller order acceptance + Agreement + provider | Server hold/signature + Agreement + provider |

Every contract instance sets these authority claims to **false**:
`checkoutSessionIssued`, `hostOrderAccepted`, `roomReserved`,
`agreementAccepted`, `providerPaymentVerified`,
`obligationFunded`, `paymentEnabled`, `mayFulfil`.
All amounts in this contract are **display values only**, never instructions
for creating a fee quote or payment intent.

## Store path — actual source adapter, not a synthetic order

`src/api/securepay/store-checkout/index.ts` exposes an authenticated
`sourceReview(intentId)`. It reads the original server-owned Store intention
with GET, validates the existing strict `REQUESTED_NOT_ACCEPTED` contract,
and converts it into the shared source review. It does not create another order,
change a listing, accept terms, hold inventory or call a financial API.

Backend `SecurePayAPI` PR #406 remains draft with unresolved CI/startup
and Store API connectivity. An authentic source cannot be certified against it
until that work passes.

## ShortStays path — same shape, different authority gap

`kenya-stay-stories` source-preflight PR #18 checks a persisted booking
and an apparent room hold in the client. The follow-on branch
`feat/shortstays-mini-shared-source-review-20261109` transforms its
preflight to the **same keys and status boundary** and displays the next step
on the existing guest booking page. It never manufactures a signed ticket,
accepts a cached Agreement ID as consent, charges a guest, claims a booked
room or exports merchant/guest personal details to SecurePay.

The guest route cannot authenticate the viewer through its current loader;
it explicitly passes **no authenticated guest identity** and therefore
cannot pass that source preflight or produce a payment link.

## What this gate IS, and is NOT

**Implemented:** a runtime source-review adapter on each application's
existing code path, identical nonfinancial field semantics, explicit blocker
and next-action states, focused tests (Store server-intention gateway plus
ShortStays booking/hold preflight), no new payment engine or new UI layout.

**Not implemented:** host-signed single-use checkout session from ShortStays,
seller-accepted Store order/stock hold, authenticated Agreement acceptance,
provider-eligible funding rails and fees, true payment status, durable host
callback/booking confirmation, deposits/milestone money, notifications.

This is **not the final Phase 4B live checkout bridge**. It is the smallest
safe, reusable interface for carrying source truth into the next real gate.

## Next integration, once SecurePayAPI/ShortStays backend is available

1. **Store server** promotes an authenticated `REQUESTED_NOT_ACCEPTED`
   intention to a versioned seller-accepted order and proves stock policy.
2. **ShortStays server** atomically validates and holds the room/date/guest,
   emits a signed, audience-bound short-lived reference; never sign in the browser.
3. **SecurePayAPI** validates host/order/booking source and exact owner rights,
   binds its own authenticated Agreement version and monetary obligations.
4. Both host launchers pass only an opaque checkout reference to the same Mini,
   with KS001 optional, not required. Mini fetches trusted terms, provider
   options and quotes via the existing payment-intent service.
5. Host and Mini read only independently verified provider and Agreement money
   states, with no false paid, reservation, protected balance or released funds.
6. Post-payment prompts, deposits, milestones and notifications consume
   durable canonical Agreement events; no parallel local workflow engine.

**NO-GO:** production, payments, partner keys, bank transfer instructions,
STK push, booking confirmation, fund release and new pricing.
