# Mini Buy Something — Human Usability Engineering Pass
**Date:** 17 November 2026
**Scope:** phone-first Mini Buy Something, preserving the user-approved Store, Intelligent Basket, review, rail and Living Agreement designs.
**Status:** code review + deterministic task-path regressions + preview build. **No live human phone clickthrough has been certified as passed.** This is not a claim of real Money provider, merchant response or 12-principle certification.

## Customer-facing True North
The customer finds a Store they enjoy browsing, adds what they need, sees the growing basket, answers only an essential next question, reviews the Agreement, chooses the appropriate SecurePay action (Send SecureLink / Connect to Money when eligible / Save for later), selects Choice Bank → M-PESA → PesaLink for the simulated rail, and returns to see what the now-living Agreement needs. On a phone, nothing should require knowing the concepts of source version, work item, rail implementation, consent packet or Fair Trade audit. KS001 is a voluntary deeper companion.

## Audit and implemented fixes
| Customer task | Friction discovered in code | Source-level repair | Evidence |
|---|---|---|---|
| Find a Store | Search and Store loading could blank a section or leave errors at the bottom | Loading/empty/error/retry inside discovery; distinguish `Opening Store` vs `Finding Stores`; retry the failed Store | `MiniStoreGallery.tsx`, `MiniBuyStore.tsx` |
| Browse goods/services | Product image failure could persist on another item; basket count and category clarity | Key photo by exact item for fresh image fallback, clear add confirmation, honest full-basket warning | Gallery |
| Choose quantity and carry on | Unconditional invalidation of delivery after service-only changes | Keep selected goods receipt preference and existing delivery mini contract on service-only edits; invalidate delivery terms on changes to goods that affect the delivery obligation | `MiniBuyStore.tsx` |
| Move between screens | Mini remained scrolled far down because Buy's internal Store/Basket/Money views weren't top-level Mini screens | Reset scroll on internal navigation; jump to review when review begins | `MiniBuyStore.tsx` |
| Understand cost | Basket used KES while Store used KSh | Consistent Kenyan KSh format | `MiniBuyStore.tsx` |
| Recover a changed Store offer | Repeated `Check again` couldn't repair a stale price or quantity | Show old/new price and current stock; let buyer explicitly accept updated offer, reduce quantity or remove item, or return to Store; no silent term migration | `miniChangedOffers.mjs`, Buy |
| Keep work for later | Save was only in Agreement review | Make Save for later available in basket with feedback and a safe Return to Mini option | Buy; session-only sample save |
| Maintain clarity | Fair Trade examination had multiple phone screens | Preserve previous three-line `Understood / Needs attention / Next` check; deeper WWWWWH/12-lens view opt-in | Prior PR #322 remains intact |
| Finish a trade | Seller conditions and buyer answers were lost when it became a funded sample Living Agreement | Carry version-bound proposed terms and reviewed sample provider replies into My Agreements; group responsibilities by provider; link delivery's separate mini Agreement | `miniTradeTerms.mjs`, Money and Living Agreement |
| Avoid wrong delivery allocation | A merchant providing only maintenance could be counted as a courier | Allocate delivery charge only to the actual provider(s) in linked delivery mini Agreement(s); no second payer debit | `miniSampleLivingPurchases.mjs` |

## Shared foundation for Sell Something (implemented pure packet, not a Seller UI)
`miniSellerScopedProposal(lines,terms,deliveryContracts)` produces independent merchant packets with each seller's KSNumber, exact Store offer ID, published update timestamp, quantity, displayed price/currency, buyer-proposed terms and clarified seller-owned terms, while making carrier responsibilities separate. It explicitly declares `moneyReady:false`; seller response and real Money permission must come from canonical SecurePayAPI.

The following is the NEXT Sell phase, **not complete or claimed here**:
1. The seller can discover/respond to *their own* offers and proposed terms without another merchant's private details.
2. Seller sees a human summary, can clarify, quote, counter, accept or decline the exact version. No buyer impersonation and no acceptance by default.
3. Every material counteroffer/version change returns for buyer consent. Delivery carrier accepts *its own* mini contract.
4. Each accepted Agreement and linked fulfilment obligation feeds the same Living Agreements and certified Money authority. No second seller-only Fair Trade implementation.

## Next genuine human-phone acceptance gate (NOT YET PERFORMED)
Use the owner-only Vercel preview on an actual phone, one journey at a time. Record whether the person can finish without prompting, any tap that surprised them, confusing copy, scroll-to-nowhere, missing controls and time lost. Suggested scenarios:
- Browse two Stores and add goods; verify selected markers, quantity stepper, total and one-tap basket.
- Add a maintenance service from another Store and resolve a source-grounded question; KS001 remains optional.
- Choose collection, then try separate Store delivery and combined delivery; inspect the linked mini Agreement's provider, pickup, destination, window, charge and consent.
- Save unfinished work, leave, return and reopen; the resumed basket must recheck Store prices, source versions, replies and acceptance permissions.
- Simulate accepted Store responses and choose Choice Bank, M-PESA or PesaLink; verify payment pending then mock provider confirmation and Living Agreement entry without any real payment.
- Modify a published sample Business offer while another basket holds the old version. Check that the shopper sees exactly what changed and chooses whether to accept a new price/quantity.
- Repeat at 320px, 375px and 390px with keyboard-only and one-handed use. No forced horizontal scroll, 44px-class primary tap targets, visible focus, no dead-end.

**Acceptance threshold:** Every scenario should have one obvious next step, no silent seller assent, no impossible payment, no contradictory balances, no hidden unblock controls, and a return path from every step. A Vercel READY status or passing tests does NOT certify these physical-device human outcomes.

## Known unresolved implementation gates
- Real canonical **12 Fair Trade + WWWWWH Basket preflight** connected to SecurePayAPI AgreementSufficiency and versioned TradeContext. Current owner preview correctly says not assessed.
- Authorised real seller/carrier SecureLinks, replies and persisted Agreement versions, rather than fictional sample responses.
- Regulated Money provider certification/eligibility, callback reconciliation, release controls and real cross-beneficiary allocations. The sample rails and receipts are not transactions.
- Actual Sell Something screen adopting the shared packet and returning exact participant-owned answers. We haven't implemented Sell in this PR.
- Mobile owner acceptance and later 20-person acceptance, retained in agreed Gate 7–11 roadmap; no early move to broad testing.

This gate intentionally respects the compact Fair Trade design approved in PR #322, the distinct quick delivery mini Agreement, standard three rails and quiet onion-layered experience.
