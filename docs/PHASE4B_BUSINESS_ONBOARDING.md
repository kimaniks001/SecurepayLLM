# Phase 4B — Business onboarding and "acting as" (UI)

**Status:** Branch `feat/phase4b-business-onboarding-authority`, draft PR. **Not merged. Not deployed.**
**API companion:** SecurePayAPI `docs/PHASE4B_BUSINESS_ONBOARDING_API.md` and ADR-0022 (resolves UR-219).
**Still unavailable:** Business Trust Project Join (UR-218, Phase 4C) and Organization Join (UR-220, Phase 4D).

## 1. What a person can do now

- **Account → Your Businesses → Open your Businesses** is the one doorway. Creation happens only in the Business area.
- **Create a Business** (`POST /api/v1/business`):
  - Enter a name (2–80 characters). The Business gets its own KS Number, and the person becomes its administrator while staying signed in as themself.
  - The copy says plainly that creating a Business does not verify it, open a bank account or enable payments.
  - One `Idempotency-Key` per logical attempt. An uncertain outcome (network, timeout, 5xx) keeps the key, so a retry can never create a second Business; a definitive failure or a new name gets a new key.
  - 400, 401, 403 and 409 each have their own honest message, and none ever shows "is ready".
- **You are acting as.** A radio group (`fieldset` + `legend`) lists the person themself and every Business from `GET /business/mine`, and nothing else.
  - Choosing a Business first asks SecurePay again (`GET /business/{ks}/representation`). Only a confirmation for that exact Business switches the capacity.
  - Anything else leaves the person acting as themself, with "SecurePay couldn't confirm you can act for that Business. You are still acting as yourself." That covers a Business that isn't listed, a 404 or 403, a network failure, or a mismatched answer.
  - The current capacity is announced in a polite live region ("Acting as Kamau Hardware" / "Acting as yourself — Amani Otieno").
  - **Switch back to yourself** is always offered while acting for a Business.
- **While acting for a Business:**
  - it shows the Business name, its KS Number and "You can act for this Business. You're its administrator.";
  - it adds "A Business on SecurePay isn't legally verified, and it can't move money or join The Trust Project yet.";
  - the existing member list and invite form remain, and every call names the Business and is checked again by SecurePay.

## 2. What was removed, and why

- **The typed "Business KS Number" lookup and "Open/Check"** (Account and Business Home). Knowing a KS Number was never authority, and SecurePay now lists a person's Businesses itself.
- **"Activate this Business KS Number"** (legacy). It worked only when signed in *as* the Business KS, which is not a login principal.
- **"What you can do here" permission chips.** Live verification showed that the Organization-scoped authority summary also counts the person's *personal* roles (for example "agreement create"), so the list was not the Business's authority (API UR-227). The only authority statement is now the backend-confirmed relationship.

## 3. State and sessions

- The capacity lives in memory in the Business controller only: never in storage or the URL.
- A refresh signs the person out (pre-existing: the session is in memory). After signing back in, the Business list is rebuilt from `GET /business/mine`, and the capacity starts as the person themself.
- Sign-out calls `businessController.reset()`, so nothing about one person's Businesses carries over to the next.
- If the backend stops listing the current Business (for example after a member removal), the capacity drops back to the person at once.

## 4. Verification

- **Tests:** `tests/phase4b-business-onboarding.test.mjs` (18) uses the real controller, gateway and `BusinessExperience`. Earlier tests that pinned the replaced flows (life-business J2/M1/M2, phase-2 gateway freeze, phase-7 sign-out) were updated to the new truth, keeping their intent.
- **Live, against the real Phase 4B backend (sandbox):**
  - **B1:** a new person (KS035) signed up in the browser and created Kamau Hardware (KS036); it appears from the backend list.
  - **B2:** acting as Kamau Hardware was confirmed by `/representation`; the members read (`ORGANIZATION_READ`-gated) succeeded.
  - **B3:** another person using KS034 got 404 on representation, organization and members, and 403 on the Projects owner read. The UI offers no input path for a typed KS.
  - **B4:** while acting as the Business, `#/join` offered only personal Join; no Business, KS036 or Organization appears.
  - **B5:** individual Join succeeded (`ACTIVE/DIRECT_JOIN`); both Businesses have no Trust Project row.
  - **Refresh:** after reload plus a real password + MFA sign-in, the list was rebuilt from the backend.
  - **Widths:** 1440/1024/768/390/360/320 in a same-origin iframe, signed in. All had 0 page overflow, 0 elements past the edge, no Business-area control under 44px, and every nav item visible, unclipped and at least 44px (7 on mobile, 8 on desktop). A long Business name wraps at 320.
  - **Keyboard:** a real ArrowUp switches capacity; focus is visible; the live status updates.
