# Day 8 Digital Store convergence audit — 7 November 2026

**Scope:** SecurepayLLM front-end candidate `feat/day8-store-multishop-convergence-20261107`, compared against SecurePayAPI branch `feat/day7-community-provider-consent-20261107`. No production changes, payment activation, or live merchant contact. User's *shoe* was simply an example of any ordinary product: **do not invent a footwear Store**.

## Purpose and acceptance

A customer should be able to choose **any everyday good from Store A**, **a complex service from Store B**, then perhaps another offer from Store C; remain in one pleasant browsing experience; review quantities, seller identities and provisional subtotals on the right; state product specifications or service needs; consult the ONE existing KS001 assistant; and proceed only after fair-trade terms have been verified with the relevant traders. A multi-Store collection is *one shopping journey*, **not one authorised multi-party contract or financial checkout**.

We use the **existing iPhone listing** and **existing 3-bedroom interior painting service** as examples. No shoe business or category was created.

## Connections inspected and correction status

| Journey / system boundary | Finding | Resolution / status |
| --- | --- | --- |
| Catalogue to item quick add | Shared `ShopOfferCard` and `StoreHome` already preserved shopping selection. | **PASS** — unchanged identity, no new UI shell. |
| Catalogue to individual Store page | `StoreProfileView` still used old `ResultCard` without collecting/KS001 controls. | **FIXED** — same `ShopOfferCard`, same selection and quantity counts inside each seller's Store. |
| Individual Store and full item to right-hand selection | Basket only rendered by `StoreHome` when home view was active. Store controller navigation switched body and hid the collection. | **FIXED** — `StoreExperience` reuses one `basketPane` across Store profiles, offer preview/full detail, and trade review. UI-only example route mirrors this too. |
| Full item to shopping collection | `OfferQuickPreview` and `OfferDetail` had no add-to-Vision/Agreement controls. | **FIXED** — explicit actions use the same `collect` callback, without creating orders. |
| KS001 with several selected shops | Prior `quickAsk` passed just one item and could increase its quantity when already selected. | **FIXED** — stages existing agreement selections as one draft, groups by actual Store reference, and does not duplicate the clicked item. |
| Simple goods details | Store kept title/price but lost shopper's own variant, collection and delivery needs. | **FIXED** — separate editable buyer notes (size, colour, specifications, delivery) with listed price locked. |
| Complex services | Basket had just an offer label and price, not included/excluded scope or timing. | **FIXED where facts exist** — snapshots listed scope/timing + shopper's project requirements; real API currently cannot provide all these structured fields (see blockers). |
| Right SecurePay Check | Previously could only edit quantity/remove. | **FIXED** — buyer requirement notes can also be edited and feed the same source collection. |
| Cross-shop listed totals | Risk of mixing sellers, currencies and Vision with Agreement. | **PASS** — separate seller identities, Vision vs Agreement categories, currencies and honest quote-required amounts. Provisional only. |
| Third-party distributed offers | A Store could display an external supplier's offer even without a verified contracting-party KS. | **SAFER** — such listings cannot become Agreement candidates until real external seller identity is established. Vision remains possible. |
| Title and description search | Front-end comment claimed backend does not search free text. | **CORRECTED documentation** — verified SecurePayAPI `StoreService.searchPublishedOffers`: `category` is applied as an ILIKE match to the **offer title OR description**, while `location` matches Store location. Frontend fans out both independently across PRODUCT/SERVICE/CAPACITY. |
| Public Store API navigation | `GET /api/v1/stores/search`, `GET /stores/{KS}`, `GET /stores/{KS}/offers/{offerId}` support discovery and details. | **Source contract reviewed**, real authenticated end-to-end network test still required. |
| Multi-seller checkout or settlement | No safe "one payment to multiple traders" contract exists in this UI/API set. | **OPEN — deliberately not implemented**. One selection may require separate seller agreements. |
| Vision Dream persistence | Store can stage an unsent Vision thought, not a saved authoritative Dream. | **OPEN** — existing Vision save workflow is separate; do not claim Store items already persisted. |

## API-side evidence, not executed certification

In `kimaniks001/SecurePayAPI`:
- `services/securepay-core/src/main/java/ke/securepay/core/api/store/controller/PublicStoreController.java` exposes `GET /search` forwarding `category`, `location`, `kind`, and `limit` to `StoreService.searchPublishedOffers`.
- `services/securepay-core/src/main/java/ke/securepay/core/store/StoreService.java` has `title ILIKE categoryPattern OR description ILIKE categoryPattern` and an independent location match. Another cross-kind discovery method already accepts offset and a larger result limit, but is **not** yet the Store browser's own paginated navigation.
- `src/features/store/view.ts` currently fans out a typed query to separate category/title and location searches across three offer kinds; initial empty browse is **limited to 10 per kind** by frontend request contract. It cannot guarantee the entire published inventory is visible.
- `src/api/securepay/store/adapters.ts` maps backend offer data into `StoreOffer`, but the backend offer data has **no separate included/excluded scope, dates, milestones, obligations or structured service quote**. Example fixture services have richer structure than actual live ones. Never substitute fabricated scope.
- Both the Store API and KS001 have an existing single-offer provenance path. Server-side revalidation and per-seller Agreement creation from a multi-Store collection **remain pending**.

## Isolated validation

**Run gate:** `node --test tests/day8-store-*.test.mjs tests/day7-shopping-pleasure.test.mjs tests/p0-store-masterpiece-convergence.test.mjs && npm run typecheck && npm run build`.

Automated focused checks cover: product + service from different stores; different seller references; editable quantities, removal, buyer notes and locked prices; separate provisional totals; service included/excluded/timing; open Store profile/full offer and retain same collection; KS001 multi-seller grouping; external seller restriction; no order or money execution. **No browser click-through, live API integration tests or real payments have been run by this gate.**

## Before any live release

1. **Owner experience review** of the deployed candidate in the isolated Vercel preview: add a normal product (phone example) from Daniel's, add painting from Nairobi Painters, then visit Keyman Security and add a third item. Make edits without losing prior selections.
2. **Authenticated API E2E** with at least two sandbox Stores under genuinely distinct canonical KS Numbers and real service data. Check search, profile, offer, verify latest stock/price, notes, KS001 composer, draft preservation, sign-out, error recovery.
3. **Decision on durable shopping collection**: model owner/customer, persistence, expiry and per-item revalidation without invoking payment. Current implementation is client-state only; page reload does not persist the selection.
4. **Service scope API contract**: expose authorised scope, exclusions, timeline, evidence/completion and external actual seller identity, or force KS001 to obtain the missing terms from the relevant person before agreement review.
5. **Explicit per-seller fair-trade agreement orchestration**: consent and verification for each actual counterparty, money segregation and regulated rails where enabled. One collection must never be silently treated as one accepted Agreement or one checkout.
6. **Catalogue pagination and discovery**: lift the initial 10-offers-per-kind browse bottleneck and expose next-page navigation before describing Store as comprehensive.
7. **Focused regression** on Store creation/publication, registered Digital Store URLs, enquiries, favourite shops, community-provider consent, the locked three-panel workspace and ShortStays/My Ride/Storage independence.

**Release decision: HOLD production.** UI convergence candidate is testable in isolation. Backend-capability certification and owner walkthrough are separate, mandatory gates.
