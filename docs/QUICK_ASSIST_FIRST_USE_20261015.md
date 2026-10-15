# Quick Assist — first working slice (15 October 2026)

## Intent
Quick Assist is a **small, optional capability collection**, not a second marketplace.
The KS holder begins with **Short Stays**, **My Ride**, and **+ Add a tool**.
Quick Documents is available through **Use once** or **Add to my tools**; it is not a compulsory third tile.

**Stores publish providers' service offers and provide the seller-side Quick Contract drafting doorway.** Quick Assist helps a KS holder express a need and find Store offerings; KS001 assists with the person's explicit request. Actual service terms and price belong to the provider. Agreement and Money authority remain in SecurePayAPI, not the tool.

## Current interactive preview
- Open Quick Assist from any Living Workspace area.
- Add/remove a tool within the current frontend session; use a tool without adding it.
- Short Stays: describe destination, dates, occupants and budget in natural language.
- My Ride: choose people or goods; describe the pickup, destination, timing and load.
- Send **only the user's explicit text** to live KS001 in the opted-in real **My Work** preview. No device location or private Agreement context is fetched by Quick Assist.
- In other workspace modes or mock use, prepare a clearly labelled local-only request.
- Open **Find published offers in Stores**; it switches to existing Store discovery in real-offers mode, with kind SERVICE and a relevant editable search term. The KS holder presses **Find real offers** themselves. This uses existing Store read authority and existing cited-offer-to-KS001 handoff. No separate provider catalogue was introduced.
- Existing Store seller **Quick Contract** is a conversational preparation tool. It does **not** yet issue a fully structured, bookable, provider-verified Quick Contract.
- Quick Documents retains its non-issued, non-payment-proof draft preview.

## Truth and permissions
- No provider inventory, accommodation availability, vehicle availability or bookings are fabricated.
- Adding a tool does not authorize it to access Agreements, device location, people, payment or bookings.
- Discovering an offer is not accepting it; selected Store offers retain their canonical owner KS Number and offer ID in the existing Store gateway.
- This slice performs no booking, dispatch, provider messaging, payment execution, Agreement creation or automatic calendar changes.
- Removing a tile changes only the local collection; it does not delete any SecurePay Agreement or Store data.
- No third-party tool installation or remotely executed plugins.
- **Persistence gap:** collection is session-only. It is not represented as a persisted per-KS preference until authorised, owner-scoped backend preference storage is available.
- **Provider gap:** live availability, signed short-stay cancellation policies and dispatch/driver matching await explicit provider contracts and verification. The Store SERVICE offer search is usable independently of those integrations.
- **KS001 gap:** the opted-in live work conversation accepts the explicit request, but a provider-verified booking assistant and a first-class capability-selection API contract are not yet certified.
- This change does not touch the locked approved Store baseline or SecurePayAPI.

## Scope, review and release
Branch `feature/quick-assist-first-use-20261015` from draft PR #131 workspace branch `design/living-workspace-vision-circle-20261014`, not production main.
Source-focused checks cover the personal collection, use once vs add, no implicit permissions, Store service search handoff and KS001 guidance. Full TS typecheck, lint, browser certification, Store provider lifecycle and end-to-end signed-in tests are required before declaring production readiness. No merge/deploy is authorised.
