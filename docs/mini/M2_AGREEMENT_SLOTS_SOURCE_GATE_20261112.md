# M2 — Canonical Agreement slots in Mini: source-backed onion layer
**Date:** 12 November 2026 · **Decision:** engineering candidate, **not live M1 acceptance / not a production Agreement**.

## Owner's locked design
SecurePay Mini remains the only primary interface. No Store redesign, new forms, second Agreement engine or mandatory Living Workspace transition. Each subsequent capability unfolds only when necessary. Laws of Focus (#5), Sacrifice (#13), Candor (#15) and Success (#18) remain checkpoints.

## What this PR implements
- Existing first-party Mini's **Review what SecurePay understands** action still performs the same, authorised `GET /api/agent/conversations/{id}/agreement-formation`.
- Instead of a flat summary that shows only a few open points, `MiniAgreementSlots.tsx` presents **only facts actually present** in that server response: what, who, money, dates, responsibilities, conditions, what's excluded and unresolved questions.
- Each known category stays **collapsed until a customer opens it**. Mini does not display seven empty forms or ask for data already provided.
- `miniAgreementSlots.mjs` is a small, independently testable projection of `AgreementFormationDto`. It preserves original server-labelled term values, explicit check flags, party participation and document-reading states. It cannot create, sign, share, fund or pay an Agreement.
- A linked KSNumber **never** counts as the mother's consent, seller acceptance or a party's joined status. Even an acknowledged open point remains unresolved.
- The next question is taken from the backend-provided `question` only if it is marked `ask=true` and not `alreadyAsked`. Any answer remains in the existing KS001 conversation, not a new button that modifies the Agreement silently.
- The view displays server version; ordinary user messages clear the previous review to avoid stale terms appearing current.
- No person, treatment, amount or date is fabricated in production code; unit tests use explicitly synthetic values.

## Exact source files
- `src/mini/miniAgreementSlots.mjs`, `.d.mts` — projection and typed interface.
- `src/mini/MiniAgreementSlots.tsx` — compact native expandable details within the approved Mini shell.
- `src/mini/MiniFirstPartyKs001.tsx` — one-line source-backed handoff to the new view.
- `src/mini/mini.css` — additive styles only; no shell layout reconstruction.
- `tests/mini-m2-canonical-agreement-slots.test.mjs` — eight focused cases for money, date, responsibility, identity versus consent, unresolved matters, server questions, malformed API payloads, and no Money authority.
- Existing four M1 first-party source checks adjusted to inspect the new view's authority boundary, not to accept a changed contract.
- Preview prebuild now gates M1 and M2 using **38 focused tests + TypeScript**.

## Acceptance evidence
Vercel `securepay-llm` preview of `09b49e397d82b8ad399971f1ba0437481c72fac5` showed **READY** with **38 tests passed / 0 failed** and TypeScript complete. A later icon correction is still subject to its own preview build. Build proof is **not** evidence of live KS001, person consent, payment, or an accepted versioned Agreement.

## Gate before live use
1. Real isolated SecurePayAPI staging, not the currently production-backed ordinary Mini Preview API setting. Prove DB/model/Redis/queues/payment-provider isolation, CORS and exact deployment SHAs.
2. Explicit branch-scoped staging origin configured and matching shared API origin; do not route real guest conversations to production.
3. Rerun 12-turn chairs and mother conversation on actual KS001; record versioned `AgreementFormation` snapshots after the user's corrections and after reload.
4. Verify no omitted delivery, no duplicate questions, no mismatched participant, no automatic consent/acceptance, no false Money status.
5. Verify a real signed-in user can eventually save the same canonical unfinished build and revisit it from My Agreements. That is **M3–M4**, not claimed by this read-only viewer.
6. Keep M6 real Money and any public family collection disabled until provider and legal/operational signoff.

**M1 real connection:** BLOCKED pending isolated staging proof. **M2 code:** candidate with focused source tests. **Production:** NO-GO. Preserve the current marketing strategy and original Mini visual lock.
