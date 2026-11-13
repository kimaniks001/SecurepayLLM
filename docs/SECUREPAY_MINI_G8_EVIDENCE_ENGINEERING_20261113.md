# SecurePay Mini — Master Gate 8 / E7 evidence workflow

**Master implementation plan unchanged:** Gate 7 Money safety; Gate 8 Agreement lifecycle; Gate 9 payment-provider/callback safeguards; Gate 10 existing 20-person acceptance group; Gate 11 certified production release.

**Owner-approved order:** complete code and engineering first. Technical tests, cross-repo convergence and user testing happen later on an independently operated test environment; GitHub is for commits, not Actions runners.

## Engineering candidate — Mini draft #303 with API draft #442

The compact **Work evidence** tool is added to the existing first-party **My Agreements** detail view. The original Mini layout and conversation are unchanged.

1. An established, authenticated participant opens an actual Agreement with an accepted **current canonical measured tariff**. The tool loads the source Agreement version/hash and a bounded private API work directory. It does not build sample reports.
2. The reporter enters hours or kilometres (hundredths) and a human work note. One service-instance UUID is held until SecurePay confirms the report exists; a timed-out submission is never automatically repeated with a fresh trip ID.
3. The reporter chooses a **participant** from the existing Agreement view. The backend derives that beneficiary's identity, enforces current established participation and refuses self-beneficiary.
4. The backend creates a single **NON_MONETARY** canonical evidence-only obligation per report. The reporter starts that work using the established Agreement endpoint and exact state version.
5. The tool reuses existing **private, malware-scanned media intake** for JPG/PNG/PDF, verified receipt, canonical evidence submission, and immutable binding to this exact report/ride. No local photo record, invented media URL or second storage system. Verified receipt upload and canonical submission are separate server operations, orchestrated behind one user intent. No implicit retries after uncertain results.
6. The beneficiary reviews canonical source evidence independently; a second explicit review addresses the **reported quantity**. Neither is an invoice or Money authorization. The reporter can finish the nonmonetary evidence work only when the existing completion gate says so.
7. A reporter can propose a corrected quantity with an existing linked evidence binding and a written reason. Mini shows the latest immutable correction revision and its independent participant-review summary. The beneficiary can explicitly ACCEPT or REJECT that exact correction, with source evidence approval required for ACCEPT. Neither action edits the original report or issues an invoice.
8. The actual beneficiary can explicitly confirm the effective original OR latest accepted corrected quantity only after the backend verifies every fresh Agreement confirmation, independent evidence approval, work completion, exact participant votes/revision and tariff cap. A disputed or incomplete correction blocks final confirmation.

## Activation boundary

The new Mini surface appears only when all conditions are met:
- Authenticated **first-party** Mini using the same in-memory token as My Agreements.
- `VITE_SECUREPAY_M8_EVIDENCE=enabled` set explicitly on an **isolated protected preview**; never through a query parameter.
- A matching isolated **API branch** carrying the Gate 8 M8 stacked migrations and endpoints.
- The API's existing `securepay.evidence-media.enabled=true` private S3/media-scanner setup, approved exact Vercel staging origin and established authorization.

These conditions do NOT establish that the system is deployed or certified. No production activation, fake accounts, synthetic paid invoices, escrow, transfers, app/host UI redesign or checkout rail changes.

## Remaining engineering before Gate 8 code freeze

- **Implemented as draft:** in-tool correction proposal, history, exact latest revision status, beneficiary accept/reject and guarded effective-quantity confirmation; extended multi-party correction review and post-seal dispute/supersession remain OPEN.
- Bind effect of human-confirmed quantity to a separate verified **bill**/milestone/deposit contract under Gate 8 E8, with an explicit Money authority boundary.
- Independently check physical meter/route evidence where available; a reviewed photo alone cannot prove actual kilometres.
- Complete source-level error handling and privacy on account switch; end-to-end authentication/Java/Flyway/upload/review tests are expressly deferred until the owner-approved certification phase.

**Technical truth:** This file documents draft code that has NOT been compiled, run, merged or deployed. A validated response is not a guarantee of factual physical work or a payment instruction.
