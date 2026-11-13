# SecurePay Mini — Gate 7/9 read-only Money on-ramp

**Status:** engineering draft only; not built, deployed, migrated, tested, funded or provider-authorized.

The original approved Mini design remains unchanged. Within the existing first-party Agreement → Work evidence → Review charge, deposit and milestones flow, once the genuine work beneficiary and original reporter have separately signed the latest Agreement addendum, Mini calls the authenticated API route:

GET /api/v1/agreements/{agreementId}/measured-service/bill-drafts/{billId}/plans/{planId}/money-readiness

It rechecks the authoritative original measured-work version, exact reviewed bill source, latest immutable plan digest, actual two-party consent and any funds already received/in motion. The user sees the specific next action and that provider authorization is pending, NOT a Pay button.

All returned Money permissions are false. No synthetic provider statuses, fabricated Choice/M-Pesa/PesaLink quotes or self-managed escrow accounts are suggested. If the API fails or the source no longer matches, the UI stops the action and asks for a recheck.

Next Gate 9 code must introduce actual provider certification/quotes, callback signature verification, monotonic funding reconciliation and evidence-backed milestone releases under independent regulated-provider authority. Existing 20-person acceptance group stays Gate 10 after formal independent technical certification; production stays Gate 11. GitHub stores code, not runners.
