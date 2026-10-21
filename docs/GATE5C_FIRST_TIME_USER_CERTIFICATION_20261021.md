# Gate 5C — First-time-user experience certification
**21 October 2026 · Engineering completion candidate; human certification remains pending**

## Source of truth and scope
- UI PR [#161](https://github.com/kimaniks001/SecurepayLLM/pull/161) is stacked on the *actual* four-space Living Workspace integration PR [#160](https://github.com/kimaniks001/SecurepayLLM/pull/160), not a concept prototype.
- The approved three-column arrangement, existing controllers, canonical SecurePay Check and 12 Fair Trade principles are preserved. Gate 5C creates **certification tooling only**, not another workspace redesign, permission change, Agreement authority or money operation.
- Only test the **exact 40-character SHA of the Git branch head** on an HTTPS **non-production preview**. Match this against the deployment's reported commit SHA and each participant's session SHA.
- Automatic regression/CI success does not establish first-time-human ease of use, live KS001 intelligence, proof of a connected isolated API or release approval.

## Human test prerequisite — STOP if absent
A dedicated protected, isolated staging environment must be deployed and independently evidenced before performing connected journeys. Verify:
1. UI preview routes to this isolated API and never to production, including reads.
2. Test accounts and data are synthetic and segregated from customers.
3. Money execution, external bank/payment/provider writes and real-value movement are impossible.
4. API, model and Agreement semantics are verified with Gate 4C evidence; the UI does not simulate canonical sufficiency/12-principles clearance.
5. Protect preview/test identity access. Obtain recording consent and store recordings in a restricted private evidence location.
6. Record staging verification time and evidence of isolation and exact staging deployment.

**As inspected on 21 October 2026, `securepay-ks001-staging` had zero deployments. Gate 5C therefore cannot honestly be declared human-certified yet.** UI-only preview is suitable for non-connected visual inspection, but is not proof for connected Agreement, Money, Circle governance or persistence.

## Uncoached first-time cohort
Recruit at least five distinct people with no prior SecurePay experience. Include phone and desktop. Avoid coaching, priming or steering answers. Use anonymous session IDs, do not store identifying details, passwords, tokens, GPS addresses, real trade details or payment data. A facilitator safety intervention disqualifies that session from certification, and a failed task is a failure, not a pass with an excuse. Ask the neutral prompt in the [facilitator card](GATE5C_VERIFICATION_AND_HUMAN_SESSION_CARD_20261021.md).

Every participant must attempt all eight journeys:
| ID | Task and pass condition |
| --- | --- |
| `first-impression` | Explain what SecurePay does and locate a natural beginning without coaching |
| `work-400-delivery` | KES 400 delivery; KS001 asks *what* is delivered and material facts before readiness |
| `vision-private` | Add an aspiration without assuming an Agreement was accepted |
| `circle-chama` | Eight friends x KES 2,000 monthly; differentiate discussion from formal decision |
| `community-boundary` | Find public help without exposing private Circle material |
| `money-boundary` | Understand My Money/Borrow/Invest/Protect without claiming funds are approved or moved |
| `securepay-check` | Distinguish inspected draft, sufficiency, parties' acceptance and Money authority |
| `return-journey` | Navigate away and return without losing work or accidentally approving anything |

Each journey needs the human's observed action and uncoached words, a pass/fail/blocked result, an access-controlled evidence reference, and an explicit `defects` array. Record confusion even when the task succeeds; it will appear in the final human review.

## Private evidence file
Start with [the deliberately unfinished JSON template](GATE5C_SESSION_EVIDENCE_TEMPLATE.json), then create a **private copy outside Git** and supply real evidence. Never commit filled session records to the repo.

Required fields:
- `candidate`: `repo`, full `sha`, `deploymentSha` (identical), HTTPS `previewUrl` (not production).
- `environment`: booleans `isolated`, `noRealMoney`, `noProductionWrites`, `noProductionReads`, `syntheticIdentitiesOnly`, `noExternalProviderWrites`, `connectedStagingReady`; references `isolationEvidenceRef`, `stagingDeploymentEvidenceRef`, `gate4cEvidenceRef`; and `verifiedAt` in offset-aware ISO format.
- `sessions`: at least five unique anonymous `id` values; `priorSecurePayExperience:false`, `coached:false`, `consent:true`; `device`, `startedAt` (offset-aware), `candidateSha`, `evidenceRef`, eight `journeys`.
- Each `journey`: mandatory ID, `result` (`pass`, `fail`, `blocked`), `observation`, `evidenceRef`, and `defects` as an array, even if empty. Defects need `code` and `description`.
- Critical defect codes: `privacy-leak`, `money-misrepresentation`, `false-acceptance`, `unauthorized-action`, `lost-work`, `inaccessible-critical-action`.

Run:
```bash
node --test tests/gate5c-certification.test.mjs
node scripts/gate5c-certify.mjs /private/path/to/gate5c-human-sessions.json
```

Output **NOT_CERTIFIED** means at least one evidence/experience gate failed or evidence is incomplete. **ELIGIBLE_FOR_OWNER_REVIEW** means the written metadata is complete, all 40+ tasks are reported passing, staging is attested and no critical blocker is reported. It NEVER proves the observations were genuine; the owner/independent reviewer must inspect recordings and proof of actual environment safeguards before deciding whether to certify.

## Release boundary
- Gate 5C engineering does not itself authorise merging Gate 5B, Gate 5C or deploying SecurePay to production.
- If actual participants find material defects, repair narrowly without changing the approved shell, rerun CI at the new SHA, and retest affected journeys.
- Do not replace independent Gate 4C KS001 semantic tests or the canonical 12-principles evaluation with staged UI success.
