# SecurePay Human Experience Rebuild — Phase 2 Completion Report

**Phase:** 2 — The New SecurePay Shell  
**Date:** 2026-10-12  
**Frontend baseline:** `kimaniks001/SecurepayLLM@dfdc6bf4eaa31e96c15c330e71cb6c91ba1e8dfa`  
**Branch:** `human-experience/phase2-securepay-shell`  
**Backend authority inspected:** `kimaniks001/SecurePayAPI@3b8e067931b793692669603c4f32b5cb5756925a`  
**PR:** #125 — Human Experience Phase 2 — New SecurePay Shell  
**Production:** unchanged  
**Merge:** not performed

## A. Baseline

The Phase 2 branch was created directly from the same frontend `main` SHA audited in Phase 1:

`dfdc6bf4eaa31e96c15c330e71cb6c91ba1e8dfa`

There was no frontend drift to reconcile before implementation.

No SecurePayAPI code was modified. The backend baseline was inspected only to preserve the existing server-owned authority model: Agreement formation/question state, Agreement next actions, invitations, reviews, identity and Money remain authoritative underneath the shell.

## B. Production files changed

| File | Change | Human reason |
|---|---|---|
| `src/components/NavBar.tsx` | Replaced permanent signed-in module navigation with SecurePay Home, Notifications and Account | The person no longer has to learn SecurePay's product map before acting |
| `src/components/SignedOutHome.tsx` | Shared hero now has a task-first signed-in mode; signed-in quick-start/illustration/activation competition removed | Home answers “What do you want to get done?” |
| `src/features/agent/AgentExperience.tsx` | Canonical Home, HumanNext composition, one-plane KS001 work, contextual Details, stale Continue re-read, quiet secondary work | Puts the artifact/current action ahead of SecurePay machinery |
| `src/features/entry/ContinueCard.tsx` | Continue now states the work, consequence and exact action | Continue means “take me to what needs me” rather than “open this chat” |
| `src/features/shell/humanNext.ts` | Added presentation-only next-human-action resolver over existing authoritative facts | Chooses one visible action without inventing new business truth |
| `src/features/workspace/WorkspaceExperience.tsx` | Agreement workspace defaults to Hub and Home exits to canonical KS001 Home | Removes the second competing signed-in Home |

The rest of the changed files are regression tests updated or added to encode the Phase 2 interaction contract. The visual evidence sheet is documentation only.

## C. Old shell vs new shell

### Home

**Before**

Home could behave as a feature/dashboard surface: quick-start choices, module navigation, saved work, Trust Project explanation, metrics/activity in the alternate Workspace Home, and multiple possible ways to decide where to go.

**Now**

Signed-in Home has one primary question:

> **What do you want to get done?**

There is one universal KS001 composer with the existing `+` source intake.

When SecurePay can prove that something needs the person, Home shows one `ContinueCard` describing the consequence and the exact next action.

When there is no verified action:

> **You're caught up.**

Other work and broader exploration are secondary disclosures.

### Navigation

**Before**

Desktop permanently taught Home / Agreements / Money / Store / Community / Account. Mobile taught Home / Vision / Agreements / Store / Community.

**Now**

The persistent signed-in shell contains:

- SecurePay Home
- Notifications
- Account

Agreement, Money, Store, Community, Vision and the other capabilities still have real routes/deep links, but they are no longer the ordinary person's primary mental model.

### KS001 active work

**Before**

The person operated a BUILD / UNDERSTOOD architecture. Desktop gave conversation and structured understanding co-equal space; mobile exposed BUILD / UNDERSTOOD tabs. Refresh, Review, Save and structured facts could all compete with the actual artifact.

**Now**

There is one primary work plane:

1. conversation;
2. actual artifact taking shape;
3. server-owned next question/action.

“What SecurePay understands” remains available through **Details**, but is not a permanent operating mode.

Routine Refresh has been removed from the primary work controls. Error/uncertainty recovery remains local and explicit.

