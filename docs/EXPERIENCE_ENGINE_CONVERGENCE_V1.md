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
6. **Shared fulfilment Plug gate:** current SecurePayAPI `SharedFulfilmentService` can propose a pool and open a pooling window for a poolable need, but exposes no verified Plug assignment/required-Plug gate. Trust Project doctrine requires a Plug in every Community Saver. Do not wire a customer-facing “Start Community Saver” command until a governed Plug coordination/consent bridge exists.

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

The four-surface experience convergence is **feature-complete within the verified frontend/backend contracts** on PR #107.

- **Vision:** practical Start Here, saved-item fulfilment derivation, explicit PRIVATE/MATCHABLE + poolability choice, real Store routes, exact offer handoff, contextual KS001, and no-route recovery are wired. The persistent mixed-material visual canvas remains a documented backend-contract gap and is not faked.
- **Store:** discovery, practical Store-management cockpit, availability attention, privacy-safe Business demand matches, qualified Plug missions, route comparison, mini Agreement review and exact Offer → Agreement handoff are wired. Empty/error states preserve a useful next action.
- **Agreement:** living overview, exact version, participant next attention, authoritative work/evidence/people/changes/Money navigation, Agreement-derived fulfilment and Store fallback are wired without inventing authority.
- **Money:** Agreement-led dashboard remains the financial authority surface and now participates in the shared journey, includes purposeful no-Agreement recovery, contextual KS001 explanation, and can return to the exact selected Agreement through a one-shot in-memory handoff.
- **Cross-surface continuity:** Vision → Store → Agreement → Money and Agreement → fulfilment → Store flows preserve user intent without browser storage, automatic commitments or hidden Money actions.
- **Community Saver:** deliberately not exposed because current SecurePayAPI shared-fulfilment authority does not prove/enforce the required Plug gate.
- **Fulfilment → Agreement:** the selected Store offer can enter canonical Agreement formation, but the full FulfilmentNeed is not falsely claimed as a canonical Agreement source because no verified bridge exists.

### Automated certification

Head `d6a5897832c1ae87dcf95537af31a573d7ba3b99` passed:

- **Final UI Convergence Certification #213:** full frontend regression ✅, typecheck ✅, lint-errors gate ✅, production build ✅.
- **Vision Money Gap Validation #268:** Vision/Money regressions ✅, Phase 8 Money doctrine ✅, Money experience regressions ✅, full frontend regression ✅, typecheck ✅, lint-errors gate ✅, production build ✅.
- **Vision V1 UI verification #252:** running at this checkpoint; its Vision Dream regressions and full frontend Node regression were already green when this record was updated.

No SecurePayAPI writes, merge, deployment or paid model calls were made.

### Remaining non-UI contract gaps

These are intentionally not disguised as frontend completion work:

1. Persistent mixed-material Vision canvas/media/canvas-layout storage authority.
2. Governed FulfilmentNeed → canonical Agreement-source bridge.
3. Enforced Plug assignment/consent gate for Community Saver/shared fulfilment.
4. Full SecurePay product/service catalogue + surface-aware KS001 intelligence in SecurePayAPI (separate authorized build).

C7 automated regression/type/build certification is green. Live deployed desktop/mobile browser walkthrough and screenshots remain a separate release-certification step because this PR has not been deployed.

## KS001 contextual convergence

- Vision, Store discovery, Store management and Living Agreement now expose an explicit **KS001 here with you** doorway.
- The user-triggered request carries the surface context into the existing KS001 conversation and asks only for real, verifiable SecurePay products/services/capabilities relevant to that surface.
- This is situational context, not authority. It cannot create Agreements, select suppliers or move money.
- Verified backend gap: SecurePayAPI's current Agent capability registry / Knowledge Core is narrower than the real platform and is largely question-reactive rather than fully surface-aware. See `docs/KS001_PRODUCT_INTELLIGENCE_CONTRACT.md`.
- Money now exposes an explicit contextual KS001 doorway and returns into the same Agent experience through a one-shot in-memory handoff. The Agent still has no Money command authority; current financial truth and executable actions remain Money-backend owned.
