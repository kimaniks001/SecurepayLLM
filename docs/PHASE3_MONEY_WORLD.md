# Phase 3 — Money World

Branch `feat/final-phase3-securepay-money-world`, based on `origin/main` at
`07f24d84bc4cc23f4ac8fcdb7b852429ad5285e1` (includes merged Phase 1 + Phase 2).

Governing idea: **money should follow the Agreement.** This phase enriches the real production
Money experience using the Phase 1 DNA and the Phase 2 Human Core conventions, without redefining
either and without inventing any financial doctrine or authority the backend does not already grant.

## A. Money archaeology

**Real, production-backed, customer-facing** (all in `src/features/money/`, wired into `RuntimeApp`'s
`#/money` route, all reachable only with a real signed-in session and a real backend — nothing here
is fixture data):
- `MoneyExperience.tsx` — the Money page itself: an Agreement Money section (per-Agreement funded-
  authority positions), currency capability, FX conversion, Business currency/FX, settlement
  destination, and financial-partner discovery, each an independently-loaded section.
- `PaymentIntentFunding.tsx` — the real rail-discovery → quote → initiate → poll → terminal-state
  funding flow, Agreement-scoped, never rail-hardcoded (an unavailable/uncertified rail simply never
  appears in `fundingOptions`).
- `AgreementCurrencyActivationPrompt.tsx`, `CurrencyCapabilitySection.tsx`,
  `FxConversionSection.tsx` — currency/FX self-service, all real, all provider-neutral.
- `BusinessCurrencyCapabilitySection.tsx`, `BusinessFxConversionSection.tsx` — the same shape,
  scoped to an authorized Business actor's own KS Number, already correctly separated from personal
  currency/FX (Section 20 was already satisfied before this phase).
- `HostedMoneySessionExperience.tsx` + `embedContract.ts` — the hosted/embeddable Money surface. This
  was already excellent: correct whose-experience/what/amount/purpose/action/authority disclosure,
  and a real, secure embed contract (origin verified against a backend-registered allow-list via
  `document.referrer`, `postMessage` only ever to that verified origin, never a wildcard).
- `MoneyOperationsExperience.tsx` — a genuinely distinct, read-only support/ops surface
  (Choice-connector status, all regulated partners, open exceptions, pending reconciliation/recovery)
  gated server-side by `REGULATED_PARTNER_READ`. Confirmed this is **not** a personal money
  aggregate — a platform-wide operational view, correctly kept separate from customer Money Home.

**No fixture/reference Money experience exists.** `src/App.tsx` (the Bolt fixture) has no Money
screens at all — Money was built directly against real contracts from the start. This means Money
World's visual verification could not use the fixture-mode technique Phases 1-2 relied on (see
Desktop/Mobile verification, K/L below).

**Duplicated/confusing on first read, resolved by archaeology, not code** (see Section C): funding
appeared to have two competing "add money" mechanisms — `PaymentIntentFundingSection` (rail-based,
Agreement-scoped) and `AgreementMoneyPositionCard`'s manual "Add money" amount field
(obligation-scoped `fund()`). Reading `money-authority`'s and `payment-intent`'s own gateway
comments and the `money-experience.test.mjs` programme-controller correction note clarified these
are **not duplicates** — they operate at different scopes (bring money into the Agreement, vs.
allocate already-available money to one specific position) — but the UI never explained that
relationship, so a person could reasonably read it as two ways to do the same thing.

**No aggregate "all my money" endpoint exists anywhere in the contract surface.** Every money read
is either Agreement-scoped (`money-authority.list(agreementId)`, `payment-intent.*(agreementId)`) or
platform-wide/ops-scoped (`money-operations.summary()`, not personal). `CurrentUserAgreementSummaryResponse`
(from `agreementGateway.currentUserAgreements()`, already fetched by the existing Agreement picker)
does carry `proposedAmountMinor`/`currency`/`attentionRequired`/`nextActions` per Agreement, which is
enough to build a real, honest "what do I have" overview without any new endpoint or any N+1 fan-out
(see Money mental model, B, and Deferred gaps, N).

**Operational/support-only vs. customer-facing**: `MoneyOperationsExperience.tsx` is operational;
everything else in `src/features/money/` is customer-facing.

