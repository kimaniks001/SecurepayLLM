# SecurePay Mini — Phase 5, Gate 1: Common host launch and return

**10 November 2026 · owner-only same-origin prototype. No live providers.**

## Objective

Phase 4 offline owner acceptance is recorded in
`SECUREPAY_MINI_PHASE4_OWNER_ACCEPTANCE_OFFLINE_20261110.md`.

Phase 5 begins **one small host checkout launcher**, not five new payment
products. The first two, intentionally different, sources are Store retail
orders and ShortStays bookings. Both must use the same original Mini and
the same return semantics with no backend or provider currently enabled.

## Working Phase 5 owner pages

- Directory: `/phase5-hosts.html`
- Digital Store: `/phase5-store-host.html`
- ShortStays: `/phase5-shortstays-host.html`

These are **fictional same-origin reference surfaces**, not the live Store,
ShortStays, Varsityville Estate or any other production website.
The official logo is a clickable link to `https://securepay.ke/`.

Both import the single script
`/securepay-mini-phase5-host-bridge.js`.
It checks an exact source/path and immutable expected fixture mapping
and opens the **existing** `/mini.html?embedded=1&demoCheckout=<fixed-fixture>&journey=1`
inside the approved compact, optionally resizable popup. KS001 is optional.

The source images, prices, dates, order references and merchant labels
are only the immutable, checked-in Phase 4 owner fixtures. The launcher
neither computes financial values nor contains any payment-intent code.

## Status / security boundaries

1. Only the exact `STORE` and `SHORTSTAYS` sample paths are enabled.
   `ESTATE`, `MY_RIDE` and `STORAGE` are already represented in the
   finite, fail-closed host manifest as NOT READY: no clickable Pay path
   or synthetic invoice/trip/rental authority is manufactured.
2. A client `postMessage` must match the same origin, iframe window,
   exact immutable fixture, expected event, version, simulated flag and
   one of the six known fictional outcomes.
3. Accepted messages update **only descriptive sample text** containing
   `NOT PAID`. They do not update host order, booking, settlement, ledger,
   inventory, authorization or receipt state.
4. Closing a popup cannot confirm checkout. Reopening the same in-memory
   iframe preserves the fictional flow rather than silently launching
   another attempt. No client event is real provider evidence.
5. Unknown is never treated as paid or automatically retried. Cross-origin
   or altered source/fixture conditions are inert.
6. **NOT a public cross-origin SDK.** This sample depends on same-origin
   fixture and iframe access. A real third-party production deployment needs
   exact registered-origin/frame-ancestor/CSP controls, authenticated and
   bound server-issued checkout capability, trusted server-to-server
   callbacks and/or authenticated original money reads, replay resistance
   and independent host state verification.

The pre-existing Gate 4 server-simulated Store/ShortStays host pages and
their own signed test attempt/reconciliation logic remain unchanged. This
Gate 1 visual host launcher is a complementary explicit `journey=1`
cross-host experience test; it is **not a replacement** for Gate 4
recovery or a claim that all stages use a new hosted financial service.

## Next Phase 5 gates

- **Gate 2 — Host contract and SDK security:** define verified origin,
  source-owned immutable order/booking version, return alias, expiry,
  registered installation and signed capability. Preserve closed APIs
  while simulating unknown/expired/replayed source tokens. This needs
  engineering of trusted partner-host/server authority when available.
- **Gate 3 — Domain adapters:** connect actual Store and ShortStays
  apps to the tested single launcher with their existing UI preserved.
  Validate inventory/room holds independently, and resolve ShortStays
  deployment security blocking updates before claiming a live app preview.
- **Gate 4 — Expansion preparation:** My Ride must own its trip/fare/
  driver match; Storage its space/term/access; Estate its approved invoice,
  KSNumber/gate scope and privacy policy. Do not change
  `varsity.estate.ke` or its management workflows without a verified
  source-controlled prototype comparison.
- **Final Phase 5 gate:** owner tests one Mini launch/return across the
  distinct host personalities, reopening, unknown result, unavailable
  iframe, malicious message, small mobile screens, and host isolation.
  No production money moves until separate provider and SecurePayAPI
  certification.

## Focused verification

`tests/securepay-mini-phase5-shared-host-bridge.test.mjs` exercises both
host configurations, exact iframe reference, popup reopen without new
checkout, safe return states, forged/mismatched events, blocked unknown
host/path/fixture, official branding, no actual backend operations and
three new Vite HTML preview entry points.

The existing Phase 0–4 Mini focused suite remains present and is still
executed alongside TypeScript and Vite build.

**Gate 1 ends at owner review; this preview is not production authorization.**
