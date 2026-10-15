# SecurePay Phase 2 — Colour, typography, texture and brand identity
## Build ledger · 15 October 2026

**Implementation status: brand convergence draft, not visually/human certified.**
**Phase 1 PR #136 remains open and conditional.** This branch stacks on its exact HEAD
`7c509834fad0915c34b7a34646aa722596703901`.
No API code, securemain, branch merge or production deployment.

### Brand system and design decisions
| Semantic purpose | Phase 2 treatment | Reason |
| --- | --- | --- |
| Everyday product voice | Afacad Flux, fallback Inter / system | approachable and compact, numbers stay readable |
| Significant editorial headings | Bricolage Grotesque, fallback Afacad Flux | distinctive but clear; not decoration on all labels |
| Important Agreement initial | Dynamic, accessible Uncial Antiqua first letter only | subtle medieval manuscript reference approved by owner; gracefully falls back for non-letter titles |
| Trust/action | Forest #244936 | stable primary actions and ink |
| Progress/growth | Sage #8BB89B | community and developing activity |
| Canvas | Cream #FAF7F0 | warm paper-like atmosphere |
| Meaningful attention | Ember #EF9537 | creative Vision accents; not a general warning substitute |
| Financial figures | Tabular/lining numerals | alignment, clarity and precision |
| Preview status | Existing explicit words and badges | colour never asserts review, identity, acceptance, payment or membership |
| Official logo | Original supplied PNG brand marks | brand assets unchanged |

Font candidates are open fonts, **not exclusive or proprietary** to SecurePay.
A custom typeface is a separate future design/rights task, not a claim here.

### Implementation boundary
- `src/index.css`: shared *scoped* signature tokens, area accents, print-safe rules, mobile treatments and keyboard focus.
- `src/features/brand/SignatureAgreementTitle.tsx`: properly accessible, dynamic first-letter component. Underlying title remains full in the accessibility tree.
- Public/signed-in Home: same brand voice and existing logo.
- Living Workspace: same navigation, Conversation and Result surfaces; each area gets measured differences.
- Real Living Work Agreement and demo Living Agreement: manuscript-inspired first-letter title without imposing decorative typography on printed contracts.
- Money: tabular digits and stable forest accent in both the compact Money tool and existing Money Home route; no fee/rail logic changed.
- Quick Assist: compact sage accent; no booking/discovery logic changed.
- Vision/Circle/Community: modest Ember/Sage/Sand family resemblance, no claims that sample projects are real.
- **Store demo/gallery and StoresTool exact blob SHA unchanged** from Phase 1. Their approved layouts/content have not been modified. These screens still inherit parent-area typography and must receive visual owner review.

### Scope, gaps and acceptance
The implementation is a first actual design-system pass, not evidence that every existing route uses it:
- Canonical full Agreement/Money journeys outside the new Living Workspace retain legacy component rules where appropriate; further visual convergence after user comparison remains.
- Trust Project invitation entry now inherits the related type family through a separate `sp-brand-trust` scope, while preserving its distinct visuals and unchanged two-door routing.
- No users have been recruited for older-trader readability or Swahili testing.
- 200% text scaling, print comparisons, long legal titles and dark/high contrast must be browser/human tested before approval.
- Phase 1's unresolved 29 inherited UI regressions and backend/API dependency are not fixed by a style pass.

### Honest before/after evidence
`.github/workflows/phase2-brand-convergence.yml` uses an **exact checkout** of Phase 1 SHA `7c509834...`, builds it, then builds the Phase 2 revision.
`tests/phase2-brand-browser.mjs` captures same routes at 320px, 390px and 1440px for:
Home, KS001/Living Agreement, Money, Stores, Quick Assist, Vision, Circle and Community.
Artifact: `phase2-before-after-brand-screenshots`. These are **actual frontend browser screenshots**, not AI concepts.
The public preview and illustrative signed-out journeys do not certify real backend transactions.

### Exit criteria / decision
- Focused static design tests, TypeScript, lint and build: must pass on latest HEAD.
- Browser comparison: must run without JavaScript exceptions, and support owner review at all widths.
- Real human visual signoff: pending.
- WCAG/text zoom and interactive keyboard evaluation: pending.
- Complete production integration: depends on unfinished Phase 1.

**Current exit decision: CONDITIONAL (pending automated evidence and human visual signoff).**
Do not merge/deploy to production or declare Phase 1 finished.
