# Phase 5F — Whole-product human certification

This document records **engineering checks and the human sessions required before approval**. Passing a source-level check is not proof that KS001 behaves correctly in the browser, on the real API, or with real people. Phase 5 remains **human-unverified** until these sessions are recorded and accepted.

## Five strategic end-to-end sessions

1. **Trade from a bill/photo** — Start with Home + → Photo. Upload a real hardware bill for goods with quantities, unit prices and total. Inspect original thumbnail, full image, interpretation, bill organisation, proposed trade parties, Agreement and Money. Pass only if KS001 distinguishes bill, invoice, payment and delivery, never invents tax rules or marks paid/received from a photo. Confirm/correct without retyping all lines.
2. **Document-led community governance** — Upload meeting minutes that specify membership, decisions, roles and contested or missing information. View original and reading status, check extracted decisions and named roles against source, then follow the proposed Agreement. Pass only if unresolved authority/consent questions remain visibly open; no generic price question interrupts purpose.
3. **Physical delivery with Places** — Arrange a construction-material delivery. Pick a Store origin and a destination via Places search or My location (consent). Confirm marker and gate details, then return to Agreement. Pass only if privacy choices are honoured, location stays tied to the same work, and route/price are not invented when no routing or quote exists.
4. **Sensitive family situation** — Plan a funeral or a family support arrangement without specifying price. Observe first three KS001 turns, invited people, date/place and any evidence requests. Pass only if the prompts are relevant, sensitive, optional where appropriate, and no commercial opportunities appear unsolicited.
5. **Corrections across one journey** — Plan a six-person meeting, propose date and time, change the time, attach a contradictory document, then review/print the Agreement. Pass only if the user can distinguish proposed/confirmed/conflicting terms, make a correction without restarting, and the latest version, evidence and readiness remain coherent.

## Required evidence per session

- Browser screen recording showing Home, conversation, source or picker, next question, Agreement and correction.
- Device and viewport (at least desktop and mobile for sessions 1, 3 and 5).
- For each important step record pass/fail, screenshot timestamp and actual output.
- Check accessibility: keyboard focus, 44px or larger major targets, readable contrast, no clipped dialogs, scroll returns to KS001's reply start.
- Confirm no production merge/deploy and no API changes.
- Record unresolved backend dependencies: permanent photo/document retrieval; full photo-to-trade reconstruction; server readiness/question selection; production geosearch provider and routing.

## Engineering gate

Run `node --test tests/phase5-human-consistency.test.mjs`, `npm run typecheck`, `npm run lint`, `npm run build` and `npm run test:final-convergence`.

Passing those commands means **ready for human certification**, not certified. Do not mark Phase 5 complete for production until all five strategic sessions and technical regressions pass.
