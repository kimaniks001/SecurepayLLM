# SecurePay Human Experience Rebuild — Phase 4 Completion Report

**Phase:** 4 — Intelligent Next Step  
**Date:** 2026-10-12  
**Base:** `human-experience/phase3-agreement-journey@71398d029c502d2e593fbf6f513cd636e2cc0bf9`  
**Branch:** `human-experience/phase4-intelligent-next-step`  
**PR:** #127 — Human Experience Phase 4 — Intelligent Next Step  
**SecurePayAPI repository changes:** none  
**Production deployment:** none  
**Merge:** not performed

## 1. Result

Phase 4 makes the Agreement the human-facing centre from which SecurePay reveals the next useful capability.

The default Agreement surface does **not** become a super-dashboard. It shows:

1. the Agreement itself;
2. one authoritative next state;
3. normally one primary action;
4. quiet secondary access to KS001 and deeper Agreement details.

The orchestration rule is now:

> **Agreement state → authoritative actor action / waiting / upcoming → relevant cross-domain truth → one human consequence → one obvious next action.**

The frontend does not invent Agreement, Money, evidence, completion, Community Saver, Plug/Master qualification or identity authority.

## 2. Files changed

| File | Phase 4 purpose |
|---|---|
| `src/features/workspace/AgreementNextStep.tsx` | New pure human next-step projection for Agreement state, backend participant actions and read-only release authority |
| `src/features/workspace/LivingAgreementOverview.tsx` | Keeps Agreement visible and renders only one dominant next step; moves record machinery behind Details |
| `src/features/workspace/WorkspaceExperience.tsx` | Wires authoritative next actions, completion, read-only release authority, exact deep-link destinations and contextual capabilities |
| `src/features/shell/humanNext.ts` | Routes Home Continue to exact Money / Changes / Progress Agreement state |
| `src/features/shell/AgreementAttentionSummary.tsx` | Calm Needs you / Waiting / Upcoming grouping for other Agreements |
| `src/features/agent/AgentExperience.tsx` | Integrates exact Agreement destinations and separates Plug-required routing from user-requested human help |
| `src/features/execution/ProgressPanel.tsx` | Agreement-obligation-derived fulfilment and explicit Community Saver Plug gate |
| `src/components/AgreementSupport.tsx` | Adds deliberate “Get human help” doorway without automatically recommending Plug or Master |
| `src/components/AgreementDetail.tsx` | Carries contextual human-help and next-step seams without adding permanent capability navigation |
| `src/features/ecosystem/EcosystemExperience.tsx` | Accepts explicit help / Plug / Master entry intent while retaining existing verified capability flows |
| `src/RuntimeApp.tsx` | Supplies the existing session-safe read-only payment-release gateway to the Agreement shell |
| `src/features/support/tabHint.ts` | Extends exact Agreement destination hints |
| `src/features/workspace/controller.ts` | Preserves authoritative next-action/read state through refresh and failure |
| tests | Phase 4 contract plus legacy regression updates where the interaction location changed |
| `docs/phase4-intelligent-next-step-visual-certification.svg` | 14 browser-rendered certification states |

No SecurePayAPI source file was modified.

## 3. Old versus new orchestration

### Before Phase 4

The Agreement could expose many capable areas — Progress, Money, People, Documents, Changes, Support — but the person still had to understand where the relevant answer lived.

### Phase 4

The normal Agreement plane asks:

> **What matters now for this Agreement and this actor?**

Examples:

- **Needs you** — Evidence needs your review → **Inspect the work**
- **Needs you** — KES 95,000 can now be funded → **See payment options**
- **Waiting** — Waiting for Peter to agree → **no fake CTA**
- **Upcoming** — Work starts 19 Oct → nothing required now
- **Needs you** — Peter suggested a change → **Review change**
- **Done** — Work is complete, but Payment Ready is not satisfied → no release action
- **Needs you** — backend release authority says release is available → **Review release** in Money

The human sees the consequence, not the source object.

## 4. Next-step authority

Agreement work next steps come from the existing backend participant action vocabulary:

