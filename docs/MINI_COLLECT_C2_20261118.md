# SecurePay Mini — Collect Money C2 governance draft (18 November 2026)

## What is implemented

C2 is a **new, dependent branch on C1**, not a separate product and not a payment module.
The C1 path now has a button **Agree on the collection rules** leading into C2.
C2 asks one small decision at a time, through accessible answer pills, numeric target and native date tool:

1. **Capacity:** self, verified organization or someone represented (no authorization inferred).
2. **Target:** fixed amount vs open collection; group purchase requires fixed amount.
3. **End condition:** explicit future close date; a fixed target can close at target or deadline.
   Where it can continue past its target, a surplus rule is mandatory.
4. **Fallback:** purpose-specific treatment when target is missed, a plan is cancelled,
   a cycle is incomplete, a donation period closes or an education goal changes.
5. **Authority:** fresh consent or an already-approved quorum for material changes;
   verified beneficiary, two approvers or an existing mandate for payouts.
   Group purchase and group rotation cannot choose single-beneficiary approval.
6. **Review:** readable decisions and independent unresolved gates:
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
