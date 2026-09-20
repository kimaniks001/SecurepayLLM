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
- `node --test tests/*.mjs` — **418 passed** (406 + 12 new focused tests in
  `tests/phase6-convergence.test.mjs`), **0 failed** — no previously-passing test broken, no
  fixture-parity test needed updating.
- `npm run build` — succeeds, same pre-existing chunk-size warning.

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

## V. Git report

- Branch: `feat/final-phase6-securepay-convergence-production`
- Starting SHA: `8b108d3` (`origin/main`, includes merged Phase 1–5 PRs and all correction passes)
- Files changed: `src/features/workspace/view.ts` (precision fix); deleted
  `src/components/AgreementMoneyHandoff.tsx`, `src/components/AgreementVersionCard.tsx`,
  `src/components/OfferComparisonView.tsx` (confirmed dead code); new
  `tests/phase6-convergence.test.mjs`; new `docs/PHASE6_CONVERGENCE_PRODUCTION.md` (this document).
- Tests: see Tests (R) above — 418/418 passing, up from a 406/0-failing baseline.
- PR: to be opened as draft/open, unmerged — programme controller performs final review and merge.
- Not deployed; production hosting untouched.
