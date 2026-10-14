# Agreement quality before review · Money follows the Agreement

**Status 2026-10-14: Phase 7 UI guidance built; authoritative backend gate NOT certified or implemented in this branch.**

## The problem
A draft can be syntactically reviewable when KS001 knows 'shoe, Ray, KES 4,000'. That is a coherent idea, not necessarily an executable and safe trade. A review should primarily confirm clearly established terms, not discover the provider, handover obligations, payer, payee, release conditions or remedy for non-performance.

## Distinct lifecycle states
1. **Draft forming** — intention, people, essential terms collected.
2. **Operationally clear** — parties and roles, what is supplied, receipt/completion expectations, time/place or applicable delivery mechanism, responsibility and practical remedy sufficiently described for this type of trade.
3. **Review** — humans read and correct established terms. A backend reviewable draft is **not** a payment authority or evidence all practical details are resolved.
4. **Agreement accepted** — authorised people and versions agree under existing SecurePay Agreement governance. No client/UI inference.
5. **Money ready** — backend links authorised principal, additive charges, payment source, settlement entitlement, verified receiving identity/destination, applicable rail/provider quote, conditions for earning/release/return and version protection to the accepted Agreement.
6. **Fund, earn, release or return** — money execution and settlement follow backend checks, ledger authority, provider capability, evidence and approved conditions. Never execute from a KS001 chat claim or an illustrative panel.

## Who gets the money?
The person receiving goods is NOT automatically the money recipient. Money follows the accepted Agreement's **entitled payee(s)** and the verified settlement destination under real Money rails. The payer is also explicitly established. Beneficiary, purchaser, supplier, seller, coordinator and payee may be different people. Where multiple payees or staged releases exist, the Agreement must say which portions are entitled under which conditions.

**Do not ask the user to paste account credentials or sensitive banking details into ordinary KS001 conversation** to establish an actual settlement destination. Verification occurs via authorised Money/financial-partner processes.

## Intelligent strengthening contract (needed on SecurePayAPI / KS001)
For every concrete Agreement draft, the model can identify candidate practical risks using bounded Trade Context and available evidence, but only backend policy determines which gaps are actually material for that trade. Ask one useful question at a time, avoid a universal rigid interview. Only ask relevant questions (an instant digital service does not need transport; a walk-in purchase might need no delivery logistics). The agent must not state 'everything ready' solely because price was extracted if significant unresolved performance or money-entitlement facts remain.

Server should explicitly report:
- Basic reviewability vs **practical completion** / money eligibility as independent capabilities.
- Material outstanding performance, participant-role, and funds-entitlement questions (with applicability and reasons).
- User-reviewed decisions and evidence provenance; non-confirmed/inferred values stay labelled.
- Policy authority, actor and Agreement version for all consequential actions.

The present React `practicalReadiness.ts` only supplies transparent, **advisory preparation questions**. It reads the server-owned Formation projection, never inserts values, never changes the Agreement, never flags Money ready, and sends a user-visible query to KS001 only after the user clicks 'Work through this with KS001'. Any genuine mandatory pre-review quality gate and adaptive backend model orchestration must be built/certified separately.

## Concrete human acceptance: KES 4,000 shoe for Ray
- Recognise Ray as recipient only if evidence establishes that role; don't infer that Ray is seller or payee.
- Establish the seller/provider and who pays, how Ray receives the shoe, and practical quality/size expectations if relevant.
- Clarify what counts as completed fulfilment and when the entitled payee can be paid; clarify what happens on failure or non-delivery where relevant.
- Display price without claiming funding readiness. Actual payee account/rail must be verified in Money through authorised flow, not by an LLM answer.
- Make review largely confirmation, with the route to amend still available. Do not release, route or promise KES 4,000 before Agreement and Money backend authority.

## Current preview experience
My Work now displays a compact money pathway and one preparation question at a time when useful. Server-specified `formation.question` has priority. Backend `formation.reviewable` remains visible for transparency, but is NOT renamed Money Ready. The left chat and the right live Agreement remain bound to one canonical conversation.
