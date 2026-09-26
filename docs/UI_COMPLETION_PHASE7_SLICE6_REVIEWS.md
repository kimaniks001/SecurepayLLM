# UI Completion — Phase 7 Slice 6: Issues, Formal Review & Resolution (participant, doctrine-neutral)

**Status:** draft PR. Backend: SecurePayAPI `feat/phase7-reviews-disputes-resolution-slice6` (merge that first).
**Baseline:** SecurepayLLM `main` @ `18aae0e8`, SecurePayAPI `main` @ `faa83a32`.

## Scope decision

**Current architectural decision (human, 2026-09-26): doctrine-neutral.**
- Locked `AGREEMENT_REVIEW_DOCTRINE_v2.0` rejects the v1 reviewer-adjudication model.
- Payment Ready honours only v2 release restrictions.
- So **participants still cannot start a formal Review** until the opening decision is made (backend UR-194).
- This slice makes everything else in the participant journey real and truthful.

## What changed

- **Reviews & issues → opening status.** The old "temporarily unavailable" line is replaced by SecurePay's own eligibility read:
  - "Starting a formal review isn't available in SecurePay yet", plus
  - the Review Reserve in words, from the backend minimum and currency (never hardcoded), e.g. "A formal review holds a refundable Review Reserve of KES 200.00 while it is open. It is not a charge. Your Review Reserve currently covers it."
  - No balance is shown, and a failed read says it couldn't be checked.
  - There is no "Start" button anywhere.
- **Add evidence** (`features/review/ReviewEvidence.tsx`), now that backend storage is durable:
  - **When it is offered:** only from a fresh case read that says evidence is open (`canAddEvidence`): an evidence-capable role (opener, respondent, affected party), state `AWAITING_RESPONSE` or `EVIDENCE_COLLECTION`, and the evidence deadline not passed. Otherwise an active review says "Adding evidence isn't open at this stage of the review", never a dead button.
  - **What can be sent:** one file (PDF / JPEG / PNG / plain text, ≤ 10 MB), a type and an optional description, multipart through the existing HTTP client (`FormData` sent as-is).
  - **How a retry stays safe:** the request is bound to the exact bytes by a client-computed SHA-256, which SecurePay recomputes and verifies. An uncertain upload offers **Try the same upload again** (same key) and **Check what happened**, which settles from the evidence list (same SHA-256, added by you). A different file while one is unresolved is refused.
  - **After success:** the case and evidence are re-read; success is claimed only from SecurePay's reply.
  - **What the UI never does:** download, link or render content.
- **Outcome wording:** a recorded outcome is labelled **"Recorded outcome"**, not "What SecurePay decided" (locked doctrine: SecurePay does not decide who is right). It still says the Review doesn't move money by itself, next to **Open Money**.
- **Home Problems → Support:** a Problem (Review/dispute state) opens its Agreement on the Support tab (Reviews & issues). Ordinary opens clear that hint, and no case id is invented.
- **Notifications:** unchanged. Review notifications are published only when a case is opened, carry no action key, and so render no button. Participants cannot open cases yet.
- **Gateway:** adds `eligibility` and `submitEvidence`, both authenticated and in `REVIEW_AUTHENTICATED_METHODS`. The evidence DTO adds `contentSha256Hex`. `openCase` and `requestEscalation` stay unwired.

## Unchanged

Acknowledge and respond keep:
- binding to the exact case `version`;
- the attempt store;
- the stale-version refresh;
- the deadline handling;
- their wording ("records that you have seen it — not that you agree"; "records your formal response — does not decide the review").

## Tests

- `tests/ui-phase7-reviews.test.mjs` (10): gateway, pre-checks, same-bytes key binding, refusals, `canAddEvidence` matrix, case-view evidence control, outcome wording, reserve wording from backend numbers, no opening or escalation calls and no hardcoded reserve, and Problems → Support.
- `tests/ui-phase9.test.mjs` is updated to the new boundary: upload allowed only in `ReviewEvidence.tsx`, and still no download, object URL, link or image anywhere in the Review feature.
