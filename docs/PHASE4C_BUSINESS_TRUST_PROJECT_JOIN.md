# Phase 4C — Business Trust Project Join (UI)

**Status:** Draft branch `feat/phase4c-business-trust-project-join` (2026-09-27). Not merged, not deployed.
**API:** SecurePayAPI ADR-0023, `docs/PHASE4C_BUSINESS_TRUST_PROJECT_JOIN_API.md`.
**Supersedes in part:** `PHASE4B_BUSINESS_ONBOARDING.md` §"While acting for a Business". The Business area now says "it can't move money" and no longer says it "can't join The Trust Project yet".

## What changed

- **There is one Trust Project page (`#/join`), and it adapts to who the person is acting as.** The 12 Principles content is the same canonical content on both paths.
  - **Acting as yourself:** "You are joining as {name}". Otherwise this is the Phase 4A personal Join, unchanged: `GET /community/membership/me`, `POST /community/membership/join`.
  - **Acting for a Business:** the page reads that Business's own membership (`GET /community/membership/business/{ks}`) and shows:
    - "You are acting for {Business}";
    - "Business KS Number {ks}";
    - "Switch back to yourself".
- **The Join names the Business everywhere:**
  - "{Business} has not joined The Trust Project yet."
  - "You can join for this Business because you are authorized to act for it."
  - The acceptance reads "I choose, for {Business}, to join The Trust Project under these 12 Principles."
  - The button reads "Join for {Business}". Its accessible description is only the "You are acting for…" line and the Business KS Number.
- **SecurePay decides.**
  - The Business target comes only from the capacity SecurePay confirmed in the Business area; nothing is read from storage or the URL.
  - `canManage: false` shows no Join.
  - A 404 or 403 on the read or on the Join shows "You no longer have authority to manage this Business." and "Nothing was joined for {Business}.", with "Continue as yourself".
- **Stale Principles:** the same handling as 4A. The page re-reads the Principles, unticks the acceptance, and never joins silently.
- **Independence:**
  - A successful Business Join says "Only {Business}'s membership changed. Your own membership is unchanged…".
  - Changing capacity remounts the page, so targets never mix.
  - Conversation continuity (4A) stays personal and is never attached to a Business decision.
- **Business area:** shows the Business's own membership and one doorway, "Review the 12 Principles and join for {Business}". It never joins by itself. If SecurePay says the person can act for the Business but can't decide for it, it says so.
- **Not present:** any Organization Join or Organization capacity (tested).
- **Accessibility fix found in live verification:** the acceptance label (shared with 4A) measured 40px at desktop. It now has a 44px minimum target (`min-h-[44px]`), which is test-pinned.

## Tests

`tests/phase4c-business-trust-project-join.test.mjs` has 13 tests. They cover UI items 1–12 of the Phase 4C brief, plus the label target. Three 4B boundary tests were restated for 4C.

## Live verification

This ran against a real local API (sandbox, real PostgreSQL + Redis), with a fresh person signed up through the UI.

| Journey | Result |
| --- | --- |
| Create + act | Created "Keyman Oak Furniture and Joinery Workshop Limited" (KS052). Acting for it showed "has not joined" and the doorway |
| C3 Join | Ticked the acceptance, then "Join for Keyman Oak…". The page showed "has joined The Trust Project", announced through the live region. The database has KS052 `ACTIVE` |
| C4 Separation | "Switch back to yourself" showed "You are joining as James Kimani" with the personal Join. The person (KS051) still had no membership in the database |
| Two Businesses | KS052 (joined) and KS053 (not joined) each showed their own state |
| C6 Revocation | The page was on KS053's Join with the acceptance ticked. The person's KS053 administration was then removed out of band, and they clicked Join. The page showed "You no longer have authority to manage this Business. Nothing was joined…" and "Continue as yourself". The database shows no KS053 row |
| Refresh | A fresh app instance signed in with password + MFA. `/business/mine` rebuilt KS052 and dropped the revoked KS053 |
| Widths | 1440/1024/768/390/360/320 on the unjoined long-named Business Join, in a same-origin iframe. Results: 0 horizontal overflow; nav intact with every item ≥ 44px; Join button 44px (65px, wrapped, at 360/320); acceptance label ≥ 44px after the fix; the long Business name wraps in the identity line, the acceptance and the button |
| Keyboard | Clicking the acceptance and pressing Tab focused "Join for {Business}" with `:focus-visible` (2px + 4px ring). The Join button is disabled until the acceptance is ticked |
