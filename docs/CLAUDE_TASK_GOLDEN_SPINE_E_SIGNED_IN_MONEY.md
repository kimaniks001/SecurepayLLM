# Claude Task — Golden Spine E: Signed-in Home → Agreement Hub/Detail → Money

Work only on branch `feat/golden-spine-signed-in-money`.

Read first:

- `AGENTS.md`
- `docs/PRODUCTION_MIGRATION_LEDGER.md`
- `docs/GOLDEN_SPINE_COMPATIBILITY_AUDIT.md`
- the merged Golden Spine A/B/C/D implementation on `feat/production-foundation`
- the locked Bolt reference tag `bolt-reference-pass11`

This is the **last major Golden Spine slice**.

The mission remains unchanged:

> Make the locked Bolt experience real. Do not redesign it.

`SecurePayAPI` is the sole backend authority for identity, Agreement state, current-user actions, Payment Ready, Money records, release, settlement, ledger and completion.

## Goal

Make this real end to end:

`real signed-in session → signed-in Home → Agreement Hub → Agreement Detail → authoritative Money status/records + authoritative financial-action gating`

Do not start Store, Community, Circles, Referrals, Plugs, Masters, Partners or Solutions in this slice.

Do not perform logo/colour redesign work in this slice.

Do not solve the retained sender-side invitation `roleCode` doctrine blocker in this slice.

## Re-inspect backend contracts before coding

Do not rely only on frontend docs. Inspect the actual current SecurePayAPI stack/source first.

At minimum verify the concrete contracts and response shapes from the stack containing:

- Phase 6 / PR #201 signed-in Home + Agreement read model
- Phase 8 / PR #203 Money integration contract
- Phase 9B / PR #205 only where Agreement Detail milestones/execution projections require it
- existing main/current contracts for `/api/v1/me/agreements`, `/api/v1/me/actions`, auth/session and dedicated Money reads

Expected signed-in/read contracts include, subject to direct source verification:

```text
GET /api/v1/me/agreements
GET /api/v1/me/actions
GET /api/v1/me/agreements/hub
GET /api/v1/agreements/{agreementId}/detail
```

Expected Money reads already represented in the frontend gateway include authoritative status and records endpoints. Re-inspect their exact paths and DTOs before wiring.

If a contract differs from this task, follow the backend truth and document the difference. Do not invent a compatibility layer that creates new authority.

## Preserve the locked Bolt experience

Reuse the existing Bolt components and choreography, especially:

- `SignedInHome.tsx`
- `HomeWorkbenchSummary.tsx`
- `NeedsAttentionList.tsx`
- `WaitingOnOthersList.tsx`
- `AgreementHub.tsx`
- `AgreementCard.tsx`
- `AgreementDetail.tsx`
- `AgreementOverview.tsx`
- `AgreementPeople.tsx`
- `AgreementTerms.tsx`
- `AgreementDocuments.tsx`
- `AgreementActivity.tsx`
- `AgreementVersionCard.tsx`
- `AgreementMoneyHandoff.tsx`
- `MoneyHome.tsx`
- `MoneyStatus.tsx`
- `MoneyReady.tsx`
- `MoneyActivity.tsx`
- `MoneyWorkspace.tsx`
- `MoneyAgreementContext.tsx`
- `MoneyUnavailableState.tsx`
- `MoneyStaleState.tsx`

Where backend DTOs differ from Bolt-facing props, add presentation adapters. Do not redesign the page to match the DTO.

The signed-in Home must remain **Agent-first** and person/purpose-first. Do not turn it into a generic SaaS dashboard.

## 1. Session / signed-in boundary

Reuse the single in-memory session boundary already established in Slices C/D.

Do not:

- create a second token store;
- persist credentials/tokens to localStorage/sessionStorage;
- decode JWT claims to invent product state;
- invent personal/business acting capacity;
- silently treat a missing/expired session as signed in.

A full reload may lose the in-memory session. Do not solve that by inventing persistence in this slice.

