# SecurePay Human Experience Rebuild — Phase 1 Audit

**Phase:** 1 — Human Experience Constitution + Product Audit  
**Baseline frontend:** `kimaniks001/SecurepayLLM@dfdc6bf4eaa31e96c15c330e71cb6c91ba1e8dfa`  
**Backend truth checked against:** `kimaniks001/SecurePayAPI@3b8e067931b793692669603c4f32b5cb5756925a`  
**Audit date:** 2026-10-12  
**Implementation status:** Documentation/audit only. No product UI redesign, backend modification, merge or deployment.

---

## 1. Executive diagnosis

SecurePay's current difficulty is not a lack of intelligence. It is **excessive exposure of intelligence as interface**.

The source already contains strong human-first ideas:

- one KS001 entry point;
- a visible emerging Agreement;
- server-owned Agreement formation;
- a deterministic next-question discipline;
- authoritative per-Agreement next actions;
- progressive disclosure in parts of Money;
- human-language Agreement review;
- explicit truth boundaries.

But those strengths are surrounded by several competing product structures.

The current human must simultaneously understand:

1. the conversational BUILD;
2. the separate UNDERSTOOD/workbench plane;
3. an emerging Agreement;
4. Review;
5. source controls;
6. Refresh;
7. Save for later;
8. top-level product navigation;
9. separate Agreement, Money, Store, Community, Vision and Account surfaces;
10. multiple “where do I go next?” pathways.

The product therefore makes the person learn the map at exactly the moment SecurePay should be removing that burden.

### Root cause A — product architecture is visible as navigation

`src/components/NavBar.tsx` permanently exposes desktop destinations:

- Home
- Agreements
- Money
- Store
- Community
- Account

and mobile destinations:

- Home
- Vision
- Agreements
- Store
- Community

Those are legitimate capabilities, but their permanent prominence asks the human to decide which SecurePay subsystem owns their real-life intention.

This conflicts with the desired model: the person states what they want, then SecurePay routes underneath.

### Root cause B — the conversation exposes a second operating plane

`src/features/agent/AgentExperience.tsx` presents BUILD and UNDERSTOOD as explicit concepts on mobile and a permanent split conversation/workbench on desktop.

The UNDERSTOOD plane is rich: facts, conflicts, sufficiency, optional additions and structured sections. It is useful as an inspection/debug/review surface. It is too strong as a permanent co-equal plane.

The human is effectively asked to operate both the conversation and SecurePay's internal structured representation.

### Root cause C — too many valid controls are visible at once

The current conversation can expose:

- SourceMenu;
- emerging Agreement;
- one next question;
- Refresh;
- Review/next step;
- Save for later;
- source cards;
- failure recovery;
- structured UNDERSTOOD controls;
- + New;
- principles affordance.

Each control may be defensible alone. Together they compete with the actual task.

The problem is therefore **priority**, not merely content.

### Root cause D — “Continue” is currently continuity, not orchestration

`src/features/entry/ContinueCard.tsx` correctly separates continuation from starting new work, but the current implementation only returns to meaningful work in the current conversation/tab.

It does not answer the larger product question:

> What is the most relevant unresolved action for this work now?

The backend already exposes authoritative Agreement next actions, but Home's Continue does not yet resolve through them.

### Root cause E — deep capabilities have grown as separate experiences

Money, Vision, Store, Community, Projects, Notifications, Account and support are each substantial experiences. This is technically healthy separation, but it has become human-visible separation.

The strongest example is Community: `src/features/community/CommunityExperience.tsx` is a large application surface with membership, LIVE, Circles, Circle stewardship, search scopes, conversation, Circle Board, Community objects and discovery.

The same pattern appears at lower scale in Vision Library, Money and Account.

The user's mental model becomes “learn SecurePay” rather than “use SecurePay to get something done.”

### Root cause F — truthful detail is often presented before its moment

The product has correctly invested in honesty:

- version pinning;
- evidence provenance;
- money authority;
- participant identity;
- review state;
- source state;
- availability;
- financial eligibility.

The issue is not that those facts exist. The issue is that some are shown before the person needs them.

**Phase 1 conclusion:** the existing product needs human-experience convergence, not a capability rewrite.

---

## 2. Human Experience Constitution

The permanent design contract is stored separately in:

`docs/HUMAN_EXPERIENCE_CONSTITUTION.md`

The governing rules are:

1. **Expose the outcome, not the machinery.**
2. **SecurePay always knows what matters next.**
3. Start with human intent, not module choice.
4. Show the thing being made.
5. One meaningful decision at a time.
6. KS001 thinks before asking.
7. Continue means “take me to what needs me.”
8. Complexity is earned by need.
9. Quiet and whitespace are valid product states.
10. Human language describes consequences; internal language remains underneath.
11. Truth and authority remain server-owned.
12. Safety should feel like confidence, not paperwork.
13. Product areas are capabilities, not compulsory destinations.
14. Home answers “What do you want to get done?” and “What needs you now?”
15. The deeper the system becomes, the smaller the ordinary surface should become.
16. Human support appears at the point of need.
17. The person's artifact survives every transition.

