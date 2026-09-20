# UI Completion — Phase 7: Living Agreement Execution, Evidence, Milestones & Completion Truth

Branch `feat/ui-phase7-execution` from UI `main` @ `bfb8bd0cd0996c9623eb01ee8ee5157b72a74e64` (Phase 6 / PR #32 merged). SecurePayAPI `main` @ `75a490bc7bdbe0b213dad00037d7f72be579c13b` (read-only, **not modified**; the API was not run). Not merged, not deployed.

Doctrine: *evidence is a claim; review is a judgment about the claim; completion is backend evaluation over Agreement facts.* The UI reads and, only where SecurePay's own signals allow, records; it never decides what happened.

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
| **Start work** | the caller's own next actions contain `START_OBLIGATION` for that current-version obligation (status AVAILABLE/PENDING) | `POST …/obligations/{id}/start` | the obligation is IN_PROGRESS (claimed from the returned status, then everything re-read) |
| **Submit evidence** | **never** (no upload/storage) | — | — |
| **Approve / Reject evidence** | the caller's own next actions contain `REVIEW_EVIDENCE` naming that evidence | `POST …/evidence/{id}/review` | SecurePay recorded *this decision* (200 ⇒ recorded; conflicting ⇒ 409). The evidence status does **not** change |
| **Complete this obligation** | `completion-status.eligible` **and** the obligation's responsible participant is the caller (own id from `confirmation-status`) | `POST …/obligations/{id}/complete` | this obligation is COMPLETED. Not the Agreement, not Money |
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
- **Render/unit:** `tests/ui-phase7.test.mjs` (42).
- **Not tested:** real sign-in/session expiry, real RBAC results, screen-reader behaviour, `NOT` a real evidence flow (none can exist), and Journey D (needs-more-information) — **not built** by design.

## O. Tests
754 tests, 0 failing (`node --test tests/*.test.mjs`); `tsc`, `eslint src`, `vite build` clean.

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
