# SecurePay — Master Convergence Gate 1
## Architecture reconciliation and isolated source integration
**Date:** 28 October 2026  
**Decision:** **GATE 1 SOURCE COMPOSITION COMPLETE; FULL INTEGRATION / RELEASE NOT CERTIFIED**  
**Scope:** C6 transactional My Work + bill/photo/document reading + True North Community/Circles and the approved three-column Living Workspace.

## 1. Authoritative branch pair

| Component | Parent | Isolated branch | Source integration head | Included |
|---|---|---|---|---|
| UI | `ee3e80b83b90925ac4271f6d5f89ce4251e25dea` (`main`) | `feature/master-convergence-gate1-ui-20261028` | `9806d9e907ef78ca3b3dfe45469041ee32296784` prior to added Gate 1 tests/report | Existing C6 fixes, UI #183, True North cumulative UI #192 including inline Community media |
| API | `63db5d5a71308ddfff049e9e5b16fee716667a41` (`main`) | `feature/master-convergence-gate1-api-20261028` | `3cea19966d55b80f1d8b3b1778db768b689f597f` | Existing C6 API fixes, API #365 including #364, cumulative True North API #370 including Community media and Fair Trade twelve-lens observations |

**Important:** The exact UI SHA changes when tests/report are committed. Always capture `git rev-parse HEAD` for the final Gate 1 UI and API build pairing.

**Integration-only PRs merged to isolated branches, NOT main:** UI #193 (media intake) → #194 (Community), API #371 (KS001 source reading + golden journey) → #372 (Community media + Fair Trade). Their original draft PRs remain open; do not reapply these changes on top of this branch pair without a fresh compare.

### Current production state is not inferred from branch composition
Day 2 C6 API `db18f6e` and UI `e5b35d3` are ancestors of their respective `main` histories. This establishes source ancestry, *not* runtime behavioural or secret/provider parity. Vercel previously reported READY on the UI production target at `ee3e80b8`; production API SHA and financial feature flags have not been independently verified. No Gate 1 production deployment or payment action was performed.

## 2. One architecture: ownership and authority

| Domain | Canonical owner | Consumer behaviour | Non-negotiable separation |
|---|---|---|---|
| Identity / KS Number / member status | Existing SecurePay identity and Trust Project membership APIs | Recognise organiser, participant, invited Circle member | A public post never proves someone is a signed-in Agreement participant |
| Conversational understanding | One `AgentGateway` / server KS001 conversation context, with token-bound anonymous access | KS001 asks material questions; may adopt selected Community commercial source or uploaded bill/document | Community does not run a second trade parser; no fabricated KS001 response |
| KS001 source intake | Conversation-scoped `/api/agent/conversations/{id}/sources/upload` and source artifact status | Human explicitly presses Add to KS001; receipt, PROCESSING, READY/PARTIAL/FAILED are separate | Upload receipt is not valid understood trade facts or an Agreement |
| Community attachments | Authenticated owner-scoped `/api/v1/community/media` and published object/reply references | Photo or PDF can be attached to Community story/reply | Never re-use private KS001 source URLs or Agreement evidence; bound content is permission-checked |
| Commercial source selection | `selectCommercialSource` + `continueAfterSourceSelection` | A human selects actual published offer, project or candidate for existing KS001 conversation | Expression of interest is not selected contract party or acceptance |
| 12 Fair Trade principles | Existing version-bound read-only `fair-trade-examination` API | Render evidence-based concerns, NOT_ASSESSED, one material next question | Not a score, compliance certificate, legal approval or finance readiness |
| Agreement identity, version, invitation and evidence | Existing canonical Agreement API | Independent participant consent; versioned obligations and beneficiary evidence review | Circle DONE is not Agreement completion; staged file is not evidence approval |
| Money / rail / escrow | Existing Money, PaymentReady, movement and release authorities | Display read-only readiness, then separate authorised payer consent | A budget, a report, a READY preflight or selected rail is not a movement |
| Community outcome | Existing active membership and `community.contributions.create` | Deliberate author-report after preview, privacy and consent | Member-reported expenses are not audited bank-reconciled costs |

The product has **one commercial agreement authority**, not one shared file bucket. Media **must** remain purpose-scoped to KS001 understanding, Community sharing, or Agreement evidence.

## 3. Executed source-level verification

