# Mini Sell Something — Phase 3 Quiet Fair Trade Examiner (17 November 2026)

**Status:** isolated owner-review experience ready; **not** authoritative seller verification, publication or Phase 3 certification.

## Human experience

- One question at a time with answer pills — photograph source, supplier permission, right to sell, availability — and direct fixes. No buyer-facing legal or Verified badges.
- The deeper **What did Mini look at?** disclosure is initially collapsed. It groups meaningful Fair Trade aspects into law/eligibility, seller authority, photos and rights, buyer understanding and fulfilment. Attached documents appear as unverified local filename references.
- A seller declaration may complete a *local proposed offer* but cannot verify copyright, stock, a licence, identity, customer acceptance or right to publish.
- The photo label is **Local photo · image registration pending**, not a fake “SecurePay Identimark.”
- Existing Phase 2 proposal preparation and its three seller exits are unchanged: share preview, Store preview, Save. None creates an Agreement, SecureLink, Store listing or Money.
- Manual edit, change, Not sure and optional KS001 assistance remain.

## Authority and code separation

The pure `miniSellerTrustExamination.mjs` is a deterministic, unit-testable **local suggestion model**, not an authorization mechanism. It offers `checks`, `blockers`, `localReady` and always-false server authority flags. There is no client-side override for `canPublish` or `canIssueSecureLink`. UI human handoff stays locked to `miniTradeDemo=1` on allowlisted Vercel host.

The backend in `kimaniks001/SecurePayAPI` separately contains genuine source-ingestion JPG/PNG signature/dimension checks and a private SHA-256 digest. The Phase 3 API branch proposes a pure `SellerImageIntegrityPolicy` (PR #475) over an already authenticated source scope, but **does not expose** a registration endpoint.

### Required back-end continuation before Phase 3 is truly complete

1. Authorize **both** the acting seller's KSNumber / represented Business Store and the source conversation. Check source owner, exact source id/digest and offer version at the same transaction boundary.
2. Persist auditable per-image usage, Identimark issuance, revoke/remove, idempotent retries and image-use provenance; client image claims cannot produce a registered mark.
3. Govern lawful seller eligibility, supporting document verification, licensing review, manual dispute/appeal, supplier permission, and publisher authority. “I took it” is a declaration, not verification.
4. Only accept server-owned validated image-use/media references into published Store offers; reject arbitrary client mediaRefs for publication.
5. Distinguish exact-byte duplicate matching from perceptual similarity (not yet implemented), and do not reveal a private uploader's images or match history.
6. Gate real Offer/Store publishing on authoritative server outcome; version-stale and revoked image use must fail closed. Record accurate status for Mini.
7. Run backend Java 21, security/authorization, PostgreSQL/Flyway, concurrency, relevant API contracts, image-content signature, and human usability tests in isolated staging. These cannot be certified from a Vercel frontend build.

## Preview verification

Focused test: `tests/mini-sell-phase3-trust-examination.test.mjs`. Mini prebuild also includes previous phases and performs TypeScript/Vite. Report Vercel READY separately from API certification. No production merge until owners approve the integrated authority and tests.

**Engineering assumption:** Image Identimark unique registration and permission governance remain unresolved backend design decisions, not promised current capability.


### Same-file photo repeats
The owner preview now computes an optional SHA-256 on **local selected bytes** (maximum 5 MB) and politely refuses a second byte-identical photo within the same draft. The digest remains in component memory only, is excluded from saved draft and public candidate, and is not a copyright detector, a server digest, a perceptual matcher or an issued Identimark. Browsers without Web Crypto may skip the check without inventing a result. Focused test: `tests/mini-sell-phase3-local-image-digest.test.mjs`.
