# Entry Perfection — Phase 4 — KS001 Character (UI half)

**Branch:** `feat/entry-perfection-phase4-ks001-character`, stacked on the Phase 3 head `1c6afce`. Draft PR only.
The API half and the full certification document are in SecurePayAPI: `docs/ENTRY_PERFECTION_PHASE4_KS001_CHARACTER_CERTIFICATION.md`.

## Classification

- **Current architectural decision:** notices around KS001 speak as SecurePay (KS001 is SecurePay). They say what is true and what to do next, and use no internal words (step, candidate, source/request, reference).
- **Engineering assumption:** a 160-character ceiling for turn notices (test threshold).
- **Pending external confirmation:** real-model character (API UR-240).

## Changes

### `src/features/agent/controller.ts` → `errorText`

| Status | Wording |
| --- | --- |
| 401 | "Sign in to continue. Your message is still here." |
| 403 | "That needs someone with the right permission. Your message is still here." |
| 404 | "SecurePay couldn’t find this any more…" |
| 409 | "This changed while you were working on it. Check what SecurePay understands, then carry on." |
| 410 | "This has expired…" |
| Unknown outcome | "SecurePay couldn’t confirm whether that went through… nothing is ever done twice." |
| Default | "That didn’t go through…" |

The 401 wording deliberately omits "again": an anonymous Home visitor has never signed in.

### `src/features/sources/controller.ts`

Content mismatch now ends "Try the original file, or paste the text here."

## Tests

- **New:** `tests/entry-perfection-phase4.test.mjs` (4 tests). It tests the rules — no jargon, no server text, the message is kept, a safe retry is offered, the unknown outcome is not a failure — rather than every comma.
- **Deliberately restated:**
  - `tests/entry-perfection-phase2.test.mjs`: the content-mismatch next action;
  - `tests/ui-phase3.test.mjs`: the unknown-outcome wording.

## Browser

`scripts/entry-perfection/cdp-phase4.mjs` writes `build/entry-perfection/browser-phase4.json`. It ran against a real local API with provider `none`, covering C1–C7 at desktop and 390px. The results are in the API document §8.

`scripts/entry-perfection/cdp-phase2.mjs` was restated for the new provider-none reply.
