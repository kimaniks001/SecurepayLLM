# SecurePay Mini — Phase 2 Capture & Trade Preparation

**Date:** 2026-11-09
**Branch:** `feat/mini-phase2-capture-prepare-20261109`
**Status:** Owner preview candidate; actual browser/owner usability certification remains open.
**Inherited baseline:** Phase 1 Mini compact preview, stacked on Phase 0 blueprint. No changes to production, Store inventory, backend Agreements, KS Number authority, money rail or approved three-panel SecurePay UI.

## Human objective

A person should be able to **start with what they have**, not the vocabulary of the software: a description, a photo, a document, spoken words, a printed barcode or an existing Store item description. Mini must help **prepare** accurate seller-reviewed trade details in the same small window. It must never claim to have inferred or verified a product, amount, seller, stock, document, agreement or fund.

## What is built

| Entry | Phase 2 behaviour | Important limitation |
|---|---|---|
| Text | Type freely or start from ordinary sell/pay/collect intent | No live AI interpretation yet |
| Photo | Camera or file preview selected locally | No photo understanding, authenticity proof, OCR or upload |
| Document | Read a `.txt`, `.md` or `.csv` file **locally**, up to 256 KB, show a short preview, then let the person deliberately use selected text | PDF/Word files display **reference/name only**; no claim of document reading, no file upload or server storage |
| Voice | Optional browser speech recognition in English/Kiswahili when supported, with visible transcript approval | The browser's speech provider may process speech; no Mini audio file is sent or stored; unsupported browsers have typed-input fallback |
| Barcode | Human-typed barcode or read from a user-selected photo on browsers supporting `BarcodeDetector` | Barcode is a **code reference**, not confirmed item name, seller, price, stock or authenticity |
| Store item | Paste details from an item the trader has checked | This is **not** a live SecurePay Store search or inventory reservation |
| Quantity/unit | Optional human-reviewed quantity, variable units and amount | No fabricated unit price, delivery fact, sale or stock decrement |

The capture drawer remains **collapsed by default**. The familiar compact first screen and Phase 1 review remain intact. On review, selected source references are labelled *local/unverified*.

## Privacy and safety

1. Mini has **no financial API calls**. All work is a local, unissued draft.
2. No source file bytes, audio, barcode reference or counterparty entry are automatically persisted; only the user's intentionally saved draft text, amount, quantity, unit and note can enter sessionStorage. If source text is inserted into the editable description and saved, that description is then deliberately saved for this tab.
3. Image preview stays local; PDF/Word content is not processed. Browser dictation providers may handle microphone input under their own conditions; the user must choose to start dictation.
4. Source files or URLs do not bypass identity, Agreement review, funding confirmation, fulfilment or release governance.
5. No fixed illustrated trade noun or fictional trader name appears in product routing logic.

## Evidence criteria

Run only the focused checks:
```sh
node --test tests/securepay-mini-trader-cohort.test.mjs
node --test tests/securepay-mini-phase1.test.mjs
node --test tests/securepay-mini-phase2.test.mjs
npm run typecheck
npm run build
```

The **same humans** can revisit their fictional reference trader cases while changing the product, amount, form of input, quantity and counterparty. Human owner testing occurs on the inspectable Vercel preview. A successful build is not a certificate of AI capture or actual transaction flow.

## Phase 2 owner tests to try without a walkthrough

- Start from a previously unseen everyday trade described in natural language. Does the draft preserve what you meant without inventing a price?
- Add a product photo. Is it clear that the photo has **not** been analysed?
- Use a small text document and review what will enter the draft. Try a PDF and see whether Mini correctly refuses to pretend it has read it.
- Dictate a short description (if the browser supports dictation), review or correct the words before use.
- Enter a printed barcode or select its photograph. Does Mini avoid inventing a corresponding product?
- Describe variable quantities or units, intentionally enter an invalid quantity and recover.
- Change language midway; close the popup and return. No host page should unexpectedly change.
- Try a second unfamiliar trader example. Generalise behaviour, not specific strings from the first test.

## Deferred correctly

- Actual KS001 understanding of media, OCR/document reading, entity/store reconciliation and multi-item extraction needs the authorised shared agent/backend integration.
- Live Store lookup, authenticated KS Number and Agreement formation, public invitations, money funding/release and evidence must use SecurePayAPI in their future explicit gates.
- No requirement to enrol real traders, enable bank rails, change fees or install Mini on estate/ShortStays yet.

**Phase 2 developer completion:** Only after exact-build focused checks and Vercel preview READY.
**Phase 2 owner acceptance:** Only after owner personally tests the compact workflow. No simulated trader run is human evidence.
