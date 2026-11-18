# SecurePay Mini — Sell Something Phase 6 engineering closeout

18 November 2026 · **frontend feature engineering complete, release certification not complete**  
Implementation: draft PR #333 stacked on frontend Phase 5 #332, paired with SecurePayAPI draft PR #479 stacked on Phase 5 API #478.

## Implemented, by approved scope
- **6A Quick Contract:** load caller-scoped completed Agreements, reread their current canonical version, use only the old title as a suggestion for a NEW offer. No previous consent, acceptance, price or seller right is inherited.
- **6B My People and Favourite Stores:** saved only by the owner's deliberate action in authenticated *personal* trade-memory; verified public Store/current completed Agreement read before the save. Lists are private, never community directories and never device contacts. The owner must explicitly approve removal.
- **6C Repeat offers:** seller may save description text as a private template and deliberately reuse it. On reuse every old price, stock, image, document, participant, rights declaration, KS001 source, Store publication state, Agreement and SecureLink are cleared. Description is not considered reviewed.
- **6D Repeat plans/stopping rules:** a saved template may suggest weekly, monthly, or on-request recurrence and a proposed end date. The server now requires an explicit authenticated prepare request, an exact saved version and a non-expired end date before releasing the saved text to a new draft. One-off templates cannot carry a hidden recurring end date. Removing a template stops its reuse but does not cancel an existing living Agreement.
- **6E usability:** keeps Mini's approved mobile-first layout, progressive questions/answer pills and original three exits (Share with buyer, Add to my Store, Save for later). Owner preview shows unmistakably fictional examples. Private real-account features remain explicitly gated OFF except in isolated matching-backend staging.

## Verified evidence
- Preview build from the Phase 6 frontend branch **READY** in Vercel for commit `897a6e066346b6819498695b3a7b7e1c18628d09`; build log shows TypeScript check and Vite production compilation, including 300 passing Mini focused tests. Any later commit requires its own fresh READY verification.
- Additional direct JS policy/wiring validation: 25/25 focused checks.
- New Phase 6 Node contract tests are included in the prebuild. The corresponding Java JUnit/Mockito tests are authored but **not executed in the available full backend checkout**.
- Backend Flyway/PostgreSQL migrations and Java 21/Gradle, real signed-in cross-service, multi-tenant and concurrency tests have **not** been certified.

## Important scope boundary — actual recurring living Agreements
This phase implements the **seller's reusable proposal, recurrence intent and stop-before-reuse protection**. It does **not** silently create a standing Agreement, spawn future obligations, renew an accepted Agreement, schedule reminders, invoice a buyer, produce a payment instruction or authorize a payer's Money.

**Actual recurring Agreement execution** requires agreed canonical current-version terms, both parties' necessary confirmations, authorized stage-specific work/payment and protected stopping/termination. It is an explicit pending integration in the broader Agreement/Money gates; do not call it live or production-complete.

## Release and deployment
- Frontend and backend PRs remain draft/unmerged; production unchanged.
- `VITE_SECUREPAY_MINI_PHASE6_PRIVATE_MEMORY` defaults OFF.
- Do not turn it on until the exact paired API migration and authorization contract are verified in isolated staging.
- No production data fixtures or synthetic people are promoted.
- The 20-person acceptance gate remains after successful integration certification.

**Core invariant:** Money follows the Agreement, and the payer alone authorizes it.
