# SecurePay Gate 6 — Final tester release handoff

**29 October 2026 — DRAFT, NOT CERTIFIED, NOT DEPLOYED**

## Source and release intent
This final UI release candidate is based on the complete integrated Gate 5 UI
`fa195d4eefb593c96602ec0f5264f08957968059`, including the approved
three-column Living Workspace, KS001, source/media status, Community, Circle,
Agreements, security/identity and Money read-only flows.

Its companion Gate 6 API candidate is API PR #378, starting at
`ef041b3cd8a7f1ecbc02cbb2df1cee01ed288db5`. **Do not use the
previous Gate 5 API SHA as if it contained the owner-approved pricing fix.**
Any new preservation patches and test corrections must be committed to the
respective branches, and the final paired SHA receipts must then be recaptured.

The old stacked draft PRs are source ancestry, not separate commits to merge
again. This is a candidate for **one final UI PR to main**, subject to evidence.

## Commercial rules for testing
- A contract at or below KES 20,000 has a KES 20 SecurePay fee.
- Above KES 20,000 the fee is KES 20 plus 1% of only the excess.
- The API is the only authoritative calculator; the UI must consume its
  version-bound price, payee and fee-bearer disclosures. No local copy of a
  different capped or 0.2% schedule is allowed.
- Existing KES 5m automatic-quote limit remains fail-closed independently
  of this tariff.
- Historical accepted quotes must never silently be repriced.
- Subscriptions, Review Reserves, verification, contribution fees and
  payment-provider charges remain separately represented.

## Required real non-financial acceptance

1. Visitor intention (“i want to plan for a trip to Nakuru”), useful
   continued KS001 questions, sign-in/retry continuity, no bogus correction
   failure or silent blank response.
2. Real disposable bill/photo/PDF upload status, explicit Add to KS001,
   provider-backed source understanding with uncertainty and Fair Trade
   questions; draft/Agreement/recipient/source distinctions and a shareable
   non-funded SecureLink.
3. One organiser and twelve distinct participants, four deliberate selections
   and independently consented Agreements, other eight with no Agreement
   authority.
4. Circle participant-only coordination, evidence, beneficiary confirmation,
   cross-user denial, and correct backend Agreement versus Circle separation.
5. Consented project publication with no private evidence, contact details,
   location metadata or Agreement money leakage.
6. Two-account KS signup/activation/quote checks, account-swap rejection,
   1440/390/320px mobile proof, no real charge/rail/payout.

## Evidence and operations
- Re-run `npm ci && npm run typecheck && npm run test:final-convergence
  && npm run lint && npm run build` on the exact final UI SHA.
- Run existing Gate 2, Gate 3, Gate 4, True North Gate 7 and Gate 5 real
  evidence evaluators on the final paired commits. Synthetic green badges
  cannot substitute for actual provider, Java and independent identity receipts.
- UI Actions previously failed: workflow runs 40685623822 and 40685623942.
- API Actions previously ended in startup_failure without jobs:
  40685733965; inspect actual new API runs.
- Vercel Gate 5 preview was READY, but the project reported SSO protection
  on previews. External tester access must be exercised by a real authorised
  test account through a safe access route, without exposing production.
- Record a compatible staging DB + API/UI rollback plan, health checks,
  safety flags, logs, integration receipts and independent review.
- **Financial execution must stay disabled at server and UI level**:
  no activation collection, real settlement, release, bank rails or payouts.

## Release rule
Until all mandatory actual full-stack, privacy, provider, pricing and owner
approval evidence is present, this PR remains DRAFT/NO-GO. Do not merge,
deploy into production, weaken authentication or claim that a Vercel READY
preview means that the complete product is ready.

When proven, present exact final API/UI SHAs and a single concise owner GO
decision; only then merge once per repository and deploy controlled tester
access with separate live-money approval.
