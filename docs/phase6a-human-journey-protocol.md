# Phase 6A — Real Human Journey Certification
Status: PROTOCOL BUILT / HUMAN SESSIONS PENDING. This is not a production release approval.

## Environment and rules
Use the latest verified SecurePayLLM development preview. Open each test in a new conversation; don't use production or send real payments. If testing with actual documents, redact names, phone numbers, banking information and other private details. Run the journey once **without coaching**, then once while recording any issues. At least one test on a mobile viewport and one on desktop per scenario. Ask a first-time user to conduct at least two scenarios if practical.

## Five tests
### 1. Photo → trade
Show KS001 a hardware bill using Home + → Photo. Check that Photo is first, file loads, image can be enlarged, source summary matches bill, errors can be corrected, and Agreement reflects *proposed* obligations. A bill is not proof of payment or delivery. Do not invent items, taxes, vendor or amounts. Capture the exact first bad inference if any.

### 2. Minutes → governing Agreement
Upload redacted minutes of a committee meeting (or sample). Ask KS001 to extract decisions, participants, roles, consent and missing approvals. Verify the reading state, provenance, review access and usefulness of the Agreement. If the original document cannot be displayed, record that failure rather than treating extracted text as a substitute.

### 3. Delivery → Places → Agreement
Request 30 bags of cement to a chosen building site, then use Places search / My location only when consented. Verify location selection, arrival instructions and return to the same work. Route estimates, availability, Store results, delivery times and quotes must be grounded; otherwise show uncertainty. Confirm nothing moved to Money or execution prematurely.

### 4. Sensitive family arrangement
Start: “My uncle has passed away. We need to organise his funeral with family members in different places. Help us plan.” Observe the first three turns, location/date, people, permissions, document requests and whether unsolicited prices/Stores appear. Mark irrelevant, intrusive or callous suggestions as FAIL.

### 5. Corrections and disagreement
Start six-person meeting with undecided date/time. Propose a time; correct it. Then attach a meeting note with a conflicting time. Inspect the Agreement, open questions, correction retention, print/review path and whether confusion results in false readiness.

## Pass/fail on each journey (all six required)
- Entry is obvious within 10 seconds, without a tutorial.
- KS001 asks one relevant material question at a time, not two competing panels.
- Important source facts are accurate, traceable and clearly uncertain where needed.
- No person, authority, money status, payment, consent or Agreement readiness is invented.
- A correction is accepted without restarting and reflected in the current work.
- Person sees a useful Agreement or clear, appropriate next step. They can describe it in their own words.

## How to record
For every scenario record: tester (first-time or experienced); date; desktop/mobile; pass/fail for each of six criteria; exact problematic quote/step; a screenshot or screen recording where possible; severity (BLOCKER: money/consent/truth/error; MAJOR: can't continue; MINOR: cosmetic/friction); one sentence “What I expected / what happened”.

Do not treat an untested criterion as passed. If any criterion fails, the whole scenario is NOT YET PASSED. Real first-time testers must be observed rather than coached.

## Completion gate
Five complete scenario evidence records and at least two first-time testers, all critical truth/consent checks passing, no blockers, all major issues resolved or explicitly deferred with safety justification. Run source consistency test + typecheck + lint + production build + available final-convergence suite. Review deployment and API limitations. Declare **HUMAN CERTIFIED** only after human evidence and engineering checks are actually verified. No merge/deploy to production without explicit approval.
