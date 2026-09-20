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

**Authority-sensitive findings surfaced during archaeology** (see M for the full audit): `requestRecovery` is deliberately enumeration-resistant (always returns a token, whether or not the KS Number exists); `resetPassword` revokes every session/refresh-token/MFA/recovery-challenge and returns no session of its own; `BusinessOrganizationMemberResponse` carries no role/permission field at all (membership status ≠ authority); role assignment beyond an Organization's founding admin is real maker-checker machinery, but **`initiateRoleAssignment` rejects any `subjectIdentityId` other than the authenticated actor's own** (`rejectUntrustedActorSubstitution`, confirmed directly against current `main`) — an admin cannot use it to assign a role to a *different* member — and separately **no GET listing endpoint for pending protected actions exists anywhere in the contract**, so even self-assignment has no durable "approvals inbox" to build against; `BusinessAdministrationService.requireLink` (the read behind `GET .../organization`) performs no authorization check of its own, so a successful read is never proof of administering that Business; `DeveloperPlatformAuthorization.requireOwnerOrInternalActor` requires the caller's own `actorKsNumber()` to literally equal the Business KS Number — Organization RBAC admin/membership is never consulted, so Business Home authority does not carry over to Developer application ownership; `DeveloperSandboxController`/`DeveloperMoneySessionController` authenticate as an application, not a person.

## B. Life & Business mental model

The task's assumed hierarchy — **Vision → Project → Agreement → Money**, with an explicit "make this
a Project" promotion — is only half-real. **Corrected by this phase's archaeology:**

- **Project → Agreement → Money is fully real and already built.** A Project is a private
  organizational folder (never shared, never a source of Agreement authority) that groups Agreements
  and shows their combined, backend-computed state distribution and money facts — never invented
  percentages or a summed cross-currency total.
- **Vision Board is NOT a life-aspiration board, and has no path to Project today.** It is a private
  KS *operating memory* — ideas, plans, guidance, document templates, with usage policies controlling
  how the Agent may draw on them (proactively, by reference, or only when explicitly named) — plus a
  conversational document-drafting capability (quotations/invoices/receipts, backed by real Funded
  Authority truth). **Corrected by this pass** (the original wording overstated this): the backend's
  `projectAndVisionBoardDomainsNeverReachIntoEachOthersPrivateSurface` doctrine rule (confirmed
  present in `ArchitectureDoctrineTest`) forbids the two domains' own internal service/persistence
  code from directly depending on each other — but its own comment explicitly says "a future feature
  that lets a KS link the two must go through each domain's own authorized owner-scoped API, never a
  direct dependency edge." A bridge is not fictional-but-missing, and it is not architecturally
  forbidden outright either — it simply does not exist today, and would have to be built as a proper,
  separately-authorized feature composing both domains' public APIs, never a shortcut through their
  internals. This pass does not build one.
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

**Corrected by this pass — role assignment**: the original version of this screen let an admin type a
*different* member's identity id and a role code, then called `initiateRoleAssignment`, presenting it
as a working maker-checker admin flow. Direct review of current `SecurePayAPI main` found this cannot
work: `OrganizationAuthorityManagementService.initiateRoleAssignment` calls `actorProvider
.rejectUntrustedActorSubstitution(command.subjectIdentityId())`, and that method (confirmed by reading
`AuthenticatedActorProvider` directly) throws unless the supplied `subjectIdentityId` equals the
*authenticated actor's own* identity id — an admin cannot use this endpoint to assign a role to a
different member at all today. The interactive form was removed and replaced with a truthful
capability note: the backend has real maker-checker role-assignment machinery, but the current
participant-facing contract does not yet support cross-member assignment, and separately, no backend
endpoint lists pending protected actions awaiting approval — a complete admin role-management journey
cannot be built from what exists today. Neither gap was worked around; both are disclosed.

## F. Acting capacity

**Corrected by this pass**: the original wording ("every action below happens as this Business, never
your personal identity") overstated what the backend does. The actual model, confirmed by reading
`BusinessAdministrationService`/`AuthorizationEnforcer` directly: **the authenticated person remains
the actor for every call, always.** A Business is a *resource/organizational scope* that call is
checked against — never a second identity the session "becomes." There is no token, header, or session
state anywhere that substitutes a Business identity for the signed-in person's own. Business Home's
copy now says exactly this: "You are signed in as yourself. Actions on this page are scoped to the
selected Business and only succeed where SecurePay confirms your authority for that Business."

Separately, activation (`BusinessAdministrationService.activateOrganization`) is stricter than
"owner or administrator": `requireOwnerOrInternalActor` requires the authenticated actor's own
`actorKsNumber()` to literally equal the Business KS Number being activated, or a trusted internal
actor — Organization RBAC admin/membership is not consulted at all for activation. The prior wording
("only the Business's own owner... can do this") risked being read as "an Organization admin can do
this" — corrected to state the exact requirement: signing in as the Business KS identity itself.

Personal vs. Business remains enforced structurally, not just visually: every Project/Vision Board/
Business call takes an explicit owner/Business KS Number as data, never an implicit "current app
mode." There is **no general Business-switching mechanism anywhere in the backend** (confirmed
absent — Agreements/Money/Store already take explicit KS Numbers per-flow), and this phase does not
invent one, nor any "Business mode" language implying a session-wide identity change. `Authority
SummaryResponse` is the one real source of "what can I do for this Business," always caller-resolved
server-side. No screen in this phase infers authority from URL/location — the "What you can do here"
section on Business Home is the explicit antidote to that failure mode, re-fetched from the backend
every time the screen opens, and (corrected by this pass, see H) never rendered as proof of authority
until that specific read succeeds.

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

