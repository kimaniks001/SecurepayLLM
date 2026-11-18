# Mini Sell Something — combined Phase 6B–6E engineering handoff
18 November 2026 · draft only, stacked on Phase 5, not a production signoff.

## 6B — My People and Favourite Stores
- Uses a new authenticated personal-only private-record API `/api/v1/mini/me/trade-memory`, owner derived from the signed-in server actor, 60-record limit, no external publication.
- Private PERSON references originate from completed, caller-scoped Agreements and re-read the canonical current Agreement before saving. They are personal notes, not contact sync, verified social graph, participant invitation or permission to sell in another person's name.
- STORE favourite requires a re-read of a public active Store with exact KSNumber and name; the preference is private only. Clicking Check only reads the current Store.
- Removal requires an explicit second choice and server revision check. No community directory visibility implied.
- Neither favourites nor new record storage load in the synthetic owner demo. Signed-in isolated staging requires `VITE_SECUREPAY_MINI_PHASE6_PRIVATE_MEMORY=enabled` and the matching backend migration first.

## 6C — Repeat offers and reusable terms
- Existing Quick Contract Trade Again uses only the previous canonical completed Agreement title as a fresh offer suggestion; it never copies the buyer, amount, consent, version, link or payer.
- Seller can explicitly save approved written offer text as a private TEMPLATE; selected template is re-read and compared with its current server values before reuse.
- Reuse resets the old seller's price, stock statement, photos, people, documents, rights declaration, canonical Agreement proposal and SecureLink. Description becomes **unreviewed wording** and the seller must pass the existing Fair Trade examination again.
- No automatic Store publication or inventory claim.

## 6D — Repeat cadence, renewal and stopping controls
- A reusable template may contain ONE_TIME, WEEKLY, MONTHLY or ON_REQUEST as a **proposed** cadence. Stop rule is EACH_CYCLE_CONFIRM or UNTIL_DATE with bounded, validated ISO date.
- When reused, the plan is expressed only as proposed timing text for the **new** offer and must be reviewed with the other party. It is not a running Agreement, recurring invoice, accepted renewal, scheduled job or payment mandate.
- Actual automated recurring Agreement lifecycle, reminders, expiry processing and supplier/payer-stage authorization are not wired to the canonical Agreement backend and remain gated. No background execution is simulated.

## 6E — Usability and integration readiness
- The existing Mini Sell Something composer, KS001/Store connection, Fair Trade examiner, answer pills and the three exits (Share with buyer, Add to my Store, Save for later) remain visually intact.
- "Quick Contract" and "My People & Favourite Stores" are progressive entry points. The extra template saver is optional, shown only after basic offer readiness.
- Added standalone Node policy tests and prebuild inclusion; **full checkout TypeScript/Vite/Node tests are not executable through the available connector and must run in isolated checkout**.
- Backend migration and Java service/controller tests authored, but complete Java 21/Gradle, Flyway + PostgreSQL, concurrency, authorization, real integrated signed-in execution, accessibility device testing and release checks still need evidence.
- API and frontend remain separate stacked **draft PRs**, no merges to main, no live deployment. Demo data stays isolated, actual account write gate remains OFF.

## Scope boundaries
- Personal favourite/trade memo is not a statement of identity verification or personal acquaintance.
- Business users require a separately established, represented Business-owned storage and signed Agreement authority; personal endpoints cannot act for a Business.
- Existing payment Gates 7–9, 20-person acceptance Gate 10 and controlled release Gate 11 remain unchanged.

**Invariant:** Money follows the Agreement; the payer alone authorizes financial steps.
