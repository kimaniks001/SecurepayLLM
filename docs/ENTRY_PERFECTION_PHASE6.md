# Entry Perfection — Phase 6 — Agreement Formation (UI half)

**Branch:** `feat/entry-perfection-phase6-agreement-formation`, stacked on Phase 5 `1b85fa8`. Draft PR only. Full contract: SecurePayAPI `docs/ENTRY_PERFECTION_PHASE6_AGREEMENT_FORMATION.md`.

## What changed

- **`src/features/formation/`** has four parts:
  - `view.ts`: validated adapter over the server's `AgreementFormationView`, plus `whatChanged`, which compares two server projections by semantic key;
  - `controller.ts`: load, check a point, acknowledge updates; it uses the device time zone and never assumes one;
  - `AgreementShaping.tsx`: "Your agreement is taking shape" with **Review this**, shown only when reviewable;
  - `AgreementReview.tsx`: the Review surface — sections, calm **Needs checking** with Mark as checked, collapsed evidence, history, "SecurePay’s reading", a plain-words correction box and **Set this up securely**.
- **`AgentExperience.tsx`:**
  - the card sits at the top of the conversation, and Review takes the main column (the conversation is one tap back);
  - "Review this" opens Review, no sign-in;
  - the agreement refreshes with every new understanding version and with "Refresh what we have";
  - the old "Confirm it above with “Use this” first" hint is removed (UR-239).
- **`handoff/controller.ts` and `api/securepay/agent/index.ts`:** set-up sends the reviewed version (`expectedTradeContextVersion`).
- **`HandoffPanel.tsx`:** "This is ready to set securely. Sign in to continue."

## Tests

- **New:** `tests/entry-perfection-phase6.test.mjs` (9 tests).
- **Deliberately restated:**
  - `ur145-review-gate`: the gate is now the server's `reviewable` / `reviewBlockedReason`;
  - `ui-phase2`: Review this now consults the formation projection;
  - `public-experience-phase4`: the set-up panel inside Review opens the agreement, a 3rd occurrence.

## Browser

`scripts/entry-perfection/cdp-phase6.mjs` checks 1280, 768, 390 and 320px, plus the real-API set-up boundary, a stale version, the real anonymous endpoint and reload. Results are in the API document §16.
