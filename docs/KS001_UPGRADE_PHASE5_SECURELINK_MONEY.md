# KS001 Upgrade — Phase 5: SecureLink & Money Continuation (Frontend, Slice 1)

**Classification:** Current architectural decision / Confirmed technical record for what changed this pass.
Backend authority claims are traced from SecurePayAPI source read during archaeology, not assumed; anything
not directly verified against backend code is labeled explicitly below.

Baselines verified before branching: SecurePayAPI `main` at `85ea61d2b21c0c248945e74425ef23b60e5f184c`;
SecurepayLLM `main` at `57a68663c98a5cf42c2ddc594e2953134c73ec14`. Branch:
`feat/ks001-upgrade-phase5-securelink-money`. Commits `78ac6be`, `2c8b9c1`. PR **#42** (DRAFT).
Backend companion: SecurePayAPI PR **#231** (DRAFT).

**DO NOT MERGE. DO NOT DEPLOY. Phase 6 not started.** This phase touches Money and may touch protected
financial authority — human review required per the repository's own merge-authority rules.

Central doctrine: **"Money should follow the agreement."** SET never automatically creates a SecureLink,
opens funding, joins/confirms anyone, or infers Payment Ready.

---

## A. Archaeology

The real "SET" moment is not a form — it is `HandoffPanel.tsx`'s `'progressed'` phase, reached only after
`HandoffController#createDraft()` (calling `AgreementGateway.continueHandoff`) idempotently creates a real
DRAFT Agreement. This was confirmed by reading `src/features/handoff/controller.ts` end-to-end, not assumed
from the file's name. The field carrying the Agreement's title on this state is `state.handoff.candidate`
(mapped from `dto.agreementCandidateSummary` via `handoffView()` in `src/api/securepay/agent/adapters.ts`)
— not `agreementCandidateSummary` directly, a naming trap corrected during this slice.

`openMoneyFor(handoff: MoneyHandoff)` (`src/features/money/handoff.ts`) already existed as the exact
Agreement→Money context-passing mechanism: an in-memory module variable, never a URL/localStorage/query
param, carrying `{ agreementId, title, versionLabel, currentVersionId }`. Money re-reads the Agreement fresh
via its own `resolveHandoffContext` rather than trusting these cached fields — this slice does not change
that; it only correctly triggers the mechanism from the real post-SET moment.

`AUTHENTICATED_AGREEMENT_METHODS` (`src/api/securepay/agreements/refresh.ts`) is a guard-tested list of
every `auth: 'required'` gateway method requiring session-refresh wrapping — an existing drift-guard test
fails loudly if an authenticated method is added without being listed here.

## B. Existing capabilities reused

