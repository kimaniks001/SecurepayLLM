# SecurePayLLM Production Migration Ledger

Audit date: 2026-09-15

This ledger maps the locked Bolt Pass 11 experience to real SecurePayAPI authority. It is the working contract for productionization.

## 1. Frozen experience inspected

Source archive SHA-256:

`2f6c28bd28c80af806217e94e722f5b2498b187a865a44a3d0a7d9cbb0c5b14d`

Static inspection of the uploaded Bolt export found:

- Vite + React 18 + TypeScript + Tailwind
- 177 files in the export
- 160 files under `src/`
- 146 components under `src/components/`
- 99 explicit `#/demo/...` acceptance/demo routes
- central prototype orchestration currently lives in `src/App.tsx`
- conversational intelligence and consequential transitions currently come from `src/mockAgent.ts`
- product demo truth is split across `demoData.ts`, `milestoneData.ts`, `moneyData.ts`, `storeData.ts`, `communityData.ts`, `circleData.ts`, `disputeData.ts`, and `ecosystemData.ts`
- there are no real SecurePayAPI `fetch()`/HTTP calls in `src/`; external URLs found during static inspection are presentation assets such as demo imagery

This confirms the Bolt project is an experience/reference implementation, not production authority.

## 2. Core convergence contract

Production must preserve:

`Canonical source -> explicit Use this -> SourceReference -> Trade Taking Shape -> resolve delta -> Secure Identity when consequential -> Agreement authority -> Money follows Agreement`

Current Bolt factories already demonstrate the intended universal source pattern:

- `createSourceFromOffer`
- `createSourceFromCommunityObject`
- `createSourceFromPerson`
- `createSourceFromWorkStory`
- `createSourceFromSolution`
- `createSourceFromMasterOpinion`
- `createSourceFromPlugIntroduction`

Production should converge these behind one source/adoption gateway rather than retain separate authority models per feature.

## 3. Backend stack inspected

The production audit inspected the current stacked SecurePayAPI programme, including:

- PR #199 — Phase 5 Agent -> Secure Identity -> Agreement Authority handoff
- PR #200 — Phase 5B provenance + explicit adoption
- PR #201 — Phase 6 Signed-in Home + Agreement Hub/Detail
- PR #202 — Phase 7 Agreement operations/changes/disputes
- PR #203 — Phase 8 Money integration contract
- PR #204 — Phase 9 Store
- PR #205 — Phase 9B Agreement execution + dispute convergence
- PR #206 — Phase 10 Community + Circles

At audit time these PRs are stacked/open rather than merged to `main`. Frontend implementation must therefore track the branch/PR contract it is integrating against and must not assume `main` exposes every contract yet.

## 4. Compatibility matrix

| Bolt experience | Backend authority / verified contract | Migration state | Production action |
| --- | --- | --- | --- |
| Signed-out free intent | SecurePay Agent conversation stack from earlier Agent phases | REAL_API_AVAILABLE_NOT_WIRED | Replace `mockAgent.detectIntent/respond` with typed Agent conversation gateway while retaining Bolt choreography. |
| Keep talking | Agent conversation turns | REAL_API_AVAILABLE_NOT_WIRED | No auth merely to talk/review. |
| Review what we have | Agent Trade Context/context read | REAL_API_AVAILABLE_NOT_WIRED | Render context; do not manufacture settled facts. |
| External quote/document facts | PR #200: external amount/date facts always enter as CANDIDATE | BACKEND_PR_PENDING | Wire structured external-fact endpoints; label provenance. |
| Explicit `Use this` | PR #200: `POST .../facts/adopt` promotes existing CANDIDATE to CONFIRMED | BACKEND_PR_PENDING | This becomes the production adoption boundary; never auto-call it from Agent prose. |
| Reuse prior Agreement term | PR #200: authenticated prior-agreement-term lookup with provenance, then separate adoption | BACKEND_PR_PENDING | Preserve exact source Agreement/version; no silent cloning. |
| `Continue with this` | PR #199: `POST /api/agent/conversations/{conversationId}/agreement-handoff` | BACKEND_PR_PENDING | Replace Bolt's timed `continue_with_this` transition with real handoff creation. |
| Identity boundary after intent | PR #199 handoff status `IDENTITY_REQUIRED`; existing auth then `/adopt` | BACKEND_PR_PENDING | Preserve review-before-auth. Authentication does not create/accept an Agreement. |
| Canonical pre-Agreement review | PR #199: `GET /api/agent/agreement-handoffs/{id}/review` | BACKEND_PR_PENDING | This is distinct from conversational preview. |
| Set securely | PR #199: `/continue` requires exact `tradeContextVersion` + `candidateDigest`; returns real draft Agreement id | BACKEND_PR_PENDING | Echo exact reviewed snapshot; stale means recreate handoff. |
| Recipient invitation issuance (sender side) | `POST /api/v1/agreements/{id}/invitations`, requires a `roleCode` | HUMAN_DOCTRINE_BLOCKER | Backend `roleCode` is an unvalidated free string (`IssueInvitationRequest`); Bolt's own recipient role text varies per trade type (customer/provider, buyer/seller, organizer/contributor) with no single canonical value. Not wired; see Slice D report. |
| Recipient invitation review (token side) | `GET /api/v1/agreement-invitations/{token}` (public, no auth) | REAL_API_WIRED | Public invitation review remains separate from auth/join/confirm; renders only backend-projected facts. |
| Recipient authentication | Existing auth surface, reusing the Slice C session boundary | REAL_API_WIRED | Auth only proves acting identity; never auto-joins. |
| Explicit Join | `POST /api/v1/agreement-invitations/{token}/join` | REAL_API_WIRED | Join != confirmation; renders authoritative `JOINED_UNCONFIRMED`. |
| Exact-version review + confirmation | `GET /api/v1/agreements/{id}/versions`, `GET .../versions/{versionId}`, `POST .../versions/{versionId}/confirm` | REAL_API_WIRED | Confirmation targets the exact reviewed version/hash; superseded versions force a fresh authoritative re-read and re-review before any confirm. |
| Signed-in Home | Existing `GET /api/v1/me/agreements` and `GET /api/v1/me/actions` | REAL_API_WIRED | Golden Spine E wires SignedInHome/NeedsAttentionList/WaitingOnOthersList to these reads; frontend wiring only, verified against the Phase 9B stack head (see section 15). |
| Agreement Hub | PR #201: `GET /api/v1/me/agreements/hub` | BACKEND_PR_PENDING | Golden Spine E wires AgreementHub/AgreementCard to the real 8-bucket response; row stays BACKEND_PR_PENDING until #201's stack merges to `main`. |
| Agreement search | PR #201: `/api/v1/me/agreements/search` | BACKEND_PR_PENDING | Not wired this slice; no location filter until backend has Agreement location truth. |
| Agreement Detail | PR #201 plus #203/#205 | BACKEND_PR_PENDING | Golden Spine E wires AgreementDetail/Overview/People/Terms/Documents/Activity/Version to the real projection; row stays BACKEND_PR_PENDING until the stack merges to `main`. |
| Agreement Agent context | PR #201: `GET /api/v1/agreements/{id}/agent-context` | BACKEND_PR_PENDING | Bounded authenticated context; do not mix private Agreement context into identity-free Agent implicitly. |
| Amendment comparison | PR #202: real amendment diff read | BACKEND_PR_PENDING | Use real source/current/proposed versions; no client reconstruction. |
| Milestones/obligations | Existing backend domain; PR #205 exposes milestones on Detail | BACKEND_PR_PENDING | Replace `milestoneData.ts`; preserve action/obligation/milestone distinctions. |
| Dispute isolate/positions/match | Existing Agreement Review v2 authority; PR #205 adds bounded case detail | BACKEND_PR_PENDING | Keep locked problem -> isolate -> code -> positions -> match sequence. |
| Agreement Code acceptance | PR #205 explicit append-only acceptance per isolated dispute scope | BACKEND_PR_PENDING | Do not reduce to generic terms checkbox. |
| Dispute Master escalation | PR #205 narrow escalation contract; full Master domain follows Phase 11 | BACKEND_PR_PENDING | Opinion must return to matching; cannot auto-resolve. |
| Attention/reminders | PR #205 backend-neutral Agreement attention event foundation | BACKEND_PR_PENDING | Attention event != delivery channel. |
| Money status | Existing `GET /api/v1/agreements/{id}/money-status` | REAL_API_WIRED | Golden Spine E wires MoneyStatus/MoneyWorkspace to this read; Payment Ready is backend truth. |
| Money records | Existing `GET /api/v1/agreements/{id}/money-records` | REAL_API_WIRED | Golden Spine E wires MoneyActivity to this read; authoritative release/funding record projection only. |
| Agreement Detail Money handoff | PR #203: `NO_EVALUATION_YET \| READY \| NOT_READY \| PARTIALLY_READY \| BLOCKED`, reasons + count | BACKEND_PR_PENDING | Golden Spine E wires Detail's Money tab to this field; row stays BACKEND_PR_PENDING until #203's stack merges to `main`. Never collapse no-evaluation into not-ready. |
| Money next action | Existing `/api/v1/me/actions`, e.g. `FUND_AGREEMENT` | REAL_API_WIRED | Golden Spine E gates the locked Pay/Fund affordance on an exact agreementId+actionCode match, refetched fresh on every Money open. `READY` alone never creates a Pay button. |
| Store public search | PR #204: `GET /api/v1/stores/search` (`kind` required, `category`/`location` ILIKE, `limit` 1-10), factual/recency, no ranking | BACKEND_PR_PENDING | Golden Spine F wires `StoreHome` to this; row stays BACKEND_PR_PENDING until #204's stack merges to `main`. No free-text query param exists — see 16.1. |
| Store profile/Offer CRUD | `StoreController`/`PublicStoreController` (verified source, not the stale OpenAPI file) | BACKEND_PR_PENDING | Golden Spine F wires trader profile read, own-offer list/create/update/availability-confirmation, and public store/offer read. Profile PUT is gateway-wired but has no locked Bolt edit UI this slice — see 16.1. |
| Store media refs | PR #204 additive `mediaRefs: string[]` on `UpsertStoreOfferRequest`/`StoreOfferResponse`/`PublicOfferView` | BACKEND_PR_PENDING | Golden Spine F renders refs as opaque reference strings only; never evidence, never file-storage authority. |
| Offer -> Trade source | Phase 5B `POST .../external-facts/amount` accepts `sourceKind: 'STORE_LISTING'`; no dedicated Store-Offer SourceReference/adoption endpoint exists | BACKEND_PR_PENDING | Golden Spine F seeds one real CANDIDATE payment-condition fact from the Offer's price (when listed) via the existing Agent gateway, then reuses the existing conversation/handoff pipeline unchanged. Do not directly turn Offer into Agreement. See 16.1 for the provenance-stripped-on-read gap. |
| Offer SecureLink | No dedicated share-token contract exists (verified: no offer_share/offer_link endpoint) | HUMAN_DOCTRINE_BLOCKER outcome avoided — the public offer URL (`GET /api/v1/stores/{ks}/offers/{offerId}`) is itself the doctrine-compliant share mechanism | Golden Spine F builds a frontend-only `#/store/{ks}/offer/{offerId}` hash route as the truthful SecureLink; never reuses the `#/invitation/{token}` route. |
| Community | PR #206 confirms a deliberately bounded existing R11B Community/Circle foundation, not the full Bolt object/feed model | BACKEND_PR_PENDING / FRONTEND_COMPOSITION_ONLY | Golden Spine G wires `CommunityHome`/`CommunityObjectDetail` to real Store search results composed as `store_offer_reference` objects only; Question/Need/Opportunity/Work Story/Discussion/people/business browsing remain FRONTEND_COMPOSITION_ONLY (no backend content-object persistence exists — Phase 10 convergence audit). Row stays BACKEND_PR_PENDING for the Store-composition path until #204/#206's stacks merge to `main`. |
| Circle profile/economic facts | Existing CircleProfileService + PR #206 Growth Credits, `GET /api/v1/circle/me` | BACKEND_PR_PENDING | Golden Spine G wires the real self-scoped Circle profile (identity, verification status, `memberSince`, referred/activated trader counts, agreements brought in, growth credit total) to this endpoint; row stays BACKEND_PR_PENDING until #206's stack merges to `main`. `memberSince` is `ks_identities.created_at` (identity creation), never a named-Circle join date — rendered as "SecurePay identity since {date}", not "Member since" (17.6). Growth Credits are factual NON-MONEY activity counts, rendered as a plain count only. |
| Circle membership/feed semantics | PR #206 explicitly did not introduce a full membership/feed/social authority; Phase 11 convergence audit (`PHASE_10_CONVERGENCE_AUDIT.md`) confirms this is a deferred product-shape decision, not a gap to close inline | TRUE BACKEND GAP / DEMO_ONLY_REMOVE_BEFORE_PRODUCTION | Golden Spine G renders this as a truthful "Named Circles ... not available yet" notice in the real Circle experience. Bolt's rich named-Circle screens (`CircleHome`, `CircleDiscoveryList`, `CircleMemberDirectory`, `CircleEconomicSummary`, `CircleCreateFlow`, `CircleJoinFlow`) remain fixture-only and are never reached from the real route. |
| Universal SourceReference across Community/Circles | Bolt contract is richer than PR #206 report; Phase 5B offers generic provenance/adoption primitives; Phase 11 convergence audit confirms `ExternalFactSourceKind` (incl. `COMMUNITY_KNOWLEDGE`) is the one real engine, not a second SourceReference authority | BACKEND_PR_PENDING | Golden Spine G deliberately does not wire `COMMUNITY_KNOWLEDGE` this slice (no real Community content object exists to adopt facts from); the one real Community→Trade path (a Store offer reference) reuses the existing STORE_LISTING seam unchanged. See section 17. |
| Referral (R11A generic code) | `ReferralController` (`/api/v1/referrals/me/code`, `/redeem`, `/me/history`, `/me/lifetime-share`) — byte-identical to `origin/main` | REAL_API_WIRED | Golden Spine H wires a real shareable code, real "who I referred" history, and real redemption. `lifetime-share` (Plug's own aggregate earnings) is gateway-wired/tested but unwired to UI — no Bolt Plug-dashboard surface exists. See section 18. |
| Referral (KeyContract per-Agreement) | `AgreementPlugAttributionController.referralStatus` — the one new method PR #207 adds; `NO_INTRODUCTION\|CANDIDATE\|NOT_QUALIFIED\|QUALIFIED` | BACKEND_PR_PENDING | UI must not infer candidate/qualified/reward states; renders exactly the backend's 4-value enum. See section 18. |
| Plug attribution (Agreement) | `AgreementPlugAttributionController` POST/GET + `PlugMarketEntryController`/`CustomerPlugRelationshipLifecycleController` customer-side matching flow — byte-identical to `origin/main` | REAL_API_WIRED | Golden Spine H wires the real customer-request → candidates → selection → relationship → attribution flow; Plug gains no Agreement/Money authority. Rich Plug profile (name/domains/geography) remains a confirmed backend gap. See section 18. |
| Master profile/request/opinion | Entire `ke.securepay.core.master` package — new to PR #207, not on `main` | BACKEND_PR_PENDING | Golden Spine H wires the full non-dispute lifecycle (designate/profile/request/propose-cost/accept/decline/opinion) against a local contract double. Qualification/accreditation separate from Master status; opinion not authority. See section 18. |
| Partner/Solution | Later backend phase; Bolt Pass 11 is product contract only | BACKEND_PR_PENDING | Keep demo adapter until real bounded APIs exist. Do not invent bank/insurance/partner truth. |

**[Phase 4 final correction pass, 2026-09-20]**: PR #207 has since merged to `SecurePayAPI main`.
Re-confirmed by directly reading current `main`: the "Circle profile/economic facts", "Referral
(KeyContract per-Agreement)", and "Master profile/request/opinion" rows above are no longer
`BACKEND_PR_PENDING` for merge status — all three are real, live backend authority today (Circle's
`growthCreditTotal` field has additionally been removed from the response since this table was
written; see the 17.1 annotation and `docs/PHASE4_TRADE_COMMUNITY.md`). "Community"'s row remains
accurate for its own reasons (Question/Need/Opportunity/Work Story/Discussion persistence is still a
deliberate, ongoing product gap, not a merge-pending one). "Partner/Solution" is unaffected by PR
#207 and remains genuinely pending. Rows are left as originally written above (this ledger's own
convention is to append corrections, not silently rewrite history) — read this note alongside them.

