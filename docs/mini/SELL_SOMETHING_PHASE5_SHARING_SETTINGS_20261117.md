# SecurePay Mini — Sell Something Phase 5 / Slice A
17 November 2026 · stacked draft, no production change

## Approved direction retained

Mini is the principal SecurePay experience. Do not redesign its agreed Sell Something composer, answer pills, Fair Trade examination, or three exits:

- **Share with buyer** — seller reviews the current canonical Agreement and explicitly authorizes sharing; buyer independently reviews and confirms
- **Add to my Store** — private first, reviewed text-only publication, no invented stock or uploaded media rights
- **Save for later** — local written draft, no implicit Offer or Money authority

Seller never has **Connect to Money**. Funds follow the Agreement, from the payer's own explicit decision.

## Phase 5A work on this branch

### 1. One SecureLink, two ways to pass it on

After the **real** server issues a non-null HTTPS `publicUrl` for the exact canonical proposed Agreement, Mini offers:

- **Copy link** (default simple option)
- **Share link** (native OS/browser share sheet, when available)
- **WhatsApp** (deliberate user click into the WhatsApp composer, no automatic recipient or message send)
- **Show QR** (quiet alternative for face-to-face trade; uses existing `SecureLinkQrCode` from the shared SecureLink feature)

All four use the **exact same server-issued publicUrl**. The browser never reconstructs, modifies, shortens or invents a SecureLink; the QR is only rendered after a usable returned URL exists. Scanning or opening never joins, accepts or pays. `Share` returning only means the share UI closed; it is not proof of buyer delivery.

The isolated owner preview shows delivery controls and a large QR *icon* to review appearance; it never generates a scannable test link or QR.

### 2. Onion-layered Store settings / actual authority

Inside **signed-in Mini → My Store**, owners can open *Store settings & permissions* without leaving their current Store. This is a read-only layer:

- Public vs private offers and those needing availability confirmation come from the current authenticated Store records.
- For Business context, `BusinessGateway.representation(businessKsNumber)` is checked live and must return matching identityType BUSINESS, canActFor and ADMINISTRATOR before displaying a verified representation message.
- `SubscriptionGateway.myStatus()` reads the user's actual subscription, including server-reported price, plan and status. This is **not** proof of a Business-linked billing entitlement and never silently authorizes subscriptions or payment.
- Missing/failed data displays **unavailable**, not fake activation or a demo plan. Opening settings does not publish anything, invite anyone, select a plan, transfer money, accept a Business Agreement, or share private information.

Existing `MiniBusinessSettings` demo remains clearly fictional and is not used as live authority. Actual Business Agreement creation remains separately gated.

## Checks / release boundaries

- New Phase 5-focused tests enforce server-only link URLs, no second QR Agreement, no automatic send/accept/pay, accurate caller authority, and read-only subscription truth.
- Phase 5 branch is stacked on Phase 4 frontend draft PR #329, which is stacked on Phase 3 draft PR #328.
- Full Java 21 / PostgreSQL / regulated provider and real end-to-end account test gates remain unchanged and unpassed; Phase 5 cannot be construed as production readiness.
- Visual review should use the *Mini* entry `/mini.html?miniTradeDemo=1&sellPreview=1`, never the root Living Workspace. This preview includes no real financial or invitation action.

## Next Phase 5 slices

After this first verified slice: separate seller-facing optional Store discoverability/visibility settings, Business team access and authorized role management, subscription/billing controls that reflect real server entitlements, eTIMS opt-in and verified record handling. Each needs an authenticated backend authority contract, explicit consent, and its own tests; no fabricated success toggles.