### Continue

**Before**

Continue principally restored the current conversation.

**Now**

Continue is a presentation projection over real state. Phase 2 candidates include:

- formal review/problem;
- actionable invitation;
- Agreement next action;
- server-owned formation question;
- formation review readiness;
- unfinished conversation/saved build.

The card describes what actually needs the person.

For Agreement/review/invitation-backed cards, clicking Continue re-reads authoritative state before routing. A stale Home card is never treated as authority.

## D. Machinery moved out of the primary view

Phase 2 moved or removed from ordinary primary operation:

- permanent BUILD / UNDERSTOOD modes;
- permanent structured-understanding side plane;
- routine “Refresh what SecurePay understands”;
- duplicate Review control in the chat toolbar;
- Save for later as a co-equal primary action;
- signed-in quick-start grid;
- signed-in permanent example Agreement;
- signed-in activation CTA competition;
- permanent signed-in module navigation;
- mobile five-domain bottom navigation;
- broad Trust Project explanation as primary Home content;
- the old Workspace dashboard as the canonical signed-in Home.

None of these changes delete their underlying capability where it remains legitimate.

## E. What remains visible

The normal human layer now prioritizes:

- SecurePay / KS001 identity;
- the person's natural-language intention;
- the actual work/artifact;
- the current material question;
- one current consequence;
- one primary action;
- necessary person / amount / date facts;
- contextual source failure or conflict when real;
- Details only when the person wants to inspect deeper understanding.

## F. Capability preserved underneath

Phase 2 does **not** weaken or replace:

- Agreement authority;
- Agreement formation and server-owned question discipline;
- Agreement versions;
- invitations;
- participant/identity authority;
- evidence;
- formal review;
- Money authority or readiness;
- source ingestion;
- Store;
- Community / Circles;
- Vision;
- Notifications;
- Support;
- Plug / Master routes;
- Projects;
- Account / Business / Developer;
- SecureLinks;
- direct/deep routes.

No SecurePayAPI file was changed.

## G. Tests and verification

### Repository certification

Current product code was certified by both existing CI gates after the Phase 2 corrections:

**Final UI Convergence Certification**
- Full frontend regression: PASS
- Typecheck: PASS
- Lint errors: PASS
- Production build: PASS

**Vision V1 UI verification**
- Vision Dream regressions: PASS
- Full frontend Node regression: PASS
- Typecheck: PASS
- Lint: PASS
- Production build only (no deploy): PASS

The shared full regression result was:

- tests: **1,907**
- pass: **1,907**
- fail: **0**

### Commands represented by CI

- `npm run test:final-convergence`
- `npm run typecheck`
- lint/error gate from the repository workflow
- `npm run build`
- Vision Dream regression command from `.github/workflows/vision-v1-ui-verification.yml`

### Important correction cycle

The first Phase 2 regression exposed old contracts and genuine preservation issues. Genuine issues were fixed rather than hidden:

- canonical SecurePay mark restored in the restrained NavBar;
- signed/public text contrast preserved;
- Trust Project membership remained explicitly identity-gated;
- Activation remains reachable from Account without competing with operating Home;
- stale Continue actions now re-read authority.

Old regression assertions were changed only where they explicitly required UI that Phase 2 intentionally retires, such as permanent module tabs, BUILD / UNDERSTOOD modes, Workspace Home as the canonical Home, and the duplicate Review / Refresh toolbar.

## H. Human journey certification

