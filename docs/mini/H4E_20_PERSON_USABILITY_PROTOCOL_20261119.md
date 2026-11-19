# SecurePay Mini H4E — 20-person human usability acceptance protocol

19 November 2026 · **NOT YET CONDUCTED** · phone-first Mini · no real payment

## The question this trial must answer

Does someone who knows nothing about SecurePay understand how to get honest human help, what a verified capability means, when a helper has actually agreed, what their price is, and when a separate Agreement and SecureLink truly exist?

**The current Vercel H4E route is a design inspection, not a substitute for real people or an authenticated Core staging API. No synthetic helper may be shown as a genuine paid provider.**

## Participant mix (20 real adults)

- Eight customers who have not previously used SecurePay: reassurance, local advice, field observations or specialist requests.
- Six appropriately vetted Plug applicants/providers with qualifications verified through the independent governance process.
- Four legitimately independently assessed Masters offering narrowly scoped, non-regulated services. Do not enroll/licence regulated experts through this study.
- Two trained independent observers/readers tasked with accessibility, identity boundary and privacy explanation.

Recruitment, consent, real evaluator identity, approved test accounts and evidence storage must be arranged before executing. Do **not** place participants' private conversations, addresses or health information in this repository or public logs.

## Tasks (actual observed sessions, not invented passes)

| Test | Human task and expected observation |
| --- | --- |
| 1 | Customer opens native **Need a hand? → Talk to someone** without a dispute, selects *reassurance* and understands KS001 is optional |
| 2 | Customer selects an exact non-regulated service; missing verified providers display an honest empty state with no invented profile |
| 3 | Applicant sees a **Plug** and **Master** capability match accurately, and understands that general training does not prove another specialty |
| 4 | Customer chooses a help task and completion condition using answer pills, with minimal typing; checks published unit price and total |
| 5 | Customer explicitly consents to share ONLY their task brief. Ask what the helper can see; expected answer excludes source Agreement/evidence/precise location |
| 6 | Helper receives the private request with original scope and may independently accept or decline; unrelated third account sees neither request nor actions |
| 7 | Provider changes rate or withdraws opt-in while acceptance is being attempted; outdated quote must fail closed and invite a new review |
| 8 | Customer accepts helper decision; UI says **Ready for Agreement**, never hired/paid/linked yet |
| 9 | Customer explicitly chooses **Prepare official Agreement**. Backend creates one genuine PROPOSED Agreement with helper PENDING, exact H4D source/version and quote. Customer can recover uncertain POST via GET |
| 10 | Both participants join/confirm original canonical Agreement, complete obligations and Fair Trade checks; a shareable URL/QR must appear only after existing product/locator authority issues it |
| 11 | Someone attempts to share the original Agreement without participant consent; reject access and record safe errors |
| 12 | Explore cancellations/expiry, network failure, sign-out/relogin, screen reader, high contrast, 200% text zoom, keyboard and old phone widths |

The canonical Agreement, SecureLink and Money steps are **not executable through the disconnected H4E visual preview**. Run the full test only against a certified staging Core/real person directory with NO LIVE MONEY.

## Human understanding checks (ask without prompting answers)

- What happens if you tap **Send this request**? Did someone accept? Did you pay?
- Who has received your original Agreement, photographs and precise location?
- Does a Plug's general qualification permit specialist engineering advice?
- Can a helper change a price after you approve it without asking again?
- Who must accept the official Agreement version before SecureLink and Money?
- What does **No verified helper found** actually mean?

## Proposed quantitative release targets (not results)

- At least 18 of 20 can finish the appropriate staged task unaided or with one short hint.
- Every participant understands that **request sent ≠ helper accepted ≠ canonical Agreement accepted ≠ Money paid**.
- **Zero** unconsented private data disclosures, phantom human contacts, fake payment/booking states, BOLA bypasses or fabricated verified providers.
- Every observed critical security/accessibility/privacy problem blocks release until fixed and retested. Record completion times and confusion points, not just preference scores.
- All primary actions keyboard-usable and screen-reader-described; test narrow phones, reduced motion, zoom and large text.

## Evidence and sign-off

For each anonymized test: scenario ID, roles, baseline build SHA, Core migration checksum, tester sign-off, observations, pass/fail, defect ticket, retest result. Independently review the changed original Agreement versions and audit records. Only a named release authority can mark H4E **GO** once the Java21, PostgreSQL/Flyway, 3-person authorization, concurrency and all legal/licensing/regulated Money checks pass. 

**Current status: DRAFT / NO-GO.** No 20-person acceptance results exist; do not claim otherwise.
