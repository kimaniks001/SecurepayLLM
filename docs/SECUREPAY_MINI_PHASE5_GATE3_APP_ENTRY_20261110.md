# SecurePay Mini — Phase 5 Gate 3: real app entry, owner simulation

**10 November 2026 — Development only, SecurePayAPI unavailable.**

## Scope

Gate 2 signed owner-preview host tickets stay intact. This gate adds a
**preview-only entry from the actual SecurePay Store application** and the
separately owned ShortStays booking application. Both continue to the
**same registered fictional host** and **same Mini** developed in Gates 1–2.

There is NO genuine Store order/acceptance and NO signed ShortStays room
hold, and the checkout **must not** misrepresent a browser offer or booking
as authoritative. Browsers do not send prices, real offer IDs, booking
codes, guests or account data to the simulated host issuer.

## SecurePay Store app

- Actual `StoreExperience` still renders the approved `StoreHome`,
  catalogue search and real Offer → Agreement preparation unchanged.
- In the feature-flagged development branch, a small inline
  **Test SecurePay Mini checkout** section links to the registered
  owner-preview Store host; this is NOT a product-specific Pay button.
- Gate: `src/mini/phase5OwnerHostAppAdapter.ts` selects only one
  exact vetted SecurePay Preview origin and fixed host path. It
  ignores merchant, amount, offers and unrelated host types.
- Feature flag `VITE_MINI_PHASE5_OWNER_APP_TEST=phase5-gate3-owner-test`
  is defined only in this Git branch's **Vercel Preview** environment,
  absent on production.
- Link opens a separate tab so original Store search/work is retained.

## Same-origin preview host behaviour

- Gate 3's `public/securepay-mini-phase5-host-bridge.js` recognises
  the explicit `#owner-sample` navigation hash and automatically requests
  the existing Gate 2 **signed preview-only ticket**.
- Hash carries **no price, source reference, identity or payment status**.
- The issuer remains restricted to the two registered SAME-ORIGIN
  Store/ShortStays test paths, exact preview branch, preview-only secret,
  origin and fixed fixture version.
- `#owner-sample` removes a second click on the *sample* host only.
  It does not change the Mini, initiate payments, give settlement
  authority or mark a host paid. All unknown and expired outcomes stay
  fail-closed.
- Dedicated `MINI_PHASE5_HOST_PREVIEW_SECRET` exists only in this
  Git branch's **Preview** environment. Gate 2 branch uses a separate
  secret; neither is production.

## ShortStays app

- The actual `guest/bookings/$bookingCode` details page adds a
  compact, flag-gated owner test entry beside existing SecurePay status.
- It opens the **same** ShortStays reference-host sample,
  not the guest's actual booking.
- Does NOT send the booking code, dates, guest, room or actual amount.
  It does not bypass the existing browser preflight, which remains
  review-only until authenticated ShortStays server-side hold proof.
- The separate ShortStays branch is:
  `feat/shortstays-phase5-gate3-mini-app-adapter-20261110`.
- TanStack Start patch: pinned `@tanstack/react-start@1.168.60`,
  matched Router `1.170.41` and plugin `1.168.42`,
  rebuilt Bun lock pinned to patched `@tanstack/start-server-core@1.169.39`.
  Vercel's critical XSS policy must stay enforced; never set any
  `DANGEROUSLY_DEPLOY_*` bypass.

## Acceptance and outstanding gates

The owner should navigate to the real Store and actual ShortStays booking
preview, select the sample checkout entry and observe Mini open
automatically on the separate registered reference page. From Mini:
review both parties, choose sample payment method, try unknown,
close/reopen, and verify no host becomes Paid or Booked.

**Not delivered by this simulation:** actual full cross-origin embedded
Mini SDK, real host-to-SecurePay authenticated issuing, store stock
reservation, guaranteed room hold, signed Agreement, participant KYC,
provider payment/escrow/settlement or booked stay. These need
independently verified SecurePayAPI and host server authority.
The existing Store and ShortStays UIs are unchanged for unflagged
users and their production websites remain untouched.

**Gate 3 is owner-testable application entry, not real provider or
cross-domain payment certification.**
