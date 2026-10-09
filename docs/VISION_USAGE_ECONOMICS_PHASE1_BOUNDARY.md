# Vision Usage Economics Phase 1 — SecurepayLLM boundary

This repository deliberately does **not** own Vision usage economics.

During Phase 1 shadow metering:

- ordinary Vision Board actions stay unchanged;
- no member Usage Unit balance exists here;
- no deduction/top-up/insufficient-credit flow exists here;
- no cost banner or allowance counter is shown to a member;
- no provider price table is copied into the frontend;
- SecurePayAPI is the durable authority for immutable usage events, versioned provider pricing and shadow scenarios.

The current Vision Board UI is primarily manual CRUD/document preparation and does not directly call an AI provider. Therefore there is no legitimate frontend provider-usage observation point to instrument in this phase.

Any future Vision AI surface should report provider usage through the approved SecurePayAPI economics boundary rather than creating client-side billing truth.
