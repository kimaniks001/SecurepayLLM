# SecurePay Mini Collect C6 — Fair Trade Examination

**Date:** 19 November 2026  
**Status:** Stack-built, unmerged developer preview. **No real Money or provider activation.**

## Human purpose

The Collect Money journey now runs:

**C1 — purpose** → **C5A — collection type/frequency** → **C2 — governance** → **C5B — collection period and original-source choice** → **C6 — quiet, type-aware Fair Trade questions** → **C3 — provider capability review** → **C4 — personal contribution and return status**.

People must not read a list of technical capabilities or answer all twelve Fair Trade principles one by one. C6 asks only the questions that genuinely differ for their actual collection. It uses short answer pills and a calendar only when a course start date is proposed, then shows an easy two-line overview of what must still be independently checked. More protections are available on request.

Examples:
- A headmaster: preserve the original private student-and-term invoice; never silently mark it due.
- A transport operator: prove the actual route, vehicle/operator, service dates and cancellation coverage before treating transport as ordered.
- An online trainer: clarify access start, course promises and cancellation, not merely a payment amount.
- A thrift shop owner: keep the exact item, visible condition, lawful seller and delivery/return details intact.
- A community collector: preserve each approved cycle, member amount, governance approval and exact cause; never duplicate a levy or auto-debit someone.
- Fundraising: identify the authorized beneficiary while retaining confidential, voluntary gifts; do not turn gifts into compulsory debts.

Answers such as "same offer", "I have the original", "the term looks right" are **statements made by the person**, not independently verified source evidence. When the user says an item, period, course, route or purpose changed, C6 blocks moving forward to provider review and guides them back to the source.

## Mini implementation

- c6Examination.mjs: 15 real-world question templates, two/three compact questions each, controlled answer-pill choices, canonical answer code mapping, explicit nonfinancial capability flags.
- c6Examination.d.mts: typed consumer and backend clarification contract.
- C6CollectionExamination.tsx: one question per mobile screen, optional date-picker for course start, source-conflict blocking, simple two-point summary with "See all protections" onion layer.
- C2GovernanceExperience.tsx: C5B → C6 → C3 linkage, with C5B period selection preserved on back navigation.
- C5BCollectionPeriods.tsx: selection passed to C6 without implying that the selection created an Agreement, SecureLink, payer item or Money.
- tests/mini-collect-c6-examination.test.mjs: type coverage, source-change blocking, calendar validity, vocabulary mapping, no-Money and journey continuity.

**Mini remains a demonstration surface, not an authenticated C6 API client.** No actual original invoice, provider proof, certified beneficiary account or refund exists in the preview. No synthetic receipt, paid status or actual source was introduced.

## Backend separation

SecurePayAPI C6 provides an independent examination service, immutable private reports and answer-pill records. It reuses the exact C5B source digest, typed canonical first Agreement version, C2 original governance and contributor identity and never creates a legally due debt or Payment Ready. See its paired operations report.

The signed-in individual's real examination/answer endpoints should only be wired into Mini after user-identity, provenance and privacy certification. The server currently uses an explicitly UNCONFIGURED independent source gate and therefore **cannot authenticate real merchant/school invoice, collector/beneficiary authority or provider custody terms.** Even a future verified issuer source must not substitute for C3 provider and C7 Money authorizations.

## Next work / release gates

1. Connect authenticated Mini reads to C5B/C6 after canonical source and product routing are checked; do not replace local preview values with invented API evidence.
2. Provide actual independent and auditable issuer/source/collector/beneficiary verification and certified legal/financial-provider capabilities. Allow specialists/Plugs to submit evidence only within their scoped competence; human observations are not legal/payment authority.
3. C7: provider execution, stage-specific payer consent and real, reconciled callbacks, original-source refunds, notice and recovery.
4. C8: Java 21/JUnit, Flyway/PostgreSQL, concurrency, auth/privacy, frontend build, real provider sandbox and 20-person acceptance tests.

**Not certified:** Node tests, Vite build, TypeScript, browser walkthrough, actual bank Money or 20-person testing. PR remains draft until the safety and human checks pass.