**Missing as an experience despite backend capability existing**: a genuine Money Home overview
(Section 4) — the page previously opened directly into "click Show my Agreements," with every other
section also gated behind its own manual "Show ___" button, answering none of the four Money Home
questions until several clicks in. A Financial Partner Hall worth the name — the data
(`RegulatedPartnerResponse.capabilities[]`: capability, enabled, currency, min/max, fee description)
was already real and available, just rendered as a flat pill list with no eligibility/limit/fee
detail. An honest "no live rate" disclosure on the FX screens — `FxApplicationResponse` carries no
rate/fee field at all (confirmed in the dto and locked by `currency-fx.test.mjs`'s own
`doesNotMatch(fxDto, /exchangeRate|settledAmount|rateApplied/i)`), and the UI said nothing about why.

## B. Money mental model

The experience now explains money as: **a Person/Business KSNumber has financial capability → money
enters for a purpose (an Agreement) → the Agreement provides context and authority → conditions
determine progression → money settles only where authorised.** Concretely:

- Opening Money now leads with **Money Home** (new `MoneyHomeOverview`): "What you have" (proposed
  amounts grouped by currency, straight off each Agreement's own summary — never mixed across
  currencies) and "Needs your attention" (the backend's own `attentionRequired` flag and its own
  next-action reason text, filtered to money-bearing Agreements). This is presented as
  Agreement-shaped totals, never an anonymous balance.
- The existing "Agreement Money" section is unchanged in its authority and now explicitly explains
  the two-step funding relationship: bring money in (a real payment rail, Agreement-scoped), then
  protect/progress a specific amount against a specific position (obligation-scoped) — worded once,
  in place, so it never reads as two competing mechanisms.
- Settlement is now framed as **"Where your money goes"** rather than a generic "Settlement
  destination" heading, with the same self-service register/replace/verify authority untouched.
- The Financial Partner Hall presents partner capability with real eligibility/limit/fee facts,
  clearly separated from SecurePay's own framing text ("This is information, not a recommendation").
- FX honestly discloses that no rate is shown before an application is submitted, rather than
  silently omitting any explanation.

## C. Customer experience changes

1. **Money Home** (`MoneyHomeOverview`, new, in `MoneyExperience.tsx`): eagerly loads
   `currentUserAgreements()` (the same call the Agreement picker already makes — no new endpoint) and
   shows, above everything else: a per-currency total of proposed amounts across Agreements, and a
   "Needs your attention" list. Clicking a "Needs your attention" item jumps straight into that exact
   Agreement's own Agreement Money position (new `initialAgreement` prop on `AgreementMoneySection`,
   consumed by a `useEffect` that calls the existing `selectAgreement`) instead of making the person
   re-find it in the picker (Section 11).
2. **The funding relationship is explained once, in place**: a short line between
   `PaymentIntentFundingSection` and the position list clarifies that money brought in above becomes
   available to protect/progress below.
3. **Success moments explain what changed** (Section 32): protect/fund/progress/release now each set
   a `successMessage` (e.g. "KES 25,000 is now protected for House Painting.") shown via
   `StatusNotice tone="success"` right above the updated position — release specifically uses the
   backend's own `releasedTotalMinor` response value, never a recomputed figure.
4. **Settlement destination** reframed as "Where your money goes"; register/replace/verify authority
   and every field (`accountNumber`, `beneficiaryName`, bank/mobile-money kind) unchanged.
5. **Financial Partner Hall**: partner cards now show, per capability, whether it's currently
   available, its currency, min/max amount, and fee description — all real fields, never invented,
   never ranked or recommended.
6. **FX honesty**: both `FxConversionSection` and `BusinessFxConversionSection` now say plainly that
   no rate is shown before applying, and that the rate is set on provider approval — matching the
   dto's own "application-based, never an instant rate" contract.
7. **DNA consistency**: every raw Tailwind `orange-*`/`red-*` banner and hand-rolled button/card
   across the whole Money surface (`CurrencyCapabilitySection`, `FxConversionSection`,
   `BusinessCurrencyCapabilitySection`, `BusinessFxConversionSection`,
   `AgreementCurrencyActivationPrompt`, `PaymentIntentFunding`, `MoneyOperationsExperience`,
   `MoneyStatus`, `MoneyUnavailableState`) now uses the Phase 1 `Surface`/`Button`/`StatusNotice`/
   `MoneyValue` primitives and the `ember` token family — the same drift class Phases 1-2 already
   fixed elsewhere, now closed out across all of Money.