Every future screen must pass the ten-question screen test and the 70% test in the Constitution.

---

## 3. Current experience map

### 3.1 Signed-out entry

**Source:** `src/features/public/PublicHome.tsx`, `src/components/SignedOutHome.tsx`

The public experience begins strongly with KS001 and the shared SecurePayHero. However, the page then expands into:

- How SecurePay works;
- The Trust Project;
- Member / Plug / Master;
- possibilities;
- Stores and Community;
- For Business;
- Fair Trade principles;
- Join;
- footer navigation.

This is appropriate as a public explanatory website, but the first action must remain visually sovereign. Public explanation must not leak into the operating experience once the person has started doing work.

**Classification**
- KS001 entry composer: **A — Essential now**
- Example outcome: **B — Contextual / reassurance**
- + source intake: **B — Contextual**
- long public explanation chapters: **C — On request / below first task**
- system doctrine: **C/D depending context**

### 3.2 Signed-in Home

**Primary runtime source:** `src/features/agent/AgentExperience.tsx` uses `SignedOutHome` with `variant="app"`.

This is already closer to the target than older signed-in dashboard work:

- one hero;
- one composer;
- explicit Continue;
- source intake;
- a sample Agreement output.

However it still presents:

- four quick-start tiles;
- Fair Trade affordance;
- ExampleOutcome;
- Continue Building list;
- Trust Project section;
- permanent module navigation;
- an “Activate SecurePay” doorway rendered by the shared signed-in component.

There is also a second signed-in Home composition in `src/components/SignedInHome.tsx`, used by `WorkspaceExperience`, containing:

- Need you / Waiting / Moving counters;
- invitations;
- attention;
- waiting;
- problems;
- events;
- recent activity;
- Money summary;
- suggested prompts.

This means the codebase currently contains **two materially different Home philosophies**.

**Classification**
- “What do you want to make real?” / composer: **A**
- one Continue item that truly needs the person: **A**
- source intake: **B**
- quick-start tiles: **C or E**; useful examples, but they compete with natural intent
- sample Agreement: **C**
- Fair Trade principles: **C**
- saved-build library/list: **B/C**
- Trust Project explainer on signed-in operating Home: **C**
- analytics/counters Home model: **B/C**, not canonical Home
- Activate SecurePay in already signed-in app Home: **B/E pending activation-state verification**
- permanent module navigation: **B/C**, not primary routing mechanism

### 3.3 KS001 conversation / Add/source experience

**Source:** `src/features/agent/AgentExperience.tsx`, `src/features/sources/*`

Current desktop architecture shows:

- conversation;
- permanent “What SecurePay understands” panel;
- emerging Agreement;
- source controls;
- next-step/review;
- Refresh;
- Save for later.

Mobile turns this into BUILD | UNDERSTOOD tabs.

This is the primary overload point.

The source intake itself is strong: it supports document/photo/plan/link/place and preserves failure state rather than pretending a file was read.

**Classification**
- conversation: **A**
- active artifact / Agreement taking shape: **A**
- current server-owned next question: **A**
- + source intake: **B**
- source lifecycle error/retry: **B**
- source provenance summary: **C**
- permanent UNDERSTOOD panel: **C**
- raw structured fact editing: **C**
- Refresh as a routine human action: **E/B only for recovery**
- Save for later: **B**
- + New: **B**
- Fair Trade compass: **C**

### 3.4 Agreement formation and review

**Source:** `src/features/formation/AgreementShaping.tsx`, `AgreementReview.tsx`

This is one of the strongest existing foundations.

AgreementShaping already does the desired thing:

- shows a document taking shape;
- states whether it is ready for review;
- exposes the actual next step;
- can show one useful thing to settle.

AgreementReview presents a printable human document and keeps correction conversational.

The overload appears in secondary details:

- version number;
- evidence provenance;
- identity/link state;
- needs checking;
- open points;
- correction controls;
- setup status.

These are valid but should be progressively disclosed or surfaced only when relevant.

**Classification**
- Agreement title/summary/current terms: **A**
- unresolved material issue: **A**
- one primary next action: **A**
- “Draft / not agreed” consequence: **A**
- print: **B**
- correction via KS001: **B**
- evidence provenance: **C**
- version number/digest concepts: **D/C**
- identity technical state: **B/C**
- historical source values: **C**
- technical lifecycle wording: **D**

### 3.5 Invitation / acceptance / negotiation / signing

**Sources:** `src/features/invitations/InvitePanel.tsx`, `src/features/recipient/RecipientExperience.tsx`, Agreement workspace/confirmation components

