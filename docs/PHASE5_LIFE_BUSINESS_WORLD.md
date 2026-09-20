# Phase 5 — Life & Business World

Branch `feat/final-phase5-securepay-life-business`, based on `origin/main` at `780b0c3` (includes
merged Phase 1 PR #20, Phase 2 PR #21 + correction PR #23, Phase 3 PR #22 with both correction
passes, Phase 4 PR #24 with its own final correction pass).

Governing idea: **an Agreement is a moment; a Project, Business, or life intention is the larger
thing the person is trying to make happen.** SecurePay should help the person see the larger
picture without pretending it owns every part of their life.

## A. Archaeology

The task prompt describes several areas as if they were greenfield. Direct reading of both this
repository and current `SecurePayAPI main` found a very different reality: two of the eight areas
(Projects, Vision Board) are already mature, production-backed features from an earlier, separately-
numbered work track ("Final Completion Phase 5A/5B") that predates this Phase 4→5 sequence; four
areas (Business, Developer, Settings, Recovery) have substantial real backend capability with **zero**
frontend wiring; and Help has no customer-facing backend surface to build against at all.

| Area | Classification |
|---|---|
| **Projects** | **Production-backed**, real (`/api/v1/projects/**`) — create/list/get/update/archive/restore, Add/Remove-to-Project, a real backend-computed summary (state-distribution counts, nominal + funded totals by currency, next event), a real calendar. Frontend already existed, fully wired, authenticated-only. |
| **Vision Board** | **Production-backed**, real (`/api/v1/vision-board/**`) — but a fundamentally different concept than the task assumed (see B). Shelves/items/lock/supersede/document generation, deep Agent tool integration (`search_vision_board`, `save_vision_item`, `get_vision_item_by_title`, `generate_vision_document`), server-enforced usage policies. Frontend already existed, fully wired. |
| **Business** | **Backend exists, frontend was completely missing.** `BusinessOrganizationController` (activate/get/members/invite/accept/remove) bridges a Business KS identity to a mature, pre-existing Organization/RBAC engine (`AuthorizationController`: authority-summary, maker-checker role assignment, delegation). No frontend gateway, controller, or screen existed for any of it before this phase. |
| **Developer / Connect** | **Backend exists, frontend was completely missing**, and is far more mature than "documentation links": application registration/lifecycle, one-time-secret credential issuance/rotation/revocation, webhook registration/deliveries/replay, a real integration-readiness checklist, and a SecureCode low/no-code AI-tool handoff. A structurally separate part (sandbox simulation, hosted Money-session creation) authenticates the caller as an *application* (client-id/secret), not a signed-in KS person — this web app cannot reach it (see G). |
| **Account / Identity** | **Partial.** The only real self-scoped "who am I" read this codebase already trusts is Circle's `/circle/me` (reused here — see H). The `NavBar`'s own "Account" item was a placeholder routing to Home, not a real destination — a genuine, glaring navigation gap. `/api/v1/identities/**` exists but is not obviously self-scoped and was not adopted (see H). |
| **Settings** | **Backend exists, frontend was completely missing.** `TraderSettingsController` (`GET`/`PUT /api/v1/settings/me`) — exactly five real fields (`notifyEmail`/`notifySms`/`notifyPush`/`marketingOptIn`/`profileVisibility`). No more, no dead toggles. |
| **Help** | **No customer-facing backend surface exists.** `SupportContextController` (`/api/v1/support/context/{traderKsNumber}`) requires an `X-Outreach-Case-Ref` header — it is a staff/Outreach-tool read, not something this customer webapp can or should call. KS001 (the Agent) already provides contextual help via the existing `AgentScope`/proactive-guidance machinery from Phase 5B. No new Help destination was built — see J. |
| **Recovery** | **Backend exists, frontend was completely missing.** `AuthenticationController`'s `/recovery/request`, `/recovery/verify`, `/recovery/reset`, plus `/logout-all` and `/password` (in-session change) — none were wired anywhere in this codebase before this phase. |

**Authority-sensitive findings surfaced during archaeology** (see M for the full audit): `requestRecovery` is deliberately enumeration-resistant (always returns a token, whether or not the KS Number exists); `resetPassword` revokes every session/refresh-token/MFA/recovery-challenge and returns no session of its own; `BusinessOrganizationMemberResponse` carries no role/permission field at all (membership status ≠ authority); role assignment beyond an Organization's founding admin is real maker-checker (`initiateRoleAssignment` → a *different* actor must `approve`), but **no GET listing endpoint for pending protected actions exists anywhere in the contract** — a durable "approvals inbox" cannot be built from this alone; `DeveloperSandboxController`/`DeveloperMoneySessionController` authenticate as an application, not a person.

## B. Life & Business mental model

The task's assumed hierarchy — **Vision → Project → Agreement → Money**, with an explicit "make this
a Project" promotion — is only half-real. **Corrected by this phase's archaeology:**

- **Project → Agreement → Money is fully real and already built.** A Project is a private
  organizational folder (never shared, never a source of Agreement authority) that groups Agreements
  and shows their combined, backend-computed state distribution and money facts — never invented
  percentages or a summed cross-currency total.
- **Vision Board is NOT a life-aspiration board and has no path to Project.** It is a private KS
  *operating memory* — ideas, plans, guidance, document templates, with usage policies controlling
  how the Agent may draw on them (proactively, by reference, or only when explicitly named) — plus a
  conversational document-drafting capability (quotations/invoices/receipts, backed by real Funded
  Authority truth). The backend keeps Project and Vision Board **structurally isolated from each
  other** by an explicit architecture-doctrine rule (`projectAndVisionBoardDomainsNeverReachIntoEach
  OthersPrivateSurface`, confirmed present in `ArchitectureDoctrineTest`) — this is a deliberate
  boundary, not a gap to close. "Make this a Vision item into a Project" is not fictional-but-missing;
  it is architecturally prevented by design.
- **Business defines acting capacity, layered on top of both.** A Business KS Number can own Projects
  and a Vision Board exactly like a Personal KS Number (both take an explicit owner KS Number), and
  separately has its own Organization/membership/authority engine governing who may act for it.

The real, current hierarchy this phase confirms and extends is therefore:

**Vision (private memory, informs conversation) ‖ Project (organizes Agreements) → Agreement
(authority) → Money (follows the Agreement) — with Business defining, orthogonally, who is acting
and what they may do**, not a single linear pipeline.

## C. Projects

**What existed**: the entire real backend contract and a fully wired, doctrine-correct frontend
(`src/features/projects/`) — list/create/detail/summary/agreements/calendar/archive/restore/add-
remove-Agreement. Zero DNA-primitive usage (raw Tailwind cards/buttons, same "structurally complete
but visually weak" pattern every prior phase has found and fixed elsewhere).

**What changed**:
1. **DNA convergence** — every card converted to `Surface`/`SurfaceBody`, primary/secondary buttons
   to `Button`, inline `role="alert"` paragraphs to `StatusNotice`, the "My Projects" header to
   `PageHeader`.
2. **Real precision bug fixed**: the per-Agreement contracted-value line rendered
   `formatMoney(a.currency, Number(a.proposedAmountMinor))` — coercing the Agreement summary's
   string-backed `proposedAmountMinor` through `Number(...)`, the exact class of bug Phase 4's final
   correction pass fixed for Master/Plug. Fixed by reusing the same shared `src/decimalMoney.ts`
   utility. The Project-level *aggregate* fields (`ProjectNominalTotalDto.totalAmountMinor`,
   `ProjectMoneyByCurrencyDto`'s fields) are genuinely backend `long`/JSON-number fields (confirmed
   against `ProjectNominalTotalResponse`/`ProjectMoneyByCurrencyResponse` on `SecurePayAPI main`) —
   these were left on the existing `formatMoney` helper, which is correct for a real `number`.
3. **The "type your own KS Number" friction was removed for the common case.** `ProjectController
   .list`'s `ownerKsNumber` query parameter is required server-side (unlike Vision Board's own
   backend, which already defaults to the caller's own KS when omitted — confirmed by reading
   `ProjectController.java` directly). `AgentExperience.tsx` now resolves the caller's own KS Number
   once via the same real, self-scoped `/circle/me` read Account already uses, and passes it as
   `ProjectsExperience`'s existing (previously always-unused) `defaultOwnerKsNumber` prop. The manual
   KS-entry field remains, now repurposed exactly like Vision Board's own convention: for managing a
   *different* (e.g. Business) KS Number.

Nothing about Project ≠ Agreement authority, the no-share/no-invite doctrine, or the exact-state-
counts-never-percentages doctrine changed.

## D. Vision Board

**What existed**: the entire real backend contract (shelves, items, lock/supersede, document
generation, deep Agent integration with server-enforced usage-policy retrieval rules) and a fully
wired frontend, already corrected in an earlier pass to never require typing your own KS Number
(`defaultOwnerKsNumber` optional, backend resolves to the actor's own KS when omitted).

**What changed**: DNA convergence only — every card converted to `Surface`/`SurfaceBody`, buttons to
`Button`, alerts to `StatusNotice`, the two page headers to `PageHeader`. No functional change.

**What was deliberately NOT built**: a "Vision → Project" promotion action, or any reframing of
Vision Board as a Pinterest-style aspiration board. See B — this is a structurally different, already
excellent capability, not an unfinished version of what the task prompt assumed.

## E. Business

**What existed**: a mature Organization/RBAC engine with zero frontend wiring — `Business
OrganizationController` (activate/get/members/invite/accept/remove) bridging a Business KS to
`AuthorizationController`'s authority-summary/role-assignment/delegation engine.

**What's new**: a first-class **Business Home** (`src/features/business/`):
- Enter or activate a Business KS Number (idempotent — activating an already-linked Business returns
  the existing organization, never creates a second one).
- **"What you can do here"** — the caller's own real permission set for that Organization, sourced
  only from `GET /authorization/organizations/{id}/authority-summary`, which the backend always
  resolves to the *caller's own* identity (`rejectUntrustedActorSubstitution`) — never presented as
  inferred from membership or from being on this screen.
- **Members** — status only (`BusinessOrganizationMemberResponse` carries no role field at all); an
  explicit note that this list never shows what a member is authorised to do. Invite/remove wired to
  the real endpoints; removal suspends (never deletes) membership.
- **Role assignment (maker-checker)** — initiating one returns a `protectedActionId` a *different*
  authorised actor must separately approve; the screen never claims the role takes effect immediately,
  and honestly discloses that no backend listing endpoint exists for pending approvals (session-local
  reference only, not a durable inbox).

## F. Acting capacity

Personal vs. Business is enforced structurally, not just visually: every Project/Vision Board/
Business call takes an explicit owner/Business KS Number as data, never an implicit "current app
mode." There is **no general Business-switching mechanism anywhere in the backend** (confirmed
absent — Agreements/Money/Store already take explicit KS Numbers per-flow) — Section 23's "acting
capacity indicator" is therefore the existing pattern itself (you always see and choose which KS
Number a given screen is scoped to), not a new global switcher, which would have to be either fake or
would misrepresent a capability the backend doesn't have. `AuthoritySummaryResponse` is the one real
source of "what can I do for this Business," always caller-resolved server-side. No screen in this
phase infers authority from URL/location — the "What you can do here" section on Business Home is the
explicit antidote to that failure mode, re-fetched from the backend every time the screen opens.

