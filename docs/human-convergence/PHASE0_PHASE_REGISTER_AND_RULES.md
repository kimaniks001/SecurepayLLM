# SecurePay Human Convergence — Anti-Dilution Rules & Phase Register

## Permanent anti-dilution rules

### 1. Scope isolation
When working on one phase, do not redesign another major product area.

If another problem is discovered:
- record it;
- classify severity;
- assign it to its later phase;
- do not fix it opportunistically.

### 2. Backend restraint
SecurePayAPI is backend authority.

Do not modify API merely to make frontend work easier.

API work is allowed only when:
1. required human information genuinely cannot be obtained;
2. the limitation is demonstrated against current API source;
3. the missing contract is stated precisely;
4. the API change is explicitly approved as its own task.

### 3. Capability preservation
No simplification may remove or weaken:
- an existing entry point;
- user authority;
- meaningful state;
- actionability;
- auditability;
- access to deeper detail.

### 4. Progressive disclosure
Complexity may move deeper. Capability may not silently disappear.

### 5. Human language
People should not need endpoint names, backend domain terms, architecture, internal object names or provider implementation details unless those details are genuinely relevant to the task.

### 6. Navigation restraint
Before navigating to a full page ask whether the intention is satisfied by:
- preview;
- quick action;
- inline response;
- contextual sheet.

### 7. Scalability
Every repeated-record pattern must be reasoned about at:
- 3 records;
- 20 records;
- 100 records;
- 1,000 records.

This is a human interaction test, not a requirement to render 1,000 records at once.

### 8. Authority preservation
Human simplification must never convert:
- coordination into Agreement authority;
- notification resolution into domain action;
- UI inference into Money authority;
- external messaging delivery into source-of-truth state;
- Master/Plug advice into automatic Agreement/money mutation.

### 9. Five-second rule
Every primary surface must make three things appropriately clear within about five seconds:
1. What am I looking at?
2. What needs me?
3. What can I do next?

### 10. Human-size certification before polish
P0/P1 scenarios must pass before aesthetic or motion polish can close a phase.

---

# Phase Register

## Phase 1 — Agreements

### Problems assigned
- HV-P0-01 browse-friendly preview missing.
- HV-P0-02 find/search/list-scale human certification.
- HV-P0-03 reviews/issues/support not reliably promoted when action-required.
- HV-P1-01 milestone/effective-state clarity.
- HV-P1-02 pending amendments need context promotion.
- HV-P1-03 evidence/review depth.
- HV-P1-04 Agreement → Money handoff clarity.

### Preserve
- Agreement search/list authority and pagination.
- Lifecycle/status.
- current version and confirmations.
- people/participants.
- purpose/terms.
- milestones/obligations.
- next actions.
- evidence + review.
- documents.
- changes/amendments + diff/accept/reject.
- calendar/conflicts/tags.
- reviews/disputes/support.
- SecureLink/public doorway.
- Plug attribution/referral status.
- Money handoff.
- KS001 Agreement context and access-grant boundaries.

### Human scenarios
HC-01, HC-02, HC-03, HC-18, HC-19.

### Dependencies
Current Agreements frontend/API only. No known API change required for the preview/search work.

### Explicitly out of scope
Money layout redesign, Vision, KS001 entry, Store, Plug/Master discovery, Skills Institute, Financial Institutions, generic Notifications redesign.

---

## Phase 2 — Money

### Problems assigned
- HV-P0-04 immediate movement answer competes with architecture.
- HV-P0-05 charges too permanently prominent.
- HV-P0-06 Agreement selector interaction does not scale.
- HV-P0-07 release/settlement action promotion.
- HV-P1-05 consistent money-glance hierarchy.
- HV-P1-06 funding action promotion.
- HV-P1-07 settlement destination detail level.
- HV-P1-08 rail/provider terminology dominance.

### Preserve
- Agreement ownership/context.
- authorised maximum.
- funded / remaining.
- progressed/earned.
- released/returned.
- Payment Ready.
- movement preflight.
- funding.
- version-bound quote flow.
- SecurePay/provider charges.
- payment attempts.
- settlement destination.
- release/settlement.
- M-PESA/PesaLink/partner-bank support.
- strict backend authority and economic refusal rules.

