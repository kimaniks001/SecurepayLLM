# SecurePay Mini Phase 7 — Community Saver (approved rules and first engineering slice)
**Date:** 18 November 2026. **Status:** 7A engineering draft; no production feature, no live Plug offer or Agreement amendment.

## Rules approved in conversation
1. **Scope**: Shortstays, My Ride, Storage. General Stores, construction materials, land and real-estate transactions **cannot** qualify by themselves. Another platform requires deliberate compliance/governance approval and integration, not a user-supplied string.
2. **Item, not Agreement total**: use a uniquely identified, currently accepted, individually priced obligation from each relevant canonical Agreement. Match compatible service attributes and immutable item version. Never invent prices from a whole Agreement.
3. **Real economic gain**: each participating *payer* must save **at least 25% net of all additional costs**, including Plug, provider uplift, loading, travel, insurance/risk, SecurePay, rail fees and other overheads. If even one payer falls below 25%, do not advertise a qualifying offer.
4. **Plug fee**: **10% of the minimum 25% savings benchmark for the participating item baselines** (equivalent to 2.5% of those baselines). This is *not* 10% of a whole Agreement, not 10% of gross/realized savings, and not an extra fee added after the 25% gate. Round fee upward to the nearest minor unit. Plug can accept/decline with a documented scope of work.
5. **Qualification**: only a Plug with approved, platform/activity-specific competence and any required licensing may be invited. Real estate qualifications do not authorize produce or vehicle loading. An honest rejection of unsafe compatibility is permitted and valued.
6. **Consent**: pre-screen must not reveal one trader's sensitive terms to another or to a prospective Plug. Only after source-version verification, compatibility and parties' consent may a controlled new facilitation agreement and authorized amendment exist. No silent replacement of an already funded payment, automatic rail action or custody movement.
7. **Savings presentation**: show original agreed item price, projected shared cost, **net** saving and the qualified Plug's proposed reward. Do not use fictitious retail list prices or present projected savings as realized.
8. **Money**: separate payer-authorized, stage-specific, reconciled provider execution according to the canonical Money gates. No direct payout from this calculation.

## Example — two separately agreed Nyeri transport items
- Trader A mabati lorry line: KSh 10,000
- Trader B interior boards pickup line: KSh 4,000
- Original combined **item** baseline: KSh 14,000
- Verified shared lorry charge (illustrative): KSh 10,000
- Additional loading/rails/SecurePay and other real costs (illustrative): KSh 100
- Required minimum 25% net saving: KSh 3,500
- Plug offer 10% of KSh 3,500 = KSh 350
- Total new cost KSh 10,450
- Potential combined net saving **KSh 3,550 = 25.36%**
- Proportional projection: Trader A saves KSh 2,535.71; Trader B saves KSh 1,014.29. Actual allocation subject to independently agreed participants' terms, reviewed revisions and payer authorization.
- With KSh 200 other costs instead, combined net saving KSh 3,450 = 24.64%; **not a qualifying opportunity**.

## Phase 7 integration order
- **7A** (this draft): deterministic bounded KES arithmetic in Mini and Java domain; reject unsupported platforms, unversioned or duplicate item references; demo preview is isolated, fictional and review-only. Unit tests added to Vercel Mini prebuild; Java unit tests authored.
- **7B**: authenticated backend adapters read only server-authoritative current Agreement item versions, actual funded status/rights and provider/platform published cost/availability. Preserve original source/version and document permissions; no access from arbitrary request amounts.
- **7C**: verified provider and Plug capability/qualification registries, compatibility/capacity evidence, fair invitation and controlled visibility. Plug chooses yes/no; no open contact marketplace.
- **7D**: each party separately accepts compatible, clearly priced changes to accepted obligations. Govern cancellation, rebate, legacy transport cancellation, evidence, complaints and paid work. Only canonical Agreement engine/regulated provider performs authorized Money changes.
- **7E**: PostgreSQL, Java 21, auth/tenant, concurrency, genuine provider sandbox, no-leak test and 20-person acceptance before release.

## Deliberate non-capabilities
- No live Community Saver notification or external service match
- No production API endpoint accepting client-supplied 'verified' prices
- No Plug qualification/assignment/invitation exposed to the public yet
- No executed transaction, amendment, automatic discount or payout
- No changes to existing Phase 6 Mini design, Store operations or production domains

The owner preview is only an accessible way to review the numerical model before implementing the source-of-truth and Plug workflow.