The implementation has careful truth boundaries: an invitation is a doorway, not agreement; viewed is not joined; identity and confirmation are separate.

The human-experience opportunity is to preserve that truth while turning these stages into a continuous Agreement journey.

The person should not feel that they left “their bathroom agreement” and entered an Invitation product.

**Classification**
- “Peter has been invited / Peter responded”: **A/B depending state**
- response or acceptance required now: **A**
- invitation status history: **C**
- invitation mechanics/IDs: **D**
- revoke/remind controls: **B when applicable**
- signing/confirmation consequence: **A**
- version authority mechanics: **D/C**

### 3.6 Living Agreement / evidence / progress / review

**Sources:** `src/features/workspace/WorkspaceExperience.tsx`, `LivingAgreementOverview.tsx`, `src/features/execution/*`, `src/features/review/*`

The workspace contains genuine operational capability: people, progress, evidence, amendments, review, money, support and SecureLink-related functions.

Today these are still largely presented as areas/tabs/panels the person must learn.

Future interaction should bring the relevant one forward:

- work started → progress;
- someone says complete → inspection/evidence;
- disagreement → review;
- change proposed → amendment;
- money ready → Money action.

**Classification**
- current Agreement and current next action: **A**
- active change/review/evidence request: **A/B**
- full activity/history: **C**
- all operational tabs visible by default: **C**
- technical version lineage: **D/C**
- specialist records: **C**

### 3.7 Money

**Sources:** `src/features/money/MoneyExperience.tsx`, `SimpleMoneyDashboard.tsx`

Money now contains substantial, truthful capability:

- choose Agreement;
- Agreement amount;
- next action;
- money position;
- funding;
- payment readiness;
- release;
- movement;
- routes;
- charges;
- settlement;
- financial partners;
- technical/administration record.

The page has already begun progressive disclosure through “Technical & administration record” and “Full money record.” That is directionally correct.

The remaining problem is that **Money is still a destination first**. A user can be asked to pick an Agreement and interpret financial state rather than arriving from the Agreement that created the financial need.

**Classification**
- selected Agreement's amount and current financial consequence: **A**
- one authorised Money action: **A**
- current funded/released/remaining state when relevant: **B**
- four simultaneous status cards: **C/B**
- Agreement selector/search: **C** when entered contextually; **A** only for deliberate Money browsing
- routes/charges before a movement is being considered: **C**
- settlement/admin record: **C**
- internal authority mechanics: **D**
- permanent Money top-level choice: **C**, preserve specialist access but do not make it a prerequisite

### 3.8 Vision

**Sources:** `VisionDreamHome.tsx`, `VisionBoardExperience.tsx`

The Dream Home is comparatively human:

> Think freely. Keep what matters.

The deeper Vision Library exposes internal taxonomy:

- IDEA;
- PLAN;
- BUSINESS_RULE;
- METHOD;
- TEMPLATE;
- REFERENCE_DOCUMENT;
- GUIDELINE;
- usage policies;
- lock/unlock;
- version/supersede;
- shelves;
- fulfilment need privacy/pooling controls.

These are useful operating-memory capabilities, but much of the taxonomy is system-facing.

**Classification**
- dream/thought itself: **A**
- “What are you trying to move forward?”: **A**
- continue the dream: **A/B**
- find options when the dream needs something real: **B**
- search/library: **C**
- item type taxonomy: **D/C**
- usage policy: **C**
- lock/version/supersede: **C**
- fulfilment privacy/pooling mechanics: **B/C only at decision moment**

### 3.9 Store

**Source:** `src/features/store/StoreExperience.tsx` and Store components

The Store supports:

- discovery/search;
- offer preview/detail;
- “Use this” handoff into trade;
- Store management;
- create/edit offers;
- business Store authority;
- availability;
- fulfilment opportunities;
- Plug-related availability.

The key positive is that Store already hands an offer into the same Agent conversation rather than directly creating an Agreement.

The human-experience issue is that Store is still presented as a major standalone product surface instead of often appearing contextually from a need.

**Classification**
- relevant offer in response to an active need: **A/B**
- offer facts: **A**
- “Use this” / continue toward Agreement: **A**
- browse/search Store: **B/C**
- manage Store: **B**
- offer administration: **C for ordinary users / A for Store operator at that moment**
- business authority mechanics: **C/D**
- Plug/fulfilment opportunity machinery: **B/C**

### 3.10 Community / Circles

**Source:** `src/features/community/CommunityExperience.tsx`

Community contains many valid capabilities:

- Trust Project membership;
- LIVE;
- named Circles;
- requests/invitations;
- stewardship;
- Circle lifecycle;
- Circle conversation;
- Circle Board;
- Community objects;
- search;
- Store/person discovery;
- service opportunities/projects;
- Community → Trade handoff;
- KS001 within Circle context.

It is currently the largest single human-facing complexity surface audited.

