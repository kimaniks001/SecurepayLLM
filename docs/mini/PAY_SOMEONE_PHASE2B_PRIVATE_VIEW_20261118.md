# Mini Pay — Phase 2B: private-by-default Living Agreement display
Date: 18 November 2026 · Draft frontend, no Money writes

## Human rule
**A Living Agreement can speak through colour to its owner. It must not broadcast that owner's economic standing to someone looking over their shoulder.**

The Mini payment overview is now discreet by default:
- Total and individual amounts are masked, alongside names, purposes, deadlines and urgency labels.
- All overview rows use the same calm background rather than red/green wealth or debt coding.
- **Show details** is a deliberate tap, available to the owner. The reveal is **in memory only**, never persisted, and is reset when navigating back out of a detail or reopening Mini.
- Agreement detail, group review and sample payment planning do not show sensitive amounts when the privacy cover is active.
- The existing first-party authenticated `MiniMyAgreements` also hides the title, people, next action and Money panel until explicit reveal when entered from **Pay Someone or Something**.
- For the new gated payer responsibilities view, task-specific subtle accents (blue, grey and amber) appear only **after** reveal and always accompany text. They mean *check*, *wait* or *review*, **never** financial standing.
- No status is published to a public SecureLink, QR image or social post as a financial reputation signal.

Privacy covers reduce casual shoulder-surfing; they are not a security substitute for phone locks, session authentication, authorization, anti-screenshot policies where applicable or data-access controls. A nearby observer can still see deliberately revealed content.

## Backend integration
`src/api/securepay/personal-payments/index.ts` validates the paired SecurePayAPI `GET /api/v1/me/payments/responsibilities` read response. It requires current-version IDs, safe amounts, accepted state vocabulary, `payableNow=false` and `outstandingAmountMinor=null`, rejecting invalid JSON and mismatched pages.

`MiniPersonalPaymentResponsibilities` is intentionally only available when all are true:
1. This is the genuine authenticated KS001 owner, not a demo fixture.
2. The developer has configured the explicit trusted staging API origin.
3. `VITE_SECUREPAY_MINI_PAY_RESPONSIBILITIES_READ=enabled` was deliberately set for a **paired deployment with API PR**. It is **disabled by default**.

If the API cannot be verified, Mini shows an honest error and a way to check the existing authenticated Agreement screen; it never generates a balance locally. No buttons create Money intents, transfers, fee quotes, investments or funding instructions.

## Classification
- **FRONTEND_COMPOSITION_ONLY / DEMO_ONLY:** Concealed fictional amounts in approved Mini playground, with an explicit reveal.
- **READ_ONLY API GATED:** New typed personal responsibility gateway and owner view, pending matched backend deployment.
- **PAYMENT BACKEND BLOCKED:** Per-obligation actual outstanding amount, early-pay dates, recurring periods, stage/consent rechecks and independently confirmed settlement remain unfinished.

## Verification
Frontend focused tests now include `tests/mini-pay-phase2b-private-responsibilities.test.mjs` alongside prior Mini Buy, Sell, Money and Agreement tests. Vercel preview compilation/type checks must succeed before presenting a link; Java 21/PostgreSQL tests for the paired API remain separate.
