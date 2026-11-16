# SecurePay Business Connect — B0 universal bridge (16 November 2026)

**Status: Current architectural decision and implemented read-only integration slice. NOT production-certified.**

## Purpose

Enable SecurePay's own apps (Shortstays, Estate stores, My Ride, Storage, Mini, Living Workspace) and third-party platforms to discover **real backend Store offers** and pass an explicitly selected offer into the **existing SecurePay Agent/SourceReference** journey. Each host preserves its own identity and look and feel.

The single source of truth remains `kimaniks001/SecurePayAPI`. This repository is the client of that authority, never its replacement.

## Implemented in this branch

- `src/integrations/business-connect/index.ts`: a headless adapter around the **existing** public Store `search` and `offer` gateway methods. No new endpoint is guessed.
- `src/integrations/business-connect/shortstays.ts`: a Shortstays-specific import façade, not a new checkout. It takes a known catalogue category and an optional coarse guest area; it does not read booking details.
- `tests/business-connect.test.mjs`: focused safety checks for discovery, data-source truth, unavailable merchants, explicit offer selection, and Shortstays reuse.
- `npm run test:business-connect`: focused local test command. Tests have been added but require execution against the full project checkout.

### Integration illustration (Shortstays Prototype 4)

```ts
import { createShortstaysBusinessConnect } from './integrations/business-connect/shortstays';
import { createStoreGateway } from './api/securepay/store';

// B1: publicationAuthority MUST be a real SecurePayAPI-backed gateway.\n// Until the backend exists, do not instantiate the cross-platform adapter.\nconst business = createShortstaysBusinessConnect(\n  createStoreGateway(existingHttpClient), publicationAuthority,\n);

// A guest asked for a solar floodlight. A *verified catalogue category*
// comes from Shortstays, not a guessed semantic match.
const candidates = await business.findCandidateListingsForGuest({
  category: 'solar',
  area: 'Naivasha',
});

// Render candidate listings in Shortstays' own approved visual language.
// Never claim delivery or real-time stock from this search result.
// The guest explicitly chooses a candidate; re-read the offer:
const checked = await business.inspectMerchantOffer(merchantKsNumber, offerId);
if (checked.status === 'listed') {
  const source = business.useThisOffer(checked, true /* customer's explicit action */);
  // Pass sourceId / sourceOwnerKsNumber through the EXISTING
  // KS001 Agent useOffer -> selectCommercialSource flow.
  // Do not create a new Agreement, SecureLink or Money state here.
}
```

## Doctrine and permission boundaries

- **Identity:** KSNumber is free and is the minimum identity for purchase. Selling and agreement/Money governance require separately verified, active eligible membership. This adapter cannot determine entitlement; SecurePayAPI must.
- **Subscription:** SecurePay for You is KSh 100/month; SecurePay for Business is KSh 200/month. Access semantics remain backend-owned, not inferred from a Store's public `status`.
- **Store:** Discovery is read-only and only as accurate as the public Store backend. Store offers can change before purchase. The backend must confirm listing publication, merchant authority, stock, price, delivery capability and any legally required seller status before the customer commits.
- **Search:** Current Store search is filter-based (offer kind, category, location, at most 10). It is NOT semantic, stock reservation, a delivery ETA or network-wide business intelligence.
- **Agreement:** Selection is ONLY a `STORE_LISTING` source pointer. Existing canonical Trade Taking Shape -> Agreement -> explicit confirmation controls remain in force.
- **SecureLink:** Agreement communication must use the existing SecureLink authority and canonical agreement lifecycle. This bridge does not generate live links.
- **Money:** Payment Ready and actual payment instructions remain exclusively server-owned, provider-gated and audited. No client can fake a payment.
- **Privacy:** A guest's campsite/room, travel plans, phone and booking details are not sent to a merchant by discovery. Share only what fulfilment requires, under proper authorization. Tenant knowledge is isolated.
- **Design:** Shortstays Prototype 4 is frozen as the Shortstays visual baseline. This bridge supplies data and actions, no UI theme or global CSS.

## B1 blockers before cross-app marketplace activation

1. **Merchant network publication consent**: authoritative per-merchant/per-outlet opt-in (and disconnect/revocation) for visibility on other platforms. Public Store publication alone is not adequate consent for unsolicited cross-app promotion.
2. **Business Knowledge Centre**: merchant-scoped knowledge, uploads, policies, verifiable stock/prices, test-and-correct flow, provenance, authorization and efficient retrieval. Merchant public knowledge must be distinct from KRA/private agreements.
3. **Discovery and location intelligence**: a server-managed cross-platform eligibility check, true catalogue taxonomy/full-text search, delivery geography, freshness, provider credentials and privacy-safe ranking. No algorithmic fabricated availability.
4. **Commerce completion**: existing SourceReference -> canonical Agreement -> SecureLink -> checkout/payment intent -> Living Agreement. Checkout and Money must be certified independently.
5. **Communication and retrieval**: one authoritative SecureLink-linked event stream, permission-aware Mini and merchant inboxes, search across messages/agreements/evidence with precise source links and import provenance for historical documents. Do not infer 2016 records unless imported.
6. **Merchant controls**: branches, staff access, store-wide and outlet-specific settings, subscription entitlement, audit, refund/returns, dispute handling.
7. **Optional extension gates**: KRA/eTIMS certified provider access and purpose-limited Community Saver sharing. Neither should block core store usage.

## B0 acceptance evidence

Source commits exist on the B0 feature branch. No production deployment, actual customer purchase, provider certification or Shortstays-site merge is claimed. `npm run test:business-connect`, `npm run typecheck` and `npm run build` must pass on a complete checkout before promoting the branch.

**Next build:** Server-authoritative merchant cross-platform consent/entitlement and inventory verification, then mount the Shortstays adapter inside the approved Prototype 4 guest purchase journey with a focused synthetic end-to-end test. Keep all live payment controls disabled until certified.
