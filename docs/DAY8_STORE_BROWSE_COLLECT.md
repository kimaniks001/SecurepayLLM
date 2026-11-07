# Day 8 — Digital Stores: browse, collect, then decide

**Purpose:** Correct the owner-observed shopping friction. Selecting a shelf item must never replace the catalogue just to show one product. This implementation builds on the **approved SecurePay Living Workspace and Store controller**, not another Store layout.

## Human shopper experience

1. The Store opens to clear **Shop · Sell something · My Store** and a wide catalogue of goods and services.
2. Hover over an offer on desktop or tap **Quick look** on a touch device. Read its relevant details without leaving the shelf.
3. Choose **+ Vision**, **+ Agreement**, or **Add to KS001 question**, still without navigating. An item may appear in Vision *and* Agreement as two different intentions, never one duplicated payable order.
4. **Your shopping collection** sits at the right on desktop. There, edit quantity, remove a mistaken selection, and compare separate listed-price subtotals for Vision and Agreement. If no fixed price is established, say **Price to confirm**; don't guess. Mixed currencies remain separate. Never add Vision and Agreement subtotals together as a single checkout figure.
5. **Full item details** and **full seller photograph** open only when the shopper chooses them.
6. **Prepare with KS001** places a bounded, human-readable draft into the existing authoritative KS001 composer. **Review in Vision** places a thought into the current Vision composer. Both preserve existing unsent user drafts and refuse to overwrite them. The shop remains open until the person chooses to enter another workspace.
7. In the compact three-panel view, show the same read-only provisional item summary in the **existing SecurePay Check** right side; use **Edit selections in full shop** to return to the editable basket. Avoid duplicating baskets beneath the constrained catalogue.
8. When a person returns from a voluntarily opened full item page, the collection still lives inside StoreExperience. The original search, management, enquiries and message drafts remain under their established controllers.

## Truth and safeguarding

- The **collection is ephemeral UI state**. It is not an order, checkout cart, shopping basket with guaranteed stock, saved Vision Dream, person identity verification, accepted Agreement or payment. No new Store or separate AI backend has been created.
- No fake per-item price, delivery estimate, exchange conversion, seller badge, source proof or availability is invented.
- A listed fixed KSh/USD/etc amount may be summarised as an **indicative seller-listed subtotal** with quantities. If unavailable, from/range, quote required, unit-price or unparseable, it is excluded and flagged. Quantities are capped. The actual trade price must be confirmed and verified.
- Server-owned source IDs and seller references are carried as quoted **unverified discovery context**, not source-authorised Agreement mutations. KS001 must re-verify every offer before creating Agreement terms; each independent seller may require a separate Agreement.
- Neither adding an item nor choosing to stage it auto-sends an AI turn, rewrites a different unsent draft, calls a provider, creates a Dream, publishes an offer, opens a financial rail or reserves goods.
- For the explicit preview route, source is the existing example catalogue only; KS001 selection is a **guided example**, not a real call. Real Store passes current API-sourced offers, not demo fixtures.
- Account sign-out clears the signed-in Store's private collection and right-side copy. Signed-in real Store handoff requires existing KS001/Vision session authority and consent.

## Focused acceptance journey

**Buyer:** browse CCTV, hover; add to Agreement; browse painting, add to Vision; add another to Agreement; check distinct totals; adjust quantities; go to compact Workspace view; see selected summary on SecurePay Check; return to Full shop; open full photograph deliberately; select a listed offer and choose Add to KS001 question; check that KS001 composer contains an **unsent** request with seller and offer references and that the catalogue stayed open.

**Risk:** unknown price, mixed currencies, duplicate click, 12-item limit, max quantity, unpublished offer, unrelated unsent KS001/Vision text, sign out, Store search error, direct item route, responsive tap, working seller enquire route, independent Store management.

**Rollout:** isolated owner preview and draft GitHub PR only. Real multi-offer server-side Agreement creation, saved Vision assets, financial rails and production release are not authorised by this UI feature.
