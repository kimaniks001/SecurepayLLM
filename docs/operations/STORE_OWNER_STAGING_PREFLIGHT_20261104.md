# Digital Stores owner staging — local verification, 4 November 2026

Status: locally verified isolated deployment; public HTTPS publication is pending. This is not production deployment or full Gate 5 certification.

## Candidate and corrections

UI parent: `f640d9d537eec3d7a40184cfc8f4f8299627eaec` (PR #211).
API parent: `223634567b178a9cce8711308a2c9738c015de0c` (PR #388).
Corrections remain on those development branches; neither branch is merged.

- Replace unsupported `String.replaceAll` in Store setup for the existing TypeScript target.
- Correct two Gate 1 assertions that still expected `#/s/` as the canonical Store URL; execute the actual route parser to retain legacy coverage.
- Prepare an explicitly configured, HTTPS, same-origin temporary owner-testing entry. The optional `VITE_SECUREPAY_OWNER_TESTING_ORIGIN` applies only to a matching `*.trycloudflare.com` origin and never grants production or cross-origin access. It does not change backend authentication. Public Store and SecureLink routes remain independent.
- Compatible API fixes: use the existing `identityId` parameter in the digital address controller; preserve a space after SELECT in six enquiry queries. The latter caused real enquiry requests to fail with SQL `SELECTid`.

## Minimum evidence

`npm ci` completed; the six requested test files pass 46 tests. Typecheck and build pass. Repository-required lint has zero errors and 43 existing warnings. The API compiles and packages, passes its secret scan, starts Spring against a fresh isolated PostgreSQL database, and applies 236 migrations with zero failures.

38 real HTTP assertions pass: separate trader/buyer/unrelated signup and OTP authentication, all three offer kinds saved privately then explicitly published and anonymously retrieved, private GPS redaction, favourites, enquiry delivery/reply, cross-login drafts, stale draft/reply rejection, and financial command denial.

Browser checks use the built real-mode UI and actual same-origin staging API without mocked responses. They verify Store address/appearance save, explicit product publication, embedded Living Workspace/KS001/Check, existing Agreements navigation, buyer enquiry continuation into proposed Check details, saving and resuming the exact server conversation, mobile embedded Store without page overflow, anonymous public Store and safe legacy Store redirect. Desktop and mobile evidence is stored in the deployment's `evidence/` directory. These are Chromium viewport checks, not physical-device certification.

## Isolation and limits

Production API/PostgreSQL/Redis/proxy container IDs, image IDs and start times, production compose/Caddy hashes and served UI index hash match the preflight baseline. The new API has its own PostgreSQL and Redis, staging identities, an internal-only Docker network, and no production secrets. Financial providers are disabled and the staging gateway rejects financial commands. No external AI provider is configured; source selection and proposed Agreement projections were verified, not unrestricted AI conversation quality.

The local verification hostname is not a public testing URL. Publishing a temporary Cloudflare tunnel requires explicit approval after automatic approval review rejected that external destination. No new public tunnel or DNS record has been created.

Staging uses the candidate's real OTP authentication. External email/SMS delivery is disabled; a staging operator must retrieve the test OTP. Store media, covers and galleries remain unavailable. Foreground enquiry refresh works; locked-phone notifications and external message delivery are not operational. Full Gate 5, physical-device coverage and a real existing-SecureLink collision fixture are deferred. `npm ci` reports 22 dependency audit findings (2 low, 6 moderate, 14 high); this deployment did not update dependencies. The build retains its existing large-bundle warning.

## Stop and rollback

Stop only `securepay-store-masterpiece` services and its local gateway/tunnel. Keep PostgreSQL/Redis volumes and evidence; do not use `down -v`. Production rollback assets remain untouched. The earlier Gate 1 staging API was paused to free memory for this isolated build; its data and other containers were retained. Restore that prior staging API after stopping this candidate if needed. Do not merge or replace production without separate owner approval.
