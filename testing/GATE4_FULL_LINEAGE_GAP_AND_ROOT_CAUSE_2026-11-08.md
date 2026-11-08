# SecurePay — Gate 4: Full-lineage gap and root-cause review

**Date:** 8 November 2026 (Africa/Nairobi)  
**Evidence carried:** Gates 0, 1, 2 and 3; original Four Money Flows Specification v1.0 (28 July 2026); Agent Fair Trade Constitution v1.0 (16 September 2026).  
**Status:** PROVISIONAL DIAGNOSIS COMPLETED. RUNTIME ROOT-CAUSE AND HUMAN-ACCEPTANCE VERIFICATION STILL OPEN.  
**Change policy:** NO product code edits, NO UI rebuild, NO production deployments, NO real Money movement, NO blanket fix prompt.

## 1. Single continuity of learning — nothing resets

| Gate | Evidence retained | Honest limitation |
|---|---|---|
| **0 — Baseline and constitutional truth** | Money-flow structural definitions, existing API domain features, canonical 12 principles, approved UI constraints, source/branch inventory, prior harnesses | Current production release manifest and exact deployed source unknown |
| **1 — Coverage and design** | 12 family test cases (three per family), 10 cross-family cases; WWWWWH + Why; source lineage, consent, obligations, milestones, challenges and 12-lens standards | Test designs are not executed results |
| **2 — Technical preflight** | 13 of 13 inspected client/API source interface markers aligned, four source/scope findings, earlier reader failure, environment inventory, 69 focused earlier UI tests | 22 of 22 real family/cross-family cases NOT_RUN; isolated API/DB and real reader unverified |
| **3 — Owner-led UI investigation** | Five independent scenario reviews, ten UX/source findings, approved three panels, universal Documents, compact right summary; 76 of 76 focused UI checks | Zero independently observed human sessions; no end-to-end API evidence |

**Gate 4 incorporates every prior open issue**, without counting it twice or inventing a pass. The historical October 28 Master Convergence Gate labels are separate work and should not be confused with this owner's Gate 0–5 sequence.

The specific approved review frontend is SHA **930194dbd04fbb6d8756d5628e60f173f5f6fcc9**, Vercel deployment **dpl_Fb21QGAD49ub9kKCcqKPMYh1bk87** (READY). Its tracked files were checked identical to the restored compact-right-panel baseline **b6ff0be0142d1051746992af8302ac34c4acb009**. The proposed Gate 2 API source SHA **f77b961940acd0e7f9e9565d316912de5ea4076c** has **not** been runtime-paired/certified with that preview or the older Gate 2 UI candidate.

## 2. What Gate 4 may and may not conclude

**Confirmed source behavior:** what the exact code actually does.  
**Preview-only:** simulated KS001 text or local browser state, never the production AI.  
**Environment blocker:** an absent/unverified test environment, not a product defect.  
**Live risk:** source-level path potentially capable of causing a problem, but without a reproduced consequence.  
**Unexecuted authority:** controllers and DTOs exist, but identity, consent, money, milestone and conflict rules remain untested.  
**Preserve:** a valuable design or safety guard we must not damage.

Priority below means **investigation order**. It does NOT mean a verified production P0/P1 defect. A critical P0 requires real evidence of wrong identity, cross-work data exposure, unauthorised acceptance, misplaced Money, or comparably severe impact. A P1 requires a confirmed blocking real journey. P2/P3 address smaller demonstrated confusion or polish. This distinction prevents severity theatre.

## 3. Consolidated findings — Gate 0 through Gate 3

