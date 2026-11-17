# Mini Intelligent Basket — Quiet Fair Trade examiner and Agreement preparer
17 November 2026. Status: **owner preview slice**, not full canonical API convergence.

## Governing decision
The Basket is the **ordinary person's context-sensitive agreement-preparation experience**. It gathers the buyer's trade and resolves the next genuinely material uncertainty. KS001 is optional when a person wants deeper explanation; it must NEVER be compulsory to visit a Store, answer required basket questions or pay.

The basket's internal method is WWWWWH (who, what, where, when, why, how) and SecurePay's **single canonical 12 Fair Trade principles**. This is not a checklist, score, customer-facing law exam, moral certification or independent frontend fairness engine.

## Canonical authority (verified in SecurePayAPI main)
- Principles wording/numbering: `services/agreement/src/main/resources/fair-trade/principles-v1.json`. **Never fork or paraphrase into frontend policy.**
- `FairTradePrinciplesLoader`, `FairTradeExamination`, `FairTradeExaminationProjector`: evidence-bound, scoped to one Trade Context version, remaining lenses stay `NOT_ASSESSED`; no pass/score/money clearance.
- `AgreementSufficiencyEvaluator` and `AgreementFormationProjector`: materiality, coherent Review, distinguish `canReview`, `canSet`, open questions.
- `AgentFairTradeExaminationController`: GET `/api/agent/conversations/{conversationId}/fair-trade-examination`, owner-authenticated, `Cache-Control:no-store`, returns PARTIAL_ADVISORY and 12 lens coverage. This endpoint **cannot** be called for an ordinary standalone basket until it has a canonical conversation/TradeContext link or a server-owned basket preflight adapter.
- Money authority remains independent and on regulated provider routes. An empty advice list is NEVER proof the 12 principles were examined or that payment is ready.

## Implemented owner-preview slice
- `miniBasketQuietFairTrade.mjs` is a **provenance and question-preparation bridge**, NOT a second examination. It collects source-grounded WWWWWH evidence notes, constructs specific *provider-owned* clarification requests where published services explicitly leave material terms open, and always reports `canonicalExamination.status=NOT_ASSESSED` until backend evidence exists. It exposes no fairness pass or payment action.
- For `Water pump maintenance · 12 months` where the Store says visits, start date and exclusions require agreement, the supplier receives a **request for coverage and start-date clarification**. The buyer is NOT asked to invent the supplier's duties.
- Sandbox-only `miniSampleProviderReply` is a deliberately fictional version-pinned answer; the customer must explicitly review the changed terms before fictitious seller acceptance unlocks fictitious Money.
- `miniBasketQuestions` now keys buyer-side clarifications to the published Store offer and source timestamp. `miniStoreIntent` forwards only the user's own source-scoped clarifications when they explicitly open KS001, not as a background mandatory chat.
- Previously delivered basket delivery mini Agreement, separate seller offers, Save for later and three rail choices remain untouched.

## Engineering gate to complete the **real** basket examiner
1. Introduce a **server-owned basket-to-TradeContext / AgreementFormation preflight** using existing Store source refs and latest server-resolved immutable offer versions, participant-permission rules, source provenance, quoted prices, buyer choices and linked delivery mini Agreements. Do not parse buyer answers twice into competing schemas.
2. Call existing `AgreementSufficiencyEvaluator`, `FairTradeExaminationProjector` and Fair Trade policy through one canonical server service. Store only appropriate authorised, current-version observations. Return material open points + first justified human question + provider-participant requests + relevant advice, with their evidence references.
3. Display **one next required buyer question** (if any), otherwise send an appropriate seller/provider request. Unassessed ethical lenses must remain unassessed; do not block ordinary review on every lens or manufacture gaps. Prohibitions and protective risks are handled by their appropriate backend rules.
4. Reevaluate after every material Store version change, seller quote, provider reply, counteroffer, delivery obligation or buyer correction. Stale/out-of-scope answers cannot silently migrate to a new Agreement version.
5. Only canonical participant acceptance and payment safety/rail certification can move from proposal review into real Money; no frontend Fair Trade observation is a financial permission.
6. Stage full test of service/maintenance, multiple sellers, conflicting prices, unknown delivery, unquoted labour, verified seller/payer/payee identity, privacy, unpaid/paid/reversed states, misleading source, and dispute recovery. Preserve Gates 7–11, do not merge owner fixtures into production.

## Human acceptance (phone)
A customer sees *why* one real issue needs resolution, not a 12-row quiz. When no material question remains, the basket simply asks whether to review, send a SecureLink, connect to Money when legally authorised, or save for later. If a 12-month service has unclear coverage, a provider clarification appears as one natural next step. KS001 is there if the customer wants an explanation. A change in the source invalidates the old answer; the experience remains gentle, truthful and fast.

**Evidence for this slice:** `tests/mini-quiet-fair-trade.test.mjs` checks owner of service questions, source/version pinning, no fictitious 12-principle pass, no payment clearance, no generic questions, explicit buyer review and optional KS001 with preserved buyer input. Green source/build tests alone are not a certified end-to-end API Fair Trade examination.