- The handoff/SET controller and its `createDraft()` idempotent-retry idiom ("uncertain → retry the SAME
  request, never a fresh key") — replicated, not reinvented, in the new `createSecureLinkCreateController`.
- `openMoneyFor()` and Money's own fresh-read resolution.
- The existing `#/invitation/{token}` route and `RecipientExperience` component — the new public SecureLink
  page hands off Join to this exact, unmodified core.
- `SecureAuthCard` / `createIdentityController` / `createSignupController` / `signupView` — reused as-is in
  `SecureLinkExperience`'s identity path, mirroring `RecipientExperience`'s own `'unset'|'signin'|'signup'`
  pattern rather than inventing a second auth UI.

## C. Gaps found and closed

- `HandoffPanel.tsx`'s `'progressed'` phase offered only "Open this Agreement" / "Back to the conversation"
  — no Money or SecureLink continuation existed at all. Rewired into the three-path continuation (Section
  E below).
- No frontend surface existed anywhere for SecureLink creation or public (no-auth) review. New
  `src/features/securelink/` feature added.
- A second "Create SecureLink" attempt against an Agreement that already has an active product surfaced the
  backend's raw internal exception text (`"product already active for agreement"`) rather than an honest
  sentence — fixed by mapping the stable `AGREEMENT_CONFLICT` error code.

## D. Backend changes consumed (not authored here — see the SecurePayAPI Phase 5 report for detail)

- New gateway DTOs/methods: `activateProduct`, `issuePublicLocator`, `viewSecureLink`,
  `requestSecureLinkJoinAuthority` (`src/api/securepay/agreements/index.ts`), added to
  `AUTHENTICATED_AGREEMENT_METHODS` where authenticated.
- `IssuePublicLocatorDto.publicUrl` is `string | null` — `null` means the production base URL is not
  configured; the frontend never fabricates a value when it is missing.

## E. Frontend changes

**`src/features/handoff/HandoffPanel.tsx`** — the single most significant change. The `'progressed'` phase
now offers, only after `createDraft()` has genuinely succeeded:

1. **Connect money now** — calls `openMoneyFor({ agreementId, title, versionLabel: null, currentVersionId: null })`, then resets the handoff/identity controllers exactly as the prior "Open this Agreement" path did.
2. **Create SecureLink** — switches to an inline sub-view (`continuationView` local state) rendering the new `CreateSecureLinkPanel`, backed by a `createSecureLinkCreateController` instantiated lazily and reset on completion.
3. **Open this Agreement** — unchanged.
4. **Save — I'm done for now** — falls through to the existing `leave()` behavior; no new code path, no "incomplete" language.

None of these fire merely by reaching the phase — each requires the choice's own explicit `onChoice` branch, proven by test (Section I).

**New `src/features/securelink/` feature:**
- `createController.ts` — `createSecureLinkCreateController(gateway, agreementId, defaultPurposeSummary, id?)`. Two sequential idempotent calls (`activateProduct` then `issuePublicLocator`), each keyed once per logical attempt (`activateKey`/`issueKey`), reused on an `'uncertain'` (network/timeout/5xx) retry, cleared only on a definite rejection. `AGREEMENT_CONFLICT` is mapped to a plain sentence rather than shown raw.
- `publicController.ts` — `createSecureLinkPublicController(gateway, slug, id?)`. States: `loading`, `not-found` (404), `error`, `ready`, `identity-required`, `requesting-join-authority`, `join-authority-error`, `redirecting-to-join`. `requestJoinAuthority(signedIn)` only calls the backend when `signedIn` is true; on success it sets `window.location.hash = '#/invitation/{token}'` — the ONLY join mechanism, never reimplemented here. A replay with no fresh token fails closed rather than reusing a stale one.
- `view.ts` — `publicProductView(dto)`, a thin mapper. Amount is shown only when `dto.amountVisible`; the mapped object exposes exactly 8 bounded presentation fields, nothing else (no internal IDs).
- `SecureLinkExperience.tsx` — the public, no-auth `#/securelink/{slug}` page. Opening it is explicitly review-only ("Viewing this SecureLink does not join, confirm, accept, or pay anything," rendered on the page itself); "Join this Agreement" is the one legitimate continuation.
- `CreateSecureLinkPanel.tsx` — the explicit creation form (purpose summary + `publicAmountDisplay` toggle, defaulting OFF) → created (renders `ShareCard`) → uncertain (retry/cancel) phases.
- `ShareCard.tsx` — copy link, native share (feature-detected), WhatsApp, print — all against the exact server-issued `publicUrl`, disabled when it is `null` with an honest inline explanation. QR is deliberately not implemented (Section G).

**`src/RuntimeApp.tsx`** — new `useSecureLinkRoute()` hook parsing `#/securelink/{slug}` (the slug is the only identifier ever placed in this URL — never an Agreement id), wired to `SecureLinkExperience` just before the existing activation route branch.

**`src/features/agent/AgentExperience.tsx`** — passes `agreementGateway` through to `HandoffPanel` so the SecureLink continuation can reach `activateProduct`/`issuePublicLocator`.

## F. Authority boundaries preserved

- No Payment Ready, release eligibility, settlement, ledger balance, or funded-status calculation exists
  anywhere in this new code — all of it is either a pure state machine over backend responses, or a direct,
  unmodified call into `openMoneyFor()`.
- No new Join implementation — `publicController.requestJoinAuthority` only ever redirects into the
  existing `#/invitation/{token}` route.
- No client-supplied `productType` — the creation form's only inputs are `purposeSummary` and
  `publicAmountDisplay`.
- No client-reconstructed URL — `ShareCard` renders exactly `state.publicUrl` from the backend, including
  `null`.
- KS001's own scope (not touched this phase; no chat-based financial authority exists in this slice).

## G. SecureLink lifecycle covered vs. not covered this slice

Covered: creation (via the two-step flow) and public no-auth review. **Not covered:** any UI for rotation
or revocation — both backend endpoints already exist (`AgreementProductController#rotateLocator`/
`revokeLocator`) and are unmodified, but nothing in this slice's frontend calls them. Recorded as a known
limitation (Section K), not a doctrine gap — the missing surface withholds a capability rather than
fabricating one.

## H. Agreement→Money handoff verified

"Connect money now" is the only caller of `openMoneyFor` added this phase, and it passes only
`{ agreementId, title }` (with `versionLabel`/`currentVersionId` explicitly `null` — this slice does not
yet know the Agreement's current version at the handoff-progressed moment, so it honestly passes `null`
rather than guessing). Money's own resolution logic (unchanged) re-derives everything else. `READY` alone
still does not mean `FUND_AGREEMENT` — that decision remains entirely inside Money's own existing next-
action projection, never duplicated here.

## I. Financial commands enabled / withheld

**Enabled (frontend now invokes):** `activateProduct`, `issuePublicLocator` (both idempotent, non-financial
— they create a product/classification record and a locator, never money movement), `viewSecureLink`
(no-auth read), `requestSecureLinkJoinAuthority` (issues a join token, never joins), and the pre-existing
`openMoneyFor` handoff into Money's own already-approved read surfaces.

**Deliberately withheld (no frontend code calls these, and none was added this phase):** any fund/open-
funding, hosted confirmation, payment intent, quote, release create/reserve/execute, return/reversal, or
settlement-instruction command. These remain gated server-side by
`FinancialParticipantCommandEnvironmentGuard` (production-restricted) regardless of frontend wiring; this
phase does not attempt to surface them, tested or otherwise.

## J. Tests

24 new tests, `tests/securelink.test.mjs`:
- `createController` (8): success ordering (activate then issue), `publicAmountDisplay` default/explicit
  send, blank-purpose local rejection, uncertain→`'uncertain'`, retry reuses the same two idempotency keys,
  a definite rejection clears keys for the next attempt, `AGREEMENT_CONFLICT` mapped to an honest sentence,
  a `null` `publicUrl` surfaced as-is.
- `publicController` (6): `load()` reaches `'ready'` via only the no-auth read, 404→`'not-found'`,
  signed-out join request→`'identity-required'` without calling the gateway, signed-in join request
  redirects into `#/invitation/{token}`, opening alone never requests join authority, a token-less replay
  fails closed.
- `view.ts` (2): amount shown only when `amountVisible`; exactly the bounded field set is exposed.
- `ShareCard` (2): exact URL rendered / share actions disabled when `publicUrl` is `null`; no QR affordance
  is offered.
- Post-SET continuation (4): all three choices render and reaching `'progressed'` alone fires zero
  financial/SecureLink gateway calls; Money/SecureLink choices are withheld without an agreement id or
  gateway; "Save" never implies incompleteness.
- Route + wiring (2): the `#/securelink/{slug}` regex parses/rejects exactly as specified (decode, trailing
  slash tolerance, no extra segment, no empty slug), and `RuntimeApp`/`SecureLinkExperience` are wired
  review-first per source inspection (matching this codebase's own convention for effect-driven Experience
  components, which are not fully mounted in tests — see `tests/recipient.test.mjs`).

## K. Validation

- `node --test tests/*.test.mjs`: **1069/1069 passing** (was 1045 before this slice; zero regressions).
- `npx tsc --noEmit -p tsconfig.app.json`: clean, 0 errors.
- `npx eslint .`: 0 errors, 7 pre-existing warnings in unrelated files (unchanged from before this slice).
- `npm run build`: succeeds (`dist/` produced; pre-existing chunk-size warning only, unrelated to this
  slice's code).

## L. Security/privacy review

- `SecureLinkExperience` never mints, guesses, or stores an invitation token itself — the token comes only
  from `requestSecureLinkJoinAuthority`'s response and is used exactly once, immediately, to navigate.
- `publicProductView` exposes exactly 8 bounded fields; verified by test that no additional key (and
  therefore no internal identifier) is present on the mapped object.
- The `#/securelink/{slug}` URL never carries an Agreement id, identity id, or any other internal
  identifier — only the opaque slug the backend itself issued.

## M. Known limitations

- QR code generation is not implemented (see the backend report's UR-142 for the full reasoning).
- No rotate/revoke UI (Section G).
- No existing-product read-back before offering "Create SecureLink" again (see the backend report's
  UR-143) — a repeat attempt fails closed correctly, but with a plain retry/cancel choice rather than
  surfacing the Agreement's actual existing SecureLink.
- Desktop/375px/320px responsive verification for the new screens was done via review of the Tailwind
  utility classes used (`max-w-xl mx-auto`, `space-y-*`, no fixed pixel widths, matching patterns already
  visually verified elsewhere in this codebase) rather than an actual rendered-browser check at each width.
  No live backend is available in this environment to drive the authenticated flow through to these new
  screens end-to-end, so a real device/browser check did not occur and is not claimed to have occurred.
- `docs/PRODUCTION_MIGRATION_LEDGER.md` was reviewed and intentionally not updated this slice: it documents
  the original Bolt-export→production convergence audit and carries no per-feature update expectation; this
  slice introduces no new data model or schema surface on the frontend.

## N. Unresolved decisions

Tracked in the backend repo's `docs/operations/UNRESOLVED_ITEMS_REGISTER.md` as UR-141 (production
public-locator base URL), UR-142 (QR library), and UR-143 (existing-SecureLink read-back UX) — the
frontend repo does not maintain its own separate register.

## O. Phase 5 completion judgment (frontend, slice 1)

Delivers the mandate's core: three deliberate, non-automatic post-SET continuations, a new SecureLink
creation flow built on existing backend authority, and a review-first public SecureLink page that converges
into the existing Join core rather than duplicating it. No frontend financial authority was introduced. No
existing behavior regressed (1069/1069 passing, up from 1045). Phase 6 was not started.
**PR #42 remains DRAFT — do not merge, do not deploy.**

---

## P. Hardening Pass Addendum (Human Review & Hardening Pass, same day)

No frontend source changes this pass — the review's four priority areas (production locator URL config,
plaintext slug logging, repeat/existing-SecureLink behavior, real browser verification) were all backend or
verification-only concerns; see the SecurePayAPI Phase 5 report's own Hardening Pass Addendum for the full
UR-141/UR-143/UR-144 findings.

**Real browser verification against the live backend (new this pass, correcting Section M's earlier
statement that this environment lacked a usable backend):** started the actual `SecurepayCoreApplication`
against real local Postgres/Redis (a `docker compose`-managed stack was genuinely usable for this, contrary
to the earlier assumption — Testcontainers-specific integration tests remain the separately-blocked case)
and this app's own `npm run dev`, at desktop width (1440×900). Confirmed via real network capture (not
assumed): a genuine multi-turn KS001 Agent conversation persists correctly against the real backend;
`handoff`'s idempotent-retry recovery works correctly on a real transient failure; the `#/securelink/{slug}`
route calls the live `viewSecureLink` endpoint and correctly renders the "can't find this SecureLink" state
from a real `404` response, with no layout break at a reduced width (~606px CSS, confirmed via
`window.innerWidth` — see the honest limitation below).

