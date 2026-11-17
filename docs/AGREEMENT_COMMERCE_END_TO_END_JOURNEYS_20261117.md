# Agreement Commerce — one-platform human journey review
Date: 2026-11-17. Status: implementation checkpoint; NOT end-to-end or regulated-Money certification.
Owner decision: Mini is the primary SecurePay application. The Living Workspace is the deep work surface, not another source of Agreement truth. SecurePay for Business is an authorised acting capacity and tools within this same product, not an unrelated site. KS001 is an optional, context-aware assistant using the same canonical API and permissions, not the gate to Store discovery.

## Four surfaces — explicit responsibilities
- **SecurePayAPI**: canonical KSNumber/representation, Store publication, versioned offers and Agreements, participant permissions, SecureLinks, payment safety, notification events, recurring schedules and audit history. Authoritative transitions happen ONLY here.
- **Mini**: everyday Buy, Sell, Pay and Collect entry; multi-store intelligent basket; customer-facing readiness questions; one review/confirmation where warranted; ongoing purchase/collections.
- **SecurePay for Business**: Business capacity inside Mini; server-authorised offers, buyers, quotes, invoices, stock, role/delegation, periodic collection records and fulfilment. NEVER local simulated business state as truth.
- **Living Workspace**: deep agreement composition, disputes, complex versioning, milestones/evidence, non-routine negotiations. Uses exactly the same Agreement IDs, SecureLinks and Money records.
- **Ask KS001**: accessible at any stage; shares the authorised current intent/basket/Agreement context; only verified Stock/availability facts; can suggest actions, NEVER silently accept, grant authority or move money.
- **Client sites** (Varsityville, Shortstays, My Ride, Storage): own domain operations and verified inventory/booking rules; call canonical SecurePay for contract/payment truth, not duplicated Agreement engines.

## Human acceptance journeys / expected outcome
| ID | Human starts with | Evidenced actions | Finish condition |
| --- | --- | --- | --- |
| BUY-01 | Buy something | Search public goods, open actual offer, add to basket, choose needed collection/delivery detail, refresh stock, review, send seller-specific requests | Accepted applicable Agreement version, chosen beneficiary, permitted Money path, fulfilment view |
| BUY-02 | Buy across shops | Add item from A and service from B, show one basket, seller-private requests/quotes, each seller confirms own obligations | Single customer-facing trade; distinct party acceptance, links, revisions and records |
| BUY-03 | Buy product + year service | Explicit 12-month service term, provider distinct from seller, start/duration/frequency/service exclusions | Service obligation persists long after product delivered; cancellation/dispute per specific commitment |
| BUY-04 | Delivery choice | If delivery already known never ask again; when unknown ask only required choices; optional combined transport NEVER blocks review | Verified provider quote and separate transport obligations (no invented capacity) |
| SELL-01 | Sell something | Signed-in Business authority, create/edit draft Offer, Publish, public Offer link and share, buyer inquiry, respond/quote, versions | Seller receives only its own items; accepts/declines; stock/terms saved in canonical API |
| SELL-02 | Receive buyer change | Inspect customer proposal, change quantity/delivery and quote, customer re-accepts material changes | Versioned Agreement; no old acceptance silently carried |
| COLLECT-01 | Collect money | Purpose, verified organiser/recipient, optional/required contribution, invited participants, consented share | Live Collection SecureLink, contributor-specific statuses and reconciled receipts |
| COLLECT-02 | Fund a purchase | Link collection to specific transport purchase, confirm provider and funding terms, track distinct contributions | Money directed only with permitted payment authority and purpose/consent |
| COLLECT-03 | Community KSh 1,500 monthly | Community authority, household/member association, consented external-channel notifications, period billing, reminder | Click-and-pay outside portal, verified callback, correct member/month, receipt, reconciliation |
| PAY-01 | Pay someone | Known payable obligation, beneficiary, fee quote, explicit instruction, callback/retry | No paid status without verified provider events; idempotent retry |
| CLIENT-01 | Shortstays booking | Unit photos/rules/dates/availability hold, booking SecureLink, guest/host acceptance | Shortstays booking status cannot become paid from mock adapter or UI click |
| HELP-01 | Ask KS001 | User opens basket and asks genuine question; KS001 knows authorised selected offers | Verified answers or honest unknowns; approved proposed changes only |
| RECOVER-01 | Interrupted trade | Browser refresh, expired link, changed stock, revoked role, failed supplier, retried webhook | No duplicate contracts, money dispatch or false records; clear next action |

