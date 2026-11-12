# M5A — Existing Digital Store → the same KS001 → a living Agreement
**Date:** 12 November 2026 · **Status:** code and visible preview candidate; live M5 acceptance pending.
**Scope:** Preserve approved Mini and Store. No new shopping app, order book, settlement rail or Agreement engine.

## Existing proven foundation
SecurePay already has:
- `MiniBuyStore.tsx`: Store search, store browsing, item selection, bounded quantities, multi-Store buying plan and explicit check of the **current** Store offer price, timestamp, availability and available quantity. Public records are **not** stock reservations.
- `createStoreGateway`: canonical public search/store/offer endpoints and identity-owned Store records.
- `AgentController.useOffer`: the **one existing** first-party mechanism for selecting a `STORE_LISTING` pointer in the current KS001 conversation, with server source re-verification, retry and provenance; it never takes a displayed price as a confirmed offer or implies seller agreement.
- `AgentController.send`: an explicitly user-originated proposed plan in the existing conversation, with same-turn retry/continuity and versioned Trade Context.
- M2 read-only Agreement Formation, M3 Save/Return and People, M4 read-only My Agreements.

## What M5A adds without redesign
1. A small **Browse Stores** doorway in Mini's current KS001 conversation. The existing `MiniBuyStore` opens as a compact scroll-contained layer without replacing the chat, and closes back to the **same** AgentController and conversation ID.
2. `MiniBuyStore` gains optional public `StoreGateway` injection (so isolated first-party API is used when staging is verified), plus an optional `onDiscuss` handoff. Search/store/cart logic is **unchanged**. The callback becomes available only **after** `Check current Store offers` confirms each exact offer, quantity and availability.
3. `miniStoreIntent.mjs` strictly validates seller KSNumber and canonical offer UUID, quantity, currency, price shape and distinct lines; it composes only an explicitly **buyer-spoken proposal**, never a binding contract, reservation, seller quote or Money instruction. No silent truncation of sellers.
4. **One Store listing:** Mini calls `AgentController.useOffer` first, binding the seller and listing to the same KS001 conversation via the existing canonical `selectCommercialSource` endpoint. Only on a successful source selection does it submit the buyer's stated quantity and delivery questions through `AgentController.send`. If the source cannot be verified, it **holds the plan and offers a retry of the exact original source**, never silently continuing as though it was selected.
5. **Several Store lines:** the plan deliberately does **not** call `useOffer` for a false combined source. The buyer's request includes separately attributed Store/offer identifiers and asks KS001 for each seller's approval, delivery obligations and conditions. This is a buyer intention **without an authoritative multi-source attachment** and cannot be treated as a single accepted Agreement. If an older single-source session is already active, a new multi-Store plan is blocked until it has a separate conversation.
6. **Demo:** existing `?demo=1` M1–M4 preview extends to M5 with two clearly fictional sample Stores (Njeri Events KS002 and Kamau Furnishings KS003) and listing IDs, using the same local non-network `HttpClient` that is **never available on the production hostname**. Real inventory, accounts, deliveries and Money are not simulated as authenticated. Unknown endpoints, payments and stock-writing calls are denied.
7. Live first-party Store mode is still gated by the same pre-existing verified isolated staging origin; no ordinary Vercel preview may accidentally use production `securepay.ke` for real Agent/store writes. Demo labels and customer data never enter production API.

## Recommended manual user review
- Open the M5 interactive `/mini.html?demo=1` preview.
- Select **Amina · Buyer** → **Browse Stores** → search for **chair** → **View Store** (e.g., sample Njeri Events) → add 10 or 20 chairs to the buying plan.
- In **Review buying plan**, tap **Check current Store offers**, then **Discuss this buying plan with KS001**.
- The Store should collapse back to the **original four-message chair conversation**, which now continues with the selected seller and proposed quantity as a new user request. The Agreement review and Save/Continue still operate on that **same** conversation.
- Try a two-Store cart: it should discuss two **separate sellers**, never imply a single verified offer or combined acceptance.
- Use **My SecurePay → My Agreements** to see existing sample Agreement status and next action; do not infer that an M5 buyer plan automatically created, funded or accepted any Agreement.

## Bounded evidence
- Focused M5 tests execute the actual `StoreGateway` and existing `AgentController` through a non-network synthetic API: actual store search/refetch, exact source pointer, same conversation, multi-seller boundary, wrong seller/offer refusal, unknown payments/stock writes rejection, and UI callback wiring. Prior M1–M4 focused tests remain.
- Automated source/build checks do not prove human-visible interface approval or staging/live API quality. An exact deployment SHA and READY status should be checked before sharing the preview.
- Sample data stays in a separately hostname-gated demo fixture for now because the owner approved the experience and it remains the only safe way to visually inspect the changes. Removing sample fixtures **must not** break the real canonical Store/Agent interfaces. Remove/disable only after isolated staging is genuinely working and the owner has accepted live M5.

## Still open before M5 is complete
- Cross-session/cross-device persistence of a **multi-Store** plan with canonical separate-source references; server must maintain each seller's independent Agreement/consent, inventory confirmation, delivery role, amounts and evidence. This source association is not present in this first read/intent slice.
- Seller-side action to confirm real quantity/pricing/availability, amendments or acceptance of each real version; real sender/recipient notifications must be proven.
- Complete checkout through the Agreement and provider rails, optional independent custodial/escrow decision, milestone evidence and follow-up. No real Money is enabled by this PR.
- Browser/human usability acceptance and actual isolated SecurePayAPI staging end-to-end tests.

**Decision:** M5A visible Store-to-KS001 code candidate only. No production change, no verified real agreement, no financial certification.