There is also a naming collision documented in source: named Trust Project Circles coexist with an older unrelated referral/growth “Circle profile” entry.

**Classification**
- current community object/person/Circle the human came for: **A**
- relevant participation action: **A**
- LIVE/Circle discovery: **B/C**
- Circle stewardship controls: **B only for stewards**
- lifecycle controls: **C**
- global scoped search taxonomy: **C**
- member-management administration: **C**
- Community → Agreement handoff: **A/B when chosen**
- internal membership/authority mechanics: **D/C**
- legacy/new Circle naming collision: **E — resolve terminology/route ambiguity**

### 3.11 Plug / Master / human assistance

**Source:** `src/features/ecosystem/EcosystemExperience.tsx` and Plug/Master feature components

Plugs and Masters are currently reached through an ecosystem/help router or Agreement support context.

This should move further toward contextual assistance:

> “A Plug can help verify and coordinate this Community Saver.”

rather than:

> “Go learn the Ecosystem section.”

**Classification**
- relevant human help recommendation with reason/rate/availability: **A/B**
- browse all support capacities: **C**
- referral mechanics: **C**
- internal matching criteria: **D**
- qualification/authority proof when needed: **B/C**

### 3.12 Projects

**Source:** `src/features/projects/ProjectsExperience.tsx`

Projects are explicitly private organizational folders, not project-management authority.

The current interface asks for an owner KS Number and exposes create/archive/restore/add Agreement controls.

This is useful organization, not a primary human journey.

**Classification**
- current project context when user deliberately organizes work: **B**
- project folder operations: **C**
- typed own KS Number in routine use: **E if identity is already known**
- backend owner/authority resolution: **D**

### 3.13 Notifications

**Source:** `src/features/notifications/NotificationsExperience.tsx`

Notifications already uses a good conceptual split:

- Needs you;
- Updates;
- Community;
- Earlier.

This is a valuable source for “What needs you now?” but should not require a user to inspect the Notification module to discover the next important action.

Preferences and quiet hours belong in secondary settings.

**Classification**
- unresolved action-required event: **A/B**
- updates: **C**
- preferences: **C**
- delivery-channel mechanics: **C/D**

### 3.14 Account / identity

**Source:** `src/features/account/AccountExperience.tsx`

Account contains:

- identity;
- subscription;
- password/security;
- businesses/organizations;
- links to Notifications, Settings, Projects, Vision, Business, Developer, Support.

This has become a secondary directory for additional product areas.

Account should remain available but should not be a hidden sitemap required to discover major capabilities.

**Classification**
- identity/security when deliberately opened: **A**
- subscription: **B**
- business/organization representation: **B**
- Developer/Connect: **C**
- links used as product navigation directory: **C/E depending replacement**
- security actions: **A/B when needed**

### 3.15 Help & Support

**Source:** `src/features/support/SupportExperience.tsx`

Help is explicitly a routing/truth surface, not a support ticket. It tells the user to open Agreement, Reviews, Money, Store, Community or ask SecurePay.

This is truthful, but it illustrates the architectural problem: the human has to understand which subsystem contains the answer.

Future Help should first let KS001 resolve the question from context and only expose specialist destinations when necessary.

**Classification**
- current-context help: **A/B**
- “what you can do” routing list: **C**
- architecture explanation: **C/D**
- explicit “no human support request exists”: **A when user seeks human support**

### 3.16 Skills Institute

No dedicated Skills Institute / training frontend path was found in the recursive `SecurepayLLM@dfdc6bf` source tree.

**Audit status: UNRESOLVED / not present as a separate current frontend surface.**

This does **not** establish that backend/domain work does not exist. It means Phase 1 cannot truthfully classify a current Skills Institute UI that is not present in this frontend baseline.

Phase 2 must not invent a new Institute surface. Its eventual human role remains:

> What do you want to become capable of?

---

## 4. Complexity inventory — condensed product classification

| Area | Essential now | Contextual | On request | Internal / remove from ordinary view |
|---|---|---|---|---|
| Home | intent composer; one real Continue | + sources; one urgent item | examples; saved work library | module directory; decorative counters |
| KS001 | conversation; artifact; next question/action | source error; conflict | structured understanding; provenance | routine Refresh; internal reasoning |
| Agreement | actual Agreement; unresolved material point; next action | invitation/change/evidence/review | history; evidence detail; print | digest/internal states |
| Money | Agreement-linked amount/consequence/action | funding/release state | full record; routes; charges; partners | authority internals |
| Vision | dream/idea; next useful step | relevant need/options | library/search/version tools | taxonomy as mandatory input |
| Store | relevant offer/need; use/continue | browse/manage when intended | offer administration | matching machinery |
| Community | relevant person/Circle/object/action | discovery/participation | stewardship/admin/search scopes | membership machinery; duplicate Circle concepts |
| Plug/Master | relevant assistance at point of need | availability/cost/fit | browse programmes | matching/routing internals |
| Projects | selected project context | organization tools | archive/calendar | typed identity already known |
| Notifications | genuine action-needed item | deadline/update | preferences/history | channel implementation details |
| Account | identity/security when opened | business/subscription | Developer/Connect/settings | secondary sitemap behavior |
| Support | contextual answer/action | specialist handoff | system records | module-routing education |
| Skills Institute | not auditable on current frontend | — | — | do not invent |

