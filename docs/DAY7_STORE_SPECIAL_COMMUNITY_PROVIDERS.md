# Day 7 — Digital Store recruits community specialist providers

**Owner decision:** A Digital Store is the common recruitment entrance for future **ShortStays**, **My Ride**, and **Storage** providers. It is NOT a fourth provider directory, and none of those products should lose its independent UI or operating rules.

## The human experience
1. Get/use your **one existing KS Number**. A Digital Store belongs to a personal or properly represented Business KS identity, not a second account.
2. Give your Digital Store an address and describe what you can actually offer.
3. Compact optional question: **Could you also serve your community?** Responses: **Yes, I can help** / **Not now**. No specialist interest is preselected.
4. If Yes: choose ShortStays, My Ride, Storage (one or more), see concise plain-language community commitments, **actively check** “I agree to apply as a special community provider”, then submit. Without this checkbox no application is sent.
5. The backend saves *INTERESTED* with consent policy version `community-special-provider-v1` and a private event history under the same KS owner or properly represented Business. Applicant can later change selections or withdraw. A normal Store needs NONE of this.
6. After confirmed interest, **Ask KS001 about next steps** opens the same KS001 work. It helps prepare the relevant product's own onboarding. No automatic approval, appointment, listing, Money or booking.
7. The corresponding ShortStays / My Ride / Storage authority must separately check qualification, suitability, safety, access, fulfilment capacity, published offer terms, required licences and permission to serve a community. **Only that service may authorise and publicise a verified provider**. An interested applicant is never included in customer-facing recommendations or priority lists as verified.

## Community provider commitments (v1)
- I describe goods, rooms, vehicles, storage and available capacity truthfully.
- I communicate availability, prices and conditions clearly.
- I respect clients' privacy, act fairly, and honour safety, property-care, access and custody procedures.
- I follow the chosen service's own rules before receiving actual orders.
- I understand the invitation is only an expression of interest, with no guaranteed customers, special privileges, earnings, bookings or payout.

## Existing SecurePay categories
The Store fulfilment schema already has `ACCOMMODATION_PROVIDER`, `TRANSPORT_PROVIDER`, `STORAGE_PROVIDER`. Those remain self-declared offer facts and do NOT substitute for explicit special-community-provider application, verification or site enrolment.

## Implementation and security
Frontend candidate: `CommunityProviderInterestStep` embedded inside existing `DigitalStoreSetup`. It uses owner-scoped `StoreGateway` for exact personal/represented Business identity with no client-supplied identity ID. The optional provider step does not block digital Store creation. Backend candidate: `GET/PUT /api/v1/store/me/community-service-provider` and the corresponding `/api/v1/business/{businessKsNumber}/store/community-service-provider`. The request is bounded to three named services, mandatory affirmative v1 terms when choosing any, and a saved Digital Store address is required before interested enrolment. Only change transitions write audit events. Withdraw is an explicit empty selection; the Store and KS are unchanged.

**Status:** Code on unmerged isolated branches. Frontend's source-contract tests can pass without a real backend, so staging must verify the database migration, represented-Business authorization, GET/PUT idempotence and audit, selected services and withdrawal before allowing a live enrolment. Until both compatible components deploy to sandbox, UI must show “not saved” on failed backend calls.

## Integration work outside this slice
- Dedicated service-provider applications, verification outcomes and deep links for ShortStays, My Ride and Storage, with secure registered origin/KS handoff and explicit consent, are NOT YET LIVE. No redirect with personal data in a URL.
- Optional community routing rules must consult owner-approved provider state from actual product authority and service availability. They may never treat 'INTERESTED' as 'VERIFIED'.
- KS001 should acknowledge the person's offer, ask one useful missing detail (rooms/vehicle/space) then start the relevant service onboarding under that person's KS, not invent a verified profile.
- Preserve the approved Digital Store and three independent product personalities; no new signup, Store pricing change or referrals generated.

Release requires backend migration + unit/integration tests, frontend focused tests + TypeScript/build, genuine staging owner opt-in/withdraw and service-specific authorisation. No production merge or Money activation from this plan.
