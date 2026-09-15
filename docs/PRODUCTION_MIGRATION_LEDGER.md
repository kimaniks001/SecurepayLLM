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
| Community | PR #206 confirms a deliberately bounded existing R11B Community/Circle foundation, not the full Bolt object/feed model | BACKEND_PR_PENDING | Treat rich Bolt Community UI as composition until canonical backend object contracts are proven. Do not fabricate durable authority. |
| Circle profile/economic facts | Existing CircleProfileService + PR #206 Growth Credits | BACKEND_PR_PENDING | Growth Credits are factual NON-MONEY activity counts. |
| Circle membership/feed semantics | PR #206 explicitly did not introduce a full membership/feed/social authority | BACKEND_PR_PENDING | This is a known convergence gap versus rich Bolt Pass 10B; frontend may demo only behind explicit adapter until backend decision/support exists. |
| Universal SourceReference across Community/Circles | Bolt contract is richer than PR #206 report; Phase 5B offers generic provenance/adoption primitives | BACKEND_PR_PENDING | Backend convergence must confirm canonical source IDs/version/snapshot and introduction chain before production wiring. |
| Referral evaluation | Phase 11 backend work is the target authority | BACKEND_PR_PENDING | UI must not infer candidate/qualified/reward states. |
| Plug | Phase 11 backend work is the target authority | BACKEND_PR_PENDING | Plug introduces/navigates; gains no Agreement/Money authority. |
| Master profile/request/opinion | Phase 11 backend work + PR #205 dispute escalation seam | BACKEND_PR_PENDING | Qualification/accreditation separate from Master status; opinion not authority. |
| Partner/Solution | Later backend phase; Bolt Pass 11 is product contract only | BACKEND_PR_PENDING | Keep demo adapter until real bounded APIs exist. Do not invent bank/insurance/partner truth. |

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
