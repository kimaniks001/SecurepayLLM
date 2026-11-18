# SecurePay Mini — Collect Money C1 (18 November 2026)

## Product and branch boundary

This work belongs to **SecurePay Mini**, not Living Workspace and not the older SecurepayUI.
The isolated route `#/preview/mini/collect` is permitted only on Vercel preview hosts or local development hosts.
It does not replace any existing Home, Buy, Sell, Money, merchant or invitation route.

## Existing-work audit

- `SecurepayLLM` contains prior Mini-relevant branches, including
  `feat/day11-mini-collect-for-someone-conversation-20261112`,
  `feat/day11-agreement-commerce-mini-unification-20261112`, and several Buy/Sell branches.
- The main frontend has a canonical Agent/Agreement/Money experience and a distinct Living Workspace preview.
  No dedicated, integrated Mini Collect route was found on main.
- The backend remains authoritative for identity, Agreement creation/version/confirmation,
  collection obligations, payment status, custody, eligibility, payout and refund execution.
- C1 does not import old SecurepayBDUI UI or mutate the shared Money architecture.

## C1 — implemented human journey

1. Warm, phone-first entry: "Let's make something happen."
2. Six understandable purposes: buy together, get paid, recurring, groups/rotations, giving, future goals.
3. One contextual question per purpose with large, accessible answer pills, rather than a blank financial form.
4. After a choice, a short opportunity reveal specific to that purpose, with no invented checks or assurance.
5. A human-readable "Your idea is taking shape" summary showing the selected path and what SecurePay could prepare.
6. Governance preview: purpose-specific safeguards, plus explicit notice that financial-provider fit must be established later.
7. Easy back/change/explore-another flow; no typed input and no storage or backend writes.
8. Existing brand and quiet green/cream design language; mobile-first spacing and keyboard focus.

## Deliberate C1 limits

- No Collection, Agreement or SecureLink is created.
- No KSNumber lookup, store availability, group member verification or bank capability is simulated as a fact.
- No live balance, payment, refund, payout, investment, receipt or collection total is shown.
- The review is not an accepted Agreement or a permitted payment instruction.
- The feature route is explicitly preview-only; production is unchanged.

## C2 exit requirements

Before C2 can enable contribution requests, a **server-authoritative** governed collection must
identify the collector and beneficial recipient, require proper authority, purpose and donor/
contributor rights, and document valid approvals and versioned rules. Minimum schema:
collection purpose and source refs, accepted participants and roles, contribution policy,
target, start/end and auto-stop conditions, over-/underfunding outcomes, extension and
cancellation mandates, fees, recipient and account/provider capability checks, refunds,
unclaimed balances, disputes and immutable audit trail.

Different kinds must retain their distinctions: a church offering is not automatically
refundable; an education goal is not permission to invest; group purchase contributions
may require conditional refunds; a mere claimed debt is not an accepted obligation.

## C3–C8 dependencies, not inferred in C1

C3: provider eligibility/capability and legal custody checks.
C4: source-bound SecureLinks and real verified collection summaries.
C5: collection varieties, school/church/transport/trainer/store/group scenarios.
C6: basket Fair Trade examination including item availability/reservation, deadline, price.
C7: governed payouts, surplus returns and optional regulated financial services.
C8: backend/financial/security/concurrency, lifecycle and 20-person acceptance tests.

## Validation

Focused source-boundary tests: `node --test tests/mini-collect-c1.test.mjs`.
Repository gates before merge: `npm run typecheck`, `npm run build`, and focused tests.
Validate mobile touch/focus and keyboard navigation in a real preview before approving UI.
Do not claim build, production, banking or end-to-end certification from static tests alone.
