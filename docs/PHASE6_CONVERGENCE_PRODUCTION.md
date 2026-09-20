# Phase 6 — Final Convergence & Production

Branch `feat/final-phase6-securepay-convergence-production`, based on `origin/main` at `8b108d3`
(includes every merged Phase 1–5 PR and their correction passes).

Governing question: **does SecurePay now feel like one product?** This phase does not add a domain,
redesign the architecture, or invent backend capability. It archaeologizes the complete current
production application, fixes what is genuinely broken or dead, verifies what can honestly be
verified, and documents everything else precisely — including what remains unverified and why.

## A. Final archaeology

The production application (`RuntimeApp.tsx` → `AgentExperience.tsx`) is one continuous, state-
routed shell — not a router library, but a single component whose `navigateTo(view: AppView)`
function is the one navigation chokepoint for every real destination. It renders, in order of
priority: Store, Community, Circle, Ecosystem (Referral/Plug/Master), Projects, Vision Board,
Account, Settings, Business, Developer, Recovery, Workspace (Agreements/Money/Agreement Detail), and
finally the conversation Home (signed-out or signed-in). `App.tsx` is a completely separate, frozen
Bolt fixture harness reachable only via `VITE_SECUREPAY_MODE=fixture` in development — production
builds physically exclude it (`import.meta.env.DEV &&` guards the lazy import).

Every one of the 19 `AppView` values is reachable: 17 through `navigateTo`'s own branches (verified
by direct source read of every `view === '...'` check), and the two that are not — `'dispute'` and
`'agreement-builder'` — are not dead: they exist only for `App.tsx`'s own fixture-mode demo routing
(`#/demo/dispute/...`, `#/demo/agreement-builder/...`) and `NavBar.tsx`'s shared highlighting logic,
which both fixture and production modes render through. This was verified by grepping every use of
both string literals before concluding either way — an earlier hypothesis that they were dead code
was wrong and was corrected before acting on it.

**Reality-map classification** (see the full matrix in section B):
- **Production-ready, unchanged this phase**: Store, Community, Circle, Ecosystem/Referral/Plug/
  Master, Projects, Vision Board, Account, Settings, Business, Developer, Recovery — all already
  converged onto Phase 1 DNA primitives (`Surface`/`Button`/`StatusNotice`/`PageHeader`/`MoneyValue`)
  in Phases 1–5, all already authority-audited in their own phase.
- **A genuine, previously-undetected precision bug, fixed this phase**: `workspace/view.ts`'s
  `formatMoney` — the single most widely-rendered money display in the app (every Agreement Detail's
  inline Money summary, the dedicated Money workspace, and the Money activity/record list) — silently
  coerced a real, string-backed `proposedAmountMinor`/`AgreementMoneyRecordResponse.amountMinor`
  through `Number(...)`. This is the third occurrence of the exact bug class Phase 4 (Master/Plug)
  and Phase 5 (Projects) already fixed elsewhere — undetected until this pass's repository-wide sweep
  because it lived in a shared, unexported helper rather than an obviously Money-specific file. Fixed
  by routing both its string and number call-site paths through the same shared `decimalMoney`
  formatter. See D.
- **Confidently dead code, removed this phase**: three Bolt-era components
  (`AgreementMoneyHandoff.tsx`, `AgreementVersionCard.tsx`, `OfferComparisonView.tsx`) confirmed, by
  a full-repository import scan, to be referenced by nothing — not a real feature, not `App.tsx`, not
  a test. See section on dead code below.
- **Already correct, re-verified rather than changed**: console cleanliness (zero `console.log`/
  `console.debug`/`console.error`/`console.warn` calls anywhere in `src/`), storage discipline (zero
  `localStorage`/`sessionStorage` usage anywhere), token routing (all three real token-carrying routes
  — invitation, public Store offer, hosted Money session — are hash-based, never query-string), Money
  ≠ Wallet doctrine (every "wallet balance" occurrence in customer-facing copy is an explicit
  negation; every `Wallet` identifier elsewhere is the `lucide-react` icon, not a claim), Agreement
  next-action ordering (`nextActions[0]`, never locally sorted), and Store's SecureLink surfaces
  (never call Agreement `join`/`confirmVersion`).

## B. Production capability matrix

| World | Production backed | Visual verified | Authority verified | Deferred gap |
|---|---|---|---|---|
| Home / KS001 | Yes | **Visually verified** (fixture mode, desktop + mobile — see M) | Yes (Phases 2–4) | None new |
| Authentication (signup/OTP/activation) | Yes | Source/test verified only | Yes (Phase 2) | None new |
| Recovery | Yes | Source/test verified only | Yes (Phase 5, hardened by controller final gate) | None new |
| Agreements (Home/list/Detail) | Yes | Source/test verified only | Yes (Phases 2–3) | Participant-safe finished-Agreement provenance read (Phase 4) |
| Money (Home/Agreement Money/FX/Partners/Hosted/Ops) | Yes | Source/test verified only (no live backend) | Yes (Phase 3, 3 correction passes) | None new |
| Store / Offer / SecureLink | Yes | **Visually verified** (fixture mode) | Yes (Phase 4) | None new |
| Community / Circle | Yes, deliberately narrow | Source/test verified only | Yes (Phase 4) | Named-Circle/richer Community model (deliberate, not a gap) |
| Referrals / Plug / Master | Yes | Source/test verified only | Yes (Phase 4, final correction) | Master authority-violation message granularity (backend) |
| Projects | Yes | Source/test verified only | Yes (Phase 5) | None new |
| Vision Board | Yes | Source/test verified only | Yes (Phase 5) | None (Vision↔Project link possible via future authorized APIs, not built) |
| Business | Yes, narrow | Source/test verified only | Yes (Phase 5, final correction) | Cross-member role assignment; pending-action inbox; org GET authority hardening |
| Developer / Connect | Yes, narrow | Source/test verified only | Yes (Phase 5, final correction) | Organization-RBAC → Developer-ownership bridge |
| Account | Yes | Source/test verified only | Yes (Phase 5, final correction) | "Which Businesses do I belong to" auto-discovery |
| Settings | Yes | Source/test verified only | Yes (Phase 5) | None |

No row above claims visual verification that did not happen. See M for exactly what was and was not
rendered.

## C. Navigation convergence

No structural change was made to navigation this phase — Phase 5's convergence (fixing `NavBar`'s
placeholder "Account → Home" routing, adding the four new destinations) was found, on inspection, to
already satisfy Section 5's "no stranded screens, predictable entry/return" bar. What changed:
confirmed (not assumed) that all 17 real-production `AppView` values are reachable from `navigateTo`,
and that the two fixture-only values are correctly shared infrastructure, not orphaned state. No
navigation code was edited.

## D. Signed-out experience