---

## 5. Navigation audit

### Failure 1 — top navigation teaches modules before intentions

A person can choose Money before an Agreement exists, Community before knowing what they need from it, or Store before a need has been framed.

**Change direction:** retain deep-link/specialist routes, remove their status as the primary operating model.

### Failure 2 — desktop conversation requires simultaneous operation of BUILD and UNDERSTOOD

The split workspace asks users to interpret SecurePay's structured cognition.

**Change direction:** artifact/conversation becomes primary; structured understanding becomes contextual inspection.

### Failure 3 — mobile explicitly teaches BUILD | UNDERSTOOD

These are internal product concepts, not human outcomes.

**Change direction:** no permanent cognition-mode tabs.

### Failure 4 — Agreement-related actions send users across product areas

Money, Review, Support, Store and human help can feel like different products.

**Change direction:** preserve the Agreement/work artifact and bring the relevant capability into its context.

### Failure 5 — Help routes by architecture

Help currently teaches where things live.

**Change direction:** KS001 resolves “what do I need?” first; specialist screens become secondary.

### Failure 6 — Account acts partly as a sitemap

Projects, Vision, Business, Developer and Support are discoverable as Account tiles.

**Change direction:** Account becomes identity/security/representation. Capabilities are found through intention or contextual routes.

### Failure 7 — Continue does not yet mean “what needs me”

It restores the current conversation, not the authoritative next action across the work.

**Change direction:** formal Continue contract below.

---

## 6. “What matters next” model

### 6.1 Principle

“What matters next” is a **presentation/orchestration decision over authoritative facts**, not a new source of truth.

The UI must never invent a task because it seems plausible.

### 6.2 Inputs

A candidate next action may come from authoritative sources such as:

- Agreement participant next actions;
- Agreement formation `NextQuestion`;
- review/open-point state;
- invitation state;
- notification purpose/importance/action reference;
- known source ingestion failure requiring recovery;
- saved-build existence;
- Money authority/readiness projection;
- execution/evidence state;
- explicit user intent in the active conversation.

### 6.3 Candidate rule

A candidate is eligible only if:

1. SecurePay can identify the work it belongs to;
2. the user is authorised to see it;
3. a server/domain authority says the action/state exists, or it is a purely local continuation such as reopening a saved build;
4. the UI can explain the action in ordinary consequence language;
5. clicking it has a deterministic destination.

### 6.4 Priority classes

Priority must not be inferred from domain importance alone.

Use available authority in this order:

1. **Blocking / safety / explicit action-required** — an authoritative action blocks progress or protects money/consent/identity.
2. **Direct response required** — another participant, invitation, review or change is waiting on this person.
3. **Deadline-bound action** — authoritative action has a deadline.
4. **Current-work material question** — server-owned formation next question.
5. **Ready-to-progress action** — review, sign, inspect, fund, release, complete.
6. **Resume unfinished work** — saved/current build with no stronger required action.
7. **Informational update** — never outranks a real action.

Within equal class, use server-provided attention class/deadline when available. Avoid domain-specific client guesses.

### 6.5 Output contract

The visible projection should be small:

```ts
type HumanNext = {
  workId: string
  workKind: string
  title: string
  headline: string
  detail?: string
  primaryLabel: string
  destination: AuthoritativeDestination
  source: AuthoritativeSource
}
```

This is a UI projection, not an authority engine.

### 6.6 Important backend finding

The backend already provides two major pieces of this model:

- `WorkspaceNextActionResponse` and `CurrentUserAgreementWorkspaceService` expose participant-safe authoritative per-Agreement next actions.
- `AgreementFormationView.NextQuestion` plus `QuestionPlanner/QuestionDiscipline` already provides one server-owned question and suppresses repeats/unplanned questions.

**No single cross-domain global “next thing” API was identified in this audit.**

Phase 2 should therefore compose existing authoritative signals conservatively for navigation/presentation only. A later intelligence phase may introduce a server-owned cross-domain projection if global ranking needs to become business authority rather than UX ordering.

---

## 7. Continue contract

### Definition

> **Continue takes the person to the most relevant unresolved human action for the work, not to a generic product page.**

### Continue must carry

- work identity;
- current authoritative state version when relevant;
- the source of the next-action truth;
- destination/action reference;
- human headline;
- consequence/detail;
- fallback if the state changes before opening.

### Examples

