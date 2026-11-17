# Mini — phone-first Store browsing and Living Purchase handoff
Date: 17 November 2026
Status: isolated owner-preview UX implementation, **not** production completion, API acceptance or payment certification.
Owner feedback: the earlier Store looked like a warehouse, felt dead, and required too much manual checking; the desktop stays deliberately phone-width for now.

## Experience — one path
1. `Buy something` opens **Discover**, not a KS001 conversation or a technical Store list. Store names, place, actual offers and images/visual identity appear naturally.
2. Enter a Store. An expressive header is followed by a **2-column grid** showing **Everything / Goods / Services**, with source-owned items and prices. A customer may open details and browse other currently published offers from that Store.
3. Select an item; see a clear title, description, price basis, availability caution and stepper for quantity; tap **Add to basket** without immediately leaving the shop. When selected, a pill on that card and persistent basket count show exactly what has been picked.
4. Move to another Store. The same buyer basket keeps distinct source references and seller obligations; no synthetic seller merger.
5. The basket shows thumbnails, real selected quantities, prices/subtotal or "price to agree", and **the next genuinely necessary human choice**. For physical goods, receiving preference may be required. Optional additional services must not block proceeding.
6. Offer availability/version is rechecked **quietly** when the basket is ready for review. If stale or unreachable, fail closed and explain simply; provide retry. No extra compulsory "Check sources" button.
7. When required human choices and freshness checks are satisfied, enable **Ready to continue? Review your choices**. Explicitly ask whether to proceed to an Agreement. Every seller's exact obligations and acceptance are independent.
8. A **reviewable SecureLink** can be shared once the canonical backend seller-scoped invitation/Agreement operation is connected. The user never must chat with KS001 first. KS001 stays a discreet help route, including from the basket.
9. Money is *not* activated by review, publication or a fake acceptance. Only exact accepted version + authorised regulated provider path + payment terms permit proceeding. Payment state must be based on provider evidence.
10. After funding confirmation, show an elegant **Living Purchase**: per-provider progress, delivery/appointments, recurring service obligations, evidence and support. Do not clone Agreements or claim all sellers share the same liabilities.

## Boundaries
- SecurePay Mini remains narrow phone-first in this phase. The larger desktop UI is a later, separate design question.
- SecurePay for Business is an authorised acting capacity; Store product/media/stock publication belongs to its canonical backend, not to Mini local state.
- Living Workspace is the deep work surface for *the same Agreement*, not another system to send the buyer to by default.
- KS001 is optional, context-aware, permissions checked; it cannot invent stock, book transport, accept terms or release Money.
- Shop photos come from authorised Store `mediaRefs` where possible; previews may use labelled **illustrative** Wikimedia Commons images or distinctive fallback illustrations. Every accepted photo needs an origin/permissions and correct media reference. A pretty picture is not stock verification.
- In current owner preview the seller-scoped send/accept and Money paths are a **fictional rehearsal only**. They never generate actual SecureLinks, initiate payment or emit paid receipts.

## Current code slice
- `src/mini/MiniStoreGallery.tsx`: merchant discovery, Store hero/visual persona, 2-column gallery, item detail, related goods/services, persistent basket bar
- `src/mini/MiniStoreVisuals.tsx`: mediaRef safety + fictional illustrative photo sources / fallback
- `src/mini/MiniBuyStore.tsx`: quantity-aware cross-Store basket; auto source check; optional help; confirmation next; sample owner-only seller-response and Living Purchase rehearsal
- `src/mini/miniTradePlayground.ts` and `MiniBusinessDemoModel.ts`: a richer fictional goods/services catalog for owner walkthrough, with owned data visible across the seller/buyer demo
- `tests/mini-mobile-store.test.mjs`: phone, source, basket, auto-readiness and safety checks

## Mobile owner acceptance
Score on a phone viewport, not a wide desktop: **first impression; store character; browse curiosity; clarity of product detail; sense that selected goods are safely piled; next reasonable question; optional KS001; offer review; clarity that acceptance != payment; Living Purchase after funding**. Capture screen recording, expected vs observed action, factual screenshot, and 1–5 score for each. A Vercel READY build + TypeScript is not human usability acceptance.

## Illustrative sample image acknowledgements
Images are illustrative, never pictures of real available stock. Their source URLs are Wikimedia Commons `Special:FilePath`, and exact author/license must be verified and recorded before any production reuse; sample credits shown at item detail:
- Solar water pump and well — Shailsh Telang
- Mini irrigation system for gardens — Chinmayee Mishra
- Cement bags — StaraBlazkova
- Garden hose — Nandhp
- Tractor on a field — Sanzzu
- Stacked chairs 01 — Kritzolina
- Foco Solar / Solar street light — Wikimedia Commons; attribution/license requires verification

## Next backend engineering gate
Implement canonical persisted buyer basket, seller-specific request SecureLinks, authoritative acceptance of versioned obligations, single-or-multiple provider-backed funding path and per-beneficiary reconciliation, then retrieve a single coherent Living Purchase after funding. Until these gates are certified, the presentation may show only correctly marked sample stages.