**Not achieved, stated plainly:** reaching `HandoffPanel`'s real `'progressed'` phase live requires a second
real KS-Number-identified counterparty (the deterministic Agent's pre-existing `canReview` sufficiency gate
correctly refuses a free-text-only provider name) — creating a second live identity was judged beyond this
pass's reasonable scope, so the post-SET continuation UI (Connect money now / Create SecureLink / Save)
itself was not exercised live this round; the 24 unit tests in `tests/securelink.test.mjs` remain the
primary evidence for that surface. True 375px/320px viewports could not be forced below the browser
automation tool's own ~606px CSS-width floor on this system — confirmed via direct `window.innerWidth`
inspection, not assumed — so a genuine mobile-width check did not occur and is not claimed to have occurred.

**Cleanup:** the local dev server and `.env.local` created for this session were stopped/removed; no
frontend source file was modified.

**Merge-readiness:** unchanged from Section O — DRAFT, human review required. This addendum adds evidence
and honest limitations; it does not change the completion judgment.

---

## Q. Slice 2 Addendum — SecureLink Lifecycle & Sharing Completeness (same day)

Commit `64ab62a`. Backend companion: SecurePayAPI PR #231 commits `98d1383b`/`265ea64c` (Part A) and
`2a8a47e2` (Slice 2 read endpoint) — see that repo's own Phase 5 report for the full Part A/CI diagnosis.

