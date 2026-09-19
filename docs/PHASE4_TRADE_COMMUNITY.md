# Phase 4 — Trade & Community World

Branch `feat/final-phase4-securepay-trade-community`, based on `origin/main` at
`c666287` (includes merged Phase 1 PR #20, Phase 2 PR #21 + correction PR #23, and Phase 3 PR #22
with both of its correction passes).

Governing idea: **a source is context, not authority.** People discover value in Store offers, the
Community's honest wrapper over that same Store, and their own real network activity — SecurePay
helps them turn that discovery into a clear Agreement without losing where it came from, but a
source fact never becomes an Agreement fact until it is explicitly adopted and reviewed. "Use this"
means "take this as useful context," never buy/accept/join/agree/hire/pay/confirm/settle/authorize/
recommend.

## A. Archaeology

The task prompt describes a rich Trade & Community journey — named Circles with membership and
economic activity, Question/Need/Opportunity/Work Story/Discussion objects, a `COMMUNITY_KNOWLEDGE`
source pipeline distinct from Store. **Direct source reading plus `docs/PRODUCTION_MIGRATION_LEDGER.md`
sections 17 (Community+Circles) and 18 (Referrals+Plugs+Masters) confirm most of that journey is
fictional relative to what the backend actually establishes** — the prompt's own instruction ("do not
assume the prompt accurately describes what is built") is directly load-bearing here, not boilerplate.

**Real, production-backed, customer-facing:**
- **Store** (`src/features/store/StoreExperience.tsx`): full discover → offer detail → explicit
  "Use this" → Trade Taking Shape handoff. Real search, real offer/store reads, real trader-owned
  offer management (`create`/`update`/`confirmAvailability`). No "Buy now" anywhere; no Agreement
  authority is ever created here.
- **Circle** (`src/features/circle/CircleExperience.tsx`): `GET /api/v1/circle/me` only — 8 fields
  (`canonicalKsNumber`, `displayName`, `verificationStatus`, `memberSince`, `referredTraderCount`,
  `activatedReferredTraderCount`, `agreementsBroughtInCount`, `growthCreditTotal`, the last of which
  is deliberately never surfaced by the adapter). **No named-Circle/group authority exists on the
  backend at all** — not a small gap, a deliberate, documented product boundary. `growthCreditTotal`
  is a plain activity count, never money.
- **Community** (`src/features/community/CommunityExperience.tsx`): a bounded, truthful composition
  over the already-productionized Store search — the only real Community content object is a Store-
  offer reference (`storeResultToCommunityObject`). No backend persistence exists for Question/Need/
  Opportunity/Work Story/Discussion. People/business discovery has no standalone directory (only
  Agent tool calls). Opening a Store-offer-reference card hands off through the real Store feature's
  own `openOffer` — never a parallel provenance path.
