# Golden Spine A compatibility audit

Inspected 2026-09-15. This PR adds infrastructure and pure adapters; **no Golden
Spine UI slice is wired**. Production currently renders unavailable. The unchanged
Bolt app runs only in explicit development fixture mode.

## Evidence and scope

- Experience: `bolt-reference-pass11`, commit `d27ac2e575946cee173aa608154daa174d028ebd`.
  `App.tsx`, `mockAgent.ts`, `types.ts`, all journey components and fixtures remain
  unchanged against that tag. Inspected SignedOutHome, ConversationWorkspace,
  ContextPanel, SourceToTradeHandoff, SecureAuth, CanonicalAgreement,
  RecipientReview, JoinPrompt, AcceptancePrompt and Money compositions.
- Backend: direct local source inspection at
  [`0b0121c9152e3ce039e4d7df59e4fec6045d70cc`](https://github.com/kimaniks001/SecurePayAPI/tree/0b0121c9152e3ce039e4d7df59e4fec6045d70cc).
  The local checkout matches the remotely verified PR #208 head. It includes the
  entire earlier stack. Phase 12 functionality is outside this frontend PR.
- Main reference: `61ed7cf71dd5d5e69f569e73f9129be5d26c0c23`. GitHub PR metadata
  verified with `gh pr list`; #195–#208 remain open. The Agent runtime is **also
  pending**, not deployed by virtue of the ledger previously calling it available.
- Inspected `services/securepay-core/src/main/java/ke/securepay/core/api/`:
  `agent/controller/{AgentController,AgentApiModels,AgentAgreementHandoffController,AgentAgreementHandoffApiModels,AgentFactProvenanceController,AgentExceptionHandler}`;
  `auth/controller/AuthenticationController`, auth request/response records;
  `agreement/controller/{AgreementController,AgreementInvitationController,CurrentUserAgreementWorkspaceController,AgreementMoneyStatusController,AgreementMoneyRecordsController}`;
  corresponding agreement request/response records; `error/ApiExceptionHandler`.
- Inspected `services/agreement/.../agent/protocol`, `provenance`,
  `tradecontext/TradeContextSummaryProjector` and
  `orchestrator/SecurePayAgentOrchestrator` for the actual component payloads.
  No SecurepayBDUI architecture or plumbing was needed.

### Backend stack references

| Contract | Open PR / branch | Verified head |
| --- | --- | --- |
| Agent runtime | [#197](https://github.com/kimaniks001/SecurePayAPI/pull/197), `feat/securepay-agent-phase3-runtime` | `d0a46b18a5cd499bf925663b44a5a41bda225bb6` |
| Live tools | [#198](https://github.com/kimaniks001/SecurePayAPI/pull/198), `feat/securepay-agent-phase4-live-trade-tools` | `5acfa9dd00a7fc59a1350c2c1e5bf00547d19e95` |
| Handoff | [#199](https://github.com/kimaniks001/SecurePayAPI/pull/199), `feat/securepay-agent-phase5-agreement-handoff` | `84d205ea56b98a776401fc31f8da8633f8ad6286` |
| Provenance/adoption | [#200](https://github.com/kimaniks001/SecurePayAPI/pull/200), `feat/securepay-agent-phase5b-provenance-adoption` | `c211cf0ce4407be13e43836eb77e39224c8ac65f` |
| Hub/Detail | [#201](https://github.com/kimaniks001/SecurePayAPI/pull/201), `feat/securepay-phase6-agreement-read-model` | `6e382c2b2fccf79aaa8b5873e787aaa39808b7e0` |
| Detail Money | [#203](https://github.com/kimaniks001/SecurePayAPI/pull/203), `feat/securepay-phase8-money-integration-contract` | `926bd6f95095174c395bdfd6f6633a031ecd5e2b` |
| Detail milestones | [#205](https://github.com/kimaniks001/SecurePayAPI/pull/205), `feat/securepay-phase9b-agreement-execution-dispute-convergence` | `2125604d54e5930610830ac9397ee15f34fa56bc` |
| Master source kind | [#207](https://github.com/kimaniks001/SecurePayAPI/pull/207), `feat/securepay-phase11-referrals-plugs-masters` | `978437f300244119302607ba3e656a76253190bb` |

## Compatibility matrix

Paths are complete except `C = /api/agent/conversations/{conversationId}` and
`H = /api/agent/agreement-handoffs/{handoffId}`. All rows use the HTTP error boundary
and `RemoteState` for idle/loading/empty/data/error; the handling column specifies
what subsequent UI slices must render. These are verified contracts and prepared
adapters, not claims of completed UI behavior.

| Step / Bolt component or event | Prototype source | Verified endpoint / authority | Stack | Adapter / view model | Loading/error/stale handling | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Signed-out intent / SignedOutHome.onStart | App contextRef + mockAgent.detectIntent | `POST /api/agent/conversations` | #197 | ConversationDto | Loading; retain intent on unavailable; do not claim conversation creation | BACKEND_PR_PENDING |
| Agent turn / ConversationWorkspace.onSend | mockAgent.respond + timers | `POST C/turns`, `{message, clientTurnId?}` | #197/#198 | agentResponseView; MESSAGE and validated preview cards | Preserve text with unknown cards; 404 conversation-not-found; reuse caller turn ID on deliberate retry | BACKEND_PR_PENDING |
| Review what we have / ContextPanel, UnderstandingDrawer | local Understanding | `GET C/context` | #197 | tradeContextView; entity/relationship IDs, state and provenance | Empty context distinct from loading/error; unrecognized state never confirmed | BACKEND_PR_PENDING |
| Use this / source handoff selection | circleData source factories + local isAdopted | `POST C/external-facts/amount`, `/date`; separately `POST C/facts/adopt`; `POST C/prior-agreement-terms` requires auth | #200, MASTER_OPINION #207 | TradeContextDto → facts/candidates/confirmed | Explicit adoption of existing targetId/targetKind; 404 not-adoptable; 403 prior source denied; 409 stale source | BACKEND_PR_PENDING |
| Continue with this / App continue_with_this | timed mockAgent transition | `POST C/agreement-handoff`, `{clientActionId?}` | #199 | handoffView | Loading; IDENTITY_REQUIRED and NEEDS_RESOLUTION retained, no Agreement inference | BACKEND_PR_PENDING |
| Handoff identity required / SecureAuth | demo identity + confirm_identity | `GET H`; `POST /api/v1/auth/login`, `/complete`, `/mfa/resend`, `/refresh`, `/logout`; separately `POST H/adopt` | Auth main; handoff #199 | auth DTOs + injected access-token provider; handoffView | Real challenge/OTP errors; wrong handoff account 403; no implicit adopt, Join or confirm | BACKEND_PR_PENDING |
| Canonical review / CanonicalAgreement | mockAgent CANONICAL_AGREEMENT | `GET H/review` returns CandidateSummary; `GET H` holds version/digest | #199 | CandidateDto + handoffView.reviewSnapshot | Do not present preview as canonical review; stale 409/expired 410 requires fresh handoff | BACKEND_PR_PENDING |
| Set securely / App set_securely | timers → fake Agreement id | `POST H/continue` with **expectedTradeContextVersion**, **expectedCandidateDigest** | #199 | HandoffDto.progressedAgreementId | Echo reviewed snapshot unchanged; PROGRESSED is only draft creation, never establishment | BACKEND_PR_PENDING |
| Send invitation / AgreementSent | send_to_peter + fake link | `POST /api/v1/agreements/{id}/invitations`, documented idempotencyKey, roleCode, optional intended identity | main | issueInvitation | Display only returned token/status; handle replayed; never log invitation token | REAL_API_AVAILABLE_NOT_WIRED |
| Invitation review / RecipientReview | mockAgent recipient fixtures | `GET /api/v1/agreement-invitations/{token}` public, no Authorization | main | PublicInvitationViewResponse | Invalid/expired invitation currently generic 422 AGREEMENT_INVITATION_ERROR; never infer exact reason from status alone | REAL_API_AVAILABLE_NOT_WIRED |
| Join / JoinPrompt, App join_agreement | timers → JOINED_STATUS | `POST /api/v1/agreement-invitations/{token}/join`, `{idempotencyKey}` | main | JoinAgreementResponse | 401/403/422 remain errors; show returned participant state and confirmationRequired; Join does not confirm | REAL_API_AVAILABLE_NOT_WIRED |
| Exact-version confirmation / AcceptancePrompt | confirm_acceptance → established fixture | `GET /api/v1/agreements/{id}/versions/{versionId}`; `POST .../versions/{versionId}/confirm` | main | AgreementVersionResponse; ConfirmVersionRequest; AgreementConfirmationResponse | Exact path version, expectedVersionNumber/hash and idempotencyKey; 422 confirmation error forces review/refetch, never local establishment | REAL_API_AVAILABLE_NOT_WIRED |
| Signed-in Home | demoAgreements, demoAttentionItems | `GET /api/v1/me/agreements`, `GET /api/v1/me/actions` | main | Page of workspace DTOs | Empty vs error; preserve pagination, backend completion/actor/nextActions | REAL_API_AVAILABLE_NOT_WIRED |
| Agreement Hub / AgreementHub | demoData buckets | `GET /api/v1/me/agreements/hub` | #201 | HubDto backend buckets | No client lifecycle derivation; unauthorized remains error | BACKEND_PR_PENDING |
| Agreement Detail / AgreementDetail | getDemoAgreementDetail + milestoneData | `GET /api/v1/agreements/{id}/detail` | #201/#203/#205 | agreementDetailView | Auth failures; exact version/hash retained; empty milestones allowed; status from backend | BACKEND_PR_PENDING |
| Money readiness / AgreementMoneyHandoff, MoneyStatus | moneyData/getDemoMoney | `GET /api/v1/agreements/{id}/money-status`; Detail.money | main / #203 | moneyStatusView, moneyHandoffView, moneyFailureView | Dedicated status returns 404 PAYMENT_READY_EVALUATION_NOT_FOUND; Detail returns NO_EVALUATION_YET. Other failures/future states → UNKNOWN | REAL_API_AVAILABLE_NOT_WIRED |
| Money records / MoneyActivity | commonActivity fake payment history | `GET /api/v1/agreements/{id}/money-records` | main | AgreementMoneyRecordResponse[] | Empty history is not a balance; amountMinor decimal strings retained; no settlement inference | REAL_API_AVAILABLE_NOT_WIRED |
| Money next action / MoneyWorkspace | fixture nextActions + READY | `GET /api/v1/me/actions`, actionCode FUND_AGREEMENT for this agreement | main | moneyNextActionView | Unknown/loading/error returns no action; READY alone grants nothing; preserve pagination | REAL_API_AVAILABLE_NOT_WIRED |

## Differences and bounded gaps

1. Backend preview `who`, `money`, `when` are arrays of strings, not Bolt's parsed
   participant roles, amount object and date string. PreviewView keeps the backend
   wording (including “being considered”) rather than inventing structured roles.
   Only MESSAGE and verified AGREEMENT_PREVIEW payloads are currently mapped.
   Other rich cards are ignored with conversational text preserved; map each live
   tool payload individually in slice B. Agent suggested actions remain guidance.
2. Trade Context is a graph, not Bolt's seven fixed Understanding fields. Preserve
   entity/relationship IDs and provenance in the domain view; the next slice must
   compose the locked visual fields. Never manufacture a source ID or confirm a
   candidate from a local event. The generic adoption engine supports source facts;
   rich SourceReference owner/version/introduction details require proven sources.
3. Canonical review does **not** return the version/digest. Keep the handoff snapshot
   associated with the review; do not replace it after a background context refresh.
   `/continue` performs the authoritative exact-snapshot check. Stale requires a new
   handoff and fresh review. No new combined review endpoint is assumed.
4. Auth verified here is KS number/password → challenge → OTP proof → token pair.
   There is no invented `/session` or phone-only sign-in endpoint. Session storage,
   token refresh coordination, identity lookup and UI integration belong to slice C;
   the token provider reads the single session boundary without decoding identity.
   Sending client sourceIpHash is optional, not a claim of verified network identity.
5. Invitation errors and exact-version confirmation errors are generic 422 codes
   (`AGREEMENT_INVITATION_ERROR`, `AGREEMENT_CONFIRMATION_ERROR`). The frontend cannot
   reliably distinguish expired/wrong-version subcases with a typed reason code.
   Fail closed, preserve the backend message and offer review/refetch in slice D.
6. Several backend DTOs still encode Java Long amounts as JSON numbers. HTTP rejects
   unsafe integer responses rather than round financial values. Decimal-string
   records/detail amounts remain strings. Lossless numeric contract convergence is
   needed for amounts outside JavaScript's safe integer range; no guessed balance.
7. `GET /api/v1/agreements/{id}/agent-context` and workspace search were verified but
   intentionally not exposed here: private context must not flow automatically into
   the public Agent, and broader discovery is a later slice. Photo observation intake
   exists; binary photo/document storage is not established by those APIs.
8. Runtime deployment of the open backend stack, allowed frontend origin/CORS, real
   API base URL, and credentialed end-to-end acceptance are not verified by this PR.
   No live Agreement, invitation, payment or identity mutation was executed.
9. Detail can return a null currentVersion; the adapter preserves null and never
   constructs a version/hash. Detail.money also reports NO_EVALUATION_YET for
   multiple ambiguous evaluations, while the dedicated Money endpoint throws a
   scope-ambiguity error. Preserve the returned projection without claiming the
   underlying absence/ambiguity has been resolved.
10. Phase 12 now exists as open #208, superseding the earlier convergence update's
   historical “not begun” wording. This PR does not integrate or validate any
   Partner/Solution institutional claim.

## Architecture and fixture isolation

- `src/config/securepay.ts`: explicit mode selection and HTTPS API-base validation
  (HTTP allowed only for loopback development).
- `src/api/securepay/http`: one JSON transport, bearer-token provider, typed errors,
  timeout/network/cancel distinction, no-store, no cookies or redirects, unsafe
  integer rejection, no logging and **no automatic retries**.
- `src/api/securepay/{agent,auth,agreements,money}`: verified DTOs, narrow gateways
  and pure domain/view adapters. No UI component fetches.
- `createSecurePayApi(baseUrl, getAccessToken)` constructs real gateways only.
  Failed requests reject; they cannot select fixtures.
- `RuntimeApp` imports the frozen App only under Vite DEV plus explicit
  `VITE_SECUREPAY_MODE=fixture`. Hash demo routes do not override production mode.
  Default mode is real. Until B–E mount real journeys, real mode displays unavailable.
  This release is a foundation, not a usable production Golden Spine.
- `VITE_SECUREPAY_MODE=fixture npm run dev` preserves existing desktop/mobile demo
  choreography for visual acceptance. Production builds exclude the App, mockAgent
  and demo Agreement/Money data; even a production fixture setting fails closed.

## Validation

- `npm ci`: passed. Existing lockfile dependency audit reports 21 vulnerabilities
  (3 low, 5 moderate, 13 high); no dependency upgrade included.
- `npm run typecheck`, `npm run lint`, `npm run build`: passed.
- `npm run test:foundation`: focused tests use Node's built-in runner and Vite's
  existing esbuild, with no additional framework/dependency. Covers errors/retries,
  auth/Join/confirmation separation, exact snapshots, forward-compatible cards,
  candidate state, Money unknown/no-evaluation/action separation, and fixture exclusion.
- Locked App/components/types/mock/data sources compare unchanged to the Bolt tag.
  No broad UI rewiring or visual redesign; no claim of live backend E2E validation.

Next: **slice B**, signed-out Home → real Agent turns → Trade Context and explicit
candidate adoption. Preserve Bolt choreography and map additional tool payloads;
then slice C handoff/auth, D recipient authority, E Hub/Detail/Money reads.
