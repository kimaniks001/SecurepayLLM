# UI Completion — Phase 2: Discovery, Finding & Commercial Sources

Branch `feat/ui-phase2-discovery-finding` · UI-only · SecurePayAPI **read-only, not modified** · Not merged, not deployed.

Purpose: when the person does **not** already know who or what to use, SecurePay opens the real discovery experience inside the same conversation — intention → find on SecurePay → real results → inspect → compare facts → choose → **Use this** → source reference → the same conversation → an agreement taking shape. SecurePay helps people see what is real; **the person chooses**.

---

## A. Phase 1 starting state (verified)

- PR #27 had **merged**; its final head `15cf7ed` is in `main` (merge `30a395b`). Phase 2 branches from that main.
- Re-ran Phase 1 (`ui-phase1`: 53 tests), agent (29) and store (40): all passing before any change.
- Instrument architecture, actionable UNDERSTOOD, KSFinder-as-Add-person, the `objectEntityId` correction, and uncertain-delivery semantics all present. SecurePayAPI unchanged at `75a490bc`. The developer's local Vite proxy (`vite.config.ts`) remains an **uncommitted** local change and is not in any commit.

## B. Discovery capability matrix (from SecurePayAPI source)

| Capability | Backend tool / API | Inputs | Outputs | Authority | Real filters | Missing filters | Frontend before | Phase 2 experience | Limitation |
|---|---|---|---|---|---|---|---|---|---|
| Find services / people | `search_securepay_providers` → `JdbcMarketDiscoveryAdapter.searchProviders` → `StoreService.searchPublishedOffers(SERVICE,…)` | `category` (text), `location` (text), `limit` (≤10, default 5) | `{supported, providerCount, providers:[{providerRef, displayName, serviceArea, matchingCapabilities[]}]}` (component `PROVIDER_RESULTS` kind=PROVIDERS) | `READ_MARKET_DATA`, read-only, factual; recency order | words in an offer's **title OR description** (ILIKE), store place label (ILIKE), ANDed | availability, price, rating, distance, capability taxonomy; **no offer id** | generic label/value rows | People-to-consider cards: name, KS reference, place, "published a service: …", "shown because…", **See what they publish** | `providerRef` is the canonical KS reference (participant-visible) but cannot be attached to Trade Context (Phase 1 KS-format gap) |
| Find Store listings | `search_securepay_store_listings` → `searchStoreListings` | same | `{supported, listingCount, listings:[{providerRef, displayName, title, priceMinor?, currency, availabilityState}]}` (`PROVIDER_RESULTS` kind=STORE_LISTINGS) | same | same | image, description, quantity, **offer id** | generic rows | Result cards (text-first) → **See what they publish** (Store with real ids) | **No offer id**, so an Agent listing cannot be selected as a commercial source directly |
| Provider profile | `get_provider_profile` → `getProviderProfile` | `providerRef` (KS) | `{providerRef, displayName, found, serviceArea, about, services[], products[]}` (offers: title, description, priceMinor?, currency, availabilityState) | ACTIVE identities only; else `found=false` | — | rating/reviews/history (do not exist) | generic rows | Profile card with published services/products and prices | no offer ids in profile offers |
| Comparison | server composes `PROVIDER_COMPARISON` when ≥2 profiles were read in a turn | profiles | `{profiles:[…]}` | tool-derived only | — | — | generic rows | Facts side by side (Seller, Place, Services, Service prices, Products, Product prices) | no scoring; not model-authored |
| Price context | `get_price_context` → `publishedPriceAggregate` | `category`, `location` | `{category, location, unit, lowMinor, highMinor, medianMinor, currency, sampleSize, sourceType, asOf}` | tool-derived | text match on title/description; place | — | generic rows | Price-context card: range, median (only when >2), **sample size as the headline**, "too few" warning, "not a quote" | `currency` is **hard-coded "KES"** by the backend; median is interpolated; SERVICE first, PRODUCT fallback |
| Service location | `resolve_service_location` | place text | `{normalizedPlace, recognized, matchingListingCount}` (no component) | read-only | — | coordinates, distance, nearest | none | none (prose only); place text is used only as the Store `location` filter | No geocoder, coordinates or distance exist. **No map, pin or "km away" is shown anywhere.** |
| Standalone Store search | `GET /api/v1/stores/search` | **required** `kind`, `category`, `location`, `limit`≤10 | offers **with real ids**, media refs, availability, quantity | public, no auth | as above | availability, price, sort | Bolt `OfferCard` grid | Same `ResultCard` and semantics as Agent discovery | `category` is title/description text, not a category column |
| Public Store / offer | `GET /api/v1/stores/{ks}` / `…/offers/{id}` | KS / offer id | profile + offers | public | — | — | Bolt profile/detail | Store page in the finder; offer detail cleaned of the empty photo panel | no offer version/hash (as-of date only) |
| Commercial source selection | `POST /api/agent/conversations/{id}/commercial-source` → `DefaultCommercialSourceSelectionPort` | `{sourceType, sourceId, sourceOwnerKsNumber}` (pointer only) | captured title/price/currency/availability/description/contextReference | **only `STORE_LISTING` is selectable**; other `CommercialSourceType`s fail closed | — | provider/service *profile* as a source | wired for Store "Use this" only | **Use this** from the finder and the standalone Store: same path | idempotent replace; requires a real offer id + owner KS |
| Source lifecycle | handoff `reviewedSource.sourceStatus` CURRENT / CHANGED / UNAVAILABLE, `useCurrentSource` | — | captured vs current facts | backend-owned | — | — | text notice in the review card | Shared **SourceReference**: "Selected earlier" / "Current listing"; calm unavailable note | not visually exercised end to end (see W) |

