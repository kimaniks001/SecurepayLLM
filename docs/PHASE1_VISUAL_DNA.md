# Phase 1 — Production Visual DNA

Branch `feat/final-phase1-securepay-visual-dna`, based on `origin/main` at `46c89ac2491be5ae1a68253348888997e9ed5251`.

This phase does not redesign any product area. It formalizes the visual/interaction DNA that
already governs the frozen Bolt experience (`bolt-reference-pass11`) and the production components
built on it, extracts the small number of places where real production "own markup" (chrome that is
not part of any locked Bolt component) had drifted from that DNA, and demonstrates the result on the
four required proof surfaces.

## A. Archaeology report

**1. Design tokens** (`tailwind.config.js`). Already mature and already the DNA's real source of
truth: color families `cream` (warm light neutral surfaces), `forest` (dark green, dignity/authority,
primary text/accent), `ember` (orange, sparing accent), `sand` (muted secondary text); fonts
`Fraunces` (display/serif, variable optical size) and `Inter` (body); a named, restrained shadow
scale (`soft`, `card`, `lifted`, `inset-soft`, `deliberate`); a calm, non-gamified animation
vocabulary (`fade-in`, `fade-in-up`, `fade-in-down`, `slide-in-right`, `pulse-soft`, `breathe`,
`breathe-soft`, `shimmer`, `thinking`, `settle`, `gentle-pulse`, `fact-settle`, `reveal-stagger`,
`quiet-in`).

**2. Typography.** `.font-display` (`src/index.css`) applies Fraunces with the `ss01` stylistic set —
the mechanism for "a small amount of typographic personality" the brief asks for, already used
correctly and only on headings (page titles, section titles, hero headline), never on body text.
Body text runs on Inter with `cv02/cv03/cv04/cv11` character variants for readability. This hierarchy
was already consistent everywhere read during this phase; no new type scale was needed.

**3. Surface treatments.** The dominant card/panel shape across the whole product, both inside locked
Bolt components and in real production "own markup," is `rounded-2xl border border-cream-200 bg-white
shadow-card`, with a `bg-cream-50` header strip for a titled surface. This was independently
re-derived at least three times in non-locked code (`ConversationWorkspace`'s rich-response fallback,
`AgentExperience`'s equivalent fallback, `MoneyExperience`'s local `SectionCard`) before this phase —
now formalized once as `Surface`/`SurfaceHeader`/`SurfaceBody` (`src/components/dna/Surface.tsx`).

**4. Buttons.** Three treatments recur near-identically wherever production code writes its own
button markup (not inside a locked component): a solid `bg-forest-700` primary, a `border-forest-200`
outline secondary, and an underlined `text-sand-600` ghost/text action. Formalized as
`Button` (`src/components/dna/Button.tsx`, `variant: 'primary' | 'secondary' | 'ghost'`).

**5. Cards/panels.** Locked Bolt components (`AgreementCard`, `ProviderCard`, message bubbles, etc.)
already apply the surface language correctly and consistently; no drift found there.

**6. Navigation.** `NavBar.tsx` (locked) already provides first-class desktop (top bar) and mobile
(bottom bar) navigation on the same `cream`/`forest`/`sand` tokens, with `isActive` grouping several
`AppView` values under one nav item (e.g. `agreements` covers hub, detail and builder). No drift.

**7. Status treatments.** This was the clearest real drift. Several production "own markup" files —
none of them locked Bolt components — had each hand-rolled the identical
`rounded-xl border border-orange-200 bg-orange-50 ... <AlertTriangle/>` notice banner, using raw
Tailwind `orange-*` instead of this project's own `ember` design token: `MoneyExperience.tsx`,
`MoneyOperationsExperience.tsx`, `HostedMoneySessionExperience.tsx` (one instance each), and
`AgentExperience.tsx` (two ad-hoc alert `<div>`s with a *different* neutral treatment for the same
kind of message). `ActivationExperience.tsx` has the same raw-orange pattern nine times over, plus
raw-orange used for primary-CTA emphasis (not just notices) — left untouched this phase, see
Drift report.

