# SecurePay — Gate 0 baseline and evidence inventory

**Date:** 8 November 2026 (Africa/Nairobi)  
**Purpose:** Establish the exact source, deployment, product-family and test facts BEFORE designing or executing the new four-family / 12 Fair Trade / milestones / human usability certification.  
**Decision:** **PROVISIONAL BASELINE — GATE 0 NOT CLOSED**. Read-only repository and Vercel evidence gathered; production runtime and compatible integrated backend remain unverified.

## 1. Locked mandate

The certification must exercise **SecureLink, Group SecureLink, SecureFlow, Group SecureFlow**, WWWWH/why, the canonical twelve Fair Trade principles with reasoning and uncertainties, people and consent, milestones/obligation dependencies, distinct allocations and challenge scopes, multi-work isolation, persistence/resumption, and uncoached real-human comprehension. It must follow: **investigate → choose genuine tests → execute → record outcomes → identify root causes → only then produce grouped fix prompts/phases → retest**.

Protect the approved three-panel Living Workspace (Tools left, KS001 centre, concise work summary right), parent-owned Store cart, unsent drafts, separate Vision, existing agreement authorities, and financial execution controls. No production changes, merge, real payments, signings or customer data during Gate 0.

## 2. Exact sources actually observed

| Surface | Observed revision | Status and caveat |
| --- | --- | --- |
| SecurepayLLM GitHub `main` | `535f5fcdbb53f45dc0fc635dadbb110e6f66a689` (30 Oct 2026) | GitHub history **only**, not evidence of live production SHA |
| SecurePayAPI GitHub `main` | `9b17b361de3e1e7df815281f578a5fca4b75ee99` (30 Oct 2026) | GitHub history **only**, not evidence of live production SHA |
| Current owner-reviewed Living Workspace candidate | `6001f86e2e869627c93ee41af67739398a5bec3c`; branch `fix/day9-store-summary-not-duplicate-20261108`; draft UI PR #233 | Isolated Vercel preview **READY**; day9 Store/KS001 presentation refinements; **not live backend/AI certification** |
| Current inspected API development candidate | `f77b961940acd0e7f9e9565d316912de5ea4076c`; branch `feat/day9-ks001-quantity-truth-20261107` | 187 commits / 107 files ahead of API main; source lineage **not** a confirmed compatibility pairing with UI preview |
| Existing Gate 2–5 convergence certification assets | `feature/master-convergence-gate2-ui-20261028` scripts carried forward into present UI branch | Gate 2 real-protocol runner, evidence evaluators and Gate 3–5 registers exist; actual records remain **NO-GO** by default |
| SecurePay production at `securepay.ke` | **Unknown** | Server release manifest, installed UI/API image/build SHA, C6 backports, live configuration and provider enablement not accessible through these GitHub/Vercel reads |

Isolated owner preview deployment: `dpl_8iw7FQCoTdFeMhy9DCMu3zgLQuco`, READY, at `https://ks001-day7-real-store-review-es3knaxcm-james-8078.vercel.app/#/preview/living-workspace/store`. Prior review build reported 69 focused UI tests and TypeScript/Vite pass. Distinguish individual Vercel project statuses: the UI review commit has a failed status on **ks001-day7-certification**, even though the specifically identified review deployment is READY. Neither is a real authenticated API proof.

Previous C6 server-side patches may differ from repository main. **No immutable release manifest or runtime attestation has yet been inspected.**

## 3. Four-family source topology (code exists; integrated operation not yet certified)

The product/API specification `SecurePay Four Money Flows Specification v1.0` (28 Jul 2026) defines:
- **SecureLink:** one payer → one recipient.
- **Group SecureLink:** many contributors → one accountable purpose/recipient.
- **SecureFlow:** one payer → multiple recipients/obligations with a pool and separate allocations.
- **Group SecureFlow:** many contributors → multiple recipients/obligations, governed contribution and distribution plans.

