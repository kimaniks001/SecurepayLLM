# Mini Pay: Phase 2C–2F — owner payment positions and delegated preparation
18 November 2026 · Isolated frontend development branch, not production.

## What this adds to the existing human Mini payment screens
1. A strictly typed, authenticated GET-only gateway for `/api/v1/me/payments/positions`.
   The response is derived from the owner-authenticated Agreement version and
   one monetary obligation. It carries settled/refund/reversal/outstanding
   evidence only if the server independently verifies complete records.
2. Client-side validation rejects duplicate obligation rows, stale IDs, unknown
   status vocabulary, inconsistent same-currency arithmetic, unsafe JS integers,
   missing or falsely verified refunds, and any `payableNow=true` or
   `canAuthorizeMoney=true` response.
3. The detail view distinguishes **Agreed amount** from **Remaining after verified
   settlement**. If history is incomplete, it says **Remaining balance is being
   checked — do not pay twice.** No artificial total is displayed.
4. Separate plain-language distinctions: already settled, in dispute, evidence
   required, due later, consent missing and terms yet to be checked. No
   red/green financial-standing indicators and no payment action from read-only
   data. Searchable recognised titles and the discreet overview stay intact.
5. A reusable GET-only `/api/v1/me/payments/preparation-authority` gateway
   validates a single Agreement/obligation, and never accepts user-supplied
   delegated financial authority, payer identity or a POST action. This is for
   Mini, SecurePay for Business and Living Workspace's shared doctrine;
   it is not a live payment-preparation request yet.

## Deployment gate
The new positions read requires BOTH build flags:
`VITE_SECUREPAY_MINI_PAY_RESPONSIBILITIES_READ=enabled`
AND `VITE_SECUREPAY_MINI_PAY_POSITIONS_READ=enabled`.
Both remain **disabled** by default, and only a trusted staging frontend
paired with the exact API draft may enable them. The demo continues to
show labelled fictional examples, not fabricated production Money.

## Still required
- Java 21 and PostgreSQL/Flyway certification of the API code.
- Certified obligation-level provider/ledger discharge, reversals, refunds and
  complete history, plus structured accepted due and evidence contracts.
- A real non-Money delegated preparation command, immutable selected-version
  request record, separate payer approval and permissions recheck.
- 20-person usability test and controlled release.
- Phase 6 remains the only place for live rail execution.

This slice does **not** claim that real outstanding balances, bank transfers,
recurring collections or delegated Money approval are already live.
