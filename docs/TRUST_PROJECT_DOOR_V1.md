# Trust Project Door V1

## Decision

SecurePay now has two public entry intents but one underlying product:

- **SecurePay door**: typing `securepay.ke`, opening a SecureLink, agreement invitation, Money route or other SecurePay action continues into the existing SecurePay experience.
- **Trust Project door**: `/trust` (with `/trust-project` and hash aliases accepted for compatibility) opens a distinct Trust Project welcome before Join.

This is **two doors, one house**. It does not create a second account, identity, membership authority, Store authority, Money authority or signed-in application.

## Trust invitation flow

An ACTIVE member's human share link now points to:

`https://securepay.ke/trust?interest=member|plug|master`

The interest remains presentation-only. It carries no inviter identity, membership, referral entitlement, reward, Plug/Master status or other authority.

From the welcome door, **Join the Project** hands into the existing `#/join` experience. The existing Join controller still requires explicit acceptance of the current 12 Principles. Signing in by itself never joins anyone.

## What remains unchanged

- SecurePay root Home and KS001 entry
- SecureLinks and their clean-path routing
- Agreement invitation routes
- Sign in and KS identity issuance
- Join controller and membership state machine
- Community, Circles and Stores
- Money and Agreement authority
- Business/Organization representation
- Referral economics
- Signed-in navigation and AppView model

## Product truth

The public Trust door introduces the member proposition: fair trade, life planning, belonging, opportunities, community projects, learning and purposeful contribution. Examples are labelled as examples; the page does not promise guaranteed income, guaranteed work or investment outcomes.

## Deployment note

The clean `/trust` path needs the same SPA fallback behaviour already required by existing clean SecureLink routes. If the edge/web server uses a path allow-list rather than a generic SPA fallback, add `/trust` and `/trust-project` to it before production release.
