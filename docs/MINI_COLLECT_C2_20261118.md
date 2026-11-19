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

## C3C — genuine provider comparison, no fictional bank list

The Mini C3 requirement step now opens `C3ProviderComparison.tsx`.
It accepts **only** a future authenticated C3C server shortlist; it has no
synthetic providers, mock bank branding, claimed LIVE features or invented prices.
The current preview shows *No verified provider to recommend yet*, because
the C3B independent document-vault/sandbox verifier remains uncertified and
the preview has no real authenticated collection to compare.

For future verified options, Mini displays KES contribution/refund/payout
fixed and percentage-based tariffs, fee bearer, maximum amount/holding time,
legal institution name, limits and the explicit warning that **the overall
price depends on real usage**. A "Propose this provider for our Agreement"
action appears only when an authenticated higher-level integration explicitly
provides `onPropose`. The preview deliberately does not do so and makes no
network call, Agreement, bank selection or Money action.

Backend C3C is in SecurePayAPI's dependent review branch
`feat/mini-collect-c3c-provider-discovery-selection-20261118` after
C3B PR #496. A real organizer can read independently VERIFIED, version-bound
candidate profiles, confirm an exact reviewed fee quote and record an
immutable **PROPOSED**, idempotent choice. It is not signed participant
consent or a live bank instruction. Future C3D/C6/C7/C8 gates remain.

## C3D — closing, returns and escalation in a human journey

The C3C comparison step now offers **Explore what happens when this collection closes**. `C3DClosingPreview.tsx` provides obvious answer pills for a decision window (1/3/7 days), refund-instruction deadline (day 8/10/14) and final resolution (day 15/21/30), relative to the C2 closing date. C2's existing missed-target fallback and payout authority appear as read-only human explanation, not new choices that override agreed rights. Users can review and adjust the illustrative plan.

The screen is honest about the current boundary: the **preview does not create an Agreement, select a provider, claim that funds were returned, or enable Money**. In actual backend code on dependent SecurePayAPI C3D branch `feat/mini-collect-c3d-mandate-close-refund-20261118`, an authorized organizer may propose a finite closing plan only if a genuine C3C provider quote and verified C3B evidence remain valid through final resolution. Established participants may privately review full provider/fee disclosures and record `REVIEWED_NOT_ACCEPTED`. No one else's identity can be accepted on their behalf.

The actual closing plan remains a proposal, because new provider, fee and refund terms must still be included in a separately accepted canonical Agreement version and backed by a **collection-specific signed, independently verified mandate** before accepting money. The backend also offers a protected, post-deadline **calendar milestone** status, with no invented payments or refund success. C6/C7/C8 and the real provider evidence source remain blocked.

## C4 — contributor-specific contribution status and unspent-return visibility

Mini's C3D closing/refund preview now includes a working **See how contributors check their own money** route to `C4MyContributionStatus.tsx`. This component accepts **only** future server-authenticated own-contributor records and own-return status; it uses no imagined demo contributors or fake Money. With no signed-in collection data, it clearly says no personal payment is connected to this design preview.

The human labels distinguish **pledge only**, **payment pending**, **source conflict**, **ledger record awaiting independent provider certification**, **provider-verified funding**, **return not yet determined**, and **calculated return not yet authorized**. Crucially, a missing refund entitlement is **not KSh 0**, an internal funding journal is not automatic bank settlement, a proposed refund amount is not an issued instruction, and a refund is not called complete without independently certified provider/ledger evidence.

C4 backend code, on `kimaniks001/SecurePayAPI` branch `feat/mini-collect-c4-contributions-entitlements-20261119`, reads actual immutable Group Contributor + PaymentIntent + accepted callback + funding posting, and prepares proportionally calculated potential returns **only** from future independently certified unspent balances, individual rights and accepted canonical financial terms. Both the production provider-proof verifier and the refund-pool verifier currently reject all certification; no bank transfer or actual refund exists. A future C7 stage will post source-linked refund instructions and reconcile provider-confirmed results. The Mini preview doesn't impersonate those steps.
