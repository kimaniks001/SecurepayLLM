# Day 7 — One KS001 Assist, multiple compact entrances

**Status:** Phase A implementation for owner review; not live cross-product certification.
**Anchor:** [Day 7 multi-repository proof](https://github.com/kimaniks001/SecurepayLLM/issues/220).
**Product names:** ShortStays · My Ride · Storage. Three independent products, three independent UIs.

## The non-negotiable decision

There must not be a "Quick Assist brain", a "mini tools brain", a "Storage KS assistant brain", a "ShortStays AI" and an "Estate AI". There is **one KS001 agent experience**, whose backend authority and persisted conversation belong to SecurePayAPI. Quick Assist, Ask KS001, micro-inputs and future embedded/widget installations are *doorways* that show only the tools relevant to the user's current need.

The assistant's tone: acknowledge naturally, then **one useful next question**, avoiding questionnaire/checklist responses, repetitive upsells and product jargon. A surface may style its shell to match its own brand; it must not replace KS001's identity, doctrinal rules or financial authority.

## Current truth after Phase A

| Surface | Source | Today | Limitation |
|---|---|---|---|
| Full KS001 conversation | SecurepayLLM AgentController + SecurePayAPI | Canonical, server-owned conversation, continuity, safe retry, agreement review | Requires working authenticated/allowed API and relevant capabilities |
| Quick Assist | SecurepayLLM QuickSupportPanel | Optional ShortStays / My Ride / Storage tools, initial two pinned; consented user description goes through shared adapter to same controller | No real provider inventory; physical Storage links to clearly labelled owner prototype |
| Tiny date/time/amount/person/place answers | LiveKs001Session / MiniContextInput | New common \`miniatureAnswer\` formats selected answers; stays on SAME controller | Existing mini input uses human-approved conversational turns, not a new public typed API; do not claim server-verified fact mutation |
| Embedded KS001 | draft SDK UI PR #215–#219 and API PR #395–#399 | Estate-specific origin-bound, metered guest pilot; explicit secure handoff into canonical Saved Work designed | Unmerged/uncertified; cannot expose to arbitrary products or reuse Estate guest token |
| Storage assistant | owner Vercel prototype | Rule-based demo guidance for sofa, parking, small space | No real KS001 session/model, provider quotes or production Booking |
| ShortStays / My Ride | own repositories | Product-specific catalogue, request and demo custody workflows | Mock-first / demo-only for SecurePay |
| Money | SecurePayAPI | Regulated partner / agreement / ledger authority | Absolutely no monetary action via a suggested tool |

## Existing API boundaries to preserve
1. **Public Developer API** and **First-Party Agent API** are distinct; never silently promote \`/api/agent/*\` into public developer entitlement.
2. Embedded site may send ONLY explicit guest input and an origin-approved, purpose-scoped context projection. No blanket permission from a tool click. An iframe or credential isolation is required for untrusted publisher origins.
3. All KS identity, Agreements, funding, release, Money state and authenticated Saved Work remain on SecurePay; partner products own their own availability, booking requests and physical custody operations.
4. Structured MiniContextInput values are human-approved conversation contributions at this gate, never evidence of an actual payment, booking or identity verification. Later typed mutation APIs need an explicit independent authority decision.
5. The Storage marketplace is physical space. It must **not** be implemented as the existing SecurePay Digital Stores commerce catalogue.

## Version 1 request envelope (adapter vocabulary)
- \`version = ks001-assist.v1\`
- \`service = stays | ride | storage\`
- \`journey = person | goods\` where relevant
- \`description = explicit user text only\`, trimmed and bounded to 1,200 chars
- \`source surface\` and \`context projection\`: NOT carried through public first-party text API until backend-authorised schema is available
- \`eligibility / offer / quote / availability\`: MUST be retrieved from authoritative, provider-permitted sources with timestamp and permission. A tool label is never an entitlement
- \`action\`: read / propose only; booking and Agreement formation require separate verified explicit flows

Runtime compatibility note: the initial Quick Assist adapter packages the explicit description into **one canonical server conversation turn** using existing AgentController, without creating a second AI client or claiming a new backend API. It is a temporary transport format, not the eventual typed integration schema.

## Product-specific recommendation policy
- ShortStays: accommodation need is primary; KS001 may mention transport cost once if travel is clearly relevant. Never turn the holiday landing page into a transport screen.
- My Ride: movement is primary; only offer physical Storage if pickup/delivery timing or goods custody genuinely creates a gap.
- Storage: space is primary; optionally offer My Ride if goods need to be collected/delivered. No forced bundle.
- Estate.ke: gate-related help is an entirely separate authorised Estate capability. It must not get Agreements, GPS or identity simply because the miniature assistant exists.
- General "how much would transport cost?": show **informational estimate** with assumptions, range and source or say unavailable; **provider quote** is different; **actual booked price** requires booking authority and confirmation.
- Suggested capabilities: one relevant proposal per missing gap; user can decline. No repetitive service upsells.

## Production integration gates

### A — Compact first-party convergence (this branch)
- [x] Shared \`assistContract.mjs\` (runtime-executable) and typed declarations
- [x] Storage added to optional Quick Assist catalogue without replacing ShortStays/My Ride
- [x] Existing Quick Assist request and miniature answers use shared helpers
- [x] Storage prototype link labelled as example-only; Digital Stores discovery remains separate
- [ ] Focused node test, TypeScript, lint, build on exact branch head
- [ ] Owner reviews unchanged workspace character

### B — Reusable embedded agent
- [ ] Reconcile draft Embed SDK and API branch stacks, do NOT mix unrelated production work
- [ ] Site-specific registered origin, scope, KS owner, consent, AI budget, guest isolation, per-site abuse limits and same-conversation transfer
- [ ] Real responsive embedded Ask KS001 in Storage/ShortStays/My Ride staging **without copying an Estate bearer or unreviewed private data**
- [ ] Each product keeps its own small UI shell and gear/settings/invite actions under its own authorisation
- [ ] One focussed end-to-end guest -> authenticated Saved Work test per origin, no money

### C — Read-only service truth
- [ ] SecurePayAPI governed \`STAY | RIDE | PHYSICAL_STORAGE\` capability registry and read-only listing/quote adapters with provider permission and verifiable provenance
- [ ] No fabricated provider, price, availability or time-to-fulfil
- [ ] Three journeys: Nyeri stay + optional ride estimate; 14-day sofa storage + optional pickup; goods arriving early + temporary warehousing
- [ ] Full integration tests only after mini-contract checks, no wide blind test sweeps

### D — Agreements and real execution
- [ ] Human selects a real provider and explicitly reviews terms; backend creates independent, correlated Agreements as appropriate
- [ ] No automatic booking, transport dispatch, custody release, funding, Money rail or settlement
- [ ] Separate regulated partner certification, financial gates, evidence acceptance and owner GO/NO-GO before release

**No production merge/deploy is authorised by this document or its companion PR.**