| Ref | Investigation finding | Evidence class | Investigation order | What would establish the real impact |
|---|---|---|---|---|
| **G4-01** | Environment and release provenance | ENVIRONMENT_BLOCKER | FIRST | Obtain read-only manifest, disposable DB, provider credentials and disabled external rails |
| **G4-02** | Source reader availability | HISTORIC_RUNTIME_FAILURE_CURRENT_UNKNOWN | FIRST | Disposable real source READY/PARTIAL and correct extracted facts |
| **G4-03** | Store cart scoped to workspace | SOURCE_CONFIRMED_RUNTIME_RISK | FIRST | Authenticate and switch independent A/B work with different carts |
| **G4-04** | Pending media scoped to tool not conversation | SOURCE_CONFIRMED_RUNTIME_RISK | FIRST | Select media in A, switch to B while tool open, inspect upload ID |
| **G4-05** | Live caption omitted | SOURCE_CONFIRMED_DOWNSTREAM_UNKNOWN | HIGH | Verify multipart and source lineage with labelled disposable image |
| **G4-06** | Place purpose and entrance omitted | SOURCE_CONFIRMED_DOWNSTREAM_UNKNOWN | HIGH | Compare pickup vs delivery and entrances in formation |
| **G4-07** | Scripted replies put into next field | PREVIEW_ONLY_CONFIRMED | HUMAN_PROBE | Probe real KS001 with objection and corrections |
| **G4-08** | Preview unsent source note scoped across work | SOURCE_RISK_PREVIEW_ONLY | HUMAN_PROBE | Switch A to B with unsent tool text, observe |
| **G4-09** | Preview 1100-character Store message clipping | PREVIEW_ONLY_CONFIRMED | LATER | Compare sample cart quantities and real handoff separately |
| **G4-10** | Active milestone clarity | SOURCE_USABILITY_RISK | HUMAN_PROBE | Independent user explains duties and disputed vs unaffected steps |
| **G4-11** | Group and distribution multirole rules | UNTESTED_AUTHORITY | CERTIFICATION_REQUIRED | Run group/flow cases with contributors, contractors and review changes |
| **G4-12** | Full WWWWWH and twelve principle examination | UNTESTED_AUTHORITY | CERTIFICATION_REQUIRED | Evidence-backed versioned twelve-lens statuses with unknowns and consent |
| **G4-13** | Financial ledger, challenge isolation and Money | UNTESTED_AUTHORITY | CERTIFICATION_REQUIRED | Use isolated disabled-rail ledger and separate-acceptance tests |
| **G4-14** | Dated pricing doctrine and quote reconciliation | VERSION_RECONCILIATION_REQUIRED | BEFORE_QUOTE_TEST | Lock latest effective price policy and compare server quotes |
| **G4-15** | Quick Assist source assertion mismatch | CONFIRMED_TEST_MISMATCH | LATER | Determine intended first-use state and test behavior not code strings |
| **G4-16** | Preserve approved workspace and universal Documents | PRESERVE | ALWAYS | No specialist minutes tool, regression checks and owner approval |
| **G4-17** | Uncoached human acceptance not yet run | HUMAN_EVIDENCE_BLOCKER | AFTER_API_SMOKE | Observe H01-H05 after one verified safe Gate2 smoke |

**Notable source-grounded boundary cases:**

- **Cart scoping:** Actual Phase1LivingWorkspacePreview holds Store selections in one workspace-level state list; starting or resuming work changes the conversation without explicitly rekeying that cart. This suggests a *cross-work integrity risk*, NOT a proven release of private data. Gate 2 SC-03 = Gate 3 F03 = G4-03; report it once.
- **Pending files:** UniversalSourceTray resets selected files when the area/tool/demo changes, not when the active conversation ID changes. A pending file may follow the user into a different work while the tool stays open. The possible failure must be reproduced on a disposable backend before calling it a leak.
- **Documents provenance:** Live upload passes the file but not the optional user caption; live place submission omits the selected purpose and entrance. Source-level omissions are demonstrable; their downstream effect still requires actual source and version evidence.
- **Scripted conversation:** Gate 3's owner-only preview blindly stores normal text as the answer to the next question. That is an example-script limitation, not a demonstrated flaw in live KS001.
- **Older source reader:** The 27 October 2026 isolated run could converse and persist real turns but could not interpret disposable JPEG/PDF because of the selected Anthropic provider credential/breaker state. The current API has an optional OpenAI reader, with default configuration remaining Anthropic. Do not reuse the old failure as a current API failure or claim a functioning reader without a fresh real-file test.
- **Pricing/versioning:** July's Four Money Flows v1.0 is historical reference. Its quoted contributions/fees may not represent later owner-approved commercial doctrine. Preserve product structure, but reconcile the latest price and fee-bearing authority before validating customer quotations. Do not resurrect a superseded charge.

## 4. Root-cause families — hypotheses to verify

| Cluster | Suspected cause / unknown | What to test |
|---|---|---|
| **RC-A: Release and provider provenance** | No attested production deployment patch list; Vercel review-only frontend and source backend cannot establish an executable integrated truth | Exact UI/API SHA pair, disposable DB, selected source reader, real source status, disabled financial rails |
| **RC-B: Work identity and source ownership** | UI state scope may survive conversation switches, while backend uses conversation and member authority | Two different work items with distinct cart, source, unsent draft and counterpart; refresh/retry/tab-switch; check ownership and receipt identifiers |
| **RC-C: Document/source fidelity and semantic interpretation** | Caption/location qualifiers may be dropped; old reader configuration failed; scripted conversation uses field sequence | Real bill/photo/minutes/quote, source lineage, human corrections, explicit source vs proposed vs accepted version |
| **RC-D: Obligations, consent and Money authority** | Domain service existence does not prove real multi-party, milestone or allocation behavior | Independent identities; revised contribution/distribution plans; challenge scope; per-obligation evidence; no real rail transfers |
| **RC-E: Human comprehension** | Good compact layout is not itself proof that a person understands obligations, consequences or next action | Uncoached people on real mobile/desktop; no prompting, measure mistakes and explanations rather than opinion alone |
| **RC-F: Test truth** | Static tests/DTO matches can give false confidence; one Quick Assist certification assertion tested a source string rather than user behavior | Small focused behavioral tests using exact build, and permanent separation of mocks vs real API evidence |

## 5. Four families — no case can disappear

