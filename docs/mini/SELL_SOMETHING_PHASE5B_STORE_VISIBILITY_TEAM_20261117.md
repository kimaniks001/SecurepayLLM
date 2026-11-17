# SecurePay Mini — Phase 5B: Store visibility and team authority
17 November 2026 · stacked draft · **not production certified**

## Product behavior

Mini's approved Buy/Sell visual language and the seller's three exits stay untouched. The new controls live one layer down in **My Store → Store settings & permissions**.

### What the seller can actually control

Every authenticated Store owner sees which offers are public and which are private. Each public listing has **Make private**, followed by an explicit **Keep public** / **Yes, make private** confirmation.

The client re-authenticates, checks active Business representation if applicable, reloads the exact owned Store offer from the server, compares its title, description, price, kind, quantity, media references, availability and server `updatedAt`, and submits a version-fenced `make-private` command. The backend owns the final decision and updates the published flag atomically; a stale edit, missing seller consent or other owner's offer cannot be hidden. The seller sees a verified receipt or a clear uncertainty message and is prompted to refresh, **never** an invented success.

Making private does **not** delete the offer, revoke a link already posted somewhere, cancel an existing Agreement, withdraw consent from another service or imply stock/rights certification. Public Store search and exact public offer read use `published = TRUE`, so withdrawing this flag prevents new listing discovery on next server read. Historic Agreements stay immutable.

This deliberate *withdrawal* applies even to older media or quantity-bearing offers. Their later *republication* must still satisfy the separate media/stock rights and migration gates. It is never a quick “turn it back on” switch.

### Business team access — read only

After verified Business representation, Mini uses the **existing** Business Organization ID and the server's caller-scoped `authoritySummary(organizationId)`, then authenticated `members(businessKsNumber)`. It shows only active/total membership counts and whether the caller's verified permissions include `ORGANIZATION_MANAGE_MEMBERS` or `ORGANIZATION_ASSIGN_ROLES`; it never claims a Store editor can sign a Business Agreement or authorize Money.

These permissions are not self-certified by Mini. We deliberately do NOT enable new team invites, role changes, protected-action approvals or Business Agreement signatures in this slice. Role assignment is maker-checker and needs a separate workflow and backend evidence. Failed/mismatched reads show unavailable, not fabricated staff.

### Consent boundaries

The published flag controls public Store discovery only. Estate visibility, community-directory listing, cross-app recommendations, eTIMS connections and notifications are **separate opt-ins** requiring their own real consent/authority API. Neither an unchecked consent pill nor a client-side toggle has been presented as a working preference.

### Verification and rollout

- Frontend branch `feat/mini-sell-phase5b-store-visibility-authority-20261117` stacks on Phase 5A PR #330.
- Backend branch `feat/mini-sell-phase5b-private-store-cas-20261117` stacks on Phase 4 API PR #476.
- Focused JS tests assert revision freshness, receipt validation, explicit confirmation, server representation checks, no mock community opt-in, and read-only staff access.
- Backend unit tests were added for consent and revision validation, stale/conflicting owner updates, and already-public withdrawal with existing media/quantity; **Java 21, Flyway and real PostgreSQL concurrency tests were not run in the connected repositories**.
- The strict legacy Store publication gate must remain OFF until its old clients are certified. Both PRs stay draft and unmerged. No production Store, Agreement, Money or membership operation was initiated.

## Later Phase 5

Scoped Business member invitations; actual authority-backed approval inbox and role changes; real Business subscription entitlement and plan confirmation; voluntary community-directory/privacy controls; eTIMS opt-in and buyer PIN/billing attribution. Each is a separate, explicit user choice rather than one large technical Settings wall.
