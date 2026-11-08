# Day 9: Compact Store Browser inside the locked Masterpiece

## Layout contract

The Living Workspace retains exactly its approved three-panel architecture:

1. **Left — Tools.** Open `Stores` to use `CompactStoreBrowser`: search title/description, switch between published seller Stores, view their mini catalogues, filter by buyer-provided area, add items to a parent-owned KS Cart, save an item to a named Vision, or discuss a selected item/cart with KS001. Mere opening has no effect on the KS001 conversation.
2. **Middle — KS001 chat and explicit display.** Chat remains mounted with its unsent draft. Only the buyer pressing `View Item`, `View Store`, `Full marketplace` or `Manage my Store` switches the middle into an expanded Store view, reusing existing Store controllers. `Back to KS001` restores the untouched original conversation and displays no fourth column or separate AI drawer.
3. **Right — summary.** The same `storeSelected` parent state drives cart quantities, seller prices (locked), item notes and removal. On phone the right summary is accessible via existing bottom navigation, not three crushed columns.

## User actions

| Action | KS001 chat | Cart | Middle display |
|---|---|---|---|
| Open Stores tool / search / switch Store | Untouched | Untouched | Original chat stays |
| Add to Cart in mini Store | Untouched | Updates same right summary | Original chat stays |
| View Item or View Store | Mounted, unchanged | Untouched | Store details replaces chat view temporarily |
| Back to KS001 | Resumes exact original | Untouched | Chat |
| Discuss Item with KS001 | Prepare existing unsent composer, never auto-send | **Untouched** | Chat |
| Discuss Cart with KS001 | Prepare grouped source description in existing composer, never auto-send | Untouched | Chat |
| Save to Vision | Untouched | Untouched | Left tool + picker |
| Close tool | Untouched | Untouched | Original chat |

The same cart can include products and services from different sellers. It is a provisional collection, NOT a checkout, money instruction, or a single multi-seller Agreement.

## Existing controllers kept

- Existing `StoreExperience`, `StoreMasterpieceLayoutReview`, backend Store gateway and mini/expanded seller data.
- Existing seller registration, public Store address, enquiry, offerings, customer favourites, permissions, business integration.
- Existing `LiveKs001Session` with same conversation ID and unsent text.
- Existing `VisionDreamGateway` for private owner-scope Dreams, and `saveBoard` using optimistic revision, appending Store source notes alongside other board objects. New Vision goes through existing `createVisionDreamController`, not a duplicate.
- Existing `StoresTool` remains under `More Store operations` for seller/community workflows.

## Honest capability boundaries

- **Owner preview** is example Store browsing, clearly labelled. No real Store accounts, inventory reservation, payment, delivery or live KS001 call is triggered in guest review.
- **Authenticated Store** uses public published backend offers, title/description ILIKE matching via category and service-area labels. Results are limited to up to 10 per offer kind. No complete paginated Store directory or exact geographic distance ranking yet.
- **Photo** opens the existing SecurePay `Photos` tool for image intake. Automatic vision similarity search against actual Store images/offers is **not yet implemented**; it needs the backend image understanding → evidence-based real-offer search connector. Do not imply actual image matching.
- **Vision** adds the seller source note to the actual saved Dream board via `saveBoard` on authorised accounts; independent server E2E for Dream permissions, conflicts, and recovered failures is pending.
- **Cart into KS001** is currently a reviewable text draft with seller references, quantities, listed prices and available scope. The server does **not** yet store a canonical immutable `STORE_CART` source artifact or orchestrate an authorised multi-counterparty agreement. This is the next API gate.
- **Client cart persistence** across reload/re-login is not yet provided. Source revalidation and per-seller agreement/payment authorization remain required.
- No changes to securepay.ke production or financial rails.

## Focused owner acceptance

On the isolated preview (route `#/preview/living-workspace/store`):
1. See left Stores tool and **original KS001 chat in middle**, with right summary. It must NOT open an overlay fullscreen Store.
2. Search `painting` in left tool, add sample service. KS001 chat remains as it was; the right cart updates.
3. Search `phone`, add the sample phone from a different Store; right cart has both. Change quantity/remove as needed.
4. Select a trader in left tool, browse mini Store. Press `View Item`; middle displays the full offer. Press `Back to KS001`; same conversation and tool search preserved.
5. Press `Vision` on an item, give a new Vision name. Preview says it is local only; no real Dream was saved.
6. Press `KS001` on an item; ensure it **does not add the item to Cart**; source appears in original KS001 preview draft. Press `Discuss Cart` to bring both sellers into one source description for review.
7. Try on phone: Store opens as bottom tool sheet, `View Item` opens middle display, right cart accessible via bottom navigation.

**Production release decision:** HOLD until owner interactive acceptance + authenticated end-to-end checks of live Store and Vision API and canonical cart source intake. This branch is a deliberate stage atop Day 8 convergence, not a separate replacement app.