| State | Continue shows | Opens |
|---|---|---|
| Formation question | “When should the tiler be paid?” | exact question |
| Agreement reviewable | “Your agreement is ready to review.” | Agreement review |
| Other party proposed change | “Peter suggested a different payment arrangement.” | exact change decision |
| Signature/confirmation needed | “You both agree. Review and sign.” | exact confirmation |
| Evidence required | “Peter says the work is complete. Check it.” | exact obligation/evidence |
| Money action | “KES 55,000 can now be funded/released.” | exact authorised Money action |
| Invitation | “Lucy invited you to join this Agreement.” | invitation review |
| Saved build only | “Continue bathroom renovation.” | saved conversation/artifact |

### Changed-state rule

If state changes between Home and click:

1. re-read authority;
2. do not execute stale action;
3. route to the new current action;
4. explain briefly if the change matters.

### No-action rule

If nothing currently needs the person:

> **You're caught up.**

Then “Continue” may become a quiet list of recent/saved work, not a fabricated task.

---

## 8. KS001 human interaction contract

### KS001 should understand silently

- already confirmed/stated facts;
- Trade Context;
- source-derived candidate facts;
- prior answers;
- Agreement state/version;
- participant/identity state;
- existing Money state;
- capability truth;
- current page/work context;
- previous question ledger;
- existing open points;
- verified Store/Community source provenance.

### KS001 should ask

Only when the answer is materially needed now and cannot safely be obtained from existing truth.

Prefer the existing server-owned `NextQuestion`.

### KS001 should clarify

When:

- evidence conflicts;
- authority is ambiguous;
- a material term has multiple plausible interpretations;
- a consequential action cannot be safely chosen without the person.

### KS001 should present

- the actual artifact;
- the consequence of new information;
- one useful question/action;
- a short acknowledgement after the human acts.

### KS001 should recommend

Only from verified capability truth and current context.

Recommendation language must say **why it fits now**, not advertise SecurePay features.

### KS001 should escalate

To Plug/Master/support/review only when:

- the need is real;
- the capability exists;
- the human can understand why escalation helps;
- consent/action remains explicit.

### KS001 should stay quiet

When:

- the artifact already communicates the result;
- there is no material question;
- the information is internal machinery;
- another action is more important;
- the user already answered;
- the user chose to leave a point open and policy allows it.

---

## 9. Progressive disclosure rules

### Agreements

**Default:** artifact + status consequence + one next action.  
**Reveal when relevant:** participant response, change, evidence, review.  
**On request:** history, provenance, versions.  
**Internal:** digest, implementation state, routing identifiers.

### Money

**Default:** what this Agreement requires financially + current authorised action.  
**Reveal when relevant:** funding amount, charges before payment, release condition, failed movement.  
**On request:** full ledger/settlement/partner record.  
**Internal:** provider and authority implementation details.

### Evidence

**Default:** “This needs proof / Peter submitted proof / check this.”  
**On request:** source name, timestamps, detailed evidence trail.  
**Internal:** storage/provenance implementation details.

### Identity

**Default:** person/business name and whether SecurePay can verify who they are where that matters.  
**Reveal:** authority/representation when acting for a business or signing.  
**On request:** deeper identity/representation record.  
**Internal:** IDs and resolution machinery.

### Risk / review

**Default:** human consequence (“This disagreement must be resolved before money can progress.”).  
**Reveal:** response choices/evidence when action is required.  
**On request:** formal review record.  
**Internal:** classification codes.

### Advanced controls

Place behind contextual details or specialist administration. They do not earn permanent visibility merely because they exist.

### Plug / Master

Surface only when the current work would benefit from a verified human role. Explain purpose before role vocabulary where possible.

### Store

Surface offers when the person has a need or deliberately browses. Store administration appears when the user is operating their Store.

### Community

Surface the relevant person/Circle/project/opportunity. Stewardship, lifecycle and membership administration remain role/context-bound.

### Vision

Start from the thought/dream. Library taxonomy, policy, locking and versioning appear only when the person is organizing or governing memory.

### Skills Institute

No current frontend surface was found. When implemented, entry should start from capability need, not course architecture.

---

## 10. Phase 2 build specification — The New SecurePay Shell

### 10.1 Objective

Create one calm operating shell where the person:

1. starts with intent;
2. sees one current work artifact;
3. sees one meaningful next action;
4. can continue work without learning SecurePay's module architecture;
5. can still reach deeper capabilities when deliberately requested.

Phase 2 must not redesign backend authority.

### 10.2 Canonical Home

Create one canonical signed-in Home composition.

**Primary block**
- small SecurePay/KS001 identity;
- headline: “What do you want to get done?” (wording may be tuned without changing meaning);
- universal composer;
- one quiet + control.

**Needs-you block**
- zero or one dominant Continue card;
- only if there is a real actionable/resumable item;
- card states exactly what needs the person.

**Secondary**
- “Other work” collapsed/listed only when needed;
- account/notifications quietly accessible;
- no metric dashboard.

