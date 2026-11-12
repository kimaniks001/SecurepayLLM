# M5B — Seller Store management and buyer refresh in the SAME Mini
**12 November 2026** · **Code candidate** · Production untouched · Real backend acceptance blocked.

## What is genuinely implemented
1. **Seller in Mini:** from the existing **My SecurePay** account expander, choose **My Store**. This is `MiniSellerStore` using the already-existing `createStoreController`, `createStoreGateway` and `createBusinessGateway`; no new Store domain or hidden KS001 AI. A person's own Store is accessed separately from businesses they are **currently authorised to represent**. `business.mine` is informational, then `business.representation(businessKsNumber).canActFor` is rechecked on entry and before explicit business updates. All protected writes still need SecurePayAPI authorization.
2. **Published details:** the seller reviews the current backend offer, edits its displayed price, published quantity and availability using the canonical StoreController builder/update functions, then checks the refreshed result. A separate **Confirm this listing's availability** invokes the existing availability-confirmation method. An update/confirmation **does not** reserve stock, create an order or accept any buyer's proposed price.
3. **Business delivery information:** only where the existing business Store fulfilment API is available, the represented seller reads and explicitly publishes `deliveryAvailable`, `leadTimeHours` and `fulfilmentConditions` against that business's exact offer ID. The backend record and version are re-read/returned. This is **general published delivery capability, not delivery for this buyer**. Personal Store delivery terms have no corresponding endpoint and are therefore **not invented**.
4. **Seller consent remains distinct:** seller can open the existing **Invitations for me** and `RecipientController` from the same Mini. Reviewing the invitation, Joining, and confirming the **exact current Agreement version** are separate actions, with the current version hash and account authority checked by the backend. The current M5B seller listing editor never calls `confirmVersion` itself.
5. **Buyer final check:** `MiniBuyStore` already verifies current public Store offers before presenting a buying plan. M5B now **repeats the identical verified offer comparison at the final “Discuss with KS001” tap**, using `miniStoreOfferSnapshotFresh`: seller KSNumber, exact offer UUID, title, version timestamp, price, currency, availability, available quantity. If anything changed in the interim, the old review is invalidated and no buyer message is sent. The user must reopen/review the current seller listing.
6. **Preview only:** sample **Njeri** is authorised to manage the fictional sample business `KS002`; sample **Amina** is the buyer, with no authority to update Njeri's Store. Other fictional store `KS003` remains unmanageable by Njeri. Published synthetic edits propagate to Amina's public Store reads within this browser tab. The preview `HttpClient` cannot contact real endpoints and denies unknown Money or inventory operations.

## What remains out of scope
- A seller's published quantity/price **is not a buyer-specific quote** and does not automatically alter a proposed Agreement version. The exact seller commitment (including delivery date, service, buyer, amount and exceptions) still requires the normal Agreement invitation and amendment flow, independently accepted by both parties.
- The Agreement commercial-source binding presently supports one canonical Store source. An authoritative multi-Store plan with separate seller obligations and source version locks remains M5 follow-on work.
- No genuine KS001 model, staging DB/identity, API integration, payment rail, regulated custody or delivery provider is certified here.
- No actual Money, stock reservation, invitation sent to real parties, seller-specific booking or real Agreement created.
- **Release decision:** M5B code candidate only; human visual approval plus isolated staging evidence before a production GO.

## Source and focused tests
- `src/mini/MiniSellerStore.tsx` — minimal on-demand Store management and seller-to-invitations transition.
- `src/mini/MiniFirstPartyKs001.tsx` — one My Store doorway, same first-party session and original Mini shell.
- `src/mini/miniInteractiveDemo.ts` — synthetic owner-scoped Business and Store endpoints, with zero real network requests.
- `src/mini/miniStoreOfferFresh.mjs`, `.d.mts` — identical source-consistency predicate for first Store check and final buyer handoff.
- `src/mini/MiniBuyStore.tsx` — narrow second check on final Discuss with KS001 tap.
- `tests/mini-m5b-seller-review.test.mjs` — nine focused owner/permissions, business representation, seller edit, buyer refresh, delivery, availability, refusal and stale-click cases, in addition to 91 existing Mini tests.

## Review in the visible preview
1. Open `mini.html?demo=1`, select **Njeri · Seller**, open **My SecurePay → My Store**.
2. Choose the represented sample business **Njeri Events KS002**. Open the published chair offer. Adjust **displayed price** or **quantity** (e.g., 25 → 18), then **Update published offer**. Reopen and deliberately **Confirm this listing's availability**.
3. Open the offer again to publish general delivery information. This does NOT accept Amina's order.
4. Switch to **Amina · Buyer**, **Browse Stores**, search `chair` and inspect Njeri's updated price/quantity. Check her current offer before sending a buying-plan request to KS001.
5. Switch back to Njeri, **My SecurePay → Invitations for me** to independently Join and confirm the Agreement's exact version. A separate sample Agreement exists only to demonstrate this permission; the published Store update is not silently applied to it.

This remains one SecurePay Mini, not another app or another assistant.
