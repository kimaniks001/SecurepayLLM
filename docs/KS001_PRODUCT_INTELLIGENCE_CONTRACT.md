# KS001 Product Intelligence Contract

## Product intent

KS001 should not behave like a generic chatbot sitting beside SecurePay. It should understand which SecurePay surface the person is using, what they are trying to accomplish there, which SecurePay capabilities are real and currently available, and when one of those capabilities could genuinely reduce work or risk.

The desired experience is: **“SecurePay noticed what I am doing and suggested the right next tool at the right time.”**

That is distinct from marketing. KS001 must not push unrelated products, invent availability, infer authority, or turn a suggestion into an action without explicit consent and backend permission.

## Frontend context now wired in PR #107

The frontend now gives the person an explicit contextual doorway back into the one KS001 experience from:

- Vision Board
- Store discovery
- Store management
- Living Agreement

The request is visible and user-triggered. It asks KS001 to recommend only real, verifiable SecurePay products/services/capabilities relevant to the current surface.

This improves situational context but **does not make the backend knowledge catalogue complete**.

## Verified backend limitation

SecurePayAPI currently has a code-owned `AgentCapability` registry and Knowledge Core routing, but the capability registry is narrower than the actual platform and the knowledge router is primarily reactive to explicit SecurePay questions.

Examples of real platform areas that are not represented as a complete, governed product/service catalogue in the current Agent capability registry include:

- Vision Board / Dreams
- Projects
- fulfilment needs and route comparison
- shared fulfilment / Community Saver
- Skills Institute
- financial-services discovery and institution classes
- Developer platform / Connect
- Notifications / support workflows
- Community Projects / Apprenticeship Projects
- Store operating cockpit as a broader service beyond listing search
- Agreement execution/evidence/review as distinct user-facing capabilities

Money is partly represented but deliberately not Agent-exposed for commands. That boundary should remain.

## Required backend design

A complete fix should add a governed **SecurePay Product & Capability Intelligence** layer, not hard-coded prompt copy.

For every product/capability KS001 may mention, backend truth should provide:

1. Stable capability/product code.
2. Human problem it solves.
3. Human benefit.
4. Implementation state.
5. Current exposure level for KS001: KNOW / EXPLAIN / READ / PROPOSE / INITIATE_EXPLICIT_FLOW / NOT_EXPOSED.
6. Allowed surfaces/modes.
7. Actor eligibility when relevant.
8. Required authority and consent.
9. Known limitations.
10. Destination/action reference when a real UI flow exists.
11. Freshness/version provenance.

The model should receive only the bounded capabilities relevant to the current surface + current task.

## Surface awareness

The agent context should eventually carry a backend-recognized surface/mode such as:

- HOME
- VISION
- STORE_DISCOVERY
- STORE_MANAGEMENT
- AGREEMENT_FORMATION
- LIVE_AGREEMENT
- AGREEMENT_EXECUTION
- MONEY
- COMMUNITY
- PROJECTS
- SKILLS_INSTITUTE
- ACCOUNT
- DEVELOPER

Surface awareness is context, never authority.

For example:

- On Vision, KS001 may suggest Store discovery, a Master, comparison, or moving toward Agreement when the idea is mature.
- On Store, KS001 may suggest comparing fulfilment routes, bringing an offer into Agreement, or checking availability.
- On Agreement, KS001 may suggest fulfilment help, evidence, review, a Master/Plug where relevant, or Money only as an explanation/navigation suggestion where permitted.
- On Money, KS001 may explain current backend-owned state and route the person to existing Money actions, but must never fabricate payment readiness, fees, release rights or move money.
- Community Saver may only be proposed when the governed Plug requirement can be verified and enforced.

## Proposal behavior

KS001 should proactively propose a capability only when all are true:

- the current surface/task creates a clear relevance signal;
- backend truth says the capability is implemented and Agent-exposable;
- the suggestion does not override an unresolved material fact;
- eligibility/authority is known where required;
- the recommendation is concise and optional;
- no consequential action is taken without explicit user action.

A suggestion should sound natural:

> “You may not need to search manually. SecurePay can compare real Store routes for this need, including lead time and what costs are actually known. Want to see them?”

Not:

> “Try our Store feature.”

## Non-negotiable safeguards

- Do not invent products, partners, prices, availability or eligibility.
- Do not treat knowledge records as action authority.
- Do not expose a capability merely because code exists if policy marks it NOT_EXPOSED.
- Do not silently create Agreements, select suppliers, join pooling, initiate funding, release money, or post to Community.
- Do not call a pool a Community Saver until the required Plug coordination gate exists.
- Do not recommend unrelated features merely to increase engagement.

## PR #107 boundary

PR #107 remains SecurepayLLM-only. It adds the contextual UI bridge and records this contract. The full product-intelligence registry/routing expansion belongs in a separately authorized SecurePayAPI build.