**8. Forms.** Inputs (`rounded-xl border border-cream-200 px-3 py-2 text-sm`) are consistent
wherever seen; no dedicated `Input` primitive existed or was built this phase — the pattern is a
single class string, low duplication risk, deferred rather than abstracted for its own sake.

**9. Conversation components.** `ConversationInput`, `MessageBubble`, `ConversationWorkspace`,
`AgentIcon` (all locked) already embody the brief almost exactly: user bubbles in solid `forest-700`,
agent bubbles in white-on-`cream-200`-border with `AgentIcon` alongside, `animate-quiet-in` /
`animate-reveal-stagger` for calm entrance, no gamified motion anywhere.

**10. Responsive behaviour.** `NavBar` (top bar desktop / bottom bar mobile), `ConversationWorkspace`
(rich response cards collapse to `md:hidden` inline variants on mobile, `UnderstandingDrawer` mobile-
only), and `MoneyExperience`/`WorkspaceExperience` (single-column, `max-w-2xl mx-auto`) were already
desktop-and-mobile first-class. No responsive rework was needed for the proof surfaces.

**11. Duplicated visual implementations.** Two concrete instances found and fixed this phase:
(a) the orange notice banner described in point 7; (b) `src/index.css` manually redefined every
`@keyframes` and `.animate-*` utility that `tailwind.config.js`'s own `animation`/`keyframes` theme
extension already generates — same values, two sources of truth. Removed the manual duplicate from
`index.css`; `tailwind.config.js` is now the single source for motion. Verified via `npm run build`
that the generated utilities (e.g. `animate-breathe-soft`) are unaffected.

**12. Drift from the approved DNA.** See the Drift report (E) below.

## B. SecurePay DNA specification

This section documents the DNA as implemented — most of it pre-existed and is being formalized here
for the first time, not invented.

- **Typography hierarchy:** hero/major moment and page/section titles use `.font-display` (Fraunces,
  `ss01`) in `text-forest-800`; everything else (body, labels, metadata, buttons) uses Inter. Money
  values get their own step (`MoneyValue`, below) rather than borrowing the heading font.
- **Colour:** `cream` for large surfaces and backgrounds, `forest` for text/authority/primary actions,
  `ember` for warning/attention only (never for large surface fills), `sand` for secondary/quiet text.
  Raw Tailwind palette colours (`orange-*`, etc.) must never be used directly — always via the
  project's own token family, so a single edit to `tailwind.config.js` can retune the whole product.
- **Surfaces:** `Surface` / `SurfaceHeader` / `SurfaceBody` — `rounded-2xl border-cream-200 bg-white
  shadow-card`, optional `cream-50` header strip. This is the one card shape for new production chrome.
- **Buttons:** `Button` with `primary` (solid forest fill), `secondary` (forest outline), `ghost`
  (underlined text) — no other button treatment for new chrome.
- **Status:** `StatusNotice` with `warning` | `error` | `success` | `info` tones, each on the real
  `ember`/`ember`/`forest`/`cream` token families; `role="alert"` for warning/error, `role="status"`
  otherwise, so assistive tech gets the correct urgency without any caller having to remember it.
- **Money values:** `MoneyValue` — tabular-nums, presentational only (takes an already-formatted
  string, computes nothing, carries no authority), three size steps (`sm`/`md`/`lg`) so a headline
  total can read larger than a supporting line without a bespoke class string each time.
- **Page headers:** `PageHeader` — `font-display text-2xl` title + `text-sm text-sand-600`
  description, the pattern `MoneyExperience` and `MoneyOperationsExperience` each wrote by hand.
