# Codex Kickoff — Productionize the Golden Spine

## Objective

Turn the frozen Bolt experience into real production frontend code without redesigning it.

You are working in `kimaniks001/SecurepayLLM`.

Read first:

1. `README.md`
2. `AGENTS.md`
3. `docs/PRODUCTION_MIGRATION_LEDGER.md`

Then inspect:

- the frozen Bolt source in this repository once imported
- `kimaniks001/SecurePayAPI`
- the stacked backend PRs listed in the migration ledger

`SecurepayBDUI` is reference-only for low-level integration plumbing; do not inherit its product architecture.

## Source-of-truth hierarchy

- Bolt = experience truth
- SecurePayAPI = authority truth
- SecurepayLLM = production composition of the two

When Bolt and API shapes differ, write an adapter. Do not mutate backend truth or redesign Bolt merely to make DTOs convenient.

## First task: inspection only

Before substantive refactoring, produce/update a checked-in compatibility note that identifies for every Golden Spine step:

- Bolt component(s)
- current mock/local state source
- real SecurePayAPI endpoint/service
- backend branch/PR if not yet on main
- DTO/view-model mapping
- loading/error/stale/unauthorized behavior
- whether protected truth is real or still mocked

Do not start by moving every component into new folders.

## Golden Spine to make real first

### A. Signed-out intent + Agent

Preserve the Bolt signed-out Home and conversation choreography.

Real Agent contract currently documented by SecurePayAPI Phase 4:

```text
POST /api/agent/conversations
POST /api/agent/conversations/{conversationId}/turns
GET  /api/agent/conversations/{conversationId}/context
POST /api/agent/conversations/{conversationId}/photo-observations
```

Rules:

- conversation may begin signed out
- use a stable `clientTurnId` for idempotent retries
- render typed `AgentResponse.components`
- ignore unknown future component types rather than failing the whole turn
- `AGREEMENT_PREVIEW` is informational, never Agreement authority
- provider considered != hired
- no rankings/stars/best-match inference
- external/photo observations are candidate context, not established truth

The Bolt `mockAgent.ts` may remain temporarily as a development adapter but must no longer drive the production path once this slice is wired.

### B. Explicit candidate adoption

Backend Phase 5B adds:

```text
POST /api/agent/conversations/{conversationId}/external-facts/amount
POST /api/agent/conversations/{conversationId}/external-facts/date
POST /api/agent/conversations/{conversationId}/facts/adopt
POST /api/agent/conversations/{conversationId}/prior-agreement-terms
```

Rules:

- externally sourced facts arrive CANDIDATE
- only explicit user action may call `/facts/adopt`
- Agent prose suggesting a fact is not authority to adopt it
- prior Agreement term lookup requires auth and carries source Agreement/version provenance
- adoption != Agreement

Map Bolt's `Use this` / SourceReference interaction onto this authority where the current backend contract supports it.

If a richer Bolt source type does not yet have a backend source persistence contract, keep it behind an explicit typed adapter and record the gap. Do not manufacture backend persistence.

### C. Continue with this -> Secure Identity -> Agreement handoff

Backend Phase 5 contract:

```text
POST /api/agent/conversations/{conversationId}/agreement-handoff
GET  /api/agent/agreement-handoffs/{handoffId}
POST /api/agent/agreement-handoffs/{handoffId}/adopt
GET  /api/agent/agreement-handoffs/{handoffId}/review
POST /api/agent/agreement-handoffs/{handoffId}/continue
```

Important state vocabulary:

```text
IDENTITY_REQUIRED
NEEDS_RESOLUTION
REVIEW_STALE
READY_FOR_REVIEW
READY_TO_PROGRESS
PROGRESSED
EXPIRED
```

Rules:

- do not create a handoff because an Agreement Preview merely exists
- only the user's explicit `Continue with this` creates the handoff
- if identity is required, route through real SecurePay auth, then `/adopt`
- save and echo the exact `tradeContextVersion` and `candidateDigest`
- canonical handoff review is distinct from free conversational preview
- `/continue` creates/progresses into a real draft Agreement id
- stale/expired handoffs fail closed and must be recreated
- `PROGRESSED` does not mean accepted, funded or paid

Replace the corresponding timer/step logic currently in Bolt `App.tsx` with server-state-driven orchestration while preserving the visual choreography.

### D. Recipient journey

Use existing SecurePayAPI authority rather than prototype state:

```text
/api/v1/agreement-invitations/*
/api/v1/agreements/{id}/versions/{versionId}/confirm
```

Preserve the locked sequence:

```text
public invitation review
-> authentication
-> explicit Join
-> joined but not confirmed
-> exact Agreement-version review
-> explicit confirmation of that exact version
-> backend-owned current/established state
```

