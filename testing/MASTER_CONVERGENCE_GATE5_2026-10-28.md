# SecurePay — Master Convergence Gate 5
## Full integration, certification and release handover
**28 October 2026 — Build ready for source-level review; end-to-end release certification NO-GO.**

### 1. Exact isolated candidate pair

- UI parent: Gate 4 UI PR #198, 15b0e6ebb88621483275ef4cf16b2c3ac12fe355.
- API parent: Gate 4 API PR #375, ee87f553b88fc2e66812ff0c3f45b619b5b90bad.
- Gate 5 UI branch: feature/master-convergence-gate5-ui-20261028.
- Gate 5 API branch: feature/master-convergence-gate5-api-20261028.
- ALWAYS obtain the current full Git commit IDs before running a test: later test/workflow/report commits change the SHAs.
- These branches remain separate from main and production. No Gate 5 payment, activation collection, outbound bank transfer, settlement or release has been authorised or executed.

### 2. One qualification authority, not a new Agreement/Money engine

The Gate 5 evaluator imports all existing approval requirements and does not reimplement any live product:
- Gate 2: SIX human journeys, actual separate identities and canonical Agreements.
- Gate 3: SEVEN KS001 material-intelligence, real-provider and twelve-principle evidence authorities.
- Gate 4: EIGHT identity, privacy, activation, fees, reserve and Money safeguards.
- True North Gate 7: TWELVE Community/Circle/Agreement/evidence/public-outcome certification authorities.
- Gate 5: EIGHT final UI, backend, staging, privacy, migrations, monitoring, commercial-owner and independent-review authorities.

That is 41 explicitly named evidence slots, some overlapping. It is NOT 41 independent test engines or 41 passing demonstrations.

Single evaluator: testing/master-convergence-gate5-certification.mjs.
Empty, purposefully NO-GO register: testing/master-convergence-gate5-evidence.json.
New evaluator unit suite: tests/master-convergence-gate5-certification.test.mjs.

Every cited test must reference the SAME exact Gate 5 API/UI source pair, real independent identities, actual run logs, named reviewer, and Money/production disabled. A green self-asserted JSON field or linked GitHub URL is NOT automatic proof; inspect the actual CI artifacts, source commits and identity-scoped response data. A fully reviewed gate may return READY_FOR_OWNER_GATE6_DECISION, which DOES NOT approve a deployment.

### 3. Actual CI build implementation

API adds .github/workflows/master-convergence-gate5-api.yml:
- Reuses scripts/run_final_convergence_certification.sh rather than creating a second backend harness.
- Runs static safety checks, Java 21 Gradle compile, unit/doctrine, disposable PostgreSQL/Redis, Flyway migrations, service boot, Testcontainers integration and golden corpus integrity.
- Executes FairTradeExaminationProjectorTest from Gate 3 and ConvergenceGate4ActivationEconomicsTest from Gate 4 on the same API commit.
- Preserves JUnit/migration/test phase logs as artifacts.
- Runs with local example configuration, no production provider credentials and financial rails disabled. Passing this CI would NOT certify real OpenAI provider or real bank payments.

UI adds .github/workflows/master-convergence-gate5-ui.yml:
- Runs all frontend tests, TypeScript, build, lint and fail-closed release-evidence unit tests.
- Keeps final human release-evidence evaluation in a separate manual job which returns NO_GO if real evidence is missing.
- No production credentials and no money operation.

Prior API Actions have ended in startup_failure before Java jobs start. This is a runner/CI evidence blocker, not a Java pass/failure. Do not remove tests or disable security to hide it. Developer with authorised private checkout can run the exact API harness locally if GitHub runners remain unavailable; independent JUnit/Flyway artifacts and a stated CI-status limitation are still required.

### 4. Six connected real journeys to demonstrate on ONE test deployment