**Existing-SecureLink handling.** New `manageController.ts` loads `gateway.activeLocator(agreementId)`
(the new backend existence-check endpoint) before ever offering the creation form again.
`SecureLinkManagePanel.tsx` renders "This Agreement already has an active SecureLink" with two deliberate
actions instead of blindly re-offering `CreateSecureLinkPanel`. `HandoffPanel.tsx`'s "Create SecureLink"
choice now routes through this panel.

**Replace/Revoke.** Both reuse the existing `rotatePublicLocator`/`revokePublicLocator` gateway calls
(already present from slice 1's backend work, newly wired into the frontend this round). Each requires an
explicit confirmation step naming the exact consequence before any mutation, and both follow the
established idempotent-retry idiom (one key per logical attempt, reused across an uncertain outcome, a
definite rejection re-loads real state rather than fabricating it).

**Sharing completeness.** `qrcode.react` added (confirmed zero new `npm audit` vulnerabilities — identical
count before/after). New `QrCode.tsx` renders an unbranded `QRCodeSVG` (level M) encoding the exact
`publicUrl`, wired into `ShareCard.tsx`. WhatsApp/native-share copy rewritten to "Review this SecurePay
Agreement: {title}."

**Drive-by fix.** `CreateSecureLinkPanel.tsx` and `SecureLinkExperience.tsx` were each missing the
`getServerSnapshot` argument to `useSyncExternalStore` — harmless in this app's real client-only runtime,
but it blocked any static/SSR-style render of these components (discovered because my own new tests needed
exactly that). Brought in line with `HandoffPanel.tsx`'s existing 3-argument convention.

**Tests.** 27 new: 22 in `tests/securelink-manage.test.mjs` (manage-controller load/replace/revoke/
idempotent-retry/definite-failure-reload paths, panel rendering per phase, explicit-confirmation copy
assertions), 5 in `tests/qr-roundtrip.test.mjs` (a genuine `qrcode`-encoder + `jsqr`-decoder round trip,
including one proving level M's error correction survives a small simulated obstruction — this verifies
the QR format/approach, not `qrcode.react`'s own SVG renderer directly, and is explicitly not a physical
camera scan). Full suite: **1096/1096 passing** (was 1069). `tsc --noEmit`, `eslint`, and the production
build are all clean.

**Real browser verification, continued.** Re-attempted the live E2E journey with fresh backend/frontend
instances (same local sandbox setup as the earlier addendum). Confirmed the earlier findings still hold
(multi-turn conversation, idempotent retry) and additionally confirmed the new `#/securelink/{slug}`
not-found path renders correctly at both **375px and 320px CSS viewport widths** — this time achieved via
a genuine, standards-based technique (a same-document `<iframe>` with an explicit CSS `width`, which
creates its own independent browsing-context viewport regardless of the outer window's own size) rather
than resizing the actual browser window, since this tool/OS combination has a demonstrated hard floor
around 606px CSS width on direct window resize (confirmed via `window.innerWidth`/`outerWidth` both
reading 606 immediately after a `resize_window(1440, 900)` call reported success). No horizontal scroll,
readable copy, and comfortable touch targets at both widths for the pages actually reached.

**Not achieved, stated plainly.** "Review this" (the gate before SET) remained disabled through every live
attempt this pass too, despite supplying product, counterparty, amount, fixed-price, completion-evidence,
and payment-timing details across two separate sessions. Code review of the backend's own
`AgreementSufficiencyEvaluator` (see the SecurePayAPI report) shows this should not depend on counterparty
resolution — the exact remaining condition was not isolated within this pass's time budget and is filed as
UR-145 in the backend repo's register rather than guessed at. Consequence: the authenticated post-SET
continuation, SecureLink creation, replace, revoke, and QR screens were **not** exercised live this pass
either; their evidence remains the 27 new unit/component tests above, not a live walkthrough.

**Merge-readiness:** unchanged — DRAFT, human review required. Both PRs remain DRAFT/OPEN. Do not merge, do
not deploy, do not start Phase 6.

## Slice 3 addendum — UR-145 root-cause + real SET-to-SecureLink golden journey attempt

**Root cause found and fixed.** A temporary, clearly-marked diagnostic (`console.log('[UR145]', ...)`,
fully removed before commit) capturing `conversationId`/`busy`/`pending`/`handoffState.phase` and the raw
`sufficiency` object was added to `AgentExperience.tsx` and exercised against a real local backend with a
real, freshly signed-up KS Number. Exact disabling predicate: `sufficiency.canReview` was `false` with
`mustResolve` containing one `NO_SCOPE` matter, even after a fully coherent conversation — because the
extracted WHAT fact was still a server-side **"Suggested"** candidate awaiting the person's own explicit
"Use this" confirmation. `busy`, `pending`, and `handoffState.phase` were all confirmed idle/ready
throughout, ruling out the other four candidate explanations the mandate asked to check. Clicking "Use
this" cleared `NO_SCOPE` immediately; `canReview` became `true`; "Review this" enabled and correctly
proceeded through sign-in, the canonical Agreement review, and SET to a genuine `progressed` post-SET
state. **This is a legitimate, doctrine-consistent gate (never auto-confirm an AI-suggested fact), not a
code defect** — reclassified accordingly rather than "fixed" as a bug.

**Fix.** `AgentExperience.tsx` now shows an inline hint using the backend's own `mustResolve[0].description`
verbatim, gated on the exact same `!busy && !pending && handoffState.phase === 'idle' && !canReview &&
mustResolve.length > 0` conditions as the button itself — never a second, drifting copy of the rule, and
never exposing internal codes/enums. The Review button's own disabling predicate is byte-for-byte unchanged
(no hard-coded `canReview=true`, no weakened gate).

**Regression test.** `tests/ur145-review-gate.test.mjs`, 4 new source-inspection cases (matching this
codebase's own `pr11-review-closure.test.mjs` convention for this large, integrated component): no
diagnostic trace remains; the hint uses the server's own description verbatim; the hint is gated on the
real, specific predicate; the button's disabling predicate is unchanged. Full suite: **1100/1100** (was
1096). `tsc --noEmit`, `eslint` (7 pre-existing warnings, unchanged), and the production build all remain
clean.

**Golden journey — achieved live, twice, with real signed-up KS Numbers:** Home → KS001 → coherent
multi-fact trade → "Use this" confirmation → "Review this" enabled → canonical Agreement review → sign-in
→ same review → explicit SET → genuine post-SET continuation showing the real Connect-money-now /
Create-SecureLink / Save choices, none executing automatically.

**Golden journey — not achieved live this pass, stated plainly rather than implied:** Save-path
no-side-effect confirmation, SecureLink creation, public review in a separate session, Join, confirmation,
existing-SecureLink management, Replace, Revoke, QR physical scan, Money handoff, and responsive
verification of any of those new screens. Blocked by two further real backend findings this slice
documents rather than works around:
- **UR-147 (backend, RESOLVED this slice):** the Agreement's own creator got a real `403` from the new
  active-locator endpoint — a genuine authorization-provisioning gap (a permission bundle seeded but never
  granted to the real baseline role), fixed by a migration in the backend repo. This would have blocked
  every real production user, not just this session.
- **UR-148 (backend/product, OPEN):** "Create SecureLink" from the post-SET continuation cannot succeed for
  a freshly-SET Agreement (backend requires a later status than a fresh draft ever has), and there is no
  persistent frontend entry point to reach it afterward. A genuine product/architecture ambiguity, documented
  rather than resolved unilaterally.
- **UR-149 (backend, OPEN, out of this slice's SecureLink scope):** a further real `403` on invitation
  revoke while trying to advance a counterparty to a joinable state, in the Phase 4 invitation domain —
  documented, not fixed, to respect this slice's own scope boundary.

Full detail (instrumentation, exact predicate, root cause, and the UR-147 fix itself) is in the backend
repo's `docs/operations/KS001_UPGRADE_PHASE5_SECURELINK_MONEY_PROGRESS.md` Slice 3 addendum and
`docs/operations/UNRESOLVED_ITEMS_REGISTER.md`.

**GitHub Actions (UR-146):** re-checked at the end of this slice; the same instant billing-condition failure
pattern persists. Remains OPEN/EXTERNAL — no workflow edits attempted.

**Merge-readiness:** unchanged — DRAFT, human review required. Both PRs remain DRAFT/OPEN. Do not merge, do
not deploy, do not start Phase 6.