Never collapse:

- auth into Join
- Join into confirmation
- confirmation into a generic checkbox

Any version change must invalidate stale review/confirmation according to backend authority.

### E. Signed-in Home / Agreement Hub / Detail

Existing/current backend contracts include:

```text
GET /api/v1/me/agreements
GET /api/v1/me/actions
```

Phase 6 adds:

```text
GET /api/v1/me/agreements/hub
GET /api/v1/me/agreements/search
GET /api/v1/agreements/{id}/detail
GET /api/v1/agreements/{id}/agent-context
```

Rules:

- backend owns Hub buckets and next actions
- no location search UI until an Agreement location contract exists
- `agent-context` is authenticated private Agreement context; do not silently feed it to the public/identity-free Agent protocol
- map backend detail to the Bolt Agreement Detail experience through a typed adapter

### F. Money handoff

Dedicated authoritative reads already exist:

```text
GET /api/v1/agreements/{agreementId}/money-status
GET /api/v1/agreements/{agreementId}/money-records
```

Phase 8 Detail `money.status` vocabulary:

```text
NO_EVALUATION_YET
READY
NOT_READY
PARTIALLY_READY
BLOCKED
```

Rules:

- `NO_EVALUATION_YET` is not `NOT_READY`
- `outstandingReasons` are backend gate/reason codes
- `moneyRecordCount` is a bounded count, not a balance
- payment/funding affordance comes from the caller's authoritative next action, e.g. `FUND_AGREEMENT`
- never infer a Pay button from `READY` alone
- no frontend-invented held/restricted/released/settled state

## Architecture to establish during this slice

Create a narrow typed gateway layer, not scattered component fetches.

Recommended logical boundaries:

```text
api/securepay/agent
api/securepay/auth
api/securepay/agreements
api/securepay/money
```

Add domain/view-model adapters where backend DTOs and locked Bolt components differ.

Do not move Store/Community/Circle/Ecosystem into production authority yet. Their visual components may stay intact until the Golden Spine is proven.

## Mock retirement strategy

Do not delete all fixtures at once.

Introduce explicit environment/adapters such that:

- production route uses real API
- demo/visual acceptance route may use frozen Bolt fixtures
- protected production truth can never fall back silently to fixture truth

A backend outage must render unavailable/error/unknown, not a demo success state.

## Required failure states

Implement/test at minimum:

- Agent conversation not found
- turn retry/idempotency
- handoff identity required
- handoff needs resolution
- handoff stale
- handoff expired
- wrong authenticated account for handoff
- Agreement version changed
- invitation expired/invalid
- join unauthorized
- confirmation stale/wrong version
- Agreement detail unauthorized
- Money no evaluation
- Money blocked/not-ready/partial
- Money backend unavailable

## Acceptance scenarios

The first production PR series must exercise at least:

1. bathroom tiling / provider discovery -> agreement handoff
2. source/external fact remains candidate until explicit `Use this`
3. recipient reviews before auth, joins separately, confirms exact version separately
4. stale handoff refuses progression
5. changed Agreement refuses stale confirmation
6. `NO_EVALUATION_YET` shows no fake Pay action
7. `READY` with no `FUND_AGREEMENT` action shows no Pay action

## Implementation/PR sequence

Prefer small stacked production PRs:

### PR A — foundation adapters

- typed HTTP client/error model
- environment/base URL
- Agent gateway interfaces
- Agreement gateway interfaces
- Money gateway interfaces
- fixture-vs-real adapter selection that cannot silently fall back in production
- no visual redesign

### PR B — signed-out Agent + Trade Context

- real conversation/create/turn/context
- preserve Bolt Home/conversation UI
- typed component mapping
- candidate/adoption support where backend available

### PR C — Agreement handoff + auth boundary

- `Continue with this`
- handoff state machine
- real auth integration
- canonical review
- exact context version/digest progression

### PR D — recipient authority

- public review
- auth
- Join
- exact-version confirmation
- stale/version-change behavior

### PR E — Hub/Detail/Money reads

- signed-in Home
- Hub/Detail
- milestones exposed by backend
- Money status/records + next-action gating

Do not begin Store/Community/Circles production wiring until A-E establish the spine.

## Definition of done for Golden Spine

- Bolt visuals/interactions remain recognizably the locked experience
- production path contains no protected mock authority
- all consequential state transitions are driven by SecurePayAPI responses
- retry/idempotency/stale/error states are explicit
- lint/typecheck/build pass
- migration ledger updated
- screenshots or visual regression evidence cover desktop and mobile key steps

If an endpoint or backend state needed by this slice is absent from the inspected API/stack, stop only that sub-path, record the exact gap, and continue everything else that is unblocked. Do not invent the missing backend behavior.
