# UI Completion — Phase 3: Agreement Review, Source Continuity & Deliberate Handoff

Branch `feat/ui-phase3-agreement-review` · UI-only · SecurePayAPI **read-only, not modified** · Not merged, not deployed.

Purpose: make the existing real Agreement/handoff authority calm and continuous — conversation → enough understanding → deliberate review → review changes → authenticate only when necessary → create the reviewed **draft** Agreement — naming every action after what the backend really does.

## A. Preflight
- Phase 2 (PR #28) merged; Phase 3 branches from that `main` (`d14bf09`).
- Retry wording fix (`Retry message` / `Retry Use this` / `Retry amount`) shipped before Phase 3 with a test.

## B. Archaeology matrix (from SecurePayAPI source; the API was not run)

| Question | Answer (source) |
|---|---|
| What facts make an Agreement candidate? | `AgreementCandidateProjector.project(tradeContext)` → title/purpose/description/type, currency + `amountMinor`, `what[] who[] when[]`; `materialMatters` (block progress), `guidanceNotes` (do not block). |
| Who creates canonical truth? | The backend only. `createHandoff` freezes a projection; the browser never mutates it. |
| What identifies the exact version? | `(tradeContextVersion, candidateDigest)` of the frozen handoff. `continue` must echo both exactly or it fails `STALE`. |
| Source provenance | `AgentAgreementHandoffSourceBinding` binds an immutable snapshot at handoff creation (`sourceType`, id, title, owner KS, captured price/currency/availability). Progression attaches a `CommercialSourceReference` from that snapshot atomically. |
| CHANGED / UNAVAILABLE | `reviewedSource.sourceStatus` computed live on GET/create/adopt (with `current` facts when CHANGED). `isStale` includes it, so `/review` and `/continue` fail closed. `useCurrentSource` mints a **new** handoff; the old one stays stale. |
| When is auth required? | `create` and `GET` are unauthenticated (`IDENTITY_REQUIRED`). `adopt`, `review`, `continue`, `use-current-source` need auth. |
| After auth | Same handoff: `adopt` binds the actor, then `GET`, then `/review` (records `reviewedAt`), then `READY_TO_PROGRESS`. |
| Review vs confirmation | `/review` only records that the canonical review was fetched. It is not acceptance. |
| What does `continue` actually do? | Creates a **DRAFT** Agreement (idempotent per handoff), requires prior review + exact version + zero material matters + fresh source. It does not propose, confirm, accept, fund or pay. |
| Errors | `HANDOFF_NOT_FOUND`, `EXPIRED` (410), `STALE` (409), `NEEDS_RESOLUTION`, `CONFLICT` (409). |

## C. Authority map
Conversation/Trade Context (Phase 1 instruments) → Handoff (frozen snapshot, backend) → Review (read-only, backend) → Draft Agreement (backend). The browser holds the handoff id and echoes the snapshot; it derives no field.

## D. Journey built
1. **Review this** (was “Continue with this”) creates/reuses the handoff. Nothing is created yet.
2. **Signed out**: the unauthenticated handoff’s own candidate + source are shown read-only (“What SecurePay understands so far”) *before* sign-in, with “Signing in doesn’t create anything or commit you.” Sign-in card retitled “Sign in to review this” (was “ready to set this securely”).
3. **After sign-in**: same handoff → canonical review. If `(version, digest)` moved during sign-in, a plain notice says so.
4. **Review**: title, parties, work, price, source (“Started from”), completion, worth-settling vs needs-settling. No editable field. **Change something** returns to the conversation.
5. **Create the draft Agreement** (was “Set securely”) with a consequence line: draft, not sent/accepted/funded/paid.
6. Result: “Draft Agreement created…” (no raw id).

## E. Source continuity
`sourceType` is passed adapter → view → `CanonicalAgreement` → `SourceReference`. An absent type is shown as “Selected source”, **never** assumed to be SecurePay Store (this changes Phase 2’s default). CURRENT is calm (no freshness claim). CHANGED shows Selected earlier vs Current listing with **Review with the current listing** (`useCurrentSource`) or back. UNAVAILABLE keeps the historical provenance and offers only the way back — never silently DIRECT or another listing.

## F. Agreement version truth
The version shown is the backend’s `tradeContextVersion`; nothing local. Stale handoffs are frozen and never re-read as if recoverable.

## G. Authentication boundary
Authentication ≠ confirm; join ≠ accept; Use this ≠ buy/accept/join/confirm/fund/pay. Sign-in never creates a second handoff or conversation.

## H. Failure behaviour
- Uncertain create/draft (timeout, network, 5xx): state `progress-uncertain` — “We’re not sure that went through”, **Check what happened** (a read; PROGRESSED is the proof) or **Try again** (same snapshot; backend idempotent by handoff).
- `createHandoff` / `useCurrentSource` reuse one `clientActionId` until success, so a retry can never mint a second handoff (the previous code used a fresh id every time).
- 409/410 re-read authoritative state; 4xx is a definite failure.

## I. Verification (clearly separated)
- **Real API:** not run. A real SecurePayAPI listens on 8080 in this environment; this phase deliberately did not use it (one stray `POST /api/agent/conversations` reached it from a mis-pointed scratch proxy before I noticed, creating one empty conversation; no handoff was created).
- **Scripted mock in real Chrome (desktop, 375, 320 via same-origin iframe):** signed-out preview → sign-in → review → draft; uncertain draft then retry (log showed two `continue` with the same snapshot, one create); CHANGED; UNAVAILABLE; long title/participant/source at 320 (no horizontal overflow in our surface).
- **Unit:** `tests/ui-phase3.test.mjs` (handoff, source, consequence, auth continuity, correction, failure) + updated handoff/phase2 tests. Suite 565 passing, tsc/eslint/build clean.
- **Not tested:** real sign-in/OTP against the backend, real stale detection, browser back/focus return in screen readers, unresolved/needs-resolution in browser, mobile Understood tab handoff.

## J. Changed files
`controller.ts`, `view.ts`, `HandoffPanel.tsx`, new `ReviewPreview.tsx`, `CanonicalAgreement.tsx`, `SourceReference.tsx`, `origin.ts`, `identity/view.ts`, `AgentExperience.tsx`, `types.ts`, tests.

## K. Remaining backend/API gaps
- Candidate `who` is names only: no role or KS per party on the review (roles shown only on Understood).
- No amendment mechanism: corrections are made in the conversation, producing a new handoff.
- No money-timing/conditions fields on the candidate beyond `when`.
- `/review` is auth-only; the pre-auth preview is the handoff summary, not the canonical review.
- No first-class “DIRECT vs source” flag beyond `reviewedSource == null`.
- Legacy Store/Community `OfferToTradeHandoff` / `SourceToTradeHandoff` / `CommunityToTradeHandoff` (“Continue to agreement”) and `mockAgent` copy are demo/fixture paths not on the real handoff route; left untouched (Store is byte-locked; Community out of scope).

## L. Next phase
Recipient side of a draft Agreement (participants seeing/accepting), which is where join/accept semantics begin.
