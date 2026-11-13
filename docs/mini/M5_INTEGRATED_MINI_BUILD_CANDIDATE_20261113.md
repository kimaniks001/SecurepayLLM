# Mini M5 — integrated build candidate, UX FROZEN

**13 November 2026 · NO production deployment and NO test pass claimed.**

This branch stacks Mini PRs #288 → #289 → #290 → #291 and retains all
previous M1–M5A/B work. It is the ONE integrated frontend source candidate.
Corresponding API source: `feat/m5-integration-close-quote-origin-lock-20261113`,
stacking SecurePayAPI #411–#417.

## Existing UI, new behavior in the same places
- My SecurePay → My Store: existing compact editor; discuss with the SAME
  KS001 conversation OR explicitly record a server-issued seller quotation.
- My SecurePay → My Agreements: private **Quotations for me** listing and
  new unread in-app quotation notices for the CURRENT signed-in individual;
  fallback manual reference still usable.
- Review quotation: read the original server-owned price and delivery facts
  before explicit buyer DRAFT. Propose, invite original seller, Join, current
  version confirmation, and non-executable plan are separate actions.
- Invitations for me and ordinary Agreement confirmation tools stay canonical;
  no second KS001 agent, new Account, Shopping checkout or scroll-heavy UI.
- Source fetch and every downstream mutation use authenticated real API;
  synthetic Amina/Njeri demo cannot display these routes as if they were live.

## Explicit release gate
`VITE_SECUREPAY_M5_QUOTATIONS=disabled` is the DEFAULT.
The real features are hidden even in non-demo mode until the specific
**isolated matched M5 API** is available. Only a deliberate staging build
with `VITE_SECUREPAY_M5_QUOTATIONS=enabled` exposes real quotation actions.
This environment flag is PRESENTATION-ONLY, NEVER permission to accept,
confirm, reserve, create Money obligations or fund anything. The backend
must independently enforce all authority.

Never point an enabled frontend to the current shared www sandbox API.
The 20-person tester group is for AFTER Java/TypeScript/DB/identity/rail
safety certification and isolated staging readiness, not before.

## End-to-end M5 handoff
1. Seller publishes confirmed goods, enters named buyer and terms.
2. Seller explicitly records quote; API persists immutable quote and
   sends a normal-priority in-app notification with opaque reference.
3. Buyer gets only their own quote; review performs another protected
   backend read; notification read is not consent.
4. Buyer explicitly starts DRAFT, then Proposes.
5. Buyer invites original seller; seller Joins independently via existing
   invitations; buyer and seller separately confirm exact V1/hash.
6. Buyer may stage *non-executable* responsibilities; cannot fund/settle
   or activate executable obligations in M5, even after amendment.

## Status and future gates
Code candidate only. No JS/TypeScript compile, Java/Gradle, DB migration,
signed-in two-account browser UAT, live rollout, payments, 20-person test or
production certification asserted. M10 will provide these before M11 launch.
M6 can now be developed on a separate safe branch without reopening the
approved Mini design.

Do not merge directly to main while upstream draft PRs remain unreviewed.