### Human scenarios
HC-08, HC-09, HC-10, HC-20.

### Dependencies
Phase 1 Agreement preview/handoff pattern should be stable. Current API already exposes paginated Agreement summaries and required Money truth.

### Explicitly out of scope
Changing provider economics, adding rails, changing Money authority, Store/Vision redesign.

---

## Phase 3 — Vision

### Problems assigned
- HV-P0-08 Add/Search first-use discoverability.
- HV-P1-09 quotation/invoice/receipt discoverability.
- HV-P1-10 Store matching/fulfilment contextual entry.
- HV-P1-11 link/place/add-source coherence.
- Vision version/lock wording P2 issues.

### Preserve
- shelves.
- items.
- search.
- create/update.
- lock/unlock.
- supersede/version lineage.
- quotation/invoice/receipt.
- Store matching.
- fulfilment needs/routes.
- Community Saver preference.
- Business Vision ownership/acting context.
- privacy/provenance.

### Human scenarios
HC-06, HC-07, HC-21.

### Dependencies
Phase 2 does not need to complete technically, but shared progressive-disclosure language should not be contradicted.

### Explicitly out of scope
KS001 source-ingestion redesign, Store owner redesign, Plug/Master, Institute.

---

## Phase 4 — KS001 Entry

### Problems assigned
- HV-P0-09 source-ingestion doorway not permanently guaranteed.
- HV-P1-12 link/place sources secondary.
- HV-P1-13 correction/review discoverability.
- save/resume/continuity friction where found.

### Preserve
- anonymous/signed-in conversation continuity.
- pasted text.
- document upload.
- photo upload.
- link source.
- place source.
- source list/get/retry/remove.
- history.
- Trade Context.
- emerging Agreement formation.
- structured inputs/instruments.
- identity selection.
- correction/unlink/open-point check.
- save/resume.
- Agreement handoff/review/version protection.
- selected commercial source and current-source protection.

### Human scenarios
HC-04, HC-05 plus source/review extensions.

### Dependencies
Phase 1 Agreement handoff expectations and Phase 3 Vision source language should be known, but this phase owns entry behavior only.

### Explicitly out of scope
Agreement browsing, Money page, Store owner workflow, Community redesign.

---

## Phase 5 — Store

### Problems assigned
- HV-P0-10 Add offer prominence.
- HV-P1-14 availability action promotion.
- HV-P1-15 opportunities/demand-match hierarchy.
- HV-P1-16 fulfilment/supply-route human language.
- P2 Mini Agreement / Business Store / edit-offer depth.

### Preserve
- Store profile.
- create/update offers.
- availability.
- opportunities.
- fulfilment needs.
- matches/routes.
- Mini Agreement review.
- Business Store.
- Plug missions/supplier proposals.
- Community Saver boundaries.
- Store → Agreement canonical handoff.

### Human scenarios
HC-11, HC-12 and Store-side HC-21.

### Dependencies
Vision fulfilment handoff vocabulary from Phase 3.

### Explicitly out of scope
Plug/Master human discovery, generic Projects, Money redesign.

---

## Phase 6 — Plug / Master / Projects

### Problems assigned
- HV-P0-11 Plug help buried.
- HV-P0-12 Master discovery requires reference/id.
- HV-P0-13 Master request buried.
- HV-P0-14 Project context not surfaced from active work.
- HV-P1-17 Plug candidate/relationship depth.
- HV-P1-18 Plug availability visibility.
- HV-P1-19 Master opinion/request machinery depth.
- HV-P1-20 Projects reachable mainly via Account.
- HV-P1-21 Agreement↔Project linking buried.

### Preserve
- Plug request/candidates/selection/relationship.
- Plug availability.
- missions/supplier proposals.
- referral/standing.
- Agreement attribution.
- Master profile/request/cost/accept/decline/opinion.
- Master statutory/licence disclaimers.
- private Project create/list/search/update/archive/restore.
- Project Agreement references.
- project summary/calendar.
- authority separation: Plug/Master advice cannot change Agreement/Money automatically.

