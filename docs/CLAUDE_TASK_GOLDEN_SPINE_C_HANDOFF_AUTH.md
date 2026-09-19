# Claude Task — Golden Spine C: Continue with this → Identity → Canonical Review → Set Securely

Work only on branch `feat/golden-spine-handoff-auth`.

Read first:

- `AGENTS.md`
- `docs/PRODUCTION_MIGRATION_LEDGER.md`
- `docs/GOLDEN_SPINE_COMPATIBILITY_AUDIT.md`
- `docs/CODEX_KICKOFF_GOLDEN_SPINE.md`
- the merged Golden Spine B implementation on `feat/production-foundation`

The frozen Bolt experience tagged `bolt-reference-pass11` remains the experience authority. `SecurePayAPI` remains the backend authority.

## Goal

Make the next locked Bolt journey real without redesigning it:

`Continue with this -> real Agreement handoff -> identity only when required -> canonical handoff review -> Set securely -> real draft Agreement progression`

Do not start recipient invitation/join/confirmation in this PR. That is Slice D.

## Preserve the locked Bolt experience

Reuse the existing Bolt components and choreography for:

- the visible `Continue with this` action
- Secure Identity / authentication transition
- canonical Agreement review
- stale/changed review handling
- `Set securely`
- post-progress state that clearly means a real draft/progressed Agreement exists, NOT accepted/established/funded/paid

Do not redesign the Home, Agent conversation, Trade Context, identity surface, or Agreement review just because backend DTOs differ.

Where backend and Bolt shapes differ, add presentation adapters.

## Real backend authority

Re-inspect SecurePayAPI current stack before coding. Expected handoff contract:

```text
POST /api/agent/conversations/{conversationId}/agreement-handoff
GET  /api/agent/agreement-handoffs/{handoffId}
POST /api/agent/agreement-handoffs/{handoffId}/adopt
GET  /api/agent/agreement-handoffs/{handoffId}/review
POST /api/agent/agreement-handoffs/{handoffId}/continue
```

Expected handoff states:

```text
IDENTITY_REQUIRED
NEEDS_RESOLUTION
REVIEW_STALE
READY_FOR_REVIEW
READY_TO_PROGRESS
PROGRESSED
EXPIRED
```

Auth endpoints are already defined in the production gateway. Re-inspect actual SecurePayAPI auth DTOs before UI wiring.

## Non-negotiable doctrine

- conversation != handoff
- handoff != Agreement
- authentication != handoff adoption
- handoff adoption != Agreement confirmation
- canonical handoff review != Agent preview
- `PROGRESSED` != established Agreement
- `PROGRESSED` != accepted
- `PROGRESSED` != funded
- `PROGRESSED` != paid
- stale review fails closed
- expired handoff fails closed
- exact reviewed `tradeContextVersion` and `candidateDigest` must be echoed on `/continue`
- no frontend-invented authority

## Required behavior

### 1. Continue with this

Wire the existing Golden Spine B visible action to real `createHandoff`.

Only explicit user invocation may create the handoff.

Do not create a handoff merely because:

- an Agreement Preview exists;
- Trade Context is rich enough;
- the Agent suggests continuing;
- the user reviewed understanding.

Handle loading/error distinctly and do not fall back to fixtures.

### 2. Handoff state machine

Create a narrow handoff orchestration layer, separate from the Agent conversation controller where practical.

It should explicitly track:

- handoff id
- server handoff state
- exact review snapshot metadata
- canonical review remote state
- identity/auth remote state
- errors
- progression result

Do not put Agreement establishment, recipient confirmation, or Money authority into this controller.

### 3. IDENTITY_REQUIRED

When backend says `IDENTITY_REQUIRED`:

- preserve the locked Bolt transition into Secure Identity;
- use the real KSNumber/password/OTP flow;
- do not pretend auth succeeded before backend says it did;
- do not create a second auth authority or decode JWT claims to invent product state;
- once a real session exists, call the real handoff `adopt` endpoint if that is the backend-prescribed transition;
- then re-read authoritative handoff state.

Wrong account / unauthorized handoff must fail closed.

Authentication is only identity/session authority. It does not mean Agreement join, confirmation, acceptance, or establishment.

### 4. NEEDS_RESOLUTION

If backend says `NEEDS_RESOLUTION`:

- return the user calmly to the conversation/Trade Context resolution path;
- render backend unresolved matters/guidance truthfully;
- do not allow Set securely;
- do not manufacture answers;
- preserve the existing conversation and handoff context where safe.

### 5. Canonical review

When the backend reaches review state:

