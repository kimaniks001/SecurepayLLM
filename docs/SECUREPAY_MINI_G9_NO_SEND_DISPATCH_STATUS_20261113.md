# Mini Gate 9 — Provider envelope is NOT a payment

**Source-only draft stacked on Mini #307. Not built, merged, tested, staged or deployed. No real money rails or new Pay button.**

The existing frozen first-party Mini Agreement → Work evidence → reviewed deposit/milestone screen already reads source-bound Money readiness from the authenticated API. Gate 9 adds one explicit, durable **NO-SEND** provider-dispatch envelope, initially limited to a single unresolved envelope per Agreement. It can be created only by the real PAYER after a fresh latest, signed, exact sandbox quote and selection, but it cannot start a bank or mobile-money debit.

Mini now distinguishes:
- **Money · provider authorization pending:** the Agreement and plan are valid, but the actual provider dispatch/regulated settlement system is not certified.
- **Money · dispatch reservation on hold:** one exact historical envelope exists, no debit was sent by this reservation step, and independent reconciliation is needed before trying anything else.
- **Actual funds already received or in motion:** this is separate from the reservation flag and must not be faked by a quote, plan acceptance or envelope.

After a no-send envelope, Mini hides the **Change planned deposit or milestone terms** action as the API now enforces a financial-source hold on both plan revisions and addendum signing. There is no call to a new execute/pay API.

The authenticated backend readiness response adds `providerDispatchEnvelopePending:boolean`; no preexisting permission is converted into providerQuoteAvailable, paymentAuthorized, callbackVerified or settlementPermitted. Those stay false.

**Next Gate 9 engineering:** certified external dispatch worker with a single atomic claim, signature-authenticated callback inbox, durable deduplication and unknown-outcome query reconciliation, independent regulated-provider ledger proof and milestones released only after separately reviewed work evidence and explicit approvals. Formal Java/SQL/TS and provider tests outside GitHub Actions, cross-product staging convergence, existing 20-person Gate 10 acceptance and Gate 11 controlled release remain mandatory.