| Journey | Result | Primary action / behavior | Confusion found | Phase 2 outcome |
|---|---|---|---|---|
| A · natural-language Agreement | PASS at shell/formation seam | server-owned next question or Review | old chat controls competed with artifact | AgreementShaping now owns the visible next step |
| B · source first | PASS existing ingestion regressions | source lifecycle then current work | extraction/system UI could compete | source failure stays contextual; Details secondary |
| C · unfinished work | PASS | Continue / exact formation question | Continue previously only reopened conversation | HumanNext resolves the formation/resume state |
| D · invitation | PASS routing contract | Review invitation | module routing could dominate | actionable invitation can become Home's next item |
| E · proposed change | PASS routing contract | Review change | stale change could remain on Home | authoritative re-read before routing |
| F · ready to sign/review | PASS formation contract | Review agreement | duplicate Review affordances | artifact owns review readiness |
| G · completion/evidence | PASS existing Agreement next-action regressions | authoritative Agreement action | specialist area discovery | Agreement next action can become Home's primary item |
| H · Money | PASS preservation boundary | only backend-authorised Agreement/Money handoff | risk of UI inventing finance state | HumanNext does not fabricate Money truth |
| I · caught up | PASS | “You're caught up.” | temptation to fill empty space | no fabricated task |
| J · source failure | PASS existing EP-CERT regressions | Try again / Remove | failure could become global disruption | error remains local to the source |

Phase 2 did not manufacture live counterparties or production financial events simply to demonstrate these states. Authority-sensitive journeys are certified using the repository's existing backend-shaped fixtures/controllers/regressions and the new shell contract.

## I. Gaps and deferrals

### Frontend issue resolved in Phase 2

The major shell-level overload is resolved structurally: one Home, restrained navigation, one active work plane, contextual Details and an authoritative Continue presentation model.

### Backend capability gap

No new backend capability was required for the Phase 2 shell.

There is still no single cross-domain server-owned global “next thing” object. Phase 2 therefore performs conservative **presentation ranking only** across allowed existing authorities. It does not turn this ranking into business authority.

### Unresolved design decision

Specialist/direct navigation remains available through routes and contextual links. Phase 3 should observe real human use before adding any broader persistent “More” directory.

### Deferred to Phase 3

Phase 2 deliberately does not fully redesign:

- Agreement journey after shell entry;
- Money;
- Store;
- Community;
- Vision;
- Skills Institute;
- Account administration.

The Agreement becomes the reference end-to-end experience in Phase 3.

## J. Visual certification

Visual evidence is committed at:

`docs/phase2-human-shell-visual-certification.svg`

The sheet was rendered in an isolated browser harness using the Phase 2 branch's real production components and non-production representative data.

It covers the six required views as follows:

1. **Signed-in Home** — panel “HOME”
2. **Active KS001 work** — panel “ACTIVE”
3. **Agreement taking shape** — the same ACTIVE panel uses the real `AgreementShaping` component
4. **Continue card** — panel “CONTINUE”
5. **320px mobile Home** — panel “MOBILE”
6. **Desktop active work** — panel “ACTIVE”

The harness itself was temporary and was not committed to product source.

The active-work browser text verified that the visible artifact contains the Agreement and the material question:

> Bathroom tiling … KES 95,000 … When should Peter be paid?

The Continue visual verifies consequence-first wording:

> Peter proposed KES 30,000 before work begins.  
> That is different from your current agreement.  
> Review change.

## 70% test

The major Phase 2 applications of the 70% test were:

- top-level signed-in navigation: six/five permanent modules → Home + Notifications + Account;
- KS001 workspace: dual operating planes → one plane + optional Details;
- active controls: Refresh / duplicate Review / Save → server-owned artifact next step + contextual More options;
- signed-in Home: feature/example/education competition → one composer + one verified Continue;
- empty Home: suggestions/dashboard filler → honest “You're caught up.”

Truth, safety and underlying capability were retained.

## K. Recommendation

# **PASS — Phase 3 Agreement Journey can begin**

Reason: the new shell now implements the Phase 1 constitution at the operating-structure level, the next-action layer remains presentation-only over authoritative state, stale Continue actions are re-read, existing capabilities/deep routes remain intact, the full frontend regression is 1,907/1,907 green, typecheck/lint/build gates are green, and representative desktop/mobile visuals demonstrate the intended hierarchy.

**Stop here. Do not begin Phase 3 automatically.**
