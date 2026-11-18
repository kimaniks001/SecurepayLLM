# SecurePay Mini — Pay Someone or Something: human delivery contract
Date: 18 November 2026. **Frontend draft; not a Money release.**

## Promise
People see what they owe, what they can settle early, and what they may prepare for.
They can pay one person or select several already individually agreed recipients.
They can start a new payment by giving the recipient's KSNumber, the amount and the truthful purpose.
Do not ask people to manage ledgers, canonical versions, instructions or payment intents.

## Current implementation on this branch
- Mini home "Pay someone or something" opens `MiniPaySomeone`, not the generic local seller/collection composer.
- Existing agreements: "Open my agreements" reuses the authenticated first-party KS001 session and `MiniMyAgreements`; no invented payer status or amount. It is disabled if the verified API origin is unavailable.
- New payment: first enter KSNumber, amount and purpose; review; then hand the **note** to the existing KS001 Agreement preparation path. This note is not an issued SecureLink, recipient acknowledgement or payment intent.
- Separate *fictional owner walkthrough* behind the existing approved-preview-host **and** `miniTradeDemo=1`. It demonstrates due/coming-up, LPG, import prepayment, grouped payments, checkout choices and financial preparation. These do **not** constitute actual bills, standing orders, payment instructions or receipts.
- Buy, Sell, Store, existing canonical Agreement, Money snapshot, stage/rail safeguards and Community Saver are not rewritten.

## Shared doctrine for Mini, SecurePay for Business and Living Workspace
- No payments without a legitimate, specifically stated purpose, identified payer and verified KS recipient. Each financial transfer needs applicable payer authority and recipient acceptance of its purpose and terms.
- One accepted, immutable version governs each exact payment purpose, amount, conditions and parties; changes require fresh acceptance when material.
- An ongoing agreement (e.g. LPG at KSh 3,000 monthly) creates per-period responsibilities, each with distinct due date, service/delivery evidence, eligibility, payment and dispute states. Being due is not the same as being authorised for payment.
- Customers may pay early when permitted, or arrange partial/staged payments by mutual agreement. No arbitrary early transfer or duplicated instalments.
- Grouping selected workers/people is a **review convenience**. Each person's KS identity, agreement, amount, purpose, exact-version confirmation, fulfilment evidence, payment instruction, result and receipt remain independent. Partial provider failures must display independent results; no blind retry.
- Shared bill and pay-on-behalf-of use cases must distinguish the responsible payer, authorising actor, beneficiary and receiving party.
- A merchant's recurring accounts are managed in Business; a payer's own commitments appear in Mini; Workspace can manage complex revisions and performance. All must use the same canonical agreement truth.
- Physical work and service acknowledgement are separate from provider-confirmed Money. A photo uploaded by a supplier is not itself customer confirmation.
- Financial preparation (MMF, savings, financing, standing orders and conditional payment services) is *optional*, served by appropriately licensed partners; never treat funds set aside as a paid obligation or interest as guaranteed.
- SecureLink is the channel-independent way to share and open an offer/agreement. No mandatory SecureLink roundtrip before paying an already accepted straight sale.
- All three products must remain human-first, mobile-simple in Mini, with answer pills and progressively revealed complexity. Technical names belong underneath.

## Required backend integration before calling this a complete payment journey
1. Owner/acting-capacity-scoped payable schedule: exact Agreement/current version, payer, payee, recipient acceptance, period/stage ID, due/early-pay eligibility, fulfillment evidence, outstanding minor-unit balance and currency.
2. Financial eligibility proof from SecurePayAPI (never derive a due total or payable action from Agreement list titles or monetary terms).
3. KS recipient lookup and active seller/payer capacity, explicit recipient acceptance/decline/correction and immutable purpose/version record. Respect privacy and KYC/AML risk controls.
4. Repeat cadence and stop/cancel/renewal, per-period service proof, disputes, part-pay and pay-on-behalf-of authority, with no extra cycle generated for a funded/paid period.
5. Batch review over individually revalidated exact-version payment instructions; provider support for independent stage authorisations, idempotency, unknown states, callback/reconciliation and receipts.
6. Payment command release remains gated behind focused Java 21/PostgreSQL/Flyway/concurrency/security tests, regulated-provider sandbox certification and the 20-person acceptance group. No release credentials or live Money in a preview.

## UX acceptance tests
A parent paying school fees, an LPG subscriber, a caretaker paying five accepted casual workers, a trader saving for a six-month import, and a person supporting their mother should all find the next sensible action in seconds. Every real transfer retains purpose and individual consent, even within one review session. Failed, pending, changed or disputed payments must remain honest and recoverable.

## Evidence
Dedicated Mini component: `src/mini/MiniPaySomeone.tsx`
CSS: `src/mini/miniPaySomeone.css`
Integration: `src/mini/MiniExperience.tsx`, `MiniFirstPartyKs001.tsx`
Safeguard test: `tests/mini-pay-human-first.test.mjs`

**Not certified:** API payer-owned obligations not yet exposed as one verified Pay list, recipient-acceptance workflow not yet wired, no genuine group-pay rails, no licensed financial-service offers, no real merchant recurring accounts or payment execution in this branch. Never display the fictional preview as production truth.