- START_OBLIGATION
- FUND_AGREEMENT
- SUBMIT_EVIDENCE
- PROVIDE_LOCATION
- RECORD_ATTENDANCE
- SUBMIT_DELIVERY
- ACKNOWLEDGE_DELIVERY
- REVIEW_EVIDENCE
- PROVIDE_MORE_INFORMATION
- REPLACE_EVIDENCE
- COMPLETE_OBLIGATION
- REVIEW_AMENDMENT
- WAIT_FOR_DEPENDENCY
- WAIT_UNTIL_AVAILABLE
- RECONFIRM_AGREEMENT_VERSION
- NO_ACTION_REQUIRED

The backend sorts participant actions by urgency/deadline. Phase 4 does not re-create that business ranking in React.

If the authoritative next-action read fails, the Agreement shows **UNKNOWN**, not “nothing to do.”

## 5. Human state model

### NEEDS YOU
An authoritative action belongs to this actor.

### WAITING
Backend state says a dependency / another participant must move first. No fake CTA is rendered.

### UPCOMING
No action is required now but the Agreement has a real future event.

### DONE
Current agreed work is complete and no currently authorised human action is being claimed.

### IDLE
SecurePay knows no action is required from the available Agreement projection.

### UNKNOWN
An authoritative read failed or a relevant Money authority cannot be confirmed. Unknown is never converted into “blocked,” “ready,” “zero” or “none.”

## 6. Money boundary

Phase 4 preserves:

> **Money should follow the Agreement.**

### Funding

The Agreement only shows:

> **KES 95,000 can now be funded for this Agreement.**

when the backend participant next action is exactly `FUND_AGREEMENT`.

The Agreement does not infer funding from “agreed.”

The CTA is only:

> **See payment options**

Money itself owns routes, quote economics and payment execution.

### Release

Release is deliberately separate from Agreement completion.

The backend Agreement action vocabulary does **not** contain a release action. SecurePay already has a separate participant-safe payment-release authority read:

`releaseAuthority(agreementId)`

Phase 4 reads it only after authoritative Agreement completion.

Rules:

- completion alone → no Money action;
- release-authority loading → “SecurePay is checking Money”;
- release-authority failure → UNKNOWN; nothing moved;
- `authorized=false` → human reason from the backend reason code; no release CTA;
- `authorized=true` → **Review release** → Money.

This is navigation only. Phase 4 exposes **no** create/reserve/execute release command in the Agreement.

Money re-reads Agreement version, destination and release authority before any consequential financial path.

## 7. Evidence boundary

`REVIEW_EVIDENCE` becomes:

> **Evidence for the work needs your review.**

Primary action:

> **Inspect the work**

The UI explicitly says:

> Reviewing evidence does not by itself complete the work or release money.

The real `ProgressPanel` remains the contextual evidence surface. Evidence is not a permanent dashboard panel in the primary Agreement view.

## 8. Store / fulfilment connection

Store appears only from an exact Agreement obligation.

The real `ProgressPanel` action:

> **Find what this work needs**

derives a fulfilment need using:

`fromAgreementObligation(agreementId, obligationId, ...)`

The need remains tied to that Agreement obligation/version context.

The human chooses:

- need type;
- visibility;
- whether compatible pooling is allowed.

A Store/supply result remains a source option. It does not silently amend the Agreement, accept a commercial term or create payment authority.

## 9. Community Saver

The Phase 4 rule is enforced visibly and by regression:

> **A Plug must be involved in every Community Saver.**

When the person explicitly allows compatible pooling, the real `ProgressPanel` says:

> SecurePay has not combined this Agreement with anyone else. A Plug must verify fit, coordinate consent and practical feasibility before any Community Saver can proceed.

The frontend contains no autonomous shared-fulfilment proposal/execution path here.

No other Agreement’s private details are revealed.

## 10. Plug and Master

Phase 4 distinguishes two human-help intents.

### Plug-required

Community Saver and other flows whose policy specifically requires a Plug can route directly to the real Agreement-scoped Plug capacity.

### User-requested human help

Agreement Support now offers:

> **Get human help**

and explains:

> Choose a Plug for practical coordination or a Master for experienced guidance. SecurePay does not assume either one is needed.

That opens the real existing human-help chooser in Agreement context.

Phase 4 does **not** automatically recommend a Master from a disagreement simply because text looks disputatious. A specific Master recommendation must still come from verified capability/routing truth.

## 11. KS001

KS001 remains a quiet conversational capability around the Agreement.

