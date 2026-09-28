# Entry Perfection — Phase 8 — Context, Identity & Authority (UI half)

**Branch:** `feat/entry-perfection-phase8-context-identity-authority`, stacked on Phase 7 `b7576cc`. Draft PR only. Full contract: SecurePayAPI `docs/ENTRY_PERFECTION_PHASE8_CONTEXT_IDENTITY_AUTHORITY.md`.

## What changed

- **Review → Who.** A described party reads "… · not yet linked to a SecurePay identity". A linked one reads "KS… · linked to a verified SecurePay identity · hasn't joined yet". Under the list: "Nobody else has joined or agreed yet. You can link or invite them after you set this up." A KS Number is shown only for a party the server verified. The Store offerer reads "(not a participant yet)".
- **Set-up.** When signed in, Review says "You'll set this up as yourself." When the person is acting for a Business or Organization elsewhere, it adds "…not as ABC Ltd — setting up an agreement for a business or organization from a conversation isn't available yet." (UR-265).
- **Authority refusal.** A 403 at set-up reads "You can't set this up with your current permissions. Your agreement is still here — nothing was lost.", announced as `role="alert"`.
- **Sign-out.** A signed-in person signing out starts a fresh conversation and forgets any unsaved possession secret, so the next person on the device never reopens it (§28).
- **DTO.** Parties gain `link` and `participation`, and the adapter gains `linked`.

## Tests

- **New:** `tests/entry-perfection-phase8.test.mjs` (4 tests).
- **Restated:** `tests/entry-perfection-phase6.test.mjs` — the Review party wording (verified → "linked … hasn't joined yet"; described → "… · not yet linked").

## Browser

`scripts/entry-perfection/cdp-phase8.mjs` covers:

- P1–P4 at 1280, 390, 320 and 768px, signed out;
- P5, authority refused at set-up.

Results are in the API document §16.
