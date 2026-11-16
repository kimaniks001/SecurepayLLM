# B5 — SecurePay Mini personal Inbox convergence

**Date:** 16 November 2026  
**Branch status:** Engineering implementation in draft, isolated Vercel preview. Live backend A/B/C messaging remains **uncertified**.

## The guest-to-Agreement-to-Inbox path

- Mini is the one authoritative personal Inbox surface. SecurePayAPI is the record owner.
- Shortstays' approved Prototype 04 uses an explicit preview-only route, not a duplicated holiday-site message feed or production Mini test.
- Business has a quiet **My SecurePay Inbox** doorway. This is the currently signed-in natural-person KSNumber's messages. Acting as a Business is **not** permission to read every staff member's conversations.
- The original `#/inbox` route stays authenticated. Read, search and post recheck identity and Agreement participant authority server-side.
- Searches ask existing Agreement search, canonical notification search and the original Agreement messages separately. If a source fails, Mini tells the person that source is unavailable; it never substitutes invented results.
- The 2016 cement/Tom Contractors example is a search *filter*, not a promise of imported historical agreements or semantic OCR.
- B5 fixes archive pagination: server page number is advanced separately from deduplicated result count. Stale results from another KSNumber are hidden.
- Message sending uses one stable clientMessageId on uncertain retries, not a second payment or Agreement mutation.

## Verified preview build contract

`npm run test:b4` — 6 focused B4 tests.  
`npm run test:b5` — 5 focused convergence/API/session/Business tests.  
`npm run typecheck` — TypeScript checks.  
`npm run build` — Vite preview bundle.

Builds run in Vercel's isolated Mini project, not GitHub runners.

## Explicitly not yet certified

- The B5 backend Flyway migrations, Java 21 services, scheduled message alert retries, concurrent database insert and 3-identity A/B/C tests have not been executed in this conversation.
- A Sandbox SecurePayAPI origin confirmed separate from production is still needed. The Mini project may have a shared VITE_SECUREPAY_API_BASE_URL; do not infer this is a safe B5 test backend from the preview URL.
- No signing with live KSNumbers, no real funds, no imported 2016 archive, no business-wide delegate Inbox.
- Money provider dispatch, callbacks and regulated ledger retain their separate Gates 7–11; B5 does not waive those safeguards.

## Release bar

Complete API PR #B5 approval, controlled isolated API deployment, A/B/C sandbox evidence, legal/privacy review, frontend/Shortstays preview pairing and explicit release approval. Keep draft until then.