The Agreement next-step surface offers **Ask KS001** as a secondary action, not a second authority engine.

The prompt given to KS001 includes the exact Agreement context and explicitly forbids assuming:

- financial authority;
- payment readiness;
- release rights;
- executable actions;
- unverified SecurePay capabilities.

## 12. Home and Continue

Home Continue now preserves exact Agreement attention.

Examples:

- REVIEW_AMENDMENT → exact Changes view
- REVIEW_EVIDENCE → exact Progress/inspection view
- FUND_AGREEMENT → Money for that Agreement
- other Agreement action → exact Agreement context

Continue no longer means “open a generic Agreement detail page” when SecurePay already knows the exact unresolved action.

Workspace-backed Continue still re-reads authority before navigation so a stale Home card is never permission.

## 13. Multiple Agreements

Other Agreements are grouped quietly into:

- **Needs you**
- **Waiting**
- **Upcoming**

The current/dominant work is excluded from the secondary list.

There are no KPI counters, percentage dashboards or status matrices.

## 14. Notifications

Notification navigation remains driven by the backend’s closed `actionKey` contract.

An `agreementId` alone is not enough to infer a navigation action.

For Agreement review/change notifications, navigation reaches the exact Agreement moment and the Agreement itself renders the Current/Suggested decision.

## 15. Failure and uncertainty

Phase 4 preserves fail-closed behavior.

Examples certified:

### Agreement next-action read fails
> SecurePay couldn't confirm what needs you next.  
> No Agreement or Money action has been assumed.

### Release authority read fails
> The work is complete, but SecurePay couldn't confirm the current release authority.  
> That does not mean release is allowed or blocked. Nothing has been moved.

### Existing uncertain mutations
The same idempotency/check-what-happened doctrine remains unchanged.

No failed read is converted into a false human fact.

## 16. Advanced details

The Agreement’s primary surface is intentionally small.

Version/history, people, obligations, milestones, documents, Money detail and technical/reference information remain reachable under **Agreement details** or their specialist contextual surface.

They are not removed; they are no longer the default cognitive load.

## 17. Phase 4 dedicated tests

File:

`tests/human-experience-phase4-intelligent-next-step.test.mjs`

Final result:

- **19 tests**
- **19 passed**
- **0 failed**

The contract protects:

1. agreed/idle does not imply Money readiness;
2. funding appears only from `FUND_AGREEMENT`;
3. waiting has no fake action;
4. evidence review does not release money;
5. failed next-action read stays UNKNOWN;
6. completion alone creates no Money action;
7. release doorway requires backend release authority;
8. failed release read stays UNKNOWN and moves nothing;
9. proposed change routes to Changes;
10. Home funding routes directly to Money;
11. Agreement overview is not a super-dashboard;
12. Store need starts from an exact Agreement obligation;
13. Community Saver requires a Plug;
14. Plug/Master help is contextual and never auto-recommended;
15. multiple Agreements are calmly grouped;
16. Continue routes to exact Agreement sections;
17. notifications stay actionKey-driven;
18. advanced machinery remains under Details;
19. release is read-only navigation authority, never an Agreement release command.

## 18. Full certification

### Full frontend convergence

`npm run test:final-convergence`

Result:

- **1,936 tests**
- **1,936 passed**
- **0 failed**

During isolated-sandbox certification, two untouched historical-reference tests initially failed because the shallow clone did not contain their fixed comparison SHAs. Fetching those exact historical commits made both pass unchanged; no product or test modification was required for those two cases.

### Typecheck

`npm run typecheck` — PASS

### Lint

`npm run lint` — PASS with **0 errors**. Existing warnings remain outside Phase 4 scope.

### Production build

`npm run build` — PASS

No deployment was performed.

## 19. Visual certification

Committed:

`docs/phase4-intelligent-next-step-visual-certification.svg`

The sheet contains 14 browser-rendered states:

1. Agreed — nothing required today
2. Agreed — Money becomes relevant
3. Work complete / evidence needs inspection
4. Evidence shown contextually
5. Release authority available
6. Waiting on counterparty/dependency
7. Proposed change
8. Agreement-derived Store/resource need
9. Community Saver → mandatory Plug guard
10. contextual Plug/Master human-help doorway
11. multiple Agreements Home
12. notification deep-link destination
13. 320px mobile next step
14. desktop Agreement

