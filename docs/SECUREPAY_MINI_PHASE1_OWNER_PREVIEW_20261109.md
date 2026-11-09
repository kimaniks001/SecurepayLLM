# SecurePay Mini — Phase 1 Owner Preview (9 November 2026)

**Status:** Built in isolated development branch; owner/browser and automated production-readiness certification not yet complete.
**Phase 0 dependency:** `docs/day8-securepay-mini-phase0-blueprint-20261109` / draft PR #242.
**Money:** OFF — local, fictional experience preview only. No production API calls by Mini.

## What the owner can actually experience

1. **Standalone Mini:** navigate to `/mini.html` on the isolated preview host; full responsive interface on phone and desktop.
2. **Sample embedded Mini:** navigate to `/mini-host-preview.html` on the same preview host; open the floating Mini, collapse it, and resize on desktop. This is NOT an Estate or ShortStays integration and does not modify either product. The iframe is sandboxed and has no parent-token access.
3. Start naturally with your own words, or tap **Sell something / Pay someone / Collect money**. These are starting purposes, not three separate payment engines.
4. Write what the transaction is about, enter a human-supplied amount, optionally describe a person/KS Number or additional conditions.
5. Optionally take/select an image using the phone. The photo stays in browser memory, is not analysed, uploaded, or used to assert product quality/stock.
6. Review a coherent draft, edit it, then explicitly **Keep draft in this tab**. Only intentionally saved non-sensitive local text (not any counterparty or photo) is retained in sessionStorage. A browser denying storage keeps work on the current page without claiming persistence.
7. Switch between English and Kiswahili; return/clear without losing unrelated work on the existing main SecurePay application.
8. Ask KS001 clearly identifies the Mini's **live AI gap** and offers the existing main SecurePay site. It never pretends to be a live agent.

## Deliberate omissions (correct for Phase 1)

- No real KS001 model session, cross-site conversation transfer or authenticated KS identity.
- No backend Agreement, invitation, QR payment, Store stock reservation, barcode recognition, verified recipient, payment rail, ledger, fund release or real receipt.
- No claim that the reviewed local draft was signed, sent, funded or settled.
- The link to full securepay.ke does **not** transfer a local Phase 1 draft. Actual authorised same-conversation transfer belongs to later stages.
- The sample merchant host is a controlled test surface and is not public third-party Mini distribution; `vercel.json` restricts framing of `/mini.html` to same-origin only.
- No real trader details or payment records should be entered in this preview. Use fictional data only.

## Source inventory

- `mini.html`, `src/mini/main.tsx`, `src/mini/MiniExperience.tsx`, `src/mini/miniModel.ts`, `src/mini/mini.css`.
- `mini-host-preview.html` (same-origin, sandboxed demonstrator).
- `vite.config.ts`: additive Rollup multi-page entries, preserving original `index.html` and `src/RuntimeApp.tsx`.
- `vercel.json`: exact Mini-only frame-ancestor restrictions and no-index headers.
- `tests/securepay-mini-phase1.test.mjs`: focused assertions for accurate local drafts, safe persistence, isolated routing and no financial claims.

## Source and test gates

**Focused commands** (do not run the full inherited suite for one tiny UI iteration):

```sh
node --test tests/securepay-mini-phase1.test.mjs
node --test tests/securepay-mini-trader-cohort.test.mjs
npm run typecheck
npm run build
```

The first two validate source semantics and fixture integrity, **not the experience of an actual person**. Typecheck/build certify TypeScript and bundle only. Browser owner testing is distinct and must use a traceable preview SHA.

The owner and ChatGPT test unscripted jobs across different fictional reference traders, not pre-rehearsed charger stories. Owner feedback should be recorded against the exact preview and the three checkpoints (first/repeat/evolving) with **no made-up PASS results**.

## Phase 1 owner acceptance

- Does it feel simple without someone showing where to click? Could an older trader begin with an ordinary sale in their own words?
- Are the start and review steps obvious and calm on a small Android phone?
- Are price, quantity, person and extra conditions understandable, without legal or financial jargon?
- Can the owner recover from missing amount, mistaken amount, accidental interruption, declined local storage, failed photo selection or no internet?
- Does it unmistakably identify that it is a local draft, not a confirmed agreement/payment?
- Is the embedded window non-invasive, accessible and easy to collapse without disrupting the sample host?
- Are both the existing SecurePay main page and all previously approved features completely unchanged?

**Phase 1 is not certified finished until the owner can test an actual preview and evidence passes.** This document is the implementation/handoff note, not a fabricated user-test report.
