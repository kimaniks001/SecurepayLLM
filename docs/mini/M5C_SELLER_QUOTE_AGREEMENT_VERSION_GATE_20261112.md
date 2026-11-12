# M5C Gate 1 — seller-proposed buyer-specific terms enter the SAME KS001 conversation
**12 November 2026 · scoped code candidate · NO production GO**

## Purpose
Continue from M5B, not redesign Mini, Store or Workspace. A represented business seller may prepare a buyer-specific proposed quantity, quoted unit price, delivery/collection place/date, proposed transport responsibility and exceptions. Mini verifies the seller's current business representation and re-reads the specific public Store offer immediately before handoff. The SAME AgentController and ongoing KS001 conversation receive a buyer-stated/seller-stated proposal after canonical source selection; there is no second assistant, Order engine or checkout.

## User sequence
1. In branch-restricted sample preview, choose Njeri, My SecurePay → My Store → Njeri Events KS002 → chair offer → Prepare buyer-specific quotation with KS001.
2. Enter proposed buyer KS001 (identity *not* verified), quantity 15, per-unit KSh 170.50, delivery to Varsityville Ruiru on 2 December, and proposed transport responsibility. This is a **draft for discussion**.
3. Tap Discuss proposed quotation with KS001. Recheck current business representation and Store offer, then invoke existing `AgentController.useOffer(STORE_LISTING)` and `send` in same ongoing conversation. No other route can accept this proposal.
4. Use existing **My Agreements / Invitations** for authoritative version review and Join/Confirm. A proposal in chat is **not** a persisted buyer-specific quotation and does not change any Agreement version.

## Critical backend gap: not M5C acceptance
Inspecting SecurePayAPI main shows:
- `POST /api/v1/commercial/quotes/single-recipient` calculates **SecurePay's platform fee quote**. It is **not** a merchant's buyer-specific goods/delivery quotation; MUST NOT reuse it.
- `GET /api/v1/agreements/{id}/source` returns only bounded provenance (`sourceType`, `sourceTitle`, etc.), not store offer UUID, price/version, buyer-specific delivery obligations.
- Existing Agreement structured amendments allow AGREEMENT_TEXT (title/purpose/description), OBLIGATION_TEXT and OBLIGATION_BENEFICIARY; they cannot safely bind a priced, quantity-specific seller quotation and delivery terms to the exact buyer/seller version. Do NOT squeeze structured quote records into unverified description fields.
- Existing M3B recipient invitation + version confirmation are separate explicit actions. Source selection and sending a chat message must **never** trigger those commands.

## M5C completion contract required from API (pending separate approved backend slice)
Server-owned, authenticated seller quotation keyed by seller identity/represented business, offer ID+offer snapshot version, intended buyer identity, requested quantity, unit price/currency, total, delivery place/date/responsibility/exceptions and expiry. Ensure seller capability and stable idempotency, verify source freshness, protect buyers from changed quotes, persist a unique quote reference and tie quote+delivery obligations into one CURRENT canonical Agreement version. Sender may propose, but does not confirm buyer consent. Buyer separately reviews/approves exact version and seller independently confirms it; edits revoke prior approvals. Multi-seller requests create distinct seller obligations and version-bound approvals rather than falsely merging. No Money, provider, booking or stock hold before gated acceptance.

## Acceptance tests required before marking M5C complete
- Authorized seller quote on one specific offer; unauthorised seller, stale offer and forged buyer denied.
- Accurate per-unit/quantity/total/currency and delivery date/place/terms persisted; explicit buyer and seller identity authority.
- Independent buyer and seller consent tied to SAME authoritative version ID + content hash; rejected/expired/stale version fails closed; changes require fresh consent.
- Cross-account reads scoped, concurrency/idempotent replay safe, no invented quantity/driver/approval.
- Multi-seller source/version treatment, no funds/booking/reservation.
- Isolated staging live KS001 12-turn coherence, reload and two real accounts verified before any release.

## Evidence and exclusions
`miniSellerQuotationDraft.mjs` and focussed `tests/mini-m5c-seller-quotation.test.mjs` guard formatting, source and consent boundaries. This is **M5C gate 1 only**, not a full seller quote feature; no real buyer is contacted. No API migration, production/estate changes, Vercel alias or payment activation. Prior M1 staging NO-GO remains.