**Visually verified in fixture mode** (see M): the signed-out Home leads with "What are you trying to
make happen?", a restrained SecurePay/KS001 mark (no mascot treatment), and a single input affordance
— exactly Section 7's doctrine. Submitting a message ("I need someone to build a perimeter wall")
correctly collapses the oversized hero: the conversation becomes the sole protagonist, with no
duplicate giant branding surviving into the active BUILD/UNDERSTOOD layout. No code change was needed
here; the existing implementation already matches doctrine on direct inspection.

## E. Signed-in Home / KS001

Not independently re-verified visually this pass (would require a live backend session, unavailable
in this environment — see M). Source-read confirms `agreementSummaryView`/`hubAgreementSummaries` in
`workspace/view.ts` (the data path Signed-in Home's structured cards read from) render exactly the
backend's own Hub buckets and next-action ordering, never a locally invented priority — see the new
regression test (Tests, R, item E).

## F. Agreements

**The real, previously-undetected bug** (see A): `workspace/view.ts`'s `formatMoney`, used by
`agreementSummaryView`, `agreementDetailView`, and `moneyDetailView` — i.e., every Agreement card
amount, every Agreement Detail inline Money summary, and the dedicated Money workspace — coerced a
genuinely string-backed `proposedAmountMinor`/`AgreementMoneyRecordResponse.amountMinor` through
`Number(...)`. Fixed by routing through the shared `decimalMoney` formatter (see the full diff in the
commit). Everything else in the Agreement world — hierarchy, next-action authority, Project
membership display, source-provenance limitations — was re-read and found unchanged from Phase 4/5's
own convergence work; no other fix was needed.

## G. Money

Re-audited every occurrence of "available"/"protected"/"settled"/"wallet"/"balance"/"spent"/"yours"/
"returned" across `src/features/money/` and the Agreement/Money-adjacent components. Every live
occurrence either correctly uses the locked Phase 3 vocabulary (`Proposed` / `Authorised maximum` /
`Funded / protected` / `Remaining funded` / `Progressed` / `Released back to the funder(s)`) or is an
explicit negation ("never a wallet balance," "not... a general balance"). No drift found; no change
made beyond the `formatMoney` precision fix (F), which also benefits every Money-adjacent Agreement
summary card.

## H. Trade & Community

Re-confirmed Phase 4's own findings hold: Store's public offer flow never calls Agreement join/
confirm authority (new regression test, Tests item F); Community/Circle remain the deliberately
narrow, real surfaces Phase 4 archaeology established (no fictional richness added or found);
Referral/Plug/Master's attribution-≠-authority / introduction-≠-endorsement / opinion-≠-truth
doctrine, re-read directly, is unchanged. No fixes were needed in this world this phase.

## I. Projects & Vision

Both re-read in full. Projects' own precision fix (Phase 5, per-Agreement `proposedAmountMinor`) and
owner-KS auto-resolution remain correct. Vision Board's "private KS operating memory" framing (never
a Pinterest board) is unchanged, and no Project-promotion button or life-goal flow exists anywhere in
either file. No code change was needed in this world this phase.

## J. Business

Phase 5's final correction (actor-remains-actor copy, activation's exact KS-identity requirement, the
removed cross-member role-assignment form, Account's fail-closed authority rendering) was re-read in
full and found to hold with no drift. No change was needed.

## K. Developer

Phase 5's final correction (Developer ownership requiring `actorKsNumber() == ownerBusinessKsNumber`,
never Organization RBAC; no Developer file reading `authoritySummary`; one-time secrets cleared on
leaving Developer, switching applications, or revocation) was re-read in full and found to hold. No
change was needed.

## L. Account / Settings / Recovery

Re-read in full. Account's Business-lookup fail-closed behavior, Settings' exactly-five-real-fields
scope, and Recovery's enumeration-resistant three-step flow are all unchanged from Phase 5's final
correction — including the additional controller hardening (`f6d7e1b`, made by the programme
controller between Phase 5's PR and this phase's start) that clears recovery secrets immediately on
successful reset rather than waiting for the person to navigate away. No further change was needed.

## M. Responsive verification

**Desktop — visually verified** (fixture mode, 1440×900 viewport, Chrome via `claude-in-chrome`):
signed-out Home (hero, KS001 mark, input affordance); the BUILD/UNDERSTOOD transition after sending
"I need someone to build a perimeter wall" (side-by-side desktop layout, hero correctly yields, no
duplicate branding, structured "What SecurePay understands" panel populates with a real, calm
`PEOPLE: You — customer` entry and an honest "as you talk... will appear here" empty state).

**Mobile — visually verified** (fixture mode, 390×844 viewport): the same conversation state
collapses BUILD/UNDERSTOOD into the documented sticky accordion tab ("1 What SecurePay understands")
above the conversation, bottom navigation renders without overlapping content, no horizontal
overflow. The Store fixture screen was also checked at this width: no forced imagery (a plain
"package" icon placeholder where no photo exists), restrained "Verified" badges, no horizontal
overflow.

**Everything else in the matrix (B) is source/test verified only** — no live `SecurePayAPI` backend
is configured in this environment (`VITE_SECUREPAY_API_BASE_URL` unset), so no real-mode screen
(Agreements, Money, Store's real-mode routes, Circle, Ecosystem, Projects, Vision Board, Account,
Business, Developer, Settings, Recovery) could be rendered against real data. This matches every
prior phase's own disclosed limitation (Phase 3 Money, Phase 4 Trade & Community, Phase 5 Life &
Business) and is stated here rather than assumed away.

## N. Accessibility

