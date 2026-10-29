# SECUREPAY — GATE 6: OWNER RELEASE DECISION & TESTER CUTOVER
**29 October 2026 | Controlled tester candidate | Default: NO_GO**

## Candidate references, not a claimed deployed pair
- Gate 5 UI PR #199: `fa195d4eefb593c96602ec0f5264f08957968059`.
- Gate 5 API PR #376: `45b616786a357834a7ef69d2cf394e3a98f4382a`.
- Gate 6 API development: `release/gate6-owner-commercial-and-tester-cert-20261029`, including owner tariff source correction and acceptance tests, all **not yet Java-certified**.
- Exact Gate 6 heads will change as fixes are added. Every human acceptance receipt, provider session, database test and preview must identify both **final** SHAs.
- The current C6 live candidate and its preservation patches must be compared against Paul's `manifest.json`. No manifest has been independently inspected as part of this branch. Never drop production auth, scrolling, JSON intake, source retry, or owner-approved Living Workspace changes.

## Gate 6 is a release decision, not a seventh product redesign
Keep one Living Workspace, one canonical KS001/orchestration and Agreement engine, one pricing/identity/Money authority, Community/Trust Project in the same product, and purpose-scoped media. Do not duplicate fees, fabricate model answers, waive required consent, or infer banking approval.

### Owner approved commercial facts
- KES 20 for contracts at/below KES 20,000; **plus 1% only of the excess** for any higher-value contract in the supported risk band.
- Gate 5 source is wrong for values such as KES 500,000, KES 1,000,000 and KES 5,000,000 because it uses old caps. Gate 6 API source now corrects the fee calculation and backend quote projection, and known dependent Java and frontend probe tests are updated; CI and live API acceptance must still prove it.
- The supported principal-value ceiling above KES 5m is a separate safety limit; Gate 6 preserves refusal above it until a further owner risk decision.
- Personal KES 100/month, Business KES 200/month, activation funding KES 400/500 (first month + returned KES 100 verification + customer-owned KES 200 reserve), welfare KES 10 and general KES 20: don't relabel the entire funding total as earned revenue.
- Keep provider rail charges, applicable taxes, customer principal, Review Reserves, and qualifying Plug/Builder rewards in separate financial classifications. The tax/legal/CBK partner matrix remains a **live-money** gate, not a reason to misrepresent simulation as a transfer.

## Six actual user journeys — all on the same release pair
1. Fresh anonymous visitor: “i want to plan for a trip to Nakuru” → genuine KS001 follow-up → remembered context through correction/retry/sign-in. No terminal blank answer.
2. Real disposable photo or PDF of a bill → visible upload progress → explicit Add to KS001 → **real source-provider** extraction with uncertainties → material Fair Trade questioning → draft/Agreement and versioned consent → third-party SecureLink **simulation**. No claim of actual payment.
3. Twelve separate interested Community members → organiser independently selects four → four recipient-owned, confirmed canonical Agreement invitations → eight unselected have no Agreement authority.
4. Circle participant-only coordination → role/work evidence → beneficiary-controlled acceptance/completion; private evidence stays private and no Circle button equates to financial release.
5. Author-approved Community outcome report → preview → deliberate consent → publication + idempotent retry; no private participant data, evidence or finance disclosure.
6. Fresh KS issuances / activation Agreements with two identities → cross-account isolation and stale-response denial → read-only fee quotes at 20,000 / 20,001 / 100,000 / 500,000 / 1m / 5m → backend financial rails disabled.

## Release certification evidence
- Gate 5 evaluator `testing/master-convergence-gate5-certification.mjs` is still the single existing aggregation authority. **Do not build a second certification engine** or manufacture pass JSON.
- Provide real, independent evidence for Gate 2's six journeys, Gate 3's seven KS001/Fair Trade authorities, Gate 4's eight identity/Money authorities, True North Gate 7's twelve Community authorities and Gate 5's eight operations checks.
- Run typecheck, full frontend suite, lint, build; Java 21/Gradle and PostgreSQL migration, boot, unit/doctrine/integration against exact API SHA; browser tests on desktop and signed-in 390/320px mobile.
- Source status as inspected: API Actions `40685733965` **startup_failure (zero jobs)**; UI `40685623822` and `40685623942` **failed**. Paul's independent report lists 6,860 unit and 837 doctrine checks, but PostgreSQL integration and real-provider tests blocked. These are not all-clear CI certificates.
- Gate 5 Vercel preview was READY; Vercel SSO protection for previews is enabled. Independently verify external testers can actually access the isolated candidate, without weakening customer/production access.
- All tests use noncustomer test accounts and safely approved provider credentials, not reused production secrets.
- Review one list of defects, with P0/P1 stopship status and exact independent reviewer; document rollback, monitoring, migrations, data retention, account-recovery and privacy decisions.

## Merge and production-cutover rules
1. **Default NO_GO** while any mandatory release condition or owner-approved tariff correction is outstanding. Open reviewable Gate 6 source branches/PRs, not production.
2. When certified, present final exact API/UI SHA pair and receipts to the owner. An owner's request to *start Gate 6* is not blanket permission to bypass blocked provider/financial tests.
3. After explicit owner release approval, use one consolidated PR per repo targeting `main`, not individually merging predecessor stacks; compare old C6 preservation patches first.
4. Deploy staged API and UI together with compatible database migrations, isolated test data, disabled real-money/settlement/withdrawal/rail actions, and audited exact commit identities.
5. Confirm KS001 first turn, bill/photo, source continuation, authenticated split-account privacy, Community/Circle permissioning, SecureLink read-only preview, mobile scrolling and health checks **after** cutover.
6. Invite authorised testers to the verified accessible URL only after smoke tests. Monitor and roll back if any P0/P1 appears. Keep regulated money off until separate legal/bank/accounting authorisation.

## Current Gate 6 decision
**NOT RELEASED / NOT MERGED / NO_GO.** The final release package is scoped, and a tariff blocker is reproducibly defined, but the exact new release pair has not passed full certification. Report red gates plainly; never turn synthetic/test descriptions into claims of working provider-backed production.