The certification uses the implemented Phase 4 `AgreementNextStep`, real production `ProgressPanel`, `AgreementSupport`, `AgreementAttentionSummary` and compiled product CSS with representative non-production state.

The temporary rendering harness was not committed.

## 20. Reference journeys A–N

| Journey | Result | Phase 4 behavior |
|---|---|---|
| A — agreed service, no action today | PASS | work/date state can be quiet; no Money CTA manufactured |
| B — funding becomes relevant | PASS | `FUND_AGREEMENT` → “See payment options” |
| C — completed work, inspection needed | PASS | `REVIEW_EVIDENCE` → “Inspect the work”; no release |
| D — inspection complete, Money authority | PASS | completion triggers read-only release-authority check; authorized → Review release in Money; denied/error remains honest |
| E — proposed Agreement change | PASS | REVIEW_AMENDMENT → exact Changes decision |
| F — Store resource need | PASS | real ProgressPanel derives need from exact Agreement obligation |
| G — Community Saver opportunity | PASS | compatible pooling never combines Agreements; mandatory Plug guard |
| H — Plug help | PASS | Plug-required route remains Agreement-scoped |
| I — Master help | PASS | human-help chooser provides real Master path only when user asks; no automatic unverified recommendation |
| J — waiting | PASS | WAIT states show no fake CTA |
| K — multiple Agreements | PASS | Needs you / Waiting / Upcoming secondary grouping |
| L — notification deep link | PASS | backend actionKey routes to exact Agreement moment |
| M — failure / uncertainty | PASS | failed Agreement/Money reads stay UNKNOWN; no state invented |
| N — 320px mobile | PASS | browser-rendered certification keeps Agreement and primary action readable in one column |

## 21. 70% test

Phase 4 removes the need to show:

- Money card;
- Store card;
- Community card;
- Evidence card;
- Documents card;
- Milestone card;
- Support card;
- Skills card

on every Agreement.

Instead SecurePay selectively reveals the one capability that the authoritative state makes useful.

The system became more connected while the ordinary Agreement surface became smaller.

## 22. Backend/API changes

**None.**

Phase 4 found enough existing backend truth for:

- participant next actions;
- completion;
- evidence;
- Agreement amendments;
- funding next action;
- payment release authority;
- fulfilment need derivation;
- notifications;
- Plug/Master capability routes.

The frontend only composes presentation and navigation over those contracts.

## 23. Known boundaries

- A user-requested Master path exists, but Phase 4 does not invent an automatic “this dispute needs a Master” classifier. A future automatic recommendation must come from verified routing/capability truth.
- Release authority is surfaced as a read-only navigation signal. The Agreement deliberately exposes no release execution command.
- Full Money rail/quote/economics UX remains owned by Money and is not duplicated inside the Agreement.
- Phase 4 does not redesign Store, Community, Vision or Skills Institute.

## 24. What remains for Phase 5

Phase 5 can now bring the remaining major SecurePay product surfaces into this same interaction language without rebuilding the Agreement orchestration:

- Money as a contextual continuation rather than a separate mental model;
- Vision as planning that can naturally become trade;
- Store as supply/capability surfaced from real need;
- Community as real people/opportunities surfaced from real context;
- Skills Institute as capability/help surfaced from real learning need.

The Phase 4 Agreement-centred next-step contract should remain the reference.

## 25. Exit gate

Phase 4 now satisfies the requested gate:

- Agreement remains the visible centre;
- meaningful next state is derived from authoritative truth;
- normally one primary action;
- waiting may simply wait;
- Money appears only when relevant;
- no Money authority is inferred in React;
- Store emerges from an actual Agreement obligation;
- evidence is contextual;
- Community Saver always requires a Plug;
- Plug/Master are contextual human capabilities;
- Continue routes to what matters next;
- notifications deep-link into Agreement state;
- advanced machinery is progressively disclosed;
- 320px is visually certified;
- unknown stays unknown;
- full regression is green;
- typecheck is green;
- lint has zero errors;
- production build is green;
- visual certification is complete;
- no production deployment occurred;
- no merge occurred.

# **PASS — PHASE 5 CAN BEGIN**

Stop here. Do not merge, deploy or begin Phase 5 automatically.
