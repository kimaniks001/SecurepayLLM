# SecurePay — Gate 1: Four-Family Coverage and Human Acceptance Test Design

**Date:** 2026-11-08 (Africa/Nairobi)  
**Status:** SOURCE AUDIT COMPLETED IN SCOPE / REAL TESTS NOT EXECUTED / GATE 1 PROVISIONAL  
**Baseline:** Gate 0 document at `testing/GATE0_FOUR_FAMILY_FAIR_TRADE_BASELINE_2026-11-08.md`. Gate 0 production provenance and exact isolated UI/API pair remain **open blockers for Gate 2**, not reasons to halt read-only investigation.

## 1. Non-negotiable question

Can a person begin with an ordinary intention, Store offer, bill, photograph, minutes or conversation; let KS001 determine the right arrangement; create an understandable, evidence-backed, reviewable agreement; establish milestones and completion decisions; and safely manage several unrelated work items without mixing sources, authority or Money?

**Must assess four families:** SecureLink (1 payer→1 recipient), GroupSecureLink (many→one), SecureFlow (1→many), GroupSecureFlow (many→many). Group and Flow are distinct structural arrangements; `ProductType.SECURE_LINK/KEY_CONTRACT` does **not** cover the entire taxonomy.

**Result taxonomy:** `PASS_REAL`, `FAIL_REPRODUCED`, `BLOCKED_ENVIRONMENT`, `NOT_RUN`, `STATIC_SUPPORTED`, `STATIC_RISK`. Never promote static code, mocked-AI tests or preview demonstrations into real journey passes. Every real result must identify exact UI SHA, API SHA, test environment, input fixture, run artifact/log, actual authority response, and independent reviewer.

## 2. Source-level evidence (source observed, runtime not asserted)

| Capability | Code observed | Observed extent | Still unproven |
|---|---|---|---|
| SecureLink/KeyContract | `services/agreement/.../product/model/ProductType.java`, `product/policy/ProductClassificationPolicy.java` | Amount-based single-agreement classification | Real end-to-end 1→1 journey, parties, evidence, fees, acceptance |
| GroupSecureLink | `.../group/service/GroupSecureLinkService.java`; `group/model/AgreementGroupSecureLink.java` | Group lifecycle, organisers, contributors, governance | Multiple separate identities, dissent, consent and single-purpose settlement |
| SecureFlow/GroupSecureFlow | `.../distribution/domain/DistributionMoneyFlowType.java`, `distribution/service/DistributionPlanCreationService.java`, `DistributionPlanVersioningService.java`, `DistributionAllocationReleaseService.java` | Typed flow classes, distribution plans, allocation and release rules | Real 1→many/many→many journey, pool balance, independent readiness and challenges |
| Milestones | `.../milestone/MilestoneStateEvaluator.java`; `milestone/MilestoneDependencyCycleDetector.java` | Explicit dependency ordering, READY/WAITING/IN_PROGRESS/COMPLETED/CANCELLED semantics | User comprehension, per-milestone permissions/evidence and partial completion |
| Twelve principles | `.../fairtrade/FairTradePrinciplesVersion.java`; `.../agent/qualification/FairTradeExaminationProjector.java`; canonical `principles-v1.json` | Versioned twelve-lens *partial advisory*. Unknown applicability remains NOT_ASSESSED; structural questions require evidence | Explicit explain-why clarity for each family, legal and future-outcome humility, independent human review |
| Product-protection findings | `.../product/policy/FairTradeEvaluator.java` | Corrections for missing purpose/obligations/deadline/cancellation, caution for expiry, milestone ordering | Not proof of a twelve-principle pass; distinct from advisory |
| Formation | `.../agent/formation/AgreementFormationService.java` | Read-only formation; separate confirmation authority; check of open points is not consent | Full version-bound review, invited parties, correction and independent acceptance |
| Active Agreement UI | `src/features/living-workspace/ActiveAgreementWorkspace.tsx` | Displays money status and milestone titles/statuses, evidence-count projection | Human-readable milestone owners, dates, dependencies, evidence and next action: present widget currently concatenates `title · status` |
| Multi-work | `Phase1LivingWorkspacePreview.tsx`, `workNavigation`; PR #202 | Save/resume/navigation and deliberate new-work transition | Concurrent job/source isolation, reopened cart selection, two-tab protection, exact live parity |
| Source intake | `UniversalSourceTray.tsx` | Explicit source upload, polling, status, local-only preview, conversation scoped IDs | Live caption omitted from `uploadSource(...,file)`; selected place purpose/entrance omitted from `createPlaceSource` text; runtime consequences untested |
| Store → KS001 | Day 9 owner-preview branch + canonical `useOffer` path | Natural handoff and deliberate commercial source selection available as distinct flows | Ask and cart discussion do not automatically prove canonical offer linkage; verify proper source before Agreement |
| Prior test harness | `testing/master-convergence-gate2-ks001-live.mjs`, Gate 2–5 evidence evaluators | Safe loopback protocol, fail-closed evidence design; older NO-GO records | New four-family, milestones, multi-work and uncoached-human certification not completed |

