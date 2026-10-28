# SecurePay Master Convergence — Gate 2
## Six human journeys and real API certification

**28 October 2026** · **Current decision: NOT YET END-TO-END CERTIFIED (NO-GO for production)**

The baseline is the **one unified Gate 1 candidate**:
- UI PR **#195** at initial Gate 2 base `e7d4c57f20e6e818d86bce66e4b5daa88e5ee020`; Gate 2 UI branch `feature/master-convergence-gate2-ui-20261028` contains the new testing harness.
- API PR **#373**, `3cea19966d55b80f1d8b3b1778db768b689f597f`; Gate 2 API branch `feature/master-convergence-gate2-api-20261028` is reserved for issues that real tests reveal.
- `main` and production are untouched; no financial actions authorised.
- Each acceptance record must use the exact **Gate 2 candidate SHA**, not an old Gate 1 or Day 3 successful test reference.

## What Gate 2 tests exist

**First two journeys:** `testing/master-convergence-gate2-ks001-live.mjs`

- Refuses HTTPS, cloud, staging and production hosts; only a disposable loopback HTTP API is accepted. Fails closed unless explicitly armed with `GATE2_DISPOSABLE_ACK=YES`.
- Creates two **fresh anonymous conversations**, handles the one-time possession token only in headers, sends the real user intent **“i want to plan for a trip to Nakuru”** and rejects the old “couldn’t save that correction” response.
- Requires an actual meaningful KS001 next question and the matching server Formation/Context; then takes a **different** conversation and explicitly uploads a non-sensitive test bill image.
- Polls the real source receipt until genuinely READY/PARTIAL or FAILED; FAILED is not misrepresented as extraction success. Checks the expected disposable seller and total from **source-backed canonical candidate facts**.
- Reads the same conversation's current version-bound **twelve-principle PARTIAL_ADVISORY**. It never treats an upload, Fair Trade reading or draft as a completed Agreement, acceptance or funded transfer.
- **This script DOES NOT create a SecureLink, invite a seller or authorise funding.** Those real steps remain acceptance requirements below.
- `tests/master-convergence-gate2-live-protocol.test.mjs` verifies the script against a **synthetic adapter** and rejects production addresses, the old correction response, foreign-source receipt and failed reading. **Do not call synthetic PASS a live API pass.**

**All six journeys:** `testing/master-convergence-gate2-evidence.mjs` and `testing/master-convergence-gate2-evidence.json`

- Six exact-SHA check groups, each with six mandatory assertions, named human reviewer, actual matching API/UI CI run links, and no execution of money.
- The default evidence register is intentionally **NO-GO**. `tests/master-convergence-gate2-six-journeys.test.mjs` verifies no synthetic, unsigned, wrong-commit or unsafe result can satisfy it.
- Gate 3 already contains a loopback-only **12 applicants → four invitations/Joins and confirmations** harness at `testing/gate3-12-to-4-live.mjs`; it is code plus synthetic tests, not yet a genuine 13-identity pass.

## Exactly how Paul should run Gate 2

### 0. Build an isolated and authentic environment

Use **disposable PostgreSQL, actual combined SecurePayAPI SHA, matching SecurepayLLM SHA, a configured KS001 conversational provider and a separately configured source-reading provider**, non-sensitive disposable documents and 13 independently authenticated identities. Never use customer credentials or production callback/payment secrets. Keep Money collection and release execution disabled in all relevant services, not merely hidden in the UI. Verify the API can start and Flyway migrations apply before any user-journey testing.

Backend verification from the API source tree:

```bash
./gradlew :services:agreement:test :services:securepay-core:test
./gradlew :services:securepay-core:integrationTest
```

Use the existing CI database setup and test tasks if task naming differs; preserve actual job links, JUnit artifacts, failure logs and exact SHAs. Recent GitHub API workflow runs have returned **startup_failure without usable jobs**. Those are **not passing Java tests**. Restore runner execution or provide independently reviewable isolated execution evidence before certification.

### 1. New visitor intending to plan a trip

Against a **real localhost isolated API** run with an honest provider response:

```bash
GATE2_DISPOSABLE_ACK=YES \
GATE2_FIXTURE=/safe/disposable-gate2-fixture.json \
node testing/master-convergence-gate2-ks001-live.mjs
```

The fixture is documented in the script header. It must contain an actual **non-sensitive JPEG/PNG bill**, real disposable expected merchant and amount, and the **exact candidate SHAs**. It is never committed.

Prove the first intention is new work, not a correction. Verify KS001 asks for a material trip detail, preserves the conversation across sign-in where authorised, and returns helpful next steps. Retry a timed-out turn with the identical clientTurnId and confirm no duplicate mutations. Photograph transport must not be activated accidentally from this intention.

### 2. Bill photo → fair Agreement → optionally funded SecureLink

Use the actual bill image. Require receipt/reading status; source-grounded seller, items, amount, currency and uncertainty; explicit human confirmation of the seller and missing delivery/payment terms; twelve-principle evidence/concern handling (not twelve false green ticks).

The provided live script verifies only up through source-backed reading + current-version Fair Trade partial advisory. **Continue manually / in a separate authenticated test** through the canonical Agreement handoff, recipient invitation and individual consent. Test a third party opening the SecureLink with no incidental access to private media. Funding must be demonstrated only with authorised read-only Money state and **no transfer**. If seller identity, price, delivery or payment recipient is unknown, readiness must remain blocked.

### 3. Organiser posts a paid opportunity, twelve express interest, four selected

