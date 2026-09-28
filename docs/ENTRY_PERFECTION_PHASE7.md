# Entry Perfection — Phase 7 — Question Intelligence (UI half)

**Branch:** `feat/entry-perfection-phase7-question-intelligence`, stacked on Phase 6 `1acb0d6`. Draft PR only. Full contract: SecurePayAPI `docs/ENTRY_PERFECTION_PHASE7_QUESTION_INTELLIGENCE.md`.

## What changed

- **`src/features/formation/NextQuestion.tsx`** (new): the ONE question the server planned, shown under "Your agreement is taking shape" so the agreement stays primary and **Review this** stays visible.
  - Its heading line is either "One thing to settle before it can be set up" or "One point is still unclear".
  - The question sits in an `aria-live="polite"` paragraph.
  - A "Quick answers" group offers:
    - the evidence-bounded choices (at most 3), only when the server provides them;
    - "I don't know yet" and "Decide later".
  - Every button meets the 44px target and is disabled while a turn runs.
  - Every quick answer is an ordinary message in the person's words; free text always works.
- **`view.ts`:** the adapter keeps only a real planned question (`ask=true`, an id and text) with bounded choices. `ask=false` — the common case — means no card at all.
- **`AgreementShaping.tsx`:** carries the question card under the Review CTA.
- **`AgreementReview.tsx`:** "Checked by you — still open". Checked is not resolved (UR-259).
- **`AgentExperience.tsx`:**
  - quick answers go through `controller.send`;
  - the formation (and so the question) is re-read after every completed turn, because "I don't know" changes the question without changing the agreement version.
- **`api/securepay/agent/dto.ts`:** `FormationQuestionDto`, plus `topic`, `state` and `acknowledgedAtVersion` on open points.

## Tests

- **New:** `tests/entry-perfection-phase7.test.mjs` (6 tests).
- **Restated:** `tests/entry-perfection-phase6.test.mjs`. The `<AgreementShaping …>` source assertion now allows the new quick-answer props.

## Browser

`scripts/entry-perfection/cdp-phase7.mjs` covers:

- Q1–Q4 at 1280, 390, 320 and 768px, where a quick answer is sent as a real turn;
- Q5, a keyboard-only quick answer;
- Q6, the real endpoint;
- Q7, no question planned;
- Q8, a checked point still shown as open.

Results are in the API document §14.