These are test-design findings; **no source gaps may be described as reproduced API failures until a real isolated run confirms them.**

## 3. WWWWH + WHY coverage to assert for EACH family

1. **WHO** created, pays, contributes, receives, performs, confirms each milestone, owns exceptions, bears fee/rail charges and can alter governance? Can each role be correctly represented by an independent real identity?
2. **WHAT** is exchanged/delivered, quantities, scope, exclusions, price/principal, fees, quality and evidence rules? Are Store listings, photos and meeting minutes explicitly distinguished as *proposals* vs established terms?
3. **WHERE** are work, pickup, handover, beneficiary and relevant entrance/location, and how was location verified or declared unverified?
4. **WHEN** do the agreement, each milestone, acceptance, delivery, inspection and expiry occur? Are device-timezone drafts distinguished from accepted timestamps?
5. **HOW** are funds contributed/attributed/allocated, work verified, disputed, corrected and eventually made Payment Ready under authoritative server rules? Can one bad allocation be isolated?
6. **WHY** is the work undertaken and who benefits? Can the user restate intention and meaningful benefit without rote questionnaire completion?

**Always record:** user-supplied source → exact source artifact / offer version → candidate extracted fact → corrected/confirmed fact → current Agreement version → who accepted. Never infer that source reading is agreement acceptance.

## 4. Proposed real test cases (all NOT_RUN; exact fixtures and IDs to be created in Gate 2)

| ID | Family | Real scenario | Critical assertions |
|---|---|---|---|
| SL-01 | SecureLink | One homeowner buys CCTV from one Store | Correct seller/offer provenance, installation milestones, buyer/seller roles, evidence, review and consent |
| SL-02 | SecureLink | One person creates, another funds | Creator/payer separation; no fee or funding invented; no consent by proxy |
| SL-03 | SecureLink | Seller disputes rejected installation | Stop only affected completion/payment; visible reason, opportunity to correct and follow process |
| GSL-01 | GroupSecureLink | Twelve residents fund one CCTV supplier | Separate contributions, contribution governance, beneficiary, role permissions, individually understood fees |
| GSL-02 | GroupSecureLink | One contributor refuses/withdraws | No fictitious pledge/acceptance; purpose target/governance updated with versioning |
| GSL-03 | GroupSecureLink | Organiser proposes changing recipient | Explicit authority/affected-party acceptance; no silent retargeting |
| SF-01 | SecureFlow | One estate payer → equipment, installer, maintenance supplier | Pool/allocations add up, obligation and milestone authority per recipient, undistributed balance |
| SF-02 | SecureFlow | Equipment delivery completes; installer fails | Equipment allocation can progress independently if conditions allow; failed installer stays blocked |
| SF-03 | SecureFlow | Allocation sum exceeds pool / fee payer changed | Clear validation, no phantom funds, new version/necessary consent |
| GSF-01 | GroupSecureFlow | Twelve residents → CCTV equipment, installer and maintenance | Funding governance and distribution plan BOTH explained; independent milestones, contributions, allocations |
| GSF-02 | GroupSecureFlow | Contested allocation plus undisputed completed allocation | Only legitimate disputed scope blocked; independent Payment Ready assessments; no Money execution |
| GSF-03 | GroupSecureFlow | Contributors revise distribution after commitments | Version pinning, authority, explicit review and affected-person approval; no retroactive silent rewrite |

**Real tests must include:** group contributions with real separate actor credentials; buyer and seller cannot read each other's private data beyond authorised views; duplicate/retry commands cannot double-post; no production funding routes; correct recovery after network interruptions.

## 5. Cross-family tests

| ID | Check | Passing observation |
|---|---|---|
| X-01 | **Intention classification without technical jargon** | KS001 discovers 1→1 / many→1 / 1→many / many→many from real conversation; never forces a choice of family first |
| X-02 | **Evolution** | When 1 payer becomes twelve and 1 recipient becomes three, KS001 recommends correct new architecture without silently mutating already accepted terms; respects changed consent boundary |
| X-03 | **Multi-work isolation** | CCTV draft, road works GroupSecureFlow and equipment SecureFlow are switched repeatedly; no contamination of photos, people, cart, dates, numbers, or permissions |
| X-04 | **Reload and two browser tabs** | Unsent words/drafts preserved or clearly marked unsaved; stale versions refused rather than overwriting newer state |
| X-05 | **Multimodal evidence reconciliation** | Store offer, one photograph + caption, minutes PDF, chat and location are read in one named conversation; contradictions flagged, sources traceable |
| X-06 | **Twelve principle explanations** | For each principle, show Supported / Concern / Needs clarification / Not assessed (or canonical state); grounded reason, material evidence and next corrective question where appropriate, without promising future success |
| X-07 | **Milestone clarity** | Every milestone can be explained: owner, what, where, when, evidence, confirmer, dependency, dispute and consequences |
| X-08 | **Interruption** | File-reading delay, failed AI/provider call, lost connectivity and re-entry preserve work; no unsupported success or auto-repeat of money actions |
| X-09 | **Fairness vs progress** | KS001 asks only the next material question, stops questioning once review is appropriate, but refuses to certify ambiguous consent/legal/finance conditions |
| X-10 | **Role privacy** | A contributor, recipient, planner and reviewer each see the right slice with no cross-person private agreement/financial leakage |

