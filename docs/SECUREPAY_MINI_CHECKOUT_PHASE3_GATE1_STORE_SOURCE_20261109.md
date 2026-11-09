# SecurePay Mini Checkout-First — Phase 3 Gate 1: Published Store Offer Provenance

**Date:** 9 November 2026
**Status:** Source integration candidate, preview-only. **NOT a real order, accepted Agreement or payment.** Existing SecurePay full three-panel UI, actual live Digital Store interface and SecurePayAPI are unchanged.

## Verified source audit

`SecurePayAPI/main` already provides:
- `GET /api/v1/stores/{canonicalKsNumber}/offers/{offerId}` in `PublicStoreController.java`. It returns the owning active canonical KS identity and a **published** Store Offer, with `offer.id`, `title`, `priceMinor`, `currency`, `quantityAvailable`, `availabilityState`, `updatedAt` and merchant identity.
- `GET /api/v1/stores/search?kind=PRODUCT&limit=5` returns eligible public offer search results for discovery, not an order.
- `StoreService.publishedOffer` excludes unpublished offers, and identity status is checked for active KS identities.

**Not found in inspected main API source:**
- A customer `StoreOrder` server-owned record/checkout order creation endpoint.
- Durable inventory reservation, seller/participant confirmation and a locked order/quantity/amount version.
- A canonical StoreOrder-to-Agreement binding with verified participants and acceptance.

The `StoreBuyingPlan` on the existing frontend explicitly says it is local buyer intention, **never an order/payment instruction or accepted Agreement**. Its price label must not be promoted into payment authority.

### Implementation decision

This Gate 1 **verifies real published Store source data** but does not pretend a listing is a paid order. Phase 3's next backend gate must create a legitimate StoreOrder/Agreement source of truth before any production Pay button or live financial quote.

## Implemented preview integration

- `api/mini-store-offer-preview.js` (server-side, Vercel Preview only): accepts a canonical **seller KS Number**, exact UUID **Offer ID** and requested small positive quantity **only**. It fetches the public Store offer from the preconfigured, owner-controlled SecurePay API origin over HTTPS.
- Hard bounds: positive amount, KES, active KS identity, exact offer ID, supported kind, actionable availability, quantity not exceeding a known available count, and valid Store timestamp. A missing or unpriced offer fails closed.
- At POST, the server issues a **five-minute AES-256-GCM authenticated encrypted** offer-review reference bound to deployment origin, seller, exact offer ID, quantity and a source-data fingerprint. It never accepts browser price, merchant name, payment method or beneficiary authority.
- At GET, the server **re-reads the public offer** and rejects changes to price, title, availability, quantity or `updatedAt` (409). An expired or tampered reference returns 410; wrong host/Origin is rejected.
- `GET ?discover=1` lists up to five existing public PRODUCT offers as discovery only. Each chosen offer is independently revalidated on POST; when no live Store offers exist, the preview correctly shows an empty state instead of generating fake items.
- `checkout-store-offer-preview.html` uses that discovery to let an owner choose an actual available listing without assistance. An optional collapsed seller KS+offer UUID field serves more targeted owner checks; not an end-user Store checkout form.
- The same `/mini.html?storeOfferSession=` and `MiniFundingPreview` render the verified **listing** with its canonical seller/price/quantity. **KS001 remains optional** and is still subject to the separate guest staging auth/model connection gate.
- Rail selection remains **SIMULATION ONLY**; no bank/PSP/STK/escrow/ledger call or real payment. Return merely closes the owner popup and never marks an order paid.

## Security and scope gates

- Exact Vercel Preview branch `feat/mini-checkout-phase3-store-offer-provenance-20261109` and `VERCEL_ENV=preview` required. A different branch or production yields 503.
- Strong encrypted `MINI_STORE_OFFER_PREVIEW_SECRET` is scoped to **this branch's Preview environment only**, not client bundle, other branches or production.
- SecurePay API origin is configured by the project owner in `VITE_SECUREPAY_API_BASE_URL`, not submitted by an arbitrary browser. Only HTTPS under `securepay.ke` domain, root path, no credentials/port/query is allowed by the initial owner-pilot server gate. Avoid SSRF and arbitrary user-selected URLs.
- Every backend fetch is public GET only, with redirect rejection, cache disabled, response bounds and short timeout.
- This preview signature is a **read-only review capability**, not a Hosted Money Session, one-time financial token, order reservation or authority to settle. Never reuse for real money.
- The existing Digital Store and ShortStays simulated hosts continue to work on their unchanged Phase 2 preview paths; new feature uses a distinct, clearly labelled preview page.

## Focused tests

`tests/securepay-mini-checkout-phase3-store-offer.test.mjs` validates:
- exact preview/branch/API gating;
- source-owned seller and price, availability, timestamp and quantity bounds;
- refusal of browser-provided amount/merchant;
- five-minute encrypted session, tamper/expiry/cross-deployment denial;
- source re-fetch and stale-price/unpublished-offer 409 response;
- public discovery that does not invent results;
- read-only Mini view and explicit absence of real Agreement, stock or payment authority.

The existing Mini/trader/Store/ShortStays focused regression suites and TypeScript remain in the Vercel build gate.

## Critical next step: actual StoreOrder authority

**Phase 3 Gate 2 requires SecurePayAPI-owned transaction records**, with at least: authenticated seller and legitimate participant relationship; source Store offer and seller KS; exact buyer quantity and unit; source/offer freshness; order state and expiry; immutable version; seller acceptance/stock hold where applicable; escrow/fee/rail eligibility through existing Agreement+PaymentIntent gateways; signed host status read/events. Only after that may Mini say **Pay** for a real Store order. A user-visible listing alone is not payment consent.

**No production activation or merge authorised.** The operator must verify whether the configured SecurePayAPI origin is reachable from Vercel and whether public published offers exist; owner uncoached browser acceptance remains open.
