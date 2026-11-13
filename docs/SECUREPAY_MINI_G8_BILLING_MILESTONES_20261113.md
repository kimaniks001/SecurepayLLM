# Mini — Master Gate 8 E8: reviewed work charge, proposed deposit and milestones

**Owner's master plan remains** Gate 7 Money safety → Gate 8 Agreement lifecycle → Gate 9 rails/callbacks → Gate 10 existing 20-person acceptance → Gate 11 controlled release. Gate 8 E8 is current engineering; it does not skip or replace those gates.

**Status:** Draft source on branch feat/mini-g8-verified-billing-milestones-20261113, stacked on Mini E7 #303. Companion API E7/E8 stacked through **API #446**. This is NOT compiled, tested, merged, staged, deployed, integrated with real media or approved for customer Money.

## What the same existing Mini tool now does

The frozen **My Agreements → Work evidence** onion-layer contains one further collapsed step, **Review charge, deposit and milestones**. This sub-step appears only after a real server-owned confirmed effective work quantity, under the existing first-party authenticated session and staging feature flag VITE_SECUREPAY_M8_EVIDENCE=enabled on isolated preview hosts. It does not add a home navigation item, overlay or new application design.

1. Server refreshes exact version/hash, immutable work report and authenticated reporter/beneficiary identity. Buttons are blocked until the current server state has been read; uncertain writes require a deliberate Recheck, not a silent retry.
2. Both original work parties may open a post-seal dispute with a reason. Proposing a new number requires a different positive hour/km quantity and existing linked evidence. The old confirmed quantity remains in immutable history and all historic reviewed charges are held.
3. Actual work parties can propose a specific nonpayable resolution, a different established participant independently ACCEPTS/REJECTS the exact proposal hash, and the original beneficiary can seal only after the API verifies unanimous acceptance and fresh Agreement version confirmation. Incomplete/rejected resolutions remain held.
4. Only the reporter can request a new bill REVIEW DRAFT. The API—not Mini—calculates the exact amount from canonical tariff plus original confirmed or independently resolved usage, applies cap and prevents stale/disputed sources. The beneficiary independently ACCEPTS/REJECTS the exact amount.
5. When the actual beneficiary accepts the bill, the reporter may propose a **planned deposit**, which can be zero, plus human evidence-bound milestones. Each plan must total the exact already agreed bill. Input is in KSh; the client converts at most two decimal places to exact integer minor units, and the API repeats all exact calculations with BigInteger. The reviewed bill principal cannot be edited in the plan.
6. The beneficiary independently ACCEPTS/REJECTS the exact deposit/milestone plan digest. Rejected revisions can be proposed anew, old rows are immutable. A reviewed plan reports depositCollected=false, fundsHeld=false, milestoneReleased=false.
7. Neither a recorded evidence item nor a bill/plan ACCEPT starts money collection or releases funds; actual bank/M-Pesa/PesaLink provider safety, callbacks and settlement rights remain Gate 9, strictly subject to later certification and relevant partner/regulatory safeguards.

## Human examples (illustrative only; NOT seeded into production)

- Tractor: agreed rate KSh 5,000/hour × four accepted hours = KSh 20,000 bill REVIEW DRAFT. After separate beneficiary acceptance: proposed deposit KSh 5,000, with two stage allocations of KSh 7,500 each and their own specific evidence requirements.
- Transport: agreed KSh 50/km for 50km plus fixed KSh 400 per actual verified ride = KSh 2,900 review-only bill. A second session has a separate service instance and must be independently confirmed; no duplicate fixed charge on one ride.

## Still on master Gate 8 before handing into Gate 7/9

- Make any **material** change to deposit/milestone financial conditions part of canonical Agreement amendment/new version/reconfirmation, not merely a detached review-only schedule.
- Complete human next-action notifications/outbox, objective odometer/GPS evidence confidence and post-resolution re-dispute/escalation.
- Correct all issues found by later FULL Java/Postgres/UI contract tests; do not assume a source-level DTO check certifies the code.
- Keep staged/SANDBOX data and dev notes out of final production builds. Do not enable the evidence feature against the current live SANDBOX backend.

**Nonnegotiable Money boundary:** BILL_ACCEPTED_NONPAYABLE and PLAN_ACCEPTED_NONPAYABLE are NOT invoices, Payment Ready authorizations, collected deposits, funding receipts or settlement permissions. A future Money path must check current Agreement, complete consent, actual money actor and regulated provider status again.