## C. Real Store search capability

`GET /api/v1/stores/search`: `kind` (PRODUCT \| SERVICE, required) + optional `category` text + optional `location` text + `limit` 1–10. `category` matches **`title ILIKE` OR `description ILIKE`** of a *published* offer (not a category column); `location` matches the **store's** `location_label`; both are ANDed; ordered by `updated_at DESC`; availability is **not** filtered (unavailable offers appear). The finder therefore asks for **a kind, a word, and an optional place** and says exactly that.

## D. Unsupported Store criteria

No size, colour, budget, brand, rating, distance, availability or price filter exists. "black size 42 shoes around KES 4,000" is therefore **never** presented as satisfying size/colour/budget. The whole phrase is one ILIKE substring, so a multi-word phrase usually matches nothing; the finder says so and offers **one-word retries** the person chooses (no automatic broadening). What the person already said stays in **UNDERSTOOD** (Trade Context), and the results screen states: *"SecurePay searched only for the words above. Your other details — KES 4,000 — aren't search filters, so check them on each listing."* The real listing description ("Black, sizes 40-44") is shown so they can check for themselves.

## E–G. Provider search, profile, comparison

Rendered strictly from the server payload (see `api/securepay/agent/discovery.ts`): only the fields above; a field outside the contract (rating, verified, score, avatar) can never surface (test-enforced). A malformed entry is dropped and counted; a wholly malformed payload is ignored while the Agent message survives; `PROVIDER_COMPARISON` needs two real profiles. **Unsupported** (`supported=false`: "SecurePay can't search … right now") and **empty** (`supported=true`, none: "looked … and found nothing matching that") are different states. Order is the backend's (recency); nothing claims it means quality, and there is no "best/recommended/top" anywhere.

## H. Price context

Range with each endpoint carrying its currency, "Median" only when more than two listings exist, and **"Based on N current SecurePay listings" as the evidence line** — never "market price". With 1–2 listings: *"That's too few to treat as a range — it only shows what two sellers have published."* NO_DATA: *"SecurePay has no priced listings for this yet."* Always: *"Information only — not a quote, and not an agreed amount."* + calculated date. Money is formatted from minor units with integer arithmetic (BigInt), never float division.