- fetch `/review`;
- compose the response into the existing Bolt canonical Agreement-review visual;
- preserve exact handoff `tradeContextVersion` and `candidateDigest` from authoritative handoff state;
- show unresolved material matters if backend reports them;
- do not treat the Agent `AGREEMENT_PREVIEW` as canonical review.

The canonical review is the final reviewed candidate before progression into a real draft Agreement.

### 6. REVIEW_STALE

If review becomes stale:

- show the locked calm changed/stale treatment;
- do not progress;
- do not reuse stale digest/version;
- require a fresh authoritative read/review;
- if backend requires recreation of the handoff, do so only after explicit user continuation and according to backend semantics.

### 7. EXPIRED

Expired handoff must not continue.

Show a clear calm state and allow the user to return to the conversation and explicitly start a fresh continuation when ready.

Do not silently recreate and progress in the background.

### 8. Set securely

Wire the locked `Set securely` action to `/continue` only when backend state permits progression.

The request must echo the exact reviewed:

- `expectedTradeContextVersion`
- `expectedCandidateDigest`

No reconstructed or frontend-derived digest/version.

If backend returns stale/conflict, fail closed and return to review.

### 9. PROGRESSED

If backend returns `PROGRESSED` and a real `progressedAgreementId`:

- store/use that real Agreement id;
- transition to the locked post-set state only insofar as the backend contract supports it;
- label it truthfully as a real draft/progressed Agreement waiting for subsequent Agreement/recipient steps;
- do not show established/accepted/paid/funded state.

Slice D will wire recipient invitation/review/auth/Join/exact-version confirmation.

## Auth/session architecture

Use the existing production auth gateway and one session boundary.

Add the minimum real session store/context needed for this frontend if none exists yet.

Requirements:

- access token only through the HTTP token provider boundary;
- refresh behavior must follow actual backend contract;
- no credentials/tokens in Vite env;
- no token logging;
- no fixture fallback;
- no personal/business acting-capacity invention beyond backend truth.

If proven low-level auth plumbing in SecurepayBDUI is useful, port only the narrow generic implementation ideas. Do not import BDUI pages, design system, navigation, route hierarchy, or journey controllers.

## Visual fidelity

Bolt remains the visual baseline.

Do NOT use this slice for:

- logo correction
- colour redesign
- discovery card redesign
- generic design-system refactor
- new page invention

Those are separate, explicit decisions.

Visible changes should only be those required for truthful loading/error/stale/auth/server-driven states.

## Tests

Add focused tests proving at minimum:

1. `Continue with this` creates exactly one handoff per explicit action.
2. Agreement Preview alone never creates a handoff.
3. `IDENTITY_REQUIRED` routes to auth and does not progress Agreement.
4. successful auth does not itself mean handoff adoption/progression.
5. wrong account/403 fails closed.
6. `NEEDS_RESOLUTION` blocks Set securely.
7. canonical review comes from `/review`, not Agent preview.
8. exact `tradeContextVersion` and `candidateDigest` are preserved from reviewed server state.
9. stale review cannot progress.
10. expired handoff cannot progress.
11. `/continue` sends exact reviewed version/digest.
12. conflict/stale response from `/continue` does not fabricate success.
13. `PROGRESSED` retains real `progressedAgreementId` but does not infer establishment.
14. production path cannot fall back to fixture handoff/auth state.
15. existing Golden Spine A/B tests remain green.

## Browser acceptance

Verify desktop and mobile for at least:

- conversation with `Continue with this`
- handoff loading
- identity-required transition
- sign-in / OTP state
- canonical review
- needs-resolution state
- stale-review state
- expired state
- successful Set securely -> truthful progressed draft state
- backend unavailable/error state

Compare the visible journey to `bolt-reference-pass11`.

## Validation

Run:

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run test:foundation`
- `npm run test:agent`
- new Slice C focused tests
- `npm run build`
- `git diff --check`

Do not mix broad dependency upgrades into this PR.

## Delivery

Proceed autonomously through routine implementation.

Commit and push the completed work.

Open a PR against:

`feat/production-foundation`

Suggested title:

`Golden Spine C: real handoff, identity and canonical review`

Final report must state:

- locked Bolt components reused
- exact SecurePayAPI handoff/auth contracts wired
- session/auth architecture added
- state-machine behavior
- stale/expired/error behavior
- canonical-review proof
- exact-snapshot progression proof
- desktop/mobile verification
- tests/build results
- exact remaining Slice D work

Stop only for a genuine blocker involving:

- identity/auth semantics materially different from inspected backend
- acting-capacity ambiguity
- Agreement authority ambiguity
- security/privacy issue
- a requirement to invent missing backend authority
- destructive repository operation

Otherwise finish the slice completely.
