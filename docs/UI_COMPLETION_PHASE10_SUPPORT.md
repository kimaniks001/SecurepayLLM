# UI Completion — Phase 10: Support, Exceptions & Recovery Truth

Branch `feat/ui-phase10-support` from UI `main` @ `42cfbc4e5ba8f42dc2b65c4d462734f0e79ebc37` (Phase 9 / PR #35 confirmed merged). SecurePayAPI `main` @ `75a490bc7bdbe0b213dad00037d7f72be579c13b` (read-only, **not modified**; the API was **not run**). Not merged, not deployed.

Doctrine: *Unknown is not failed. Requested is not being worked. Being worked is not recovered. Recovered is not necessarily restored to the same spending authority.* Help & Support is a **routing and truth surface**, not a ticket console.

## Support archaeology — customer vs staff
| Surface | Who | Status |
|---|---|---|
| Ask KS001 (the one persistent conversation) | customer | existing; reused |
| Formal Review / Reviews & issues | customer | Phase 9; reused |
| Money settlement / Payment Ready / exceptions | customer | Phase 8 + this phase (exception projection) |
| Account credential recovery | signed-out/any | existing `RecoveryExperience`; reused |
| Notifications | customer | existing; attention, not case management |
| `GET /api/v1/support/context/{traderKsNumber}` | **staff only** | never called from customer UI |
| Money Operations (`MoneyOperationsExperience`) | **operations only** | separate gated route; not reachable from customer Help/Money/Review |
| Held-exception resolution (R6A `ResolveHeldExternalPaymentReleaseExceptionService`) | operations | not exposed |
| Exercise reversals (`/agreement-money/exercise-reversals`) | see below | not wired |
| Customer support-case create/read | **does not exist** | see "Human support gap" |

## Staff Support Context boundary
`SupportContextController` is documented as a "purpose-limited staff support projection; not a general trader-search API". It needs `SUPPORT_CONTEXT_READ` and an `X-Outreach-Case-Ref` header, and returns a bounded projection (reference, display name, identity status, ≤20 Agreements with participant status/next actions/deadlines/completion) deliberately excluding contacts, documents, evidence, balances, ledger, instruments, payout destinations and risk internals. Phase 10 does **not** call it, does not ask a customer to supply a case reference, and does not present "what support sees". A source guard fails the build if `/api/v1/support`, `X-Outreach-Case-Ref` or `SUPPORT_CONTEXT_READ` appears anywhere in `src`. The customer sees their own first-party surfaces; this separation is architecture, not missing wiring.

## Canonical Help & Support
- New `AppView` **`support`** (not a NavBar tab). Reached from: **Account** ("Help & Support"), **Agreement → Support → Help & Support**, **Money exception → "Get help with this"**, **Review → "Help with this review"**. Signed-out users can reach it only through the shell (its "Trouble signing in" and "Ask KS001" work signed out).
- Global (no context): "What do you need help with?" — An Agreement · Money · A formal review · Store or Community · Trouble signing in · Something else — ask KS001. Each row states its exact consequence ("When you press this, SecurePay will …"). It is a router, not a dashboard: it starts with the person's choice.
- Contextual (scoped by the screen it came from): the context is the **minimum** the screen already showed (`SupportContext`: agreement id + title + version label + version id; or, for a Money exception, only the bounded customer-safe heading, reason, required-action words and date). In memory only — no URL/storage/history; cleared on every navigation so Account → Help is global, never a stale Agreement.
- Help re-reads the **exact Agreement Detail** itself. "Help with Bathroom retiling · version 2" appears only if the fresh version equals the source screen's; otherwise the fresh title plus "The Agreement changed after you opened Help…" (the Phase 8/9 truth discipline). If the read fails: "This Agreement's current context couldn't be refreshed…", no version label.
- Domain reads are independent and only what the person can already read as themselves: their Agreement, that Agreement's active Reviews (`list activeOnly`), that Agreement's Money status. Each is labelled with its source ("From Formal Review", "From Money"). If Money fails and Review loads: both are shown, Money says "Money couldn't be loaded." — Help never blanks.
- Actions are only real destinations: Open this Agreement (exact Agreement) · Reviews & issues / View formal review (opens the Agreement's Support tab with the Review panel open — a one-shot in-memory hint) · Open Money (the Phase 8 handoff with the freshly read version) · Trouble signing in (existing Account Recovery) · Ask KS001 (`navigateTo('signed-in')`, the same persistent conversation; no second bot, no context copied into a prompt).
- No universal support status: nothing is normalised into OPEN/IN PROGRESS/RESOLVED. Each domain keeps its own real state (Review state, exception projection, recovery challenge).

## Agreement Support convergence (real path only; the fixture path is byte-for-byte unchanged)
**Ask KS001** · **Reviews & issues** (Phase 9) · **Money** (canonical Money) · **Help & Support** · **Human support** — "Human support requests are not yet available from this screen. SecurePay can still help you inspect the Agreement, Money and formal Review state here." No "Coming soon" and no dead button.

## Human support gap (why there is no button)
No customer endpoint means "open a human support case". So there is no button, no ticket number, no local storage of a request, no chat turn posing as a case, no reuse of a Review or Notification. Source guards forbid `supportCaseId`, `ticketNumber`, `ticketId`, `assignedAgent`, `supportStatus` in production code, and the rendered words *escalated / assigned / under investigation / support is working on it* are asserted absent. Minimum future backend contract: create case (session identity, optional Agreement/Review/Money subject, bounded category, description, idempotency key); read my cases (reference, subject, state, openedAt, lastUpdatedAt, customer-action-needed); add message/evidence (only after durable storage); close/cancel if the lifecycle allows; and the customer case must produce the legitimate case reference the staff Support Context consumes.

## Payment release exceptions (the real new authority)
The participant `settlement-status` response carries `PaymentReleaseExceptionProjectionResponse` (customer-safe: no provider payloads/stack traces; backend mapper today emits `COMPENSATED`/`HELD_EXCEPTION` with required actions `NO_ACTION_REQUIRED`/`OPERATIONS_REVIEW`). It is rendered as a restrained **exception block**, separate from a **Settlement** block:
- Heading: "SecurePay needs attention on this payment" (or, for a known type with `NO_ACTION_REQUIRED`, "SecurePay recorded an exception on this payment"); the backend's `customerSafeReason` **only for a known exception type** (an unknown type gets "SecurePay has recorded an exception this screen cannot describe yet." and its free text is never echoed); **What is needed** from bounded copy (`OPERATIONS_REVIEW` → "…needs a review by SecurePay operations. SecurePay doesn't show that anyone has started that review."; unknown → "…a required step this screen cannot describe yet."); **Recorded** date.
- `compensatedOutcome == true` → only "SecurePay records a compensating outcome for this exception." plus "That describes the exception. It does not say money was restored to the Agreement's original spending authority; the settlement state is shown separately." `false` says nothing about compensation.
- Every block ends: "This is a SecurePay record of a customer-safe exception fact. It doesn't by itself mean the payment failed, was reversed or was resolved." No action is implied by seeing it.
- **Exception ≠ settlement ≠ compensation.** The settlement phase words were tightened accordingly (`COMPENSATED`: "SecurePay records this release as compensated: it did not complete. That does not say money was restored…"; `HELD_EXCEPTION`: a settlement state "separate from any exception details").
- **Absence:** "SecurePay did not return a customer-safe exception for this settlement read." — never "healthy", "settled" or "no provider problem".
- **Partial failure:** if the settlement read fails: "SecurePay couldn't confirm the current settlement state." A refresh resets the read to loading first, so an earlier exception is never left on screen as if fresh.
- The instruction's Current/Earlier Agreement-version classification (Phase 8) is independent of any exception (tested both ways). The dedicated `GET …/instructions/{id}/exception` endpoint (404 when none) was not adopted: `settlement-status` already carries the same projection in one read, avoiding two truths.
- "Get help with this" opens Help with only the bounded heading/reason/action/date and the Agreement title — no ledger, destination or instruction ids, provider payloads or risk flags.

## Recovery
- **Account Recovery** (existing `RecoveryExperience`) resets credentials only ("This resets your password only…"). Help routes to it as "Trouble signing in"; the support area is not called "Recovery".
- **Agreement Money recovery (exercise reversal)** — archaeology of `ExerciseReversalController` / `AgreementMoneyExerciseReversalService`: request is payer-authorised via funding authority but **not bound to the current Agreement version**, has **no Idempotency-Key** (find-or-create per exercise event, so a replay ignores a changed reason); **`GET /{reversalId}` performs no permission or ownership check at all** (any authenticated caller can read any reversal by id); acknowledge and complete are operations-only (`LEDGER_REVERSE`); **no participant list/discovery endpoint** exists, so a `reversalId` would live only in React memory and not survive refresh; and a completed recovery corrects the ledger but does **not** restore the obligation's `remainingFundedMinor` headroom. Per the phase's own test, any single failure ⇒ **no customer reversal request or status UI** (source guard: `exercise-reversals`, `requestReversal`, `reversalId` are absent from `src`).
- What *is* safe and already read: the funded-authority transactions history includes the reversal lifecycle entries. They are now worded exactly: **Recovery requested** · **Recovery is being worked** · **SecurePay records the ledger recovery as completed** · **Recovery could not be completed**, followed (when any appears) by "A completed recovery does not by itself restore this position's spending headroom." Nothing says refunded, on the way, or available again; the original Progressed entry is never rewritten.

## Notifications
Attention, not case management. A notification is not a ticket, an assignee or proof of handling; Help says so. No routing on `actionKey`; navigation only where the backend supplies a real `agreementId` (unchanged).

## Session refresh
No new gateway or authenticated method was added (Help reuses `agreements.detail`, `agreementReview.list`, `money.status`, all already in their refresh tables), so the existing drift tests continue to cover them; a guard asserts no `src/api/securepay/support` gateway exists.

## Privacy
Help never broadens data authority: the context handoff is the minimum shown by the source screen; reads are the person's own; nothing is copied into a chat prompt; no provider raw data, ids or internal adapter names are rendered (hostile-field test + source guards).

## Verification (stated separately)
- Automated: `node --test tests/*.test.mjs` **865 pass / 0 fail**; `npx tsc -p tsconfig.app.json --noEmit` clean; `npx eslint src --quiet` clean; `npx vite build` ok.
- Browser (scripted mock; **SecurePayAPI was not run**), real 375 / 320 / 1100px viewports via a same-origin iframe, no page overflow at any width: Money exception block (held) with separate settlement block → "Get help with this" → Help with only the customer-safe context; compensated and unknown-type exceptions; failed settlement read shows "couldn't confirm" with no stale exception; Agreement Support (Ask KS001, Reviews & issues, Money, Help & Support, human-support limitation, no "Coming soon"); Help → Reviews & issues opens the Agreement on Support with the Review panel; Help with Agreement + Review loaded and Money failing; a version change between the Agreement screen and Help drops the version label and shows the notice; Ask KS001 returns to the conversation; Trouble signing in opens the real recovery screen; Account → Help is global (this run caught a stale-context bug, now fixed and tested).
- Observation (pre-existing, not changed): the Workspace's own NavBar reports "This area is not available yet." for Account; Account is reachable from other screens' NavBars (including Help's). Left alone as out of scope.
- Not covered: anything against the real backend; no signed-out Help entry exists in the shell to exercise beyond unit/SSR tests.

## Backend gaps (not fixed from the frontend)
1. **Customer support-case API** (create / read mine / message / close) — none exists.
2. **Support case ↔ Outreach case reference** binding so a customer case yields the legitimate `X-Outreach-Case-Ref`.
3. **Customer reversal contract:** ownership check on `GET exercise-reversals/{id}`; a participant list/discovery read; current-version binding and an `Idempotency-Key` on request; headroom restoration semantics (or an explicit readable field for it).
4. **Durable exception/recovery history:** settlement-status returns a single current exception; there is no participant-readable exception/recovery timeline, and no read of whether an operations review has started (so the UI cannot say "being reviewed").
5. **Domain read gaps:** no participant read for held-exception resolution outcome; no readable support-category notification → subject mapping.

## Next-phase recommendation (not started)
Build the customer support-case backend contract (gap 1–2) first; only then a Human Support entry. In parallel, the reversal ownership/discovery fixes (gap 3) would unlock a customer-visible recovery status. Operations tooling remains a separate internal phase.