1. **Nakuru first intention:** fresh visitor says they want to plan a trip. KS001 acknowledges and asks the next material question IN CHAT, retains the answer through follow-up/sign-in/retry; no false correction error, terminal silence or hallucinated plan.
2. **Photo of bill to a funded-ready Agreement:** disposable image/PDF upload progress, explicit Add to KS001, source-backed seller/items/currency/price or honest uncertainty; version-bound twelve-principle analysis; intended seller consent, draft/Agreement/recipient distinction; SecureLink can be presented to another actor without pretending third-party funding or executing payment. Upload receipt never means reading succeeded.
3. **Community 12→4:** organiser and twelve independent member accounts, twelve interests, deliberate four selections, four distinct canonical Agreement invitations and each recipient's own join/confirmation, eight unselected with no contract authority. Worker pay, work/safety evidence and budget-versus-actual Money must be understood.
4. **Circle coordination and evidence:** only authorised Circle participants can coordinate; a Circle status is NOT Agreement acceptance. Separate version-bound obligations, evidence upload, explicit beneficiary review and completion must be tested including cross-user denial. No auto-release.
5. **Project outcome to Community Live:** author chooses a project, reviews public preview, consents, publishes, retries idempotently; public report excludes private contacts, KS, Agreement money, participant evidence, EXIF/GPS. Costs remain member-reported, not audited.
6. **Identity activation, pricing and Money:** fresh disposable KS identity/MFA; For You and Business account isolation; versioned Activation Agreement consent; three separate accounting buckets, read-only fee quotes at all boundaries, above-ceiling refusal, PaymentReady vs movement vs release; no real funds move.

Existing loopback-only runners, to run with non-sensitive disposable fixtures and appropriate exact commit variables:
- testing/master-convergence-gate2-ks001-live.mjs
- testing/master-convergence-gate3-ks001-live.mjs
- testing/master-convergence-gate4-authority-live.mjs
- testing/master-convergence-gate2-fee-probe.mjs
- testing/gate3-12-to-4-live.mjs
These only cover PARTS of the six journeys; genuine browser, consent and backend logs still need additional manual and automated full-stack tests.

### 5. Operational and owner release conditions

- Use isolated PostgreSQL, protected logs, separate test identities and model/source-reader provider configuration; never production/customer secrets.
- Verify backend Money and outbound rail controls disabled, not merely absent from frontend.
- Reconcile bank callbacks, idempotency and duplicate-attempt behaviour in a non-monetary sandbox ledger.
- Run signed-in, identity-swapping browser tests at 1440px, 390px and 320px. Prove the Gate 4 stale-account activation correction under a delayed response.
- Verify Community media access, private Circle scope, review evidence, retention, PDF safety, and photo metadata removal.
- Maintain a deployment cutover and rollback plan with last known-good API/UI commits, database compatibility, health checks and monitored revert procedure. No invented recovery-time numbers.
- Monitor KS001 provider errors and halted conversations, source-reader failures, financial intent anomalies, idempotency conflicts, security denials and failed notifications.
- Confirm actual public pricing WITH OWNER before release. Current API version phase31-v1.1-phase14-progressive defines For You initial funding KES 400, Business KES 500, each split into first subscription, KES 100 returned verification and KES 200 customer-owned Review Reserve; capped progressive platform fees replace historical simplified flat 1% wording. Do not silently change the owner-authorised commercial promise or claim the old model is still implemented.

### 6. Exact developer command sequence

In an authorised private API checkout:
    git switch feature/master-convergence-gate5-api-20261028
    git rev-parse HEAD
    java -version
    bash scripts/run_final_convergence_certification.sh
    ./gradlew :services:agreement:test --no-daemon --tests 'ke.securepay.agreement.agent.qualification.FairTradeExaminationProjectorTest'
    ./gradlew :services:securepay-core:test --no-daemon --tests 'ke.securepay.core.subscription.activation.service.ConvergenceGate4ActivationEconomicsTest'

In the matching UI checkout:
    git switch feature/master-convergence-gate5-ui-20261028
    git rev-parse HEAD
    npm ci
    npm run typecheck
    npm run test:final-convergence
    npm run lint
    npm run build
    node testing/master-convergence-gate5-certification.mjs --evidence testing/master-convergence-gate5-evidence.json --ui-sha "$(git rev-parse HEAD)" --api-sha "<exact real Gate 5 API commit SHA>"

The empty register MUST return NO_GO. To replace NO_GO with a reviewable decision, supply and independently inspect complete Gate 2/3/4/True North Gate 7 receipts, complete the eight Gate 5 operations checks, then rerun at exact new SHAs. Do not mark synthetic simulations live or reuse older heads after a source fix.

### 7. Final status

**Gate 5 source/test implementation and isolated frontend suite complete; full integrated backend/model/security/financial certification remains NO-GO.** Its blocked dependencies are source CI startup failures, actual provider-backed KS001 and media reading, independent 12-to-4 participant tests, two-account privacy/activation tests, real signed-in mobile, owner-approved fee doctrine, staging/rollback and human review.

Gate 6 remains a separate future owner decision. No main merge or production/financial execution is allowed solely from this document.