## 5. Highest-risk prototype code to retire

### `src/App.tsx`

The Bolt build currently encodes many consequential transitions through local state, timers and `mockAgent` calls, including:

- `continue_with_this`
- `continue_securely`
- `confirm_identity`
- `set_securely`
- `send_to_peter`
- `join_agreement`
- `confirm_acceptance`
- `need_change`

These event handlers are experience choreography only. In production they must call authority gateways and render returned states. Do not preserve the local step numbers as authority.

### `src/mockAgent.ts`

This is the prototype intelligence/state source. It must be retired from production authority behind a development adapter. The real Agent API owns conversation/Trade Context state and the Agreement handoff owns the consequential transition.

### Demo data modules

The following modules remain useful as fixtures/visual acceptance data but must not become production truth:

- `demoData.ts`
- `milestoneData.ts`
- `moneyData.ts`
- `storeData.ts`
- `communityData.ts`
- `circleData.ts`
- `disputeData.ts`
- `ecosystemData.ts`

Move them behind explicit fixture/demo boundaries as real vertical slices are wired.

## 6. Proposed production boundaries

```text
src/
  app/                    route composition + shell only
  api/securepay/
    agent/
    auth/
    agreements/
    money/
    store/
    community/
    circles/
    ecosystem/
  domain/
    source-reference/
    trade/
    agreement/
    money/
  features/
    home/
    agent/
    trade/
    agreement/
    money/
    store/
    community/
    circles/
    ecosystem/
  fixtures/               Bolt demo data; never production authority
```

The exact folder move is secondary. The important rule is that locked visual components consume typed domain/view models rather than performing ad-hoc HTTP or owning protected state.

## 7. First production vertical slice

Build this before broad component refactoring:

1. Signed-out Home captures intent.
2. Real Agent conversation is created/continued.
3. Trade Context/understanding renders in the Bolt conversation experience.
4. `Continue with this` creates a real Agreement handoff.
5. If `IDENTITY_REQUIRED`, use real SecurePay auth and adopt the handoff.
6. Render canonical handoff review.
7. `Set this securely` progresses with exact context version + digest.
8. Render the resulting real Agreement.
9. Invite a recipient through existing Agreement invitation authority.
10. Recipient reviews invitation before auth.
11. Authenticate, explicitly Join.
12. Review exact Agreement version.
13. Explicitly confirm current version.
14. Render backend-owned established/current status.
15. Read Money status and caller next-actions separately.

Only after this spine is real should Store/Community/Circles be attached to it.

## 8. Production acceptance rules for the first slice

The slice fails if any of the following are true:

- the frontend decides an Agreement exists before SecurePayAPI says so
- authentication is treated as Join or confirmation
- Join is treated as confirmation
- confirmation does not identify exact version authority
- a stale handoff/version proceeds
- a candidate external fact is silently adopted
- `READY` alone exposes Pay/Fund
- Money state comes from demo data
- a source selection becomes agreed without explicit adoption/review
- errors/unknowns are converted to successful-looking states

## 9. Known backend convergence items

These are not frontend permission to invent data. They remain explicit integration gaps until backend support is proven:

- rich canonical Community objects matching Bolt Pass 10A
- Circle membership/reference semantics matching Bolt Pass 10B
- universal SourceReference persistence/projection for Community/Circle/Plug/Master/Solution sources
- referral evaluation/reward authority (Phase 11)
- full Master profile/request/opinion authority outside the narrow dispute escalation seam (Phase 11)
- Partner/Solution APIs and regulated capability truth
- Store enquiries/activity feed
- Business/team administration
- activation/subscription/admin surfaces not implemented in Bolt because token budget ended after Pass 11

## 10. Status vocabulary

Update this ledger on every production PR:

- `REAL_API_WIRED`
- `REAL_API_AVAILABLE_NOT_WIRED`
- `BACKEND_PR_PENDING`
- `FRONTEND_COMPOSITION_ONLY`
- `DEMO_ONLY_REMOVE_BEFORE_PRODUCTION`
- `HUMAN_DOCTRINE_BLOCKER`

Do not mark a surface complete merely because it visually matches Bolt. A protected surface is complete only when its authority is real.

## 11. Golden Spine A foundation (2026-09-15)

