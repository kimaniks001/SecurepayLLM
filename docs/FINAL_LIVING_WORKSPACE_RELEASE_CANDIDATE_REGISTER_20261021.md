# SecurePay — Final Living Workspace usability pass and release-candidate register
**21 October 2026 · technical review candidate · NOT a production release or human certification**

## Exact change scope
Preserve the approved three-column Living Workspace and working KS001/Agreement/Circle/Vision/Store/Money controllers. Correct one tangible human-navigation defect and certify it on desktop, ordinary phones and narrow 320px phones.

- The top navigation now occupies the available row at narrow widths and scrolls **inside its own navigation strip** if the buttons do not fit; it cannot force the entire document wider.
- The bottom tab opening the right-hand panel is **Your Work** in My Work, but **About Vision / About Circle / About Community** elsewhere. This fixes the misleading label that previously called a Circle purpose summary “Your Work.”
- The existing Gate 5B real-workspace Playwright browser journey now covers **1440 / 390 / 320 px**, verifies no horizontal overflow, all purpose boundaries, one original workspace shell, no API writes, keyboard Escape on the tool drawer and an intact real compact Money tool.
- Focused regressions verify exact label/viewport intent, keyboard-close contract and original controller authority. No functionality or data access was added.

**The E2E runner uses local Vite/Chromium without login or provider calls. Its synthetic browsing cannot prove connected backend functionality or real human ease of use.**

## UI dependency audit (verified GitHub PR bases on 21 Oct)
The following are **stacked**, not independent patches to merge into main:

| UI PR | Source | Base | Treatment |
| --- | --- | --- | --- |
| [#155](https://github.com/kimaniks001/SecurepayLLM/pull/155) Phase 7 | `feature/master-phase7-money-fulfilment-20261020` | `integration/master-execution-20261019` | Money/fulfilment display candidate, no execution authorisation |
| [#156](https://github.com/kimaniks001/SecurepayLLM/pull/156) Gate 3 | `cert/gate3-staging-relay-isolation-20261021` | #155 head | Staging relay fail-closed guard |
| [#157](https://github.com/kimaniks001/SecurepayLLM/pull/157) Gate 4D | `fix/gate4d-workspace-readiness-truth-20261021` | #156 head | Stale Agreement protection and truthful readiness |
| [#160](https://github.com/kimaniks001/SecurepayLLM/pull/160) Gate 5B | `feature/gate5b-approved-four-spaces-integration-20261021` | #157 head | Real Vision/Circle/Community/Money purpose integration; awaiting real Workspace visual review |
| [#161](https://github.com/kimaniks001/SecurepayLLM/pull/161) Gate 5C | `test/gate5c-first-time-human-certification-20261021` | #160 head | Offline human-certification validator; actual sessions pending |
| **This final pass** | `release-candidate/final-workspace-usability-20261021` | #161 head `7825d2f7b7166fb9a3e48c29401e509ac6e2bbb8` | Minimal usability fix + browser proof; keep draft until acceptance |

**Do NOT merge UI prototype [#158](https://github.com/kimaniks001/SecurepayLLM/pull/158) or [#159](https://github.com/kimaniks001/SecurepayLLM/pull/159) as product pages.** #159 supplied owner-approved *language concept*, reimplemented narrowly in #160. Many prior UI PRs are historical or overlapping; do not merge them again just because they remain open.

## API dependency audit (verified GitHub PR bases on 21 Oct)
Backend is **not the same repository** and requires a separately approved staged candidate:
1. [API #330](https://github.com/kimaniks001/SecurePayAPI/pull/330): Phase 23 concurrency repair; base current API main. Repeat exact-commit concurrent identical/different-payload tests.
2. [#331](https://github.com/kimaniks001/SecurePayAPI/pull/331) → [#332](https://github.com/kimaniks001/SecurePayAPI/pull/332): disposable browser test followed by operator-only isolated staging contract; staging infrastructure still has to be deployed and attested.
3. [#333](https://github.com/kimaniks001/SecurePayAPI/pull/333) + independent [#334](https://github.com/kimaniks001/SecurePayAPI/pull/334) session refresh + independent [#335](https://github.com/kimaniks001/SecurePayAPI/pull/335) fresh-KS read tests: **combined in [#336](https://github.com/kimaniks001/SecurePayAPI/pull/336)**. Do not independently merge all three and then #336.
4. [#337](https://github.com/kimaniks001/SecurePayAPI/pull/337): real browser / API Fair Trade read. [#338](https://github.com/kimaniks001/SecurePayAPI/pull/338): real-model and human testing harness, not a completed human certification.
5. [#339](https://github.com/kimaniks001/SecurePayAPI/pull/339): three synthetic KS-identity HTTP privacy, join and exact-version acceptance tests.

API #339 is a cumulative draft **candidate lineage**, not proof that model semantics, partner payment execution, all merging or staging are approved. Confirm exact head and green API gates before any merge operation.

## Release-candidate decision order
- Review this single current UI candidate in desktop and narrow-mobile real preview. Do not introduce a new shell, duplicate KS001 or reinvent policy.
- Run exact-head full frontend CI **and** the targeted Playwright Gate 5B browser workflow. Preserve screenshots and inspect them visually; technical logs alone are insufficient.
- Qualify Paul's dedicated staging independently: separate database and users, no production reads/writes, no customer credentials, disabled bank/mobile-money/provider writes, correct UI/API origin.
- Test API #339 lineage with current candidate UI on isolated staging; Gate 4C actual KS001 interpretation must ask what KES 400 delivery is, consider 12 canonical Fair Trade principles as warranted, and preserve correction/version/acceptance boundaries.
- Complete five genuinely first-time, uncoached Gate 5C sessions at the exact tested connected build, including mobile and desktop, then fix defects and repeat certification.
- Obtain explicit owner approval on final UI, API, operational controls and bounded pilot. Only then reconcile and merge in **dependency order into the authorised integration targets**, run combined integration CI and request a separate production release decision. Financial rails and live-money use require their own execution and reconciliation certification.

## Blockers / no-claims
- This PR does **not** certify human ease of use, real KS001 reasoning, bank/payment rails, provider quote correctness, settlement or production readiness.
- The dedicated `securepay-ks001-staging` Vercel project last checked had **no deployment**.
- No migrations, deployments, GitHub main merges, new permissions, production environment settings or real money were changed in this final usability pass.

## Verified release blockers discovered during this phase
- **Backend API cumulative [PR #339](https://github.com/kimaniks001/SecurePayAPI/pull/339) at `48c49769bdb33b44a0e0ebd90da9dcf67fe98c1f`:** [Final Convergence run 39583122920](https://github.com/kimaniks001/SecurePayAPI/actions/runs/39583122920) reported failure in `Phase23ObligationConcurrencyIntegrationTest.simultaneousEvidenceApprovalsPersistSingleDecision()`: one of two identical concurrent evidence-review requests was rejected as already reviewed rather than replaying the same decision. Repository Validation, Phase 33/34/35, Convergence Doctrine and Gate 5A HTTP identity tests passed. The earlier isolated [PR #330](https://github.com/kimaniks001/SecurePayAPI/pull/330) had a passing Final Convergence run `39563650360`; passing alone does **not** explain the later cumulative failure. A repeat of the failed exact-commit job was requested; use its actual outcome, never infer a green result.
- **Human and staging:** no deployment has been verified for dedicated `securepay-ks001-staging`, and five real uncoached Gate 5C sessions are not recorded. Neither can be waived by browser mocks, automated validators or GitHub CI.
- **Inherited browser labels:** Phase 1, Phase 2 and Master Phase 3 snapshot workflows previously searched for “Your Work” even when viewing other spaces. They now search for the actual context-labelled summary panel; this is a test reconciliation to the user-visible improvement, not removal of the original spatial/navigation/assertion checks. Recheck all workflow conclusions on the **latest head**.