- **Motion:** the existing `tailwind.config.js` vocabulary is complete for this phase's needs
  (`quiet-in`, `reveal-stagger`, `fade-in-up` for entrances; `breathe-soft`/`thinking`/`settle` for
  `AgentIcon` state). No new keyframes were needed or added.
- **KS001 presence:** `AgentIcon` (locked) already varies by `AgentState`
  (`resting`/`listening`/`thinking`/`understood`/`finding`/`needs_you`) with restrained
  breathing/pulsing tied to state, never a mascot. Resting Home gives KS001's invitation the full
  hero treatment (`SignedOutHome`); the instant a turn exists, the hero is gone and `AgentIcon`
  shrinks to a 32px inline presence beside each agent message (`MessageBubble`) — exactly the
  person → conversation → SecurePay hierarchy the brief asks for. This is an existing, correct
  implementation, not new work.
- **Responsive rules:** top nav / bottom nav split by `NavBar`; rich conversation response cards
  collapse to an inline `md:hidden` mobile variant while keeping a fuller desktop layout; workspace
  content is single-column (`max-w-2xl mx-auto`) at all sizes rather than a dashboard grid. Existing
  pattern, reused rather than reinvented.

## C. Shared production implementation

New files, `src/components/dna/`:

- `Surface.tsx` — `Surface`, `SurfaceHeader`, `SurfaceBody`
- `Button.tsx` — `Button` (`variant: primary | secondary | ghost`)
- `StatusNotice.tsx` — `StatusNotice` (`tone: warning | error | success | info`)
- `PageHeader.tsx` — `PageHeader`
- `MoneyValue.tsx` — `MoneyValue` (`size: sm | md | lg`)

None of these touch, wrap, or reimplement any locked Bolt-fixture component. They exist only for
production "own markup" — chrome that was never part of the frozen Bolt export.

Wired into (all pure markup/class-string substitutions — no text, condition, gateway call, or
authority check changed):

- `src/features/money/MoneyExperience.tsx` — `SectionCard`/`ErrorBanner` now delegate to
  `Surface`/`StatusNotice`; the page title uses `PageHeader`; every money amount in
  `AgreementMoneySection`/`AgreementMoneyPositionCard` (protected / ready to progress / still
  protected / progressed / returned totals) now renders through `MoneyValue`; the section's own
  buttons (`Show my Agreements`, `Protect this money`, `Add money`, `Progress to …`, `Release unused
  money`, `Get a shareable link`, `Refresh`, `What happened`, the two "choose a different …" links)
  now render through `Button`.
- `src/features/money/MoneyOperationsExperience.tsx` — orange banner → `StatusNotice`; title block →
  `PageHeader`.
- `src/features/money/HostedMoneySessionExperience.tsx` — orange banner → `StatusNotice`.
- `src/features/agent/AgentExperience.tsx` — the two ad-hoc alert `<div>`s (`offerSelectionFailure`,
  `state.error`) → `StatusNotice tone="warning"`, retry/continue controls preserved unchanged.
- `src/index.css` — removed the manually duplicated `@keyframes`/`.animate-*` block; `tailwind.config.js`
  is now the sole source for motion utilities.

Left deliberately untouched: `src/features/activation/ActivationExperience.tsx`'s own raw-orange
usage (see Drift report) and every `src/components/*.tsx` Bolt-fixture component.

## D. Proof surfaces

All four surfaces were read and verified in their real production form (`RuntimeApp` → real gateways,
not `App.tsx` fixture mode), desktop and mobile (`NavBar`'s own top/bottom split, `ConversationWorkspace`'s
`md:hidden` rich-response variants):

1. **Signed-out Home / beginning of KS001 conversation** — `SignedOutHome` (locked), reached before
   any turn exists. Already on-DNA: hero lockup, `.font-display` headline, `ConversationInput`,
   example prompts on `cream-100`/`sand-600`, Activate CTA on `forest-50`/`forest-200`. No changes
   needed or made.