## 6. Twelve-principle evaluation procedure

Use the canonical labels unchanged, one row per principle for each test agreement:
1. To Protect Trust
2. To Safeguard Buyers & Sellers
3. To Build Long-Term Relationships
4. To Protect the Reputation of Every Store
5. To Strengthen the Marketplace
6. To Honour Our Commitments
7. To Prevent Exploitation
8. To Encourage Healthy Competition
9. To Uphold the Law
10. To Empower Growth
11. To Protect Community Goodwill
12. To Honour Good

For each: record canonical status returned, grounded explanation, supporting source/reference, absence/uncertainty, and any corrective action. A `PARTIAL_ADVISORY` or `NOT_ASSESSED` is **not a 12/12 certificate**, and a contractual review does not independently prove statutory compliance or long-term marketplace outcomes. A refusal to proceed when a material fact is missing is an expected safety success, not a product failure.

## 7. Uncoached human test (Gate 3, NOT_RUN)

Test each family with independent adults including people on modest Android devices, low bandwidth and varying familiarity with online trade. Use non-sensitive simulated transactions and **do not coach through task names, buttons or technical product taxonomy**.

Tasks to observe: (a) start from ordinary words or source, (b) work on a second unrelated agreement, (c) resume the first without guidance, (d) point out what each milestone requires and who approves, (e) explain what happens to their money if someone fails, (f) find and correct one wrong term, (g) explain why the proposed agreement is considered fair or still needs clarification, (h) choose the next action unassisted.

Collect observed task completion, errors, help requests, hesitation, repeated questions, lost data, wrong-work actions, misunderstanding of consent/charges, confidence and return intent. **Any material misunderstanding of payment authority, acceptance, other people's obligations or wrong-work context fails that user journey, regardless of the aggregate score.** Measure, do not invent target benchmarks until real human baseline emerges.

## 8. Evidence and candidate discipline

- **Current source anchors (not a signed-off test pair):** UI owner preview `6001f86e2e869627c93ee41af67739398a5bec3c`; backend Day 9 candidate `f77b961940acd0e7f9e9565d316912de5ea4076c`. Test compatibility NOT PROVEN. Backend main `9b17b361de3e1e7df815281f578a5fca4b75ee99`, frontend main `535f5fcdbb53f45dc0fc635dadbb110e6f66a689`, actual production SHAs unknown.
- **Test execution:** no authenticated matched-commit API/DB/provider runs, financial operations or real-human sessions performed during this Gate 1 static investigation.
- **Reuse** prior loopback-only harness, fail-closed Gate 2–5 evidence evaluators, backend domain unit tests and Gate 0 inventory. Extend incrementally; do not make a duplicate authority.
- **Safety:** disposable database + participants + uploaded fixtures, localhost isolated API, explicit Money-disable verification and no real provider settlement. Never claim GitHub's Vercel status proves backend connectivity or actual principle comprehension.
- **Fix prompts withheld:** confirmed failure results plus severity/root-cause clustering determine whether one master corrective prompt or ordered phases.

## 9. Evidence-register schema for Gate 2

For each test ID, capture `expected`, `observed`, `status`, `uiSha`, `apiSha`, `environment`, `fixtureRef`, `conversationIdRedacted`, `agreementVersion`, `sourceLineage`, `milestoneEvidence`, `fairTradeReasoning`, `authorityDecisions`, `humanObserver`, `reproductionSteps`, `logsScreenshots`, `severityIfFailure`, `rootCauseConfidence`. Use immutable reference pointers and private test fixtures; do not commit secrets, personally identifying information, or unredacted financial records.

## 10. Gate 1 decision

**Source coverage mapped; test design proposed, not executed. Gate 1 remains provisional** until the intended case owners validate real source coverage and baseline pair. Entry to Gate 2 still requires Gate 0 production-version reconciliation, exact compatible isolated candidates, disposable identities and providers, and signed-off test fixture/observability setup.

**The next action is NOT a repair prompt.** Resolve the baseline/test infrastructure, implement small missing test instrumentation if required, and conduct the named real journeys. Real results then determine the corrective roadmap.
