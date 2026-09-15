# Codex Task — Golden Spine B: Signed-out Agent + Trade Context

Work only on branch `feat/golden-spine-agent`.

Read first:

- `AGENTS.md`
- `docs/PRODUCTION_MIGRATION_LEDGER.md`
- `docs/GOLDEN_SPINE_COMPATIBILITY_AUDIT.md`
- `docs/CODEX_KICKOFF_GOLDEN_SPINE.md`

The frozen Bolt experience tagged `bolt-reference-pass11` remains the experience authority. `SecurePayAPI` remains the backend authority.

## Goal

Make the first real user-facing slice of the Golden Spine work without redesigning the locked Bolt experience:

`Signed-out Home -> real Agent conversation -> real Agent turns -> real Trade Context -> explicit candidate adoption`

Do not start Agreement handoff/auth progression in this PR. That is Slice C.

## Locked experience to preserve

Use the existing Bolt components/choreography rather than building replacement pages:

- `SignedOutHome`
- `ConversationWorkspace`
- `ContextPanel`
- relevant Agent rich-response components already used by the locked Bolt app
- existing desktop/mobile visual behavior
- Quiet Trust tone
- the consequence curve: discovery can feel rich/alive, but no consequential authority is implied

Do not change the product into a questionnaire, wizard, portal dashboard, or form flow.

## Real backend contracts

Use the typed gateways introduced in Golden Spine A. Re-inspect the actual SecurePayAPI branch/stack before changing endpoint assumptions.

Expected Agent authority includes:

```text
POST /api/agent/conversations
POST /api/agent/conversations/{conversationId}/turns
GET  /api/agent/conversations/{conversationId}/context
POST /api/agent/conversations/{conversationId}/external-facts/amount
POST /api/agent/conversations/{conversationId}/external-facts/date
POST /api/agent/conversations/{conversationId}/facts/adopt
```

Relevant backend work is still on the stacked SecurePayAPI Agent PRs rather than merged main. Do not mislabel this frontend wiring as deployed production authority merely because the contract exists.

## Required behavior

### 1. Signed-out intent

The locked Home prompt remains:

`What are you trying to make happen?`

When the user submits intent:

- create a real Agent conversation;
- preserve the user's text locally while creation is in flight;
- submit the first turn only after a conversation id exists;
- do not authenticate merely to talk;
- do not create an Agreement/handoff merely because intent exists.

Explicitly handle:

- loading;
- create failure;
- retry;
- conversation not found;
- backend unavailable.

Never fall back to `mockAgent` in real mode after an API failure.

### 2. Real conversation turns

Wire subsequent user messages to `submitTurn`.

Each user submission must use a stable `clientTurnId` so a deliberate retry reuses the same id.

Do not auto-retry consequential or ambiguous POSTs behind the user's back.

For a failed turn:

- retain the user's message in the conversation;
- clearly show that SecurePay could not complete the turn;
- allow explicit retry with the same `clientTurnId`;
- do not manufacture an Agent answer.

### 3. Agent response rendering

Use the foundation adapter.

Rules:

- always preserve/render the top-level text response when valid;
- render supported rich components using existing Bolt visual components where compatible;
- ignore unknown future rich component types rather than breaking the turn;
- `AGREEMENT_PREVIEW` is informational only;
- provider considered != selected/hired;
- no star/ranking/best-provider inference;
- no frontend invention of commercial facts.

If the current Bolt component expects a richer shape than the backend provides, create a presentation adapter. Do not alter backend truth to satisfy the component.

### 4. Trade Context / "What SecurePay understands"

Replace production use of the local `Understanding` mock state with real `GET .../context` projection.

Preserve the visual intent of the context panel/drawer while making provenance/state real.

The UI must distinguish at minimum:

- CANDIDATE;
- CONFIRMED;
- unknown/future state.

Unknown state must never be rendered as confirmed.

Preserve source/provenance where the backend exposes it.

Do not present candidate facts as settled agreement terms.

### 5. Explicit candidate adoption / "Use this"

Where this Slice has a real backend candidate target that supports adoption, wire explicit user action to `/facts/adopt`.

Rules:

- source reference != adoption;
- Agent suggestion != adoption;
- viewing/selecting a card != adoption unless the user explicitly invokes the locked `Use this`/equivalent action;
- adoption != Agreement;
- adoption updates the real Trade Context and must be refreshed/rendered from backend truth.

