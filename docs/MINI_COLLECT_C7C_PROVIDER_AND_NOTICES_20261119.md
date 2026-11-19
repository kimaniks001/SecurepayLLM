# Mini Collect C7C–E: trusted provider and contribution updates

**19 November 2026 — mobile preview source only, not a live financial connection.**

## What the person sees

SecurePay Mini's existing C4 → C7 "See how my Money is protected" route now explains that the chosen financial institution must independently prove its suitability for the particular collection; that each payer's Agreement remains independent; that the original provider event and funding ledger must agree; and that refunds and notifications are only as trustworthy as the original source.

Only the two most useful explanations are visible by default. "See all protections" reveals the rest without making people navigate a technical checklist.

If no authenticated server readiness exists, Mini says **"Bank connection is not verified here"**, rather than displaying a fabricated bank name, a successful payment or an account balance. Even a genuine provider certification alone is not permission to debit contributors.

## Frontend work

- c7ProviderReadiness.mjs / .d.mts: fail-closed concise provider/Agreement/payment/return/inbox language; refuses to infer authorized Money, refunds or delivered notices from server flags or preview values.
- C7MyMoneyLifecycle.tsx: minimal, expandable lender/Agreement/funds/refund/inbox protections, separate from C4 source-backed personal contributions.
- C4MyContributionStatus.tsx: optional provider-readiness parameter preserved from authenticated caller without changing the standalone preview.
- tests/mini-collect-c7c-providers-notices.test.mjs: anonymous/default-deny, provider-certified-but-payer-not-authorized, spoofed "ready" flags, exact human copy and no client-side Money calls.

Backend counterpart (API C7C–E) provides organizer-only GET collection-money/provider-readiness and contributor-self GET collection-money/mine/settled-refunds, but the current third-party verification gate always rejects a live bank/PSP. No authenticated Mini data-fetch wiring or real bank/consumer payments are available from these preview components.

Existing in-app StatusEvent/Notification bridge is the canonical notification infrastructure. C7 financial notice producer will require independently certified, original-source financial events. A notification being **recorded in the inbox** is not equivalent to a push notification being delivered or read.

## Release limits

No verified CBK licensed financial-provider partnership, custody/holding arrangement, signed mandate, production credentials or bank money was connected. No live transaction, refund, source return, provider callback, settlement accounting, auto-debit, production notification delivery or merge was performed. Java 21/PostgreSQL/provider and 20-person customer certification remain required. See paired backend ops report.

Tests in this branch have limited source-level and focused isolated JavaScript evaluation only; these do NOT equal a full TypeScript/Vite/Node/browser build or financial-provider certification.
