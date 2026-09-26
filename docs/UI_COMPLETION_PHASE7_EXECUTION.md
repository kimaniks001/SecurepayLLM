# UI Completion — Phase 7: Living Agreement Execution, Evidence, Milestones & Completion Truth

## KS001 Upgrade Phase 7 — Slice 4 (Completion): **Complete this obligation is wired**

The backend (`feat/phase7-completion-slice4`) hardens `/complete` (UR-181, the final part):
- Only the obligation's **responsible** participant may complete it. SecurePay derives that participant from the session.
- It requires a dedicated `AGREEMENT_OBLIGATION_COMPLETE` permission; `PROGRESS` stays ungranted.
- It completes only when SecurePay's completion evaluator says eligible: the work was started, requirements are met, and every active evidence item was accepted by the beneficiary.
- It is bound to the expected versions (stale → 409) and is idempotent.
- Started **overdue** work may complete (UR-186), and its lateness (`overdueAt`) is kept.
- Work with **no beneficiary** fails closed with an explicit `beneficiary_required` blocker (UR-188, escalated).
- A new server-derived `COMPLETE_OBLIGATION` next action marks work ready to complete.
- Completion is not payment and moves no money.

Frontend changes in this slice:
- **Gateway:** `completeObligation(id, oid, { idempotencyKey, expectedAgreementVersionId, expectedObligationVersion })`.
- **Controller:** `canComplete` is driven **only** by SecurePay's `COMPLETE_OBLIGATION` action. There is no more client inference from completion-status plus participant IDs. `complete()` re-reads authority fresh and pins the key and versions for an uncertain retry. It treats 409 as a stale view (reload and explain), 403 as "only the person responsible…", and 422 as requirements not yet met.
- **Progress panel:**
  - The "temporarily unavailable" limitation is gone.
  - **Complete this obligation** appears with "Completing records that this work is done. It isn't payment and doesn't release money."
  - Overdue work adds "…can still be completed. SecurePay keeps a record that it was late."
  - An uncertain completion offers Check / Try again.
- **Wording:** `COMPLETE_OBLIGATION` (with an overdue variant); `BENEFICIARY_REQUIRED`; blockers `obligation_not_started`, `beneficiary_required` and `beneficiary_is_responsible`.
- **Production guards:** only the Progress panel may call the execution mutations; no component calls the gateway mutations directly.


## KS001 Upgrade Phase 7 — Slice 3 (Evidence Review): **review and replacement are wired**; Complete stays withheld

**Human decision 2026-09-26 (backend UR-187):** evidence is reviewed by the obligation's **beneficiary** (the person the work is done for); SecurePay does not adjudicate. The backend (`feat/phase7-evidence-review-slice3`) derives the reviewer from the session, binds the decision to the expected Agreement + obligation versions (stale / superseded / already reviewed → 409), records one immutable decision per evidence item (`APPROVED`, `REJECTED`, `NEEDS_MORE_INFORMATION`; a participant-facing reason is required unless approving), and exposes `reviewState` / `reviewedAt` / `reviewReason` on evidence (never the reviewer's identity). A review is not completion and moves no money.

Frontend changes in this slice:
- Gateway: `reviewEvidence(id, evidenceId, { idempotencyKey, expectedAgreementVersionId, expectedObligationVersion, decision, reason? })` → `EvidenceReviewDto` (no `reviewerParticipantId` any more); `SubmitStatementEvidenceRequest.supersedesEvidenceId`; `EvidenceDto.reviewState / reviewedAt / reviewReason`.
- Controller: `review(oid, decision)` only on SecurePay's `REVIEW_EVIDENCE` for that evidence; pins key + versions + decision + reason for an uncertain retry; a reason is required before sending a rejection / more-information request. `checkReview` now settles from the re-read `reviewState` (rejections are readable), wording the OUTCOME, never "your". `replacementTarget(oid)` from `REPLACE_EVIDENCE`; `submitStatement` then sends `supersedesEvidenceId` for exactly that item.
- Progress panel: "Review this evidence" with **Approve evidence / Not accepted / Ask for more information** (+ reason) for the beneficiary; **Replace evidence** form for the submitter; evidence rows show "Awaiting review / Approved in review / Not accepted in review / More information requested / Replaced by newer evidence" and the reason given; after approval: "Your evidence was approved. Completing the work comes later."
- **Still withheld:** Complete this obligation (backend UR-181 `/complete` portion, Slice 4). Production guards: only the Progress panel may call start / review (+ recovery); no production code calls `complete`, and no component calls the gateway mutations directly.