**Backend main code inspected, not executed:**
- `services/agreement/.../product/model/ProductType.java` has `SECURE_LINK` and `KEY_CONTRACT`; that single enum is **not** the full four-family taxonomy.
- `services/agreement/.../group/service/GroupSecureLinkService.java` implements group draft, contributor/organiser/governance lifecycle surfaces.
- `services/agreement/.../distribution/domain/DistributionMoneyFlowType.java` explicitly declares `SECURE_FLOW` and `GROUP_SECURE_FLOW`; distribution-plan creation/versioning/allocation services exist.
- `services/agreement/.../milestone/MilestoneStateEvaluator.java` computes readiness with explicit milestone dependencies; presentation sequence is not an implicit dependency.
- `services/agreement/.../fairtrade/FairTradePrinciplesVersion.java` fingerprints the shared canonical `/fair-trade/principles-v1.json`.
- `services/agreement/.../product/policy/FairTradeEvaluator.java` produces identified protective findings around missing purpose, duties, dates, cancellations and milestone sequence; it is **not** itself proof that the full, version-bound twelve-principle examination passes.
- Existing tests visible in main include GroupSecureLink services/governance/quorum; distribution allocation and release guards; milestone dependency/state; product classification and Fair Trade evaluator. These have **not been re-executed against a matched current API/UI pair in this Gate 0 audit**.

**Do not infer** that all four families have completed browser journeys, seller/contributor consent, funding authority, all twelve principle explanations, milestones, group allocation isolation or human acceptance from the presence of domain models and tests.

## 4. Current frontend/source workflow boundary

- Day 9 Living Workspace supports human Store asks, cart review, Store-first discussion and a distinct right-side glance summary in the owner preview. Sample examples are **not real KS001 responses**.
- Signed-in code has conversation-scoped `submitTurn`, file `uploadSource`, `getSource`, `readAgreementFormation`, `readFairTradeExamination`, `selectCommercialSource` and history/resumption gateway methods.
- The **Ask KS001** Store action prepares a human text question; the separate deliberate **Use Offer** path verifies canonical Store source. Whether a particular Store-source discussion results in a source-backed Agreement needs actual end-to-end proof.
- Local example photos and documents are preview proposals, not server uploads. Live file upload is gated by an explicit Add-to-KS001 action. A source receipt alone is not accepted agreement evidence.
- Source audit observed that the live `uploadSource(...,file)` call omits optional human caption; the live Places create request includes supplied text/caption but not selected place purpose/entrance; full source recovery and persistence need tests. These are **investigation leads, not yet independently reproduced backend defects**.
- Multi-work save/resume and navigation locking were addressed in UI PR #202, including an older reported C6 backport; exact byte-for-byte deployed parity remains unverified.
- There is no demonstrated uncoached, independent participant test for the current owner-reviewed Day 9 branch.

## 5. Pre-existing tests to REUSE

- UI PR #196 and `testing/master-convergence-gate2-ks001-live.mjs`: guarded localhost-only real API harness for two journeys; synthetic protocol tests **do not prove real API success**.
- `testing/master-convergence-gate2-evidence.json`: blank intentionally NO-GO.
- `testing/MASTER_CONVERGENCE_GATE3_2026-10-28.md`: version-bound twelve-principle PARTIAL_ADVISORY tests and known certification blockers.
- `testing/MASTER_CONVERGENCE_GATE4_2026-10-28.md`: privacy/identity/money separation and two-account testing.
- `testing/MASTER_CONVERGENCE_GATE5_2026-10-28.md`: one fail-closed final evaluator combining prior evidence slots; its default register remains NO-GO.
- API PR #365: media → source facts → Trade Context → formation → 12-principle golden journey with a **mocked provider**; not visual-accuracy or actual staging certification.
- UI PR #202: multi-work and mobile agreement navigation/locking.
- Backend group, distribution, milestone and Fair Trade unit tests identified above.

Do **not** count previous test totals as a current exact-SHA integrated result. Do **not** rename or conflate 2026-10-28 Master Convergence Gates with this new owner's Gate 0–5 programme.

## 6. Gate 0 evidence status

