# Phase 2 — Human Core

Branch `feat/final-phase2-securepay-human-core`, based on `origin/main` at
`f44a27f404546467a8d13c32c0f324461bc7a746` (includes merged Phase 1, PR #20).

This phase enriches the Human Core journey — Home → KS001 conversation → Trade Taking Shape →
UNDERSTOOD → authentication → Agreement → Agreement Detail → recipient — using the DNA established
in `docs/PHASE1_VISUAL_DNA.md` and `src/components/dna/`. It does not redefine that system.

## A. Archaeology

The Human Core was found to already be structurally sound and, in most places, already following
the target feel — the real gaps were narrower and more specific than a first read of the brief
suggested:

- **Home (`SignedOutHome`, locked)**: already exactly the target invitation — spacious, `.font-display`
  headline, quiet example prompts, restrained Activate CTA. No change made, per Section 5.
- **Hero yield (Section 6, "the most important behaviour")**: `AgentExperience.tsx`'s
  `showHome = home || (state.turns.length === 0 && !state.conversationId)` already fully implements
  this — the hero disappears the instant a turn exists, `ConversationWorkspace` (locked) takes over,
  the composer stays pinned. No change made; verified in fixture mode.
- **Trade Taking Shape (Sections 9/10)**: BUILD (conversation, `flex-[1.35]`) and UNDERSTOOD
  (`flex-[1]`, via the generic `ContextPanel`) already coexist side-by-side on desktop, already not a
  rigid 50/50 split, and mobile already uses a sticky BUILD|UNDERSTOOD tab pair with an unseen-content
  dot rather than squashing two columns. The one real gap: `TradeContext` (the "What SecurePay
  understands" disclosure) defaulted to **collapsed** and only auto-opened on an explicit "Review"
  action — so early in a conversation, understanding could be quietly accumulating fully hidden
  behind a closed accordion, the opposite of "the person should see understanding take shape."
- **UNDERSTOOD (Section 11)**: `UnderstoodTruthSections`' Confirmed/Still to decide/Found on
  SecurePay vocabulary already matches the brief's authority discipline exactly (documented in the
  component's own comments). No change needed.
- **"Use This" (Section 12)**: `TradeContext`'s adopt button and `AgreementPreviewCard` already use
  "Use this" / "Keep talking" / "Review what we have" language, never accept/join/agree. No change
  needed.
- **Authentication (Section 13)**: `HandoffPanel`/`RecipientExperience` already gate the
  `SecureAuthCard` behind an explicit "Continue with this" action, never on the first message — the
  *timing* was already correct. The *copy* was not: `secureAuthView` (used by both the handoff and
  recipient paths) said "Secure Identity required" / "Continuing requires verifying who you are,"
  which reads as a login wall rather than a threshold the person is *ready* to cross.
- **Agreement Cards (Sections 14–16)**: `AgreementCard.tsx` (locked) always showed "Amount:" first
  among the metadata, with the same visual weight whether a real figure existed or the value was the
  placeholder `'Not yet specified'` — directly against "Agreements are bigger than money... money
  only where materially relevant." It also rendered a bare `· —` after the counterparty's name
  whenever `counterpartyRole` was unavailable (the real backend, per this file's own comment, never
  supplies a role for the counterparty), a small polish gap.
- **Agreement status (Section 17)**: `AgreementStatusBadge`'s `cancelled` state used raw Tailwind
  `red-*`, bypassing this project's own `ember` token family — the same class of drift Phase 1 fixed
  for orange. `AgreementDetail`'s inline Cancelled banner (desktop and mobile copies) used the same
  raw red.
- **Agreement Detail / Overview (Sections 18–20)**: `AgreementOverview` was a flat, equally-weighted
  label/value list (What/Who/Money/Materials/When/Conditions) with no leading sense of "current
  reality" or "what happens next" — exactly the "PDF contract rendered as a webpage" feeling Section
  18 warns against — even though the authoritative next-action data (`progress.actions`, already
  fetched for the separate Progress tab) was sitting one prop away. The tab bar itself (10 tabs
  desktop / 8 mobile pills) was left as-is: it shows one section at a time rather than a grid of
  equally-weighted boxes, so it does not match the specific anti-pattern Section 20 names, and
  restructuring it further was judged out of scope for this pass (see Drift report).
- **Recipient Experience (Sections 21–24)**: `RecipientExperience.tsx`'s page shell was a bare centred
  card with no SecurePay brand mark at all — every other standalone page in the product
  (`MoneyExperience`, `HostedMoneySessionExperience`, `ActivationExperience`) already carries the
  wordmark; the recipient page was the one exception. `RecipientReviewCard` (locked, byte-identical
  tested) already correctly shows "who invited you," role, and terms, and already keeps
  view/join/review/confirm as distinct phases (`RecipientExperience.tsx`'s own phase machine). The
  card's field labels (Labour/Materials, via hardcoded icons) assume a labour-type Agreement and don't
  yet generalize to "Agreements are bigger than money" — flagged as deferred, not fixed here (see
  Drift report), since generalizing it touches a locked, tested component's semantics, not just its
  surface, and the recipient's *first* invitation view was judged the more valuable, lower-risk target
  for this pass.

## B. Experience changes

1. **Trade Context settles into view on its own.** `AgentExperience.tsx` now watches for the first
   fact to appear in Trade Context and opens the "What SecurePay understands" disclosure
   automatically (`useEffect` on a `hasFacts` boolean) — the person no longer has to discover and
   click a collapsed accordion to see that SecurePay has started understanding something. A manual
   collapse afterwards is respected; it only forces the panel open on the 0 → first-fact transition.
2. **Authentication reads as a threshold, not a wall.** `secureAuthView`'s credential-phase copy
   changed from "Secure Identity required" / "Continuing requires verifying who you are" to "You are
   ready to set this securely" / "Verifying who you are keeps this secure." The authority-preserving
   substance — identity only, never join/confirm/accept — is unchanged and, if anything, stated more
   explicitly ("does not join, confirm, or accept any Agreement on its own").
3. **Agreement cards lead with the relationship, not the invoice.** `AgreementCard.tsx`: Amount moved
   to the end of the metadata row (after Complete-by/Location) and rendered in quiet `sand-400` text
   when its value is the `'Not yet specified'` placeholder, rather than the same bold treatment as a
   real figure. The counterparty line no longer shows a bare `· —` when the backend has no role to
   report.
4. **Agreement Detail leads with "what happens next."** `AgreementOverview.tsx` now accepts the same
   already-fetched `actions` the Progress tab uses and surfaces the single most urgent one
   (`overdue` > `needs_you` > `waiting_on_other` > `upcoming`, first match wins) in a `StatusNotice` at
   the very top of Overview, above "What" — real backend truth, repositioned, never re-derived or
   invented. The Money field is shown quietly (`sand-500`, no bold) when its value is
   `'Not yet specified'` instead of receiving the same weight as a set price.
5. **Recipient invitations carry the SecurePay mark.** `RecipientExperience.tsx`'s page shell now
   shows the SecurePay wordmark above the invitation/review/join/confirm card, matching every other
   standalone page in the product.

## C. Visual changes (Phase 1 DNA in use)

- `AgreementStatusBadge`'s `cancelled` state and `AgreementDetail`'s Cancelled banner (both desktop
  and mobile copies) moved off raw Tailwind `red-*` onto the `ember` token family and, for the banner,
  the Phase 1 `StatusNotice` primitive (`tone="error"`) — the same fix class Phase 1 already applied
  to orange elsewhere in the product, extended here to red.
- The "What SecurePay understands" disclosure label now uses `.font-display` (Fraunces) instead of
  plain Inter, the Section 26 "small amount of typographic personality on an important heading" —
  applied narrowly to one own-markup label, not the shared, widely-reused `ContextPanel` title (left
  alone; see Drift report).
- Newly-appearing Trade Context facts now use the existing, previously-unused `animate-fact-settle`
  keyframe (defined in `tailwind.config.js` since Phase 1's archaeology, never actually applied
  anywhere) — an authentic use of "when a person answers, the relevant understanding may visibly
  settle into place" (Section 10), with no new motion invented.
- All new/changed banners and next-action surfaces use the Phase 1 `StatusNotice`/`Surface` primitives
  rather than hand-rolled class strings, keeping this enrichment on the same DNA Phase 1 formalized.

## D. Authority confirmation

- **Intent still precedes authentication.** No change touched the gating logic in `HandoffPanel.tsx`
  or `RecipientExperience.tsx`; `SecureAuthCard` still only appears at `identity-required`, reached
  only via an explicit "Continue with this" / join-then-confirm step, never on the first message.
- **"Use This" is not agreement.** `TradeContext.tsx`'s adopt button and its wiring to
  `controller.adopt()` were not touched; the button still reads "Use this" and only promotes a
  candidate fact into Trade Context, never an Agreement.
- **Join is not acceptance.** `RecipientExperience.tsx`'s phase machine (`join-prompt` → `joining` →
  `version-ready`/`confirming` → `confirmed`) is unchanged; only the page shell around it (brand mark)
  and the shared `secureAuthView` copy changed.
- **Review is not confirmation.** `AgreementDetail.tsx`'s "Ask" bar and `AgentUnderstoodCard` wiring
  are unchanged; asking a question about an Agreement still never submits or confirms anything.
- **Exact Agreement version authority remains intact.** `recipient/controller.ts`,
  `exactVersionView`, and `CanonicalAgreementCard`'s `confirm_acceptance` wiring were not touched.
- **Backend completion remains authoritative.** The new "Next" block in `AgreementOverview.tsx` reads
  `progress.actions` — the same backend-sourced array the existing Progress tab already renders —
  and picks among real `ActionStatus` values (`overdue`/`needs_you`/`waiting_on_other`/`upcoming`); it
  invents no new status, infers no completion, and renders nothing when no such action exists.

## E. Desktop verification

Verified in the browser (fixture mode, `VITE_SECUREPAY_MODE=fixture`, since no live SecurePayAPI
backend is available in this environment — see Drift report for what this does and doesn't cover):

- Resting Home: unchanged, as intended.
- Agreements Hub: Amount now renders last in each card's metadata row; status badges (including the
  now-`ember` Cancelled) render correctly across Change requested / Waiting for you / Active /
  Cancelled agreements.
- Agreement Detail (Overview tab): the new "Next: …" block renders at the top for an agreement with
  an active action (`ember`/warning tone), and does not render at all for a closed/cancelled
  agreement with none. The Cancelled banner renders in the `ember` tone via `StatusNotice`, replacing
  the old red.
- Tab bar, Money/Progress/Support tabs: unaffected, render as before.

## F. Mobile verification

Verified at a 340×760 viewport (below the `md:` breakpoint) in the same fixture-mode session:

- Agreements Hub cards: same reordered metadata row, no wrapping/overflow regressions.
- Agreement Detail: mobile's pill section-selector + single-column layout renders the same "Next: …"
  block and the same `ember`-toned Cancelled banner as desktop, confirming both duplicated call sites
  (desktop tab body and mobile section body) were updated consistently.
- Bottom navigation, Home, and the mobile section pills were unaffected by this phase's changes.

**Not visually verified in this pass** (no live SecurePayAPI backend available in this environment,
and these files are real-mode-only — not reachable through the Bolt fixture): the Trade Context
auto-expand behaviour (`AgentExperience.tsx`/`TradeContext.tsx`), the reworded `SecureAuthCard` copy
(`identity/view.ts`), and the Recipient Experience brand-mark header. Each was verified by direct
source reading, by the fact that `SecureAuthCard`'s own layout is otherwise unchanged and already
DNA-compliant (Phase 1 archaeology), and by the unchanged, still-passing automated suite (including
the fixture-parity checks that would fail if a locked component's rendering had regressed). This is
disclosed rather than claimed as visually confirmed.

## G. Tests

Baseline (before any change in this phase, this worktree, before touching files):
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `node --test tests/*.mjs` — 351 passed, 4 failed (pre-existing, unrelated: `pr11-review-closure`
  ×1, `referrals-plugs-masters` J/K/AF2 — confirmed identical to Phase 1's own recorded baseline).
- `npm run build` — succeeds.

After this phase's changes (same commands, same worktree):
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `node --test tests/*.mjs` — 351 passed, the same 4 pre-existing failures, byte-for-byte the same
  failing test names. In particular, `tests/signed-in.test.mjs`'s
  `touched Home/Hub locked components retain byte-identical fixture markup against Bolt` test (which
  covers `AgreementCard.tsx`, among others) still **passes unmodified** — the test's own fixture data
  happens to use a real `counterpartyRole` ('Provider') and a real `amount` ('KES 1,000.00'), so it
  never exercises the two new conditional branches (unavailable role, unset amount) added in this
  phase. No fixture-parity test needed updating for any change in this phase.
- `npm run build` — succeeds, same warnings as baseline (pre-existing chunk-size warning, unrelated).

No test was removed, skipped, or weakened. No behavioural/authority test was touched.

## H. Drift / deferred items

- **`AgreementDetail`'s 10-tab (desktop) / 8-pill (mobile) navigation** was not restructured into a
  "current reality → next thing → supporting detail" single flow as Section 20 envisions in the
  abstract — it already avoids the specific anti-pattern named there (a grid of equally-weighted
  boxes shown all at once), and the new "Next" block now gives Overview itself that hierarchy, but a
  deeper rethink of whether ten peer-level tabs is the right information architecture for the whole
  page is a larger product decision than this pass's scope, deferred to a future Agreement Detail
  phase.
- **`RecipientReviewCard`'s hardcoded Labour/Materials/Complete fields** (locked, byte-identical
  tested) assume a labour-type Agreement and don't yet generalize to purchase/service/contribution/
  other Agreement shapes per Section 14. Generalizing it changes a locked component's semantics, not
  just its surface — deferred, along with updating its fixture test, to whichever phase does that
  broader "Agreements are bigger than money" pass across recipient-facing surfaces.
- **`ContextPanel.tsx`'s generic panel-title styling** was left alone rather than given the same
  `.font-display` touch as `TradeContext`'s own label, since `ContextPanel` is a single, widely-shared,
  fixture-parity-tested component spanning many unrelated panel modes (providers, quotes, money
  handoff, etc.) — a title-styling change there has a much larger blast radius than this phase's scope
  justified for a small typographic touch.
- **`ActivationExperience.tsx`'s raw-orange usage** (documented as deferred in Phase 1's own drift
  report) remains untouched; still a candidate for a future Activation-focused pass.
- **Source provenance for future Store/Community/Circle/referral origins (Section 24)** was not built
  out further this phase — `TradeContext.tsx`'s existing "Started from…" block (added in an earlier
  phase) already provides the dignified, non-authority-bearing provenance treatment the brief asks
  for; no new source types exist yet to test it against.
- **Money enrichment** was explicitly out of scope per Section 31 and untouched beyond the
  presentational de-emphasis of an unset amount already covered above.

## I. Git

- Branch: `feat/final-phase2-securepay-human-core`
- Starting SHA: `f44a27f404546467a8d13c32c0f324461bc7a746` (`origin/main`, includes merged Phase 1
  PR #20)
- Files changed: `src/components/AgreementCard.tsx`, `src/components/AgreementDetail.tsx`,
  `src/components/AgreementOverview.tsx`, `src/components/AgreementStatusBadge.tsx`,
  `src/features/agent/AgentExperience.tsx`, `src/features/agent/TradeContext.tsx`,
  `src/features/identity/view.ts`, `src/features/recipient/RecipientExperience.tsx`, plus this
  document.
- Tests: see Test report (G) above.
- PR: opened as draft/open, unmerged — programme controller performs final review and merge.