Use `withSessionRefresh` only for verified authenticated gateway methods.

## 2. Signed-in Home

Wire the locked signed-in Home against real current-user agreement/action reads.

Requirements:

- preserve the Agent-first prompt/interaction posture;
- render backend-owned current-user Agreement summaries and next actions;
- use real `attentionRequired`, next deadlines, counterparties and action reason data only where supplied;
- do not calculate Agreement lifecycle state from UI heuristics;
- do not promote a taking-shape trade into an Agreement;
- keep “Not yet an agreement” treatment wherever the Bolt experience requires it;
- loading, empty, unauthorized and backend-unavailable states must be explicit and must never fall back to fixtures.

If the backend Hub gives authoritative buckets, render those buckets rather than re-bucketing locally.

## 3. Agreement Hub

Wire the real Hub projection into the locked `AgreementHub` / `AgreementCard` experience.

Expected backend-owned buckets include, subject to direct source verification:

```text
NEEDS_ME
WAITING_ON_OTHERS
TAKING_SHAPE
ACTIVE
CHANGED_REVIEW_REQUIRED
COMPLETED
CANCELLED
EXPIRED
```

Do not infer or reclassify an Agreement into another bucket locally.

Preserve Bolt distinctions:

- taking shape is not yet an established Agreement;
- changed/review-required is visually distinct;
- expired is distinct from cancelled/completed;
- completed reuse must preserve explicit provenance and must not silently copy old terms into a new Agreement.

## 4. Agreement Detail

Wire `GET /api/v1/agreements/{id}/detail` (or the actual verified equivalent) into the locked Agreement Detail composition.

Use backend truth for all available sections:

- overview
- current version
- participants
- milestones
- terms / obligations
- documents/evidence metadata
- activity
- version history
- completion
- Money handoff/status summary

Do not fabricate missing participants, dates, milestones, obligations, evidence or completion.

If a section is not supported by the backend projection, render the existing truthful empty/unavailable treatment rather than demo data.

Changed/stale review state must remain explicit and fail closed.

## 5. Money — read authority only

Money is the most consequential surface and must remain minimal and precise.

Wire the verified Money status and Money records reads to the locked Money components.

Expected readiness vocabulary from the current backend stack, subject to direct source verification:

```text
NO_EVALUATION_YET
READY
NOT_READY
PARTIALLY_READY
BLOCKED
```

Rules:

- render only backend-reported status;
- unknown status fails closed to an unavailable/unknown treatment;
- backend unavailable is not READY;
- `NO_EVALUATION_YET` must only come from the verified backend contract, never be invented as a convenient default;
- render `outstandingReasons` factually;
- Money records are factual historical/read projections only;
- bounded `moneyRecordCount` is presentation information, not permission to act;
- do not infer funded/paid/released/settled from generic Agreement state.

## 6. Financial action gating

This rule is non-negotiable:

> Payment Ready `READY` is not permission to show Pay/Fund.

The actionable financial affordance comes from authoritative current-user next actions.

For example, only if `/api/v1/me/actions` returns the exact financial action for the same Agreement (such as `FUND_AGREEMENT`, if that remains the verified backend action code) may the corresponding locked Bolt financial affordance become visible.

Requirements:

- match by exact Agreement id/reference according to the backend contract;
- do not infer financial action from `READY`;
- do not show a Pay/Fund action from stale cached actions after a failed refresh;
- unknown action code must not become a financial CTA;
- no frontend-created release/settlement/withdrawal authority;
- no payment rail selection merely because Payment Ready is READY.

This slice is primarily **read + authoritative action-gating**. Do not add a payment mutation merely to make a button work. If the locked Bolt next step requires a mutation whose backend authority is not already verified and in scope, stop and report the backend gap rather than invent it.

## 7. Navigation / routing

Add only the minimum production route/navigation seam needed for:

- signed-in Home
- Agreement Hub
- Agreement Detail
- Money view for a selected Agreement

Reuse the existing shell/navigation where possible.

Do not build a new route hierarchy or dashboard architecture.

