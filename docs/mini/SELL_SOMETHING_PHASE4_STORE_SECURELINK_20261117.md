# Mini Sell Something — Phase 4: Store and standard SecureLink (17 Nov 2026)

**Draft branch only. No production activation or user-facing promise of a real link in the local demo.**

## Decision

Use SecurePay's existing **standard** SecureLink presentation. No theme, card customization, branding editor, colors or personalization controls are part of this phase.

## Three genuinely separate seller exits

1. **Share with buyer.** Must originate from a real, authorized **PROPOSED Agreement**, not from a local Mini proposal or a Store offer ID. The existing `AgreementGateway.issuePublicDoorway` is the issuance authority. The backend URL must be returned verbatim; do not construct one from a base URL or slug. Active existing doorway is managed in the Agreement, not recreated. Opening the link does not join, accept or pay.
2. **Add to my Store.** Once the seller explicitly confirms and an authenticated Store gateway/context is provided, the Phase 4 `miniSellerCreateCanonicalStoreDraft` adapter calls the real personal/Business Store create API. It forces `published:false`, `mediaRefs:[]`, `quantityAvailable:null`, and `NEEDS_CONFIRMATION`. The API must return a server-owned ID and unpublished status. Any network-uncertain create is **not blindly retried**; check My Store for duplicates.
3. **Save for later.** Keep the existing seller-written local text-only draft. Attachments, other people's details, supplier rights claims and private directions are not persisted as a fictional Agreement.

**Seller does not Connect to Money.** Buyer/payer authorizes Money only from an accepted Agreement.

## Implemented draft code

- `src/mini/miniSellerCanonicalStoreBridge.mjs` + `.d.mts`: guarded canonical Store draft create.
- `src/mini/miniSellerSecureLinkDoorway.mjs` + `.d.mts`: guarded direct Agreement doorway issuance, explicit consent, existing locator handling, stable idempotency key on uncertain retry, and server-returned URL only.
- `src/mini/MiniSellSomething.tsx`: optional authenticated Store save and Agreement-backed SecureLink issuance actions; they render **only if** a real gateway and authority context are passed from a trusted parent. The local owner preview passes neither and remains non-writing.
- Focused tests added to `package.json` prebuild.

## Not yet complete

- No verified canonical seller-offer → Agreement creation and binding is supplied by Mini, so ordinary **Share with buyer** still shows a proposal preview, not a live SecureLink. Do not pass a Store offer ID as an Agreement ID. The seller must approve a canonical Agreement/version and server authority must check it.
- The existing `MiniExperience` Sell Something owner example is mounted only in the isolated `miniTradeDemo` environment; it does **not** pass real Store or Agreement gateways. Hence real write buttons remain absent there.
- Store publishing of text-only offers, keeping the full Fair Trade offer provenance in the canonical Agreement, account session and Business delegation gates, double-submit idempotence, server-side authorization, end-to-end contracts, and Vercel preview integration tests are not yet certified.
- Phase 3 public photo approvals, real Identimarks, image CDN serving and dispute/takedown release blockers remain **disabled and unresolved**.

## Next implementation tasks

1. Implement proper authenticated Mini seller context selection from the actual KSNumber membership, rather than a sample name.
2. Prepare a canonical Agreement from reviewed seller offer terms; preserve exact source/offer revision and permissions, use backend-generated version, and obtain explicit seller confirmation.
3. Route the independent Share exit through the existing proposed Agreement SecureLink doorway, show only its server-issued URL; use the existing Agreement manage workflow for earlier links.
4. Route the independent Store exit through the guarded unpublished Store draft, then add separate owner-authorized text-only publish action with fresh availability check.
5. Run focused Node tests, TypeScript/Vite, Java 21/Gradle and PostgreSQL/Flyway/security and concurrency certification in a complete repository checkout. Do not merge the stacked draft before Phase 3 safeguards and backend dependencies are reconciled.

**No design rework, no SecureLink customization, no seller Money.**
