# Gate 5C — First-Time-User Experience Certification
**21 October 2026 — certification tooling; human sessions NOT yet conducted**

## Candidate and dependencies
This Gate 5C branch inherits draft Gate 5B PR #160 (which inherited Gate 4D PR #157). It tests the **actual three-column Living Workspace**, not the separate #159 concept prototype. Exact tested SHA and preview URL must be recorded at execution; never silently use the production site. Gate 3/4 protected backend staging and safe test identities remain separate, explicit prerequisites for connected KS001 observations.

## Recruitment and procedure
Recruit **five or more genuinely first-time people**, including mobile and desktop, preferably with different familiarity levels. Do not teach the navigation, suggest answers, or explain the four spaces before they act. Participants use anonymous session IDs and consenting, access-controlled evidence links. Never record passwords, tokens, real financial data, precise addresses, or unnecessary personally identifying details. Use synthetic data only. For each journey: read one neutral goal, allow independent interaction, capture observed action and confusion, mark pass/fail/blocked, and attach timestamped evidence. Facilitator can intervene only for safety; intervention makes the journey fail and session coached (not qualifying).

## Eight mandatory journeys
1. **first-impression** — from the actual first visit, explain in their own words what SecurePay enables; locate one natural next action without facilitator advice.
2. **work-400-delivery** — describe 'I want to pay KES 400 for delivery'; KS001 must elicit what exactly is being delivered, relevant parties, place, timing and other material facts before asserting sufficient understanding. No invented 12/12 fair-trade clearance; the canonical evaluator remains authoritative.
3. **vision-private** — start a prospective goal; articulate that Vision is not an accepted Agreement and that transfer to My Work is deliberate.
4. **circle-chama** — explore eight friends contributing KES 2,000 monthly; distinguish a Circle discussion/support reaction from formal decision, membership or Agreement acceptance.
5. **community-boundary** — find a relevant public opportunity or help; understand that Circle-only material cannot be published to LIVE without authority.
6. **money-boundary** — identify My Money, Borrow, Invest and Protect; understand offers are possibilities, not approved funds or payment; Money must follow Agreement readiness.
7. **securepay-check** — distinguish draft inspection, material sufficiency, parties' acceptance and money authorisation; no greyed action may suggest it completed.
8. **return-journey** — navigate away and return to current work without losing draft context or accidentally sending/accepting/authorising anything.

## Evidence schema
Create a PRIVATE JSON file (do not commit participant evidence) matching:
```json
{
  "candidate": {"repo":"kimaniks001/SecurepayLLM","sha":"<exact commit>","previewUrl":"<verified isolated preview URL>"},
  "environment": {"isolated":true,"noRealMoney":true,"noProductionWrites":true},
  "sessions": [{
    "id":"anonymous-01","priorSecurePayExperience":false,"coached":false,
    "device":"mobile Android","startedAt":"2026-10-21T12:00:00+03:00","evidenceRef":"private://controlled/session-01",
    "journeys":[{"id":"first-impression","result":"pass","observation":"What the person actually did and said","evidenceRef":"private://controlled/session-01/first-impression","defects":[]}]
  }]
}
```
Add exactly one journey entry for each of the eight IDs, for every participant. Other participants require distinct IDs and evidence. Defects have `code` and `description` fields. Critical codes: `privacy-leak`, `money-misrepresentation`, `false-acceptance`, `unauthorized-action`, `lost-work`, `inaccessible-critical-action`.

## Execution
```bash
node --test tests/gate5c-certification.test.mjs
node scripts/gate5c-certify.mjs /private/path/gate5c-human-sessions.json
```
This runner validates evidence completeness and blocks false green certification. No mocks count as human evidence. CI unit tests prove the **evaluator**, not the customer journey. Eligibility for owner review requires five uncoached, first-time participants; both mobile and desktop; all eight journeys per participant; observations and private evidence links; isolated preview; zero critical blockers; **all journeys passing**. A failure is a repair task, not a silent waiver. After corrections retest against the new exact SHA. Human owner certification is a separate recorded decision and requires staging safety assurance for connected exercises.

## Boundaries
No layout rebuild; no new controllers or hardcoded Fair Trade evaluation; no real users or payments; no production or staging deployment, PR merge or settings change. Gate 5C is NOT a substitute for Gate 4C semantic/model and API certification. Until real sessions are performed, status is **NOT CERTIFIED**.
