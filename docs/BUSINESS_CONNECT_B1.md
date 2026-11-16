# Business Connect B1 — cross-platform consent gate and Knowledge Centre boundary

**16 November 2026. STATUS: PARTIAL IMPLEMENTATION / NOT DEPLOYED / NOT CERTIFIED.**

## The problem solved in this slice

SecurePayAPI's existing public Store search exposes published offers but does
not establish a business owner's permission to be promoted in Shortstays,
Varsityville Estate, My Ride, Storage, or unrelated applications. The B0
Shortstays façade has therefore been hardened to require a **fresh SecurePayAPI
distribution eligibility check** before showing a merchant or allowing an
explicit "Use this" source handoff.

B1 introduces:
- `src/integrations/business-connect/governed.ts`: typed backend-bound
  NetworkPublicationAuthority; fail-closed, per-offer/per-surface discovery and
  repeat check when the guest selects.
- `src/integrations/business-connect/shortstays.ts`: consumes the governed bridge
  rather than the bare public Store search. Does not alter Shortstays Prototype 4.
- `src/integrations/business-connect/knowledge.ts`: private-by-default merchant
  teaching draft validation and a read-only projection of already-approved,
  merchant-scoped Store Guide knowledge. Assistant-only instructions are
  separated from customer-visible facts; merchant-private records stay private.
- `tests/business-connect.test.mjs`: merchant consent withdrawal, expiration,
  incorrect audience, API failure, and merchant knowledge isolation tests.
- Separate SecurePayAPI **contract-only** draft:
  `contracts/openapi/business-connect-publication-v1.yaml` (in
  `kimaniks001/SecurePayAPI`, separate branch).

## Backend requirements before Shortstays activation

The API draft must be reviewed and implemented with persisted, audited,
representation-authorized merchant permissions, default opt-out, version
conflict handling, active paid seller entitlements, category restrictions,
site-level distribution, revocation, and short-lived non-sensitive eligibility.

IMPORTANT: The B1 TypeScript connector requires a live implementation of
`NetworkPublicationAuthority`; it deliberately does **not** supply an
always-yes fallback. Without it, the integration stays inactive. A
published Store on the public endpoint alone is NOT eligible for broad
cross-application publication.

The API must recheck permissions when the customer proceeds from a selected
source to a consequential agreement. A fresh GET projection is not agreement
authority, verified delivery, or Payment Ready.

## Store Guide knowledge authority

The `knowledge.ts` module is a pure client shape and validation utility. It
does NOT provide persistence, verified sources, review workflows, an AI
model, or a live customer assistant. SecurePayAPI must:
- bind documents to a verified merchant, reviewer and provenance;
- provide a private draft/review/publish/revoke lifecycle;
- apply access controls, prompt-injection defenses and strict tenant isolation;
- keep stock/price verification in canonical store feeds and never
  substitute assistant memory;
- keep private KRA, Money, customer bookings and agreements out of public
  retrieval.

## Focused validations required on complete repository checkout

- `npm run test:business-connect`
- `npm run typecheck`
- `npm run build`
- Review changed code for multi-tenant privacy, stale publications and
  source-of-truth integrity. Follow API doctrine and migration requirements.

## Next engineering sequence

1. Implement, audit and certify SecurePayAPI B1 merchant permissions and
   generic distribution eligibility (separate backend PR).
2. Wire the new authorized gateway into the Shortstays-approved Prototype 4
   shopping/assistant journey, preserving its look and checkout-at-payment rule.
3. Make a documented merchant test store opt in, add a verified solar floodlight
   offer, and test Shortstays discovery -> explicit source selection ->
   agreement review. Do not execute real Money.
4. Implement server-based Business Knowledge Centre curation, merchant review
   and Store Guide retrieval; then SecureLink communication and mini Inbox.