On a **local dry merge** of UI #183 + #192 into current UI main:
- Merge: **no source conflicts**.
- `npm ci`, `npm run typecheck`, `npm run test:final-convergence`, `npm run build`, and `npm run lint`: **passed**, full suite **2,328 / 2,328**, 0 test failures, lint 39 warnings and 0 errors.
- Reran `npm run typecheck`, full suite **2,328 / 2,328**, and build on the **actual GitHub integration commit** `9806d9e9`: **passed**.
- Existing approved Living Workspace browser test **PASS at 1440/390/320px**; signed-out Community browser **PASS at 1440/390/320px**, on isolated local Vite preview.
- Added `tests/master-convergence-gate1-contract.test.mjs`: **7/7 passed** on the integrated branch. These enforce source-to-KS001, Community-to-commercial-source, Fair Trade, and media/Agreement/Money authority boundaries. **They are source-level tests, not authenticated backend execution.**

### What has NOT been proven
- The **combined API** `3cea1996` has not run Java unit/integration tests or Flyway in this session. The isolated test sandbox could clone the UI repo but did not have credentials to clone private SecurePayAPI. Connector integration merges do not establish Java compilation.
- A configured OpenAI conversation provider is **not automatically** an enabled OpenAI **source reader**. The API source reader is selected separately via `securepay.agent.source-understanding.provider=openai`; missing credentials must fail closed. Existing fallback configuration and actual staging secrets require verification, not assumptions.
- Community 2-user attachment permissions, PDF scanning/retention, per-recipient Agreement invitations, 12→4 authenticated join, Money gating and real provider-backed KS001 continuing material questions are not certified.
- Gate 5 staged Agreement media is intentionally staging-gated and unavailable through an unapproved production relay.

## 4. Gate 2 must prove six human journeys on the **same** API/UI SHAs

1. **First-time intention** — visitor says “I want to plan a trip to Nakuru”; KS001 starts a real plan and asks one useful next question, no spurious correction failure.
2. **Photographed bill/invoice** — user selects image, explicit Add to KS001, sees real upload/reading status; read facts include seller when known, price, items; ambiguities become questions, not invented data. User reviews agreement terms and can send an authorised SecureLink. Third-party funding must remain a separate consented Money action.
3. **Community project head** — publicly proposed opportunity, 12 independently interested members, four deliberately selected, four independent Agreement invites/joins/confirmations, eight not invited with zero contract authority. Check per-worker pay/roles and that no funding is inferred from budget.
4. **Circle coordination to execution** — only active members coordinate; each participant enters own authorised Agreement, submits evidence, beneficiary reviews and completion conditions are checked; no Circle quick reply or photo auto-releases money.
5. **Project report back to Community** — private Agreement evidence and identifiable data stay private; member deliberately publishes a public report with accurate *self-reported* costs and idempotent retry. Observe actual Community Live publication.
6. **Identity, activation, fees and financial safety** — KS Number issuance, activation charges, monthly plan and per-collection/contract fee rules are validated against exact deployed backend configuration; errors and retry must not duplicate charges. Payment execution remains disabled until independently approved.

For all six: verify desktop/mobile, auth and identity switching, stale versions, private Circle scopes, network retries, rollback, failed source-provider credentials, and zero unauthorised Money action.

## 5. Follow-on certification sequence

**Gate 1 delivery:** one pair of isolated source candidates, no duplicate architecture, green frontend checks and an executable Gate 1 contract suite. Keep both candidates in **draft PRs** to `main`; do not merge.

**Gate 2:** isolated exact-SHA full-stack acceptance, disposable PostgreSQL and an authenticated KS001 provider; fix defects on the convergence branch pair, never directly in production.

**Gate 3:** certify actual KS001 continuation and all twelve principles; no “ready for review” without essential terms and concerns.

**Gate 4:** verify identity, privacy, activation, fee economics, financial state/consent and mobile interaction.

**Gate 5:** repeat complete journey and secure CI, provider, DB migration, performance, rollback and signed owner go/no-go evidence.

**Gate 6:** only after owner approval, controlled main merges and reversible deployment with financial execution separately gated.

## 6. Gate 1 decision
**Source composition is complete; UI tests passed, API runtime qualification is pending.** Gate 1 may move to Gate 2 **as an isolated candidate only**. **NO-GO for production merge/deployment or money execution.**