## D. Agreement ↔ Money relationship

- **Agreement → Money**: `AgreementDetail`'s Money tab (`MoneyAgreementContext` + `MoneyStatus` +
  "Open Money" button, all pre-existing and already strong) already tells the person the Agreement's
  amount, payment readiness, outstanding reasons, and authorized next actions before they ever open
  Money — confirmed sufficient; not rebuilt (Section 10's "meaningful doorway, not an overload").
  `MoneyStatus`'s failed/unavailable/blocked states were moved off raw Tailwind `red-*` onto `ember`
  to match the rest of the product's status doctrine.
- **Money → Agreement**: `MoneyAgreementContext` (shown inside a specific Agreement's Money tab)
  already names the Agreement, version, milestone, counterparty and paying-as capacity — confirmed
  sufficient. At the Money Home level (new this phase), every summary and every "Needs your
  attention" item is itself an Agreement-titled card with a route back into that Agreement's own
  position — money without an Agreement never appears, because `MoneyHomeOverview` only ever shows
  Agreements that carry a proposed amount.

## E. Funding/payment

`PaymentIntentFundingSection` was already doctrine-correct before this phase: rail eligibility is
100% backend-derived (a disabled/uncertified rail never appears; the frontend never hardcodes a rail
code), quote expiry is shown, the provider/platform fee breakdown is itemized, and CONFIRMED is
described as "now available to protect into your Agreement" — never "funded = released" or
"funded = Agreement complete." What improved: DNA consistency (`Button`/`MoneyValue`/`StatusNotice`
throughout, replacing raw Tailwind), the idle CTA reworded from "Choose a funding source" (rail-first
language) to "Add money" (outcome-first, Section 8: "the person chooses the outcome first"), and the
explanatory line connecting this section to the manual protect/progress mechanism below it.

## F. Settlement

`SettlementDestinationSection`'s authority was already exactly right (self-service register/replace/
verify against the caller's own server-derived identity, real external-account facts only, no
`canonicalKsNumber` ever sent by the client) and is untouched. What improved: reframed as "Where your
money goes" (Section 13's own suggested phrase), DNA-consistent buttons/money display, masked
destination display given visual weight as the primary fact on the card.

## G. Currency/FX

Currency activation (`CurrencyCapabilitySection`, `AgreementCurrencyActivationPrompt`,
`BusinessCurrencyCapabilitySection`) and FX conversion (`FxConversionSection`,
`BusinessFxConversionSection`) doctrine — just-in-time activation, optional/never-forced conversion,
FX between the caller's own already-active positions only, never touching an Agreement — were already
correct and are untouched. What improved: DNA consistency throughout, and an honest, explicit
"SecurePay does not show a rate before you apply" disclosure on both FX screens, since the backend
contract genuinely has no rate/fee field (confirmed in `fx-application/dto.ts` and locked by
`currency-fx.test.mjs`) — Section 18's "if the backend cannot currently provide a live/authoritative
rate, say so" applied honestly rather than fabricating a number or silently saying nothing.

## H. Financial Partner Hall

**What could be built from real APIs**: `RegulatedPartnerResponse` and its nested
`PartnerCapabilityResponse[]` already carry everything needed for a first, honest Hall — partner
identity (`displayName`, `partnerType`, `environment`, `status`), and per capability: whether it's
enabled, its currency, min/max amount, and a fee description. **What was built**: the existing
"Financial partners" section now presents each partner's capabilities individually with that real
detail (humanized capability names, eligibility bounds via `MoneyValue`, fee description), explicitly
labeled "information, not a recommendation," with a clear empty state when the list is empty.
**What remains blocked** (not invented): the categories Section 14 names as examples (transaction
accounts, working-capital facilities, savings capability, etc.) are not a distinct concept in the
current contract — `capability` is a flat string tag, not a curated category with its own
description/duration/next-step. A genuinely richer Hall (grouped categories, indicative terms beyond
a fee-description string, a real "next step" call to action per partner) needs new backend fields;
building that grouping speculatively on top of a flat string tag would mean inventing structure the
API doesn't have, so it was not done.

## I. Hosted/API module

`HostedMoneySessionExperience` + `embedContract.ts` were already close to a genuine embeddable
finance module: a real, backend-registered origin allow-list (never a caller-supplied or wildcard
origin), `postMessage` only to a verified origin, ready/completed/cancelled lifecycle events, and a
disclosed scope limit (redemption still requires the visitor to sign in as the session's own
legitimate actor — the token alone is never trusted as identity). This phase's assessment: **the
architecture is already sound for "give me SecurePay's finance UI"** for the one bounded action a
Money Session currently supports (progressing a capped amount). What is not yet true: the module only
covers that one action end-to-end (progression) — funding via a real rail
(`PaymentIntentFundingSection`), FX, and Financial Partner discovery are not yet reachable from a
hosted/embedded session, only from the full signed-in Money page. Turning the whole Money experience
(not just one session type) into an embeddable surface is a larger, likely multi-phase effort and was
not attempted here — documented as a deferred gap (N) rather than partially built and overstated.

## J. Authority audit

No frontend financial authority was invented or broadened. Specifically:
- Every mutating call (`authorityGateway.open/fund/exercise/release`, `paymentIntentGateway.createIntent/initiate`,
  `settlementDestinationGateway.register/replace`, `currencyCapabilityGateway.activate`,
  `fxApplicationGateway.create`, `moneySessionGateway.create/redeem`) is called with the exact same
  arguments as before this phase — verified by diff review (Section C above traces every change to a
  presentational, copy, or additive-message change, never a changed argument or added mutation).
- The new Money Home overview computes a **sum**, never a new authoritative fact: it adds already-
  authoritative `proposedAmountMinor` values within one currency at a time (never mixed across
  currencies), and it never gates any action — a person can still fund/protect/progress/release
  exactly as before regardless of what Money Home shows.
- The new success messages either restate the amount/currency the person just submitted, or (for
  release) the backend's own response value (`releasedTotalMinor`) — never a client-recomputed total.
- No new rail, provider, or capability was hardcoded anywhere; every list (`fundingOptions`,
  `partners`, `capabilities`) still renders exactly what the backend returns.
- No `Status: Settled` label was introduced anywhere; `providerSettlementCertified` gating is
  untouched everywhere it already existed.
- No rate/fee field was added to the FX contract or fabricated in the UI; the new copy states the
  absence of a rate honestly.
- No doctrine conflict was found between frontend and backend during this phase; nothing here
  required stopping to report a conflict per Section 33/38.

## K. Desktop verification

**Source/test verified, not visually verified** (see L for why): every change was confirmed via
`npm run typecheck`, `npm run lint`, `npm run build`, and the full test suite, including the
money-experience, payment-intent, currency-fx, business-currency-fx, money-operations, and
embed-contract suites, all passing against the same literal assertions that existed before this phase
(no test was weakened; see Tests, M). A real-mode dev server was started and `#/money` was loaded in
a browser: it correctly fails closed to the existing "SecurePay is unavailable / Please try again
later" screen (no crash, no partial/broken render, no console errors) when no backend is configured —
confirmed visually, screenshot taken. Beyond that fail-closed boundary screen, the actual Money Home,
Agreement Money, funding, settlement, currency/FX, and Financial Partner Hall screens were **not**
visually rendered in this environment.

## L. Mobile verification

**Not performed.** Money has no fixture-mode equivalent (unlike the Human Core screens in Phases 1-2,
which could be visually verified via `VITE_SECUREPAY_MODE=fixture` because `src/App.tsx` reuses the
same locked `src/components/*` components) — `src/App.tsx` has no Money screens at all, and
`MoneyExperience.tsx` is a real-mode-only route gated behind a real signed-in session and a real
backend. No live SecurePayAPI backend is available in this environment (confirmed: the app's own
real-mode boot sequence fails closed with no backend configured). Per Section 36's explicit
instruction, this is disclosed here rather than claimed as verified. All Money layout (single-column,
`max-w-2xl mx-auto`, the same responsive primitives Phase 1/2 already established) reuses patterns
already visually verified on mobile in those phases, and every new element in this phase
(`MoneyHomeOverview`'s flex-wrap currency cards and attention list, the enriched partner cards) uses
the same `Surface`/flex-wrap/space-y patterns already proven at narrow widths — but this is a
structural inference, not a mobile screenshot, and is reported as such.

## M. Tests

Baseline (before any change in this phase, this worktree):
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `node --test tests/*.mjs` — 351 passed, 4 failed (pre-existing, unrelated, identical to Phases 1-2's
  own recorded baseline: `pr11-review-closure` ×1, `referrals-plugs-masters` J/K/AF2).
- `npm run build` — succeeds.

After this phase's changes (same commands, same worktree):
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `node --test tests/*.mjs` — 351 passed, the same 4 pre-existing failures, byte-for-byte the same
  failing test names. In particular, every Money-specific suite passes unmodified against its
  pre-existing literal assertions: `money-experience.test.mjs` (20 tests, including the exact
  "Agreement Money has no free-form authority-id..." and "Section 3/4: the rendered section title is
  'Agreement Money'" checks), `payment-intent.test.mjs` (8 tests, including the exact
  `const reset = () => { stopPolling(); setStage({ name: 'idle' }); setError(null); };` line match),
  `currency-fx.test.mjs` and `business-currency-fx.test.mjs` (20 tests combined, including the
  `doesNotMatch(fxDto, /exchangeRate|settledAmount|rateApplied/i)` check that this phase's honest
  "no rate shown" copy deliberately does not violate), `money-operations.test.mjs`, and
  `embed-contract.test.mjs`.
- `npm run build` — succeeds, same pre-existing chunk-size warning.

No test was removed, skipped, or weakened. No fixture-parity test needed updating (Money has none —
see Archaeology, A). No new automated test was added: every change in this phase is either a
presentational/DNA substitution already covered by the existing literal-string assertions, or new UI
(`MoneyHomeOverview`, success messages) that reads already-authoritative data without introducing new
authority to test.

## N. Deferred gaps

- **No backend aggregate "all my money" endpoint.** Money Home's "what you have" total is
  necessarily built from `currentUserAgreements()`'s own `proposedAmountMinor` (the *proposed*
  amount, not what's actually funded/protected) — genuinely showing "what's committed" across every
  Agreement at a glance would need either a new backend aggregate endpoint or an N+1 fan-out across
  every Agreement's own `funded-authority` list, which this phase deliberately did not build (see
  Money mental model, B, and Authority audit, J, for why the chosen scope stays honest without it).
  This is the single most valuable follow-up for a future Money phase.
- **Financial Partner Hall categories/next-step**: see H — needs new backend fields (curated
  category, indicative terms beyond a fee-description string, a real next-step action) to go further
  than presenting the flat capability list this phase built.
- **Hosted/embeddable coverage is one action wide** (progression only) — see I. Extending the hosted
  module to funding/FX/partner discovery is a larger effort for a later phase.
- **KS-to-KS**: no dedicated design work was needed or done — `fundingOptions`/`rail.displayName` are
  already fully backend-driven and never hardcode a rail (confirmed by
  `payment-intent.test.mjs`'s own "no hardcoded rail codes" assertion), and progression already
  addresses the beneficiary by masked KS Number, not a phone number — so a future KS-to-KS rail would
  appear automatically with no frontend change required. Documented as an existing architectural
  property, not something built this phase.
- **`RecipientReviewCard`'s hardcoded Labour/Materials fields** (already flagged as deferred in
  Phase 2) remain untouched — not a Money concern this phase, still relevant to a future
  "Agreements are bigger than money" pass.
- **Mobile visual verification** — see L. Should be the first thing checked once a real backend or a
  Money-aware fixture/staging environment is available.

## O. Git

- Branch: `feat/final-phase3-securepay-money-world`
- Starting SHA: `07f24d84bc4cc23f4ac8fcdb7b852429ad5285e1` (`origin/main`, includes merged Phase 1
  PR #20 and Phase 2 PR #21)
- Files changed: `src/features/money/MoneyExperience.tsx` (Money Home overview, success messages,
  Settlement/Financial Partner Hall enrichment), `src/features/money/PaymentIntentFunding.tsx`,
  `src/features/money/CurrencyCapabilitySection.tsx`, `src/features/money/FxConversionSection.tsx`,
  `src/features/money/BusinessCurrencyCapabilitySection.tsx`,
  `src/features/money/BusinessFxConversionSection.tsx`,
  `src/features/money/AgreementCurrencyActivationPrompt.tsx`,
  `src/features/money/MoneyOperationsExperience.tsx`,
  `src/features/money/HostedMoneySessionExperience.tsx`, `src/components/MoneyStatus.tsx`,
  `src/components/MoneyUnavailableState.tsx`, plus this document.
- Tests: see Test report (M) above.
- PR: opened as draft/open, unmerged — programme controller performs final review and merge.
