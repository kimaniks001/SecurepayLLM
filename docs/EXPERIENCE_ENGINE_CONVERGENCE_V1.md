# Expose the SecurePay Engine — coordinated build

Authorized by James on 5 October 2026. This programme implements the latest product discussion, not the older merged Agreement, Vision and Store work.

## Repository boundary and baseline

- Write only `kimaniks001/SecurepayLLM`.
- Read-only `kimaniks001/SecurePayAPI`; gaps are recorded here, never implemented in that repository.
- LLM baseline: `b9a0a1cf7f1129d91ed56255dbb71a80d3d8b80b` (Money Build 2, PR #105).
- API contracts inspected at `f27274842bee89219d378542322e0d591c5af8c8`.
- Programme branch: `feat/experience-engine-convergence-v1`.
- One coordinated draft PR. No merge or deployment authorized by the start instruction.

## Agreed experience

Vision → Project → Agreement → Money; Store → Agreement → Money.
Each arrival answers: what this is, current position, what happened, what needs attention, and the next available action.

Agreement reveals participants, responsibilities, versions, conditions, approvals, milestones, evidence, changes, reviews, progress and Money. Vision is an open visual thinking surface for photos, notes, links, documents, quotations, arrows, comments, fonts, affirmations, goals and arrangement; manual work stays free. Store is a daily operating cockpit: Today, Opportunities, Grow and Money, showing real demand, capacity, routes, trade-offs, pooling, standing and small jobs. Preserve the current Agreement-led Money direction, including financial enablers (banks, SACCOs, MMFs and insurance).

KS001 remains one guide. It helps think in Vision, fulfil in Store, understand commitments in Agreement, and explain permitted financial actions in Money. It never silently commits or moves money. Community Saver requires a Plug, feasibility checks and participant consent. Paid visibility buys attention, never standing. Shadow economics remain invisible to members; no charging or wallet implementation.

## C0: capability → exposure audit

| Capability | Existing API/client | Current exposure | Coordinated upgrade |
| --- | --- | --- | --- |
| Agreement purpose, description and version | `agreements/dto.ts`, detail | purpose/description not shown on overview; titles of terms dominate | Living overview on arrival |
| Participant confirmation/responsibility | People projection and execution controller | People/Progress tabs | direct overview routes into existing exact-version controls |
| Live milestone dependencies | effective-state projection | Progress tab | read-only milestone state on arrival; missing live read stays unavailable |
| Conditions and evidence review | execution controller/ProgressPanel | separate tab | obvious work/conditions/evidence route; preserve server-gated actions |
| Amendments and reviews | ChangesPanel, ReviewPanel | separate tabs | visible entry routes; no local acceptance authority |
| Agreement provenance | participant-safe source read | topExtra | preserve canonical origin; never invent a source |
| Agreement Money | dedicated Money clients | Agreement Money tab/handoff | direct context-preserving handoff; no inferred funding action |
| Dream note/conversation | `visiondreams` | text editor, same-conversation continuation | retain explicit review before KS001; mixed-material canvas gap below |
| Vision Library | owner-scoped shelves/items | forms and shelves | useful collection view, retain version/lock/usage policy |
| Vision-derived demand | `fulfilment-needs.fromVision` | typed client only | explicit need derivation, privacy choice and route review |
| Agreement-derived demand | `fromAgreementObligation` | typed client only | use real obligation ID; no synthetic demand |
| Provider matches and routes | `matches`, `routes` | typed client only | compare backend trade-offs, lead time, MOQ and delivery; unknown landed cost stays unknown |
| Mini-Agreement review | `miniAgreementReview` | typed client only | review proposal, then canonical formation; review creates no Agreement |
| Shared fulfilment | `shared-fulfilment` | typed client only | proposal-only human coordination; mandatory Plug for Saver |
| Business demand opportunities | `store.businessOpportunities` | read-only short list | useful actionable cockpit; preserve representation checks |
| Plug qualification and availability | market-network client | management panel | retain certified human identity gate and authority |
| Offer fulfilment capabilities | Store fulfilment read/write clients | no editor in management | expose real capacity, supply roles and service preferences |
| Standing | API `StoreStandingController` | needs contract mapping | real evidence only; never derive trust from paid visibility |

## Verified API gaps / dependencies

1. **Persistent visual canvas:** the current Dream contract accepts `title`, a 4,000-character text `content`, and `expectedVersion`. The Library has text content and typed shelves, not a canvas contract. No verified API authority exists for canvas nodes, positions, arrows, fonts, attachment/media lifecycle, collaboration or comments. Do not encode an undisclosed second database into private note text or claim a local-only board is saved to SecurePay. Identify any other existing canonical storage contract before implementation; otherwise record the persistent part as blocked.
2. **Project continuity:** inspect Project contracts before promising a durable Dream → Project relationship. Navigation alone is not saved provenance.
3. **Personal Store opportunities:** existing management controller has a Business opportunities read but passes an empty list for personal Store. Do not represent unsupported or failed reads as zero opportunities.
4. **Enquiries/activity:** management currently supplies empty arrays. Map verified reads before asserting that a Store has no enquiries/work.
5. **Contextual Store Money:** existing link opens global Money. Verify Agreement relationship/capacity filters before claiming a Store-scoped financial total.

## Slice checkpoints

- C0: baseline, contracts, gaps and migration ledger.
- C1: shared context, attention, next action and honest loading/empty/error presentation.
- C2: living Agreement overview and existing authority controls.
- C3: real visual Vision surface, within verified persistence contracts.
- C4: Store cockpit and actionable fulfilment/routes/capacity.
- C5: context-preserving handoffs between all surfaces.
- C6: coherent KS001 context and explicit consent.
- C7: full regression, desktop/mobile browser certification, screenshots and completion report.

## Acceptance journeys

Personal dream; Vision need → Store quotation → Agreement → funding; Agreement obligation → fulfilment routes; shared logistics → Plug → consent; short service → Quick Agreement → evidence → Money; active Agreement progress/evidence/action; Money explanation → Agreement; new-user/empty state; unavailable backend; mobile.

Completion requires understandable arrival, useful empty state, real-data usefulness, clear next action and coherent handoff. Browser fixtures demonstrate UI behaviour only, not live API or pilot certification. A remaining gap prevents a full-completion claim.

## Current checkpoint

C0 contract inventory completed; initial C2 living Agreement landing composition implemented.

C1 has now started with a shared, authority-neutral journey layer across Vision Board, Store and the living Agreement. It names the four practical jobs — think it through, find what you need, make it clear, fund and move safely — and provides explicit navigation without creating commitments, purchases or Money authority. Vision and Store now hand off into the same Agreement/Money operating model instead of presenting as isolated modules.

C2 now also exposes the selected participant's backend-owned next actions at Agreement arrival, including reason, attention class and deadline. It does not translate action codes into guessed permissions; actions route into existing gated work.

C4 has started materially. Store management now has a real **Today / What needs you?** cockpit driven by offer availability, privacy-safe Business demand matches and qualified Plug missions. Existing Store authority is wired for offer review and availability confirmation. Business demand can now open the existing fulfilment engine's backend matches and supply routes, exposing provider, listed price, lead time, MOQ, delivery, warranty, returns, trade-offs and whether landed cost is actually known. Mini Agreement review now sits before the canonical Store-source → KS001 → Agreement path and shows what, proposed amount, required date, completion evidence, interaction level and missing material decisions while preserving `agreementCreated=false` and `moneyMoved=false`. No supplier is auto-selected, no stock is reserved, no Agreement is created and no money moves.

Vision arrival now has a practical Start Here surface: capture the idea, find what it needs in Store, or review Agreements. A saved Vision item can now explicitly become a real fulfilment need with user-chosen need type, PRIVATE vs MATCHABLE visibility and poolability, then show backend Store matches/routes and open the exact Store offer. This stays within the verified text/shelf persistence contract; the persistent visual canvas gap remains open.

Verified continuity limitation: SecurePayAPI's MiniAgreementReviewService is intentionally non-binding and there is no verified bridge that binds the FulfilmentNeed itself as an Agent/Agreement source. The UI carries the selected Store offer into KS001 but does not claim the entire need object was canonically transferred; unresolved need details must still appear in canonical Agreement review.

Validation for these follow-on slices is still pending: the connector-created commits did not produce a GitHub Actions run and the execution environment cannot reach github.com for a local checkout. The static regression source has been added but no green claim is made yet.

Programme incomplete. Money implementation unchanged. No API writes, merge, deployment or paid model calls.
