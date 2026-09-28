# Entry Perfection — Phase 9 — Speed, Resilience & Recovery (UI half)

**Branch:** `feat/entry-perfection-phase9-speed-resilience-recovery`, stacked on Phase 8 `12a6dda`. Draft PR only. Full contract: SecurePayAPI `docs/ENTRY_PERFECTION_PHASE9_SPEED_RESILIENCE_RECOVERY.md`.

## What changed

- **Sources.**
  - A `stalled` read (e.g. SecurePay restarted mid-read) is a recoverable failure: "I couldn't finish reading this. Your file is still here — try again.", never "reading" forever.
  - After a reload, a source still being read is followed to its true end (bounded backoff, slower while the tab is hidden) and never re-submitted.
  - The working state is a `role="status"` line.
- **Review and the agreement card.** They show "Still reading quotation.pdf — you can review what I have so far." Set-up waits, and the server supplies the reason.
- **"Not this person"** appears on a linked party only. It is pinned to the version on screen (UR-266).
- **Continuity.** "Continue with the agreement you started in this tab?" is shown to a signed-in person with an unsaved conversation in the tab. "Continue with it" claims exactly once; "Start fresh" forgets it. Join no longer claims silently (UR-267).
- **Offline.** The Home and conversation composers never submit while offline. They keep the words, say so, and send normally when back online.
- **Drafts.** Unsent words are kept per conversation in the tab's memory: they survive in-app navigation and are cleared on sign-out and start fresh. They don't survive a reload, because browser storage is reserved for the possession record (UR-269).

## Tests

- **New:** `tests/entry-perfection-phase9.test.mjs` (6 tests).
- **Restated:** `tests/public-experience-phase4.test.mjs`. The claim is still only through the Phase 3 gateway, but on the person's explicit "Continue with it", never silently after Join.

## Browser

`scripts/entry-perfection/cdp-phase9.mjs` covers:

- L1–L3, perceived latency at 1280px, 390px, and 390px on a throttled mobile network;
- L4, offline;
- L5, a stalled source after reload.

Results are in the API document §3.
