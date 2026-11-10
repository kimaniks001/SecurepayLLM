# SecurePay Mini — Phase 4 offline source → Agreement → simulated checkout

**10 November 2026. Scope corrected by owner: SecurePayAPI is unavailable.
Continue simulation. Do not attempt to connect the real API or activate a provider.**

## Why this is the next gate

The approved checkout-first roadmap is unchanged. We must exercise the real
human journey from different platforms through **one Mini, one review, one
checkout simulation**, before substituting real SecurePayAPI authority.

No new payment engine, additional checkout route or kitchen-specific workflow
was created. The existing `MiniHostedCheckoutDemo` and
`MiniFundingPreview` are reused for *both* Store and ShortStays in an optional
`journey=1` test mode.

The original `demoCheckout=...` mode is still the default, unchanged. The
later Gate 4 server-side attempt recovery tests remain separately intact.

## Owner preview URLs

- Digital Store:
  `/mini.html?demoCheckout=STORE-DEMO-01&journey=1`
- ShortStays:
  `/mini.html?demoCheckout=STAY-DEMO-01&journey=1`

These are checked-in **fictional** fixtures (KSh 1,800 for three packs and
KSh 9,000 for a two-night sample stay). They do NOT represent a published
Store order, inventory or available room.

## What the owner can test

1. Mini shows source, version, item/stay, quantity, KSh amount and terms.
2. The seller/host views and reviews the original *sample* source first.
   Their click is **not** stock/room acceptance or inventory authority.
3. Buyer/guest and seller/host independently review the same sample terms.
   Neither click is a legal Agreement signature or consent.
4. KS001-style local next-action prompt directs the responsible person;
   it has no delivery worker or notification side effect.
5. After both reviews, Buyer can proceed into the **existing**
   `MiniFundingPreview` choosing simulated Choice Bank, M-Pesa or PesaLink.
6. Try a fictional success, failed response or unknown outcome; no bank,
   STK, settlement account or ledger is touched.
7. Return to sample review, click **Test changed source / revised terms**:
   both reviews are reset and any existing simulated payment component is
   remounted under a new local review cycle so a stale review cannot survive.
8. Original compact Mini header and canonical linked SecurePay logo imprint
   remain unchanged. KS001 chat stays optional, not a checkout requirement.

## Safety gates

`offlineAgreementJourney.ts` defines `OFFLINE_AUTHORITY` with all real
claims false: source authentication, order acceptance, inventory/room held,
legal Agreement acceptance, payment eligibility/verification, deposit funded,
obligations funded, money moved, notifications sent, fulfilment.

The model does **not** support real signatures, deposits, milestone payments,
refunds, WhatsApp notifications, server-issued offers, crypto authority,
providers, legal payment notices or the actual SecurePayAPI. It does not
even call `fetch`. Real status must eventually be derived from
provider-verified Payment Intents plus independent Agreement obligation
funding proof. No real host may use a local simulated result to mark paid.

## Testing and handoff

Focused executing tests cover both Store and ShortStays, source role
gating, duplicate review rejection, two distinct parties, source-change
invalidations, single Mini component reuse, unchanged default checkout and
false money/notification authority. Added to existing Mini Preview checks
with TypeScript/build verification.

Keep this stacked PR **draft**, unmerged and isolated from production. Once
the owner accepts the UX, continue planned simulated deposits, milestone
obligations and event-driven prompts in the **same Agreement journey** while
SecurePayAPI remains unavailable. Do not abandon the owner-approved
three-panel workspace or force customers into KS001 chat.
