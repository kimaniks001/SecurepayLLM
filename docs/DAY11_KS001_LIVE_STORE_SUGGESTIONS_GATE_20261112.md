# Day 11 — KS001 contextual Store suggestions: real sources, locked workspace
2026-11-12 · implementation candidate; **NOT production certified**.

## Owner design locked
The Workspace remains the three-panel masterpiece. KS001 is always the same conversation; the Store tool and original seller Store open within the original middle view when the buyer deliberately clicks **View Store**. The Store/cart/Agreement/Money engines are unchanged. Ask KS001 suggests only when relevant, never advertising as part of a basic Store.

## What was implemented
- `suggestedStoreSearchTerm.mjs` is a small conservative interpreter for **explicit** shopping language, extracting only a bounded product/service phrase from the latest *user's* sent question after a completed KS001 reply, not conversation secrets, KS account numbers, address or an AI claim.
- `Ks001StoreSuggestions.tsx` calls **existing public `StoreGateway.search`** for PRODUCT/SERVICE with the parsed phrase and displays at most 3 real, distinct seller Stores, published item name/location/price plus **stock unconfirmed** language. No adverts, sponsored ranking, fabricated prices, invented distance, false stock, guaranteed availability or forced human helper.
- `LiveKs001Session.tsx` includes those source cards in the existing KS001 chat scroll only after a real completed assistant reply, without altering the server conversation or introducing a new chatbot.
- `Phase1LivingWorkspacePreview.tsx` routes `View Store` to the existing `expandCompactStore({kind:'store',storeKs})` (original middle Store); `Search more Stores` to the existing left `CompactStoreBrowser`. Both retain original cart and conversation controller. Only active signed-in Store-integrated workspace receives card actions; no previews of demo sellers as real.
- `tests/day11-ks001-store-intent.test.mjs` covers explicit vs irrelevant/private terms. **Not run here.**

## Remaining gates
- Verified live API response / mobile layout acceptance and real KS001 behavior.
- Confirm no duplicate search storms, lost chat drafts, broken tool focus, stale Store offers or confusing multi-store consent.
- Real embedded third-party **Ask KS001** mini widget needs to reuse the *same* suggestion component/source contract in its own host, and the approved compact Mini branch must be reconciled without copying another shopping engine.
- Canonical buyer/seller Agreement authority and seller confirmed order still need the next API integration gate. Public Store search alone does not make an Agreement.

Run: `node --test tests/day11-ks001-store-intent.test.mjs`, `npm run typecheck`, focused browser signed-in store session tests, then approval/staging. No production or Estate change in this branch. **No CI/build/end-to-end executed in this session.**
