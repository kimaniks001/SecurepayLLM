# SecurePay Mini Collect C5B — typed cycles and source-linked payer proposals

**19 November 2026 — isolated draft implementation. No Money enabled.**

## What a person sees

C1 purpose → C5A real-world collection type/frequency → C2 collection governance → **C5B period and original-source review** → C3 verified provider requirements → C4 personal contribution/return status.

Mini now asks a human-sized question: "Which period are we collecting for?" It offers a month picker for monthly collections and two calendar dates for other cycles, then asks whether the original item is a bill/Agreement, store offer, document/quote or (for voluntary giving) a named cause. It explains that each payer must privately review their own legitimate source, with no duplicated periods, and no automatic debits.

The customer journey remains mobile-first with answer pills and native date pickers. Existing C1–C4 flows are preserved; if a historic C2 draft has no C5 type, it continues directly to the existing provider explanation.

### Important preview limits

The Mini C5B step is **not connected to a saved Agreement or live provider**. It does not show fabricated payer records, pretend a school invoice exists, create a live SecureLink, send invitations, set Payment Ready or call Money. It maps selected C5A type/frequency to backend's canonical codes, but does not assume a client-side choice is binding authority. There is no automatic network POST. C5B production capture will require authenticated identity, signed/accepted terms and a separate versioned Agreement creation/handoff.

## Corresponding backend implementation

SecurePayAPI C5B builds:
1. Optional collectionTypeTerms in initial Agreement creation (typeId/kind/cadence; backend validates against original C2 terms before including in first hashed canonical Agreement version). C2-only calls remain compatible.
2. Immutable collection_cycle_drafts with exact group, Agreement/version/hash, C2 draft, original source, finite local dates and IANA time zone. Organizer must have real group manage authority; row locks and a database exact-window key protect against duplicates. Overlaps are rejected under the locked Agreement.
3. Immutable collection_cycle_payer_proposals with one private original item/version/amount per payer and period. Payer must already be an eligible participant of the same canonical Agreement; amount is never a verified debt.
4. An exact self-only review (REVIEW_ACCEPTED or DECLINED) against the stored original source SHA, and for acceptance the person's own exact-version Agreement confirmation and C2 governance consent. No review grants Money.
5. Organizer-scoped period reads, payer-self-only item reads and strictly idempotent historical replay. Three nonfinancial outbox event types contain no private payer data.

**Backend C5B is a draft, not a merged or certified released feature.** No real bank, actual source verification, authorized billing, recurring charge, settled Money, refund or notification delivery exists.

## Still needed

- Complete Java 21/Gradle/JUnit, Flyway/PostgreSQL migration, transaction/concurrency, authorization, provider sandbox and 20-person user acceptance testing.
- Bind original bills/quotes and true item identity to independently verified provider/seller sources; examine Fair Trade rights and genuine debt/cancellation evidence in C6.
- Extend the lifecycle for actual per-cycle Group SecureLinks, exact consented recurring collection notices and correct period-by-period payment records after a canonical Money authorization.
- Verify licensed provider terms, signed collection mandate, real reconciliation, legally permitted retention, refunds and privacy before any live C7 execution.
- Legacy untyped C2 Agreements must not be silently retitled; use an authorized new canonical Agreement/version flow.

## Checks included

Node C5B tests cover canonical code mapping, period validity, deadline, voluntary cause classification, non-executable flags, and C2-to-C5B handoff. These sources were committed, **not run as a full Node/Vite/browser build**.

API and doctrine unit-test sources cover type matching, immutable states, private payer API, exact original-source review, no Money path, and concurrency/idempotency intent. **Runtime certification has not run.**
