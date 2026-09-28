# Entry Perfection — Phase 2 (UI side)

The reference is in SecurePayAPI: `docs/ENTRY_PERFECTION_PHASE2_INPUT_PERFECTION.md`. This UI change is stacked on Phase 1 (#65).

**Source controller (`src/features/sources/controller.ts`)** — every action resolves only after classifying the artifact truthfully:
- **READY/PARTIAL:** success (`attention` for PARTIAL or open uncertainties), after the awaited reconciliation.
- **FAILED:** a failure, with a human reason.
- **Refused:** human copy, never server text.
- **Unknown outcome:** the same content is re-sent once (the server de-duplicates by digest), then the artifact is polled by id; the result is "checking", never "failed".

**Shared status meaning** — `sourceOutcome()` in `src/features/sources/presentation.ts`.

**Agent controller (`src/features/agent/controller.ts`):**
- Live KS001 replies use the canonical `replyId`.
- A source's acknowledgement is shown at once, keyed by its canonical id.
- A canonical Trade Context re-read requested while busy is deferred, never dropped.
- A turn whose outcome is unknown is reconciled by re-sending the same `clientTurnId` (backoff 1, 3, 6, 12, 25 s); after that the action is "Check again".

**HTTP** — a per-request `timeoutMs`. Turns and source reads wait 45 s; Phase 9 owns the real budget (UR-241).

**Intake** — the Bring-plan panel closes only on real success and keeps the pasted text until SecurePay has read it. Pasted sources are labelled "Pasted text".

**Tests and runner:**
- `tests/entry-perfection-phase2.test.mjs` (12).
- `tests/entry-perfection-baseline.test.mjs`: Phase 1 pins restated as resolved.
- Restatements in `agent`, `ui-phase1`, `sources`, `public-experience-phase2` and `public-experience-phase3`, each naming the Phase 1 defect it resolves.
- `scripts/entry-perfection/cdp-phase2.mjs`: the real-browser journeys P1–P8.
