# UI Completion — Phase 9: Agreement Review, Disputes & Fair Resolution

Branch `feat/ui-phase9-review` from UI `main` @ `d6d7f3bf3265ee008bbda07606987e242f15b07b` (Phase 8 / PR #34 merged). SecurePayAPI `main` @ `75a490bc7bdbe0b213dad00037d7f72be579c13b` (read-only, **not modified**; the API was **not run**). Not merged, not deployed.

Principle: **a dispute isolates the disputed part. It does not rewrite the Agreement, move money by itself, or make SecurePay a judge by UI invention.** One real backend model (`/api/v1/agreement-reviews`, participant controller); no second frontend dispute engine.

## Fixture archaeology
`src/disputeData.ts`, `DisputeWorkspace`, `DisputeMatchingView`, `DisputeMasterList`, `DisputeMasterOpinion`, `DisputeMatchReached`, `DisputeResolved` etc. (used by `App.tsx`'s fixture/demo harness) are **demo only** and remain so. A source guard asserts nothing under `src/features/review/` or `WorkspaceExperience` imports them. The Master marketplace, party matching, "Match reached" and settlement suggestions have **no** counterpart in the participant Review API and are not promoted.

## Backend participant contract (SecurePayAPI `AgreementReviewParticipantController`)
| Capability | Endpoint | DTO facts used |
|---|---|---|
| List my cases | `GET /agreement-reviews?page&size≤50&agreementId&state&activeOnly` | summary: case id, agreement id, **agreementVersionId**, subject type/id, caller role, state, opened/deadlines, terminalOutcome, case `version` |
| Read case | `GET /agreement-reviews/{id}?agreementId` | + decisionReasonCode, callerAcknowledged, callerResponded |
| Acknowledge | `POST /{id}/acknowledgements` (`Idempotency-Key`, `expectedVersion`) | |
| Respond | `POST /{id}/responses` (`Idempotency-Key`, `expectedVersion`, `responseType`, `narrative` ≤4096, `supersedesResponseId?`) | |
| Evidence metadata | `GET /{id}/evidence` | type, filename, media type, length, time, submittedByCaller |
| Escalate | `POST /{id}/escalations` | unwired |
| Open | `POST /open` | unwired |
| Evidence upload | `POST multipart /{id}/evidence` | not modelled (client is JSON-only) |
The Operations/Reviewer controller is a separate authority and is not in the gateway, the table, or any UI.

## What is live
- **Reads:** the Agreement's Review list (paginated, ≤50, "Showing N of M" + real next page), case detail, evidence metadata. Each is an independent read; failure is unknown, never zero.
- **Acknowledge** and **Respond** (details below).
- Entry: Agreement Detail → **Support** → **Reviews & issues** (the old fixture "Raise an issue" row remains only on the fixture path). The panel is reached from the real workspace only; Notifications can only open the Agreement (a `REVIEWS` notification carries an Agreement id, no review id, so no case deep link is invented).
- Version context: each case is labelled **Current Agreement version** / **Earlier Agreement version** / **Agreement version context unavailable** by comparing the case's `agreementVersionId` with the exact Agreement Detail's current version (Phases 5/8). An earlier-version case is history, not "stale". Version numbers ("Agreement version 1") appear only when the exact `versions` read resolves them; raw ids are never shown.
- Subject labels: `AGREEMENT` → "The Agreement"; `AGREEMENT_VERSION` → "Agreement version N" (if resolvable); `OBLIGATION` → its title (exact `obligations` read); `RELEASE_INSTRUCTION` → "A payment release instruction"; everything else or unresolvable → "A part of this Agreement".
- Bounded copy for states, outcomes, reason codes, roles (participant roles only), evidence types; unknown fails closed ("SecurePay has a review state this screen cannot describe yet.").

## Participant actions — each classified independently
**Acknowledge — LIVE.** Repository truth (`AcknowledgeAgreementReviewCaseService`): caller must be an active **RESPONDENT**, case state `OPENED` or `AWAITING_RESPONSE`, non-terminal, `expectedVersion == case.version` (else `AGREEMENT_REVIEW_STALE_VERSION` 409), idempotent by key (fingerprint = identity|agreement|case|expectedVersion; replay returns the original). It changes only the caller's participant row (`acknowledgedAt`), audited. Consequence sentence: *"When you press this, SecurePay will record that you have seen this review — nothing more. It doesn't mean you agree, accept an allegation or accept an outcome."* Offered only when `callerRole == RESPONDENT`, state ∈ {OPENED, AWAITING_RESPONSE}, `!callerAcknowledged`, from a fresh case read. Uncertain outcome is reconciled from `callerAcknowledged`.

**Respond — LIVE.** `SubmitAgreementReviewResponseService`: caller must be an active participant whose role `canRespond()` (RESPONDENT / AFFECTED_BENEFICIARY / AFFECTED_FUNDER), state `AWAITING_RESPONSE` or `EVIDENCE_COLLECTION`, `expectedVersion == case.version`, response deadline enforced by the backend clock (`AGREEMENT_REVIEW_RESPONSE_DEADLINE_PASSED`), narrative required and ≤4096, idempotent by key. It records a response row and, once every active respondent has responded, the *backend* moves the case to evidence collection; the UI never infers that. A deliberate review step precedes submit: *"When you press submit, SecurePay will record your formal response against this exact review. It records what you say; it does not decide the review."* After success: *"SecurePay recorded your response. This does not decide the review."*; after refresh only *"SecurePay shows that you have responded."* — the narrative is **never** reconstructed (no response read exists). Because `supersedesResponseId` cannot be recovered after refresh, no "edit response" exists and the control disappears once `callerResponded` is true (a second response would be an unlinked duplicate).

**Escalation — WITHHELD.** The service checks only the `AGREEMENT_REVIEW_ESCALATE` permission (it does not even require the caller to be a case participant), is valid only from `UNDER_REVIEW`/`DECISION_PENDING`, and "records escalation intent only; decision execution remains separate". No repository migration grants that permission to any ordinary role, the permission reads like a senior-queue capability, and **no read fact proves an escalation request landed** — so an uncertain request could not be settled. Cannot state the consequence narrowly and recover it ⇒ withheld; the case state is still shown.

**Open review — WITHHELD.** Not wired. See gaps 1 and 2.

**Evidence upload — WITHHELD.** Not wired (no file input, no multipart code). See gap 3.

## Idempotency and concurrency
Phase 8's `createAttemptStore`: one logical command = one exact request + one key. Acknowledge/respond each have a store; an unresolved attempt (network/timeout/5xx) is immutable — a changed request is **refused**, nothing is sent and no key is minted; the response type, narrative and radios are frozen and the only actions are **Try the same request again** (same case, same `expectedVersion`, same type/narrative, same key) and **Check what happened** (a re-read; `callerAcknowledged` / `callerResponded` settle the attempt). `expectedVersion` is always the **Review case `version`** from the freshly read case — never an Agreement version, never a cached number. A stale-version conflict is definite: nothing is retried, the case is re-read, the draft narrative is kept, and the user sees *"This review changed while you were looking at it. SecurePay refreshed the current review before you continue."*; a later submit is a **new** logical request bound to the fresh version. While a case re-read is in flight (or failed) no new action can start. Deadline-passed, not-found (404), forbidden (403) and other definite rejections have their own bounded copy.

## Evidence
Existing metadata is shown: label from the bounded type, filename, media type, size, time, and "Added by you". No download, preview, object URL, link or file input. Where the state would allow evidence: *"SecurePay can show evidence already recorded on this review. Adding new evidence from this screen is temporarily unavailable until formal review evidence has durable storage and retrieval."* Contents are never inferred from MIME type or filename.

## Outcome semantics and Money
Review outcomes are financially non-executing. Exact copy: RELEASE_ALLOWED "The Review allows downstream release qualification."; RELEASE_BLOCKED "The Review blocks downstream release qualification."; OBLIGATION_SATISFIED / NOT_SATISFIED "…found the reviewed obligation satisfied / not satisfied."; CASE_DISMISSED "The Review was dismissed."; NO_DECISION "…closed without a substantive decision." Every decided case says *"A Review decision does not move money by itself. Open Money for the current financial state."*; active cases say *"This review may affect whether related money can progress. Open Money for the current financial state."* The Review layer imports no Money authority and computes no amount, freeze or restriction (tests assert this); "Open Money" is the existing Phase 8 handoff. A passed deadline is a fact ("The listed response deadline has passed. SecurePay still shows this review as Waiting for response."); the browser clock never changes state.

## Session refresh
`REVIEW_AUTHENTICATED_METHODS` (typed with `satisfies`) drives `withSessionRefresh` for the Review gateway; a test parses the gateway source and fails if a method is added but not listed. No public Review methods exist.

## Verification (stated separately)
- Automated: `node --test tests/*.test.mjs` **840 pass / 0 fail**; `npx tsc -p tsconfig.app.json --noEmit` clean (the vacuous `tsc --noEmit -p .` is not used); `npx eslint src --quiet` clean; `npx vite build` ok.
- Browser (scripted mock shaped from the controller's records; **SecurePayAPI was not run**), at real 375px and 320px viewports (same-origin iframe) and 1100px: no page overflow at any width. Agreement Detail → Support → Reviews & issues → list with an active current-version case and an earlier-version decided case; case detail (state, deadline, role, evidence metadata, no file input, no links); acknowledge with an **uncertain** response → same key on retry → "Check what happened" settled from `callerAcknowledged`, no duplicate CTA; response with a **stale version** (exactly one send at v7, case re-read, draft kept) then an **uncertain** response (controls frozen, retries sent the identical body with one key, then success at the fresh version) → "SecurePay shows that you have responded", no narrative reconstructed; decided `RELEASE_ALLOWED` shows no payment language; list failure → "Reviews couldn't be loaded"; evidence and detail failing independently; earlier-version relabelling after the mock changed the case's version.
- Not verified: anything against the real backend; escalation, open and upload have no UI to verify by design.

## Backend gaps (not fixed from the frontend)
1. **Public review-start orchestration.** `OpenAgreementReviewCaseService.open` creates the case, subject, an `OPENER` participant and an active subject-scope lock, but enrols **no** respondent; `RequestAgreementReviewResponseService` (enrols `RESPONDENT`s, `OPENED → AWAITING_RESPONSE`, sets the deadline) has no public endpoint and is referenced by no controller. Participant read access depends on review-participant records, so a bare `POST /open` (which also notifies the other Agreement participants) could leave people unable to read/respond. Needed: one idempotent customer-safe operation that opens, selects/enrols respondents, moves to `AWAITING_RESPONSE`, sets the deadline and notifies enrolled people.
2. **Review Reserve eligibility read.** `enforceReserveEligibility` requires a minimum Review Reserve (`REVIEW_RESERVE_MINIMUM_MINOR = 20_000`, KES 200) but no participant-facing read exposes eligibility, minimum or currency. Nothing is calculated from Money balances.
3. **Durable evidence.** `InMemoryAgreementReviewEvidenceStorageAdapter` is an "in-process immutable evidence store (placeholder — no external object storage)"; there is no participant content-retrieval endpoint and no retention/deletion contract.
4. **Participant response read** (party-by-party visibility, or editing after refresh via `supersedesResponseId`).
5. **Participant decision detail** beyond `terminalOutcome` + reason code, if richer rationale is wanted.
6. **Participant-safe escalation capability** (and a readable fact that an escalation request was recorded).
7. **Review permission provisioning.** No migration grants `AGREEMENT_REVIEW_READ_SELF` / `RESPOND` / `OPEN` / `SUBMIT_EVIDENCE` / `ESCALATE` to any seeded role; the UI treats a 403 as "SecurePay says this account can't do that" and a failed read as unavailable, never as "no reviews".
8. **Future opening journey:** a case is bound to an immutable `agreementVersionId`; an earlier-version review is legitimate history, and duplicate active reviews for the same version + subject are prevented by the backend (its conflict responses must be rendered factually when opening is exposed).

## Next-phase recommendation (not started)
Do the two backend items that unblock the customer journey first (public review-start orchestration + Review Reserve eligibility read), then expose "Start a formal review" with an exact-version, exact-subject wizard; durable evidence storage/retrieval next; Operations/Reviewer tooling is a separate internal phase.
