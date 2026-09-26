# UI Completion — Phase 6: Agreement Changes, Amendments, Version Review & Reconfirmation

## KS001 Upgrade Phase 7 — Slice 5 (Amendments & Change): **Agree / Reject / Withdraw are wired; the single-actor Apply is gone**

**Current architectural decision.** SecurePayAPI Phase 7 Slice 5 (branch `feat/phase7-amendments-change-slice5`) changes how a proposed change works:
- A change is a **structured change set** bound to the exact current version. It can change the Agreement's title, purpose or description, the title or description of a piece of work, or who a piece of work is for.
- It becomes a **new version only after every other established participant explicitly agrees**. The last agreement creates the version. The earlier version and all work history are kept.
- Unstarted work carries over to the new version with recorded lineage.
- Nothing can be changed once work has started or money is in (the locked "funded Agreement is immutable" rule).
- `POST /amendments/{id}/apply` was **removed**. The new endpoints are:
  - `GET /amendments/overview`
  - `POST /amendments/{id}/accept`, `/reject` and `/withdraw`, each with `{idempotencyKey, expectedAgreementVersionId}`. A stale version returns 409.

This UI:
- **Changes panel** is driven by SecurePay's overview, not by client-side diffing. It shows:
  - who proposed the change ("You proposed this" / "Peter proposed this");
  - the source version and the reason;
  - each change as **Now / Proposed** in plain words (never ids, KS Numbers or backend field codes);
  - **who needs to agree**, with each person's answer;
  - the live-work effect in SecurePay's own words;
  - that agreeing to a change is not confirming the new version.
- **Controls come only from SecurePay's flags.** A responder who hasn't answered gets **Agree to this change** and **Reject this change**; the proposer gets **Withdraw proposal**. A responder who already agreed, and a stale proposal, get nothing. With no open proposal, SecurePay's `changeability` is explained (work started / funded / closed / nobody else joined). Where a change could be proposed, the panel says honestly that proposing isn't available from this screen yet (see gaps).
- **Controller** (`amendments/controller.ts`):
  - Every response pins **one key and the exact current version** until SecurePay gives a definite answer, so an uncertain retry is the same request.
  - An uncertain response is settled only from the overview. The caller shown as `ACCEPTED` means the acceptance was recorded; history `APPLIED` / `REJECTED` / `WITHDRAWN` is the outcome.
  - A 409 re-reads the Agreement and the overview before saying nothing changed, and releases the key.
  - 401 and 403 are definite and release the key.
  - A 422 on a closed proposal reports its real outcome; backend wording is never echoed.
  - The new version number comes only from SecurePay: the response, or the overview history when a replay returns none.
- **Next-action words** for `REVIEW_AMENDMENT` and `AMENDMENT_AWAITING_RESPONSES`.
- **Reconfirmation** is unchanged: a material new version still shows "Version N needs your review" through the same confirm flow.

**KS001** explains a pending change in chat (backend read tool) and never proposes, accepts, rejects, withdraws or confirms.

**Tests:** `tests/ui-phase6.test.mjs` (45) — contract, render, controller (version-binding, key pinning, settlement, 409/401/403/422) and scope guards. Full suite: 1270/1270; `tsc`, `eslint`, `vite build` clean.

**Remaining gaps (registered in SecurePayAPI):**
- There is no in-app proposal composer. The backend propose endpoint exists; the UI does not author changes yet.
- Money terms can't be amended.
- Amending once work has started is not supported (a product decision).

The sections below are the Phase 6 boundary, kept for history. Where they say Apply is withheld or that the diff/row gaps remain, Slice 5 supersedes them.

