# SecurePay Mini — Continuing Trader Cohort: Operation & Evidence

**2026-11-09 | Phase 0 | Nonproduction QA fixture / future research protocol**

This is the permanent, version-controlled **test population**, not an application feature, real KS identity store, merchant database, production seeding mechanism or a set of hardcoded KS001 model responses.

## The living cohort

- `tests/fixtures/securepay-mini/kenyan-trader-cohort.v1.json`: 20 stable **fictional** trader/buyer/administrator identities (`TR-001`–`TR-020`), their business conditions, needs at first use, repeat use and later growth, and the 20 scenario families they encounter (`F01`–`F10`, `B11`–`B20`). Ten safety invariants (`S01`–`S10`) cut across them.
- `tests/fixtures/securepay-mini/cohort-runlog.v1.json`: **initially empty**, append-only record of actual later evidence, never retrospective or guessed test success.
- `tests/securepay-mini-trader-cohort.test.mjs`: fast structural checks for stable references, coverage, future checkpoints and lack of personal financial data.
- `scripts/securepay-mini-cohort-report.mjs`: one release-by-release scorecard for all stable traders. Running it does **not** execute an end-to-end trade.
- `docs/SECUREPAY_MINI_KENYAN_MARKET_TEST_PACK_V1_20261109.md`: human-readable situation, surprise and required safety outcome.

Run only the cheap fixture checks:

```sh
node --test tests/securepay-mini-trader-cohort.test.mjs
node scripts/securepay-mini-cohort-report.mjs
```

A green fixture validation proves that the permanent cohort is *well formed*, **not** that the live customer journey passed. Live test cases must invoke the real staging UI and matching API when those paths are ready, and record separately scoped evidence.

## Why we keep the same traders

For every actor, test the real job at three checkpoints:

| Checkpoint | Example evolution | What to measure |
|---|---|---|
| `first_use` | Small kiosk merchant handles first counter sale | Could they begin independently? Did they understand funding vs release? |
| `repeat_use` | Same merchant handles many simultaneous sales | Queue errors, time per transaction, false notifications, support requests |
| `business_evolution` | Same merchant now has an assistant and tracks supplies | Role permissions, invoices, stock, merchant cost, correct daily reconciliation |

Keep the actor ID fixed. Change the job, product, wording, buyer, method and constraints in each test; never write special logic for that actor. Record each observation with the source branch/commit/deployment, trade scenario and the stage. Do not overwrite the earlier observation just because the experience improves.

## Recording future outcomes

An example **shape only**, not a real observation:

```json
{
  "runId": "example-unique-id",
  "actorId": "TR-002",
  "scenarioId": "F04",
  "checkpoint": "repeat_use",
  "observedAt": "YYYY-MM-DDTHH:MM:SSZ",
  "releaseRef": "exact-git-sha-or-reviewed-build",
  "environment": "STAGING",
  "outcome": "NOT_TESTED",
  "evidenceRef": "non-sensitive-evidence-location-or-approved-study-reference",
  "metrics": {
    "taskCompletedWithoutCoaching": null,
    "timeToUsefulActionSeconds": null,
    "requiredPrompts": null,
    "errorRecoverySucceeded": null,
    "merchantWantsToReuse": null
  },
  "finding": "A factual, non-sensitive statement about observed behaviour, if any"
}
```

Allowed outcomes: `PASS`, `FAIL`, `BLOCKED`, `NOT_TESTED`, `DESIGN_GAP`. Do not mark an actor PASS merely because a React component rendered or a unit test passed; financial and human claims require the appropriate real evidence. A staging sandbox pass cannot certify an enabled bank rail.

## Owner-led human testing before public pilot

1. Use fictional trader records to create realistic tasks, changing one or two circumstances each run. The assistant/test harness can play opposing roles or produce sample utterances, but those runs count as **synthetic behaviour tests**, not real people successfully using Mini.
2. The owner independently uses the **actual staged Mini** on their own device (preferably mobile). Give the owner a job and trade context, not a mandated sequence of clicks. Observe what the owner naturally tries and where the design causes confusion. Owner experience is a genuine human test, but it is one tester, not evidence of accessibility for all ages or abilities.
3. Record each result with the exact frontend and API build, stage, method, evidence and owner-observed problem. When reviewing with ChatGPT, document only the defect/observations; do not claim that ChatGPT operated the owner's device unless verified.
4. Revisit the **same stable fictional trader** at first-use, repeated-use and growing-business stages across releases; compare outcomes while varying products and wordings. Record changed behaviour, error recovery and financial correctness independently.
5. Keep financial flows in sandbox with explicitly simulated provider results, never actual customer money. A simulated funded status must always say it is simulated. Actual production rails require the independent partner, regulatory and security gates.
6. After owner review, recruit consenting real participants to measure accessibility and wider usefulness. Lack of field participants should not block the first owner-facing UI prototype, but must block any claim that a broad segment—including older adults—is validated.

## How to use real traders after production

A real merchant must **not** be represented by turning `TR-002` into their actual KS Number or adding their real name, phone, location, customer conversations, payment IDs or transactions to this GitHub fixture. Instead:

1. Invite volunteers with explicit research consent and a clear withdrawal/retention policy. Ordinary customer use does not imply consent to an ongoing study.
2. Store real person-to-pseudonym mappings only in an access-controlled research system, outside GitHub. A participant's privately assigned pseudonym may be mapped to relevant **fictional scenario families** for analysis, not made equal to a fictional person.
3. Collect the minimum necessary observations; prefer aggregated outcomes, explicit user feedback and error classes, not raw financial content or chat transcripts.
4. Compare first use, repeat use and changing business needs over consenting observation periods. Analyse separately by business size, digital confidence, language/accessibility and trade type where the cohort supports meaningful privacy-safe comparisons.
5. Publish only aggregate/release-level findings. Clearly distinguish research, staging automation and real production outcomes; never conflate them.
6. Honour withdrawal, retention limits, legal obligations and appropriate access before using any real-world signals.

The experiment should tell us whether everyday Mini becomes naturally valuable as the same trader's business grows, while protecting participants' financial and personal privacy.

## Safe evolution rules

- **Never repurpose** an established actor ID, scenario ID or historic run ID.
- Corrections to wording may revise fixtures; substantive changes to actor context, behaviour, test outcome or critical safety rule require a documented versioned diff and reviewer note.
- New trading behaviour → add a new scenario ID or a semantic variation; do not quietly change the meaning of old cases.
- The source cohort is a test tool only. The runtime must not import it, use it in AI prompts, store it in the app, auto-create fictional KS accounts, or treat the anticipated future checkpoints as customer history.
- Periodically revisit the focus ranking using actual field evidence. The same traders are a **regression backbone**, not the only people allowed in testing. Use new blind users and unfamiliar trading cases to find gaps.

## Current status

The source fixtures, report shape and coverage checks are being prepared in Phase 0. The run log has **no recorded field observations** and does not establish that any real financial transaction or end-to-end SecurePay Mini test succeeded. Production changes and live financial enablement remain explicitly out of scope.
