# Entry Perfection — Phase 1 (UI side)

The reference map is in SecurePayAPI: `docs/ENTRY_PERFECTION_PHASE1_ARCHAEOLOGY_AND_MEASUREMENT.md`. This file covers only what lives in this repository.

- **`tests/entry-perfection-baseline.test.mjs` (6 tests):** the UI half of the Golden Entry baseline, run against the real source controller, agent controller and HTTP client. It pins these findings:
  - H1: a FAILED source is reported as `ok:true`.
  - H2: the source refresh is dropped while KS001 is busy.
  - H4: a lost turn response stays pending, and Retry shows "This has already been processed."
  - H5: a source refresh after a live turn duplicates earlier KS001 replies.
  - H6: every request aborts at 15 s.
  - The source status vocabulary.

  The tests named `baseline …` record today's behaviour. A later phase that fixes one changes its pin deliberately, and never deletes the journey. Each run writes `build/entry-perfection/ui-baseline.json` (ignored by git).
- **`scripts/entry-perfection/cdp-baseline.mjs`:** real headless Chrome through the DevTools Protocol, with no new dependency, against the real UI and API. It runs these journeys:
  - B1: one complete sentence.
  - B2: Bring your plan.
  - B3/B4: PDF upload at 1280 px and 390 px.
  - B5: a turn response lost after the backend committed it.

  Each run writes `build/entry-perfection/browser-baseline.json`.

No product code changed in this repository in Phase 1.
