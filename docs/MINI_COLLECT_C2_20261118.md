# SecurePay Mini — Collect Money C2 governance draft (18 November 2026)

## What is implemented

C2 is a **new, dependent branch on C1**, not a separate product and not a payment module.
The C1 path now has a button **Agree on the collection rules** leading into C2.
C2 asks one small decision at a time, through accessible answer pills, numeric target and native date tool:

1. **Capacity:** self, verified organization or someone represented (no authorization inferred).
2. **People and beneficiary:** individual, invited or open contributors; destination by collection purpose (e.g. verified merchant or rotation member). Neither eligibility nor destination is verified locally.
3. **Target:** fixed amount vs open collection; group purchase requires fixed amount.
4. **Collection window:** after Agreement activation or a scheduled date; explicit future close date; a fixed target can close at target or deadline. Exact close time/timezone remains a mandatory backend gate.
   Where it can continue past its target, a surplus rule is mandatory.
5. **Fallback:** purpose-specific treatment when target is missed, a plan is cancelled,
   a cycle is incomplete, a donation period closes or an education goal changes.
6. **Authority:** fresh consent or an already-approved quorum for material changes;
   verified beneficiary, two approvers or an existing mandate for payouts.
   Group purchase and group rotation cannot choose single-beneficiary approval.
7. **Review:** readable decisions and independent unresolved gates:
   legal collector/recipient identity and representation; canonical Agreement version;
   affected party consent; financial provider custody/refund/disbursement capability;
   expiry, recovery, security and audit authority.

This is **a local, unsaved, non-authoritative draft**, deliberately not an Agreement or a
released financial service. No payment, custody, refund, SecureLink, bank selection or
real collection is initiated.

## Backend reuse audit

Existing system authority lives in **SecurePayAPI**, specifically:

- `services/agreement/.../group/model/AgreementGroupSecureLink.java`
  for group source, version, amount, deadline and status;
- `GroupSecureLinkService.java` for a group product bound to the current Agreement
  version and activating only when an active PROPOSE_RELEASE policy exists;
- `GroupGovernanceService.java` for approver quorum, maker-checker, idempotency,
  authorization and exact-version policy snapshots;
- `GroupSecureLinkController.java` for authenticated group create/read/capabilities,
  policy, approvals, contributor intents and other group actions;
- `docs/PHASE_25_GROUP_SECURELINK_GOVERNANCE.md` for the original boundary:
  approval is **not** disbursement; contributor intent is **not** confirmed funding.

The existing group service only models `WELFARE`/`GENERAL`, `FIXED_AMOUNT`/`OPEN_ENDED`,
and a group deadline. It does not, by those fields alone, prove complete C2 rules
for surplus, overfunding, automatic stopping, refundable donation rights, payouts
or fail-safe expiry. We must NOT write those rules client-side and pretend they
are enforced by the backend.

## C2 completion gates not yet satisfied

- Server-side policy persistence linked to exact accepted Agreement version and
  exact source/beneficiary; contributor assent, rights and source evidence.
- Server-side guard against unauthorized changes, deadline passing, overfunding,
  or group payouts without a valid approved mandate.
- Explicit, time-limited failed-target and no-decision fallback with no indefinite
  custody hold. Legal surplus entitlement and refunds at provider level.
- Full state transitions for DRAFT / INVITED / COLLECTING / PAUSED / EXPIRED /
  CLOSED / DISBURSEMENT_PENDING / FAILED / REFUND_PENDING / SETTLED, respecting the
  actual canonical backend status model.
- Durable audit, idempotent commands, version conflicts, timezone and concurrency.
- Provider capability verification is the C3 boundary, not a toggle in this draft.
- Only then may a draft be adopted into a canonical Agreement and a real SecureLink.

## Tests and validation

- `tests/mini-collect-c2.test.mjs`: actual pure policy-model tests for
  future date validation, fixed/open target rules, invalid amounts, surplus,
  consent, charitable-giving distinctions, group approvals, and fail-closed status.
- `tests/mini-collect-c1.test.mjs`: C1 route isolation and no backend writes.
- Vercel preview on a nonproduction Git branch, `#/preview/mini/collect`.
- Run focused Node tests, TypeScript typecheck, Vite build, and phone/keyboard
  interaction review before promoting. Production payments stay disabled.

## Product commitment

The UI can feel friendly and intelligent. It must never imply a user picked a
bank service, executed a refund, passed authorization or successfully created an
Agreement merely because they answered a question. **Money follows the Agreement**.


## C2 backend draft handoff adapter (18 November follow-up)

`src/features/mini-collect/governanceSubmission.mjs` translates C2 answer-pill values into
the backend's `CreateCollectionGovernanceDraftRequest` taxonomy, including exact KES minor units
(whole KSh × 100), target/beneficiary/failure/payout classes, the original offer source/version
and an absolute closing instant. It **refuses** to generate a submission without a canonical
Agreement ID, Group SecureLink ID, explicit timezone, matching target, matching local closing
date, and a stable caller-owned idempotency key. The backend re-verifies each value.

`tests/mini-collect-c2-handoff.test.mjs` covers this mapping and refusal cases. Eight direct
model/handoff checks were exercised in isolation and passed; the standalone Node test suite
has not yet been executed in the repository environment.

**This is a pure mapper, not a network feature.** No backend request is sent and no false
Agreement ID or date is manufactured by the preview. The C2B backend draft endpoint exists
on a separate, unmerged SecurePayAPI branch (PR #492), which itself depends on C2A PR #491.
Neither branch may be treated as live Money. The human Mini preview remains a demonstrator
until there is a real authenticated Agreement/context and independent authority checks.

## C3A — Human provider possibility review (18 November 2026)

Mini now continues from a **fully answered C2 review** to a new screen,
`C3ProviderPossibilities.tsx`, explaining which bank services the particular
collection would require. It adapts to the chosen target, end date, fundraiser
purpose, fallback/refund and approval rule. The C3 preview uses no bank names,
ratings, support claims or fake provider data. It explicitly warns that no
authenticated Agreement or financial provider has been checked in this demo,
and performs **no** network request, bank selection, Money movement or transfer
instruction. Back to C2 remains functional.

Backend C3A provider fit on SecurePayAPI is a separate draft branch
`feat/mini-collect-c3a-provider-capability-fit-20261118`, dependent on C2D
PR #494. It reads only the current canonical C2 rules and operations-controlled
LIVE institution/collection/settlement capability proofs, including custody,
contributor attribution, period, failure, refund and group payout rights.
It always returns `activationAllowed=false`, even on a technical match.

**Remaining:** independently verified real provider profiles, authenticated
provider shortlist/choice, actual collection-specific custody mandates,
refund horizon, C6/C7 financial execution and C8 provider/security/database
certification. No provider is certified by the preview.