Do not persist authority in the URL.

## 8. Real mode vs fixtures

Production real mode must never import or fall back to:

- `mockAgent`
- demo agreement data
- demo Money data
- fixture Hub/Detail state
- locally fabricated Payment Ready state

A real API error remains an error/unavailable state.

Keep the fixture/Bolt demo path intact for explicit dev fixture mode unless a narrowly-scoped truthful prop is required; preserve byte-identical behavior when such optional props are omitted where practical.

## 9. Tests

Add focused tests proving at minimum:

1. signed-in Home reads real current-user agreements/actions/Hub data;
2. production signed-in path cannot fall back to fixture/demo data;
3. backend Hub buckets are rendered without frontend reclassification;
4. `TAKING_SHAPE` is never promoted to Agreement/ACTIVE by the frontend;
5. Agreement Detail is composed from the real backend detail projection;
6. unavailable/empty Detail sections do not receive demo values;
7. Money status renders the exact backend readiness status;
8. unknown Money status fails closed;
9. backend/network failure never becomes READY or demo Money;
10. `NO_EVALUATION_YET` is produced only according to the verified backend contract;
11. `READY` without a matching authoritative financial next action does **not** expose Pay/Fund;
12. a matching exact `FUND_AGREEMENT` (or the verified equivalent) for the same Agreement can expose the locked financial affordance;
13. a financial action belonging to another Agreement cannot unlock this Agreement's CTA;
14. unknown action codes cannot unlock a financial CTA;
15. stale/changed-review state remains explicit;
16. existing Golden Spine A/B/C/D tests stay green;
17. production bundle contains no fixture fallback for signed-in Agreement/Money state.

If useful, add scripts such as:

```text
test:signed-in
test:money
```

Keep the test setup lightweight and consistent with existing Node/esbuild tests.

## 10. Browser acceptance

Verify desktop and mobile for at least:

- signed-in Home with real agreement/action data
- no-agreements / empty state
- Agreement Hub with several backend buckets
- Agreement Detail
- changed/review-required state
- Money with NO_EVALUATION_YET
- Money NOT_READY / PARTIALLY_READY / BLOCKED where supported by the real contract
- Money READY without financial action — no Pay/Fund CTA
- Money READY with matching authoritative financial action — affordance visible only if the existing locked Bolt component supports it truthfully
- backend unavailable/error state

Compare against `bolt-reference-pass11`.

Visible deviations must be required by real authority/error truth, not design preference.

## 11. Validation

Run:

```bash
npm ci
npm run typecheck
npm run lint
npm run test:foundation
npm run test:agent
npm run test:handoff
npm run test:recipient
# plus all new Slice E tests
npm run build
git diff --check
```

Do not mix dependency upgrades into this PR.

## 12. Delivery

Proceed autonomously through routine implementation, inspection, testing and browser verification.

Commit and push the completed work.

Open a PR against:

`feat/production-foundation`

Suggested title:

`Golden Spine E: real signed-in agreements and Money`

Final report must state:

- locked Bolt components reused
- exact backend contracts/heads inspected
- signed-in Home behavior
- Hub bucket authority
- Agreement Detail coverage
- Money status/records authority
- financial next-action gating proof
- desktop/mobile verification
- test/build results
- any retained backend gap
- confirmation that no Store/Community/Circles/etc. work was started
- confirmation that sender-side invitation roleCode doctrine remains untouched

## Stop only for a genuine blocker

Stop only if you encounter a genuine blocker involving:

- identity/session semantics materially different from inspected backend
- acting-capacity ambiguity
- Agreement authority ambiguity
- Payment Ready / payment / release / settlement / ledger authority
- security/privacy
- legal/regulatory meaning
- a required backend capability that does not exist
- destructive repository operations

Do **not** stop for routine implementation, adapter work, tests, type errors, lint, browser verification, commit, push or PR creation.

When the slice is complete, the **Golden Spine is complete**. Wider Bolt-world productionization comes afterward as separate bounded slices.