## I. Service location

Place text only. It is used as the Store `location` filter and displayed as the seller's own words. There is no map, pin, distance or "nearest" (the backend has none). GPS/map remains a later phase needing a backend fact.

## J. Discovery instrument architecture

`src/features/discovery/`
- **`controller.ts`** — one union state: `closed → form → searching → results | empty | failed → detail → comparing`, plus `loading-store → store`, `source-selecting → source-failed`. `back` is a stored state, not a boolean. Stale responses are ignored; a failure keeps the query and Retry repeats exactly it. Extensible to Community/Opportunity.
- **`result.ts`** — ONE `ResultOffer` model for Store search, a Store page, the standalone Store and Agent listings (each field real or absent), plus `compareRows` / `profileRows`.
- **`ui/DiscoveryHost.tsx`** — the surface; **shares `SurfaceShell`** (desktop anchored panel in the UNDERSTOOD column / mobile bottom sheet, focus trap, Escape, keyboard inset) with the Phase 1 instruments, which were refactored onto it. One contextual surface at a time.
- `ui/ResultCard`, `FactCompare`, `PriceContext`, `FoundOnSecurePay`, `SourceReference`.

Entry points: (1) **UNDERSTOOD WHAT row → "See on SecurePay"** for a real ITEM/SERVICE (kind from the entity type — PRODUCT/SERVICE — never guessed); (2) "Add a detail → **Find on SecurePay**"; (3) inside **Add a person** the two-way choice **I know who / Find on SecurePay**; (4) conversation: the Agent's discovery components appear as *Found on SecurePay* (a compact transition chip in BUILD that focuses the section; results are never buried); (5) a result's **See what they publish**; (6) the standalone **Store**.

## K. Known person vs find someone

Two paths, told apart at a glance and never merged: **I know who** (Add a person by name and role — Phase 1) and **Find on SecurePay** (this phase), as a segmented choice at the top of *Add a person*, and reciprocally "Already know who? Add them by name instead" in the finder and empty state. KS resolution remains unavailable (Phase 1 finding).

## L. Found on SecurePay

A separate epistemic section from "what SecurePay understands": the latest turn's discoveries open; earlier turns collapse under "Earlier in this conversation · N". One restrained line: *"From this conversation, shown from current listings. SecurePay doesn't rank or choose for you."* Started-from provenance lives in UNDERSTOOD, not here.

## M. Store result design

Text-first, no image slot unless the offer has **real media on the one trusted origin**: small-caps kind, a display-serif title, seller · KS reference, price in large tabular figures, availability as a *word plus a neutral dot* (never a colour-coded preference), the seller's place. The whole card opens the offer (one stretched real button); "Compare" is a separate always-visible checkbox (no hover-only actions). No rating, verified badge, discount, stock claim or fabricated image.

## N. Provider result design

Name, KS reference, place, *"Published a service: …"*, *"Shown because a service they've published matches your search."* and **See what they publish**. No avatar, score or endorsement. Profiles list real published services/products with price and availability.

## O. Source selection (Use this)

"Use this" = **select this real Store offer as this conversation's commercial source** (`selectCommercialSource`, `STORE_LISTING`, real offer id + owner KS), then return to the conversation. Copy under the button: *"Starts your conversation from this listing. Nothing is bought, joined or agreed."* The source-derived price is submitted as a **candidate** only (existing `useOffer`). Unavailable/unpriced/closed cases: a closed offer's button is disabled with the seller's own state; an Agent listing (no id) has no Use this and leads to the seller's Store. Success closes the finder; UNDERSTOOD shows **Started from**.

