# SecurePay Mini Collect C7 — the Money lifecycle

**19 November 2026. Source implementation draft; financial execution NOT enabled.**

## Human intent

Someone contributing school fees, transport costs, chama money, estate levies, a training fee or voluntary gift should not have to call the collector to find out whether their money was received, what it is being used for or whether a refund was made.

C7 continues C1 → C5A → C2 → C5B → C6 → C3 → C4 with **My Money**, directly accessible from the existing C4 personal contribution screen. In the mobile preview it explains four short stages:

1. My original bill, item or purpose.
2. My own Agreement review and rights.
3. Genuine financial-provider confirmation, matching my original payment and the ledger.
4. What happens at closure and whether any unused funds are legally due back.

The additional content remains tucked away in plain-language sections. The application never displays fictional bank names, paid receipts, shared donor lists, a fabricated refund or a provider-ready payment button.

## What was built in the Mini repo

- c7MoneyLifecycle.mjs / .d.mts: non-authoritative local projection that strictly distinguishes proposals, reviewed items, certified funding and **calculated-not-authorized** returns. No client-side amounts imply provider settlement.
- C7MyMoneyLifecycle.tsx: mobile-first self status with genuine source-only slots; the default preview explains that no personal payment record is connected.
- C4MyContributionStatus.tsx: new button to view My Money after understanding the C4 contribution/return status; existing C4 view preserved.
- tests/mini-collect-c7-money-lifecycle.test.mjs: read-only/no-Money, proposed-not-paid, provider-certified-source-only and no invented refunds/notifications.

## Backend counterpart

SecurePayAPI C7 builds an authenticated personal status endpoint:

GET /api/v1/agreements/{agreementId}/collection-money/mine

It combines three separately authorized sources without merging or synthesizing them:
- C5B immutable original payer item, period and own review decision,
- C6 original-source Fair Trade examination,
- C4 ONLY provider-event/ledger-reconciled contributions and original-source return calculations.

Real C4 funding certification still defaults to DENY until the original provider mandate and bank/ledger evidence become independently provable.

The second endpoint prepares a per-contributor **return draft**, never a refund execution:

POST /api/v1/agreements/{agreementId}/collection-money/mine/refund-preflight

It accepts only an existing C4 own calculation-item ID and idempotency key. No refund amount, recipient bank details, refund token, paid/settled status or payment destination can be written by the client. C7 SQL prevents duplicates and mutation. The default actual provider refund settlement gate rejects all requests to claim a settled refund.

A signed provider callback, actual ledger posting and origin-to-origin refund route must be certified separately before any future settlement status is truthful.

## What is NOT completed

- Authentic issuer and recipient verification (C6), regulator/provider-certified source and signed collection-specific authority (C3).
- Actual payment authorization, initiation, bank settlement callbacks, credited licensed custody accounts, failed-payment recovery.
- A separate independently authorized debit/release/refund adapter linked to source payment tokens, signed provider ACK, ledger reconciliation and duplicate-replay checks.
- Authoritative Mini in-app notification delivery and reliable retry/acknowledgement.
- The complete end-to-end C7 financial flow, C8 Java 21/PostgreSQL/browser/security/concurrency/20-person acceptance and production approval.

The C7 UI is **NOT connected to a live signed-in collection API** yet. A source-backed backend GET exists but its integration must be separately certified and wired. Preview mode remains a design demonstration.

## Validation

Six C7 Mini assertion bodies were executed from this branch in an isolated JavaScript evaluator and passed. This is not equivalent to an actual Node/Vite/TypeScript/ESLint/browser certification.

API JUnit/doctrine test sources added but Java 21/PostgreSQL/Actions certification has **not** executed. GitHub Actions on prior C6 heads was experiencing account-wide runner/job startup failures. Do not claim passing infrastructure tests.

All work is stacked on the C6 draft, unmerged and not production deployed. Financial Money, recurring debit, refunds and outbound notifications remain disabled.
