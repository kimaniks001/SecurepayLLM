import type { StoreSearchResult } from '../../api/securepay/store/adapters';
import type { CommunityObjectResponse } from '../../api/securepay/community/dto';
import type { CommunityObject, CommunityObjectType } from '../../types';

const REAL_OBJECT_TYPE: Record<CommunityObjectResponse['objectType'], CommunityObjectType> = {
  QUESTION: 'question',
  NEED: 'need',
  OPPORTUNITY: 'opportunity',
  WORK_STORY: 'work_story',
  DISCUSSION: 'discussion',
};

function relativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

/**
 * Phase 6 (Community Life) Slice 1 -- a real, backend-persisted Community object. No fabricated
 * `responses` (replies/"I can help" are Slice 2), no invented capabilities/budget/timing fields the
 * backend does not yet carry. `provenance` states plainly that this is a real Community post, never
 * a reputation/rating claim (Section 4/20's own "never reputation scoring" doctrine).
 */
export function realObjectToCommunityObject(dto: CommunityObjectResponse): CommunityObject {
  return {
    id: dto.id,
    objectType: REAL_OBJECT_TYPE[dto.objectType],
    author: dto.authorDisplayName ?? dto.authorCanonicalKsNumber ?? 'A SecurePay member',
    authorCapacity: 'personal',
    createdAt: relativeTime(dto.createdAt),
    title: dto.title,
    body: dto.body,
    generalLocation: dto.locationLabel ?? undefined,
    status: dto.status === 'ACTIVE' ? 'active' : dto.status === 'CLOSED' ? 'closed' : 'withdrawn',
    responses: [],
    provenance: dto.authorCanonicalKsNumber ? `Posted by ${dto.authorCanonicalKsNumber}` : 'Posted to Community',
    visibility: 'public',
  };
}

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