**Failure:** calm, recoverable, source-specific wording (`sourceErrorText`: "couldn't reach the Store just now. Trying again is safe" / "may have been unpublished"), with **Try again** and **Continue without this listing** and the consequence stated plainly — *"the conversation then won't be attributed to this listing, though its price stays as a suggestion you can review."* Nothing from the offer is submitted while selection has failed (test-enforced). The same note appears in the conversation when the finder is closed.

## P. SourceReference / provenance

*Started from · SecurePay Store · Leather shoes · KS003 · Listed at KES 4,000 when chosen* — provenance, not endorsement or authority. It appears in UNDERSTOOD after selection and in the handoff review card (the same component). The label derives from the backend `sourceType` so Community/Opportunity reuse it unchanged.

## Q. Source changed / unavailable

Backend-owned (`reviewedSource.sourceStatus` + `current`; `useCurrentSource` already existed). `SourceReference` now renders **CHANGED** as *"This listing has changed since you chose it."* with **Selected earlier / Current listing** (price, availability) and **UNAVAILABLE** as *"This listing isn't available any more. You can choose another, or carry on with this conversation directly."* The frontend never reconciles. Tested by rendering; **not** exercised through a live handoff (needs a backend-recorded change).

## R. Standalone Store convergence

`StoreHome` and a Store's own page now use the **same `ResultCard`** (Bolt's `OfferCard` — image slot, "SecureLink" label — retired); the empty state and copy match the finder's; the offer detail lost its empty photo panel, the raw "fixed" label and the shield icon that read like verification. "Use this" runs through the **same** `useOffer` → `selectCommercialSource` → conversation path and shows the same *Started from*. Not changed (Bolt byte-identity locked): the intermediate `OfferToTradeHandoff` screen, whose primary reads "Continue to agreement" though it continues into the conversation (Phase 3 wording).

## S. Community / source reuse findings

`CommercialSourceType` already names `COMMUNITY_POST, OPPORTUNITY, REFERRAL, PLUG_INTRODUCTION, MASTER_PROFILE, SECURELINK, DIRECT`, but `DefaultCommercialSourceSelectionPort` **fails closed for everything except `STORE_LISTING`**. Community's "View offer" already routes into the Store offer (which then uses the Store path). Reusable now: the `DiscoveryController` phases, `ResultOffer`, `ResultCard`/`FactCompare`, the `SurfaceShell`, and a `sourceType`-driven `SourceReference`. Community-specific work waits for backend selectability.

## T. Prototype components

Reachability was **proved from the production bundle** (esbuild metafile): `ProviderCard`, `StoreProductCard`, `ComparisonView`, `ProductComparison`, `ProviderHistory`, `MapCard`, `PriceContextCard`, `ProviderQuoteCard`, `LocationPicker`, `ConversationWorkspace`, `ContextPanel` are **not reachable** — only the fixture app and byte-identity tests import them; a test now pins that. They were not deleted (those tests lock them). **Retired:** `OfferCard` (deleted; replaced by `ResultCard`). **Replaced in production:** the generic `DiscoveryView` rows and the Bolt `StoreHome`/`StoreProfileView` card.

## U. Backend capability gaps — not implemented in UI, not modified

1. Agent listing/provider results carry **no offer id** (or description), so they can't be selected as a source directly.
2. Store search: no availability/price/size/colour/brand/rating/distance filter; `category` is title/description text, whole-phrase; results capped at 10, recency-only.
3. Price context `currency` hard-coded KES; interpolated median; no per-currency handling.
4. Only `STORE_LISTING` is a selectable source (provider profile, Community, Opportunity, referral, Plug, Master, SecureLink fail closed).
5. No geocoder/coordinates/distance; `resolve_service_location` has no component.
6. `providerRef` is a platform KS (KS003) — displayable, not attachable to Trade Context (Phase 1 KS-format gap).
7. No offer version/hash (only an as-of date).
8. A source-derived amount is appended as a candidate next to the person's own figure (external-fact endpoints don't supersede), so two "KES 4,000" rows can appear.
9. `ACTION_CONFIRMATION` (conflicts) is still not rendered anywhere (pre-existing).