| Requirement | Status | What must happen |
| --- | --- | --- |
| Existing four-family rules | **DESCRIBED** | Historical product/API specification retrieved; confirm later rule changes before fees/quotations |
| Four-family backend primitives | **SOURCE SEEN** | Inspect exact tests and runtime behavior on selected API candidate |
| Approved 3-panel owner preview | **READY (UI preview)** | Browser owner link verified; real API/KS001 not proven |
| Exact live production UI/API SHAs | **UNKNOWN / BLOCKER** | Obtain read-only deployment manifest, release patch list and environment configuration from operator |
| Exact compatible, isolated UI/API candidate | **NOT LOCKED / BLOCKER** | Compare day9 stacks and agree common precise SHAs before Gate 2 |
| Twelve-principle canonical source | **SOURCE SEEN** | Test real version-bound advisory, evidence and explanations for each case |
| Milestones, release isolation, consent | **SOURCE SEEN** | Execute end-to-end state/authorization tests per family |
| Actual media understanding | **NOT CERTIFIED** | Real provider + non-sensitive real-file staging |
| Multi-draft continuity/isolation | **NOT CERTIFIED** | Multiple jobs/identities, refresh/resume/tab-switch test |
| Uncoached human understanding | **NOT STARTED** | Recruit consented representative testers, observe without coaching, evaluate mental effort and financial comprehension |
| Production-money isolation during tests | **NOT RUNTIME ATTESTED** | Confirm sandbox/disposable configuration and no external rail activity |

## 7. Gate 1 entry and next responsible actions

**Gate 0 remains open** until the live-release provenance and an exact compatible test-candidate pair are recorded. Read-only static investigation may continue in Gate 1, but **Gate 2 real testing is blocked** until isolated environment, provider access, disposable identities and exact SHAs are established.

1. **Deployment operator (Paul)**: provide a *redacted, read-only* current production release manifest: full UI/API SHAs or image digests, deployment dates, C6 patch inventory, runtime status, GitHub branch mapping, and proof that no live-money actions are enabled in disposable testing. **Do not send secrets or production DB data.**
2. **Technical owner/test lead**: compare `6001f86e...` UI against `f77b9619...` API; identify any required earlier branch convergence/preserved patches; lock an exact pair for a separate isolated test. No speculative merge.
3. **Test designer**: extend existing fail-closed evidence framework to four families, WWWWH+Why, evidence/source lineage, twelve-principle findings, milestone ownership/evidence/dependencies, consent, individual money and challenge scopes, multi-draft isolation, human comprehension and recovery.
4. **Human test coordinator**: select independent adults, low-data Android/desktop scenarios and non-sensitive test documents; define tasks and observations without coaching. No genuine financial execution.

**Gate 0 exit decision as of this report: NOT YET VERIFIED / NO-GO for integrated test execution.** This is an evidence finding, not an application defect. It authorizes no implementation prompt, production deployment, financial movement or replacement of the approved design.

## Source index

- UI main: https://github.com/kimaniks001/SecurepayLLM/commit/535f5fcdbb53f45dc0fc635dadbb110e6f66a689
- API main: https://github.com/kimaniks001/SecurePayAPI/commit/9b17b361de3e1e7df815281f578a5fca4b75ee99
- Owner UI PR #233: https://github.com/kimaniks001/SecurepayLLM/pull/233
- API day9 branch: https://github.com/kimaniks001/SecurePayAPI/tree/feat/day9-ks001-quantity-truth-20261107
- UI Gate 2 prior: https://github.com/kimaniks001/SecurepayLLM/pull/196
- UI continuity PR #202: https://github.com/kimaniks001/SecurepayLLM/pull/202
- Backend media golden PR #365: https://github.com/kimaniks001/SecurePayAPI/pull/365
- Backend milestone PR #219: https://github.com/kimaniks001/SecurePayAPI/pull/219
- Owner preview: https://ks001-day7-real-store-review-es3knaxcm-james-8078.vercel.app/#/preview/living-workspace/store
- Library specification: `02_SecurePay_Four_Money_Flows_Specification_v1.0.md` (28 Jul 2026)
- Library constitution: `SecurePay_Agent_Fair_Trade_Constitution_v1.0(1).md` (16 Sep 2026)