## KS001 Upgrade Phase 7 — Slice 2 (Evidence): **written-statement evidence is wired**; Review and Complete stay withheld

**Current architectural decision.** SecurePayAPI Phase 7 Slice 2 (branch `feat/phase7-evidence-slice2`) made evidence submission real authority:

- `POST …/obligations/{id}/evidence` now takes `{ idempotencyKey, expectedAgreementVersionId, expectedObligationVersion, evidenceType, … }`.
- SecurePay derives the submitter from the session and only the obligation's responsible, established participant may submit (403 otherwise). This fixes UR-181: the old endpoint compared the responsible participant with itself.
- Stale versions → 409; a closed Agreement → 422; the work must be started. The submission is idempotent per key and body.
- Evidence is a participant's claim. It is **not** approval (that is the review decision), **not** completion and **not** money.
- **SecurePay has no file storage.** A `TEXT_STATEMENT` is its own content. Other types are participant-declared references, which this app does not send.

Frontend changes in this slice:

- **Gateway:** `submitEvidence(id, oid, { idempotencyKey, expectedAgreementVersionId, expectedObligationVersion, evidenceType: 'TEXT_STATEMENT', description })` (statements only). It is registered as an authenticated method. `EvidenceDto.kind` / `supersedesEvidenceId` are additive.
- **Controller:** `canSubmitEvidence` is true only on SecurePay's own `SUBMIT_EVIDENCE` signal for current-version IN_PROGRESS/OVERDUE work. `submitStatement(oid)` re-reads authority fresh, then pins the key, versions **and text**, so an uncertain retry resends the identical request.
- **Uncertain outcomes:** `checkEvidence` proves an uncertain submission only from a re-read record with exactly the pinned statement.
- **Error responses:** 403, 409 (stale: the Agreement is reloaded and the user told it changed) and 422 are all definite.
- **Progress panel:** a calm written-statement form ("Describe what you did, as your evidence") replaces the old "not available yet" line. It states plainly that uploading files isn't available, and that submitting doesn't approve the evidence or complete the work.
- **Evidence list:** statements render as "Written statement — …". "Approved in review" is still shown only from completion-status.
- **Still withheld:** Approve / Reject evidence and Complete. Production guards forbid any production call to `submitEvidence` / review / complete outside the controller.


## KS001 Upgrade Phase 7 — Slice 1 (Execution & Progress): **Start work is wired**; Review and Complete stay withheld

**Current architectural decision.** SecurePayAPI Phase 7 Slice 1 (branch `feat/phase7-execution-progress-slice1`) made START an atomic, server-owned authority:

- `POST …/obligations/{id}/start` now takes `{ idempotencyKey, expectedAgreementVersionId, expectedObligationVersion }`. SecurePay rejects a stale Agreement version or obligation state version with **409** (compare-and-swap inside the transaction), a closed (cancelled/expired) Agreement with **422**, and anyone who is not the obligation's responsible, established participant with **403** (dedicated `AGREEMENT_OBLIGATION_START` permission + per-object check). An identical retry replays; the same key with a different request is a 409.
- Obligation reads now carry `stateVersion`.
- SecurePay's next actions only advertise `START_OBLIGATION` for AVAILABLE (or unstarted OVERDUE) work; PENDING work is `WAIT_UNTIL_AVAILABLE`.

Frontend changes in this slice:

- `ObligationDto.stateVersion`; `startObligation(id, oid, { idempotencyKey, expectedAgreementVersionId, expectedObligationVersion })`.
- The execution controller binds a first Start to the fresh preflight's current version id and the obligation's `stateVersion`, and **pins them with the key**: an uncertain retry resends the identical request (SecurePay's idempotency digest covers the expected versions). `startable` = AVAILABLE | OVERDUE (PENDING is never startable).
- 409 → nothing started, the Agreement is reloaded, work re-read: "The Agreement or this work changed while you were looking at it, so nothing was started. Check what SecurePay shows now."
- The Progress panel renders **Start work** only on SecurePay's own `START_OBLIGATION` signal for that current-version obligation; an uncertain start shows **Check with SecurePay** and **Try starting again** (same request).
- `WAIT_UNTIL_AVAILABLE` has plain wording and is never a control.
- **Still withheld:** Approve / Reject evidence and Complete this obligation — those endpoints are still not bound to the current version (later Phase 7 slices). The production guard tests now allow only the Progress panel to call `start` / `checkStart`, and still forbid any production call to review / complete.

The section below is the earlier boundary, kept for history; where it says Start is withheld, Slice 1 supersedes it.


Branch `feat/ui-phase7-execution` from UI `main` @ `bfb8bd0cd0996c9623eb01ee8ee5157b72a74e64` (Phase 6 / PR #32 merged). SecurePayAPI `main` @ `75a490bc7bdbe0b213dad00037d7f72be579c13b` (read-only, **not modified**; the API was not run). Not merged, not deployed.

Doctrine: *evidence is a claim; review is a judgment about the claim; completion is backend evaluation over Agreement facts.* The UI reads and, only where SecurePay's own signals allow, records; it never decides what happened.

## FINAL PRODUCTION BOUNDARY (review of head `b027430`): Start, Review and Complete are withheld

**Frontend protection vs atomic authority.** The action-time preflight below (fresh Detail / obligations / next actions / completion-status immediately before the call) **reduces stale-action exposure and stays documented and tested**, but it is still **time-of-check / time-of-use**: after the fresh read and before the POST another client can make a new version current, and SecurePay's start, complete and evidence-review endpoints — whose request DTOs carry no expected Agreement version and whose services do not compare the target's `agreementVersionId` with `agreement.currentVersionId()` inside the transaction — will still accept the old target. **Only the backend can make the current-version check atomic** (either compare `target.agreementVersionId == agreement.currentVersionId()` inside Start / Complete / Review, or accept an expected/current version identifier and reject a mismatch). That is backend work, outside Phase 7.

So, exactly like Phase 6 Apply, the production UI **withholds the three customer-facing execution mutations**: no **Start work**, no **Approve / Reject evidence**, no **Complete this obligation**. The typed gateway methods, the execution controller (preflight, uncertainty handling, settlement rules) and their tests remain as **unwired archaeology**; a source-level guard asserts no production component calls them.

What the Progress surface still does (all read authority is kept): current-version obligation filtering by explicit id, the earlier-versions count, next-action facts, evidence visibility, completion-status requirements, milestone effective states, dependency explanations, whole-Agreement completion (read-only), evidence upload/submission withheld, no fake downloads, no sequence-order dependency, Money separation, and every partial-failure rule. Facts that used to be controls are now read-only, each with a calm limitation line:
- `START_OBLIGATION`: "SecurePay says this work is ready for you to start." + "Starting work from this screen is temporarily unavailable until SecurePay can bind the action safely to the current Agreement version."
- `REVIEW_EVIDENCE`: "SecurePay says this evidence needs review." (evidence stays visible) + "Recording the review from this screen is temporarily unavailable until SecurePay can bind it safely to the current Agreement version."
- eligible completion: "SecurePay says the completion requirements for this obligation are satisfied." + "Completing it from this screen is temporarily unavailable until SecurePay can bind the action safely to the current Agreement version."
Work progressed, reviewed or completed by another authorised client or backend process renders normally from SecurePay's reads (AVAILABLE → IN_PROGRESS → EVIDENCE_SUBMITTED → COMPLETED), and re-review/reconfirmation and completion projection are unaffected.

*The remaining sections describe the controller as built and tested; wherever they say the UI "shows" or "offers" Start / Approve / Reject / Complete, read that as the unwired controller behaviour above — the production panel renders only the read-only facts.*

## Correction pass (review of head `cb82fbb`)
1. **Action-time current-version preflight.** The backend's start, complete and evidence-review endpoints **do not themselves reject work that belongs to a superseded version** (they check Agreement identity only), so rendering-time scoping is necessary but not sufficient. Immediately before every consequential call the controller now **fresh-reads** the Agreement Detail (current version id), the obligations and the caller's next actions (Complete also reads completion-status). It sends **nothing** unless the target obligation's `agreementVersionId` equals the fresh current version id and:
   - **Start**: the fresh next actions still hold `START_OBLIGATION` for it and it is still AVAILABLE/PENDING;
   - **Review**: the fresh next actions still name that evidence with `REVIEW_EVIDENCE`. An uncertain **retry** (same key/decision) is exempt only from the *action-present* test (the first attempt may have landed and removed it) — **never** from the version test, so a cached `pendingReview` cannot bypass currency;
   - **Complete**: `completion-status.eligible` is true *now*, the responsible participant is still the caller, and the obligation is still completable (if it is already COMPLETED nothing more is sent).
   Any preflight read failing means the version can't be established ⇒ nothing is sent. When the Agreement has moved: "The Agreement changed while you were looking at it. This work belongs to an earlier version, so nothing was started/reviewed/completed. Review the current Agreement." The workspace and execution reads are refreshed, the old card disappears, and the message stays visible for the reload it triggers. New work in the new version is offered only as its own fresh action, never transplanted.
2. **`checkStart` no longer over-proves an uncertain Start.** `AVAILABLE` can reach BLOCKED / OVERDUE / CANCELLED without any start, so those prove nothing. Only IN_PROGRESS, EVIDENCE_SUBMITTED, COMPLETED, REJECTED show the work progressed, and even then it says what SecurePay **now shows** ("SecurePay now shows this work as in progress."), not that your start succeeded. For BLOCKED / OVERDUE / CANCELLED: "SecurePay now shows this work as overdue. SecurePay can't establish from this read whether the earlier start request was recorded. Start isn't available from this state." — neutral tone, key released, no retry. Still AVAILABLE/PENDING stays unresolved with the same-request retry.
3. **Approval outcome ≠ reviewer attribution.** `completion-status` proves the review **outcome** (`evidence_approved_<id>`), not who made it (another authorised reviewer may have approved while this request was unsure). An uncertain approval now settles with "SecurePay now shows this evidence as approved in review." (pending cleared; no "your approval"). A direct HTTP 200 to the caller's own request may still say "SecurePay recorded your review".
4. **A failed post-mutation summary refresh fails closed.** After an execution action the workspace re-reads the Hub summary; if that read fails, `selectedCompletionFacts` becomes `null` (Progress shows "Completion status unavailable") and the Hub next actions are cleared (the Overview "Next" block disappears) instead of leaving a stale "Not complete yet" or old action looking current. Detail and the mutation's own fact stay.

## A. Archaeology (SecurePayAPI source) — corrections to the prompt in bold

| Question | Backend truth | UI before | Gap |
|---|---|---|---|
| Who can start? | `POST …/obligations/{id}/start`, `requireObligationProgress` + `requireRead`. Service: `responsibleParticipantId.equals(command.participantId())` — but the **controller passes the obligation's own `responsibleParticipantId` as that argument**, so the check compares it with itself and **can never fail**. The actor's identity is passed but never checked | none | **Any reader with the permission can start any obligation.** The UI therefore gates Start on the caller's own `START_OBLIGATION` next action |
| Who is responsible? | `obligation.responsibleParticipantId` (+ `beneficiaryParticipantId`), participant ids | terms had none | mapped to people by participant id only |
| Statuses that allow start | `ObligationStateMachine`: `AVAILABLE→IN_PROGRESS`, `OVERDUE→IN_PROGRESS`; `from==to` is allowed. Statuses: PENDING, BLOCKED, AVAILABLE, IN_PROGRESS, EVIDENCE_SUBMITTED, COMPLETED, REJECTED, OVERDUE, CANCELLED | — | shown in plain words; unknown = "Status unavailable" |
| Completing requires | `completion-status` eligible: no unmet requirement **and** status IN_PROGRESS/EVIDENCE_SUBMITTED. Requirements: `evidence_required`, `evidence_review_pending_<id>`, `dependency_obligation_<id>`, `condition_<id>`, `obligation_not_completable`. **Every obligation needs ≥1 non-superseded evidence with an APPROVED review** (a NEEDS_MORE_INFORMATION review is ignored = pending). Requirement strings **embed UUIDs** | none | mapped to plain words; ids never shown; unknown code fails closed |
| Who can complete? | `requireObligationProgress` + `requireRead`. **The service checks no participant at all** | none | **No backend authority signal exists for "may complete".** The UI only ever *restricts*: Complete needs `eligible` **and** `responsibleParticipantId == the caller's own participant id` |
| Start/complete idempotent? | `(operation,key)` + digest of the obligation id; `replayIfExists` | — | stable key per obligation until settled |
| Evidence types | `EvidenceType` string; required types come from EVIDENCE conditions (`requiredEvidenceTypes` on next actions) | — | shown as "Evidence asked for" |
| Who may submit? | `requireEvidenceSubmit`; service checks `responsibleParticipantId.equals(submitterParticipantId)` — **again the controller passes the obligation's own responsible id as the submitter**, so it can never fail | none | see F (not built) |
| Who may review? | `requireEvidenceReview` + `requireRead`; only **self-review is prohibited** (submitter identity ≠ reviewer). **No beneficiary/participant check.** `reviewerParticipantId` is a client-supplied, unvalidated request field | none | UI gates on the caller's own `REVIEW_EVIDENCE` next action (produced only for the obligation's beneficiary) and sends the participant id that action carries |
| Review decisions | PENDING, APPROVED, REJECTED, NEEDS_MORE_INFORMATION. Conflicting decision on already-reviewed evidence → 409; same decision → replay. Digest excludes `reason` | — | Approve and Reject only (see G) |
| Does a review change the evidence? | **No.** Nothing in the backend ever assigns `APPROVED`, `REJECTED`, `UNDER_REVIEW` or `SUPERSEDED` to an evidence status (only reads exist); it stays `SUBMITTED`. **The review decision is not returned by any GET**; it surfaces only inside `completion-status` (`evidence_approved_<id>` satisfied, otherwise `evidence_review_pending_<id>`) and by the reviewer's `REVIEW_EVIDENCE` action disappearing | Documents used `status` | approval shown only from completion-status; a rejection is unreadable |
| Superseded evidence | `supersedesEvidenceId` is stored, but the old evidence's status is **never** set to SUPERSEDED, so it keeps counting as pending | — | not built; gap |
| Submission = completion? | No. Submit moves an obligation IN_PROGRESS→EVIDENCE_SUBMITTED only (else unchanged), regardless of the obligation's status or version | — | — |
| What blocks completion? | dependencies (obligation prerequisites), required conditions, evidence review | — | shown |
| Milestone states | stored PENDING/…/COMPLETED; **effective** READY/IN_PROGRESS/WAITING(+reason)/COMPLETED/CANCELLED from explicit `MilestoneDependency` rows only. WAITING reason is `"waiting on milestone(s): <uuid>, <uuid>"` | Progress showed `effective.reason` raw | mapped to milestone titles; ids never shown |
| `sequenceOrder` authoritative? | **No** (explicit doctrine) | used only for display order | never used |
| Milestone completion | derived by `MilestoneService.tryComplete` when dependencies + all obligations complete; no participant endpoint | — | read only |
| **Version scoping** | **`GET /obligations` and Detail `terms` return the obligations of EVERY version** (`findDefinitionsByAgreementId`); Detail milestones, next actions and `findDefinitionsByVersionId` are current-version only. `get`, `start`, `complete`, `submit` validate agreement match only — **not version currency** | Detail Terms, Overview "WHAT" and the Progress root status were computed from all-version `terms` | Progress scopes by **explicit** `agreementVersionId == currentVersionId`; an old-version obligation can never be started/reviewed/completed here. **Terms/Overview still read Detail `terms` (not version-scoped): gap** |
| Whole-Agreement completion | `AgreementCompletionProjectionService`: `COMPLETED` / `NOT_COMPLETED` / `INELIGIBLE` / `UNSUPPORTED`; reasons `CURRENT_VERSION_MISSING, AGREEMENT_CANCELLED, AGREEMENT_EXPIRED, AGGREGATE_COMPLETION_RULE_UNAVAILABLE, REQUIRED_OBLIGATIONS_MISSING, OBLIGATION_INCOMPLETE, AMBIGUOUS_SETTLEMENT_SCOPES, REQUIRED_SETTLEMENT_SCOPE_UNSETTLED, SETTLEMENT_EVIDENCE_STALE`. **No per-Agreement endpoint**: only Hub/Home summaries carry it | shown nowhere | read-only; refreshed by re-reading the Hub summary after an action |
| Next actions produced | **Produced:** `START_OBLIGATION`, `FUND_AGREEMENT` (monetary), `SUBMIT_EVIDENCE` (IN_PROGRESS, OVERDUE), `WAIT_FOR_DEPENDENCY` (BLOCKED, and EVIDENCE_SUBMITTED "awaiting evidence review"), `REVIEW_EVIDENCE` (beneficiary only). **Never produced:** `PROVIDE_LOCATION`, `RECORD_ATTENDANCE`, `SUBMIT_DELIVERY`, `ACKNOWLEDGE_DELIVERY`, `PROVIDE_MORE_INFORMATION`, `WAIT_UNTIL_AVAILABLE`, `RECONFIRM_AGREEMENT_VERSION`, `NO_ACTION_REQUIRED`; and **no "complete" action exists** | Overview "Next" from the Hub | rendered as facts/controls only for the five produced codes |

## B–C. Authority map
| Action | UI shows it when | Endpoint | What becomes true |
|---|---|---|---|
| **Start work** | the caller's own next actions contain `START_OBLIGATION` for that current-version obligation (status AVAILABLE/PENDING) **— re-verified against a fresh read at the press** | `POST …/obligations/{id}/start` | the obligation is IN_PROGRESS (claimed from the returned status, then everything re-read) |
| **Submit evidence** | **never** (no upload/storage) | — | — |
| **Approve / Reject evidence** | the caller's own next actions contain `REVIEW_EVIDENCE` naming that evidence **— re-verified at the press** | `POST …/evidence/{id}/review` | SecurePay recorded *this decision* (200 ⇒ recorded; conflicting ⇒ 409). The evidence status does **not** change |
| **Complete this obligation** | `completion-status.eligible` **and** the obligation's responsible participant is the caller (own id from `confirmation-status`) **— re-verified at the press** | `POST …/obligations/{id}/complete` | this obligation is COMPLETED. Not the Agreement, not Money |
| Whole-Agreement completion | never a control | (read model) | SecurePay's projection says completed |

## D. Current-version scoping
`currentVersionObligations(all, currentVersionId)` filters on **explicit id equality** (no current id ⇒ nothing is current). Old-version obligations are excluded from every list, gate and action, and a line states how many "belong to earlier versions". Milestones come from Detail (current-version only); next actions are current-version only server-side.

## E. Next-action integration
`START_OBLIGATION` → Start work; `REVIEW_EVIDENCE` → Approve/Reject; `SUBMIT_EVIDENCE` → a factual line ("SecurePay is waiting for evidence from you") **plus the honest limitation**; `WAIT_FOR_DEPENDENCY` → a waiting fact (blockers named by title only when known); `FUND_AGREEMENT` → a fact and, only if the existing Money route is supplied, "Open Money" (no funding here). Any other code → "an action… this screen can't show yet". Order is the backend's; nothing is ranked locally.

## F. Evidence storage truth (three separate capabilities)
- **Evidence record API:** exists (`submit`, `list`, `review`). The submit request needs an `objectReference` and `contentHash`.
- **File storage / upload transport:** **does not exist.** No presigned-upload, object-storage or upload endpoint anywhere in SecurePayAPI, and none in this frontend. **Submit evidence is therefore not built** — no upload button, no gateway method, no fabricated reference/hash/blob, no localStorage. (A source test asserts this.)
- **Retrieval / download:** **does not exist.** The evidence list has no filename, uploader, size, hash or URL; nothing is a link or a preview.
Detail's **Documents** area is built from the same evidence records (obligation- and condition-linked); Progress shows evidence in the context of its obligation. They share one authority and one status (`SUBMITTED`), so they cannot contradict.

## G. Evidence review
Approve and Reject are offered; **Ask for more information is deliberately not**: the backend records `NEEDS_MORE_INFORMATION` (as an `EVIDENCE_REJECTED` activity), the completion evaluator ignores it, the reviewer's action disappears, `PROVIDE_MORE_INFORMATION` is never produced, and the responsible participant only ever sees "awaiting evidence review" — the workflow would strand silently. Note the same dead end follows a **Reject** (no resubmission action is produced); it is recorded truthfully and documented, not hidden. **Uncertainty:** timeout/network/5xx ⇒ "We're not sure whether that review was recorded"; the attempted decision is **pinned** (the opposite decision is neither offered nor sendable), retry re-sends the same key/decision, and **Check** re-reads: an *approval* is provable from completion-status; a *rejection* is not readable, so it stays unresolved.

## H–I. Completion status and completing an obligation
completion-status is the only source for "can this be completed": `eligible=false` lists unmet requirements in plain words and offers no Complete; `eligible=true` never auto-completes. **Complete this obligation** carries the consequence line "does not by itself mean the whole Agreement is complete or that Money is released". One key per obligation until settled; uncertain ⇒ "We're not sure whether SecurePay recorded the completion", **Check** re-reads the obligation (COMPLETED proves it), retry is the same request. After success the obligations, next actions, Detail and the Hub summary (completion) are **re-read**; dependents are never advanced locally.

## J–K. Milestones and whole-Agreement completion
Milestone state words are SecurePay's effective states; a failed read shows "Milestone status couldn't be loaded" (no inference); an empty list is "Status unavailable", not "Ready". Milestone 2 can be Ready while milestone 1 is In progress (no dependency from order). A simple Agreement shows its obligations directly — the old fixture logic that **invented a root milestone titled with the Agreement and computed its status locally is bypassed in real mode**. Completion: completed ⇒ "Agreement completed / SecurePay records the current Agreement version as completed" (+ `completedAt`); `NOT_COMPLETED` ⇒ plain reasons; `UNSUPPORTED` ⇒ "Completion isn't available for this Agreement" (not "unfinished"); `INELIGIBLE` ⇒ cancelled/expired; unknown/missing ⇒ "can't be determined". No "Complete Agreement" control exists (a test scans for one).

## L. Partial failure
Obligations, next actions, evidence, completion-status, milestone effective states and the Hub summary fail independently: "couldn't be loaded" (never "no work/evidence"), read-only when next actions fail, no Complete when completion-status fails, no milestone state when effective states fail (`null` ≠ `[]`), Detail unaffected.

## M. Session refresh
`obligations, obligationCompletionStatus, startObligation, completeObligation, obligationEvidence, reviewEvidence, myNextActions` were added to the shared `AUTHENTICATED_AGREEMENT_METHODS` (the Phase 5 drift guard covers them).

## N. Browser verification (kept separate)
- **Real API:** not run.
- **Scripted mock in real Chrome** (shaped from the controllers above; proxied via a scratch config, never port 8080): **A** responsible participant → obligation Ready → "SecurePay says this work is ready for you to start" → **Start work** with the first response lost → "We're not sure whether SecurePay recorded the start" → Try again → In progress (log: two starts, **one key**); an old-version obligation was present and only "1 obligation belongs to earlier versions" appeared. **B** IN_PROGRESS → "SecurePay is waiting for evidence from you… Submitting evidence isn't available in SecurePay yet" — no upload control. **C** reviewer: Approve with the response lost → uncertain, **no opposite decision offered** → Check → "SecurePay shows your approval as recorded" (one review sent: `APPROVED / p-rev`); a lost **Reject** stayed pinned ("a rejection can't be read back"), and Try again resent the same key. **E** not eligible → "Evidence is waiting for an approving review" and no Complete; after an approving review elsewhere → **Complete this obligation** with the response lost → uncertain → Check → Completed. **F** dependent "Painting" was Waiting ("Waiting for “Site preparation”") until the re-read showed it Ready to start. **G** Milestone "Fittings" Ready while "Groundwork" In progress. **H** all work Completed but the projection `NOT_COMPLETED` (settlement outstanding) → "Not complete yet". **I** projection completed → "Agreement completed… Completed 21 Sept 2026". **J** UNSUPPORTED → "Completion isn't available for this Agreement"; an unknown code → "can't be determined". **320 and 375** (same-origin iframe): no horizontal overflow in the Progress surface; at 320 the only overflowing elements were the existing composer and bottom nav.
- **Final boundary, scripted mock (real API not run):** a Ready obligation shows Ready + "SecurePay says this work is ready for you to start." + the limitation and **no button**; evidence needing review shows the evidence, "SecurePay says this evidence needs review." and the limitation with **no Approve/Reject**; an eligible obligation shows "completion requirements … satisfied" + the limitation with **no Complete**; external progression AVAILABLE → IN_PROGRESS → EVIDENCE_SUBMITTED → COMPLETED (changed in the mock) rendered each authoritative state after a re-read with **0 controls**; whole-Agreement completion showed completed / not complete / unsupported with **no mutation control and no "Complete Agreement" control**; the UI made **0 start/complete/review calls** (the single review in the mock log is the scripted "other reviewer"). The *unavailable* completion state is covered by unit tests (the Agreement cannot be opened in the mock when the Hub itself is down). Earlier, before the boundary, journeys were exercised through the controller and are archaeology:
- **Earlier correction pass, scripted mock (real API not run) — pre-boundary, NOT current production behaviour:** **A** v1 "Start work" rendered → mock current made v2 → press → **0 start calls**, message shown, Start no longer offered; **B** v1 Approve rendered → v2 → press → **0 review calls**; **C** eligible Complete rendered → v2 → press → **0 complete calls**; **D** lost Start then the obligation read as OVERDUE / CANCELLED → neutral "can't establish… Start isn't available", no retry, no Start; read as IN_PROGRESS → "SecurePay now shows this work as in progress."; **E** lost Approve (server recorded it) → Check → "SecurePay now shows this evidence as approved in review." (no attribution); **F** Complete succeeded, Hub read failed → obligation shows Completed, completion card "Completion status unavailable", no stale "Not complete yet".
- **Render/unit:** `tests/ui-phase7.test.mjs` (66), including the production guards.
- **Not tested:** real sign-in/session expiry, real RBAC results, screen-reader behaviour, `NOT` a real evidence flow (none can exist), and Journey D (needs-more-information) — **not built** by design.

## O. Tests
778 tests, 0 failing (`node --test tests/*.test.mjs`); `tsc`, `eslint src`, `vite build` clean.

## P. Changed files
`execution/{controller,display,ProgressPanel}` (new), `agreements/{index,refresh}`, `workspace/{controller,WorkspaceExperience}`, `components/AgreementDetail`, tests, this doc.

## Q. Backend/API gaps (none fixed)
1. **Start / submit-evidence responsibility checks are no-ops** (the controller passes the responsible participant as the acting one); completion checks no participant; review checks no beneficiary; `reviewerParticipantId` is unvalidated.
2. **No evidence storage/upload bridge, no evidence retrieval/download, and no uploader/reviewer/size/filename on the evidence list.**
3. **Evidence status never moves past SUBMITTED**; the review decision is not exposed by any read (only inferable from completion-status); the Payment-Ready evidence gate requires APPROVED, which nothing sets.
4. **SUPERSEDED evidence** is never set, so a superseded item still counts as pending; a Reject / NEEDS_MORE_INFORMATION leaves the responsible participant with no action.
5. **Obligation and Detail `terms` lists are not version-scoped**; start/complete/submit don't check version currency.
6. **No permission pre-read**, no "may complete" signal; no `COMPLETE` next action; `WAIT_FOR_DEPENDENCY` is overloaded (blocked vs awaiting review); unproduced enum members (location, attendance, delivery, more-information).
7. Milestone/dependency and completion-requirement strings embed raw ids; conditions are unrenderable ("condition_<id>").
8. **No per-Agreement completion endpoint** (Hub/Home summaries only).
9. Location, attendance and delivery endpoints exist, but no next action ever requests them: **not built** (no sensors/storage invented).

## R. Next phase
Backend first for evidence (upload/storage + retrieval + a real review-status read + responsibility checks + version scoping), then evidence submission and the review loop; or, UI-only, version-scope the Terms/Overview work list and surface Agreement activity for execution events.
