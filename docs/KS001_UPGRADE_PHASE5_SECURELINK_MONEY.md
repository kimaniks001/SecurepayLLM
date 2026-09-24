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
