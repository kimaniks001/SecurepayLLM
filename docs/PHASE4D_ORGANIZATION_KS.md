# Phase 4D — Organization onboarding and represented Trust Project experience (UI)

**Status:** Draft branch `feat/phase4d-organization-ks-authority-join` (2026-09-28). Not merged, not deployed.
**API:** SecurePayAPI ADR-0024 and `docs/PHASE4D_ORGANIZATION_KS_API.md`.

## What changed

- **One place for represented identities.** Account → "Your Businesses and Organizations" → **Businesses and Organizations**.
  - One radio group (`fieldset` / `legend` "You are acting as") lists yourself, your Businesses (briefcase icon, "Business · KS…") and your Organizations (landmark icon, "Organization · KS…").
  - The list comes from the backend only: `/business/mine` and `/organization/mine`.
- **Create an Organization** (`POST /api/v1/organization`) sits in its own section.
  - It explains: "for a group that isn't a business — like a residents association, church, school, welfare group or chama".
  - It says plainly that creating one "doesn't register or verify it, open a bank account or enable payments".
  - One `Idempotency-Key` per logical attempt. An uncertain outcome keeps the key; a new name gets a new key.
- **Acting for an Organization** happens only for one the backend listed, and only after `/organization/{ks}/representation` confirms it again, with `identityType: ORGANIZATION`.
  - It shows the name, "Organization KS Number", "You can act for this Organization. You're its administrator." and "An Organization on SecurePay isn't legally verified or registered, and it can't move money."
  - It shows the Organization's own Trust Project state, with one doorway: "Review the 12 Principles and join for {Organization}".
  - It offers no member management, governance, login or money.
- **The Trust Project page** adapts to an Organization exactly as it does to a Business:
  - it says "You are acting for {Organization}" and "Organization KS Number …";
  - the acceptance reads "I choose, for {Organization}, …" and the button "Join for {Organization}";
  - reads and Joins go through `/community/membership/organization/{ks}[/join]`.
  - A capacity change remounts the page, keyed by kind and KS, so targets never mix.
  - Stale Principles and lost authority behave exactly as in 4C, and the lost-authority message names the Organization.
- **In memory only.** Nothing is stored or read from the URL. Sign-out clears every capacity, and a refresh or sign-in rebuilds everything from the backend.

## Fixes found in live verification

1. **The acting-as group lost keyboard focus while SecurePay confirmed a switch.** The `fieldset` was `disabled` while busy (pre-existing 4B markup). It is now `aria-busy`, and the controller already ignores a switch while busy. Pinned by a test.
2. **"You no longer have authority to manage this Business."** was shown for an Organization. There is now an Organization-specific message; the Business message is unchanged. Pinned by a test.

## Tests

`tests/phase4d-organization-ks.test.mjs` has 18 tests. They cover UI items 1–14 of the Phase 4D brief, plus key reuse, confirmation mismatch, stale Principles, the gateway contract, focus-while-busy and the Organization lost-authority copy.

These earlier tests were deliberately restated for the approved 4D shape; none was weakened:
- `phase4b-business-onboarding` 7/8 and the Account doorway;
- `phase4c-business-trust-project-join` 4, 6/7 and 11, and the lost-authority source shape;
- `public-experience-phase4`, the represented-Join firewall;
- `public-experience-phase2`: RuntimeApp and the gateway index may only gain the Organization gateway.

## Live verification

This ran against a real local API (SANDBOX, real PostgreSQL + Redis). A fresh person (KS061) signed up through the UI.

| Journey | Result |
| --- | --- |
| D1 create | Created Business Keyman Oak (KS062) and Organization "Varsityville Residents Association of the Greater Kahawa Sukari Estate" (KS063) in the UI. Both appear, labelled apart |
| D2 act as Organization (keyboard) | Focus on yourself, then ArrowDown ×2. SecurePay confirmed the Organization, focus stayed on its radio (`:focus-visible`), and the live region said "You are acting for …, Organization KS Number KS063" |
| D5 Join | The Join page named the Organization in the identity line, acceptance and button; the button's description was exactly the identity line and the KS Number. Tick, then Join: "has joined The Trust Project", announced. The database shows KS063 ACTIVE |
| D6 / D7 independence | Switching back to yourself offered the personal Join ("You are joining as James Kimani"). Keyman Oak still showed "has not joined". The database shows KS061 and KS062 with no membership |
| D8 revocation | A second Organization (Umoja Welfare Group, KS064) with its Join acceptance ticked. The administrator assignment was revoked in the database, then Join was clicked: "You no longer have authority to manage this Organization. Nothing was joined…". The database shows no KS064 row |
| D9 refresh | A fresh app instance with password + MFA sign-in rebuilt yourself, Keyman Oak and Varsityville, and dropped the revoked Umoja |
| Widths | 1440/1024/768/390/360/320, on the Businesses & Organizations page (acting for a long-named unjoined Organization) and its Join page. Results: 0 horizontal overflow; 0 elements past the edge; nav intact with every item ≥ 44px; no control < 44px; the name wraps; the Join button wraps to 2–3 lines at 390–320 and stays in view |

**Observation, not changed:** the 4A intro line "People and businesses can belong." (Join page and public Home) is still true but doesn't mention Organizations. 4A tests pin it, and changing public Home copy is outside 4D's minimum UI.
