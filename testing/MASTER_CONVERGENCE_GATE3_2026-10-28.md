# SecurePay — Master Convergence Gate 3
## KS001 intelligence, material questions and twelve Fair Trade Principles
**Date:** 28 October 2026  
**Decision:** **Source implementation and frontend certification harness built; provider-backed and Java E2E certification OPEN. NO-GO for production.**

## 1. Candidate lineage and source changes

This Gate 3 is **stacked on the single unified Gate 2 candidates**, not a separate second KS001 or Agreement engine:
- API baseline: `feature/master-convergence-gate2-api-20261028` at `3cea19966d55b80f1d8b3b1778db768b689f597f`. New branch `feature/master-convergence-gate3-api-20261028`.
- UI baseline: `feature/master-convergence-gate2-ui-20261028` at `9f61f7aa11c68605d44824c162c020873277bde1`. New branch `feature/master-convergence-gate3-ui-20261028`.

### Source-verified Fair Trade correction

In the existing pure projector `FairTradeExaminationProjector.java`, a named ITEM with **no recorded PAYMENT_CONDITION for sale/total** (including an indicative budget-only entry) could return without a useful material commercial-basis question. This was a **narrow source-level gap**, not an assertion about live KS001 provider output.

The projector now returns **NEEDS_CLARIFICATION** under principle 2 and asks whether the item is being **sold, gifted, or otherwise transferred**; if sold, it asks for the proposed **price and payer**. The rule:
- Never invents a sale, obligation, fee, amount or consent.
- Preserves **paid/voluntary SERVICE** precedence, and **DELIVERY** timing/handover precedence for an already specified goods delivery.
- Preserves conflicts as first priority and the existing server Formation question over advisory questions.
- Continues returning a version-bound, **partial advisory** across all twelve principle statuses. An assessed principle is not automatically a Fair Trade certificate.

Updated Java contract tests in `FairTradeExaminationProjectorTest.java` now require the missing question for item-without-price and budget-only goods, while preserving the existing counter-sale, courier, voluntary labour and paid-work tests. **These Java tests have been authored, not executed**: the private API runner remains unavailable.

### Client and orchestration continuity

No parallel provider, Trade Context, question service, Agreement engine, source ingestion service or Money executor was created. The existing Living Workspace already:
- Reads `PARTIAL_ADVISORY` only for the matching conversation + Trade Context version.
- Labels all 12 principles `NOT_ASSESSED`, `NEEDS_CLARIFICATION`, `MATERIAL_CONCERN`, `NOT_APPLICABLE` or `NO_MATERIAL_CONCERN_OBSERVED` as the canonical API specifies.
- Displays draft availability as **inspection, not acceptance, qualification or Money readiness**.
- Requires KS001's next material question inside the conversation; a right-side Check panel alone is insufficient for Gate 3.

## 2. Executable Gate 3 real-provider acceptance

`testing/master-convergence-gate3-ks001-live.mjs` runs three **independent fresh anonymous conversations** on a disposable **localhost-only** real API:

1. **New intention:** “I want to plan a trip to Nakuru.” KS001 must acknowledge the stated destination and ask a material next question in the **chat**. Follow-up travel information must update the SAME canonical Trade Context.
2. **Goods without a price:** four chairs are proposed but no sale price, buyer or gift basis is established. KS001 must ask material commercial questions and must not invent a payment. A later stated price of KES 2,000 each must be captured while the buyer remains unconfirmed.
3. **Community paid opportunity:** project head needs four workers to restore a rainwater tank but has not yet agreed pay, hours, safety or performance. KS001 must explore those terms; after an *offer* of KES 800/day for two days, it must **not** treat workers as having accepted or Money as funded.

For every scenario: create a fresh possession secret, read exact canonical Context/Formation/Fair Trade, require an actual question **in KS001's reply** both before and after a follow-up, enforce Context version advancement, exact twelve distinct principle states and `PARTIAL_ADVISORY`, reject forged all-positive findings, and refuse cross-conversation read permission.