Remove from primary Home:
- four permanent quick-start tiles;
- permanent example Agreement for returning signed-in users;
- broad Trust Project explanation;
- module cards;
- Need/Waiting/Moving counters;
- Money summary;
- repeated suggested prompts.

Public Home may retain explanatory chapters below its first working entry.

### 10.3 Navigation shell

Preserve routes and deep links. Do not delete capabilities.

**Desktop ordinary shell**
- SecurePay/Home;
- contextual title/work;
- quiet Notifications;
- quiet Account;
- optional “More” only if deliberate browsing remains necessary.

**Mobile ordinary shell**
- do not keep five domain tabs as the default mental model;
- Home/current work remains primary;
- account/notifications via quiet top controls;
- contextual destinations appear from work.

Specialist users can still navigate directly by URL or intentional secondary menus.

### 10.4 Active work shell

Replace the permanent two-plane BUILD/UNDERSTOOD architecture with:

**Primary plane**
- KS001 conversation;
- the actual artifact taking shape;
- one next question/action.

**Contextual detail**
- “What SecurePay understands” opens as an on-demand drawer/details surface;
- provenance/evidence stays there unless conflict makes it material.

Remove routine “Refresh” from primary controls. Automatic reads remain the default; explicit retry appears only on failure/uncertainty.

“Save for later” remains contextual, not co-equal with the main next action.

### 10.5 Artifact-first Agreement reference

Use the existing `AgreementShaping` and `AgreementReview` authority/model as the reference.

The first visible Agreement state should look conceptually like:

```
Bathroom tiling
Tiler                         KES 95,000

Work      Bathroom tiling
Payment   Still to agree

One thing needs your attention:
When should the tiler be paid?

[ When finished ] [ In stages ] [ After I inspect ]
```

No new backend Agreement state is required for this shell.

### 10.6 Continue resolver v1

Build a presentation resolver that consumes **existing** authoritative sources.

For Phase 2, scope it to:

1. active/current conversation formation question/review state;
2. saved build/current meaningful work;
3. invitation action;
4. Agreement `needsMe` / next actions;
5. action-required notification when it has a deterministic target.

Do not add Money/Community/Store client-invented tasks.

If multiple candidates exist, use attention/deadline and the priority model in this report. Record the selected source in development diagnostics, not user-facing UI.

### 10.7 Route preservation

All existing direct routes continue to resolve:

- Agreement;
- Money;
- Store/offer;
- Community/Circle;
- Vision;
- Account;
- Notifications;
- invitations;
- SecureLinks;
- recovery/support.

Phase 2 changes how ordinary users arrive, not the underlying authority.

### 10.8 Responsive behavior

At 320px:

- one primary column;
- no horizontal module nav;
- minimum 44px interactive targets;
- artifact before details;
- next action visible without switching cognitive modes;
- details may expand below or in an accessible modal/drawer.

Desktop:

- do not reintroduce the Understood plane merely because width exists;
- use width for readability, artifact preview and contextual space.

### 10.9 Error/loading rules

- loading never exposes placeholder architecture;
- error stays attached to the thing that failed;
- recovery action is local (“Try reading this document again”);
- failures do not eject the person to a generic dashboard;
- uncertain mutations retain existing idempotent “check what happened / try same request again” discipline.

### 10.10 Phase 2 acceptance journeys

At minimum certify:

1. “I need an agreement with my bathroom tiler for KES 95,000.”
2. start from uploaded minutes/document.
3. Continue an unfinished Agreement build.
4. receive an Agreement invitation.
5. other party proposes a material change.
6. Agreement ready to sign/confirm.
7. work marked complete and evidence needs review.
8. Money action becomes relevant.
9. no work needs attention.
10. source read fails and user recovers.
11. mobile 320/360/390.
12. desktop without permanent Understood split.

For each journey assert:

- one obvious primary action;
- artifact remains visible;
- no architecture knowledge required;
- no truth invented;
- deeper detail still reachable.

### 10.11 Explicit Phase 2 non-goals

Do not:

- rewrite SecurePayAPI;
- create a new global authority engine;
- redesign every feature surface;
- remove Store/Community/Vision/Money routes;
- implement Skills Institute;
- change Agreement or Money semantics;
- introduce new pricing/fees;
- merge/deploy automatically.

---

## 11. Backend confirmation

### Confirmed

1. **Agreement next action exists.**  
   `WorkspaceNextActionResponse` is participant-safe and includes action code, reason, deadline and attention class.

2. **Agreement workspace already uses authoritative next actions.**  
   `CurrentUserAgreementWorkspaceService` composes them from `ParticipantNextActionService` rather than inventing a UI action engine.

3. **Formation already produces one next question.**  
   `AgreementFormationView.NextQuestion` is explicitly the one question SecurePay needs next.