Use one genuine Community OPPORTUNITY and thirteen disposable authenticated actors. Execute `GATE3_DISPOSABLE_ACK=YES GATE3_FIXTURE_PATH=/safe/gate3.json node testing/gate3-12-to-4-live.mjs` against the same **loopback API**. Verify all eight unselected people have no Agreement invitation or Join authority; selected four independently join and confirm the canonical version. Do not claim four independently funded engagements merely because four participants joined one Agreement. Check hours, actual rate and per-worker obligations with KS001.

### 4. Circle coordinates, Agreement executes and evidence is reviewed

Test one actual Circle with an active member, another member and a non-member. Post a coordination checkpoint, reply DONE, and confirm it changes **no Agreement state**. Each member accesses only their own Agreement; other users' obligations and evidence remain private. Submit a text/photo/PDF evidence item via the canonical verified receipt, then separately submit it, separately have beneficiary review it, and evaluate exact-version completion conditions. A submitted/approved photo does not itself release funds.

### 5. A real outcome returns to Community

The organiser chooses a real eligible public Community Project, records what happened, labels estimated versus member-reported incurred costs, reviews the preview and explicitly consents. Publish through the existing Community contribution authority and inspect Community Live under a different authorised identity. Verify no private Agreement, KS Number, payment instrument, participant identity or image metadata becomes public. Use the same idempotency key on an uncertain retry. Member-entered totals are **not certified audited costs**.

### 6. KS Number, activation, fees and financial protection

Create a disposable identity, confirm its KS Number, and read the **backend-authored** activation promise, fee quotes and funding-component statuses. The combined API source currently declares `CommercialPricingConstants.PRICING_VERSION = phase31-v1.1-phase14-progressive`; the backend, not the frontend, must calculate and quote the actual fee.

**Verify these current code-defined components in real read-only API responses (source presence is not an executed quote):**

| Term | Source-defined candidate rule |
|---|---|
| For You initial funding | **KES 400** = KES 100 first monthly subscription + KES 100 returned settlement-verification transfer + KES 200 customer-owned Review Reserve |
| Business initial funding | **KES 500** = KES 200 first monthly subscription + KES 100 returned settlement-verification transfer + KES 200 customer-owned Review Reserve |
| Standalone activation fee | **None**; first subscription, returned verification and retained customer reserve are distinct accounting buckets |
| Continuing subscriptions | KES 100/month For You; KES 200/month Business |
| SecureLink up to KES 20,000 | KES 20 platform fee |
| Above KES 20,000 to KES 1,000,000 | KES 20 + 1% **of the excess over KES 20,000**, capped at KES 2,000 (cap reached at KES 218,000) |
| Above KES 1,000,000 to KES 5,000,000 | KES 2,000 + 0.2% **of the excess over KES 1,000,000**, capped at KES 10,000 |
| Above KES 5,000,000 | No locked formula; API must refuse to invent a fee |
| General contribution | KES 20 on successful collection; special welfare contribution KES 10 |
| Dispute | KES 100 (a charge distinct from the customer-owned KES 200 Review Reserve) |

**Source:** `services/commercial-rules/src/main/java/ke/securepay/commercial/policy/{CommercialPricingConstants,KeyContractFeePolicy,GroupContributionFeePolicy}.java` and `services/securepay-core/src/main/java/ke/securepay/core/subscription/activation/service/ActivationPromiseContent.java` at the exact combined API SHA. The older blanket wording “KES 500 activation = KES 400 dispute + KES 100 validation” and “1% of the full Secure Contract” is **not what the combined API implements** and must not be used as Gate 2 acceptance criteria.

Use the existing server `GET /api/v1/pricing/platform-fee?qualifyingAmountMinor=...` for read-only platform-fee examples, and read actual activation/subscription funding status through authenticated subscription endpoints. Test prices at KES 20,000, 20,001, 100,000, 218,000, 1,000,000, 5,000,000 and above 5,000,000 with server response and rounding evidence. Use only disposable identities and read-only pricing operations; do not fund activation, collect contributions or release money in Gate 2. PaymentReady, transfer movement, release request and completed settlement must remain distinct.

## Local reviewer commands

```bash
npm ci
npm run typecheck
npm run test:final-convergence
npm run lint
npm run build

node testing/master-convergence-gate2-evidence.mjs \
  --evidence testing/master-convergence-gate2-evidence.json \
  --ui-sha "<exact Gate 2 UI SHA>" \
  --api-sha "<exact Gate 2 API SHA>"
```

Today the final evaluator should return **NO_GO** with exit status 1, because **no six-journey real API receipts have yet been recorded**. This is correct.

## Evidence reviewed so far

- On Gate 2 UI testing branch: focused synthetic protocol/acceptance tests passed; exact final count and SHA are recorded in PR #196. Synthetic tests do not provide real API evidence.
- Full unified frontend suite, TypeScript, Vite build and lint are to be recorded against the **exact Gate 2 commit** in the PR description; do not copy an old branch result.
- Prior unified Gate 1 candidate had 2,335 passing frontend tests; results do not establish authenticated backend execution.
- Combined backend at Gate 1 commit `3cea1996` still needs working Java CI, database migrations and provider-authenticated tests. A mergeable PR and READY UI preview do not prove it starts.

## Exit decision

**Gate 2 can be marked COMPLETE only when all six journeys run against one exact real isolated API/UI pair, with independent identity/privacy/consent assertions and a verified full backend test suite.**

Until then: **test infrastructure and frontend qualification are progressing; real journey certification remains NO-GO.** Keep Gate 2 code in drafts, production unchanged and financial execution disabled.
