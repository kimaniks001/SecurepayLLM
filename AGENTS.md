# SecurePayLLM production rules

This repository is the new production frontend for SecurePay.

## Sources of truth

1. **Experience authority:** the frozen Bolt export through Pass 11.
2. **Backend authority:** `kimaniks001/SecurePayAPI`.
3. **Legacy reference only:** `kimaniks001/SecurepayBDUI`.

The job of this repository is to reproduce the approved Bolt experience faithfully while replacing demo/mock authority with real SecurePayAPI contracts.

## Non-negotiable product rule

`Canonical source -> explicit Use this -> SourceReference -> Trade Taking Shape -> resolve only the delta -> Secure Identity when consequential -> Agreement authority -> Money follows Agreement`

Do not reinterpret this flow into the older BDUI route structure.

## Authority boundaries

The frontend must never infer or manufacture backend-owned truth for:

- identity or acting capacity
- Agreement existence, status or version
- participant join state
- exact-version confirmation
- Agreement completion
- Payment Ready
- release, restriction, settlement, ledger or balances
- dispute resolution
- referral qualification/reward state
- Master appointment/opinion authority
- Partner/Solution institutional authority

If an API owns the truth, render the returned truth. Do not derive an equivalent frontend state from UI events.

Examples:

- authentication != joining
- joining != Agreement confirmation
- confirmation must name the exact current Agreement version/hash
- `READY` does not imply `FUND_AGREEMENT`; the next-action projection owns the action
- evidence submitted != verified/completed
- Master opinion != Agreement change or Money instruction
- introduction != qualified referral != earned reward

## Bolt preservation rule

Visible experience should remain equivalent to the locked Bolt build unless a change is required by a real backend constraint or an explicitly approved doctrine change.

Preserve:

- visual DNA and Quiet Trust tone
- desktop/mobile choreography
- Agent-first interaction model
- SourceReference handoff
- Trade Taking Shape
- review-before-auth where locked
- Agreement review and recipient sequence
- Store / Community / Circles / Trade Help relationships
- consequence curve: discovery rich, Agreement calmer, identity deliberate, Money minimal

Do not casually simplify or redesign Bolt components while wiring them.

## Do not import BDUI architecture

`SecurepayBDUI` may be inspected only for proven low-level integration plumbing such as:

- auth token handling
- OTP request/verification calls
- environment configuration
- API error normalization

Do not copy its page hierarchy, shell, route structure, state machine or visual system into this repository.

## API integration pattern

Do not scatter `fetch()` calls through experience components.

Use typed gateways/adapters under a dedicated API/domain boundary, for example:

- `api/securepay/agent`
- `api/securepay/auth`
- `api/securepay/agreements`
- `api/securepay/money`
- `api/securepay/store`
- `api/securepay/community`
- `api/securepay/circles`
- `api/securepay/ecosystem`

Keep Bolt-facing view models separate from raw backend DTOs when shapes differ. One adapter should translate authority data into the view model.

## Mock retirement rule

Prototype mocks may remain only behind explicit development/demo adapters while the corresponding backend capability is not yet available.

A mock must never be allowed to masquerade as real authority in production.

Every mock-backed production surface must be listed in `docs/PRODUCTION_MIGRATION_LEDGER.md` with one of:

- REAL_API_WIRED
- REAL_API_AVAILABLE_NOT_WIRED
- BACKEND_PR_PENDING
- FRONTEND_COMPOSITION_ONLY
- DEMO_ONLY_REMOVE_BEFORE_PRODUCTION
- HUMAN_DOCTRINE_BLOCKER

## Vertical-slice migration order

Prefer end-to-end slices over directory-wide rewrites.

1. Signed-out Home -> Agent -> Trade Context -> Agreement handoff
2. Secure Identity -> canonical review -> real Agreement creation
3. Recipient invitation -> auth -> Join -> exact-version confirmation
4. Established Agreement -> Hub/Detail -> milestones/actions
5. Money read/handoff using Payment Ready + next actions
6. Store -> explicit Use this -> source/adoption -> Trade
7. Community/Circles -> source/adoption -> Trade
8. Referrals/Plugs/Masters/Partners/Solutions as their backend contracts land

A slice is not complete while protected truth is still mocked.

## Error/stale/offline behavior

Production code must explicitly handle:

- loading
- empty
- unauthorized
- forbidden
- stale version/source
- expired handoff/invitation
- duplicate/idempotent retry
- backend unavailable
- unknown financial state

Never convert an unknown or unavailable authority state into a reassuring positive state.

## Development discipline

Before changing a locked journey:

1. identify the Bolt component/route being reproduced;
2. identify the backend authority, if any;
3. update the migration ledger;
4. preserve existing visible behavior where compatible;
5. add/adjust tests;
6. run lint, typecheck and build.

If Bolt expects capability the backend does not yet expose, record the gap and keep the API boundary explicit. Do not invent an endpoint or silently reinterpret the experience.

## Stop conditions

Routine implementation choices do not require product review.

Stop for human review only if implementation requires changing a locked rule involving:

- identity/authentication semantics
- Agreement authority/version/confirmation
- Money/Payment Ready/release/settlement/ledger
- legal/regulatory meaning
- unclear seller/counterparty semantics
- referral reward attribution
- Master/Partner institutional authority
- privacy exposure that the existing contracts do not resolve
