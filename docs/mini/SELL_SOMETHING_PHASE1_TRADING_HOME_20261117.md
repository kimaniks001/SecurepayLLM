# Mini Sell Something — Phase 1 Trading Home

Date: 2026-11-17
Status: owner preview; not authorized Store publication, Agreement issuance or production ready.

## One seller home

Build on `feat/mini-sell-something-native-preview-20261117` (draft PR #325) and keep the approved Mini visual system.

At the top, the seller describes the offer in plain language, sets price and optional quantity, can request one relevant contextual suggestion, and may open **Add to or improve your offer** to see the Workspace-family tools. Tool shelf is collapsed by default.

After Review my offer, the seller finds:

1. **My Store**: open existing `MiniBusinessSettings` example at `store` (fictional, clearly labelled) on isolated owner-preview host; the production authorized Store remains `MiniSellerStore` and `StoreController` owned by the first-party Mini session. Never clone catalogue or authorization.
2. **Quick Contract**: a navigable Phase 1 entrance with two useful paths: prepare a seller offer with People tool; browse Stores for a current offer. No stale prior Agreement reused as acceptance, no SecureLink created.
3. **My People & Favourite Stores**: a navigable Phase 1 entrance to browse Stores or prepare an offer with People. No fictional friends/favourites presented as real, and no personal contacts copied from device.
4. **Store Settings**: existing sample Business Settings area, with an explicit return to Sell. Subscription, community and billing settings remain demonstration only.

## Routing safety

The owner preview must run only when `miniTradeDemo=1` on the existing allowed owner preview host (`isMiniExperiencePreviewHost`). A Store/Settings roundtrip keeps the original seller form mounted instead of discarding a half-written offer. Real first-party Mini's existing seller route remains intact and continues to verify account/Business authority and Store reads through canonical gateways; no new payment capability.

## Engineering scope

Phase 1 contains **navigation, information architecture and preview integration**. Canonical Store owner publishing and conversion of seller drafts into versioned source offers belongs to subsequent phases. The Quick Contract/Favourites entry points are functional navigation to existing browse/person tools but do **not** imply persistent favourites, prior Agreement template fetching, automated invitations, or real contract creation.

## Acceptance

- Enter Sell Something from isolated Mini owner preview, confirm one collapsed tool shelf.
- Select My Store: existing Business sample opens, not a separate new Store engine; back returns to Sell with its previous draft.
- Store Settings: opens existing settings, back returns to same draft.
- Quick Contract: start with a person opens the People tool; browse Stores opens the existing Buy Store surface.
- My People & Favourite Stores: browse or prepare an offer; no invented records.
- Existing Buy Something and Money remain untouched.
- Run focused Mini prebuild tests, TypeScript, Vite preview build and human review before merging.