Infrastructure only; no journey is marked REAL_API_WIRED. See
[GOLDEN_SPINE_COMPATIBILITY_AUDIT.md](GOLDEN_SPINE_COMPATIBILITY_AUDIT.md).
Agent runtime is also BACKEND_PR_PENDING (#197/#198); earlier available wording
meant available on the stack, not merged to main. Typed gateways target inspected
backend source, with all protected Bolt surfaces still
DEMO_ONLY_REMOVE_BEFORE_PRODUCTION. The fixture App is available only through an
explicit development fixture mode; production fails closed pending slices B–E.
No API error selects fixtures. Auth, handoff, Agreement and Money gateway code is
available for subsequent wiring; this does not complete a vertical slice.

## 12. Golden Spine B implementation scope (2026-09-15)

SignedOutHome, ConversationWorkspace and ContextPanel are the locked surfaces.
Conversation creation, turns, context reads and explicit fact adoption are being
wired through the existing Agent gateway against the re-inspected #208 stack
head 0b0121c9 (#197/#198/#200 still BACKEND_PR_PENDING). Real loading/errors and
candidate/provenance rendering replace local Understanding authority. Fixture
default rendering stays intact. Continue with this remains a non-progressing
FRONTEND_COMPOSITION_ONLY seam for Slice C; no auth or Agreement mutation.

## 13. Golden Spine C implementation scope (2026-09-15)

`Continue with this -> Secure Identity -> canonical handoff review -> Set
securely -> real draft Agreement progression` is wired end-to-end against the
handoff contract on `feat/securepay-agent-phase5-agreement-handoff` (#199,
`84d205ea56b98a776401fc31f8da8633f8ad6286`, still BACKEND_PR_PENDING) and the
main-branch auth surface (`AuthenticationController`) inspected in the Golden
Spine A audit.

New narrow layers:

- `api/securepay/session.ts` — the single in-memory session boundary
  (`createSessionStore`, `ensureFreshSession`, `withSessionRefresh`). Tokens are
  never persisted, logged, or read from Vite env; refresh runs only when the
  access token is actually expired, immediately before an authenticated
  handoff call.
- `features/identity/controller.ts` + `view.ts` — real KS Number/password/OTP
  against `/api/v1/auth/login`, `/complete`, `/mfa/resend`. Owns identity/
  session authority only; never decodes tokens and never touches handoff or
  Agreement state.
- `features/handoff/controller.ts` + `view.ts` + `HandoffPanel.tsx` — the
  handoff orchestration layer. Tracks handoff id, authoritative server status,
  the exact `reviewSnapshot` (`expectedTradeContextVersion`/
  `expectedCandidateDigest`) captured from `GET /agreement-handoffs/{id}`, the
  `/review` candidate, and `progressedAgreementId`. `createHandoff` fires only
  from the explicit "Continue with this" click; re-entrant clicks and clicks
  while a handoff is already live are no-ops.

State handling: `IDENTITY_REQUIRED` reuses the locked `SecureAuthCard` (now
real-input capable — see below) and calls `/adopt` then re-reads the handoff
only after a real session exists, never inferring adoption from sign-in alone.
`NEEDS_RESOLUTION` returns to the conversation and blocks Set securely.
`REVIEW_STALE` and `EXPIRED` fail closed with the locked `NoticeCard`/
`ErrorStateCard` and require an explicit fresh continuation. `/continue`
echoes only the snapshot already captured from authoritative handoff state; a
409/410 response re-reads the handoff instead of assuming success.
`PROGRESSED` renders the real `progressedAgreementId` through `NoticeCard`
with copy that explicitly denies established/accepted/funded/paid status.

Bolt component changes (both required for truthful, not cosmetic, reasons):

- `SecureAuth.tsx` gained optional `values`/`onFieldChange`/`disabled`/
  `errorText` props so the identity form can take real input; the existing
  read-only demo path (used by the fixture `ConversationWorkspace` switch) is
  unchanged when those props are omitted, and the byte-identical Bolt fixture
  test does not cover this file.
- The canonical review's "not yet ready to progress" state is expressed as a
  `mustSettle` entry (the field the locked `CanonicalAgreementCard` actually
  gates on) rather than the pre-existing but unused `primaryDisabled` field,
  so the existing component — unmodified — truthfully disables Set securely
  until backend status is `READY_TO_PROGRESS`.

Status: `REAL_API_AVAILABLE_NOT_WIRED` moves to real frontend wiring here, but
the row stays `BACKEND_PR_PENDING` until #199 merges to `main`; no live
SecurePayAPI deployment was exercised by this PR (verified instead against a
throwaway local contract double). Slice D (recipient invitation/Join/auth/
exact-version confirmation) remains untouched.

### 13.1 Review fixes (2026-09-15)

Two integration gaps flagged on PR #5 review, both fixed without touching any
locked Bolt visual beyond the minimum wording/action correction:

1. After a successful `/review`, the controller now re-reads authoritative
   handoff state before settling into `review-ready`. The backend records
   that the review happened, so that GET may already report
   `READY_TO_PROGRESS`; Set securely now reflects that immediately, with no
   manual Refresh required and no status inferred locally.
2. `REVIEW_STALE` no longer offers a "Refresh review" action. A stale handoff
   is backend-discarded and cannot be revived by re-reading it; the panel now
   offers only a route back to the conversation, so a new explicit "Continue
   with this" is required to create a fresh handoff.

## 14. Golden Spine D implementation scope (2026-09-15)

`Real draft Agreement -> real invitation -> public recipient review -> Secure
Identity -> explicit Join -> exact current Agreement version review -> explicit
confirmation` is wired end-to-end on the recipient-from-token side, verified
directly against a local `SecurePayAPI` checkout at
`0b0121c9152e3ce039e4d7df59e4fec6045d70cc` (the same head the Golden Spine A
audit inspected; `AgreementInvitationController`, `AgreementController`,
`AgreementJoinService`, `AgreementConfirmationService`,
`AgreementInvitationViewService`, `InvitationOwnershipVerifier` and
`ApiExceptionHandler`). No live deployed SecurePayAPI was exercised; browser
acceptance ran against a throwaway local Node HTTP contract double implementing
the exact verified request/response shapes, not shipped with this PR.

New narrow layers:

- `api/securepay/agreements/index.ts` gained `versions(agreementId)` (`GET
  /api/v1/agreements/{id}/versions`), typed as the real `AgreementVersionResponse[]`
  the backend returns (each entry carries its own `id` and authoritative
  `versionStatus`) rather than the lighter `AgreementVersionSummaryResponse[]`
  used elsewhere for Detail's `versionHistory`. Used only for authoritative
  current-version identification/recovery — never for confirmation itself.
- `api/securepay/session.ts`: `withSessionRefresh` is now generic over the
  caller-supplied authenticated method list (previously hardcoded to the three
  handoff methods), so the same one session boundary now also guards
  `agreements.join/versions/version/confirmVersion`.
- `features/recipient/controller.ts` + `view.ts` + `RecipientExperience.tsx` +
  `route.ts` — the recipient orchestration layer. Tracks invitation token,
  public invitation remote state, Join remote state/result, the exact reviewed
  version (id/number/hash), confirmation remote state/result, and a `changed`
  flag distinguishing a freshly-recovered current version from the one first
  reviewed. `join()` and `confirm()` each mint an idempotency key lazily and
  reuse it only across a deliberate retry against the *same* request body. A
  422/409 confirm failure is not treated as proof of a version change by
  itself — `AgreementConfirmationException` reuses one generic 422 code for
  several distinct failures, and 409 also covers idempotency/agreement
  conflicts — so the controller re-reads authoritative `/versions`, selects
  the single entry with `versionStatus === 'CURRENT'` (never the highest
  `versionNumber`; zero or more than one CURRENT entry fails closed), and
  compares its id/versionNumber/contentHash against the exact version that was
  reviewed. A genuine mismatch clears the confirm key and re-reviews the new
  current version. The same version remaining CURRENT keeps the real failure
  as `confirm-error` without auto-retrying, but the key handling differs by
  status: a 422 (retryable with the same body) keeps its key for a deliberate
  retry, while a 409 — `AgreementConflictException("idempotency key reused
  with different request")` — has that exact key permanently bound to a
  different request digest on the backend, so it is cleared; the next
  explicit confirmation click mints a fresh key for the same still-current
  version.
- `RuntimeApp.tsx`: the invitation token lives only in the URL hash fragment
  (`#/invitation/{token}`, parsed by `parseInvitationRoute`) — never a path
  segment on the frontend host, so it never reaches *this frontend's* own
  URL/access log, and never persisted to storage. SecurePayAPI itself still
  necessarily receives the raw token as a path segment in
  `GET /api/v1/agreement-invitations/{token}` and its `/join`, by contract;
  the hash route does not and cannot prevent that. `RecipientExperience` is
  keyed by token so a same-tab hash change to a different invitation always
  starts a fresh controller.

Bolt component change (truthful, not cosmetic): `RecipientReview.tsx` hardcoded
a `"Demo SecureLink invitation"` caption with no data prop backing it. It now
accepts an optional `notice` prop that, when supplied, replaces that caption
with the backend's own `PublicInvitationViewResponse.notice` text; omitting the
prop leaves the existing fixture path byte-identical to `bolt-reference-pass11`
(verified by test). No other recipient component (`SecureAuth`, `JoinPrompt`,
`JoinedStatus`, `CanonicalAgreement`, `NoticeCard`, `ErrorState`,
`ChoiceButtons`) needed a truthful change.

The exact-version review reuses `CanonicalAgreementCard` (the same component
Bolt's own recipient turn renders for this exact beat, not the separately
locked-but-unused `AcceptancePromptCard`), fed only by the verified
`AgreementVersionResponse.snapshot` keys SecurePayAPI actually writes
(`title`, `purpose`, `description`, `currency`, `proposed_amount_minor`,
confirmed against `AgreementCreationService.buildSnapshot` /
`AgreementAmendmentService.apply`) — never a fabricated parties/work
breakdown. `parties` renders empty rather than guessing a counterparty name
the version snapshot does not carry.

Sender-side invitation issuance (`issueInvitation`, already present in the
gateway since Golden Spine A) is deliberately **not** wired to any UI action
in this slice: `IssueInvitationRequest.roleCode` is an unvalidated free string
with no backend enum, and Bolt's own recipient role text is scenario-specific
(customer/provider, buyer/seller, organizer/contributor, contractor) with no
single value that maps unambiguously to "the" recipient role. Inventing one
would be exactly the kind of role doctrine this task named as a stop
condition. The recipient-from-token side (public review through confirmation)
is fully wired regardless, per the task's explicit fallback instruction.

A real defect surfaced only during the browser walkthrough (not by the
component-level tests, which construct one controller per test and never
re-key it): `RecipientExperience` was originally mounted without a `key`, so a
same-tab hash change from one invitation token to another reused the previous
mount's controller/state instead of starting fresh. Fixed by keying on
`invitationToken` in `RuntimeApp.tsx`; a source-pattern regression test was
added alongside the existing production-bundle test.

Status: recipient-from-token rows move to `REAL_API_WIRED`; sender-side
invitation issuance is `HUMAN_DOCTRINE_BLOCKER` pending recipient-role
doctrine. Golden Spine A/B/C rows are unaffected and their test suites remain
green.

## 15. Golden Spine E implementation scope (2026-09-15)

`Real signed-in session -> signed-in Home -> Agreement Hub -> Agreement Detail
-> authoritative Money status/records + authoritative financial-action gating`
is wired end-to-end, verified directly against a local `SecurePayAPI` checkout
at `180e575c` on `feat/securepay-phase9b-agreement-execution-dispute-convergence`
(`kimaniks001/SecurePayAPI`) — the stacked head containing Phase 6 (#201,
Hub/Detail read model), Phase 8 (#203, Money integration contract) and Phase
9B (#205, milestones/obligations on Detail). Also inspected on the same
checkout: `CurrentUserAgreementWorkspaceController`,
`CurrentUserAgreementWorkspaceService`, `AgreementHubBucketClassifier`,
`AgreementController` (`/detail`, `/confirmation-status`),
`AgreementMoneyStatusController`, `AgreementMoneyRecordsController`,
`PaymentReadyOutcome`, `NextActionType` and `ApiExceptionHandler`. No live
deployed SecurePayAPI was exercised; browser acceptance ran against a
throwaway local fixture-DTO harness (not shipped) rendering the real
`WorkspaceExperience` component directly, the same methodology Golden Spine
C/D used for their own local contract doubles.

Verified contracts wired:

- `GET /api/v1/me/agreements`, `GET /api/v1/me/actions` — signed-in Home.
- `GET /api/v1/me/agreements/hub` — the real 8-bucket `CurrentUserAgreementHubResponse`
  (`needsMe`/`waitingOnOthers`/`takingShape`/`active`/`changedReviewRequired`/
  `completed`/`cancelled`/`expired`).
- `GET /api/v1/agreements/{id}/detail` and `GET /api/v1/agreements/{id}/confirmation-status`
  — Agreement Detail.
- `GET /api/v1/agreements/{id}/money-status`, `GET /api/v1/agreements/{id}/money-records`
  — Money.

New layer: `src/features/workspace/` (`controller.ts`, `view.ts`,
`WorkspaceExperience.tsx`). `controller.ts` owns only `RemoteState` reads per
view (home/hub/detail/money) plus which real backend field classified an
Agreement — `boltAgreementStatus` in `view.ts` reads `CANCELLED`/`EXPIRED`/
`completion.completed` straight off the real summary first (the same fields
`AgreementHubBucketClassifier` itself checks first), and otherwise only
relays the exact Hub bucket the backend already put the Agreement in, or
which of Home's own two lists (`/me/actions` present vs. absent) surfaced it
— it never reimplements the backend's bucket classifier. Money always
refetches `/me/actions` fresh on every `openMoney()` call, so a stale cached
action can never expose the Fund affordance after a failed refresh; the
`FUND_AGREEMENT` match is exact-`agreementId`+exact-`actionCode`, matching
neither another Agreement's action nor an unrecognized code.

Locked Bolt components reused as-is: `SignedInHome`, `HomeWorkbenchSummary`,
`NeedsAttentionList`, `WaitingOnOthersList`, `AgreementHub`, `AgreementCard`,
`AgreementStatusBadge`, `AgreementOverview`, `AgreementPeople`,
`AgreementTerms`, `AgreementDocuments`, `AgreementActivity`, `AgreementChanges`,
`AgreementStaleBanner`, `AgreementSupport`, `MilestoneProgress`, `ActionList`,
`MoneyAgreementContext`, `MoneyStatus`, `MoneyActivity`,
`MoneyUnavailableState`. `AgreementVersionCard` and `MoneyReady` remain
unwired this slice (no Detail composition slot uses the former; no verified
Agent live-tool payload produces the latter — see Golden Spine A's own
compatibility-audit note on unmapped rich cards). `RecentActivity` (used
internally by `SignedInHome`) receives a truthfully empty array: no
cross-agreement activity-feed contract is verified in this slice.

Three narrow, truthful Bolt component changes (all optional/additive, byte-
identical when omitted — verified by this slice's own fixture-markup test):

1. `AgreementDetail.tsx` previously called `getDemoMoney`/`getDemoStructure`
   internally, which would have pulled `moneyData.ts`/`milestoneData.ts` (and
   their fabricated financial/milestone records) into the production bundle
   the moment this component became reachable from real signed-in state. Its
   demo-fixture calls moved to its existing fixture caller (`src/App.tsx`,
   which already imports those modules and is itself excluded from
   production by the existing `import.meta.env.DEV` fixture gate); the
   component now takes `money`/`progress` as required props. `src/App.tsx`'s
   one call site was updated to compute and pass the exact same values it
   previously received implicitly — fixture behavior is unchanged.
2. `moneyData.ts`'s two pure label dictionaries (`paymentReadinessLabel`,
   `nextActionLabel` — real backend vocabulary, not fabricated records) moved
   to a new `src/moneyLabels.ts` so `MoneyStatus`/`MoneyHome` (both now real-
   mode-reachable) never pull the rest of `moneyData.ts`'s fabricated
   `MoneyDetail` fixtures into the production bundle merely to read a label.
3. `MoneyWorkspace.tsx` gained an optional `fundingFlowEnabled` prop
   (default `true`, preserving the exact existing fixture path). A real
   browser walkthrough surfaced a concrete finding: the locked rail-selection
   -> review -> confirm choreography is pure local UI state with **no
   backend call anywhere in it**, and `PaymentPending` renders a hardcoded
   fake attempt reference (`'SP-MNY-2026-0042'`) if reached — i.e. wiring
   `canFund` straight through would let a signed-in user "confirm a payment"
   that never touched SecurePayAPI and see a fabricated reference for it.
   This slice verified only the Payment Ready/next-action *read* contracts,
   not a funding/payment-intent *mutation* contract (`AgreementFundingController`
   was not inspected), so real mode passes `fundingFlowEnabled={false}`: the
   real `FUND_AGREEMENT` affordance stays visible as text (`MoneyStatus`'s
   own "Authorized next actions" list, `MoneyHome`'s "Needs you" bucket —
   test 12's "affordance becomes visible"), but the unwired local-only
   payment simulation never becomes reachable. This is the "stop and report
   the backend gap rather than invent it" instruction from the task, applied
   in place rather than halting the slice: `AgreementFundingController` /
   `CreateAgreementPaymentIntentRequest` remain an explicit, named backend
   gap for a later slice, not a silently-neutered button.

Other honest gaps, all documented in code comments at their exact site
rather than fabricated:

- `NeedsAttentionList`'s `AttentionKind` gained one additive value,
  `agreement_action`, because real `/me/actions` codes (`FUND_AGREEMENT`,
  `SUBMIT_EVIDENCE`, `START_OBLIGATION`, …) have no honest one-to-one mapping
  onto the existing fixture kinds, several of which are dispute-specific
  concepts this slice never reads; forcing a real code into one of those
  would misrepresent it. Every real action renders under this one generic
  kind, with the real backend `reason` (or a humanized `actionCode` when no
  reason is supplied) as the visible detail text.
- Detail's Terms/Progress obligations have no responsible-party identity in
  `AgreementTermResponse`; `responsibleParty` renders as an empty string
  (the closed `Obligation` type has no optional slot for "unknown") rather
  than a guessed name.
- Amendment diff (PR #202, not verified this slice) leaves the Changes tab's
  `changes` list truthfully empty; real version history still populates the
  Versions list, with `confirmedBy` drawn from `/confirmation-status` only
  for the current version (superseded versions' confirmers are not knowable
  from that endpoint and are left empty, not guessed).
- Asking the Agent from inside an Agreement Detail is not wired to the real
  Agent conversation (no verified per-Agreement-context contract is in scope
  here, and Golden Spine A already deferred `/agreements/{id}/agent-context`
  for this reason); the locked Ask bar is present but returns one honest
  static notice instead of a fabricated response.
- `AgreementStaleBanner`'s "you were viewing X, now Y" wording needs "my own"
  previously-confirmed version number specifically, and no response in this
  slice's contracts identifies which participant *is* the caller (no
  identity-decoding is permitted regardless); the banner shows for a real
  `changedReviewRequired`/`RECONFIRM_AGREEMENT_VERSION` classification with
  the honest generic phrase "a previous version" rather than a specific
  number the frontend cannot verify is the caller's own.

Navigation/routing: the existing `NavBar`/`AppView` seam is reused;
`AgentExperience` gained one `workspace` boolean gated on a real
`session.getSnapshot().status === 'signed-in'` check (never inferred from
anything else), mounting `WorkspaceExperience` for the `signed-in`/
`agreements`/`money` nav items. No new route hierarchy, no URL-persisted
authority — the same choice Golden Spine D made for the invitation hash
route. Leaving the workspace back to the conversation optionally forwards
the Home page's own "What are you trying to make happen?" input text to a
real new Agent turn, preserving the Agent-first posture the task requires.

Not started, confirming scope discipline: Store, Community, Circles,
Referrals, Plugs, Masters, Partners, Solutions. The sender-side invitation
`roleCode` doctrine blocker recorded in Golden Spine D is untouched.

Tests: `tests/signed-in.test.mjs` (`test:signed-in`) and `tests/money.test.mjs`
(`test:money`), covering Hub-bucket-authority, no local reclassification,
`TAKING_SHAPE` never promoted, Detail composition and empty-section
truthfulness, the production-bundle exclusion (including the new
`moneyData.ts`/`milestoneData.ts` split), and every Money doctrine point:
exact-status rendering, `NO_EVALUATION_YET` only via the verified 404
contract, `READY` without a matching action exposing no CTA, an exact match
exposing the affordance, a same-agreement-only/known-action-only match, and
`MoneyWorkspace`'s funding-flow gate proven by rendering it both ways and
asserting the rail-picker markup's presence/absence. All prior Golden Spine
A/B/C/D suites remain green.

### 15.1 Review fixes (2026-09-15)

Four authority/truthfulness issues flagged on PR #7 review, all fixed
without redesigning any locked Bolt visual:

1. `SignedInHome.tsx` hardcoded `Welcome back, James` and claimed `SecurePay
   remembers your agreements, people and activity`, with personal-history
   quick prompts (`What did Peter agree to?`, `Find my agreement with
   Kamau`) — but the general Agent conversation endpoints remain
   `auth: 'none'` and no authenticated Agreement/people/activity context is
   wired into that orchestrator, so none of this was truthfully answerable.
   The component gained three optional props (`greeting`/`subheading`/
   `suggestedPrompts`) that default to the exact existing fixture strings
   when omitted (verified byte-identical); `WorkspaceExperience` now passes
   `"Welcome back"` (no name), a memory-free subheading, and generic
   trade-intent prompts the signed-out Agent already truthfully handles.
2. Home's `waitingItemsView`/`attentionItemsView` re-derived NEEDS_ME/
   WAITING_ON_OTHERS locally from action presence/absence, which diverges
   from the backend's own `AgreementHubBucketClassifier` (e.g. it excludes
   passive `WAIT_FOR_DEPENDENCY`/`WAIT_UNTIL_AVAILABLE`/`NO_ACTION_REQUIRED`
   actions from NEEDS_ME, and a DRAFT/TAKING_SHAPE Agreement is never
   WAITING_ON_OTHERS). Home now shares the same one Hub read the Agreement
   Hub page already uses (`state.hub` in `controller.ts`, no separate
   `state.home`); `attentionItemsFromHub(hub.needsMe)` and
   `waitingItemsFromHub(hub.waitingOnOthers)` render exactly the backend's
   own buckets, filtering only the documented passive action codes.
3. `openDetail`/`refreshDetail` used
   `gateway.confirmationStatus(...).catch(() => [])`, so a genuine
   confirmation-status failure silently became an empty list that
   `agreementDetailView` would then render as if every participant's
   confirmation state were authoritatively known (falling back to
   `participantStatus`). The `.catch` is removed; both reads are now
   `Promise.all`-required, so a confirmation-status failure fails the whole
   Agreement Detail load closed (the existing `ErrorStateCard` path),
   exactly like a `detail()` failure already did.
4. Agreement Detail's inline Money summary derived `fundActionAvailable`
   from cached Home actions, which could go stale. Per the smallest-change
   option in the review, the inline summary now always passes
   `fundActionAvailable: false` — Payment Ready still renders in full, but
   no financial next-action claim appears there; the dedicated Money view
   (already fetching `/me/actions` fresh on every open) remains the sole
   place the Fund affordance is gated from current authority.

New/updated tests in `tests/signed-in.test.mjs`: A–E prove Home's two lists
come only from the real `needsMe`/`waitingOnOthers` buckets (DRAFT never
reclassified, ACTIVE-with-no-action never "waiting", WAITING_ON_OTHERS
rendered as-is, a passive-only action list produces no "needs you" item,
CHANGED_REVIEW_REQUIRED stays distinct); two tests drive
`createWorkspaceController` against a fake gateway to prove a failing
`confirmationStatus` fails Detail closed while a succeeding one still
renders real per-participant state; a source-pattern regression test
proves the inline Detail Money summary can no longer read `state.home` and
always passes `fundActionAvailable: false`; and two rendering tests prove
`SignedInHome`'s new props default to byte-identical fixture markup while
real-mode values never contain "James" or the memory claim.

### 15.2 Review fix: CHANGED_REVIEW_REQUIRED must still surface on Home (2026-09-15)

One further correction flagged on PR #7 review: 15.1's fix (2) fed Home's
"Needs you" list from `hub.needsMe` only. The backend's own
`AgreementHubBucketClassifier` checks `RECONFIRM_AGREEMENT_VERSION` (→
`CHANGED_REVIEW_REQUIRED`) *before* general `NEEDS_ME`, so an Agreement
needing this person's reconfirmation is never in `needsMe` — it had
silently disappeared from Home entirely.

`attentionItemsFromHub` now takes both `changedReviewRequired` and
`needsMe` (in that priority order) and keeps them as two distinct,
mutually-exclusive real classifications rather than merging one into the
other: a `changedReviewRequired` Agreement renders under the locked Bolt
`agreement_changed` kind ("Change requested"), using only that Agreement's
own real `RECONFIRM_AGREEMENT_VERSION` action's `reason` (or a humanized
fallback of the same real code); a `needsMe` Agreement keeps rendering
under the existing generic `agreement_action` kind. A `Set` of seen
Agreement ids prevents a duplicate item if malformed backend data ever
placed the same Agreement in both buckets — `changedReviewRequired` wins,
`needsMe` is skipped for that Agreement, never both. `waitingItemsFromHub`
is unchanged (still fed only the real `waitingOnOthers` bucket).
Opening a changed-review Home item was already correct without further
change: `openFromHome`/`openFromHub` both resolve through the same
`findInHub`, which locates the Agreement's one real bucket
(`changedReviewRequired`) and `boltAgreementStatus` already maps that
bucket to `change_requested` — Agreement Detail's stale/review-required
treatment was never at risk, only Home's own list was missing the item.

Tests: replaced the prior test that merely asserted `changedReviewRequired`
stayed absent from Home (an assertion of the bug, not a guard against it)
with `E1`–`E4` (appears in Needs you from the real bucket; uses the
distinct `agreement_changed` kind, not `agreement_action`; never appears in
Waiting on others; opening it resolves through the real Hub lookup and
preserves `change_requested`) plus `F` (no duplicate item if the same
Agreement is malformed into both buckets).

### 15.3 Review fix: two defensive edge cases in the changed-review path (2026-09-15)

Two further corrections flagged on PR #7 review, both in the same 15.2 code:

1. `attentionItemsFromHub`'s `changedReviewRequired` loop previously used
   `reconfirm?.actionCode ?? RECONFIRM_ACTION_CODE` — if a
   `changedReviewRequired` summary's own `nextActions` never actually
   contained a real `RECONFIRM_AGREEMENT_VERSION` entry (bucket membership
   and the summary drifting apart, a malformed/inconsistent backend
   response), this synthesized a fabricated `actionValue`/`actionLabel`/
   `detail` rather than using real data. It now fails closed: `if
   (!reconfirm) continue;` — that Agreement is simply omitted from Home's
   "Needs you" list rather than shown with invented text. No existing
   non-actionable "unavailable" presentation exists for a single Home
   attention item, and inventing one was out of scope, so omission is the
   correct minimal fail-closed behavior; the Agreement stays correctly
   bucketed and visible on the Agreement Hub page regardless, and still
   resolves to `change_requested` if somehow opened. A normal
   `changedReviewRequired` item with a real `RECONFIRM_AGREEMENT_VERSION`
   action is completely unaffected.
2. `findInHub` used the same `hubBucketOrder` as the Hub page's display
   flattening, which searches `needsMe` before `changedReviewRequired`. So
   although `attentionItemsFromHub` already gave `changedReviewRequired`
   priority for a malformed duplicate-bucket Agreement, clicking that same
   Home item resolved through `findInHub` as `needsMe` — Agreement Detail
   would have received `waiting_for_me`, silently losing
   `change_requested`. A new `hubLookupOrder` (search order only, not
   display order — `hubBucketOrder` is untouched) puts
   `changedReviewRequired` first, so `findInHub`'s priority now matches
   `attentionItemsFromHub`'s. This is duplicate-bucket conflict resolution
   between the backend's own buckets only — no lifecycle is inferred or
   reclassified locally.

Tests: `G` proves a `changedReviewRequired` summary with no real
`RECONFIRM_AGREEMENT_VERSION` action (empty `nextActions`, or only an
unrelated action) emits no Home item, while a normal valid entry in the
same call is unaffected; `H` proves a malformed
`changedReviewRequired`+`needsMe` overlap still resolves through
`findInHub` with `bucket === 'changedReviewRequired'` and
`boltAgreementStatus(...) === 'change_requested'`.

## 16. Golden Spine F: Store implementation scope (2026-09-15)

`Discover Store -> inspect factual Offer -> explicit "Use this" -> Trade Taking
Shape -> resolve the customer-specific delta through the existing Agent
conversation -> (unchanged) Agreement handoff` is wired end-to-end against the
Store platform contract verified directly against source at
`kimaniks001/SecurePayAPI` `feat/securepay-phase9-store-platform` @
`69424c1f83173b71f7cf99d20d964786aef78aa3` (`StoreController.java`,
`PublicStoreController.java`, `StoreService.java`, migrations), stacked on
`feat/securepay-phase8-money-integration-contract`. The underlying
provenance/adoption seam it reuses (`POST .../external-facts/amount`,
`sourceKind: 'STORE_LISTING'`) was independently re-verified against
`feat/securepay-agent-phase5b-provenance-adoption` @
`c211cf0ce4407be13e43836eb77e39224c8ac65f` (`AgentController.java`,
`AgentApiModels.java`, `ExternalFactSourceKind.java`). Neither stack is merged
to `main`; every Store row in section 4 stays `BACKEND_PR_PENDING` per the
same convention Golden Spine C/D/E used for their own still-stacked
contracts. No live deployed SecurePayAPI was exercised; browser acceptance
(desktop and mobile viewports) ran against a throwaway local Node HTTP
contract double implementing the exact verified request/response shapes
(not shipped with this PR) — the same methodology as prior Golden Spine
slices' own local contract doubles. The doc named in the task,
`docs/PHASE_9_STORE_FRONTEND_INTEGRATION.md`, does not exist on that branch;
the actual filename is `docs/PHASE_9_STORE_PLATFORM_FRONTEND_INTEGRATION.md`,
and its `contracts/openapi/market-store-v1.yaml` is stale relative to the
controllers (missing `/stores/search` entirely, and missing
`heroHeadline`/`storefrontPreset`/`storefrontTheme`/`mediaRefs` on its
schemas) — this slice was built from the controller/service source, not the
OpenAPI file or the doc prose.

### 16.1 Verified backend shape and the resulting doctrine decisions

- **Price is flat, not richer than Bolt's own `PriceType`**: `priceMinor:
  Long` (nullable, minor units) + a DB-constrained-constant `currency =
  'KES'`. No price-type enum, range, or unit/frequency field exists anywhere
  in `StoreService`/the controllers/the migrations. `adapters.ts`
  (`formatPrice`) maps a present `priceMinor` to Bolt's existing `'fixed'`
  price type and an absent one to a new, additive `'unlisted'` `PriceType`
  value (`types.ts`) rendering "Price not listed" — never a fabricated
  `'quote_required'` claim the backend does not make.
- **`OfferKind` is `PRODUCT | SERVICE` only** (no `package` /
  `professional_service` / `digital` / `construction` / `recurring` /
  `customizable`) and **`AvailabilityState` is a fixed 9-value enum**
  (`AVAILABLE`, `LOW_AVAILABILITY`, `NEEDS_CONFIRMATION`, `UNAVAILABLE`,
  `PAUSED`, `TAKING_WORK`, `LIMITED`, `FULLY_BOOKED`, `RESTING`), each kind
  compatible with only a subset (`StoreService.isAvailabilityCompatible`,
  mirrored client-side in `features/store/view.ts`'s `availabilityOptionsFor`
  for UX filtering only — the backend still enforces this and returns `422`
  on a mismatch). `adapters.ts` collapses Bolt's richer `offerType` taxonomy
  onto the two real kinds and labels availability from a new
  `storeLabels.ts` dictionary (mirroring `moneyLabels.ts`'s existing
  fixture-free-label pattern) rather than inventing finer categories.
- **`StoreOfferResponse`/`PublicOfferView` carry no scope
  included/excluded, conditions, documents, warranty, milestone/obligation
  seeds, or timing** — only `title`, `description` (free text),
  `priceMinor`, `currency`, `quantityAvailable`, `availabilityState`,
  `mediaRefs`. Every one of these Bolt `OfferDetail` sections already
  degrades to a truthful empty/hidden state with no component change
  needed (verified by inspection and by test N/the byte-identical fixture
  test).
- **No Store offer version/content-hash field exists** — only
  `createdAt`/`updatedAt`. Bolt's `version` field (`'v1'`/`'v2'`) is mapped
  to the offer's real `updatedAt` date (`YYYY-MM-DD`) as an honest "as of"
  stamp, never a fabricated counter. `OfferChangedState`
  (task section 10) is consequently **not wired this slice** — there is no
  backend field to truthfully drive a "this offer changed" comparison for
  Store (the closest analogue, `AGENT_PRIOR_AGREEMENT_TERM_STALE`, is scoped
  only to the unrelated prior-agreement-term-reuse flow). Documented gap,
  not a blocker.
- **No external-seller/distribution-provenance concept exists on the
  backend** — every real Store offer's seller of record is the owning
  identity itself. `isExternalReference` is therefore always `false` in real
  mode; `ExternalOfferPreview.tsx` (Bolt's ABC-Solar-style external-offer
  demo) is unreachable from real data and stays fixture-only.
- **Trader (`/store/me/**`) responses carry no `canonicalKsNumber` or
  `displayName`** — `StoreProfileResponse` has only an opaque `identityId`
  UUID, and there is no verified `GET /me` identity endpoint anywhere in the
  inspected surface that resolves one to the other. (The existing identity
  controller also actively discards the KS Number the trader typed at
  sign-in once authenticated, by design, to minimize retained PII — see
  Golden Spine C.) Consequences, both intentional and narrowly scoped, never
  routed around by decoding a token:
  - `myStoreIdentityView` (`api/securepay/store/adapters.ts`) degrades the
    trader's own Store header to a generic, non-fabricated `'Your Store'`
    label (or the real `heroHeadline`/`tagline` when present) with `operator`
    and `businessIdentity` left empty; `StoreManagementHome.tsx` gained one
    truthful, additive guard (`{store.name}{store.operator ? …
    : ''}`) so the "Acting as X" clause simply omits itself rather than
    rendering "Acting as" with nothing after it.
  - The trader's own offer rows cannot carry a real outbound Offer
    SecureLink (`myOfferView` sets `secureLink.url: ''`);
    `StoreManagementHome.tsx` gained a second truthful, additive guard
    hiding that row entirely when the URL is empty, rather than showing a
    broken link. Every **customer-facing** Offer view (search results,
    Store profile, Offer detail — all keyed by the real
    `canonicalKsNumber` from the public endpoints) gets a fully real,
    working SecureLink; only the trader's own management-list convenience
    view is degraded, and this is the one Store row this slice could not
    move past `REAL_API_AVAILABLE_NOT_WIRED`-adjacent status for that
    single field.
  - `GET /store/me/profile` is wired at the gateway/controller layer
    (`myProfile`/`updateMyProfile`) but there is no locked Bolt Store
    profile-*editing* screen among the inspected Pass 9 components to
    attach `updateMyProfile` to — inventing one would be redesigning Store.
    It stays available, tested, and unwired-to-UI rather than forced onto a
    surface Bolt never specified.
- **`TradeEntityView`/`TradeRelationshipView` never carry `sourceKind` or
  `sourceDescription` on the wire** (`AgentPublicViewMapper` strips
  `Provenance` before the response leaves the server; there is no
  "read a SourceReference" endpoint at all — the provenance carrier,
  `Provenance(sourceTurnId, sourceExcerpt, derivationNote)`, is server-side
  audit trail only). "Preserve source/provenance" for Store therefore means:
  the backend durably records that the submitted amount came from a
  `STORE_LISTING`, but the frontend can never read that confirmation back
  from `GET .../context`. `features/agent/controller.ts`'s new `useOffer`
  method is documented accordingly (see its own code comment) — it never
  claims the resulting CANDIDATE fact will visibly carry the Store
  provenance text back to the UI, only that the submission itself is real.
  The honest, durable "where did this trade come from" record for the
  *person* is the client-side Offer snapshot already rendered by
  `OfferToTradeHandoff`/`createOfferTradeSnapshot` (moved to
  `src/offerTradeSnapshot.ts`, see 16.2) — exactly the same client-computed
  snapshot pattern Bolt itself used, since no backend SourceReference read
  ever existed to source it from instead.
- **No free-text offer search endpoint exists.** `/api/v1/stores/search`
  requires `kind` (`PRODUCT`|`SERVICE`, no "all kinds" value) and filters
  only by exact `kind` plus ILIKE `category`/`location` — **ANDed**, never a
  title/description full-text match. Rather than fabricate full-text search
  or force a kind-picker onto the locked single-box `StoreHome`,
  `features/store/view.ts`'s `searchRequests` fans one typed query out
  across both real kinds and, when non-empty, `category`-only and
  `location`-only requests *separately* (never ANDed together, since an AND
  of the same string against two different columns would usually match
  nothing), merging the truthful recency-ordered results
  (`mergeSearchResults` — union, dedupe, sort by `updatedAt` desc, no
  scoring). An empty query browses everything published across both kinds,
  matching Bolt's existing empty-query behavior. **A query that matches only
  an offer's title/description (not its owning Store's category or
  location) honestly returns nothing** — a real backend gap, not a
  frontend defect, and not silently masked.
- **No "list all Stores" endpoint exists.** Bolt's `StoreHome` "Stores"
  directory section has no real backend source; real mode always passes an
  empty `stores` list (the section hides — `StoreHome.tsx`'s existing
  `{stores.length > 0 && …}` guard), rather than fabricating a directory.
  Sellers remain visible per-offer on each `OfferCard` (a real, already-
  present Bolt field), which is not a gap — just not a separate browse-by-
  business list this slice.
- **No Store enquiries/activity-feed endpoint exists** (confirmed absent in
  source, matching the task's own assumption and the backend's own recorded
  gap note). `StoreManagementHome` always receives real empty arrays for
  both; its enquiries section already hides itself when empty, and its
  "Recent activity" list gained one small truthful-empty-state line ("No
  recent activity to show yet.") since it previously had no empty-state
  guard at all.

### 16.2 New layers and Bolt component changes

New: `api/securepay/store/` (`dto.ts`, `adapters.ts`, `index.ts` —
`createStoreGateway`), `features/store/` (`controller.ts`, `view.ts`,
`route.ts`, `StoreExperience.tsx`), `src/storeLabels.ts` (pure
`AvailabilityState` label dictionary), `src/offerTradeSnapshot.ts` (the pure
`createOfferTradeSnapshot` function, moved out of `storeData.ts` so the real
`OfferToTradeHandoff` never pulls Store fixtures into the production
bundle — re-exported from `storeData.ts` for the unchanged fixture call
site). `api/securepay/http/index.ts`'s `RequestOptions.method` gained
`'PUT'` (Store's profile/offer-update endpoints are this codebase's first
`PUT`-using domain). `features/agent/controller.ts` gained one new `Pending`
variant (`external-amount`, calling the existing-but-previously-unwired
`gateway.submitAmount`) and one new public method, `useOffer` — the Store
"Use this" -> Trade Taking Shape seed, reusing the exact same
conversation-creation-if-needed/`readContext`-after machinery `run()`
already used for turns/adoption, never a second Store-specific engine.
`AgentExperience.tsx` gained a `store` boolean (mutually exclusive with
`workspace`/`home`, mirroring the existing pattern), a `storeGateway` prop,
an `initialStoreOfferRoute` prop for the public deep link, and one shared
`navigateTo` function factoring the NavBar/WorkspaceExperience/
StoreExperience navigation policy that was previously duplicated inline.
One real defect surfaced only during the browser walkthrough: `showHome`
was originally `home || state.turns.length === 0`, so seeding a real
conversation from a Store Offer (which adds a Trade Context fact but no
chat turn) silently left the person staring at the generic
"What are you trying to make happen?" prompt with no visible sign their
Offer was used. Fixed by also checking `state.conversationId`; verified live
against the contract double (see 16.4) — this exact defect only reproduces
against a real seeded conversation with zero turns, which no unit test
harness in this repo constructs.

Bolt component changes (all truthful/additive, verified either
byte-identical when the added props are omitted, or via `assert.match`
content checks where a real degradation is documented — see 16.5):

1. `StoreHome.tsx` — **fully rewritten to be props-driven**, no `storeData.ts`
   import at all (previously an unconditional static import, which would
   have pulled Store fixtures into any bundle merely reaching this
   component regardless of runtime branching). The fixture caller
   (`App.tsx`) now computes `searchOffers(query)`/`demoStores` itself and
   passes them down — the same "move the fixture call to the fixture
   caller" fix Golden Spine E applied to `AgreementDetail`/`moneyData.ts`.
   Gained a `stores.length > 0` guard (hides the directory section when
   empty — real mode's constant state, per 16.1) and `searchStatus`/
   `searchErrorText` branches for the real loading/error states.
2. `StoreManagementHome.tsx` — two truthful-hide guards (operator clause;
   per-offer SecureLink row) and one truthful-empty-state line (activity),
   all per 16.1.
3. `OfferToTradeHandoff.tsx` — one-line import path change only
   (`../storeData` -> `../offerTradeSnapshot`), fully byte-identical
   behavior (verified by test).
4. `OfferBuilderView.tsx` — **intentionally not preserved as-is.** Bolt
   Pass 9's version branched on `lower.includes('paint'/'cctv'/'iphone'/…)`
   and simulated a multi-turn Q&A with hardcoded canned replies — this was
   local mock intelligence with no backend equivalent (task section 9
   explicitly forbids shipping it as production authority). No verified
   production Agent contract can structure Store Offer facts from free
   text. Rewritten to the same two-pane "offer taking shape" visual layout
   with explicit fields (kind/title/description/price/quantity/
   availability/media references/published) that the trader themselves
   fills in and reviews before `submitDraft()` sends exactly those
   reviewed fields to the real `POST`/`PUT /store/me/offers` endpoints —
   nothing is saved from unreviewed free text.

### 16.3 Doctrine boundaries proven, not merely asserted

- **No cart/checkout anywhere** (task section 12): no Store surface reads
  or imports the Money gateway; `tests/store.test.mjs` test G grep-verifies
  every Store source file for cart/checkout/payment-intent language.
- **Opening an Offer creates no Agreement/handoff authority**: `openOffer`
  calls exactly one public GET; the `StoreReadGateway`/`StoreManageGateway`
  types have no `createHandoff`/`join`/`confirm` method for it to reach for
  (test D).
- **"Use this" is explicit and two-staged**: opening an Offer alone never
  enters Trade Taking Shape (test E); only the Offer-level "Use this" click
  switches to it (a pure local view change, no network call), and only the
  subsequent explicit "Continue to agreement" click seeds the real
  conversation (test F/F2) — reference/adoption is never conflated with
  Agreement establishment, and the STORE_LISTING fact submission never
  touches `createHandoff`/`adoptHandoff` (a fake gateway missing those
  methods proves it by throwing if ever called).
- **Public Store/Offer/search reads never require auth; trader `/me/*`
  reads and writes always do** — proven directly against
  `createStoreGateway` with a request-recording fake `HttpClient` (tests
  I/J), matching `StoreController`'s `requireAuthenticatedIdentityId()` vs.
  `PublicStoreController`'s complete absence of an auth call.
- **Offer SecureLink is its own real thing, never the Agreement invitation
  route**: `parseStoreOfferRoute`/`#/store/{ks}/offer/{id}` is a distinct
  hash namespace from `#/invitation/{token}` (test M), and no
  share-token/secureLink method was invented on the gateway (test M3).
- **`mediaRefs` render as opaque references only** — never re-fetched,
  never treated as verified evidence (test N).
- **The production bundle for the real Store route never imports
  `storeData.ts`** (test L, mirroring the existing money/moneyData.ts
  bundle-exclusion test) — proven via an `esbuild` metafile scan of
  `RuntimeApp.tsx` built with `VITE_SECUREPAY_MODE=real`.

### 16.4 Browser verification (desktop and mobile)

Ran against a throwaway local Node HTTP contract double (not shipped)
implementing the exact verified request/response shapes, with
`VITE_SECUREPAY_MODE=real` and `VITE_SECUREPAY_API_BASE_URL` pointed at it —
the same methodology Golden Spine C/D/E used. Verified, with screenshots
inspected at each step, at both a desktop viewport and a 400x900 mobile
viewport (confirming the locked bottom nav / single-column card layout):

- Signed-out Home -> Store -> real search results render from the real
  `/stores/search` endpoint (fanned across both kinds), never fixture data.
- Offer detail renders every real field (price, seller-of-record, scope
  empty-states, service area, the real `#/store/{ks}/offer/{id}`
  SecureLink, the `updatedAt`-derived "Offer 2026-09-10" stamp, "Authoritative
  offer" not "Demo offer state").
- "Use this" -> Trade Taking Shape renders the real Offer snapshot;
  "Continue to agreement" fires the real `POST
  .../external-facts/amount` (`sourceKind: STORE_LISTING`) then `GET
  .../context`, landing in the real conversation view with the live Trade
  Context panel showing a real `PAYMENT_CONDITION · CANDIDATE — 85000 KES`
  fact and its own (pre-existing, general) "Use this" adoption button,
  "Continue with this", and "Refresh understanding" — proving the Store
  slice hands off into the unmodified Golden Spine B/C pipeline rather than
  building a parallel one. This is the walkthrough that surfaced and fixed
  the `showHome`/`conversationId` defect in 16.2.
- "Manage my store" from signed-out state renders the real
  `SecureAuthCard` sign-in gate (KS Number/password -> OTP, both against
  the real `/auth/login`/`/auth/complete` endpoints); on success it lands
  directly in `StoreManagementHome`, rendering the real
  `/store/me/profile` tagline, "No recent activity to show yet.", and the
  hidden enquiries/operator/SecureLink lines exactly as documented in 16.1.
- "Create an offer" renders the reworked explicit-fields
  `OfferBuilderView`, its live "Offer taking shape" preview, and the review
  modal; "Publish offer" fires the real `POST /store/me/offers` and the
  new offer immediately appears in the real, refreshed
  `/store/me/offers` list with its real availability label and
  `updatedAt`-derived date.

### 16.5 Tests

`tests/store.test.mjs` (`test:store`, 24 tests) covers all 15 points named
in the task (A-O): real-endpoint-only search with no ranking/fixture
fallback and closed-failure handling (A/A2/B/C/C2/K); Offer-open creates no
Agreement authority and "Use this" is a distinct explicit action from
opening (D/E/E2); the real `STORE_LISTING` external-fact seed and its
no-price fallback never fabricate a call (F/F2); the Store tree has no
cart/checkout/payment-intent/Money-gateway reference (G); trader
create/update/availability-confirmation send exactly the reviewed fields to
the real endpoints, including prefilled-edit (H/H2/H3); the auth boundary
matches the verified controllers exactly, both for the gateway's own
`auth:'none'`/`'required'` tagging and for the real `HttpClient` refusing an
unauthenticated required call (I/J/J2); the Offer SecureLink route is its
own real, narrow, non-invitation namespace with no invented share-token
method (M/M2/M3); `mediaRefs` stay opaque references (N); the production
bundle excludes `storeData.ts` and `App.tsx` for the real route while
including the real Store gateway/controller (L); and Bolt fixture
rendering is preserved exactly where unchanged, with `OfferBuilderView`'s
retired mock-keyword-matching explicitly proven absent (O/O2). All prior
Golden Spine A-E suites (`foundation`/`agent`/`handoff`/`recipient`/
`signed-in`/`money`, 87 tests) remain green; `typecheck`/`lint`/`build`
all pass.

Not started, confirming scope discipline per the task's own vertical-slice
order: Community/Circles source convergence, Referrals/Plugs/Masters/
Partners/Solutions, and the sender-side invitation `roleCode` doctrine
blocker recorded in Golden Spine D. No Money/payment-intent surface was
touched or wired from Store, per task section 12.

### 16.6 Pre-merge hardening pass (2026-09-15)

Three narrow fixes requested on PR #9 review, none broadening Store scope:

1. **mediaRef privacy/security.** `mediaRefs` are client-supplied and may be
   arbitrary third-party URLs — the browser must never fetch one merely
   because a seller listed it. `adapters.ts`'s `media()` now renders a ref as
   an `<img>` src only when it parses as an absolute URL whose origin
   exactly matches a new `trustedOrigin` parameter — the one external origin
   this architecture already has verified authority over, because it is the
   app's own configured SecurePayAPI origin (`new URL(api.baseUrl).origin`,
   computed once in `RuntimeApp.tsx` and threaded through
   `AgentExperience` -> `StoreExperience` -> `createStoreController` -> every
   adapter call). Every other case — a different domain, or a string that
   is not an absolute URL at all (an opaque asset id; `new URL()` throws and
   the ref is never treated as one) — resolves to an empty `url`, and the
   existing "No photos available" empty state covers it unmodified. This is
   not a media service or a client-side proxy, just a narrow allow-check;
   no new capability was invented. Tests N–N5 in `tests/store.test.mjs`
   prove: a trusted-origin ref renders, an external ref and a no-trusted-
   origin/missing-config ref never do, an asset-id string is never treated
   as a URL, and — rendering the real adapter output through the actual
   `OfferDetail` component — an arbitrary external mediaRef never appears
   as an `<img src>` in production markup, falling back to "No photos
   available" instead.
2. **Unknown enums fail closed.** `assertKnownOfferKind`/
   `assertKnownAvailabilityState` (adapters.ts) now validate every offer
   read (public and trader) against the exact verified `OfferKind`/
   `AvailabilityState` enums and throw `ApiError('invalid-response', …)` on
   anything else — replacing the previous silent `kind ?? 'service'`
   fallback and the previous `lifecycle()`/`availabilityText()` path that
   would have treated an unrecognized state as generically actionable. No
   future enum value's meaning is inferred; an offer (or an entire search
   result page) carrying one fails that read closed. Tests 2a–2e cover the
   public offer path, the trader `/store/me/offers` path, and both the
   single-offer and search-list controller call sites.
3. **The real updated-date is not a version.** There is still no backend
   Store Offer version/hash — only `updatedAt`. `asOfDate()` now formats it
   as a fixed, non-locale-dependent "DD Mon YYYY" string (e.g. "10 Sep
   2026"), and the three Bolt surfaces that used to label this value
   "Offer version"/"Offer {value}" (`OfferDetail.tsx`,
   `OfferToTradeHandoff.tsx`, `StoreManagementHome.tsx`) now gate their
   wording on the existing `isDemoState` flag: real data reads "Updated …"/
   "Offer updated"/"Adopted facts from offer (updated …)", while the
   fixture/demo path (where `version` genuinely is a version like `'v1'`)
   is byte-identical to before (verified by test O, unchanged). The
   `sourceDescription` string built in `StoreExperience.tsx` for the
   `STORE_LISTING` external-fact seed also no longer wraps the date in
   parentheses after the offer id (which read like a version tag) and says
   "updated" explicitly. `OfferChangedState` remains unwired, as already
   documented in 16.1 — this pass did not introduce or imply any version/
   hash authority. Tests 3a–3c cover the value format and the absence of
   "version" language in both the constructed `sourceDescription` and the
   gating logic itself.

Also added: `api/securepay/index.ts`'s `createSecurePayApi` now returns the
validated `baseUrl` alongside the gateways (previously discarded after
constructing the HTTP client) — the sole source for `trustedMediaOrigin`.

`tests/store.test.mjs` grew from 24 to 36 tests, all passing; all prior
Golden Spine suites (87 tests) remain green; `typecheck`/`lint`/`build`
all pass.

## 17. Golden Spine G: Community + Circles implementation scope (2026-09-15)

`Community browsing -> real Store-offer composition -> "View offer" ->
(unchanged) real Store Offer detail -> explicit "Use this" -> Trade Taking
Shape -> real Agent conversation` plus a real self-scoped `Circle` profile
read are wired end-to-end against the Community/Circles platform contract
verified directly against source at `kimaniks001/SecurePayAPI`
`feat/securepay-phase10-community-circles` @
`b371a906660493ebc0f83554bfc79362f0c666f2` (`CircleController.java`,
`CircleProfileResponse.java`, `CircleProfileService.java`,
`community/growth/*`, and the `CircleProfile` schema in
`contracts/openapi/securepay-api-v1.yaml`), cross-checked against the Phase 11
convergence audit on `feat/securepay-phase11-referrals-plugs-masters` @
`978437f300244119302607ba3e656a76253190bb` (`docs/PHASE_10_CONVERGENCE_AUDIT.md`,
`ExternalFactSourceKind.java`). Neither stack is merged to `main`; every
Community/Circle row in section 4 stays `BACKEND_PR_PENDING` for its real-data
path per the same convention Golden Spine C/D/E/F used for their own stacked
contracts. No live deployed SecurePayAPI was exercised; browser acceptance
(desktop and 400x860 mobile viewports) ran against a throwaway local Node HTTP
contract double implementing the exact verified request/response shapes plus
the already-existing Agent/Store endpoints Community's own "Use this" hand-off
reuses (not shipped with this PR) — the same methodology as every prior Golden
Spine slice's own local contract double.

### 17.1 Verified backend shape and the resulting doctrine decisions

- **`GET /api/v1/circle/me` is the entire real Circle contract this phase
  exposes** — a self-scoped, authenticated read returning exactly
  `canonicalKsNumber`, `displayName`, `verificationStatus`, `memberSince`,
  `referredTraderCount`, `activatedReferredTraderCount`,
  `agreementsBroughtInCount`, `growthCreditTotal`. **[Phase 4 final correction
  pass, 2026-09-20]: `growthCreditTotal` has since been removed from
  `CircleProfileResponse` on `SecurePayAPI main` — the response is now exactly
  the other seven fields listed here. See `docs/PHASE4_TRADE_COMMUNITY.md`
  section A/N and `src/api/securepay/circle/dto.ts`'s own comment. This entry
  is left otherwise unchanged as the historical record of what Golden Spine G
  verified at the time.** `CircleController` has no
  arbitrary-KSNumber lookup endpoint, so none was added
  (`api/securepay/circle/index.ts`'s gateway exposes only `me`, proven by
  test J). `verificationStatus` is literally
  `ke.securepay.platform.identity.model.IdentityStatus`
  (`PENDING`/`ACTIVE`/`SUSPENDED`/`CLOSED`) echoed through — identity
  lifecycle, never a professional/qualification claim; `circleLabels.ts`
  labels it "Identity active"/"Identity pending"/etc., deliberately avoiding
  the word "Verified" as a badge (task section 4). An unrecognized value
  fails the whole read closed (`assertKnownVerificationStatus`, test I).
- **`growthCreditTotal` is a plain factual activity count, never Money** —
  `CircleGrowthCreditAwardService` awards it lazily at read time purely by
  observing three already-authoritative real events (a referred trader
  reaching `ACTIVATED`/`QUALIFIED`, or an Agreement being attributed to this
  identity as its Plug), each carrying a fixed point value with no currency
  concept anywhere in the domain. The adapter (`api/securepay/circle/adapters.ts`)
  and view (`CircleProfileView`) carry it straight through as a `number`;
  `CircleExperience.tsx` renders it as "Growth credit (count)" with an
  explicit "not Money, not a wallet balance, not currency, and never
  spendable or redeemable" line, and never attaches a currency symbol to it
  anywhere (tests F/G/G3).
- **No rank/medal/score/reputation/follower/like/success-rate field exists,
  by design** — both `CircleProfileResponse.java`'s own doctrine comment and
  the Phase 10 convergence audit are explicit that no authoritative source
  for any of those exists; this slice computes none of them and the adapter
  output type carries exactly the eight verified fields (test F, and test H
  greps the data/controller layers for absence of any such inferred field).
- **Circle-as-named-group does not exist on the backend** — the Phase 10
  convergence audit (§2, reproduced in
  `docs/BACKEND_PHASE11_CONVERGENCE_UPDATE.md`) classifies this as a real,
  deliberately deferred product-shape decision, not a small gap: "Building it
  speculatively, without a concrete membership/organizer UI requirement to
  size it against, risks exactly the kind of premature, over-scoped backend
  the convergence instructions warn against." Golden Spine G therefore builds
  no named-Circle UI against real data at all. Bolt's rich named-Circle
  screens — `CircleHome`, `CircleDiscoveryList`, `CircleMemberDirectory`,
  `CircleEconomicSummary`, `CircleCreateFlow`, `CircleJoinFlow` — are
  completely untouched (byte-identical to `bolt-reference-pass11`, test T)
  and are never imported by the real route (test C); the real Circle
  experience (`features/circle/CircleExperience.tsx`) is a new, narrow
  component that renders only the real profile plus a truthful "Named
  Circles ... are not available yet" notice in the same visual language.
  This means the real Circle nav destination does not reuse Bolt's
  `CircleHome`/`CircleDiscoveryList` visual layout at all — a deliberate,
  documented exception to "preserve visual location," because the rich
  layout's entire premise (a named group with members/rules/economic
  activity) has no real backend referent to degrade into truthfully; a
  narrower truthful screen was judged more honest than forcing empty states
  into a members/rules/economic-activity layout with nothing real to show in
  any of those slots.
- **No backend persistence exists for any Community content object**
  (Question/Need/Opportunity/Work Story/Discussion) — confirmed by direct
  inspection in the Phase 11 convergence audit (§1): "no backend persistence
  for Community content objects ... exists anywhere in this repository,"
  classified `FRONTEND-ONLY COMPOSITION`. Golden Spine G therefore never
  fabricates any of these object types from real data; the real
  `CommunityHome` renders their sections only when non-empty (their existing
  `.length > 0` guards, unchanged), and in real mode they are always empty.
  People/business discovery has the same gap: `SearchProvidersTool`/
  `GetProviderProfileTool` (`services/agreement/src/main/java/ke/securepay/agreement/agent/discovery/`)
  are Agent-tool-only (reachable solely through a live conversation turn, via
  the already-existing generic `DISCOVERY`/`PROVIDER_RESULTS`/
  `PROVIDER_PROFILE` component rendering in `api/securepay/agent/discovery.ts`
  — wired in an earlier Golden Spine slice, not this one), not a standalone
  browsable directory endpoint; real `CommunityHome` therefore always
  receives empty `people`/`businesses` arrays and hides that section
  (`.length > 0` guard, additive), while its existing "Ask SecurePay to find
  help in the community" entry point (already truthful) is the real discovery
  path.
- **The one real Community content this phase has is a Store Offer
  reference** — task sections 7/9 explicitly invite exactly this
  composition. `features/community/view.ts`'s `storeResultToCommunityObject`
  maps a real, already-productionized Store search result
  (`features/store/view.ts`'s `searchRequests`/`mergeSearchResults`, reused
  completely unchanged — no second search engine, test U2) into a
  `CommunityObject` of type `store_offer_reference` with only real fields:
  `author`/`title`/`body`/`generalLocation` straight from the search result,
  `responses: []` (never fabricated), and a synthetic id
  (`store-offer:{ks}:{offerId}`) that round-trips back to the exact real
  identifiers (test "parseStoreOfferCommunityObjectId recovers..."). Because
  this is the *only* real object type, and `CommunityObjectDetail`'s
  "I can help"/"Discuss this"/"Start trade with helper" affordances are
  gated on `need`/`opportunity`/`question` types (unchanged, untouched
  logic), none of those consequential-looking actions is ever reachable from
  real data — a direct, structural consequence of the composition choice,
  not a separate guard that had to be added.
- **Community "Use this" is never wired as a new adoption path — it reuses
  the real Store `STORE_LISTING` pipeline unchanged.** Opening a real
  Community object's "View offer" hands off through the exact same
  `StoreExperience.openOffer` → `OfferDetail` → "Use this" → Trade Taking
  Shape → "Continue to agreement" → `features/agent/controller.ts`'s
  `useOffer` (submits the real `STORE_LISTING` external fact) pipeline
  Golden Spine F already productionized, completely unmodified. No
  Community-specific external-fact/adoption call, and no reference to
  `COMMUNITY_KNOWLEDGE`, exists anywhere in the new Community/Circle files
  (tests O/P) — there is no real Community content object with its own
  adoptable facts to justify a second engine, and the task itself names this
  exact Store-offer case as the one where the existing Store path must be
  reused rather than relabelled.
- **Community composer/discussion never claim real persistence.** There is
  no verified persistent Community-post/feed backend contract in this phase
  (same Phase 10 convergence finding as above). `CommunityComposer.tsx` and
  the tool-call-only `CommunityDiscussionCard`/`CommunityStoryCard`/
  `CommunityResultCard` components are never imported by the real Community
  route (tests L/M) — those latter three are Bolt-fixture `mockAgent` tool-
  result shapes (`CommunityDiscussionResponse`/`CommunityStoryResponse`/
  `CommunityResultResponse`) that were never part of the real
  `AgentComponentView` union to begin with (`api/securepay/agent/adapters.ts`
  only ever produces `MESSAGE`/`AGREEMENT_PREVIEW`/`DISCOVERY`), so they were
  already structurally unreachable in real mode before this slice; Golden
  Spine G's own new code additionally never references them. The real
  Community composer entry point (`onCreate`) shows a truthful "Sharing with
  the community is not available yet." notice instead of mounting the
  composer at all.

### 17.2 New layers and Bolt component changes

New: `api/securepay/circle/` (`dto.ts`, `adapters.ts`, `index.ts` —
`createCircleGateway`), `features/circle/` (`controller.ts`,
`CircleExperience.tsx`), `src/circleLabels.ts` (pure
`CircleVerificationStatus` label dictionary, mirroring `storeLabels.ts`'s
fixture-free-label pattern), `features/community/` (`controller.ts`,
`view.ts`, `CommunityExperience.tsx`). `api/securepay/index.ts`'s
`createSecurePayApi` gained `circle: createCircleGateway(http)`;
`RuntimeApp.tsx` gained a `circleGateway` built with the same
`withSessionRefresh` session boundary every other authenticated gateway
uses. `AgentExperience.tsx` gained `community`/`circle` booleans (mutually
exclusive with `store`/`workspace`/`home`, mirroring the existing pattern),
a `circleGateway` prop, and a `storeOfferRoute` piece of state so
Community's "View offer" can hand a specific `{canonicalKsNumber, offerId}`
into a fresh `StoreExperience` mount exactly like the existing
`#/store/{ks}/offer/{id}` SecureLink deep link already does — reusing that
one mechanism rather than inventing a second.

Bolt component changes (both required for truthful, not cosmetic, reasons,
following the exact "move the fixture call to the fixture caller" pattern
Golden Spine E/F used for `AgreementDetail`/`StoreHome`):

1. `CommunityHome.tsx` — **fully rewritten to be props-driven**, no
   `communityData.ts` import at all (previously an unconditional static
   import). The fixture caller (`App.tsx`) now computes
   `searchCommunity(query)`/`demoPeople`/`demoBusinesses` itself and passes
   them down. Gained a `(people.length > 0 || businesses.length > 0)` guard
   (hides that section when empty — real mode's constant state) and optional
   `storeSearchStatus`/`storeSearchErrorText` props for the real "Offers from
   stores" loading/error states, both omitted (no rendering change) in
   fixture mode.
2. `CommunityObjectDetail.tsx` — the `offer` lookup moved from an internal,
   unconditional `import { getOfferById } from '../storeData'` to a required
   prop the caller resolves (fixture `App.tsx` calls `getOfferById` itself;
   real mode passes the actual fetched Store offer from the search result
   already in hand, no extra network round-trip). This is the same fixture-
   import-elimination fix Golden Spine F applied to `OfferToTradeHandoff`,
   required here because this component is reachable from the real
   Community route the moment a `store_offer_reference` card is opened.

### 17.3 A real defect found and fixed during the browser walkthrough

`StoreExperience.tsx`'s debounced live-search effect used a boolean
`skippedFirstDebounce` ref to skip re-searching on its own first commit.
This is unsafe under React 18 StrictMode's dev-only mount→cleanup→mount
replay: the replay re-invokes the effect a second time on initial mount, and
the boolean ref already reads `true` on that second invocation (refs are not
reset between the replayed invocations), arming a *real* 400ms timer that
later calls `controller.submitSearch()` — which unconditionally sets
`view: 'home'`. On a normal "click a card from Store Home" mount this is
silently harmless (the view is already `'home'`). But Community's "View
offer" hand-off (and, on inspection, the pre-existing `#/store/{ks}/offer/{id}`
SecureLink deep link, which mounts `StoreExperience` fresh directly into the
`'offer'` view via `initialOfferRoute`) is exactly a fresh mount into a
non-home view — roughly 400ms after landing on the real Offer detail page,
the ghost timer fired and silently reset the view back to Store Home. This
is a genuine pre-existing defect in already-shipped Store code (Golden Spine
F), only surfaced because Community's hand-off exercises the same
fresh-mount-into-offer path a second time; it was never caught by any unit
test because no test harness in this repo renders `StoreExperience` through
real timers under `StrictMode`. Fixed by replacing the boolean ref with a
`previousQuery` value ref that compares the actual query value (identical
across the StrictMode replay, so no false-positive re-search is ever armed);
the identical, copied pattern in the new `CommunityExperience.tsx` was fixed
the same way pre-emptively. No test in this repo exercises `StrictMode`'s
double-invoke behavior directly (Node's test runner renders outside a
browser), so this fix is verified only by the browser walkthrough itself,
not by an automated regression test — a known, named gap, not a silent one.

### 17.4 Doctrine boundaries proven, not merely asserted

`tests/community-circles.test.mjs` (29 tests, A-W per the task's own lettering)
covers: the real `/circle/me` auth boundary and closed-failure-before-network
behavior (A/B); the real route's exclusion of `circleData.ts`/`communityData.ts`
from the production bundle, both by bundle scan and by direct source-import
grep (C/D/S); no fixture fallback on backend failure (E/E2); `CircleProfile`
exposing exactly the eight real fields with no rank/medal/score field (F) —
**[Phase 4 final correction pass, 2026-09-20]: test F's own assertion has
since been updated to seven fields, matching `growthCreditTotal`'s removal
from the backend response; see the 17.1 annotation above**;
`growthCreditTotal` staying a plain number with no currency anywhere in the
rendered profile (G/G3); no rank/rating/reputation/medal/follower/like/
success-rate inference in the data layer (H); an unrecognized
`verificationStatus` failing closed (I); the real Circle gateway exposing
only the one verified read, with no join/create method to call (J); the real
Circle experience rendering no Join/Create action and the truthful gap
notice (K); the real Community experience never mounting the Composer or a
Discussion/reply surface (L/M); no Agreement/Money/party authority reachable
from either feature (N/Q/R); no Community-specific adoption engine and no
`COMMUNITY_KNOWLEDGE` usage anywhere, proving the Store-offer hand-off is the
only real "Use this" path and it stays `STORE_LISTING` (O/P); no new
client-side ranking logic, with the existing recency-only Store merge reused
unchanged (U/U2); no stale/invented named-Circle endpoint (V); Bolt fixture
rendering fully preserved for every untouched Circle/Community component,
byte-identical against `bolt-reference-pass11` (T), and the rewritten
`CommunityHome`/`CommunityObjectDetail` still rendering the same real Bolt
fixture content (T2); and a final meta-test (W) that spawns
`node --test` over all seven prior Golden Spine suites and asserts they
still pass. All prior suites (124 tests) remain green; `typecheck`/`lint`/
`build` all pass. One incidental pre-existing fix: `tests/store.test.mjs`'s
own production-bundle-scan test (L) was missing the `.png` esbuild loader
option `tests/money.test.mjs` already had, which made it fail outright in
this environment (confirmed failing identically on a clean pre-task
checkout) independent of anything in this slice; added the same one-line
loader option, restoring it to green.

### 17.5 What remains untouched, confirming scope discipline

Referrals/Plugs/Masters/Partners/Solutions, the sender-side invitation
`roleCode` doctrine blocker (Golden Spine D), and the Money
funding/payment-intent mutation gap (Golden Spine E) are all unaffected by
this slice. No Community/Circle file imports the Money gateway or any
Agreement/handoff authority (tests N/Q/R). The rich Bolt named-Circle
membership/feed/economic-story model, the universal cross-object
`SourceReference` persistence Bolt's own richer contract implies, and
`COMMUNITY_KNOWLEDGE` wiring all remain named, documented gaps — not
silently dropped, and not fabricated to look complete.

### 17.6 Pre-merge truth/auth hardening pass (2026-09-15)

Six narrow issues flagged on PR #10 review, none broadening Community/Circle
scope and none touching the parked visual-identity work:

1. **Fake named-Circle copy removed from real Community.** `CommunityHome.tsx`
   hardcoded "Your Circles" / "Trusted economic networks — Construction
   Circle, Creative Professionals, and more" unconditionally — real mode has
   no named-Circle authority at all (17.1), so naming two specific fictitious
   Circles there was a direct false-membership implication. `CommunityHome`
   gained four optional copy-override props (`circlesEntryLabel`,
   `circlesEntryDescription`, `searchPlaceholder`, `noResultsMessage`), all
   defaulting to the exact existing fixture strings when omitted — fixture
   rendering is unchanged (test H2/H5). `CommunityExperience.tsx` passes
   truthful real-mode copy: "Your Circle profile" / "See your real network
   activity — referrals, agreements brought in, and growth credit. Not a
   named Circle or group." (tests H1/H3); the button still opens the real
   `CircleExperience` unchanged.
2. **Real Community search copy now matches real search capability.** The
   real search box previously read "Search people, businesses, questions,
   needs, work..." though this slice's only real searchable content is Store
   offers (17.1). Real mode now reads "Search store offers by category or
   location..." and the empty state reads `No store offers found for
   "{query}".` instead of the generic `No results for "{query}".` (tests
   H4/H5) — neither implies people/questions/needs/work were searched when
   they were not.
3. **Store Offer reference metadata corrected.** `CommunityObjectDetail.tsx`
   rendered "Posted by {author} · {date}" unconditionally, which reads as
   authored Community content for a `store_offer_reference` object — it is a
   reference to canonical Store truth, not a post. It now renders "Store:
   {author} · {date}" specifically for `store_offer_reference`, unchanged
   ("Posted by ...") for every genuine Community content type (tests
   H6/H7).
4. **`memberSince` wording corrected.** `CircleProfileService` sources this
   field from `ks_identities.created_at` (identity creation), never a
   named-Circle join timestamp — confirmed directly in its own class
   Javadoc. The real Circle profile card previously read "Member since
   {date}", which reads as Circle/community membership; it now reads
   "SecurePay identity since {date}" (test H8; ledger section 4 wording
   updated to match).
5. **Session-transition hardening in `CircleExperience`.** The mount effect
   previously only loaded when `sessionState.status === 'signed-in' &&
   state.profile.status === 'idle'` — a mounted `CircleExperience` (unlike
   `WorkspaceExperience`, which fully unmounts on sign-out) survives a
   sign-out/sign-in cycle, so a stale `ready`/`error` profile from a
   previous session could survive into a newly authenticated one and would
   never auto-reload. The effect now resets the profile
   (`controller.reset()`) on every transition away from `signed-in`, and
   loads fresh (`controller.load()`, unconditional on `profile.status`) on
   every transition into `signed-in` — covering both explicit sign-out and
   re-authentication after a session refresh/loss. No token is decoded and
   no identity is inferred; this only reacts to the existing
   `SessionStore.getSnapshot().status` the component already reads (tests
   H9/H10).
6. **Community search response-ordering guard.** `createCommunityController`'s
   `runSearch` had no protection against an older, slower request resolving
   after a newer, faster one and overwriting its result (a real risk with
   the existing 400ms-debounced live search once two requests are in flight
   at once). A monotonically increasing `searchSequence` counter is captured
   at the start of each `runSearch` call; a response (success or error)
   is applied only if its captured sequence still matches the latest one —
   a superseded response is silently discarded rather than ever reaching
   `search` state. No ranking and no cancellation/AbortController
   infrastructure was added — the guard is a single counter comparison
   (tests H11/H12).

`tests/community-circles.test.mjs` grew from 29 to 41 tests, all passing;
all prior Golden Spine A-F suites (124 tests) remain green; `typecheck`/
`lint`/`build` all pass.

## 18. Golden Spine H: Referrals + Plugs + Masters implementation scope (2026-09-16)

`Real Master profile lookup → explicit request → cost proposal/acceptance →
opinion` plus `real customer/Plug market-matching → explicit Agreement Plug
attribution` plus `real R11A referral code/history/redemption` are wired
end-to-end, verified directly against source at `kimaniks001/SecurePayAPI`
`feat/securepay-phase11-referrals-plugs-masters` @
`978437f300244119302607ba3e656a76253190bb` (the docs-only head recording PR
#207; the actual feature commit is `9ebe59b1`, stacked on Phase 10 @
`b371a906`). Inspected directly: `MasterController.java` and every
`api/master/request|response` DTO, `MasterProfile.java`/`MasterRequest.java`/
`MasterOpinion.java` and their status/context enums, `MasterProfileService`/
`MasterRequestService`/`MasterOpinionService`, `MasterProfileDoctrineTest`/
`MasterRequestDoctrineTest`/`MasterOpinionDoctrineTest`/
`MasterRequestServiceTest`; `AgreementPlugAttributionController.java` and its
request/response records; `KeyContractReferralProjectionService`/
`KeyContractReferralEvaluationState`; `PlugMarketEntryController.java` (full
source, all records); `CustomerPlugRelationshipLifecycleController.java`;
`ReferralController.java` and every `api/referral/request|response` DTO;
`ExternalFactSourceKind.java`; `docs/PHASE_10_CONVERGENCE_AUDIT.md` and
`docs/SECUREPAY_BACKEND_MASTER_EXECUTION.md`. No live deployed SecurePayAPI
was exercised; browser acceptance (desktop and 400x860 mobile viewports) ran
against a throwaway local Node HTTP contract double implementing the exact
verified request/response shapes (not shipped with this PR) — the same
methodology as every prior Golden Spine slice's own local contract double.

### 18.1 The task's "one uniformly BACKEND_PR_PENDING surface" framing was wrong — verified by direct diff

The task briefing treated Referrals+Plugs+Masters as one Phase-11-gated
surface. Diffing every controller/service file above against `origin/main`
directly (`git diff <sha> origin/main -- <path>`) found this is **not**
uniform:

- **Already on `origin/main`, byte-identical, real and live today:**
  `AgreementPlugAttributionController`'s original POST/GET
  `plug-attribution` (only its new `referral-status` sub-route is Phase 11);
  the entire `ReferralController` (all four R11A endpoints); the entire
  `PlugMarketEntryController`/`CustomerPlugRelationshipLifecycleController`
  customer-side matching flow that produces a real `relationshipRef`.
- **Genuinely new to the unmerged PR #207 stack:** the entire
  `ke.securepay.core.master` package/`MasterController`, and
  `KeyContractReferralProjectionService`/the `referral-status` endpoint.

This changed the classification in section 4 above: most Plug/Referral rows
are `REAL_API_WIRED` (verified against real, mergeable-today source), not
`BACKEND_PR_PENDING`; only Master (100%) and the new per-Agreement
`referral-status` evaluation read stay `BACKEND_PR_PENDING`.

**[Phase 4 final correction pass, 2026-09-20]**: PR #207 has since merged. The
entire `ke.securepay.core.master` package and `KeyContractReferralProjectionService`/
`referral-status` are now also `REAL_API_WIRED`, live on `SecurePayAPI main` — re-confirmed
by directly reading current `main` (see `docs/PHASE4_TRADE_COMMUNITY.md`). Nothing in this
domain remains `BACKEND_PR_PENDING` today.

### 18.2 Two distinct, real "referral" domains — kept separate, never conflated

- **R11A generic referral-code system** (`ke.securepay.core.referral.*`, on
  `main`): `GET /api/v1/referrals/me/code` (get-or-create my own shareable
  code), `POST /redeem`, `GET /me/history` (a genuinely real "list all my
  referrals" global history — `ReferralHistoryResponse{referralCode,
  totalReferred, activatedOrLaterCount, relationships}`, each relationship
  carrying `status` (`PENDING`/`ACTIVATED`/`QUALIFIED`), `rewardAmountMinor`/
  `rewardCurrency` (both null until `ReferralQualificationService` records a
  real settlement-derived qualification), `qualificationExplanation`), and
  `GET /me/lifetime-share` (the Plug's own gross earnings aggregate —
  deliberately carries no available/withdrawable/net/payout field, per the
  backend's own Javadoc).
- **KeyContract / Agreement-Plug-Attribution system**
  (`ke.securepay.core.agreement.attribution.*` +
  `ke.securepay.core.referral.keycontract.*`): "a Plug introduced me to this
  specific Agreement, and earns 10% of the SecurePay platform fee at
  qualifying settlement." Per-Agreement only, scoped to the Agreement's
  creator; no cross-Agreement list exists in this domain.

Bolt's `ReferralHistoryView` (fixture-only `demoReferralEvaluations`/
`demoIntroductions`, an introducer/introduced-to/candidate+qualification+
reward-status triad) matches neither domain's real field shape closely
enough to reuse as-is — Golden Spine H builds two new, narrow real screens
instead (`features/referral/ReferralExperience.tsx` for R11A,
`features/plug/PlugExperience.tsx`'s attribution panel for KeyContract),
following the same divergence precedent Golden Spine G used for Circle's
named-group gap. `ReferralHistoryView.tsx`/`PlugProfileCard.tsx`/
`MasterProfileCard.tsx`/`MasterRequestView.tsx`/`MasterOpinionView.tsx` stay
completely untouched, fixture-only.

### 18.3 Plug attribution — the real relationshipRef flow, wired in full

The task briefing called `relationshipRef` "a verified existing relationship
reference" without describing how one is obtained. The real, full path
(verified from `PlugMarketEntryController.java` source, all wired this
slice, customer-side only — no Plug-side "become a Plug"/opportunity-offer
UI exists in Bolt and none was built):

1. `POST /api/v1/market-network/customer-requests` (header `Idempotency-Key`,
   body `{requestType: GENERAL_SECUREPAY_HELP | PROPERTY_JOURNEY_HELP}`).
2. `GET .../customer-requests/{id}/candidates` → opaque
   `{candidateRef, interestedAt}` only — **no name, domain, or geography
   field exists anywhere in this projection**, confirming the task's own
   Plug-profile-richness gap concern directly from the real candidate-
   selection payload, not just the profile endpoint.
3. `POST .../customer-requests/{id}/selection` `{candidateRef}`.
4. `POST .../customer-requests/{id}/relationship` → the real
   `CustomerPlugRelationshipResponse.relationshipRef` (UUID).
5. That exact `relationshipRef` is the only value
   `POST /api/v1/agreements/{agreementId}/plug-attribution` accepts
   (`AgreementPlugAttributionRequest{relationshipRef}` — the only field; the
   server derives `plugKsNumber` server-side).

`api/securepay/marketnetwork/` is the new customer-side-only gateway
(`createRequest`, `myRequests`, `cancelRequest`, `candidates`, `selection`
GET/POST, `relationship` GET/POST, `relationshipLifecycle`). The Plug-side
`/plug/entry`/`/plug/exit`/`/plug/me`/`/plug/relationships`/
`/opportunities/**` endpoints are deliberately not wired — no Bolt surface
for "become a Plug" exists, and wiring them would be inventing a UI Bolt
never designed, not productionizing a locked one.

`api/securepay/http/index.ts`'s `RequestOptions` gained an optional
`headers` field — the first endpoint in this codebase requiring a literal
HTTP header (`Idempotency-Key`) rather than an idempotency key carried in
the request body (every prior idempotent mutation, e.g. `join`/
`confirmVersion`, used a body field).

Conflict/immutability (verified from `AgreementPlugAttributionService`,
wired exactly): first attribution for an Agreement succeeds; a repeat POST
with the *same* `relationshipRef` is idempotent (returns the existing
attribution); a POST with a *different* relationship after one already
exists throws `AttributionConflictException` → real `409` → the frontend
controller (`features/plug/controller.ts` `attributeToAgreement`) leaves the
held `existingAttribution` completely untouched on any failure, never
optimistically updating (task tests L/M). A "no attribution yet" `404` on
the `GET` read is treated as the real, valid `empty` `RemoteState`, never an
error (task section 18).

**Real defect found during the browser walkthrough:** after a successful
attribution, the already-loaded `referralStatus` (KeyContract evaluation
state, fetched once on entry when it was truthfully `NO_INTRODUCTION`) sat
stale on screen — the attribution had just made a real state transition
possible, but nothing re-read it. Fixed: `attributeToAgreement` now re-reads
`referralStatus` immediately after a successful attribution (`features/plug/controller.ts`).
Verified live against the contract double: the panel correctly moved from
`NO INTRODUCTION` to `CANDIDATE` immediately after attribution, with no page
reload.

### 18.4 Master — the full non-dispute lifecycle, wired against a contract double

`MasterController` (`/api/v1/master`, entire package new to PR #207) is
wired via the new `api/securepay/master/` gateway/adapters and
`features/master/` controller/`MasterExperience.tsx`:

- `POST /me/designate`, `POST /requests`, `POST /requests/{id}/propose-cost`,
  `POST /requests/{id}/accept`, `POST /requests/{id}/decline`,
  `POST /requests/{id}/opinion` — all `auth: 'required'`.
- `GET /{identityId}/profile` and `GET /requests/{id}` — verified **genuinely
  public** (no `actorProvider` call in either controller method at all,
  confirmed by direct source read); wired as `auth: 'none'`, not the
  protected reads the task briefing implicitly assumed.

**No Master directory/search endpoint exists** (confirmed absent from
source — only exact-identityId profile lookup). `MasterExperience.tsx`
renders this honestly: a person reaches a real profile only by an
`identityId` reference they already have; the UI never fabricates a
browsable list. `MasterProfileCard.tsx` stays fixture-only because its
`identity` field assumes a display name the real API never returns (only an
opaque `identityId`) — the real screen labels it "Master reference:
{identityId}", never a fabricated name.

**Confirmed CRITICAL backend gap:** `MasterAuthorityException` (wrong
owner, invalid state transition, duplicate self-designation, optimistic-lock
conflict) has **no `@ExceptionHandler`** anywhere in `ApiExceptionHandler`
at this SHA — every one of these becomes an unhandled `500` with no
structured error body, indistinguishable from a genuine server outage.
`features/master/controller.ts`'s `errorText(error, isMutation)` therefore
treats *any* non-2xx from a Master mutation as one generic closed failure
("This action could not be completed. It may not be allowed for your role
or this request's current state.") — it never guesses which specific rule
was violated. Reads (`profile`, `request`) still distinguish a real,
handled `404`.

Because the frontend never decodes identity and cannot know whether the
signed-in caller is the request's own `masterIdentityId` or
`requestingIdentityId`, `MasterExperience.tsx` shows every state-machine-
valid action (propose-cost, accept, decline) labelled with which role it
requires ("Propose cost (Master only)", "Accept cost (Requester only)") and
lets the backend's own role check enforce and fail the request closed —
never a client-side role guess.

State machine wired exactly as verified (`MasterRequest.java` +
`MasterRequestService`): `REQUESTED → COST_PROPOSED → ACCEPTED →
OPINION_SUBMITTED`, with `DECLINED`/`CANCELLED` as other terminal/dead
states. `cancel()` and `MasterOpinion.supersede()` exist on the domain model
but have **no HTTP endpoint** — no Cancel/Correct-opinion UI action was
added, since there is nowhere real to send it.

A monotonically increasing sequence counter guards `lookupProfile` against
an older, slower reference lookup overwriting a newer one (mirroring the
Community search-sequence pattern) — the only place in this slice two
overlapping requests against the same read are plausible from ordinary
typing/re-lookup behavior.

### 18.5 Referral (R11A) — real code, history, and redemption

`api/securepay/referral/` (`createReferralGateway`) wires `myCode`,
`myHistory`, `redeem` to `features/referral/ReferralExperience.tsx` (my own
shareable code, real per-relationship status/reward, and an explicit
"redeem a code" action — a real, safe action with no Bolt UI precedent,
added as a small additive screen in the same visual language, matching the
task's own instruction to make Bolt real without inventing unrelated
authority). `myLifetimeShare` (the Plug's own gross earnings) is gateway-
wired and tested but not attached to any UI — it is a Plug-facing dashboard
concept with no Bolt component to attach it to this slice, the same
"wired, tested, unwired-to-UI" precedent Golden Spine F used for Store's
`updateMyProfile`.

Reward fields (`rewardAmountMinor`/`rewardCurrency` and the KeyContract
`rewardAmountMinor`/`currency`) render only when the backend supplies both
together — never defaulted, never inferred. `rewardPaid` (KeyContract) is
always `false` in every branch of the verified backend today — no payout
authority exists anywhere — and is rendered as a plain boolean fact, never
implying a pending payment. No referral surface anywhere renders a Pay/
Release/Withdraw/Send-Money action (task section 5).

### 18.6 Entry points

Bolt's `TradeHelpPanel` had **no live entry point anywhere in the real app**
(only reachable via the frozen `#/demo/help` fixture route) and its own
"Referral history" button had no `onClick` at all in the locked component.
Golden Spine H adds:

- `TradeHelpPanel` gained an optional `onReferrals` prop (byte-identical
  fixture rendering when omitted, verified by test AH1) wiring the
  previously-dead button to the real Referral experience.
- `CommunityHome.tsx` gained an optional `onOpenEcosystem` prop/button
  ("Help this trade happen," byte-identical when omitted) — the natural real
  entry point, since `ecosystem` already groups under the Community NavBar
  tab (`NavBar.tsx`'s existing `isActive` check).
- `AgreementSupport.tsx` gained an optional `onOpenReferral` prop/button
  ("Referral & Plug attribution," byte-identical when omitted), threaded
  through `AgreementDetail.tsx` → `WorkspaceExperience.tsx`'s new
  `onOpenReferral` prop, so a specific Agreement's real Plug attribution/
  referral-status can be reached and set from that Agreement's own Support
  tab — the walkthrough's "referral detail for a real Agreement" step.

`features/ecosystem/EcosystemExperience.tsx` is the new thin router (mirrors
`AgentExperience`'s existing Store/Community/Circle routing pattern),
composing `TradeHelpPanel` (real) with `MasterExperience`/`PlugExperience`/
`ReferralExperience`. Formal Solutions/Partners remain the documented
demo-only gap (task section 22/doctrine — Partner/Solution institutional
authority is explicitly blocked pending human confirmation, per
`docs/BACKEND_PHASE11_CONVERGENCE_UPDATE.md`); selecting them shows a
truthful "not available yet" notice, matching the existing pattern used
elsewhere in `AgentExperience.navigateTo`.

### 18.7 Privacy/session-clearing

`PlugExperience` resets its controller (candidates/selection/relationship/
attribution/referral-status) on every transition away from `signed-in`, and
reloads fresh on every transition into it (mirroring `CircleExperience`).
`MasterExperience` clears request/opinion/draft state on the same
transition via a new `resetSession()` controller method — the looked-up
Master profile itself is a public, identity-free read and is deliberately
left alone, so signing out mid-lookup doesn't discard a reference the
person is still reading. `ReferralExperience` reloads on sign-in and resets
on sign-out, identical to `CircleExperience`'s own pattern.

### 18.8 What remains untouched / documented gaps

- Dispute Master (`DisputeMasterEscalation`, Phase 9B) is completely
  unaffected — the non-dispute `MasterRequestSourceContext` enum has no
  `DISPUTE` value by design, and no new file references
  `DisputeMasterEscalation` (test AE).
- No Master directory/search, no appointment/scheduling authority beyond
  the `siteVisitRequired`/`siteVisitDetails` free-text fields, no rich Plug
  profile (name/domain/geography/availability) — all confirmed absent from
  source, not merely assumed.
- `MASTER_OPINION` was added to the real `ExternalFactSourceKind` enum by
  PR #207 but is functionally inert: no controller/service anywhere
  references it, and the only submission shapes that accept a `sourceKind`
  (`SubmitExternalAmountFactRequest`/`SubmitExternalDateFactRequest`) are
  amount/date-only — there is no free-text-observation fact type. Wiring a
  real "Use this direction" from a Master opinion would therefore mean
  reusing the existing `submitAmount`/`submitDate` Agent methods with
  `sourceKind: 'MASTER_OPINION'` for a numeric/date fact the opinion
  happens to mention — never the opinion's substantive text. This slice
  does not wire it (no natural numeric/date fact exists on the demo
  opinion content used in the walkthrough); the existing Golden Spine B/C
  adoption pipeline is untouched and remains the correct, only reuse path
  if a later slice adds it.
- Formal Solutions/Partners remain demo-only, unchanged from prior slices.
- Money/payment-intent surfaces are untouched; no referral/Plug/Master file
  imports the Money gateway (tests H/I/X/AA).

### 18.9 Tests

`tests/referrals-plugs-masters.test.mjs` (`test:referrals-plugs-masters`, 56
tests, A-AJ per the task's own lettering) covers: production-bundle
exclusion of `ecosystemData.ts` (A/P); no fixture fallback on API failure
(B1-B3); the exact verified auth boundary for every Master/market-network/
referral/attribution endpoint, including the literal `Idempotency-Key`
header (C1-C5); the two genuinely public Master reads (D); every unknown
enum failing closed — Master designation/availability/source-context/
status, KeyContract referral state, R11A relationship status, customer
market request type/status/relationship status (E/F); reward amount/
currency rendered only when both backend fields are present, and never as a
Pay/Release/Withdraw/Send-Money action (G/H); no referral file importing
Money (I); Plug attribution's explicit-action/real-relationshipRef/fail-
closed-on-failure/fail-closed-on-conflict doctrine (J-M); no Agreement-
party/guarantor/certified-provider claims (N/O); Master fields/doctrine
(Q-Y); opinion submission fidelity and no Agreement side effect (Z/AA); no
invented MASTER_OPINION submission path (AB); no fake appointment (AC); the
dispute-Master boundary (AD/AE); session-clearing on sign-out for all three
new controllers, both functionally and by source-pattern (AF); a stale-
response race guard on Master profile lookup (AG); Bolt fixture
preservation, including `TradeHelpPanel`'s byte-identical markup with
`onReferrals` omitted (AH); no client-side ranking (AI); and a meta-test
running all eight prior Golden Spine suites (AJ). All prior suites (221
tests total across `foundation`/`agent`/`handoff`/`recipient`/`signed-in`/
`money`/`store`/`community-circles`) remain green; `typecheck`/`lint`/
`build` all pass; `git diff --check` is clean.

### 18.10 Browser verification (desktop and 400x860 mobile)

Ran against a throwaway local Node HTTP contract double (not shipped),
`VITE_SECUREPAY_MODE=real`, covering: signing in via the Circle-profile
auth gate; opening the stubbed "Bathroom retiling" Agreement → Support tab →
the new "Referral & Plug attribution" entry, showing the real empty
(`NO_INTRODUCTION`) state; the full customer-side Plug flow (create a
market request → real interested candidate rendered as an opaque reference,
no name → select → relationship opened, real `ACTIVE` status → explicit
"Attribute this Plug to this agreement" → real `201` response rendering
`Introduced by Plug: KS-900`, with the referral-status panel correctly
moving to `CANDIDATE` immediately after, per the 18.3 fix); the Community
entry point ("Help this trade happen") reaching `TradeHelpPanel` for the
first time in the real app; the full Master lifecycle (public profile
lookup by reference → sign-in gate on the first mutating action → pending-
action replay landing directly on the request form after auth → submit →
`REQUESTED` → propose cost → `COST_PROPOSED` → accept → `ACCEPTED` → submit
opinion → `OPINION_SUBMITTED`, with the "not Money" doctrine notice shown
at the cost-acceptance step); and the real R11A Referral screen (code,
history with a `PENDING` and a `QUALIFIED`-with-reward entry, and a live
"redeem a code" action). Repeated the mobile-viewport check at 400x860 for
`TradeHelpPanel` and the Plug request-type screen — single-column layout,
bottom nav, no overflow. One real CORS gap was found and fixed in the
throwaway double itself (not shipped) — not a frontend defect, since the
frontend's own `http/index.ts` sends no non-simple headers for `auth:
'none'` requests.

Not verified in the browser this slice (documented, not silently skipped):
Master `decline` (state-machine-valid but not exercised in the walkthrough
path taken), a genuine `409` attribution conflict end-to-end (unit-tested
instead, tests M), and the R11A `lifetime-share` read (gateway-tested only,
no UI exists to reach it).

## 19. Final Completion Phase 3: Living Agreements implementation scope (2026-09-18)

Backend archaeology (SecurePayAPI `feat/securepay-final-phase3-living-agreements`)
found Agreement/Obligations/Milestones/Evidence/Decisions/Completion already
mature; the genuine gaps were milestone-to-milestone dependency declarations,
a SecurePay Agent delegated-authority model, a KSCalendar event model,
personal tags, and the Phase 3/4 commercial-source contract (SecurePayAPI PR
#219). This slice wires the frontend to the parts of that backend surface a
person can already reach from the existing real Agreements Home/Workspace
(`WorkspaceExperience`) — it does not add new top-level routes or redesign
locked visual patterns (Bolt preservation rule).

**REAL_API_WIRED**, additive to the existing `agreements` gateway
(`src/api/securepay/agreements/index.ts`): `milestoneEffectiveStates`,
`calendarEvents`, `calendarConflicts`, `myCalendar`, `tagsForAgreement`,
`tagAgreement`, `untagAgreement`, `myTags` — all real HTTP calls against
SecurePayAPI PR #219's new endpoints, no fixture/mock. `http/index.ts`'s
`RequestOptions.method` union was extended with `'DELETE'` (previously only
GET/POST/PUT), needed for `untagAgreement`.

- **Milestone DAG**: `agreementProgressView` (workspace/view.ts) now accepts
  the backend's live `MilestoneEffectiveStateResponse[]` and lets it override
  the stored-status guess; a milestone's effective `WAITING` state renders a
  preserved "Waiting on: <title>" reason directly under its row in
  `MilestoneProgress.tsx` (not just inside the expandable detail) — the
  presentation-order number next to each milestone is unchanged and still
  never gates anything, per the locked doctrine that a milestone numbered
  higher can be Complete while a lower one is Waiting.
- **KSCalendar**: new `AgreementCalendarAndTags.tsx` component (a new
  "Calendar & tags" tab on `AgreementDetail`, both desktop and mobile) lists
  real upcoming events for one Agreement and renders any scheduling conflicts
  with UI language that distinguishes "Possible conflict" from "Agreement
  condition cannot be satisfied" (`conflictSeverityLabel` in view.ts) — never
  as a block. `SignedInHome` gained an `UpcomingEventsList` sourced from
  `GET /api/v1/me/calendar` (`upcomingHomeEventsView`, resolved back to each
  event's real Agreement title via the same Hub lookup Detail already uses).
- **Personal tags**: the same new tab renders/add/removes the caller's own
  tags on an Agreement (`PersonalTagController`'s real endpoints) — never a
  client-fabricated tag id; the backend's own created/assigned tag is always
  re-read after a mutation rather than optimistically appended.
- Both the calendar and tags reads are explicitly best-effort
  (`bestEffort()` in `controller.ts`): a failure to load either can never
  fail the core Agreement Detail read closed, since they are additive
  enrichments, not Agreement/Money truth.

Verified this slice: `npm run typecheck` (clean), `npm run lint` (clean),
`npm run build` (production bundle succeeds), and the full existing
`node --test` suite (all pre-existing suites still green). One pre-existing
failure, `referrals-plugs-masters.test.mjs`'s "AF2. Plug controller reset
clears candidates/relationship/attribution state", was confirmed present on
the pristine base commit via `git stash` before this slice touched anything
— unrelated to Plug/Master/Referral code, not introduced here, not fixed
here.

Not verified in the browser this slice (no live backend + authenticated
session available in this environment): the "Calendar & tags" tab, the Home
"Upcoming" list, and the milestone waiting-reason line have not been
exercised against a running SecurePayAPI instance. Documented here rather
than claimed.

## 20. Final Completion Phase 3, controller completion pass (2026-09-18)

Programme-controller review of PR #15 required removing the "Asking SecurePay
from inside an agreement is not available yet" stub -- a central, explicitly
non-optional Phase-3 deliverable.

**REAL_API_WIRED**: `api/securepay/agent/index.ts` gained
`agreementWorkspaceView(conversationId, agreementId)` against SecurePayAPI's
new `GET /api/agent/conversations/{conversationId}/agreements/{agreementId}/workspace-view`
(`auth: 'required'`, added to `RuntimeApp.tsx`'s `withSessionRefresh` method
list). `WorkspaceExperience`'s `onAskAgent` no longer renders a canned stub
message: it creates (or reuses) a real Agent conversation, calls the real
endpoint, and renders the REAL backend-returned `summaryText` as the
conversational (BUILD) response. The SAME response's structured `workspace`
facts (milestones/waiting-reasons, Agreement Money still protected, the next
upcoming event, tags, open review-case count) are rendered visually via a
new `AgentUnderstoodCard` component -- confirmed/structured truth only,
exactly what SecurePayAPI returned, never re-derived or invented client-side
-- shown above the text response in the same Ask panel.

**Disclosed scope, precisely (not silently claimed complete):**
- This wires ONE concrete Agent capability (reading an existing Agreement's
  structured Workspace facts) through a dedicated, narrow, deterministic
  endpoint. It does NOT route through the app's main BUILD/UNDERSTOOD
  conversation pane (`AgentExperience`'s own `ContextPanel`/`TradeContext`) --
  the Ask interaction stays scoped to the Agreement Workspace's own existing
  ask panel, which already had a text-response slot; `AgentUnderstoodCard` is
  new. Unifying this into one persistent, mode-switching BUILD | UNDERSTOOD
  surface reachable identically from Signed-in Home, Agreements Home, and
  every Agreement Workspace is a materially larger, deliberately NOT
  attempted change this pass (would touch the locked, Bolt-verified
  `AgentExperience`/`ContextPanel` components this ledger's own tests pin
  byte-identical against Bolt).
- The typed question text is not parsed for intent (no NLU) -- every ask
  always returns the complete structured Workspace snapshot; the person
  cannot yet ask a narrower question like "show me the roofing photos" and
  get only that slice back.
- Signed-in Home's suggested prompts remain generic (Section 9's Home-level
  "what needs me / what changed this week" conversational wiring was not
  built this pass -- it would need a separate, cross-Agreement Agent-facing
  endpoint that does not exist yet; today's real Home data comes from the
  existing Hub/Upcoming-events reads only, not from a conversational query).
- Agreements Home's Problems/disputes, Recently-completed treatment, and
  Money-by-currency (all newly available from SecurePayAPI's new
  `GET /api/v1/me/agreements/home`) are NOT yet wired into any frontend
  screen -- `SignedInHome`/`AgreementHub` remain on the existing `/me/agreements/hub`
  read only. Not attempted this pass to avoid redesigning the
  Bolt-locked Home/Hub components under time pressure; a real, tested gap.

Verified this slice: `npm run typecheck` (clean), `npm run lint` (clean),
`npm run build` (production bundle succeeds), and the full existing
`node --test` suite (same single pre-existing, unrelated `referrals-plugs-masters`
AF2 failure as section 19, still present, still not introduced by this
change). Not verified in a browser against a live backend (none available in
this environment) -- disclosed, not claimed.