**Corrected by this pass — ownership is stricter than "owner/administrator."** The original doc and
UI copy described this destination as reachable by "a signed-in Business owner/administrator."
Direct reading of `DeveloperPlatformAuthorization.requireOwnerOrInternalActor` on current
`SecurePayAPI main` found it requires the authenticated actor's own `actorKsNumber()` to *exactly
equal* `ownerBusinessKsNumber` (or a trusted internal actor) — Organization RBAC admin/membership is
never consulted. A person who administers a Business through Organization membership (i.e., has real
`authoritySummary` permissions for it) does **not** thereby gain Developer application ownership for
it. This phase does not bridge the two: no Developer screen reads or reacts to `authoritySummary`,
and none infers application ownership from Business membership. The registration form now states the
real requirement explicitly ("the signed-in actor must currently be that Business KS identity
itself") and lets the backend fail closed otherwise, rather than implying Business admin status is
sufficient.

## H. Account / Identity

**What changed**: a new **Account** destination (`src/features/account/`) replacing the `NavBar`'s
placeholder "Account → Home" routing. Identity is shown via the same real, self-scoped `/circle/me`
read Circle already uses (KS Number given prominence, identity lifecycle status humanised via the
existing `circleVerificationStatusLabel`, never presented as "professional verification" — Section 39
doctrine unchanged). A Business lookup is a separate, explicit read: **there is no backend index of
"which Businesses do I belong to"** (confirmed absent), so the person names a Business KS Number,
exactly mirroring Projects'/Vision Board's own established convention — not fabricated as an
auto-discovered list. Security section adds real, previously-unwired `logout-all` (sign out
everywhere) and a link into the new Recovery flow. `/api/v1/identities/**` was deliberately **not**
adopted for this screen: its authorization boundary was not independently verifiable from the
controller alone, and `/circle/me` already gives an equivalent, already-proven-safe self-scoped read
— reusing a verified-safe capability was preferred over introducing a new, unverified one.

**Corrected by this pass — Business lookup fail-closed.** The original section was headed "A Business
you administer" and rendered the organization card as soon as `business.get(businessKsNumber)`
succeeded, with the authority read shown only as an *additional* nested detail. Direct reading of
`BusinessAdministrationService.requireLink` (the method behind `GET .../organization`) found it
performs **no authorization check of its own** — it is a plain repository lookup by KS Number, so a
successful read proves only that the Business is activated, never that the caller administers it.
Fixed: the section is now headed "Open a Business" until authority is confirmed, `authoritySummary`
is requested immediately and unconditionally once the organization read succeeds, and the screen
distinguishes three states rather than one — checking, confirmed (with or without permissions), and
failed. A failed authority read now shows "SecurePay could not confirm your authority for that
Business" and does **not** show the organization as one the person can act for; only once
`authoritySummary` itself succeeds does the heading change to "Your authority for this Business" and
the "Open Business Home" link appear. Reading an organization's name is documented explicitly as not
being proof of administering it.

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
identity read into Projects' owner field; Account's Business lookup now requires a successful
`authoritySummary` read before presenting a Business as one the person can act for (see H). **Confirmed
NOT to exist, and correctly not built**: a Vision ↔ Project link (no direct-dependency bridge exists
today; the backend's own doctrine leaves room for one to be built later through each domain's public
API, but this pass builds none — see B); a "which Businesses do I belong to" index (Account's Business
lookup is explicit-KS, not auto-discovered); a durable Business role-assignment approvals inbox (no
listing endpoint, and the initiation endpoint itself only accepts the caller's own identity as
subject — see E); a Business-membership → Developer-application-ownership bridge (see G). KS001's own
context-awareness (Project/Vision/Business/Agreement scope) was verified as already real from Phase
5B's `AgentScope` work — no change was needed or made to it this phase.

## M. Authority audit

- **The authenticated actor remains the authenticated actor on Business Home**: no code path
  substitutes a Business identity for the signed-in person's own; a Business is resource/organization
  scope the call is checked against, never a second actor. Confirmed by reading
  `BusinessAdministrationService`/`AuthorizationEnforcer` directly, and by the corrected copy (F).
- **Selected Business scopes resource/organization context; it does not replace actor identity**: see
  F — corrected this pass from language that implied the opposite.
- **Business activation does not infer organisation-admin authority**: `requireOwnerOrInternalActor`
  requires `actorKsNumber() == businessKsNumber` (or a trusted internal actor); Organization
  membership/admin status is never consulted, and the frontend copy now says so exactly (F).
- **Current member role assignment is not falsely advertised**: the interactive "assign a role to
  another member" form was removed this pass after confirming `rejectUntrustedActorSubstitution`
  rejects any subject other than the caller's own identity; replaced with a truthful capability note
  (E).
- **Developer ownership is not inferred from organization membership/admin**: no Developer screen
  reads or reacts to `authoritySummary`; ownership is checked only by the backend's own
  `actorKsNumber() == ownerBusinessKsNumber` rule, and the frontend states this requirement rather
  than implying Business admin status is sufficient (G).
- **Account's Business read is not treated as authority proof**: `business.get()` succeeding is no
  longer sufficient to present a Business as one the person administers; only a successful
  `authoritySummary` read does that, and a failed authority read fails closed with a neutral message
  rather than silently showing the organization as "yours" (H).
- **Vision ≠ Project and no bridge was created**: confirmed — no cross-domain field or call exists in
  either domain's DTOs or gateways (grep-verified); the doctrine wording describing why was corrected
  this pass to state precisely what is and isn't forbidden (B, D).
- **Recovery never restores unrelated authority**: `resetRecoveryPassword`'s request/response carry no
  role/permission/organization field (grep-verified); the success copy states explicitly that
  Business/delegated/Agreement authority is unaffected. Unchanged this pass except for the transient-
  state hygiene fix (see K).
- **Developer secrets are ephemeral**: `issuedCredential`/`issuedWebhook`/`issuedSecureCode` are now
  cleared on leaving Developer and never persisted to storage (see the Developer secret-hygiene
  correction below, section corresponding to the task's "Developer secret hygiene").
- **No backend permission was widened**: this pass removed a client-side flow (role assignment for
  another member) rather than adding one; no new scope, permission, or actor-substitution path was
  introduced anywhere.
- **No Agreement/Money authority changed**: untouched — no mutating Agreement/Money call's arguments
  changed anywhere in this pass; the only functional changes were the role-assignment removal, the
  Account/Business copy and fail-closed fixes, and the two transient-state clears.
- **No frontend status/progress/financial metric was invented**: no health/readiness/completeness/
  rank/rating score exists anywhere in the feature files touched this pass (grep-verified, re-checked).

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

- **Participant/admin role-management contract mismatch**: the backend's own maker-checker role-
  assignment endpoint (`initiateRoleAssignment`) only accepts the caller's own identity as subject
  (`rejectUntrustedActorSubstitution`) — an Organization admin cannot use it to assign a role to a
  *different* member. This is a genuine contract gap for the "admin manages member roles" product
  story, not a frontend limitation; a future backend phase would need either a distinct
  admin-initiates-on-behalf-of-another-identity endpoint or a documented product decision that role
  assignment is self-service-only (e.g., invited members claim their own role after some other
  verification). This pass does not guess which; it discloses the mismatch and removes the UI that
  advertised the unsupported flow.
- **No pending protected-action inbox**: no backend GET endpoint lists protected actions awaiting a
  given actor's approval, independent of the subject-identity restriction above. Needed for any
  maker-checker journey (role assignment or otherwise) to be genuinely usable end-to-end.
- **No Organization-RBAC bridge into Developer application ownership**: `DeveloperPlatformAuthorization
  .requireOwnerOrInternalActor` checks only `actorKsNumber() == ownerBusinessKsNumber`; a real
  Organization admin (confirmed via `authoritySummary`) has no path to Developer application
  ownership today. If the product intends admins to manage a Business's developer applications, a
  future backend phase would need to consult the Organization/RBAC engine here too.
- **Business organization GET authority-hardening gap**: `BusinessAdministrationService.requireLink`
  (behind `GET /api/v1/business/{ks}/organization`) performs no authorization check of its own — any
  authenticated caller can read organization metadata (id, KS Number, activation date) for *any*
  Business KS Number, not just ones they administer. This is a backend-hardening observation, not
  something this frontend PR fixes; the frontend's own correction (H) is to never treat that read as
  proof of authority, regardless of whether the backend later tightens it.
- **No Vision → Project API bridge today**: the backend's cross-domain isolation rule forbids direct
  dependency between the two domains' internals but explicitly permits a future feature built through
  each domain's own authorized owner-scoped API (see B, D) — no such feature exists yet, and this pass
  does not build one.
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
- Commit: `df8b1ab` — "Phase 5: Life & Business World -- Account, Settings, Recovery, Business, Developer/Connect"
- Tests: see Tests (P) above — 388/388 passing, up from a 368/0-failing baseline.
- PR: #25 — opened as draft/open, unmerged — programme controller performs final review and merge.