4. **Question discipline already suppresses unnecessary/repeat questions.**  
   `QuestionDiscipline` removes ceremonial confirmations, repeated questions and unplanned known-topic questions.

These findings strongly support the new experience model without a Phase 1 backend rebuild.

### Not confirmed / later decision

1. A single authoritative cross-domain “what matters next” projection was not identified.
2. Skills Institute frontend status is not represented in the audited frontend tree.
3. Whether activation should appear for a signed-in user must be resolved against subscription/activation product state.
4. Community's legacy “Circle profile” terminology should be reconciled with Trust Project named Circles.
5. Some specialist capabilities may still require direct navigation for administrators; Phase 2 must preserve this without making it the ordinary person's primary map.

---

## 12. Contradictions discovered

1. **“One intentional entry object” vs permanent module navigation.**
2. **“Keep hard parts underneath” vs permanent UNDERSTOOD operating plane.**
3. **Server-owned one-question discipline vs many simultaneous frontend controls.**
4. **Continue separated from Start New vs Continue only restoring a conversation rather than resolving next action.**
5. **Two signed-in Home philosophies exist:** the runtime KS001 Home and the older dashboard-style `SignedInHome`.
6. **Money progressively hides technical records but remains a top-level module the human must choose.**
7. **Account says it is not a settings dumping ground but also functions partly as a directory to Projects, Vision, Business, Developer and Support.**
8. **Community has two different Circle concepts in source vocabulary.**
9. **Signed-in runtime reuses a component named `SignedOutHome` and appears to render an activation doorway; naming and state intent are no longer clear enough.**

---

## 13. Risks to the redesign

### Risk: oversimplification hides consequence

Mitigation: consequence-first copy plus one-tap detail. Never hide information required for informed consent.

### Risk: frontend invents “next action”

Mitigation: only surface authoritative/domain-backed candidates; no synthetic financial or agreement readiness.

### Risk: specialist users lose efficiency

Mitigation: preserve routes and secondary direct access; simplify ordinary default path rather than delete specialist tools.

### Risk: all product areas get rebuilt at once

Mitigation: Phase 2 builds only the shell; Phase 3 perfects Agreement as the reference journey before broad migration.

### Risk: beautiful minimalism becomes empty/opaque

Mitigation: always keep the actual artifact/work visible and explain the consequence of the next action.

### Risk: old and new Home/route models coexist

Mitigation: Phase 2 must nominate one canonical shell and retire duplicate composition paths rather than layer another Home on top.

---

## 14. Completed audit coverage

| Requested area | Status |
|---|---|
| Signed-out entry | Audited |
| Signed-in Home | Audited; duplicate models identified |
| KS001 conversation | Audited |
| Add/source | Audited |
| Agreements | Audited |
| Agreement creation/formation | Audited |
| Agreement review | Audited |
| Agreement continuation | Audited |
| Invitation | Audited |
| Acceptance/negotiation | Audited at experience/authority seam |
| Signing/confirmation | Audited at Agreement flow seam |
| Living Agreement | Audited |
| Evidence/progress | Audited |
| Money | Audited |
| Vision Board/Dream | Audited |
| Store | Audited |
| Community | Audited |
| Circles | Audited |
| Skills Institute | Not present as dedicated frontend surface; unresolved |
| Account/identity | Audited |
| Notifications | Audited |
| Plug/Master | Audited at ecosystem routing seam |
| Empty/loading/error states | Audited across major experiences |
| Mobile/responsive | Audited structurally from navigation/workspace code |
| Navigation | Audited |
| Backend truth required for next-action/question model | Confirmed |

### Limitation

This Phase 1 pass is source-grounded against current `main`. It is not a fresh cross-browser production certification of every screen state. Human certification belongs to Phase 6 after the new interaction model exists.

---

## 15. Final Phase 1 gate

### Visible human layer

- intent;
- actual work/artifact;
- one material question;
- one material action;
- human consequence;
- necessary participant/money/evidence facts.

### Contextual layer

- sources;
- conflicts;
- invitations;
- changes;
- evidence;
- Money state;
- human support;
- Store/Community options;
- saved work;
- specialist actions.

### Hidden intelligence layer

- question planning;
- sufficiency;
- capability truth;
- authority;
- versioning;
- identity resolution;
- evidence lineage;
- risk/review machinery;
- Money authority;
- matching/routing;
- internal taxonomies.

### Rule connecting them

> **The hidden layer earns visibility only when it changes what the human needs to understand or do now.**

## Recommendation

# **PASS — begin Phase 2**

Phase 1 has enough source evidence to proceed.

The key reason for PASS is that the desired experience is not blocked by a missing intelligence foundation. The frontend is exposing too much of machinery that the backend already knows how to govern.

Phase 2 should build **The New SecurePay Shell** and stop there. It must not automatically proceed into the full Agreement redesign or broader product migration until the shell is reviewed.
