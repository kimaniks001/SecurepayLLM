# Mini Sell Something — Phase 3 engineering handoff

**17 November 2026. Draft preview feature, NOT production certification.**

Phase 3 Mini implements a quiet seller-side Fair Trade examination, guided photo and supplier-rights clarification, answer pills, save/edit/remove and discreet KS001 help. It preserves an unfinished offer, avoids claiming stock/rights verification, and leaves the seller with exactly three natural exits:

- **Share with buyer** (local example only until real SecureLink integration in Phase 4)
- **Add to my Store** (local example only until owner-authorized Store integration)
- **Save for later** (local preview, not a canonical API Store write)

There is **no seller Connect to Money**. Buyer/payer initiates and authorizes Money from an accepted Agreement.

Backend companion draft: `kimaniks001/SecurePayAPI` PR #475, including private pending image-use, reviewer evidence/clarification, immutable assessment and default-disabled separate approval and owner-preview image delivery. The backend also now requires **two independent rollout gates** for issuing positive rights decisions: `image-rights-decisions-enabled` and `verified-rights-infrastructure-certified`. Do not treat existence of a rights assessment or a local photo as approval.

## UX safety contract

1. Show only known facts: what the seller entered, what image is local, which review question is outstanding. The photo label remains **Local photo · image registration pending** until a genuine server record exists.
2. A seller declaration never proves ownership, product availability, supplier permission or copyright.
3. Keep the deeper examiner initially folded; present one useful question at a time using answer pills, never force lengthy explanations.
4. If the seller does not have rights to use a photo, offer **Replace photo** or **Continue without photo** and retain the text offer.
5. Never label an unverified image `Identimark`, `Approved`, `Rights verified`, `Published` or `Verified stock`.
6. Never issue a fake SecureLink, send an invitation, start Money, or create a real Agreement from the preview.
7. Store/KS001/Business must read only server-authoritative statuses when Phase 4 integration is authorized. No approval flag can be synthesized by the browser.

## Verification

Previously reported isolated preview: 203 focused tests, TypeScript and Vite succeeded on earlier head. **Those are not a verification of this companion API branch's newest commits.** No fresh all-repo Java/SQL/security/concurrency or cross-client certification has been executed here.

**Phase 3 preview engineering handoff complete; production-safety certification OPEN.** Phase 4 may build text-only seller Store and SecureLink work without waiting for public photos. Keep both PRs as draft/unmerged until owner acceptance and actual testing.
