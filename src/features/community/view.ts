import type { StoreSearchResult } from '../../api/securepay/store/adapters';
import type { CommunityObject } from '../../types';

/**
 * The only real Community content source this phase has: Store Offers, via the already-productionized
 * Store search (features/store/view.ts `searchRequests`/`mergeSearchResults`, reused unchanged here).
 * This is a plain offer-id *reference* to canonical Store truth, never a copy (task section 7/9) — the
 * synthetic id embeds both real identifiers so `onOpenObject` can recover them without a second lookup.
 * `responses` is always empty and no discussion/"I can help" affordance ever applies to this object type
 * (CommunityObjectDetail only renders those for `need`/`opportunity`/`question`), so this composition
 * cannot be mistaken for user-authored content.
 */
export function storeResultToCommunityObject(result: StoreSearchResult): CommunityObject {
  return {
    id: `store-offer:${encodeURIComponent(result.canonicalKsNumber)}:${encodeURIComponent(result.offer.id)}`,
    objectType: 'store_offer_reference',
    author: result.displayName,
    // PublicSearchResultView carries no identityType (unlike the full PublicStoreView) and this field is
    // never rendered for a top-level CommunityObject (only per-response authorCapacity is) — see
    // docs/PRODUCTION_MIGRATION_LEDGER.md section 17 for the exact gap.
    authorCapacity: 'business',
    createdAt: `Updated ${result.offer.version}`,
    title: result.offer.title,
    body: result.offer.description,
    generalLocation: result.locationLabel ?? undefined,
    status: 'active',
    responses: [],
    relatedStoreId: result.canonicalKsNumber,
    relatedOfferId: result.offer.id,
    provenance: `From ${result.displayName} Store — offer updated ${result.offer.version}`,
    visibility: 'public',
  };
}

export function parseStoreOfferCommunityObjectId(id: string): { canonicalKsNumber: string; offerId: string } | null {
  const match = /^store-offer:([^:]+):([^:]+)$/.exec(id);
  if (!match) return null;
  return { canonicalKsNumber: decodeURIComponent(match[1]), offerId: decodeURIComponent(match[2]) };
}
