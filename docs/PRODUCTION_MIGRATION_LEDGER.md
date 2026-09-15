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
| Store public search | PR #204: `GET /api/v1/stores/search`, factual/recency, no ranking | BACKEND_PR_PENDING | Replace Store discovery demos; preserve no-opaque-ranking doctrine. |
| Store profile/Offer CRUD/share | Existing Store/PublicStore controllers and real Store tables | REAL_API_AVAILABLE_NOT_WIRED | Map real offers into locked Bolt Store experience. |
| Store media refs | PR #204 additive `media_refs` | BACKEND_PR_PENDING | Treat refs as media references; do not invent file-storage authority. |
| Offer -> Trade source | Phase 5B provenance/adoption can represent Store listing facts, but full rich Bolt offer-version/source snapshot needs convergence audit | BACKEND_PR_PENDING | Do not directly turn Offer into Agreement. Explicit adoption first. |
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
