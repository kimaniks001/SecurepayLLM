# Codex Task — Golden Spine Foundation

Work only on branch `feat/golden-spine-foundation`.

Read first:

- `AGENTS.md`
- `docs/PRODUCTION_MIGRATION_LEDGER.md`
- `docs/CODEX_KICKOFF_GOLDEN_SPINE.md`
- `docs/BACKEND_PHASE11_CONVERGENCE_UPDATE.md`

Treat the imported Bolt source as the locked experience reference. Do not redesign it.

## Goal

Create the production frontend foundation that will let the locked Bolt experience consume real SecurePayAPI authority without scattering HTTP/state logic through UI components.

This task is infrastructure + compatibility work only. Do not yet rewrite the whole Golden Spine or remove all mocks.

## Required inspection

Inspect the actual imported Bolt source, especially:

- `src/App.tsx`
- `src/mockAgent.ts`
- `src/types.ts`
- `src/components/SignedOutHome.tsx`
- `src/components/ConversationWorkspace.tsx`
- `src/components/ContextPanel.tsx`
- `src/components/SourceToTradeHandoff.tsx`
- recipient/auth/agreement review components used by `App.tsx`
- Money components and fixtures only enough to define gateway boundaries

Inspect SecurePayAPI current contracts and stacked PRs relevant to the first Golden Spine:

- Agent conversation create/turn/context
- Phase 5B provenance + explicit adoption
- Phase 5 Agreement handoff
- existing auth/session/OTP
- existing invitation/join/exact-version confirmation
- current-user agreements/actions
- Agreement Hub/Detail
- Money status/records

Do not assume a route exists because Bolt needs it. Verify it.

## Implement

Create a typed production API boundary, keeping Bolt-facing models separate from raw backend DTOs.

Expected logical areas:

- `src/api/securepay/http`
- `src/api/securepay/agent`
- `src/api/securepay/auth`
- `src/api/securepay/agreements`
- `src/api/securepay/money`
- `src/config`

Exact filenames may differ if the existing project suggests a better clean structure.

### HTTP layer

Provide:

- API base URL from Vite env, e.g. `VITE_SECUREPAY_API_BASE_URL`
- JSON request helper
- auth token attachment through one boundary
- normalized API error model containing HTTP status and backend error code/message when available
- timeout/network failure distinction
- no silent retry of consequential POSTs unless the caller supplies the documented idempotency key

Do not introduce a second auth authority.

### Gateway contracts

Add typed gateway/client contracts for at least:

Agent:

- create conversation
- submit turn with optional/stable `clientTurnId`
- read Trade Context
- explicit candidate adoption
- create/read/adopt/review/continue Agreement handoff

Auth:

- only the minimal session/sign-in/OTP abstractions required by later slices; inspect existing backend and/or proven BDUI plumbing before defining endpoint details
- do not wire UI flows in this task if endpoint semantics require a separate slice

Agreements:

- current-user agreements
- current-user next actions
- Agreement Hub
- Agreement Detail
- recipient invitation read/join as real contracts if verified
- exact-version confirmation as real contract if verified

Money:

- money status
- money records
- no Pay/Fund command invented from Payment Ready state

### Adapters

Create explicit DTO -> Bolt/domain view adapters where useful, particularly for:

- Agent response/components
- Trade Context candidate/confirmed state
- Agreement handoff state
- Agreement Detail
- Money readiness

Unknown future Agent component types must remain forward-compatible: ignore the unknown rich component while preserving/rendering the text response.

### Mock boundary

Keep the current Bolt mocks/fixtures intact for visual demo routes, but introduce an explicit runtime mode/boundary so production code can never silently fall back to `mockAgent` or demo financial/agreement state when a real API request fails.

A production API failure must become an error/unavailable/unknown state.

Do not delete `mockAgent.ts` or the demo data modules in this task.

## Compatibility note

Add `docs/GOLDEN_SPINE_COMPATIBILITY_AUDIT.md` containing a table for each first-spine step with:

- Bolt component/event
- current prototype state source
- verified SecurePayAPI endpoint/authority
- backend PR/branch if not on main
- adapter/view model
- loading/error/stale handling
- status: `REAL_API_AVAILABLE_NOT_WIRED`, `BACKEND_PR_PENDING`, `REAL_API_WIRED`, or explicit gap

Include at minimum:

- signed-out intent
- Agent turn
- Review what we have
- `Use this`
- `Continue with this`
- handoff identity required
- canonical review
- Set securely
- invitation review
- Join
- exact-version confirmation
- Agreement Detail
- Money readiness
- Money next action

## Non-negotiable authority rules

- authentication != Join
- Join != confirmation
- confirmation targets exact current Agreement version
- source reference != adoption
- adoption != Agreement
- Agent preview != Agreement
- Payment Ready `READY` != permission to show Pay/Fund
- next-action projection owns actionable financial affordance
- unknown/backend unavailable != success/demo fallback

## Validation

Run:

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Add focused tests if the current project test setup supports them without introducing a heavy framework solely for this task. If there is no test runner yet, document that and keep pure adapters easy to test in the next slice.

## Deliverable

Commit and push the branch, then open a PR against `feat/production-foundation`.

PR title suggestion:

`Golden Spine A: production API foundation`

In the PR report exactly:

- files/architecture added
- real backend contracts verified
- gaps found
- mock fallback prevention
- validation results
- next slice recommendation

Do not start broad UI rewiring in the same PR.