| Family | Evidence standard carried from Gate 0/1 |
|---|---|
| **SecureLink** (one payer, one recipient) | Independent buyer/seller roles, true supplier offer or source, item/amount, proof, completion authority and terms; honest fee and payer allocation |
| **GroupSecureLink** (many contributors, one purpose) | Real contributor identities, group governance, contributor choice, shortfall, cancellation, amount status, one accountable recipient, challenge and acceptance |
| **SecureFlow** (one payer, several recipients) | One pool with limited funds, versioned allocations, independent contractor work/inspection/evidence, undistributed balance, one disputed allocation not falsely holding another |
| **GroupSecureFlow** (many contributors, many recipients) | Governed contribution plan PLUS governed distribution plan; independent contracts, explicit versioned consent and per-allocation payment readiness |

Additionally **cross-work** must prove that unrelated agreements, carts, sources, milestones and people stay separate across new/resume, multiple tabs and refresh.

**Shared server-owned lifecycle from the July reference:** Draft → Quote → Invite → Review → Accept → Fund → Perform → Confirm/Challenge → Payment Ready → Withdraw/Settle. These are concepts requiring actual independent authorities. UI labels may not manufacture their truth; no funding or acceptance takes place during this audit.

## 6. WWWWWH and all twelve constitutional principles

**Who** is acting, paying, contributing, delivering, inspecting, changing terms, accepting, bearing charges?  
**What** is actually provided, excluded, priced, evidenced and promised?  
**Where** is work, handover, delivery, correct entrance, and how credible is the place source?  
**When** are commencement, inspection, expiry, deadlines and corrections?  
**Why** does the trade matter to its participants and beneficiaries?  
**How** are funding, allocations, confirmation, challenge and resolution authorised?

The twelve constitutional lenses remain:

1. **To Protect Trust**
2. **To Safeguard Buyers & Sellers**
3. **To Build Long-Term Relationships**
4. **To Protect the Reputation of Every Store**
5. **To Strengthen the Marketplace**
6. **To Honour Our Commitments**
7. **To Prevent Exploitation**
8. **To Encourage Healthy Competition**
9. **To Uphold the Law**
10. **To Empower Growth**
11. **To Protect Community Goodwill**
12. **To Honour Good**

**Do not present these as a repetitive twelve-question checklist to customers.** The Guardian Companion Constitution requires: listen before structuring; acknowledge the human moment; identify honest value first; distinguish facts from assumptions; offer a useful possibility when relevant; ask only the next necessary question; stay balanced to all parties; and protect without taking away agency.

A version-bound Fair Trade PARTIAL_ADVISORY is not a legal opinion, not a 12/12 certificate, and not proof of future trading outcomes. A source receipt is not understanding; extracted facts are not human confirmation; user confirmation is not independent counterpart consent; a visible Money badge is not payment authority.

## 7. Safe evidence-first next order

1. **Provenance:** obtain redacted release manifest and patch inventory; identify exact compatible sandboxed UI/API pair, isolated databases, test accounts, source reader, and verified disabled external money.
2. **Source smoke:** use existing localhost-only Gate 2 harness with genuine approved non-production provider and disposable photo/PDF. Confirm READY/PARTIAL and grounded source facts, not merely HTTP 201.
3. **Isolation smoke:** independently authenticated work A/B with pending document, cart, source, draft and conversation switch; stop if any cross-work attachment is reproduced.
4. **Money/roles/flows:** run the existing 12 family and 10 cross-family scenarios; use versioned counterpart consent, contribution/distribution cases and independent milestone acceptance, no real rails.
5. **Human acceptance:** then perform the five original Gate 3 uncoached trials with genuine participants and small Android/low-data as well as desktop use.
6. **Rerun Gate 4 classification:** attach logs, source artifact references, repro steps and exact SHA; confirm or reject each suspected root cause; assign defensible P0–P3 severity, then decide the smallest justified Gate 5 fix scope.

There is no need to ask Paul to redesign or blindly run thousands of tests. The investigation and read-only source review are already ours; specific inaccessible backend machine operations become a precise outstanding dependency, not an excuse to guess.

## 8. What is locked

- The owner-approved **Tools left / KS001 middle / concise SecurePay Check right** design stays unchanged.
- One **universal Documents tool**, able to help with mixed documents. Never introduce a separate minutes-only tool without explicit approval.
- Store remains a tool with an optional centre-panel expansion; selected items require explicit user-controlled KS001 discussion. No automatic cart checkout.
- Users can have multiple work items; Work, Vision, Circle and Community stay independent and complementary.
- A document, source, Store offer, user correction, signed Agreement and financial Money event each have different evidence/authority levels.
- Honest Fair Trade and Money statuses must not overclaim certainty. Money follows the Agreement.
- No product code edits, production branch merge, privileged credentials, live Money movement or Gate 5 repair plan during Gate 4.

## 9. Gate 4 decision

**Provisional root-cause mapping is complete** from the source actually available across Gates 0–3. The **17 deduplicated entries** and six root-cause clusters are tracked in the companion JSON register. No issue has a defensible confirmed P0 production severity yet. Missing production/SHA environment, real-media end-to-end verification, role-specific financial authority and genuine human observations are **open blockers to full certification**.

**Disposition:** carry the assessment to owner review, but keep formal Gate 4 closure and Gate 5 corrections on hold until the real test evidence identifies actual failures and their causes. The finished investigative record is not an instruction to rebuild the interface.