Branch `feat/ui-phase6-amendments` from UI `main` @ `0006d71bf5a691d996966c58485a852fe5aa6b32` (Phase 5 / PR #31 merged). SecurePayAPI `main` @ `75a490bc7bdbe0b213dad00037d7f72be579c13b` (read-only, **not modified**; the API was not run). Not merged, not deployed.

Doctrine: *a proposed change is a conversation about the Agreement; an applied change creates a new version; a confirmation belongs to the exact version reviewed; history is never rewritten.*

## A. Archaeology (SecurePayAPI source) and where the prompt's assumptions were wrong

| Question | Backend truth | UI before | Gap / correction |
|---|---|---|---|
| Who can propose? | `requireAmendmentAuthority`: the creator **or anyone with a participant row for their identity**, whatever the status (so a targeted-by-identity `INVITED` row qualifies) | none | Phase 6 does not build propose (see D) |
| Statuses that allow amendments | `AgreementStatus.allowsAmendments()` = `PARTICIPANTS_JOINING`, `CONFIRMATION_PENDING`. `loadAgreement` enforces it for **every** operation **including list** | none | Listing a DRAFT/PROPOSED/INVITATION_PENDING/CANCELLED/EXPIRED Agreement's amendments answers 422. The UI does not call it and says it can't be read (never "no changes") |
| `proposedTerms` = patch or replacement? | **Patch.** Apply does `new HashMap(current.snapshot()); putAll(proposedTerms)` and sets `version_number` = N+1 | — | see C |
| Fields that are safe to change | Snapshot keys written at creation: `title, purpose, description, agreement_type, currency, proposed_amount_minor, version_number`. Apply accepts **any** key | — | see D |
| Who can apply | Controller: `requireAmendmentApply` (RBAC) + `requireRead`; service: creator or any participant row. **The proposer can apply their own proposal** (no separation of duties) | — | **Backend supports Apply, but the production UI deliberately withholds it** (no customer-facing Apply control in Phase 6): applying currently creates a current-version / Agreement-row divergence (see Correction pass #2 and Gap 2) |
| Who can reject | Controller `requireAmendmentReject` + `requireRead`; the **service checks no participant/creator** at all | — | server decides |
| Who can withdraw | Only the proposer (`proposedByIdentityId`), else 422 "only proposer may withdraw" | — | Backend permits withdrawal only by the proposer, but proposer identity is **not exposed** to this UI. The UI therefore uses the neutral **"Withdraw proposal"** and lets SecurePay check authority; a refusal is shown in plain words |
| Proposer identity exposed? | **No.** `AgreementAmendmentResponse` = id, sourceVersionId, proposedTerms, reason, status, appliedVersionId, createdAt, updatedAt | fixture `requestedBy` | No "requested by" is shown anywhere |
| Propose idempotent? | Yes (key + digest of `key|proposedTerms`; reason is **not** in the digest) | — | — |
| Apply idempotent? | **Broken in practice.** The service checks `status != PROPOSED → 422 "amendment not applicable"` **before** the idempotency lookup, so a retry after a *successful* apply gets 422, not the replay | — | An uncertain/422 apply is settled by re-reading the amendment: `APPLIED` + `appliedVersionId` is the proof |
| Reject / withdraw safe to retry? | If the amendment is no longer PROPOSED they return **200 with the unchanged amendment** (a silent no-op) | — | A 200 is not proof; the UI claims "rejected/withdrawn" only from the returned status, else "Nothing was changed: this proposal is already X" |
| What makes an amendment stale? | Apply requires `sourceVersionId == current version id`, else 422 "stale amendment source version". Other PROPOSED amendments are **not** touched when one is applied; **nothing ever sets `SUPERSEDED`** | — | The UI compares the same ids and shows "moved on… can no longer be applied" and hides Apply |
| What apply does | New version (`CURRENT`), previous `SUPERSEDED`, Agreement → `CONFIRMATION_PENDING`, amendment `APPLIED` + `appliedVersionId`. Returns the new **version** (not the amendment). **`copyAgreement` keeps the Agreement row's own title/amount/etc. unchanged** | — | see Gaps: row/snapshot divergence |
| `materialChange` | `AgreementSnapshotHasher.isMaterialChange`: differs in any of `title, purpose, description, agreement_type, currency, proposed_amount_minor, participant_roles, payer_designation, payee_designation, organization_id, expires_at` | — | Shown as SecurePay's fact only, never used to decide anything |
| Earlier confirmations | **Material:** confirmation rows → `INVALIDATED`. **Non-material:** rows stay `CONFIRMED` but on the old version. Participant status stays `CONFIRMED` in **both** | — | see H |
| Reconfirm for every new version? | Effectively yes: both `/confirmations` (`confirmationCurrent` = row's version is the current version) and `/confirmation-status` (`reconfirmationRequired`) say non-current/reconfirm for material **and** non-material | — | the backend does not distinguish here; the UI doesn't either |
| Next action telling a participant to reconfirm | `RECONFIRM_AGREEMENT_VERSION` exists in the enum and the Hub classifier, but **nothing in the backend produces it** | — | The Hub "changed, review required" bucket is unreachable; the only reconfirm signal is the confirmation projections |
| Competing amendments | Two PROPOSED against v1; applying A leaves B `PROPOSED` with a stale source | — | B is shown stale with no Apply and is never rebased |
| Notifications | `AMENDMENT_PROPOSED` and `RECONFIRMATION_REQUIRED` activity types have notification policies | — | The UI claims no notification or delivery |

## C. Diff semantics (the merge blocker) — RESOLVED BY FAILING CLOSED

`proposedTerms` is a **patch** at apply time (`putAll`). SecurePay's `AgreementAmendmentDiffService`, however, treats `proposedTerms` as a **complete snapshot**: it compares it with the full source snapshot and reports every source field absent from `proposedTerms` as `REMOVED` (its own test asserts a removal). For a partial patch such as `{proposed_amount_minor: 4500050}` the diff therefore says *title, purpose, description, agreement_type, currency … REMOVED*, while apply keeps every one of them. No other layer normalises proposedTerms; the only proposal in the repo's own integration test is the partial patch `{title: "Amended agreement"}`.

Rule implemented (`features/amendments/display.ts#trustedDiff`): the backend diff is rendered **only when it contains no `REMOVED` entry** (then patch and snapshot semantics agree: every listed change is exactly what apply would do), no unknown change type, and no `version_number` entry (apply overwrites it). Otherwise it returns `null` and the UI says **"SecurePay can't safely show a complete comparison for this change yet"**, showing only what the proposal explicitly SETS (`proposedFields`: a label and a value per named, customer-facing field — no comparison implied, no "removed"). The frontend never computes its own diff. Tests reproduce the backend's REMOVED output for a partial patch and assert it never reaches the UI.

## D. Change authoring — deliberately not built
Every canonical snapshot key (`title, purpose, description, agreement_type, currency, proposed_amount_minor`) is **mirrored on the Agreement row**, and apply does **not** update the row. Amending any of them would put the version (snapshot) and the Agreement (row, which Detail's overview, Terms, and Money read) out of agreement. There is no safe general authoring model, so there is no "Propose a change" form, no `proposeAmendment` gateway method, and no arbitrary JSON editor. Phase 4's "This needs changing" still (truthfully) says a change request can't be sent from here. Proposals made by other clients are fully reviewable and actionable.

## Correction pass (review of head `421d529`)
1. **Uncertain Reject/Withdraw can never expose Apply recovery.** `Notice` now carries the `action` it is about (`apply | reject | withdraw`). An uncertain reject/withdraw immediately re-reads the amendment and settles **only** from the returned status: `REJECTED`/`WITHDRAWN` = proven; any other non-PROPOSED status is reported as it is ("this proposal is applied"); still `PROPOSED` stays unresolved ("…hasn't been rejected. You can try rejecting again") with **Check what happened** (`checkTerminal`) and **Try rejecting/withdrawing again**; a failed read stays uncertain. No path from these calls `apply` or `checkApply`, and the panel renders no Apply control.
2. **Apply is deliberately withheld.** Applying creates a new current version but does **not** update the Agreement row's title/purpose/description/type/currency/amount, which Detail's Overview reads (the exact-version review reads the snapshot). So SecurePay's own views would disagree about the current Agreement. The production Changes panel has no Apply control (removed, not disabled); a PROPOSED, non-stale proposal shows: "This proposed change can be reviewed here, but SecurePay can't safely apply it from this screen yet." The typed `applyAmendment` gateway method, the controller's `apply`/`checkApply` and their tests are kept as archaeology (not wired to any customer control; a source-level test guards this). Externally applied amendments are fully supported: status, "Applying it created version N", version history, current-version review and reconfirmation.
3. **Withdraw claims no ownership.** The response has no proposer, so the button is **Withdraw proposal**, with "Only the person who proposed it can withdraw it; SecurePay will check that authority." A refusal stays a plain definite outcome.
4. **Stale-confirmation wording**: "You confirmed version 1. That confirmation doesn't cover version 2. You haven't confirmed version 2 yet."

## E–G. What was built
- **Changes tab** (`ChangesPanel`) with two distinct concepts: **Versions** (number, Current/Earlier, created date, reason, "SecurePay marked this a material change") and **Proposed changes** (status in SecurePay's words: Proposed / Applied / Rejected / Withdrawn / Superseded; anything else "Status unavailable"). Each proposal shows the source version, reason, and "See what's proposed" (trusted comparison, or the safe fallback). No requested-by, no "accepted".
- **Actions**, each its own explicit press: **Reject proposed change** ("keeps the current Agreement as it is") and **Withdraw proposal** (proposer only; the server decides). **There is no Apply** (see Correction pass #2). A version created by an amendment applied elsewhere shows as current with its predecessor kept in history.
- **Reconfirmation** (`ReconfirmPanel`, above the tabs): shown only when the caller's own `confirmation-status` row says `reconfirmationRequired` (never for the creator; a failed read shows nothing). It names both versions ("You confirmed version 1. That confirmation doesn't cover version 2. You haven't confirmed version 2 yet." — an earlier confirmation still exists; the current version is unconfirmed), the reason, the materiality fact, and — only if the comparison is trusted — **What changed**; then **Review version N** → the same canonical card and **Yes, I confirm this version** as Phase 4, bound to the exact version id, number and content hash. The diff is orientation; the current version is what is confirmed.
- **People** now maps the material case correctly: participant `CONFIRMED` + row `INVALIDATED` (not current) → "Confirmed version 1 · needs to review version 2" (the Phase 5 rule would have shown it as unknown). Materiality is never an input.

## I–J. Stale, idempotency and uncertainty
- **Apply (controller behaviour only; no production control invokes it):** one key per amendment until settled; timeout/network/5xx → "We're not sure whether the change was applied" with **Check what happened** (re-read; APPLIED + `appliedVersionId` proves it) and **Try applying again** (same key). A 422/409 is settled by re-reading (an already-applied amendment answers 422 "not applicable"); stale ⇒ "changed after this proposal was made… Nothing was applied", with the Agreement re-read first. 401/403 are definite ("Nothing was applied"), key released.
- **Reject / withdraw:** no key exists; uncertain ⇒ immediate re-read, settled only from the returned status (see Correction pass #1); a 200 with a different status is reported as "already X", never as done.
- **Reconfirm:** one key, exact id/number/hash; uncertain ⇒ retry the same request; the Agreement moving ⇒ the new current version is shown with a notice and nothing auto-confirms.

## K. Partial failure
Detail is core and fails closed. Amendments are additive: if they fail, Versions still show and Changes says "Change history couldn't be loaded right now" (never "no changes"); if the diff fails the proposal keeps its status, reason, source version and explicit fields; `confirmations`/`confirmation-status` failures leave People "unknown" and show no reconfirmation prompt.

## L. Session refresh
`amendments`, `amendmentDiff`, `applyAmendment`, `rejectAmendment`, `withdrawAmendment` were added to the shared `AUTHENTICATED_AGREEMENT_METHODS`; the Phase 5 drift guard covers them.

## M. Browser verification (kept separate)
- **Real API:** not run.
- **Scripted mock in real Chrome** (shaped from the controllers above; proxied via a scratch config, never port 8080). **Final production behaviour** (verified after the correction pass): a PROPOSED amendment shows the calm limitation and **no Apply control**; **Reject** with the response lost (server did reject) → immediate re-read → "rejected… stays as it is", **no Apply button, no apply call** (log `reject:amB1`, Agreement still v1); **Withdraw** with the response lost and *no* effect → "still shows this proposal as proposed, so it hasn't been withdrawn" with Check what happened / **Try withdrawing again** (no Apply/Reject recovery); Check stays unresolved; Try again → "withdrawn" (log `withdraw:amA1` ×2, no apply); an amendment **already applied by another client** (Agreement at v2, amendment `APPLIED`) → Changes shows Applied + "Applying it created version 2", Version 2 current and Version 1 kept, and the participant sees "Version 2 needs your review… You confirmed version 1. That confirmation doesn't cover version 2. You haven't confirmed version 2 yet.", What changed, Review version 2 → **Yes, I confirm this version** sent once as `v2 / 2 / h2` (none before the press) → "You confirmed this version". Also verified and still current: **B** two proposals with source version, reason and no Apply; **I** partial diff → only "Amount KES 45,000.50", no "removed"; complete-snapshot diff → "Earlier: KES 68,000.50 / Proposed: KES 45,000.50"; **F** reject → v1 unchanged; **G** withdraw → v1 unchanged; **E** participant reconfirmation (above); People (creator) "Confirmed version 1 · needs to review version 2"; **J** amendments failing → "Change history couldn't be loaded", versions intact; diff failing → proposal kept with explicit fields. **320 and 375** (same-origin iframe): the review prompt, stale banner, comparison and actions wrap with no horizontal overflow in the Agreement surface; at 320 the only overflowing elements were the pre-existing "Ask" composer and bottom nav.
- **Pre-correction archaeology / earlier browser verification — NOT current production behaviour.** Before the correction pass the UI briefly had an Apply control, and the scripted mock was driven through it: **C** Apply → v2 current with v1 kept as history; **H** lost apply response → "We're not sure…" → Check what happened → "Applied… version 2" (one apply key); **D** a second client applied A, then Apply on B in the UI → refused (422 stale), Agreement re-read to v2, B shown stale. That Apply control has since been removed; C/H/D survive only as unit tests of backend authority and the controller's read/settle behaviour (`applyAmendment`/`apply` are unwired, and a test guards that). What those runs established about the backend (an applied amendment yields v2 while the Agreement row keeps the old values; a replay of an applied amendment answers 422) is why Apply is withheld.
- **Render/unit:** `tests/ui-phase6.test.mjs` (54).
- **Not tested:** real sign-in/session expiry, real 403 permission results (RBAC codes), screen-reader behaviour, a non-material amendment in the browser (unit only), and the mobile Agreement-changed-while-reviewing path.

## N. Tests
712 tests, 0 failing (`node --test tests/*.test.mjs`); `tsc`, `eslint src`, `vite build` clean. (Also updated `tests/ui-phase5.test.mjs`-adjacent behaviour via `peopleView`; Phase 1–5 remain green.)

## O. Changed files
`amendments/{controller,display,reconfirm,ChangesPanel,ReconfirmPanel}` (new), `agreements/{index,refresh}`, `workspace/{controller,view,WorkspaceExperience}`, `components/AgreementDetail`, `recipient/controller` (exports `pickCurrentVersion`), tests, this doc.

## P. Backend/API gaps (none fixed here)
1. **Diff vs apply**: diff = full-snapshot compare, apply = patch merge; partial patches yield false `REMOVED`. Needs one contract (normalise proposedTerms to a snapshot, or diff the merged result).
2. **Agreement row vs version snapshot**: apply updates the version only; the Agreement's own title/amount/purpose/description/currency (read by Detail overview, Terms and Money) keep the old values. (Visible in the mock as an Overview amount that doesn't move; the same in the real service by code reading.)
3. **Apply idempotency ordering**: a retry after success gets 422 instead of the replay.
4. **No proposer identity**; no permission discoverability (Apply/Reject/Withdraw can't be pre-checked); reject has no participant check in the service; the proposer may apply their own proposal.
5. **`RECONFIRM_AGREEMENT_VERSION` is never produced**, so the Hub "changed" bucket and next-action can't drive reconfirmation.
6. **Materiality vs reconfirmation**: non-material versions still require reconfirmation in the projections; materiality only changes the row status (`INVALIDATED`).
7. **`SUPERSEDED` amendment status is never set**; competing proposals stay `PROPOSED` with stale sources.
8. **Amendment history unreadable** for non-amendable statuses (DRAFT, PROPOSED, INVITATION_PENDING, CANCELLED, EXPIRED).
9. **No safe authoring schema**; propose digest excludes `reason`; no notification/delivery facts.

## Q. Next phase
Resolve the two backend consistency gaps first (diff/patch and row/snapshot), then build safe change authoring on that contract; or, if backend changes are out of scope, Agreement completion / evidence, which the amended-and-confirmed Agreement now unblocks.
