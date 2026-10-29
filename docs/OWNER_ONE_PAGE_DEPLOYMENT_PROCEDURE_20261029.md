# SecurePay — Owner's One-Page Deployment Procedure
_Last updated: 29 October 2026. This is the target operating procedure; one-click automated deployment is NOT yet enabled._

## What the owner does on future releases

1. Tell ChatGPT: **"Prepare SecurePay for staging deployment."** ChatGPT reviews both repositories, the exact candidate SHAs, tests, migrations, KS001/document intelligence, stored agreement pricing, identity flows and rollback readiness.
2. Review one clear **GO / NO-GO** report. The owner approves the exact backend and frontend release pairing and intended destination.
3. When the verified GitHub deployment workflow is enabled, open **GitHub → Actions → SecurePay Staging Release → Run workflow**, select the approved release manifest and press **Run workflow**. Approve the protected *staging* environment request if one is presented. The workflow—not the owner—must build, test, deploy, health-check and record the rollback release.

If any required gate fails, no deployment takes place. Never interpret GitHub "mergeable" as "tested".

## Separate release lanes

- **Staging:** Fully isolated from production database, Redis, Docker stack, credentials and payment rails. External network access for testers must be explicitly controlled. Real bank collections, disbursements, transfers, settlements and payouts stay disabled.
- **Production:** Requires separate written owner GO, green full-stack certification, approved migrations, verified backups, C6 rollback rehearsal, controlled release window, monitoring and documented financial-rail authority. A staging GO is **not** a production GO.

## Mandatory automation safeguards

- Deploy the **exact paired candidate SHAs** from the signed-off release manifest; do not pull mutable `main` at deploy time.
- Use a **restricted staging-only deployment identity**; never reuse the owner's SSH private key, GitHub read-only deploy key or production credentials.
- GitHub Environment protection and approval must be configured before introducing write-capable deployment secrets.
- Compile/test both sources, archive test evidence, verify Flyway/PostgreSQL on a disposable DB, preserve accepted historical Agreement fee snapshots, and prohibit real payment execution.
- Block deployment when validation, health checks, rollback plan, environment isolation, secret configuration or reviewed release manifest is missing.
- Release automation must not alter C6 production proxy, containers, volume mounts or databases.
- Provide the owner a working staging URL, pinned SHAs, test report and rollback reference.

## Current blockers to the one-click procedure (29 October 2026)

1. GitHub Actions runners are not executing: backend check returns `startup_failure` with no jobs, and frontend GitHub-hosted jobs exit within seconds before any steps. Runner/account configuration or billing must be investigated; failing checks are not evidence of application test failures.
2. A genuinely isolated DigitalOcean staging stack and restricted deployment credentials must be verified and provisioned. The existing server's `staging` folder alone is not proof of service/database isolation.
3. SecurePayAPI PR #378 and SecurepayLLM PR #201 are draft release candidates. Source-level TypeScript/build for the UI passed separately on DigitalOcean, but full candidate certification is not complete.
4. Full backend Java/PostgreSQL integration, historical contract pricing preservation, real KS001 media/provider flows, six connected person journeys, monitoring and rollback evidence remain outstanding.

**No production or staging deployment workflow is currently certified or authorised.**

## For the owner, the operating rule

**Tell ChatGPT → approve the release report → approve one staging deployment.**

No repeated Mac Terminal commands once the prerequisites are implemented and independently verified.
