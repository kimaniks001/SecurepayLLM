# Day 11 — Mini Buy Something: real Store source integration gate
2026-11-12 · implementation candidate; **NOT production certified**.

## Owner design locked
- Preserve compact SecurePay Mini, original header, consent/checkout and three other starting actions.
- Add the now owner-approved **Buy something** entry, including typed natural-language intent.
- **Find -> enter actual Store -> select public offer(s) -> review buyer plan -> canonical Agreement after real seller/buyer authority**.
- The last step **cannot** be impersonated by a public offer GET or a browser simulation.

## What was implemented in this branch
1. `MiniExperience.tsx`: Buyer action added as fourth genuine start, with old Sell/Pay/Collect and Ask routes preserved. Local buyer-state preserved when returning to Mini home; explicit Clear resets it.
2. `MiniBuyStore.tsx`: one compact source-backed Store discovery/view and buyer plan. Reuses the project's existing `createStoreGateway` and `createHttpClient`. GET-only requests pass through the **existing explicit `/api/preview-workspace` Store path allowlist**, using server-owned upstream origin. Public Store results, real seller identity and original public offer records; never demo data labelled real. Explicit Service/Goods filter. Supports multiple sellers without claiming multi-seller consent.
3. Exact published price/offer `updatedAt`, quantity and availability compared against a **fresh source read** before review. A public `updatedAt` is a Store listing version hint, *not* an Agreement version.
4. For **one** priced source line, explicit `Review sourced offer (simulation)` uses the existing `/api/mini-store-offer-preview` server-issued, short-lived, source-fingerprint-encrypted **read-only session**. Extends its narrow Vercel preview branch allowlist only; still requires operator-set preview secret and environment. The existing `MiniRealStoreOffer` and simulation remain the only review path.
5. Shared shopping phrase recogniser from KS001 to strip unnecessary private delivery words when normalising a buyer's typed sentence. No AI-generated Store listing, no paid placement, no forced KS001.
6. Focused Node test `tests/day11-mini-buy-store-entry.test.mjs` added for source/approval boundaries and preview config. **Not run here.**

## Why this is not yet an executed Agreement
SecurePayAPI public Store search and offer read return **published offers**, not seller acceptance, a contracted price, delivery promise, inventory hold, authenticated buyer agreement or Money authority. This branch deliberately does **not** call an Agreement write from an anonymous Mini. The next gate requires a real server-authenticated buyer/seller proposal -> seller confirmation -> accepted canonical Agreement handoff. The same original Mini checkout may then present permitted provider rails only when the server proves funding eligibility.

### Real-data acceptance checks before releasing
- Preview proxy returns valid published Store responses for real KSNumbers and correctly fails on no source, stale/withdrawn offer, unsafe/unauthorised query, upstream timeout and offer price/quantity changes.
- Owner checks Goods and Services search, real Store drilldown, item selection, return to Mini and multi-seller buyer plan at mobile widths.
- Ensure a Store profile missing nullable metadata does not crash.
- Confirm no checkout session or payment from a GET, no user identity leakage, no store write routes, and no unapproved hosted checkout.
- End-to-end seller confirmation and actual Agreement acceptance still **NOT BUILT** in this branch.
- Do not silently merge with the independently diverged Day 11 Store UX branch; owner-approved layout remains locked. Estate unaffected.

## Run narrowly in real repository CI before merging
`node --test tests/day11-mini-buy-store-entry.test.mjs`
`npm run typecheck`
`npm run build`
Browser: test `/mini.html` on an isolated Vercel preview with appropriately authorised SecurePayAPI Store reads and operator-managed Mini review secret. Confirm the Vercel preview branch is not blocked by GitHub billing and the actual Store API is reachable. Absence of Store data must show an honest empty/error state, never substitute fictitious merchants.

**No JavaScript tests, TypeScript, Vite build, browser end-to-end against real API, funds or deployment were executed in this ChatGPT environment.**