## G. Developer / Connect

**What became first-class** (`src/features/developer/`): application registration and lifecycle
(suspend/reactivate/revoke), a real integration-readiness checklist
(`applicationConnected`/`identityConnected`/`credentialsWorking`/`statusUpdatesConnected`/
`callbacksConnected`/`readyToTestTrade` — all backend-computed, matching the task's own "what do I
need → how do I connect → how do I test" journey doctrine exactly), one-time-secret credential
issuance/rotation/revocation (the secret is shown exactly once, matching the backend's own contract —
there is no "list my credentials" endpoint, by design), webhook registration (signing secret shown
once) plus delivery history and replay, and SecureCode issuance/revocation — the real, already-built
"low/no-code AI-tool handoff" the task's Section 33 asked about archaeology for.

**What remains backend-blocked, correctly**: `DeveloperSandboxController` and
`DeveloperMoneySessionController` both authenticate the caller as an *application* via its own
client-id/secret (`DeveloperApiScopeGuard`/an API-key filter), not as a signed-in KS person — a
structurally different authentication mechanism this KS-session web app cannot perform. The Developer
screen discloses this directly rather than faking a "Simulate" button: sandbox simulation and hosted
Money-session creation genuinely happen from the developer's own backend, authenticated with the
credential this screen issues.

## H. Account / Identity

**What changed**: a new **Account** destination (`src/features/account/`) replacing the `NavBar`'s
placeholder "Account → Home" routing. Identity is shown via the same real, self-scoped `/circle/me`
read Circle already uses (KS Number given prominence, identity lifecycle status humanised via the
existing `circleVerificationStatusLabel`, never presented as "professional verification" — Section 39
doctrine unchanged). A Business membership is a separate, explicit lookup: **there is no backend
index of "which Businesses do I belong to"** (confirmed absent), so the person names a Business KS
Number they administer, exactly mirroring Projects'/Vision Board's own established convention — not
fabricated as an auto-discovered list. Security section adds real, previously-unwired `logout-all`
(sign out everywhere) and a link into the new Recovery flow. `/api/v1/identities/**` was deliberately
**not** adopted for this screen: its authorization boundary was not independently verifiable from the
controller alone, and `/circle/me` already gives an equivalent, already-proven-safe self-scoped read
— reusing a verified-safe capability was preferred over introducing a new, unverified one.

## I. Settings

New (`src/features/settings/`): exactly the five real fields `TraderSettingsController` supports
(`notifyEmail`/`notifySms`/`notifyPush`/`marketingOptIn`/`profileVisibility`). No dead toggle was
added. Settings ≠ Account is kept explicit in both copy and navigation (Settings never shows identity/
authority; Account never shows notification toggles). `NotificationController`'s own separate, richer
per-category preference set (`/notifications/me/preferences`) was found during archaeology but
deliberately left unwired this pass — see Q.

## J. Help / Support

Archaeology found `SupportContextController` (`/api/v1/support/context/{traderKsNumber}`) requires an
`X-Outreach-Case-Ref` header and is the *inbound* side of the existing support-context doctrine — a
staff/Outreach-tool read, not an endpoint this customer webapp calls to send context *to* support.
There is no customer-facing "send my context to a human" backend surface to build against. KS001
already serves the "SecurePay understands where I am" doctrine via the existing `AgentScope`/
proactive-guidance machinery (Phase 5B) — genuinely real, already built, not something this phase
needed to add. **No new Help destination was built**, per the explicit instruction to document rather
than fabricate a capability the backend doesn't expose to this app.

## K. Recovery

New (`src/features/recovery/`): the real three-step flow (`request` → `verify` → `reset`). Copy is
deliberately hedged ("if that KS Number exists...") to match the backend's own enumeration-resistant
design (`requestRecovery` always returns a token, silently no-opping the actual notification when the
KS Number doesn't resolve) — the frontend never confirms or denies existence. The reset screen
discloses that this signs out every device/session, and the success screen explicitly states that
Business membership, delegated authority, and Agreement access are unchanged — resetting a password
restores only the login credential, matching `DefaultAccountRecoveryService.resetPassword`'s own
behavior (it returns no session; the person must sign in fresh). Reachable from the main entry screen
while signed out ("Trouble signing in? Recover your account") without touching the shared, locked
`SecureAuthCard`/`secureAuthView` contract used by every other feature's sign-in gate.

## L. Cross-world continuity

Real, backend-verified links wired or confirmed this phase: Account → Settings/Business/Developer/
Projects/Vision Board/Recovery (all real navigation, no fabricated association); Projects → Vision
Board (pre-existing, unchanged); the caller's own KS Number now flows automatically from Account's
identity read into Projects' owner field. **Confirmed NOT to exist, and correctly not built**: Vision
↔ Project (architecturally isolated, see B); a "which Businesses do I belong to" index (Account's
Business lookup is explicit-KS, not auto-discovered); a durable Business role-assignment approvals
inbox (no listing endpoint). KS001's own context-awareness (Project/Vision/Business/Agreement scope)
was verified as already real from Phase 5B's `AgentScope` work — no change was needed or made to it
this phase.

## M. Authority audit

- **Project ≠ Agreement**: confirmed unchanged — Project write methods never touch Agreement
  confirm/join/fund/exercise/release (grep-verified, see Tests).
- **Vision ≠ Project**: confirmed via the backend's own structural doctrine rule; no cross-domain
  field or call exists in either domain's DTOs or gateways (grep-verified).
- **Project cannot mutate Agreement authority / Vision cannot create authority**: unchanged from
  existing doctrine; nothing in this phase touched either write path.
- **Business membership ≠ universal Business authority**: `BusinessOrganizationMemberResponse` has no
  role field; Business Home's own permission list is sourced only from `authoritySummary`, never
  inferred from membership status (grep-verified — no client-constructed permissions array exists).
- **UI context ≠ acting authority**: every Business/Project/Vision Board call carries an explicit KS
  Number as data; no screen presence implies authority.
- **Recovery ≠ Business authority restoration**: `resetRecoveryPassword`'s request/response carry no
  role/permission/organization field (grep-verified); the success copy states explicitly that
  Business/delegated/Agreement authority is unaffected.
- **Developer access ≠ arbitrary API permission**: every credential is scoped (`DeveloperApiScope`);
  no credential/secret is ever hardcoded (grep-verified) — every secret shown comes from a live
  response field, shown exactly once, matching the backend's own one-time-disclosure contract.
- **Help/support context remains privacy-bounded**: no customer-facing code path to the staff-only
  support-context endpoint was built.
- **Personal Money ≠ Business Money**: untouched — this phase built no new financial aggregation of
  any kind; Business's own money capability (Phase 3's `businessCurrencyCapability`/
  `businessFxApplication`) was not modified.
- **No frontend status/progress/financial metric was invented**: no health/readiness/completeness/
  rank/rating score exists anywhere in the five new feature files (grep-verified).

## N. Desktop verification

**Source/test verified, not visually verified.** Every change was confirmed via `npm run typecheck`,
`npm run lint`, `npm run build`, and the full test suite. No live SecurePayAPI backend is available in
this environment, and all five new destinations (Account, Settings, Recovery, Business, Developer)
are real-mode-only, authenticated (except Recovery), with no fixture-mode equivalent — the same
disclosed limitation as Money (Phase 3) and the Trade & Community world (Phase 4). No dev-server/
browser session was attempted in this pass. All layout reuses the same `Surface`/`Button`/
`StatusNotice`/`PageHeader` primitives and `max-w-2xl`/`max-w-3xl mx-auto`/`space-y-4` responsive
patterns already visually verified on both desktop and mobile in Phases 1–4 — a structural inference,
not a screenshot, reported as such.

## O. Mobile verification

Same disclosed limitation as N. All new screens use the established single-column, `NavBar`-topped,
`space-y-4` card-stack pattern already proven at narrow widths in every prior phase; no new layout
primitive was introduced. Not independently screenshotted.

## P. Tests

Baseline (this branch, before any Phase 5 change, matching Phase 4's exact exit state):
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `node --test tests/*.mjs` — 368 passed, 0 failed.
- `npm run build` — succeeds.

After this phase's changes:
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `node --test tests/*.mjs` — **388 passed** (368 + 20 new focused tests in
  `tests/life-business.test.mjs`), **0 failed** — no previously-passing test broken, no fixture-parity
  test needed updating (none of the touched/new files have a Bolt fixture counterpart).
- `npm run build` — succeeds, same pre-existing chunk-size warning.

New tests cover: the Projects precision fix (string-backed amount never through `Number(...)`);
Project ≠ Agreement and Vision ≠ Project (no cross-domain authority call, no cross-domain field, no
cross-feature import in either direction); Recovery's enumeration-resistant copy and no-authority-
restoration claim; `authoritySummary`'s caller-only resolution and Business Home's maker-checker
language; Developer's exclusion of the application-authenticated endpoints and absence of any
hardcoded secret; no local-only durable association; no invented score/ranking metric; the NavBar
Account fix and the five new `AppView` destinations; no fixture-data import into any new route.

## Q. Deferred backend/product gaps

- **Vision Board → Project**: not a gap — architecturally prevented by an explicit backend doctrine
  rule (see B, D). Documented as intentional, not fixed.
- **Business role-assignment approvals inbox**: no backend GET endpoint lists pending protected
  actions. A future backend phase could add one narrowly-scoped to "protected actions awaiting my
  approval"; this pass correctly did not fabricate a client-side substitute.
- **"Which Businesses do I belong to" auto-discovery**: no backend index exists; Account's explicit-
  KS-entry pattern is the honest mechanism available today, matching Projects'/Vision Board's own
  established convention.
- **Per-member role/permission display**: `BusinessOrganizationMemberResponse` has no role field;
  showing "what a member can do" per-member (rather than just the caller's own summary) needs a new
  backend field.
- **Notification inbox and its own category-level preferences**: `NotificationController`
  (`/notifications/me`, `/me/{id}/read`, `/me/{id}/resolve`, `/me/preferences`) is real and mature but
  was found late in this pass's archaeology and deliberately left unwired to keep this phase's scope
  bounded — a genuine, disclosed gap for a future pass, not folded into Settings to avoid conflating
  two separate real backend systems under time pressure.
- **Sandbox simulation / hosted Money-session creation inside this app**: structurally blocked by the
  application-vs-person authentication boundary (see G) — correctly not solved by crossing it.
- **A general Business-switching UI**: no backend concept exists to build one against (see F).

## R. Git

- Branch: `feat/final-phase5-securepay-life-business`
- Starting SHA: `780b0c3` (`origin/main`, includes merged Phase 1–4 PRs and all of their correction
  passes)
- Files changed: see the commit for the exact list — new: `src/decimalMoney.ts`-style reuse (already
  existed from Phase 4) plus `src/api/securepay/{settings,business,authorization,developer}/index.ts`,
  `src/features/{account,settings,recovery,business,developer}/{controller.ts,*Experience.tsx}`,
  `tests/life-business.test.mjs`, this document; modified: `src/RuntimeApp.tsx`,
  `src/api/securepay/index.ts`, `src/api/securepay/auth/index.ts`, `src/components/NavBar.tsx`,
  `src/features/agent/AgentExperience.tsx`, `src/features/projects/ProjectsExperience.tsx`,
  `src/features/visionboard/VisionBoardExperience.tsx`, `src/types.ts`.
- Tests: see Tests (P) above — 388/388 passing, up from a 368/0-failing baseline.
- PR: to be opened as draft/open, unmerged — programme controller performs final review and merge.
