# SecurePay Gate 5C — Verification checkpoint and first-time-user session card
**21 October 2026 · status: AUTOMATED CHECKS GREEN / HUMAN CERTIFICATION NOT STARTED**

## Exact engineering evidence
- Gate 5C draft PR [#161](https://github.com/kimaniks001/SecurepayLLM/pull/161), inheriting actual Gate 5B integration draft [#160](https://github.com/kimaniks001/SecurepayLLM/pull/160), not the separately illustrated prototype.
- Exact candidate commit: `b90f6c79bd67b94899b15cbcc30dd091c6b29afb`.
- [Final UI Convergence Certification run 39594827488](https://github.com/kimaniks001/SecurepayLLM/actions/runs/39594827488): completed SUCCESS at that commit; single Full UI convergence certification job. 2,182/2,182 tests passed, zero failed, including the eight `gate5c-certification.test.mjs` evaluator tests. Typecheck, lint and Vite build all passed.
- UI Git-preview deployment `dpl_E7U2PVquxuH2Yfd4yTfxdaVCJ6zQ` is READY for exact candidate SHA, Vite project `securepay-llm`; URL `https://securepay-6x85eobuu-james-8078.vercel.app`. The project requires Vercel SSO for these deployments; READY does **not** establish anonymously accessible usability.
- Dedicated `securepay-ks001-staging` project: `latestDeployment=null`, zero deployments, SSO protection enabled. **Therefore no connected, isolated KS001 human certification is available yet.** This is an explicit independent staging prerequisite, not an instruction to point previews at production.
- No browser-based first-user journey or live KS001 semantic test was witnessed in this verification. CI certifies automated regressions and evaluator mechanics only.

## Facilitator card: use only after staging is proven isolated
Recruit at least five uncoached, first-time users (at least one mobile and one desktop). Consent first and keep identifying data away from repo. Give the neutral introduction: **“Explore SecurePay as though you just discovered it. Tell me what you think you can do. I'll give you a goal but will not show you which buttons to press.”** Record what the person actually does; never lead them with the product's correct vocabulary or expected answer.

Read one goal at a time, in order:
1. **First impression:** “You've never used SecurePay. Look at this screen and show me where you'd begin. What do you think this service helps with?”
2. **Work / KES 400 delivery:** “I need someone to deliver something and I expect to pay KES 400. Try organising that safely.” Observe whether KS001 explicitly asks *what is being delivered* and material trade details. Stop at draft/check; no real payments.
3. **Vision:** “I'm considering an idea for next year, but I haven't agreed with anyone. Where would you keep it?” Ask afterward: “Has an agreement been created?”
4. **Circle / chama:** “Eight friends want to contribute KES 2,000 each month. Find a place to plan and decide together.” Ask afterward: “What would make the decision official?”
5. **Community:** “Find a way to meet someone or ask for practical help.” Ask afterward: “Could a private group conversation be shared publicly automatically?”
6. **Money:** “You want to explore borrowing or protecting a purchase.” Ask afterward: “Has anybody actually approved money for you?”
7. **SecurePay Check:** “You have a draft arrangement. Work out whether everyone has agreed and whether money can move.” Ask afterward: “Which steps have actually happened?”
8. **Return:** “Leave this work to look at something else, then come back.” Check retained context and absence of unintended agreement, invite, approval or Money actions.

After each goal ask **“What did you expect to happen? What surprised you?”** Do not explain until the participant finishes and results are recorded. Record journey result `pass`, `fail`, or `blocked` with an observation and evidence link. A blocked journey is not a pass. Escalate privacy leaks, money misrepresentation, false acceptance, unauthorized action, lost work, and inaccessible critical actions immediately.

## Human-certification policy
- UI-only preview can support qualitative first-impression observations, but **not** connected Agreement, Circle governance, persisted return-journey or Money authority certification.
- When Paul can attest isolated API, model, test identities and no production writes, perform connected human trials on a tested exact commit. No production or customer-data exercises.
- Use `node scripts/gate5c-certify.mjs /path/to/private-sessions.json` to validate evidence completeness. Do not commit participants' session data.
- Correct discovered defects with narrow patches, repeat CI and the relevant human journeys on the new exact SHA.
- Even if evaluator says `ELIGIBLE_FOR_OWNER_REVIEW`, **only owner review** can grant final human certification.
- Gate 4C real KS001 intelligence and canonical 12 principles still require independent backend/model evidence; never extrapolate from a nice UI.

## Required next acceptance
1. Paul confirms staging isolation, endpoint routing, fake test identities, audit traces and no payment/provider write exposure; dedicated staging is deployed and accessible to authorised reviewers.
2. UI owner signs off on the exact Gate 5C candidate's real three-column presentation (without another redesign).
3. Five first-time participant sessions, with observations, controlled evidence, blocker triage and owner decision.
4. Only then consider a merge decision; **production stays unchanged**.
