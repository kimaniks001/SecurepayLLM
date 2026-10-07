# Vision Dream Builder v1 — implementation checkpoint

## Baseline
- SecurepayLLM main at branch creation: `a5a89e919792e0a6cf65a7f02b9ed5b3682bfce8`
- SecurePayAPI inspected main: `8a6270de591c49c8a843944904515b254ba20df1`
- Branch: `feat/vision-dream-builder-v1`
- SecurePayAPI changes: **none**

## Implemented in this branch
- Dream-first landing language: **What are you dreaming of?**
- one obvious **+ Add** menu
- freeform canvas
- sticky notes
- text cards
- checklists
- frames
- rectangle shapes
- arrows and lines
- pointer/touch freehand drawing
- selection and dragging
- duplicate/delete
- note colour cycling
- undo/redo history
- zoom
- explicit save status
- optimistic-version save through the existing private Dream endpoint
- migration of old text-only Dream content into an editable sticky note
- selected-item KS001 handoff that sends only deliberately selected text
- explicit privacy / Agreement / Money / Store boundary copy

## Existing backend authority verified
Current `VisionDreamController` / `VisionDreamService` already provide:
- authenticated owner-scoped Dream create/list/get/update
- private ownership enforcement
- existing KS001 conversation continuity
- optimistic `expectedVersion` conflict protection
- idempotent create for the same owned conversation
- Vision item lock/supersede protection
- no Agreement or Money authority

The existing Dream content field is capped at **4,000 characters**.

## Economics authority
SecurePayAPI PR #316 is the existing **Vision Usage Economics Phase 1: shadow metering** work. It measures costly intelligence but explicitly does **not** implement member billing, deduction, balances, top-ups or insufficient-credit gates. This frontend branch therefore does not invent prices, allowances or token balances.

## Deliberate blocker: production board persistence
The present API can authoritatively persist a compact board document inside the existing Dream content field, but the 4,000-character cap is not sufficient for a production visual canvas with large drawings, many objects, images or documents.

Before production completion, the smallest safe backend contract should provide:

### Board document authority
- `GET /api/v1/vision-dreams/{dreamId}/board`
- `PUT /api/v1/vision-dreams/{dreamId}/board`
- payload contains `schemaVersion`, `objects`, `expectedRevision`, and an idempotency key
- response returns authoritative `revision`, `savedAt`, and content hash
- owner scope derives from authenticated Dream ownership, never request-provided owner identity
- conflict returns 409 with latest revision metadata
- payload limit sized for realistic boards, with server-side validation

### Asset authority
- create upload intent scoped to one owned Dream
- supported MIME/type and size limits
- private object storage by default
- durable asset id/reference returned only after confirmed upload
- asset delete/revoke path
- no automatic Store/Community/public visibility
- no remote-social scraping claim

### Revision/recovery
- append-safe or revisioned board saves
- idempotent replay protection
- last confirmed board remains readable after uncertain writes
- no duplicate objects caused by retry

No SecurePayAPI change has been made because the product specification requires approval before adding this authority.

## Current limitations
- image/document upload is intentionally unavailable in Dream Builder until private persistent asset storage exists
- compact board saves are bounded by the existing 4,000-character Dream content authority
- resize handles, multi-select/grouping, z-order, pan and fit-to-screen need the full board contract / next frontend slice
- Guided Building / Deep Exploration UI is not exposed as chargeable because PR #316 is measurement-only and no approved member charging authority exists
- real human usability sessions and real browser screenshots have not yet been performed

## Release position
This branch is an **implementation checkpoint for wider verification**, not a completed production exit gate. It should remain draft and unmerged until:
1. CI/typecheck/build is green,
2. the board persistence + asset contract is approved or another existing authority is identified,
3. remaining board interactions are completed against that authority,
4. real browser and human usability certification are performed.
