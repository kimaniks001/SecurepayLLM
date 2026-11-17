# SecurePay Mini — Sell Something Phase 4 Engineering Completion

**Date:** 17 November 2026  
**Status:** Feature engineering completed for the approved **text-only, personally-authorized Agreement / Store / standard SecureLink** scope. **Not production certified, not merged, not deployed to the live application.**

## Scope completed

### The seller's three clear choices

1. **Share with buyer:** A seller can deliberately send full approved offer terms into an authenticated KS001 conversation. A server-acknowledged turn and exact Trade Context version precede a canonical Agreement handoff. The seller sees server facts and accepts them via answer pill; server digest and Agreement version ID/number/hash are checked before proposal. The final standard SecureLink URL comes only from the authorized Agreement doorway. A SecureLink is not an acceptance, invitation to pay or Money authority.
2. **Add to my Store:** The seller explicitly creates a private, canonical Store draft under their real personal or represented Business Store. A second explicit pill publishes **text only** after a fresh server read plus version-fenced atomic publication. Images and asserted inventory quantities are blocked until separate rights/availability checks. Public state remains **Needs confirmation**.
3. **Save for later:** The approved local text-only seller note persists without claiming to be a canonical Agreement, uploaded photo or Store publication.

### Existing Store management convergence

- New standard Store offers save privately and show a Review Draft action. A second publication confirmation uses the same version-fenced text-only API as Mini.
- Already-public, compliant text-only offers may edit title, description or price **without unpublishing** using a separate owner-confirmed, exact-revision API. The Store experience and compact Mini Store manager use the shared controller.
- An existing text-only offer cannot escape to the old unfenced PUT to add photos, inventory numbers or an unsupported availability state.
- Older live photo-bearing/quantity-claimed listings remain unchanged and on their existing restricted legacy handling until their own Phase 3 rights/availability authorization and versioned migration; the global `securepay.store.strict-versioned-publication` gate stays **OFF**.
- No Store action creates a separate Agreement, paid order, escrow, KS001 rights grant, or verified stock assertion.

### Security/identity

- Real Store/Agreement gateways are injected only from the authenticated first-party Mini shell; the owner demo remains isolated.
- Personal Agreement sharing uses the user's actual KS001 conversation authority. Business Store administration does **not** give authority to make a Business Agreement; Mini withholds both Agreement and Agent handoff gateways in Business mode.
- Existing backend Agreement public doorway and canonical handoff endpoints are reused, not reimplemented with browser-made identities or URLs.
- Uncertain write outcomes require checking the same Store/Agreement; no silent duplicate retry.
- Material fields are never silently clipped. Unapproved description, changed candidate, changed source version/digest, or unconfirmed Agreement revision stops sharing.

## Verification actually obtained

- **Latest frontend commit** `ca8c02155bab055076c1c3e63721bb06a10157bb` passed the configured Vercel preview build for `securepay-llm`; the deployment reached **READY** at `https://securepay-4uarfh7zi-james-8078.vercel.app`. This includes the repository's configured frontend prebuild checks, TypeScript verification and Vite production compilation.
- Earlier frontend build failures exposed two TypeScript errors (unsafe optional selected offer and non-narrowed Store result). Both were fixed and the subsequent builds passed.
- Independent focused JavaScript bridge and Store UI policy tests were also executed (64 checks in the earlier focused pass). Full frontend build evidence supersedes isolated type-check claims.
- **Backend evidence is incomplete.** Java 21/Gradle service/controller tests, PostgreSQL/Flyway migrations, concurrent CAS, authenticated real Store and Business representation integration, and a full two-repository end-to-end checkout were **not** executed. The Spring tests exist on the API branch but have not run here.

## Important backend database correction

API companion `kimaniks001/SecurePayAPI` PR #476 includes:

`database/migrations/V20271117169000__store_offer_optional_availability_confirmation.sql`

The original `market.store_offers.availability_confirmed_at` column had a **NOT NULL** constraint, inconsistent with a newly private draft or public listing whose stock is still **Needs confirmation**. The new migration drops that constraint without rewriting or falsely confirming existing listings. It is essential before Phase 4 backend endpoints are made available.

## Release gates deliberately carried forward

1. Apply and verify the new Flyway migration in an isolated PostgreSQL sandbox; execute Java 21 tests, concurrency tests, actor/tenant and Business representation denial tests.
2. Verify personal Share → saved KS001 source → exact server review → DRAFT → PROPOSED → standard SecureLink through the actual staging API, including duplicate timeout recovery and unchanged version.
3. Verify Store private save → separate text publication → changed-revision conflict and public listing read; no image or unverified quantity exposure.
4. Keep older media/inventory legacy Store flows behind their existing rights gates. Strict versioned publication cannot be enabled platform-wide until they are migrated.
5. Business Agreement creation in the legal identity of the Business requires a separate Organization-authorized agreement flow. Until that is certified, Business Store sellers can prepare Store offers but may not use personal Agreement authority to bind a Business.
6. Preserve Phase 3 image rights/Identimark and Phase 7–11 provider, Money and release gates. **Buyer alone authorizes Money after Agreement acceptance.**
7. Keep frontend PR #329 and API PR #476 stacked on their Phase 3 draft branches and **unmerged**. Production has not been changed by these commits.

## Phase declaration

**Phase 4 feature engineering is complete for its approved gated text-only scope.** This does not mean production launch, general Business Agreement authority, media/image-rights certification, or backend regulatory/security acceptance. Carry the remaining verification and cross-cutting release gates into the final integrated testing/release roadmap without redesigning the Mini seller UX. Phase 5 may begin with Store/settings and membership authority while these gates remain explicit.