2. **Active conversation** — `AgentExperience` renders `ConversationWorkspace` (locked) the instant
   `state.turns.length > 0`; the hero is fully gone, the transcript is the primary object, the
   composer stays pinned at the bottom. The two own-markup error notices in this file now use
   `StatusNotice` (previously two different ad-hoc treatments for the same kind of message).
3. **Agreements** — `WorkspaceExperience` → `AgreementHub`/`AgreementDetail` (both locked, described
   in-repo as "locked Bolt components" wired to real backend truth). No changes made; already on-DNA.
4. **Money** — `WorkspaceExperience` → `MoneyWorkspace` (locked, for a specific Agreement) and the
   standalone `#/money` route, `MoneyExperience` (real production, not a locked component). This is
   where the actual Phase 1 work landed: `Surface`/`StatusNotice`/`PageHeader`/`MoneyValue`/`Button`
   now govern this screen's own markup instead of five independently hand-rolled versions of the
   same patterns.

## E. Drift report (deferred, not fixed this phase)

- `src/features/activation/ActivationExperience.tsx` — nine raw `orange-200`/`orange-50` instances
  (error banners, a primary confirmation section, a primary CTA button, a section label, a plan-card
  call-to-action). The plain error-banner instances match the `StatusNotice` pattern exactly and could
  be swapped mechanically; the CTA/section instances are a real design decision (should Activation's
  own emphasis colour become `ember`, or is orange-as-CTA intentional and should become a *named*
  token instead of raw Tailwind orange?) that belongs to whoever owns Activation's next enrichment
  pass, not to this phase.
- `MoneyExperience.tsx`'s `SettlementDestinationSection` and financial-partner list (below the
  `AgreementMoneySection` this phase touched) still hand-roll their own buttons and surfaces; not
  touched, since they are not the primary content of the required Money proof surface.
- No dedicated `Input` primitive exists yet; the current single-class-string pattern
  (`rounded-xl border border-cream-200 px-3 py-2 text-sm`) is consistent everywhere it appears, so
  this is a low-priority, not-yet-necessary abstraction.
- No dedicated `EmptyState` primitive was built; the existing locked `AgreementEmptyState.tsx`
  already establishes that pattern (icon + heading + supporting line + primary action) for Agreements,
  and no second, non-Agreements empty state was found needing one this phase.

## F. Test report

Baseline (before any change in this phase, clean `origin/main` checkout):
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `node --test tests/*.mjs` — 351 passed, 4 failed. The 4 failures are pre-existing and unrelated to
  this work (confirmed against a clean checkout): `pr11-review-closure.test.mjs` (1: stale regex
  against `MasterExperience.tsx` source) and `referrals-plugs-masters.test.mjs` (3: tests J, K, AF2).
- `npm run build` — succeeds.

After this phase's changes (same commands, same worktree):
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `node --test tests/*.mjs` — same 351 passed / same 4 pre-existing failures, byte-for-byte the same
  failing test names as baseline. No fixture-parity test was touched or broken.
- `npm run build` — succeeds (`dist/assets/index-*.css` shrank slightly, from the `index.css`
  dedup; no other change).

No test was removed, skipped, or weakened. No new automated test was added because no new behaviour
was introduced — every change in this phase is a like-for-like visual/structural substitution.

## G. Git report

- Branch: `feat/final-phase1-securepay-visual-dna`
- Starting SHA: `46c89ac2491be5ae1a68253348888997e9ed5251` (`origin/main`, includes merged PR #19
  Phase 5B Vision Board)
- Files changed: see commit; summary — 4 new files under `src/components/dna/`, 4 modified feature
  files (`MoneyExperience.tsx`, `MoneyOperationsExperience.tsx`, `HostedMoneySessionExperience.tsx`,
  `AgentExperience.tsx`), `src/index.css` deduped, this document added.
- Tests: see Test report (F) above.
- PR: opened as draft/open, unmerged — programme controller performs final review and merge.