### Human scenarios
HC-14, HC-15, HC-16.

### Dependencies
Agreement context surfaces from Phase 1; Store contextual help from Phase 5.

### Explicitly out of scope
Skills Institute learning UI, institution onboarding, generic Notifications.

---

## Phase 7A — Skills Institute

### Problems assigned
- HV-P0-15 no public learning/awareness frontend.
- HV-P0-16 no participation journey frontend.
- HV-P1-22 program/session publishing frontend absent.
- HV-P1-23 learning/project learning/Master backing/knowledge candidate frontend absent.

### Preserve
All current SecurePayAPI Institute authority:
- spaces/assets.
- public awareness.
- public search/read.
- learn.
- programs/sessions.
- participation/access grants.
- steps/evidence/review/completion.
- publishing.
- indexing.
- project learning/spaces.
- Master backing.
- knowledge candidates.

### Human scenarios
HC-26 plus programme participation scenarios to be added in Phase 7A.

### Dependencies
Current API appears rich enough for a first-party experience, but Phase 7A must verify every required frontend contract before declaring API sufficiency.

### Explicitly out of scope
Changing Institute commercial rules, AI provider architecture, unrelated Community or Master redesign.

---

## Phase 7B — Financial Institutions

### Problems assigned
- HV-P1-24 institution enrollment has gateway but no human experience.
- HV-P1-25 capability lifecycle is backend-only in the first-party human product.

### Preserve
- institution enrollment authority.
- representative/authority evidence requirements.
- institution classes.
- onboarding status.
- capability applications.
- capability listing.
- operations transition authority boundaries.
- no implication that enrollment alone enables rails/finance.

### Human scenarios
HC-25 plus capability-review/operations scenarios added in Phase 7B.

### Dependencies
Business/Organization representation and authorization must remain intact.

### Explicitly out of scope
Money provider economics, new institution types/capabilities, changing regulatory authorization.

---

## Phase 8 — Notifications / reviews / disputes / contextual actions

### Problems assigned
- HV-P1-26 unnecessary navigation from actionable notifications.
- HV-P1-27 Circle inline-response pattern not generalized where appropriate.
- HV-P1-28 OPEN_FINANCIAL_SERVICES routing depends on Phase 7B destination.
- HV-P1-29 Circle coordination vs Agreement review semantic boundary.
- contextual review/dispute/action promotion not owned by Phase 1 when cross-domain.

### Preserve
- canonical NotificationEvent truth.
- priorities/purposes/importance.
- inbox paging/filtering.
- read state.
- domain-owned resolution.
- quiet hours.
- delivery preferences.
- typed navigation hints.
- Circle coordination prompt/response authority.
- review/dispute authority separation.
- external-channel responses mapping back to canonical state.

### Human scenarios
HC-13, HC-17, HC-23.

### Dependencies
Phase 1 Agreement review entry; Phase 6 Plug/Master contextual actions; Phase 7B Financial Institutions destination.

### Explicitly out of scope
Rewriting domain authorities; treating notification “resolve” as a substitute for Agreement/Circle/Money action.

---

## Phase 9 — Whole-platform Human Convergence Certification

### Problems assigned
- Business/Organization administrative-language consistency.
- cross-platform five-second coherence.
- primary/secondary navigation consistency.
- P2/P3 cross-surface polish.
- preservation certification for Community/Circles.
- Developer/Connect consistency while remaining secondary.
- full 3/20/100/1,000 interaction-pattern audit.

### Preserve
Everything certified in Phases 1–8.

### Human scenarios
All HC-01 through HC-26, plus phase-specific additions.

### Dependencies
Phases 1–8 complete.

### Explicitly out of scope
New features, new backend authority, provider/rail expansion.

---

# Phase ownership rule

If a later phase discovers a problem owned by another phase:
1. add it to that phase's register;
2. assign severity;
3. do not fix it in the current phase unless it is a direct regression caused by current work and cannot be safely isolated.

This rule prevents “helpful” convergence work from becoming an uncontrolled platform rewrite.
