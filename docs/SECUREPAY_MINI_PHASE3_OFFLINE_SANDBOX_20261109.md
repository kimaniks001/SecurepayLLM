# Phase 3 — Explicit Offline Sandbox Lane

**Created:** 9 November 2026  
**Scope:** Owner-only preview, stacked on Phase 3 Gate 1 PR #250. No SecurePayAPI / Store production mutations and no real money.

## Why

The Store's public API is currently inaccessible from the Vercel preview. That blocks real published offer review but **must not stop user-experience testing or unrelated checkout development**. Fictional data must never silently replace an actual Store listing.

## Two clearly separate routes

**Real-source lane:** `/checkout-store-offer-preview.html` attempts a read-only SecurePayAPI Store search. If the API is down, it **reports unavailable and continues to fail closed**. It never switches an existing published-offer token to a fictional record.

**Explicit simulation lane:** the same page now offers separately labelled links to `/checkout-demo-store.html` and `/checkout-demo-shortstays.html`. Both use the *same* SecurePay Mini, via a server-issued, encrypted, five-minute sandbox fixture reference. This is an opt-in demonstration only, without browser-supplied prices, identity, signed Agreements, inventory holds or booked accommodation.

The preview-only server issuer is activated on the **exact isolated branch** `feat/mini-phase3-explicit-sandbox-lane-20261109`, and the encrypted `MINI_CHECKOUT_PREVIEW_SECRET` is **Vercel branch-scoped**. The separate real Store review endpoint retains its own independent branch-scoped secret, with the public Store API availability check unchanged. Production/main and other branches do not inherit this activation.

## What owner can test

Store Pay → same Mini → reviewed sample transaction → Choice Bank/M-Pesa/PesaLink **simulations** → fictional provider response → return to Store labelled **NOT PAID**. ShortStays Book/Pay follows the same sequence. KS001 remains optional and never a required checkout step.

## What is still NOT complete

- No genuine server-created customer Store order, authenticated buyer or inventory reservation.
- No legitimate accepted/versioned SecurePay Agreement or host order→Agreement binding.
- No live money provider, quote, debit, escrow, provider confirmation, refund, release or settlement.
- No verified live Store offer API access from this preview.
- No certified third-party embed, signed callbacks or actual ShortStays booking hold.
- The sandbox is **not** an automatic fallback: owners must deliberately choose it.

## Build evidence

`tests/securepay-mini-phase3-offline-sandbox.test.mjs` checks five core boundaries: exact preview-branch isolation, encrypted references for two fictional hosts, no fabricated results during live upstream outage, one shared Mini/rail UI, and no payment authority.

Preserve all previous tests and locked three-panel SecurePay UI. Owner acceptance remains distinct from automated build checks.

## Next technical gate

**Phase 3 Gate 2:** design and implement SecurePayAPI-owned **StoreOrder ↔ Agreement** authority in a separate backend branch. The simulated contracts can define behaviours and test UI while the backend is unavailable, but cannot confer real signing or funding power. When live Store source is restored, replace the simulation only after backend evidence proves verified identity, versioned order and accepted Agreement.

Do not merge this sandbox into production or enable real rails without explicit owner and provider authority.
