# SecurePay Mini — Clean Approved Baseline
**Decision: 10 November 2026. Owner requested: "go back to when the mini was not complicated".**

## Active source
This branch starts from the **owner-tested Phase 4** commit `8f4b551f333ea3475770590ada8ed442451e617b` (draft PR #263), **BEFORE** Phase 5 experiments. Its contents contain no Phase 5 host registry, additional registered-host demo pages, test-only links in Store or ShortStays, or My Ride / Storage / Estate readiness dashboard.

This is a **rollback of active development**, not a claim that real payments work and not a production deployment.

## One product — no parallel checkout systems

The customer remains on their ordinary Store, ShortStays, Estate or other host interface. A single compact **SecurePay Mini** should handle:
1. The host's genuine transaction and a clear explanation of its source.
2. One reviewable Agreement; KS001 assistance only when called.
3. One choice of financial method, including a safe method manager.
4. Pay once or a deposit/milestones when appropriate to the Agreement.
5. One unmistakable next action and return to the same original host.

The full SecurePay site must share the **same Agreement and financial-method rules**. The host's identity, visuals, account workflows and approval authority remain independent. Money always follows an Agreement.

## Preserved now (offline owner-accepted Phase 4)

- Existing compact Mini + approved linked official SecurePay logo.
- Both fictional Store and ShortStays journey fixtures; no forced chat.
- Simulated provider selection (Choice Bank, M-Pesa, PesaLink).
- User-added **fictional** financial-method nicknames, from Mini and main Money.
- Illustrative pay-once/deposit/milestone scenarios, evidence and next-action prompts.
- Existing unknown/failed/resume checks and explicit NOT PAID statuses.
- Existing focused verification and original approved Living Workspace UI.

**This means the simulation capability remains behind a development boundary. It should not be represented as the user's normal product navigation.**

## Retired from active development, NOT silently merged

- Phase 5 Gate 1 separate host reference pages and popup launcher experiment (PR #264).
- Phase 5 Gate 2 public signed-host-ticket preview and branch-scoped registry experiment (PR #265).
- Phase 5 Gate 3 owner-specific navigation from Store and ShortStays (PR #266 and ShortStays PR #20).
- Unmerged Gate 4 Ride / Storage / Estate readiness lab and its scenarios.

These older branches remain as **historical experiment records only**. Do not build new work on them; do not deploy or merge them into the restored Mini. Security checks remain documented but should be evaluated later as infrastructure behind a single checkout—not new user-facing pages.

## Real-world boundaries

- SecurePayAPI still unavailable: no real authenticated signed Agreement, identity, merchant/order confirmation, verified reservation, payment provider, actual deposit, settlement, release or notifications.
- No cross-origin production Mini yet. Real integration must prove registered host, same-version source, exact participant permission, verified payment and safe return. None of that is represented by browser-only simulation.
- No changes to `varsity.estate.ke`, its gate rules or live Estate user interface.
- ShortStays' patched dependency work stays in historical PR #20; this frontend rollback does not apply or reverse a ShortStays production update.

## Development direction

**Stop adding routes, host test pages and substitute payment products.** Future work must begin from the user's one-screen task, document exactly one gap, and use the **same Mini component**. Only after the owner approves the single customer experience should an API/host implementation be replaced behind the interface. Store and ShortStays are the first two hosts; do not add Ride, Storage or Estate until the basic customer experience is coherent.

Owner review link on this branch: `/mini.html` (compact original Mini).
