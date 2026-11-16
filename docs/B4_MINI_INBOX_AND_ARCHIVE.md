# B4 — Mini canonical commercial Inbox and retrieval

16 November 2026 | **Implemented in draft frontend, tested in isolated Vercel preview. Backend still not certified/deployed.**

Mini's existing authenticated Notification Experience now presents an archive search panel on the Inbox tab. It searches:
- The existing permission-scoped Agreement search endpoint for subject/person/year;
- B4 canonical notification title/body search for the signed-in recipient;
- B4 participant-scoped Agreement message history, not an invented social messenger.

The new conversation panel reads the canonical Agreement message thread, shows original messages, and sends an explicit written message with a stable clientMessageId on retries. **No message may create/amend the Agreement or issue Money instructions.**

The simple deterministic search planner recognizes phrases like
`cement deal around 2016 with Tom Contractors` (approximate year 2015–2017, subject cement, party Tom Contractors). This is **not semantic AI or a guarantee of finding unimported older transactions**. If a backend search fails it reports unavailable rather than reporting no records. Every result links to the original authorized Agreement, Inbox record or conversation.

The same signed-in session boundary refreshes all three sources. Search results are hidden and cleared when the tab's authenticated session changes. A direct `#/inbox` route lets connected apps send users to Mini, where access is independently authenticated.

**Important:** The existing Notifications category feed is an attention record, not a person-to-person message transcript. B4 Agreement Messages are separate original communication records, bound to the Agreement and searchable within authorized scope. Shortstays does not keep another copy.

## Verified

- `npm run test:b4` — 6 focused archive, parser, tenant API, idempotency and route tests passed in Vercel preview.
- `npm run typecheck` — TypeScript compile passed in Vercel.
- `npm run build` — Vite bundle completed on feature branch.
- Do not claim actual live 2016 records, real external messages, live receipts or live Money.

## Outstanding release gates

- The new SecurePayAPI routes and Flyway table are **not yet deployed** into the preview API; production search/message behavior is NOT proven.
- Full authenticated end-to-end: user A/B separate, revocation, active membership and free buyer rights, old data and empty results, concurrency/notifications recovery.
- Push delivery and notifications reconciliation; regulatory retention, privacy and archival import; a scalable secure text/semantic index over high-volume messages/docs.
- Business staff impersonation/authorization and external app write credentials.
- SecurePay Mini remains a P0 priority; do not change frozen Mini visual design.
