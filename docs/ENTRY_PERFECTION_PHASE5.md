# Entry Perfection — Phase 5 — Understanding & Evidence (UI half)

**Branch:** `feat/entry-perfection-phase5-understanding-evidence`, stacked on the Phase 4 head `13a5b62`. Draft PR only.
The full contract is in SecurePayAPI: `docs/ENTRY_PERFECTION_PHASE5_UNDERSTANDING_AND_EVIDENCE.md`.

## Classification

- **Current architectural decision.** The Understood workbench shows the person that SecurePay understood their material:
  - what each figure *is*;
  - which facts are SecurePay's reading rather than something stated;
  - what is **not included**;
  - which uncertainty genuinely needs them;
  - where their details disagree, with each side's source.

  It never shows raw confidence scores, extraction JSON, qualifier keys or internal ids.
- **Pending external confirmation:** real-model reading quality (API UR-240).

## Changes

### `src/api/securepay/agent/dto.ts`, `adapters.ts`

These are additive; an older server degrades safely.

- `SourceReferenceDto.basis`. The normalised source now carries `inferred` (true only for `"INFERRED"`).
- `TradeContextDto.conflicts` becomes `conflictsView`. Malformed entries, or a conflict with fewer than two sides, are dropped.
- Source `uncertaintyDetails`:
  - when present, `uncertainties` (what "needs clarification" on the source card, and the source outcome) is **material only**;
  - `materialUncertainties` carries `{ kind, description }`;
  - an older server's plain list is used as it is.

### `src/features/workbench/projection.ts`

- **Money rows lead with the role in words:** Total price, Deposit, Balance, Instalment, Unit price, Tax, Fee, Budget, or "What this is for isn’t clear".
- **An assumed currency** reads "Currency assumed".
- **Hidden bookkeeping:** `moneyRole`, `currencyBasis`, `amountText` and `excluded` are never shown raw.
- **A negated responsibility** reads "Not included for {party}: {task}", and the item carries `excluded`.
- **Inferred facts** get `inferred` on the item.
- **`Workbench.conflicts`:** `{ concept, sides: [{ value, from }] }`.
- **Money-row editing:** a row with a role (and its original wording) stays editable.

### `src/features/workbench/UnderstoodWorkbench.tsx`

- **Conflict note:** "Your details disagree on the price: KES 180,000 (minutes.pdf) and KES 175,000 (quotation-rev2.pdf). Tell KS001 which is right."
- **Inferred rows:** show "SecurePay’s reading" in place of "Suggested".

## Tests

- **New:** `tests/entry-perfection-phase5.test.mjs` (6 tests). It covers money in words, the inferred marker, negation, conflicts with sources and no raw leaks, older-server degradation, and material-only uncertainty.
- **Deliberately restated:** in `tests/ui-phase2.test.mjs`, the normalised source badge shape gains `inferred`.
- **Guard wording:** `tests/public-experience-phase2.test.mjs` forbids the word "support" in `src/api` diffs. A dto comment was reworded rather than weakening the guard.

## Browser

`scripts/entry-perfection/cdp-phase5.mjs` writes `build/entry-perfection/browser-phase5.json`.

| Journey | What it checks |
| --- | --- |
| E1 / E2 | Evidence rendering at 1280px and 390px: conflict with both sources, "SecurePay’s reading", "Not included", money roles in words, no raw leak, no horizontal scroll. |
| E3 | A real source with no credential: calm person-facing copy, and a precise `UNDERSTANDING_FAILED:CREDENTIALS_UNAVAILABLE` in the API log. |

- In E1/E2 the context response is substituted in the browser to exercise rendering. The API side is proven by API tests and against real PostgreSQL.
- Both runs passed.
- The Phase 4 checks (C1–C7) were re-run and still pass.
