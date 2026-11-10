# SecurePay Checkout Imprint — canonical brand and destination rule

**10 November 2026 · owner request: every checkout carries the SecurePay logo with a link to the main site or an approved Community page.**

This rule applies to **every platform checkout using SecurePay Mini**:
Store, ShortStays, Varsityville Estate, My Ride, Storage and future
merchant/community shops. It is an attribution and navigation affordance,
**not** a provider certification, funded status, warranty, guarantee or
transfer of the host page's control to SecurePay.

## UI rule

1. Reuse **unchanged original brand asset**
   `public/brand/securepay-mark-green.png`, canonical source
   `src/assets/brand/securepay/securepay-mark-green.png`.
   Do not regenerate, recolor, redraw or substitute a generic shield.
2. The Mini header carries the canonical mark and existing wordmark as a
   clickable link. A second small `Checkout by SecurePay` imprint remains
   in Mini's footer through agreement review, funding choice, error, return
   and recovery screens. The Mini still works without opening KS001 chat.
3. The merchant host places the same canonical mark next to its Pay/Book
   checkout button or equivalent checkout entry, without disturbing the
   host's original branding/structure. The linked mark is **not** a second
   checkout button.
4. Default official destination is **`https://securepay.ke/`**.
   When a community checkout should link to its Community page instead,
   that exact HTTPS destination must be an **approved existing page**
   supplied by a trusted SecurePay/host configuration, ideally from an
   authenticated, server-owned community mapping. Never trust a browser
   `postMessage`, merchant-entered checkout query parameter, shortened URL
   or arbitrary redirect as a brand destination. No unverified Community
   URL has been guessed or activated in these previews.
5. External navigation opens in a **new tab**
   (`target="_blank" rel="noopener noreferrer"`). A customer who clicks
   the mark keeps the original checkout and agreement state open.
6. Always include readable accessible text, focus styling, unaltered
   logo PNG and compact mobile behaviour. Do not call an unfunded
   simulation `SecurePay guaranteed`, `fully protected` or `paid`.

## First implementation

- `src/mini/MiniExperience.tsx` — canonical official mark instead of
  generic shield as header logo; linked header and footer imprint across
  all Mini routes and embedded checkout states.
- `src/mini/mini.css` — unobtrusive, responsive imprint formatting.
- Nine existing checkout/offer-review sample host HTML pages, using
  `checkout-demo.css` — one canonical brand link adjacent to the
  checkout/review call to action. The approved Store and ShortStays
  page identities remain independent.
- `tests/securepay-mini-checkout-brand-link.test.mjs` — enforces link
  correctness, asset presence, safe external navigation and coverage
  across all `checkout-*.html` files, and is included in the existing
  Mini focused CI build gate.

## For future partner-host SDK

The public SecurePay Mini SDK should supply an official `brandImprint`
component with a required verified `destination`. Use the official
asset either bundled unmodified in a connected host or served from a
SecurePay-controlled, authenticated asset host. Do not copy preview-only
relative assets to external domains without publishing them there.

The actual booking/Store order/Agreement/payment integrations remain
subject to their separate source-truth and provider-certification gates.
This PR does **not** enable payments, customer funds, or booking.
