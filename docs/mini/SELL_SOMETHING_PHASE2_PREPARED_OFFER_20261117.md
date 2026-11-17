# Sell Something — Phase 2: Complete Offer Preparation

Date: 17 November 2026. Status: **isolated owner preview only**. Phase 1's frozen Mini design, question-by-question answer pills, Store entry and buyer routes remain the base.

## Phase 2 experience

1. Seller describes something once. They may price it per unit or request a quote, and optionally give proposed quantity. Product/Service/Capacity are selected by short answer pills, with goods subcategories when relevant.
2. When needed, a collapsed tool shelf opens the existing Workspace-family description, local photos, local supporting document references, Places, the existing `buildTimingProposal` calendar, and People tools. These are proposals or local references, not independent verification.
3. A quiet examiner asks one relevant clarification with answer pills at a time (image source, permission, right to sell, availability); it does not fabricate stock or issue legal clearance.
4. Offer review shows one coherent human summary, unit basis and conditional proposed total. A folded **What's included in this offer** section reveals proposed timing, place, documented sources and unverified people.
5. Three distinct seller exits remain: share with buyer (preview only), add to Store (preview only), save for later. A saved draft can now be resumed from the seller entrance; only seller-entered non-file text survives the browser-tab save. All file bytes/names, third-party identities, raw photo data, private meeting notes and seller authority must be supplied or re-declared again.

## Source contract and authority

The pure local builder `miniSellerPreparedOffer.mjs` maps seller-controlled terms into an **unpublished candidate** matching the fields of `UpsertStoreOfferRequest` in `src/api/securepay/store/dto.ts`. It deliberately returns:

- `published:false`
- `availabilityState:'NEEDS_CONFIRMATION'`
- `quantityAvailable:null` (proposed sale quantity is NOT confirmed stock)
- `mediaRefs:[]` (a local photo is not a canonical media reference)
- `priceMinor` derived only from a valid stated amount, or null for a quote
- `description` only if seller-reviewed

The separate local `offerTerms` structure keeps proposed fulfilment, timing, person roles, and metadata for unuploaded local supporting documents and photos. It excludes private meeting details from the public Store candidate. It creates no authoritative source ID, version, SecureLink, live Store record, Agreement, invitation or Money action.

Actual store creation and canonical versioning must still go through the existing `createStoreGateway`, `createStoreController`, KSNumber identity/Business permissions, file ingestion and backend provenance in later phases. Do **not** treat this client-only adapter as a production Store write.

## Human acceptance points

- Start with just title, price choice and optional quantity; tool shelf stays collapsed.
- Open Describe and Present, switch between Goods, Service, Capacity and save edited seller-approved wording.
- Photo source -> supplier-use permission -> seller authority -> availability pills should resolve without typing.
- Add date from calendar, place and named person; their terms appear in offer review.
- Quantity of a proposed sale must not pretend to be published inventory; total shown as **proposed**, not payable.
- Show folded offer details, then choose independent share, Store or Save actions.
- Save, return to Mini, reopen and resume only text (not files, people, private directions or past authority).
- Existing Buy Something, checkout, production Mini and real Store records remain unchanged.

Focused tests: `tests/mini-sell-phase2-prepared-offer.test.mjs` plus prior native Seller and Buy suites. Run TypeScript and Vite build before accepting the preview. Phase 3 still owns actual Trust/Image Integrity service; Phase 4 owns authorized real Store flow.