- **SourceReference** (`agent/controller.ts`'s `useOffer`/`attemptOfferSelection`): calls
  `gateway.selectCommercialSource(conversationId, {sourceType, sourceId, sourceOwnerKsNumber})` →
  `state.source`, shown as "Started from: X," never Agreement/CONFIRMED truth. Only
  `sourceType: 'STORE_LISTING'` is wired and backend-confirmed. `SourceKind`'s
  `'COMMUNITY_KNOWLEDGE'` value exists in the enum but is confirmed, deliberately unwired — no real
  Community content object exists to justify a second adoption engine.
- **Plug** (`src/features/plug/PlugExperience.tsx`): full customer-side flow real and wired —
  `createRequest` → `candidates` (opaque `{candidateRef, interestedAt}` only, no name/domain/
  geography) → `selectCandidate`/`confirmSelection` → `openRelationship` → `relationshipRef` →
  `POST /agreements/{id}/plug-attribution`. No "become a Plug" UI exists (no design for it).
- **Referral** (`src/features/referral/ReferralExperience.tsx`): the real R11A generic referral-code
  system (`myCode`/`myHistory`/`redeem`), genuinely distinct from the per-Agreement KeyContract
  Plug-attribution referral state read from inside `PlugExperience.tsx`. `rewardPaid` is always
  `false` in the verified backend today — no payout authority exists anywhere in the frontend.
- **Master** (`src/features/master/MasterExperience.tsx`): full non-dispute lifecycle real
  (`REQUESTED → COST_PROPOSED → ACCEPTED → OPINION_SUBMITTED`, `DECLINED`/`CANCELLED` terminal). No
  Master directory/search (`identityId`-only lookup by reference). Confirmed backend gap:
  `MasterAuthorityException` has no `@ExceptionHandler`, so every Master mutation authority violation
  surfaces as an unhandled 500 — correctly treated as one generic closed message everywhere, never a
  guessed specific rule.
- **Entry points already fully wired**: `TradeHelpPanel.onReferrals` → `ReferralExperience`;
  `CommunityHome`'s "Help this trade happen" → `EcosystemExperience`; `AgreementSupport`'s "Referral &
  Plug attribution" → `WorkspaceExperience.onOpenReferral` → `EcosystemExperience` with the real
  `agreementId` in scope.

**Fixture-only, correctly never imported by real routes**: Bolt's `CircleHome`,
`CircleDiscoveryList`, `CircleMemberDirectory`, `CircleEconomicSummary`, `CircleCreateFlow`,
`CircleJoinFlow`, `ReferralHistoryView`, `PlugProfileCard`, `MasterProfileCard`,
`MasterRequestView`/`MasterOpinionView`, `CommunityComposer`, `CommunityDiscussionCard`,
`CommunityStoryCard`, `CommunityResultCard` — each assumes backend authority (named groups, posted
discussions, a browsable Plug/Master directory, reputation scoring) that does not exist. Confirmed via
`node --test` (`T`/`T2` in `community-circles.test.mjs`, `AH` in `referrals-plugs-masters.test.mjs`)
these still render byte-identical against the Bolt baseline and are never reachable from a real route.

**Structurally complete but visually weak (fixed this phase, see C)**: every real Trade-world feature
file (`CircleExperience`, `CommunityExperience`, `EcosystemExperience`, `ReferralExperience`,
`PlugExperience`, `MasterExperience`) had zero Phase 1 DNA primitive usage — correct on-token colors
(`cream`/`forest`/`ember`/`sand`, no raw orange/red drift), but every card/button/notice was hand-
rolled Tailwind predating the Phase 1 visual constitution, rather than `Surface`/`Button`/
`StatusNotice`/`PageHeader`/`MoneyValue`. `StoreExperience.tsx` was the one exception — it is a pure
router over Bolt-locked fixture components with no raw markup of its own, so it needed no change.

**Genuine presentational bugs found (fixed this phase, see C)**: `ReferralExperience.tsx` and
`PlugExperience.tsx` (referral-reward display) and `MasterExperience.tsx` (quoted-cost display) all
rendered a minor-unit money amount raw — e.g. "50000 KES (minor units)" — instead of dividing by 100
and formatting like every other money value in the product.

**Deliberately, correctly missing (not gaps to fill)**: named-Circle group system; Community content-
object persistence; a backend read endpoint for post-Agreement-creation SourceReference provenance
(confirmed absent — `TradeEntityView`/`TradeRelationshipView` strip `sourceKind`/`sourceDescription`
before the wire, see D); `COMMUNITY_KNOWLEDGE` wiring; a Master directory/search; a rich Plug profile
(name/domain/geography/availability); Formal Solutions/Partners (already gated behind an honest "not
available yet" notice, pending human confirmation per prior-phase doctrine).

## B. Trade-world mental model

**Discovery happens in many places → a source is context, not authority → an explicit "Use this"
carries that context (never a decision) into the real Agent conversation → the conversation
progressively understands new facts on top of it → review → Agreement.** Concretely: Store offers are
the one real, backend-attributable discovery source today; Community is an honest, narrower window
onto that same Store, never a second authority; Circle is the person's own real, factual network
activity, never a named social space; Plugs and Masters are backend-verified relationship/expertise
primitives with real (if narrow) lifecycles, never directories or reputation systems. Nothing in this
world ever creates, joins, confirms, or pays an Agreement on its own — every one of those verbs stays
behind the real Agent/Agreement/Money authorities untouched by this phase.

## C. Store/Community/Circles changes

No architecture, authority, or copy doctrine changed in any of these three features — all were
already correct per the ledger and per direct reading. What changed:

1. **DNA convergence** (`CircleExperience.tsx`, `CommunityExperience.tsx`): every raw
   `rounded-2xl border border-cream-200 bg-white px-5 py-4` card became `<Surface><SurfaceBody>`;
   Circle's page header (`<h1>Your Circle profile</h1>`) became `<PageHeader title=... />` (its
   back-button stayed a plain custom element above it — `PageHeader` has no back-button slot, and
   inventing one would be new API surface for a single call site); Community's/Ecosystem's inline
   notice bar (`role="status" bg-cream-50` div) became `<StatusNotice tone="info" icon={false}>`,
   which derives the same `role="status"` automatically from its tone.
2. **Nothing else changed.** Circle's retired-gamification doctrine comment and disclaimer footer
   ("Referred trader count ≠ followers...") are untouched. Community's honest search-placeholder/
   empty-state copy and `circlesEntryDescription` are untouched. No new Community/Circle screen,
   object type, or action was built — building one would mean inventing backend authority that does
   not exist, which section A's archaeology explicitly rules out.

## D. SourceReference — snapshot, provenance, staleness

Confirmed the full, real provenance lifecycle already exists and is unchanged by this phase:

- **During the conversation**: `agent/controller.ts`'s `useOffer`/`attemptOfferSelection` calls
  `selectCommercialSource(conversationId, {sourceType: 'STORE_LISTING', sourceId, sourceOwnerKsNumber})`
  with the real, stable offer id and owning Store's KS Number — never fabricated — storing the result
  as `state.source` (`SelectedCommercialSourceDto`). `TradeContext.tsx` renders this as a quiet
  "Started from" line, never a dominant badge, with copy explicit that this "never means the source
  was accepted, joined, or purchased." If `selectCommercialSource` fails, the offer is held in
  `state.offerSelectionFailure` rather than silently submitted as an unattributed DIRECT trade —
  `continueOfferWithoutSource()` is the only path that proceeds without one, and it explicitly clears
  `source: null` first, so the resulting trade is honestly understood as DIRECT, never mislabeled.
- **At handoff/review, before the Agreement is finalized**: `components/CanonicalAgreement.tsx`'s
  "Started from" section renders the source's title, owner KS Number, proposed price line, and an
  explicit **staleness indicator** — `source.status === 'CURRENT'` (forest-toned) vs. any other value
  (ember-toned "Source status: [label]"), fed by `canonicalAgreementView`/`exactVersionView` from the
  live `handoff`/`recipient` review state. This is the "must not silently mutate if source changes"
  doctrine already implemented, not something this phase needed to add.
- **After the Agreement is created**: confirmed, by reading `WorkspaceExperience.tsx` (the finished-
  Agreement hub/detail view) end to end, that **no source/provenance display exists there, and none
  can be built truthfully today** — `TradeEntityView`/`TradeRelationshipView` (the real read shapes
  for an established Agreement) strip `sourceKind`/`sourceDescription` before the wire; there is no
  backend read endpoint that returns a finished Agreement's originating source. This is the ledger's
  own documented gap (see Deferred gaps, N), not something to fabricate via client-side storage — a
  locally-cached "Started from" string would go stale, wouldn't survive a different device/session,
  and would present as backend truth when it is not. Left honestly absent.
- **Candidate, never auto-promoted**: `agent.test.mjs`'s "candidate and unknown context render
  distinct labels, provenance, and only candidate Use this" and "explicit adoption makes one HTTP
  POST, refreshes context and renders backend-confirmed result" together confirm a source/candidate
  fact only ever becomes an Agreement fact through one explicit, backend-confirmed adoption call —
  never silently, never optimistically rendered as already true.

## E. Use This ≠ Agreement — explicit confirmation

Traced every "Use this" / "I can help" / "Discuss" / adoption-shaped affordance in the Trade world:

- **Store's `OfferDetail.onUseThis`** → `controller.useThis()` — a pure local view-state transition
  into the handoff screen. No network call, no Agreement authority touched.
- **`OfferToTradeHandoff.onProceed`** → `onUseOffer(...)` — hands a payload (amount/currency/
  sourceDescription/sourceId/sourceOwnerKsNumber) up to the caller's Agent controller, which itself
  only calls `selectCommercialSource` (context) and separately, only on the user's own explicit next
  action, ever proceeds toward a real conversation turn. Nothing here calls join/confirm/pay.
- **Community's `onICanHelp`/`onDiscuss`/`onToTrade`** → all three call
  `controller.showNotice('This area is not available yet.')` — a truthful unavailable state, not a
  fake success. `onViewOffer` is the one real action, and it routes to Store's own `openOffer` — the
  same STORE_LISTING seam, never a second adoption path.
- **Grep-verified** (`grep -rnE "\.join\(|\.confirmVersion\(|\.accept\(|\.pay\(" src/features/{store,community,circle,plug,referral,master,ecosystem}`):
  the only match anywhere in the Trade-world feature layer is `master/controller.ts`'s
  `gateway.accept(requestId)` — this is `acceptCost()`, the Requester's real, narrow acceptance of a
  Master's already-proposed cost (`COST_PROPOSED → ACCEPTED`), a Master-engagement authority that has
  always existed and is explicitly labelled "does not create or move Money" in the UI (see H) — never
  Agreement `join`/`confirmVersion`/payment authority. No file in this domain calls Agreement
  join/confirm/payment authority (the `referrals-plugs-masters.test.mjs` "N" test already asserts this
  for Plug specifically; extended the same grep by hand across the remaining five files as part of
  this archaeology).

## F. Referral/Introduction attribution boundary

Confirmed the two real referral domains stay genuinely separate, never merged into one frontend
concept:

- **R11A generic code system** (`ReferralExperience.tsx`): `myCode`/`myHistory`/`redeem`/
  `myLifetimeShare` — a person's own referral code and the traders who redeemed it, with a
  `QUALIFIED`/`PENDING` status per relationship. Backend-owned qualification; the frontend never
  computes or predicts it.
- **KeyContract Plug-attribution** (`PlugExperience.tsx`'s `existingAttribution`/`referralStatus`):
  per-Agreement, scoped to the Agreement's own creator, permanent once set ("This is permanent for
  this Agreement — it cannot be changed to a different Plug"), with its own separate reward-evaluation
  state (`state.reward.currency`) — never conflated with R11A's `myLifetimeShare`.
- **Introduction ≠ endorsement**: Plug's relationship-opened screen states directly "Plug ≠ Agreement
  party. An introduction is not selection, acceptance, or Agreement confirmation." No Plug/Master
  surface renders "guarantor," "certified provider," or "SecurePay verified" (locked by
  `referrals-plugs-masters.test.mjs`'s "O" test, re-verified passing after this phase's edits).
- **Frontend never decides referral rewards**: `rewardPaid`/`rewardEarned`/qualification state are
  rendered exactly as returned; no client computation of eligibility exists anywhere in either domain
  (confirmed by grep and by the passing "AI" no-ranking/no-score test, see Tests).

## G. Plugs improvements

- **DNA convergence**: every card (`Plug attribution`, `Referral evaluation status`, `Relationship
  opened`, `Interested Plugs`, the initial "Ask SecurePay to connect you with a Plug" panel) now uses
  `Surface`/`SurfaceBody`; the primary CTAs use `Button`; inline `role="alert"` paragraphs became
  `StatusNotice tone="warning"`/`tone="error"`.
- **Real bug fixed**: the referral-reward line inside the Agreement-attribution view rendered
  `{referral.reward.amountMinor} {referral.reward.currency} (minor units)` — e.g. "50000 KES (minor
  units)" — raw and unformatted. This surface's reward comes from the Agreement/KeyContract adapter,
  which carries `amountMinor` as a **string** (unlike R11A's plain `number`), so the fix's local
  `money()` helper parses before dividing by 100 and renders through `MoneyValue`, matching the
  formatting convention established everywhere else in the product.
- **Nothing about eligibility, attribution permanence, or the no-directory doctrine changed.**

## H. Masters improvements

- **DNA convergence**: every card across lookup/profile/request-create/request-detail/opinion-form
  now uses `Surface`/`SurfaceBody`; CTAs use `Button` (`variant="secondary"` for the two non-primary
  lookup/decline actions); the ember warning box on `COST_PROPOSED` ("Accepting this cost does not
  create or move Money...") became `StatusNotice tone="warning"`.
  `controller.submitRequest().then(ok => { if (!ok) return; ...setView('request-detail') })`'s exact
  code shape — locked by `pr11-review-closure.test.mjs`'s own regex — was preserved unchanged; only
  its wrapping `<button>` became `<Button>`.
- **Real bug fixed**: the request-detail "Quoted cost" line rendered
  `{req.quotedCostMinor} {req.currency} (minor units)` raw, the same class of bug as G — fixed with an
  identical `money()` helper (again string-typed, matching `quotedCostMinor: string | null`) and
  `MoneyValue`.
- **Nothing about the REQUESTED→COST_PROPOSED→ACCEPTED→OPINION_SUBMITTED lifecycle, Master-only vs.
  Requester-only gating, or the closed generic-error-on-authority-violation behavior changed.**

## I. Human Core handoff

Traced Store's "Use this" all the way through to a live conversation turn: `OfferToTradeHandoff`'s
`onProceed` → `onUseOffer` (Store feature boundary) → the caller's Agent controller's `useOffer` →
`attemptOfferSelection` (sets `state.source`) → the existing conversation's own next turn, with
`TradeContext.tsx` rendering "Started from" continuously alongside it. Confirmed via
`agent.test.mjs`'s existing "TradeContext shows real 'Started from' source provenance..." test that
this never resets to a blank conversation — the same, single, ongoing Trade Taking Shape context
`AGREEMENT_WORKSPACE`/candidate/unknown rendering already uses. No change was needed here; this phase
verified it rather than rebuilt it.

## J. Agreement provenance

See D above: `CanonicalAgreement.tsx`'s "Started from" section (title, owner KS Number, proposed
price, staleness status) is the real, already-correct provenance display at handoff/recipient-review
time, non-editable, sourced from live review state. **Confirmed gap, reported honestly rather than
fabricated**: this provenance is not retrievable once an Agreement is finalized and revisited later
(`WorkspaceExperience.tsx` has no source display), because no backend read endpoint returns it post-
creation. This is the ledger's own long-documented backend limitation, not a frontend oversight this
phase could fix without inventing client-side persistence of backend-authority-shaped data — see
Deferred gaps.

## K. Authority audit

- **Source ≠ Agreement fact**: confirmed in D — a source is provenance/context (`state.source`,
  `CanonicalAgreement`'s "Started from"), never itself an Agreement field, and never survives past the
  point a real conversation turn/Agreement establishes its own facts independently.
- **Introduction ≠ recommendation**: confirmed in F — Plug's own copy states this directly; no
  ranking/reputation/rating/guarantor/certified/verified claim exists anywhere in the domain (grep +
  passing "AI"/"O" tests).
- **Community response ≠ Agreement**: confirmed in E — `onICanHelp`/`onDiscuss`/`onToTrade` are all
  truthful unavailable states, never a fake acceptance.
- **Offer SecureLink ≠ invitation**: unchanged from Phase 3 archaeology — confirmed still true by
  `store.test.mjs`'s own locked "M"/"M2"/"M3" tests (SecureLink is a distinct hash namespace from
  `#/invitation/`, no dedicated token endpoint invented), re-verified passing.
- **Use This ≠ acceptance**: confirmed in E.
- **Join ≠ confirmation**: confirmed in E and by Circle's own complete absence of any join/create-
  Circle action (`community-circles.test.mjs`'s "K" test).
- **Frontend never decides referral rewards**: confirmed in F.
- **Frontend never creates Master authority**: confirmed in H — every Master-authority-gated action
  (`proposeCost`/`acceptCost`/`declineRequest`/`submitOpinion`) is called with the same arguments as
  before this phase; the frontend never guesses which specific authority rule applies to a rejected
  mutation, matching the documented `MasterAuthorityException` 500-handling gap.
- **No mutating call's arguments changed anywhere in this phase** — every edit in C/G/H was
  presentational (markup/component swap) or a pure display-formatting fix (money-value parsing); no
  gateway method, its arguments, or its call site changed. Confirmed by diff review (see git report,
  R) and by the full test suite passing unmodified except for the two comment-only test fixes recorded
  in Tests (L).

## L. Desktop/Mobile visual verification

**Source/test verified, not visually verified.** Every change was confirmed via `npm run typecheck`,
`npm run lint`, `npm run build`, and the full `node --test tests/*.mjs` suite (see Tests, below). No
live SecurePayAPI backend is available in this environment, and — like Money in Phase 3 — the real
Trade-world routes (`CircleExperience`, `EcosystemExperience`, `ReferralExperience`,
`PlugExperience`, `MasterExperience`) are real-mode-only, gated behind a real signed-in session and a
real backend; `src/App.tsx`'s fixture mode does not reuse these components (it renders Bolt's separate,
untouched fixture set instead — see Archaeology, A), so the fixture-mode visual-verification technique
Phases 1-2 relied on does not apply here either, exactly as it did not for Money. `CommunityExperience`
and `StoreExperience` do have real-mode routes reachable the same way. No dev-server/browser session
was attempted in this pass, matching Money's own disclosed limitation, rather than claiming an
unverifiable visual pass. All layout changes reuse the same `Surface`/`Button`/`StatusNotice`
primitives and `max-w-2xl mx-auto`/`space-y-4` responsive patterns already visually verified on both
desktop and mobile in Phases 1-3 — a structural inference, not a screenshot, and reported as such.

## M. Tests

Baseline (this worktree, before any Phase 4 change):
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `node --test tests/*.mjs` — 362 passed, 4 failed: 3 in `referrals-plugs-masters.test.mjs` (J, K,
  AF2) and 1 in `pr11-review-closure.test.mjs`.

**Root-caused and fixed** (committed separately as `d8439ee`, before the DNA sweep, with the full
rationale in that commit message): the 3 `referrals-plugs-masters.test.mjs` failures were test setup
bugs (each omitted the required `selectCandidateRef`/`confirmSelection` calls before
`openRelationship`, which has a legitimate `if (state.selection.status !== 'ready' ...) return false`
guard as its first line) — fixed by adding the missing setup calls. The `pr11-review-closure.test.mjs`
failure was a stale regex asserting an old `if (ok) setView(...)` code shape against a since-refactored,
functionally-equivalent `if (!ok) return; ... setView(...)` early-return — fixed by updating the regex
to match the current shape while asserting the identical doctrine (a failed submit never navigates to
request-detail). **No production code was touched by either fix.**

After the DNA-convergence sweep (this branch's current state):
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `node --test tests/*.mjs` — **366 passed, 0 failed** — the first genuinely clean baseline across all
  four phases.
- `npm run build` — succeeds (same pre-existing chunk-size warning as every prior phase).

**No new tests were added.** Existing coverage for every doctrine point this task lists was located,
read, and re-verified passing rather than duplicated: Use-This ≠ Agreement and candidate-not-auto-
promoted (`agent.test.mjs`'s "candidate and unknown context..." and "explicit adoption makes one HTTP
POST..." tests), SourceReference provenance/survival (`agent.test.mjs`'s two "Started from" tests),
staleness (`CanonicalAgreement`'s CURRENT-vs-other status rendering, exercised by the handoff/recipient
suites), no `COMMUNITY_KNOWLEDGE` wiring (`community-circles.test.mjs`'s "O"/"P"), Community response
≠ Agreement and no named-Circle action (`community-circles.test.mjs`'s "K"/"L"/"M"/"N"/"Q"), no client
ranking/reputation anywhere in Referrals/Plugs/Masters (`referrals-plugs-masters.test.mjs`'s "AI"),
introducer ≠ endorsement (`referrals-plugs-masters.test.mjs`'s "O"), and recipient authority unchanged
(untouched — no recipient file was modified this phase). One near-miss surfaced during this pass: two
of this phase's own new code comments (in `ReferralExperience.tsx`/`PlugExperience.tsx`/
`MasterExperience.tsx`) originally used the phrase "formatted like every other money display," which
tripped the "AI" no-`\blike[sd]?\b` regex purely as a comment string, not a real doctrine violation —
reworded to "formatted the same way every other money display... already is" before committing, so no
test needed weakening.

## N. Deferred gaps

- **Post-creation Agreement source provenance** (see D, J): no backend read endpoint exists for a
  finished Agreement's originating source once it leaves the live handoff/recipient-review state.
  Genuinely needs a new backend field/endpoint (e.g. surfacing `sourceKind`/`sourceDescription` on
  `TradeEntityView`), not a frontend workaround — building a client-cached substitute would present
  unverifiable data as backend truth.
- **Named-Circle group system, Community content-object persistence, `COMMUNITY_KNOWLEDGE` wiring,
  Master directory/search, rich Plug profile fields** — all confirmed, deliberate, pre-existing
  backend product boundaries (Archaeology, A), not oversights. Building any of them from the frontend
  would mean inventing backend authority that does not exist.
- **Master authority-violation messaging stays generic** — `MasterAuthorityException` has no
  `@ExceptionHandler` on the backend (confirmed, Archaeology A); every Master mutation authority
  failure surfaces as an unhandled 500, correctly rendered as one closed message rather than a guessed
  specific reason. Fixing the message granularity needs a backend change.
- **Mobile/desktop visual verification** — see L. Same disclosed limitation as Phase 3 Money; should
  be the first thing checked once a live backend or a Trade-world-aware fixture/staging environment is
  available.

## O. Git

- Branch: `feat/final-phase4-securepay-trade-community`
- Starting SHA: `c666287` (`origin/main`, includes merged Phase 1 PR #20, Phase 2 PR #21 + correction
  PR #23, Phase 3 PR #22 with both correction passes)
- Commits this phase:
  - `d8439ee` — Fix 4 pre-existing test bugs found during Phase 4 archaeology (test-only; no
    production code changed)
  - `85d02fe` — Phase 4: converge Trade & Community World onto Phase 1 DNA primitives (the DNA sweep
    plus the two real money-formatting bug fixes described in G/H)
  - this document
- Files changed: `tests/referrals-plugs-masters.test.mjs`, `tests/pr11-review-closure.test.mjs` (bug
  fixes); `src/features/circle/CircleExperience.tsx`, `src/features/community/CommunityExperience.tsx`,
  `src/features/ecosystem/EcosystemExperience.tsx`, `src/features/referral/ReferralExperience.tsx`,
  `src/features/plug/PlugExperience.tsx`, `src/features/master/MasterExperience.tsx` (DNA convergence
  + money-formatting fixes); `docs/PHASE4_TRADE_COMMUNITY.md` (this document). `StoreExperience.tsx`
  needed no change (Archaeology, A).
- Tests: see Tests (M) above — 366/366 passing, up from a 362/4-failing baseline, with the 4 pre-
  existing failures root-caused and fixed rather than carried forward.
- PR: to be opened as draft/open, unmerged — programme controller performs final review and merge.