Do not invent SourceReference persistence for richer Bolt Store/Community/Circle source types that are not yet represented by a real backend contract. Those remain later slices.

### 6. External amount/date facts

If the locked Agent flow exposes a quotation/document/photo-derived amount/date candidate in this slice, use the real external-fact endpoints.

They must enter as candidate/provenance-bearing facts and remain unconfirmed until explicit adoption.

Do not fabricate amount/date provenance in the frontend.

### 7. "Review what we have"

Keep this non-consequential.

It must render the current Trade Context understanding without:

- triggering authentication;
- creating a handoff;
- creating an Agreement;
- treating candidate facts as confirmed.

### 8. "Continue with this"

Preserve the visible action if it is part of the locked Bolt choreography, but in this PR do not implement the Agreement-handoff progression unless doing so is unavoidable for compilation/composition.

Prefer a clean seam that Slice C will wire to the real handoff gateway.

Do not leave a fake successful handoff in real mode.

## Runtime architecture

Golden Spine A introduced real-vs-fixture isolation. Keep it.

Desired behavior:

- fixture mode in local development continues to show the exact frozen Bolt reference;
- real mode mounts the same signed-out Home/conversation experience backed by real gateways;
- no production path imports or silently falls back to `mockAgent`, `demoData`, `moneyData`, or other protected fixtures;
- backend unavailable renders unavailable/error state, not demo success.

Do not scatter `fetch()` calls into components. Use gateway/orchestration hooks/services at the production composition boundary.

## State orchestration

Create a narrow real-Agent orchestration layer suitable for later Slice C rather than adding more authority state to `App.tsx`.

It should make explicit:

- conversation id;
- user/Agent turns;
- pending turn id;
- retryable failed turn;
- Trade Context remote state;
- selected/adoptable candidate where relevant;
- Agent thinking/loading state;
- API error state.

Do not duplicate Agreement status, identity, Money, or recipient authority here.

## Mobile / desktop

The same production-backed Agent slice must remain first-class on both.

Do not fix desktop by degrading mobile or vice versa.

No broad visual redesign is authorized.

## Tests

Extend focused tests to prove at minimum:

1. signed-out intent creates conversation before first turn;
2. first user message is not lost while conversation creation is pending;
3. retry reuses the same `clientTurnId`;
4. network/timeout/404 does not fall back to fixture Agent;
5. unknown Agent rich component does not break response text;
6. candidate Trade Context never renders as confirmed;
7. explicit adoption calls the adoption endpoint exactly once per user action;
8. successful adoption refreshes real Trade Context;
9. "Review what we have" does not create handoff/auth/Agreement;
10. real mode has no import path to protected fixture authority;
11. fixture mode remains visually/reference-compatible and development-only.

Add component/orchestration tests using the lightest suitable setup. Do not introduce a heavy framework without need.

## Validation

Run:

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- all focused tests
- `npm run build`
- `git diff --check`

Compare touched locked components against `bolt-reference-pass11` and explain any visible differences. Visible changes should be only those required for truthful real loading/error/state behavior.

## Dependency vulnerabilities

Golden Spine A reported 21 pre-existing npm audit findings without changing dependencies. Do not mix broad dependency upgrades into this feature PR unless a vulnerability directly blocks this slice. Preserve the finding in the report so it can be handled as a separate security maintenance task.

## PR

Commit and push, then open a PR against `feat/production-foundation`.

Suggested title:

`Golden Spine B: real signed-out Agent and Trade Context`

The PR report must include:

- locked Bolt components reused;
- production orchestration added;
- exact SecurePayAPI contracts wired;
- backend-stack dependency/pending status;
- mock-fallback proof;
- candidate/adoption proof;
- error/retry behavior;
- mobile/desktop verification;
- validation results;
- exact remaining gaps for Slice C.

## Stop conditions

Proceed autonomously through routine implementation.

Stop only if actual backend inspection reveals a genuine ambiguity/change involving:

- identity/auth semantics;
- Agreement handoff authority;
- privacy exposure;
- candidate/adoption doctrine;
- a backend endpoint shape materially different from the verified foundation contract;
- a requirement to invent protected authority.

Otherwise complete, validate, commit, push, and open the PR.