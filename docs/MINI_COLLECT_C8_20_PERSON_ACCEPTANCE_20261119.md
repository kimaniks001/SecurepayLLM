# SecurePay Mini — C8 human acceptance and final certification

**19 November 2026 | Draft test plan, not a completed or certified release.**

## Testing promise

Collect Money must make sense to the person collecting and the person contributing. It must be quiet, phone-first, use answer pills where clarification is necessary, and clearly distinguish an item proposed for payment from money actually received. Money can flow only through a regulated provider after an independently accepted financial Agreement and authorized collection mandate.

The existing Mini C7 personal My Money view must stay distinctly separate from SecurePay for Business and Living Workspace. Keep the approved Mini design and real original source/version; do not generate fabricated amounts, provider logos or demo receipts in production.

## Twenty-person acceptance exercise

The plan at testing/mini-collect-c8/acceptance-20-persons.json contains twenty different real-world roles and expected outcomes. They include a school headmaster and parent, school transport provider and parent, trainer and learner, thrift shop and buyer, estate treasurer and resident, chama official and member, fundraiser and donor, shared purchase organizer and supplier, two different contributors with refunds/pending payments, accessibility participant and independent compliance reviewer.

**All 20 cases currently have status NOT_TESTED.** We have not recruited, spoken to, tested or recorded acceptance by any real participants. The test file is only the case schedule.

For each actual test, the facilitator must record consent, a unique pseudonym without sensitive identifying details, the real device/browser, task attempted, expected outcome, actual observed result, usability rating, clear screenshots/video references stored privately, defects, time and independent review. A participant must not be counted twice to meet the twenty-person requirement.

## Mandatory human behavior checks

- A first-time contributor understands the original invoice, purpose, amount, place, dates and return rights without reading code jargon.
- Changed source, school term, delivery route, provider condition or membership arrangement leads to a meaningful answer-pill clarification, not silently accepting the old item.
- Accepting the original proposal does not debit anyone. When provider connection is absent, the interface must explicitly say so.
- Another payer's private tuition, charitable donations, paid amount and refund history must remain inaccessible.
- Pledges, pending transfers, provider-confirmed funding, refunds calculated, refunds instructed and refunds actually settled must never be presented as the same event.
- Two merchants or suppliers in a shared collection do not lose their individually accepted Agreement and source-of-authority records.
- No one should have to telephone or chase the collector to know a genuine provider-confirmed payment/refund status after the authoritative inbox is truly functioning.
- Small-screen interaction, large-text and keyboard/screen-reader use must be tested on actual devices, not simply inspected in JSX.

## Engineering gates

The new .github/workflows/mini-collect-c8-ui-certification.yml requires real Node 20 package install, all Mini Collect tests, TypeScript, full frontend regression, Vite build and ESLint. It separately runs the twenty-person acceptance evidence evaluator in expected NO_GO mode, so missing human work cannot be called passed.

The C8 UAT evaluator can never authorize financial execution or release production; even fully completed self-reported entries can at most be READY_FOR_INDEPENDENT_HUMAN_REVIEW. Signed-off independent human evidence and regulated bank/provider certification remain separate.

Parallel API C8 workflow uses Java 21/Gradle, collection doctrine tests and the existing isolated PostgreSQL/Flyway convergence path. C7 currently has unconfigured regulatory/provider and payer-signature ports; therefore there are no live Money payments or actual provider-settled returns to certify.

## Current status

**C8 planned and test gates authored, NO_GO.** No real 20-person sessions, real provider money sandbox, final web/mobile E2E, java/DB certification or production deployment have been completed. Pending GitHub Actions startup troubleshooting is not an excuse to skip the tests. The correct next actions are to run the exact-sha CI suites, repair genuine failures, secure provider sandbox/mandate evidence, complete the twenty distinct tests and then seek an independent release decision.