## V. Desktop verification (real production app, Chrome, 1440px)

Against a **scripted local mock** whose data and shapes follow the inspected contracts (Store DTOs, tool outputs, selectCommercialSource) — the mock certifies layout and interaction, **not** the backend. Journeys exercised: **I** long natural intent → WHAT row "See on SecurePay" → honest empty state with one-word retries → "shoes" → real result → detail; **H** forced source failure → calm state → (BUILD-side note) Try again → *Started from*; **C/D-shaped** provider results → *Found on SecurePay* → "See what they publish" → the seller's real offers → compare two services; **E** price context with two listings; **F/unsupported** empty vs unsupported; unknown component ("newtype") with the message intact; **G** standalone Store → offer → Use this → conversation with *Started from* and a *Suggested* price. Fixes found by this: source failure used *turn* wording; "Services's" possessive; median wording; an empty photo panel; a stacked, ambiguous Found section (now grouped).

## W. Mobile verification

Real app in same-origin iframes at **375px and 320px** (real media queries): empty state, results, detail, **source failure → Try again → Started from**, provider results → Store → **comparison** (stacked fact groups, no horizontal scroll, legible at 320), price context and listing cards at 320, Escape from the page body closing the sheet, **no horizontal overflow** (document and sheet) at both widths, focus landing on the field/heading after each screen change. **Limits, stated plainly:** no physical on-screen keyboard was used (the `visualViewport` lift is unchanged from Phase 1 and unverified on a device); no screen reader was run; **CHANGED/UNAVAILABLE were not exercised through a live handoff**; Journeys A (KS003 = Phase 1 path) and D (place-only search) were covered by tests and the shared search form, not separately screenshotted.

## X. Accessibility

Sheet: `role=dialog aria-modal`, labelled by the screen heading, focus trap, Escape (also from the body), backdrop close, focus returned to the invoker. Every screen change moves focus to the working field or the heading (measured). Search/loading/empty/error are `role=status`/`alert`. Results are a labelled list of `article`s with a real heading button; compare is a real checkbox with a `Compare: <title>` name; radiogroup for kind; ≥44px targets; visible focus rings; state is a word, never colour alone; nothing is hover-only.

## Y. Tests / build

`tests/ui-phase2.test.mjs` — **31 tests**: money precision; strict payloads (real contract shapes; extra invented fields, malformed, unknown, unsupported vs empty); no fabricated metadata; profile/comparison/price context (currency, precision, sample size, thin data, no "market price"); store result mapping/trusted media/unpriced/closed; the search sends **only** the real parameters; empty/failed/stale/retry; Store-with-ids; compare cap; **Use this** = real `selectCommercialSource` (STORE_LISTING, real id + owner KS), candidate amount, failure/retry/continue-without, busy claims nothing; SourceReference CURRENT/CHANGED/UNAVAILABLE; workbench entry points; every discovery screen rendered as a real sheet; the "still to check" line; one shared surface shell; fixture components unreachable from production. Existing tests updated for intentional changes: a price-context fixture aligned to the real contract, `StoreHome` no longer baselined against Bolt, `OfferCard` removed from a doctrine-scan list.
Full suite: **23 files, 535 tests, 0 failures**. `tsc --noEmit`, `eslint .`, `vite build`: clean.

## Z. Recommendations for Phase 3

1. Agreement review / handoff experience: adopt `SourceReference` end to end (exercise CHANGED/UNAVAILABLE with a real handoff) and fix the "Continue to agreement" wording.
2. Ask the backend for: an **offer id (and description) on Agent listing/provider results**, a discovery `availability`/`price` filter, per-listing currency in price context, selectable Community/Opportunity sources.
3. Community/Opportunity discovery on the same controller/`ResultOffer`.
4. Location/GPS once a backend fact exists.
5. Retire the fixture app and its locked components; render `ACTION_CONFIRMATION` conflicts.