## Intelligent Basket — product rules (approval dated 2026-11-17)
- Published Store **offer** has immutable source identity/version. Publication exposes an authorised offer via a Store/offer SecureLink; never equate publication with signed Agreement or stock reservation.
- Buyer basket composes references to many offers. It is not a new merged offer that destroys supplier attribution.
- Shop A receives only A's request; Shop B receives only B's. Service, transport and recurring commitments retain separate obligations and acceptance.
- Readiness button is grey ONLY for a requirement known to be mandatory for the next action. Ask at most one necessary question at a time; recommendations are optional. There are **separate** statuses for buyer proposal-ready, all parties accepted and regulated Money-ready.
- Buyer may ask KS001 about the basket without describing its contents again; entering a Store never requires chat.
- One customer payment is aspirational until partner-certified multi-beneficiary execution and accounting, refund and failed-provider outcomes. One-click cannot bypass user consent, seller acceptance, fee truth or regulated money custody.
- After acceptance, the same basket matures into a *Living Purchase*; do not clone records into another product.

## Current source evidence (inspected 2026-11-17)
- `src/mini/MiniBuyStore.tsx`: public Store searches; multi-offer local cart; rechecks exact seller/offer/price/quantity before asking KS001. New 17-Nov slice adds buyer fulfilment choice and an explicitly *proposal-only* review button.
- `src/mini/miniBasketReadiness.mjs`: conservative buyer-side readiness. It explicitly refuses to claim seller or payment authorization. `tests/mini-intelligent-basket.test.mjs` covers readiness, stale offers, services and cross-seller attribution.
- `src/mini/MiniFirstPartyKs001.tsx` and `src/mini/MiniSellerStore.tsx`: canonical agent and Store gateway; authorised seller Store. Mini's home Buy flow previously did not hand off into this existing session; this slice adds explicit optional contextual KS001 handoff.
- `src/mini/MiniCollectConversation.tsx`: LOCAL guided collection only, no real SecureLink or contributor payment.
- `src/mini/MiniBusinessSettings.tsx`: demo state; production Business records must use real API.
- `MiniRealStoreOffer`, `MiniServerCheckout`: preview-only sources; not legally completed payments.
- SecurePayAPI `contracts/openapi/market-store-v1.yaml`: Store publication and public reads are explicitly non-financial; cross-store persisted basket/sub-agreement orchestration is not specified there.
- Varsityville `ProcessRecurringBills.php` and `NotifyDueBills.php`: existing estate bills/reminders, NOT SecurePay SecureLink subscriptions.
- Shortstays `docs/SECUREPAY_ADAPTER.md`: mock-only SecurePay integration today. Never mark booking paid.

## Engineering disposition, next safe gates
1. **P0 backend contract**: server-owned basket lines/source version, revision/idempotency, participant scoped requests/response, optional verified fulfilment offers; no source identity loss.
2. **P0 frontend**: same Mini Store browse → add → basket → readiness → seller response/acceptance → Agreement → Money → fulfilment. On nonconfigured hosts fail closed; clear review/proposal vs paid states. No mandatory KS001 chat.
3. **P0 Sell**: default Sell handoff into canonical signed-in Business Store, not isolated sample draft; real publication gives shareable offer doorway.
4. **P0 Collections**: authorised beneficiaries, recurring schedule, outside-portal notifications, member-specific access, verified provider callback reconciliation.
5. **P1**: Shortstays and estate adapters to canonical API; keep their domain authority; My Ride/Storage require separate provider verification, no generic Store privilege.
6. Run focused API permission, Java21/Postgres, controlled payment-provider staging plus browser owner role tests, then Gate 10 20-person cohort; Gate 11 production only after gates 7-9 actually certified.

## Feedback record format
For EACH case capture: `caseId`, `testActor` (fictional/sandbox), `startingSurface`, `branch/commit`, `expectedHumanNextStep`, `visibleActualAction`, `persistedCanonicalIDs`, `providerCallbackEvidence` (when relevant), `failure/recovery`, `score 1-5`, `screenrecord/notes`, `owner`, `status PASS|PARTIAL|BLOCKED`. Test fixtures must never be represented as real balances or stock.

Current conclusion: these journeys are the product contract; code and staging evidence are NOT YET sufficient to mark BUY-02, SELL-01, COLLECT-03, PAY-01 or CLIENT-01 complete. Preserve Gates 7-11 and the approved Mini design.