Not independently re-audited beyond what Phases 1–5 already established (semantic `role="status"`/
`role="alert"` via `StatusNotice`'s own tone-to-role mapping, real `<button>`/`<label>` usage
throughout, no custom-widget-without-semantics found during this pass's reading). No accessibility
regression was found or introduced; a dedicated accessibility pass (screen-reader walkthrough,
keyboard-only navigation trace) was not performed and is disclosed as not performed rather than
claimed.

## O. Security / sensitive-state audit

Repository-wide, confirmed via direct grep of every `.ts`/`.tsx` file (see Tests, R, items C/C2):
- **Zero** `localStorage`/`sessionStorage` usage anywhere in `src/`.
- **Zero** `console.log`/`console.debug` calls anywhere; no `console.error`/`console.warn` exist
  either, so no risk of a secret reaching them today.
- Every token-carrying route (invitation, public Store offer, hosted Money session) is hash-based,
  confirmed by direct read of `features/recipient/route.ts`, `features/store/route.ts`, and
  `RuntimeApp.tsx`'s money-session hash parser — none reach the query string or a host access log.
  No `URLSearchParams` usage anywhere carries a token/secret/password/OTP-shaped value (Projects'
  own `ownerKsNumber`/`active`/`query` filter params are the only real `URLSearchParams` usage in the
  app, and are not sensitive).
- Developer's one-time secrets (`issuedCredential`/`issuedWebhook`/`issuedSecureCode`) and Recovery's
  sensitive state (token/OTP/both password fields) — both hardened in Phase 5's final correction and
  the controller's own subsequent final-gate commit — were re-read and confirmed unchanged.

## P. Production vs fixture audit

New repository-wide regression test (Tests, R, item B) confirms no file under `src/features/**` or
`RuntimeApp.tsx` imports any top-level `*Data.ts` fixture module — only `App.tsx` (the frozen fixture
harness, excluded from production builds by `import.meta.env.DEV`) and Bolt fixture components under
`src/components/` (already individually locked by each domain's own fixture-parity tests, e.g.
`store.test.mjs`'s "L") may. This closes the gap the per-domain tests already covered individually
with one repository-wide backstop that will fail immediately if a *new* real feature file ever adds a
fixture import, not just the areas already covered by name.

## Q. Performance / build

`npm run build` succeeds; the pre-existing chunk-size warning (main bundle ~747 kB / ~164 kB gzipped)
is unchanged from every prior phase — no new heavy dependency was added this phase (only a formatter
consolidation and three file deletions). Code-splitting for low-frequency areas (Developer/Business/
Vision/Projects/Settings, per section 70 of the task) was evaluated and **not performed**: the current
single-bundle size is already accepted across five prior phases without a measured problem, and
introducing route-level lazy loading into `AgentExperience.tsx`'s single-component state router would
be a structural change disproportionate to Phase 6's convergence-only scope — deferred, not silently
skipped.

## R. Tests

Baseline (this branch, before any Phase 6 change, matching Phase 5's exact merged exit state):
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `node --test tests/*.mjs` — 406 passed, 0 failed.
- `npm run build` — succeeds.

After this phase's changes:
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `node --test tests/*.mjs` — **418 passed**, **0 failed** — no previously-passing test broken, no
  fixture-parity test needed updating.
- `npm run build` — succeeds, same pre-existing chunk-size warning.

### R2. Final Product Pass (W) — additional tests

The later Home/KS001/Fair Trade/Notifications/WhatsApp pass (section W) added 12 more focused tests
to `tests/phase6-convergence.test.mjs` (I1–I4, J, J2, K, L, M, N, O, P) and updated two existing
fixture-parity tests (`agent.test.mjs`'s and `signed-in.test.mjs`'s "retains byte-identical fixture
markup... outside the canonical brand mark swap" tests) to assert the new locked copy instead of the
old paraphrase, plus split one prior combined test so `ContextPanel`'s intentional icon-swap has its
own dedicated brand-mark-swap test instead of being asserted byte-identical to Bolt.

Final result after section W:
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `node --test tests/*.test.mjs` — **431 passed, 0 failed** (418 + 12 new tests in
  `tests/phase6-convergence.test.mjs` + 1 new dedicated `ContextPanel` brand-mark-swap test added to
  `agent.test.mjs` alongside narrowing that file's existing byte-identical test's scope; two other
  existing tests updated in place to assert the new locked copy).
- `npm run build` — succeeds; same pre-existing chunk-size warning, no new heavy dependency.

New tests (`tests/phase6-convergence.test.mjs`), deliberately not duplicating the dozens of narrower
doctrine tests already in `referrals-plugs-masters`/`community-circles`/`life-business`/`store`/
`money-experience`:
- **A1–A3**: a repository-wide regex backstop that fails if any file anywhere coerces a `*Minor`
  identifier through `Number(...)`/`parseFloat`/`parseInt` (the exact bug class found three times
  now); a behavioral test proving `agreementSummaryView` renders a 21-digit string amount exactly via
  the fixed `formatMoney`; a control proving the genuinely-`number`-typed call sites still work.
- **B**: no real production feature file imports fixture data.
- **C/C2**: no storage usage, no token-shaped `URLSearchParams`, no `console.log`/`debug` anywhere.
- **D**: no cross-currency summation pattern in Project/Money view code.
- **E**: Agreement next-action ordering stays backend-authoritative (no local `.sort()`).
- **F**: Store/Offer files never call Agreement join/confirm authority.
- **G/G2**: `RuntimeApp` fails closed to a calm `Unavailable` state with no stack trace when
  configuration is missing.
- **H**: the three removed dead components stay removed.

## S. Remaining backend gaps

Only gaps still real against current `SecurePayAPI main`, carried forward from prior phases (none
newly discovered this phase beyond what's already itemized in the Business/Developer rows of B):
participant-safe finished-Agreement source-provenance read (Phase 4); Business cross-member role-
management contract and pending-protected-action listing/inbox (Phase 5); Organization-RBAC →
Developer-ownership bridge (Phase 5); Business organization `GET` authority-hardening (Phase 5);
Vision ↔ Project authorized-link API (possible per the backend's own doctrine comment, not built).

## T. Final authority audit

- **Human**: view ≠ join, join ≠ confirm, review ≠ confirm, intention ≠ Agreement — unchanged from
  Phase 2, re-confirmed by source read.
- **Source**: source ≠ Agreement truth, Use this ≠ acceptance, introduction ≠ endorsement — unchanged
  from Phase 4, re-confirmed.
- **Money**: authorised maximum ≠ funded ≠ progressed ≠ certified settlement — unchanged from Phase
  3's final correction, re-confirmed by the vocabulary audit (G).
- **Project**: Project ≠ Agreement authority — unchanged from Phase 5, re-confirmed.
- **Vision**: Vision ≠ Project — unchanged; the doctrine wording correction from Phase 5's own final
  pass (a bridge is not built, and is not absolutely forbidden, only not built via a shortcut) holds.
- **Business**: Business scope ≠ actor identity; membership ≠ universal authority — unchanged from
  Phase 5's final correction, re-confirmed by direct re-read of the copy.
- **Developer**: Organization admin ≠ Developer owner under current backend — unchanged, re-confirmed.
- **Recovery**: credential recovery ≠ authority restoration — unchanged, re-confirmed; the additional
  controller hardening between Phase 5 and Phase 6 (clearing secrets immediately on success) only
  strengthens this, does not change its meaning.

No boundary above was found violated; none was changed this phase except the pure display-formatting
fix in F, which touches no authority.

## U. Production readiness verdict

| World | Verdict |
|---|---|
| Home / KS001 | **Ready** |
| Authentication | **Ready** |
| Agreements | **Ready** (the precision fix in this phase closes the last known display defect) |
| Money | **Ready with documented limitation** (no live-backend visual verification possible in this environment) |
| Store / Offer | **Ready** |
| Community / Circle | **Ready with documented limitation** (deliberately narrow backend scope, honestly presented) |
| Referrals / Plug / Master | **Ready** |
| Projects | **Ready** |
| Vision Board | **Ready** |
| Business | **Ready with documented limitation** (cross-member role management incomplete on the backend contract; correctly disclosed, not faked) |
| Developer / Connect | **Ready with documented limitation** (sandbox/hosted-Money creation require a separate, application-authenticated integration path, correctly out of this app's scope) |
| Account | **Ready with documented limitation** (no "which Businesses do I belong to" backend index) |
| Settings | **Ready** |
| Recovery | **Ready** |

No world is **blocked**.

## W. Final Product Pass — Home / KS001 / Fair Trade / Notifications / WhatsApp

A second, later convergence pass on this same branch/PR, focused on four product-locked things the
programme controller identified as still wrong or incomplete: the Home proposition, the KS001
conversational identity, Fair Trade principles treatment, and the Notifications/WhatsApp
communication architecture. Not a redesign, not a new phase — corrections and one new domain
(Notifications frontend) layered onto the same converged shell described in A–V above.

### W1. Archaeology findings

**Frontend (SecurepayLLM)**:
- The real Home hero used throughout the product is `SignedOutHome.tsx`, rendered by
  `AgentExperience.tsx` whenever no conversation has started yet — regardless of sign-in state (its
  own `showHome` flag, not session status, gates it). `SignedInHome.tsx` is a *different* screen (the
  Workspace's own dashboard-style Home with attention/waiting/activity lists), reached only after
  navigating into an authenticated Workspace; it happens to reuse a similar hero pattern but is not
  the primary conversation-first entry point the task's Home doctrine describes.
- The conversation header in `AgentExperience.tsx` labelled the conversation partner "SecurePay" and
  used `AgentIcon.tsx` — a hand-drawn generic circle-plus-shoulders SVG silhouette — confirmed to be
  exactly the "generic unrelated assistant avatar" doctrine says must disappear. The same generic
  silhouette was independently re-drawn a second time, inline, in `ContextPanel.tsx`'s empty state —
  not previously documented in any phase.
- The canonical standalone SecurePay icon is `securepay-mark-green.png` (per
  `src/assets/brand/securepay/README.txt`), already used correctly in `SignedInHome.tsx` (a
  `w-7 h-7` compact header instance and a `w-14 h-14` hero instance) — this established the
  size/placement convention reused everywhere else in this pass.
- `types.ts` already defines an unrelated `NotificationResponse` interface (`{ text, source, time }`)
  — a KS001 in-conversation card type in the `AgentComponentView` union, rendered by
  `NotificationCard.tsx`. This is a naming collision with, not the same domain as, the real backend
  Notifications inbox; the new gateway/controller/types added this pass are named
  `NotificationEvent`/`NotificationPreferences` to avoid colliding with it.
- No frontend gateway, controller, or screen existed for the real backend Notifications domain before
  this pass (`src/api/securepay/notifications/` did not exist).
- No "fair trade" or "principle" content of any kind existed anywhere in this repository.

**Backend (SecurePayAPI)**, verified by direct source read, never assumed from this task's own prompt:
- `NotificationController` (`/api/v1/notifications`) is real and production-wired: `GET /me`
  (category/unreadOnly/page/size filters), `GET /me/{id}`, `POST /me/{id}/read`,
  `POST /me/{id}/resolve`, `GET/PUT /me/preferences` — matching `NotificationResponse`
  (id/category/eventKey/priority/title/body/agreementId/bridgeId/actionKey/createdAt/readAt/
  resolvedAt/resolutionAction/version) and `NotificationPreferencesResponse`
  (whatsappEnabled/smsEnabled/emailEnabled + 6 category flags + saved) exactly.
- `NotificationChannelRoutingPolicy` is real, deterministic backend doctrine: a muted category
  produces no record at all (not even in-app); only `HIGH`-priority events are eligible for any
  external channel; WhatsApp is tried first, then SMS, then email — one channel, never a broadcast.
- **`NotificationChannelDeliveryConfiguration` is fail-closed by default: no real WhatsApp/SMS/email
  delivery adapter is wired anywhere in this backend.** Every external delivery attempt today is
  recorded as `SKIPPED` ("no delivery adapter configured for channel ..."). A repo-wide grep for
  "whatsapp"/"outreach" across all production Java found no channel adapter implementation anywhere —
  only the preference flags and the routing policy that *would* prefer WhatsApp if a real adapter
  existed. **This is the single most important finding of this pass: WhatsApp delivery is backend
  doctrine and a real preference contract, but not yet a real integration.** Section 13/31's doctrine
  ("do not say WhatsApp is complete merely because there is a preference checkbox") is honoured by
  documenting this precisely rather than building a frontend that implies delivery happens.
- `actionKey` exists in the schema end-to-end (command → event → response) but **every real
  production caller of `NotificationPublisher.publish` passes `actionKey: null`** (confirmed for all
  three live event producers: `AgreementController` → `agreement.invitation_issued`,
  `AgreementInvitationController` → `agreement.participant_joined`,
  `AgreementReviewParticipantController` → `agreement_review.opened` — all three populate
  `agreementId`, none populate `actionKey`). No `MONEY`/`SECURITY`/`COMMUNITY`/`SUPPORT` category has
  any real event producer yet either. The frontend therefore deep-links using the real, present
  `agreementId` field only, and never branches on `actionKey` (see K/L in Tests below) — per doctrine's
  explicit instruction not to invent an actionKey-to-route mapping.
- `TraderSettings` (`/api/v1/settings/me`: notifyEmail/notifySms/notifyPush/marketingOptIn/
  profileVisibility) and `NotificationPreferences` (`/api/v1/notifications/me/preferences`:
  whatsappEnabled/smsEnabled/emailEnabled + 6 category flags) are confirmed genuinely separate
  backend domains with zero code-level overlap — one general account-communication/privacy layer, one
  per-category event-delivery layer. Neither was "blindly combined"; the frontend instead adds an
  explicit cross-reference from Settings to Notifications (see W6).
- `SupportContextController` (`/api/v1/support/context/{traderKsNumber}`, requiring an
  `X-Outreach-Case-Ref` header) is real, but is an internal, purpose-limited staff projection — not a
  consumer-facing endpoint. It is not wired into any consumer UI this pass, per doctrine's explicit
  instruction not to wire internal staff SupportContext endpoints directly into consumer UI.
- The authoritative 12 Principles of Fair Trade were found, not invented, at
  `services/agreement/src/main/resources/fair-trade/principles-v1.json`, documented in
  `docs/doctrine/SECUREPAY_AGENT_FAIR_TRADE_CONSTITUTION_V1.md` and proven byte-identical by
  `Phase11DFairTradeAgentDoctrineTest`. There is no public REST endpoint exposing them (they exist
  only to build the Agent's own system prompt/constitution) — the frontend copy added this pass is a
  verbatim, one-time reproduction with a comment pointing back to the exact source file, documented
  as a re-sync gap rather than a live-fetched value (see W3).
- The KS001 chat visual-direction concern (Section 7/8: "move away from reddish/pink warmth") does
  not apply to this codebase as found: `tailwind.config.js` defines only `cream`/`forest`/`ember`/
  `sand` — a warm-cream, soft-forest-green, restrained-orange-`ember` palette with no `red`/`pink`/
  `rose` token anywhere, confirmed by a direct grep of every KS001-adjacent file. This was already the
  Phase 1 Visual DNA; no colour change was needed or made.

### W2. Home — locked copy and hierarchy

`SignedOutHome.tsx`'s headline and supporting paragraph now read exactly:
- "Tell SecurePay what you're trying to make happen."
- "It helps you bring the people, plans and agreements together so everyone knows what happens next
  — and money can follow what was agreed."

`SignedInHome.tsx`'s near-identical old headline ("What are you trying to make happen?") was
corrected the same way; its `subheading` prop remains a real, backend-appropriate, caller-supplied
value ("Ask anything, or start something new." in production) rather than being overwritten with the
Home-proposition copy, since it serves a different, truthful purpose (a returning-user greeting, not
a first-impression pitch) and the task did not ask for that personalization to be removed.

Hierarchy is now headline → supporting text → conversation input → Fair Trade line, with nothing
else between the input and the Fair Trade line. The seven example prompts and the "Activate
SecurePay" footer were demoted below the Fair Trade line rather than deleted — they remain a real,
functional entry point the task did not ask to remove, just kept out of the primary hero zone.

### W3. Fair Trade

`src/fairTradePrinciplesData.ts` holds the verbatim 12 principles (number/title/text), sourced
exactly from SecurePayAPI's canonical `principles-v1.json` (see W1). `FairTradePrinciples.tsx`
exports `FairTradeAffordance` (the quiet underlined line "Guided by the 12 principles of fair trade
›") and `FairTradePrinciplesPanel` — one responsive overlay component (centered dismissible dialog on
desktop, bottom sheet on mobile via Tailwind breakpoint classes alone) that never navigates away from
Home, supports Escape-to-dismiss and backdrop-click-to-dismiss, and focuses its close button on open.
Visually verified in both desktop (centered dialog) and mobile (bottom sheet) viewports via
`claude-in-chrome` against the fixture dev server — see W9. Never rendered as a score, badge, or
rating; the panel's own copy states this explicitly ("they are not a score, a rating, or a
certification").

### W4. KS001 identity

- `AgentExperience.tsx`'s conversation header now shows the real `securepay-mark-green.png` icon and
  labels the conversation partner "KS001" (was "SecurePay" + the generic `AgentIcon`).
- `MessageBubble.tsx`'s agent-sender bubbles and the typing indicator now use the same real mark
  instead of `AgentIcon`.
- `ContextPanel.tsx`'s empty-state icon (an independently hand-drawn copy of the same generic
  silhouette) now uses the same real mark, dimmed.
- `NavBar.tsx`'s top-left brand now shows `[icon] SecurePay` (was wordmark-only) — the top-left brand
  identity, distinct from the in-conversation KS001 identity, per doctrine's conceptual split.
- `AgentIcon.tsx` itself was left in place, unedited: it remains legitimately referenced by the
  frozen Bolt fixture harness (`App.tsx`), which this and every prior phase treats as out of scope
  unless a specific fixture defect is identified. **Visual verification note**: the fixture harness's
  own separate chat header (in `App.tsx`, not `AgentExperience.tsx`) still shows the old generic
  avatar and the label "SecurePay" — confirmed via the dev server screenshot in W9 — and this is
  correct: it is fixture-only demo code untouched by this pass, not the real production conversation
  header this doctrine targets. The real header (`AgentExperience.tsx`) cannot be visually rendered
  in this environment without a live backend session (see W9); it is verified by source-level
  regression tests (I1) and direct code review instead.

### W5. Notifications — canonical in-app attention centre

New, real, production-wired (not fixture-only) frontend domain:
- `src/api/securepay/notifications/index.ts` — gateway hitting the real, verified
  `NotificationController` contract exactly (see W1), wired into `createSecurePayApi` and
  `RuntimeApp.tsx` alongside every other real gateway.
- `src/features/notifications/controller.ts` / `NotificationsExperience.tsx` — a two-tab screen
  (Inbox, Preferences) following the same `Loadable`/subscribe-store pattern as `SettingsExperience`.
  Inbox: category filter chips, unread-only toggle, unread/resolved state shown as a quiet dot and a
  small "Resolved" line (never a loud badge count), "Open Agreement" only when a real `agreementId` is
  present, "Mark as read." Preferences: WhatsApp/SMS/email channel toggles (WhatsApp presented as
  preferred, with an explicit "only one channel is used, WhatsApp first" note matching the real
  routing policy) and the six real category toggles.
- `AgentExperience.tsx` gained an authenticated-only `notifications` route (same pattern as Account/
  Settings/Business/Developer) and an `openAgreementFromNotification(agreementId)` helper that reuses
  the exact same `workspaceAgreementId`/`setWorkspace(true)` mechanism already used for Ecosystem/
  referral flows — not a new navigation primitive.
- `NavBar.tsx` gained a quiet, icon-only bell entry (desktop: right of the primary nav items, with a
  visual divider from the labelled tabs; mobile: an "Alerts" bottom-nav slot) routing to
  Notifications. No badge count is rendered anywhere — deliberately, per doctrine ("not a loud
  feed"). **Documented scope limit**: a live cross-surface unread-count dot on the bell itself was not
  wired, to avoid threading live unread state through every other screen's own `<NavBar>` call site in
  this focused pass; unread state is visible once inside the Notifications screen itself. This is
  disclosed as a deferred enhancement, not a launch blocker.
- `AccountExperience.tsx` gained a "Notifications" entry alongside Settings/Projects/Vision Board/
  Business/Developer.

### W6. Preference reconciliation

`SettingsExperience.tsx` (TraderSettings: notifyEmail/notifySms/notifyPush/marketingOptIn/
profileVisibility) now carries an explicit note under its own "Notifications" section: "WhatsApp and
per-category delivery (Agreements, Money, Reviews, Security, Community, Support) are managed
separately in Notifications" — with a real link to the new screen. The two models were not merged
(they are genuinely separate backend domains, W1) and neither screen was made to silently duplicate
or contradict the other's fields; the reconciliation is presented as an explicit cross-reference, not
a combined form.

### W7. WhatsApp / Outreach doctrine

Given W1's finding (no real delivery adapter exists), the frontend:
- Never claims a WhatsApp message was or will be sent — the Preferences tab describes *routing
  preference* ("WhatsApp is SecurePay's preferred channel... only one channel is used per
  notification"), never delivery confirmation.
- Never force-enables WhatsApp: `savePreferences()` sends exactly the person's own draft values,
  proven by a new regression test (M) that a person who left WhatsApp off keeps it off through a
  save round-trip.
- Never routes any authority action (join, confirm, release, dispute) through WhatsApp/notification
  presentation — the Notifications screen's only actions are "Open Agreement" (a navigation, into the
  same real, authenticated Workspace review surface every other entry point already uses) and "Mark
  as read" (a durable-attention-record action, not an Agreement action).
- Does not wire the internal `SupportContextController` into any consumer screen (W1).
- Adds no fabricated support ticket/queue/SLA/agent-availability state (regression test O).

### W8. Deferred / documented gaps (not launch blockers, not hidden)

- **WhatsApp/SMS/email delivery has no real backend adapter today** (W1) — the frontend Preferences
  screen is honest about *preference*, not delivery; wiring a real channel adapter is backend work
  outside this frontend repository's scope.
- **`actionKey` is schema-real but never populated** by any current event producer — deep-linking
  today is `agreementId`-only; richer per-event routing (e.g., straight to a specific review state
  rather than the Agreement's general Workspace view) awaits a real backend actionKey vocabulary.
- **Only three real notification event types exist today** (`agreement.invitation_issued`,
  `agreement.participant_joined`, `agreement_review.opened`), all in the `AGREEMENTS`/`REVIEWS`
  categories — `MONEY`/`SECURITY`/`COMMUNITY`/`SUPPORT` categories exist in the schema and this
  frontend's filters, but have no real backend event producer yet, so those filters will show real
  empty states in production today, not fabricated content.
- **No live cross-surface unread-count indicator** on the NavBar bell outside the Notifications
  screen itself (W5) — deliberately scoped out of this focused pass.
- **`SignedInHome.tsx`'s headline-adjacent Fair Trade line and icon-swap were added, but its
  `greeting`/`subheading` personalization was left untouched** — a deliberate choice (W2), not an
  oversight.

### W9. Desktop + mobile verification

Real production `AgentExperience.tsx`/`RuntimeApp.tsx` requires a live, authenticated `SecurePayAPI`
backend that is not configured in this environment (matching every prior phase's own disclosed
limitation, section M) — so its KS001 header, Notifications screen, and hero-yielding transition were
**not** visually rendered; they are verified via source-level regression tests (I1–I4, J, K, L, N)
and direct code review, not claimed as visually verified.

What **was** visually verified via `claude-in-chrome` against the local fixture dev server
(`VITE_SECUREPAY_MODE=fixture`, which reuses the real `SignedOutHome`/`NavBar`/`FairTradePrinciples`
components directly, not a separate mock of them):
- **Mobile** (device-width viewport): the Home hero renders the exact locked headline/supporting
  text, input, and Fair Trade line in the correct order; the mobile bottom nav shows the new "Alerts"
  bell entry alongside the six existing tabs; tapping the Fair Trade line opens a bottom sheet
  listing all 12 principles verbatim, dismissible via the close button.
- **Desktop** (1400×900): the same locked copy and hierarchy render correctly at desktop width; the
  top-left brand shows `[icon] SecurePay`; a quiet, unlabelled bell icon appears at the right edge of
  the primary nav, visually subordinate to the six labelled tabs; clicking the Fair Trade line opens a
  centered, dismissible dialog (not a bottom sheet) listing all 12 principles verbatim; Escape closes
  it.
- Separately confirmed (and correctly out of scope): the frozen Bolt fixture harness's own internal
  chat header in `App.tsx` still shows the old generic avatar and "SecurePay" label — this is
  untouched fixture-only demo code, not the real production KS001 conversation header.

## V. Git report

- Branch: `feat/final-phase6-securepay-convergence-production`
- Starting SHA: `8b108d3` (`origin/main`, includes merged Phase 1–5 PRs and all correction passes)
- Files changed: `src/features/workspace/view.ts` (precision fix); deleted
  `src/components/AgreementMoneyHandoff.tsx`, `src/components/AgreementVersionCard.tsx`,
  `src/components/OfferComparisonView.tsx` (confirmed dead code); new
  `tests/phase6-convergence.test.mjs`; new `docs/PHASE6_CONVERGENCE_PRODUCTION.md` (this document).
- Commit: `3034d0e` — "Phase 6: Final Convergence & Production"
- Tests: see Tests (R) above — 418/418 passing, up from a 406/0-failing baseline.
- PR: #26 — opened as draft/open, unmerged — programme controller performs final review and merge.
- Not deployed; production hosting untouched.

### V2. Final Product Pass (W) — git report

- Branch: `feat/final-phase6-securepay-convergence-production` (same branch, continued)
- New files: `src/api/securepay/notifications/index.ts`, `src/features/notifications/controller.ts`,
  `src/features/notifications/NotificationsExperience.tsx`, `src/components/FairTradePrinciples.tsx`,
  `src/fairTradePrinciplesData.ts`.
- Modified files: `src/types.ts` (new `notifications` AppView); `src/api/securepay/index.ts` (wired
  notifications gateway); `src/RuntimeApp.tsx` (wired notifications gateway, threaded to
  `AgentExperience`); `src/features/agent/AgentExperience.tsx` (KS001 header, notifications routing,
  `openAgreementFromNotification`); `src/components/MessageBubble.tsx` (real mark icon, dropped
  `AgentIcon`); `src/components/ContextPanel.tsx` (real mark icon in empty state); `src/components/
  ConversationWorkspace.tsx` (dropped a now-removed `MessageBubble` prop); `src/components/NavBar.tsx`
  (top-left icon, Notifications bell entry); `src/components/SignedOutHome.tsx` (locked copy, Fair
  Trade affordance, demoted example prompts); `src/components/SignedInHome.tsx` (locked headline, Fair
  Trade affordance); `src/features/settings/SettingsExperience.tsx` (cross-reference note to
  Notifications); `src/features/account/AccountExperience.tsx` (Notifications entry);
  `tests/agent.test.mjs`, `tests/signed-in.test.mjs`, `tests/phase6-convergence.test.mjs` (regression
  coverage, see R2); `docs/PHASE6_CONVERGENCE_PRODUCTION.md` (this section).
- No file was deleted; `AgentIcon.tsx` remains in place, still legitimately used by the frozen Bolt
  fixture harness (`App.tsx`).
- Tests: 431/431 passing (see R2).
- `npm run typecheck` / `npm run lint` / `npm run build`: all clean/succeeding (see R2).
- PR: #26 — remains open/draft, unmerged, not deployed. Description updated (see the PR itself) to
  cover this pass's findings alongside the original convergence pass.

## X. Final Correction Pass — Chat Atmosphere / KS001 Mobile / Understanding Title / Notification Truth / Account Completeness

A third pass on this same branch/PR, made after direct programme-controller review of PR #26 found
several product/completeness claims in section W were ahead of the actual implementation. Narrow
corrections only — no redesign, no new phase.

### X1. Archaeology findings

**Frontend**: `AgentExperience.tsx`'s conversation surfaces (`bg-cream-50`/`bg-cream-100/50`) had no
green atmosphere at all; its mobile sticky header showed only BUILD/UNDERSTOOD tabs, with the KS001
identity block explicitly `hidden md:flex`; its desktop understanding panel title fell back to the
literal string `'Trade taking shape'` whenever a turn had no backend `contextualPanel.title`, in
direct contradiction of the locked "What SecurePay understands" doctrine. `NotificationsExperience`
had no pagination at all (`gateway.list()` was always called with no `page`/`size`, silently
capping the inbox at the backend's default first page) but correctly never exposed a generic
resolve action. `SettingsExperience` still rendered `notifyEmail`/`notifySms`/`notifyPush` toggles
alongside Notifications' own WhatsApp/SMS/Email toggles. `AccountExperience` had no Plan &
Subscription surface and no Change Password flow, despite `SubscriptionGateway.myStatus()` and
`AuthGateway.changePassword()` already existing and being fully wired end-to-end in the codebase.

**Backend (SecurePayAPI), verified fresh**:
- `TraderSettings.notifyEmail/notifySms/notifyPush` (and, it turns out, `marketingOptIn`/
  `profileVisibility` too) have **zero consumers anywhere in production Java outside their own
  settings module** (confirmed by a repo-wide grep; the only non-test/non-module reference found
  was a phase-numbered integration test). `NotificationPreferences.whatsappEnabled/smsEnabled/
  emailEnabled`, by contrast, are read directly by the real, live `NotificationChannelRoutingPolicy`.
  This is the concrete evidence behind removing the three colliding toggles from Settings rather
  than merely re-labelling them.
- `GET /api/v1/subscriptions/me` (`SubscriptionController`) throws a real, distinct `NoSubscriptionException`
  (404, code `NO_SUBSCRIPTION`) when the identity has never opened a subscription — a real, expected
  state, not an error, so the frontend's `SubscriptionLoadable` gives it its own `'none'` status
  rather than folding it into `'error'` or fabricating a friendlier lie.
- `SubscriptionStatus` is `PENDING | ACTIVE | SUSPENDED | CANCELLED` — rendered as-is (lower-cased),
  no invented label.
- `POST /api/v1/auth/password` (`DefaultAuthenticationPasswordChangeService.changePassword`) was
  read line-by-line: on success it calls `sessionRepository.revokeAllByIdentityId` **and**
  `refreshTokenRepository.revokeAllActiveByIdentityId` — every session and refresh token for the
  identity, including the one making the request, is revoked. The frontend's success copy ("every
  device — including this one — has been signed out") is therefore a verified fact, not a guess,
  and mirrors the existing `signOutEverywhere` success copy's own lazy-invalidation pattern (no
  forced client-side redirect; the next request will simply discover the session is gone, exactly
  like `logoutAll` already behaves here).
- `SubscriptionStatusResponse.monthlyFeeMinor` (and the retention-reward field) are `number`-typed
  JSON fields, not decimal strings — the shared HTTP client's own JSON-parse reviver already throws
  on any unsafe integer before this code ever sees a corrupted value, so no new precision handling
  was needed; the value is still routed through `decimalMoney(String(minor), currency)` (never
  `Number(...)` arithmetic) for consistency with the rest of the app's money-formatting discipline.

### X2. Chat visual correction — the soft-green atmosphere

Added a new Tailwind `backgroundImage` token, `ks001-surface` (two low-alpha forest-toned radial
gradients), applied alongside `bg-cream-50` on both conversation-side surfaces in
`AgentExperience.tsx`. **A real bug was found and fixed during this work**: the first version of the
token appended a bare hex color as a third comma-separated "layer" inside the `background-image`
value (`radial-gradient(...), radial-gradient(...), #fdfcf8`) — invalid CSS, since a `background-image`
layer must be an `<image>`, never a plain color. This silently invalidated the *entire* declaration
(confirmed via direct DOM inspection: the generated CSS rule was emitted as `.bg-ks001-surface { }`,
completely empty). Fixed by moving the base fill to a separate `bg-cream-50` class alongside the
gradient-only token. Now verified live (see X8) to render a real, restrained, perceptible tint —
warm cream base, quiet green tonal light, no flat page, no decorative gradient.

### X3. Desktop + mobile KS001 identity

Desktop identity block (icon + "KS001" + busy state) is unchanged from section W4 and was
re-verified. Mobile now has its own compact identity row (real `securepay-mark-green.png` icon,
"KS001", busy state) directly above the BUILD/UNDERSTOOD tab bar, inside the same sticky header —
one coherent mobile header, not a second bulky bar. Verified live (X8): adds roughly one line of
height, BUILD/UNDERSTOOD remain fully usable.

### X4. Understanding-panel title correction

`ContextPanel`'s `panelTitle` prop on the desktop understanding panel is now unconditionally the
literal string `"What SecurePay understands"` — the previous `panel?.title || 'Trade taking shape'`
fallback (which let a backend-supplied per-turn `contextualPanel.title` silently replace the product
title) is gone. The backend's own per-turn title is no longer surfaced as the panel's own title
anywhere; it was not otherwise displayed before this change either, so nothing regressed.

### X5. Notifications — pagination and resolution truth

- `createNotificationsController` now tracks `nextPage`/`hasMore`/`loadingMore`; `loadInbox()`
  (used by initial `load()` and by every filter change) always resets to page 0, and a new
  `loadMore()` fetches exactly the next page with the *same* active category/unreadOnly filters,
  de-duplicates by id against the existing list, and appends. `hasMore` is derived only from
  whether the last fetch returned a full page (`length === size`) — never a fabricated total, per
  doctrine. `NotificationsExperience` shows a calm "Load more" text link beneath the list, never an
  infinite-scroll/auto-load mechanic.
- No generic resolve action was added. The inbox still only ever displays real, backend-returned
  `resolvedAt` state (a quiet "Resolved" line with a checkmark) — there is still no `resolve(...)`
  call anywhere in the Notifications frontend, because no real event contract in this codebase
  currently defines what resolution action is semantically valid for which event type. This is
  documented as a deliberate non-feature, not an oversight.
- `actionKey` remains unused for routing (section W1/W-L); `agreementId` remains the only field used
  to open an Agreement from a notification.

### X6. Preference reconciliation — final decision

`TraderSettings`'s three notification-channel toggles (`notifyEmail`/`notifySms`/`notifyPush`) are no
longer rendered in `SettingsExperience` — confirmed via backend archaeology (X1) that they drive no
real delivery path today. The backend field/endpoint/contract is completely untouched (no contract
change from the frontend, per instruction); `TraderSettingsController`'s `PUT /me` still accepts and
persists them exactly as before, and `SettingsController`'s own `save()` still round-trips whatever
values were already loaded. Settings' Notifications section is now a single sentence pointing to the
one real control surface (Notifications' own WhatsApp/SMS/Email + category toggles). Marketing opt-in
and profile visibility remain in Settings — they have no colliding second control surface elsewhere,
so the contradictory-toggle problem does not apply to them.

### X7. Account completeness — Plan & Subscription and Change Password

- **Plan & Subscription**: a new Surface in `AccountExperience` reads `subscriptionGateway.myStatus()`
  (threaded through `RuntimeApp.tsx` → `AgentExperience` → `createAccountController`) and renders
  only real fields: plan (For You/Business), status, monthly fee (via `decimalMoney`), consecutive/
  lifetime paid cycles, and retention-qualified reward when present. A `NoSubscriptionException`
  (404/`NO_SUBSCRIPTION`) renders a calm "you haven't activated a subscription yet" state with a
  link into the existing Activation route — never an error banner. No invoices, next billing date,
  cancellation, payment method, or upgrade recommendation is invented; nothing here can mutate the
  plan (`selectPlan` is never called from this view).
- **Change Password**: added under Account → Security as a collapsed "Change password" link that
  expands into a local-only form (current/new/confirm password, an equality check purely in
  component state — `confirmPassword` is never sent to the controller or backend). Calls the real
  `AuthGateway.changePassword({ currentPassword, newPassword })`. Fields clear immediately on
  success, on Cancel, and on unmount. Success copy truthfully states every device — including the
  current one — has been signed out (verified against the backend implementation, X1), matching the
  existing `signOutEverywhere` copy's own style and lazy-invalidation behavior. No password value is
  ever logged, persisted, or placed in a URL/query string.

### X8. Visual verification

Real production `AgentExperience`/`RuntimeApp` still requires a live authenticated backend not
configured in this environment (unchanged limitation from section W9). This pass went further than
W9 by building a **temporary, uncommitted, local-only harness** (`verify.html` +
`src/devVerifyEntry.tsx`, deleted immediately after use, never part of any commit) that mounted the
*real* `AgentExperience` component with fake gateway objects returning plausible data — not a
fabrication of backend capability, but a way to render and directly inspect the real component tree
that the Bolt fixture harness cannot reach. Confirmed live via `claude-in-chrome`, both desktop and
mobile viewports:
- Desktop: `[icon] KS001` + busy state in the conversation header; `WHAT SECUREPAY UNDERSTANDS` /
  "What SecurePay understands" panel title (no longer "Trade taking shape"); the `ks001-surface`
  gradient confirmed present via `getComputedStyle(...).backgroundImage` (this is exactly how the
  invalid-CSS bug in X2 was caught — the very first attempt returned `"none"`).
  Plan & Subscription card rendered correctly with realistic fake data (plan/fee/status/cycles).
  Notifications screen rendered its category chips and calm empty state ("Nothing needs your
  attention right now.") with no loud feed styling.
- Mobile: the compact `[icon] KS001 listening` row directly above Build/Understood, confirmed as one
  coherent header with normal conversation flow beneath it; the mobile bottom nav's renamed
  "Notifications" label (was "Alerts") fits cleanly at typical phone width without wrapping or
  overlapping neighboring tabs.
- Not independently re-verified live this pass (unchanged from W9's own disclosure): Settings' updated
  copy and the Change Password form's own visual layout were confirmed by source read and by the
  existing collapsed/expanded interaction pattern already used elsewhere in Account, not by a fresh
  screenshot of that exact sub-state.

### X9. Tests

Added to `tests/phase6-convergence.test.mjs`: Q1–Q4 (mobile KS001 identity row, the ks001-surface
token's CSS validity and usage, the hardcoded understanding-panel title, no generic-avatar
reintroduction), R1 (Home locked copy/Fair Trade unchanged), S1–S2 (pagination preserves filters and
de-duplicates with no fabricated total; no generic resolve action), T1–T2 (Settings no longer binds
the inert toggles; WhatsApp toggle never hardcoded true), U1–U4 (Plan & Subscription real-fields-only
and non-mutating; Change Password's real contract, local-only confirmation, and field-clearing
discipline), V1 (subscription fee formatted through the shared BigInt-safe `decimalMoney`, never
`Number(...)`).

Final result:
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `node --test tests/*.test.mjs` — **445 passed, 0 failed** (431 baseline + 14 new tests; no
  previously-passing test broken, no existing test weakened).
- `npm run build` — succeeds; same pre-existing chunk-size warning, no new heavy dependency.

### X10. Commit and PR

- Commit: see the branch's latest commit for this pass (this document and the code were committed
  together).
- PR #26 remains **open, draft, unmerged, not deployed**. No Phase 7 was started.

## Y. Session-clearing correction

A narrow correctness fix, made after review found an authority/state mismatch: the backend's
`changePassword` (section X1) revokes every session and refresh token for the identity, including
the current one, but the frontend's own `SessionStore` was not cleared until a subsequent request
happened to fail. Fixed:

- `createAccountController` now takes a second parameter, `onPasswordChanged: () => void`, called
  exactly once, immediately after a successful `gateway.changePassword(...)` call — never on
  failure, never on cancel. Account keeps no direct dependency on the `SessionStore` itself, only
  this narrow callback.
- `AgentExperience.tsx` (the one place that owns both `session` and the account controller) supplies
  `() => { session.clear(); setNotice('Password changed. Sign in again with your new password.'); }`
  — reusing the existing `notice` banner mechanism already used elsewhere in this router, rather than
  building a new flash-message architecture for one case.
- `session.clear()` flips `sessionState.status` to `'signed-out'`; every authenticated-only branch in
  `AgentExperience.tsx` (Account, Settings, Business, Developer, Notifications, Workspace) already
  gates on `sessionState.status === 'signed-in'`, so all of them close in the same render pass — not
  just Account. `session.clear()` is called *before* the controller's own `changePasswordDone` flag
  is set, so even in a worst-case unbatched render, a success card can never appear on an
  already-revoked, authenticated-only screen.
- `signOutEverywhere` is untouched by this fix — it was not in scope, and its existing (lazy,
  next-request-discovers-it) behavior is preserved exactly as before.

6 new tests added to `tests/phase6-convergence.test.mjs` (W1–W6): successful change calls the real
gateway and notifies exactly once; a failed change never notifies; cancel never notifies;
`AgentExperience` wires the callback to the real `SessionStore.clear()` and the existing notice
banner (no new storage-backed auth state, no token decoding); every authenticated view still gates
on `sessionState.status`; `signOutEverywhere` is provably unchanged.

Final result: `npm run typecheck` — clean. `npm run lint` — clean. `node --test tests/*.test.mjs` —
**451 passed, 0 failed** (445 baseline + 6 new, nothing weakened). `npm run build` — succeeds.

PR #26 remains **open, draft, unmerged, not deployed**.