The runner **refuses cloud/production hosts**, requires the explicit disposable ACK, and makes **no Agreement acceptance, invitation, payment or release call**.

### Developer command

Against the *actual exact* Gate 3 API SHA, in an authenticated isolated environment with Java 21, disposable PostgreSQL and a functioning OpenAI KS001 conversation provider:

```bash
# Backend, private SecurePayAPI checkout
git switch feature/master-convergence-gate3-api-20261028
git rev-parse HEAD
./gradlew :services:agreement:test :services:securepay-core:test
./gradlew :services:securepay-core:integrationTest
# Start same exact API locally with a disposable database;
# verify real model/provider identity from REDACTED logs, not from demo outputs.

# Frontend / acceptance client, matching isolated UI checkout
git switch feature/master-convergence-gate3-ui-20261028
git rev-parse HEAD
GATE3_DISPOSABLE_ACK=YES \
GATE3_API_URL=http://127.0.0.1:8080 \
GATE3_UI_SHA="$(git rev-parse HEAD)" \
GATE3_API_SHA="<exact checked-out API SHA>" \
node testing/master-convergence-gate3-ks001-live.mjs
```

A native local-API success is intentionally named `LIVE_API_PROTOCOL_PASS_PROVIDER_NOT_ATTESTED` until a reviewer independently confirms **which actual provider, model and credential environment** served the traffic. An injected synthetic adapter always reports `SYNTHETIC_PROTOCOL_PASS`.

### Independent evidence gate

`testing/master-convergence-gate3-certification.mjs` plus `testing/master-convergence-gate3-evidence.json` require **seven** reviewed source-bound domains: API Java/migrations; actual provider identity; three continuing conversations; useful material questions; 12 accurate versioned lenses; source lineage/consent/Money separation; signed-in Living Workspace including mobile.

The default evidence JSON is **NO-GO**. A reviewer must inspect real same-SHA GitHub CI runs, redacted model logs, privacy/role checks and visual evidence. A locally fabricated PASS or synthetic adapter result is **not** certification. This gate never authorises production.

## 3. Executed in isolated UI sandbox (source-level evidence)

- Gate 3 focused JS tests: **14/14 PASS** (8 protocol, 6 evidence and UI boundary tests).
- `npm run test:final-convergence`: **2,366/2,366 PASS**, zero failed.
- `npm run typecheck`: PASS.
- `npm run build`: PASS (normal Vite chunk advisory).
- `npm run lint`: exit 0 with 39 warnings and zero errors.
- The pre-existing responsive Living Workspace sample/browser tests were passed during Gate 2; **these are not re-labelled as authenticated Gate 3 browser certification**.

**API Java unit/integration test execution: NOT VERIFIED.** API GitHub Actions have reported `startup_failure` with zero jobs and the isolated UI sandbox cannot fetch the private API repository or run Java. This is an infrastructure/deployment qualification blocker, not a Java suite failure.

**Actual KS001 model/provider, paid opportunity Fair Trade and photographed-bill source reading: NOT EXECUTED ON REAL COMBINED API.** Do not claim these as green from synthetic tests.

## 4. Gate 3 exit criteria and Gate 4 boundary

Gate 3 is only certifiable after:
- All three real provider-backed scenarios and their follow-ups demonstrably pass **with meaningful conversational KS001 questions**, no empty/terminal reply and source-backed facts.
- All twelve applicable Fair Trade principles are truthfully stated for exact current version; unassessed != approved; another person's consent and Money readiness remain distinct.
- The backend Java/tests/database run on **the exact combined API source** and signed-in UI at 1440/390/320px is independently verified.
- The evidence evaluator reaches `READY_FOR_MANUAL_GATE4_REVIEW` after independently validated real runs.

**Gate 2's separate six-real-journey acceptance remains outstanding**; a Gate 3 synthetic PASS cannot replace it.

**Gate 3 status: implementation prepared, isolated UI suite green, real API/provider certification NO-GO. Original `main`, production, rail enablement and financial execution unchanged.**
