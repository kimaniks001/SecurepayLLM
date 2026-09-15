import type { StoreGateway } from '../../api/securepay/store';
import type { AvailabilityState, OfferKind, StoreSearchParams } from '../../api/securepay/store/dto';
import type { StoreSearchResult } from '../../api/securepay/store/adapters';
import type { OfferDraftFields } from '../../components/OfferBuilderView';

/** Mirrors StoreService.isAvailabilityCompatible exactly — client-side UX filtering only; the backend still enforces this and returns 422 on a mismatch. */
export function availabilityOptionsFor(kind: OfferKind): AvailabilityState[] {
  return kind === 'PRODUCT'
    ? ['AVAILABLE', 'LOW_AVAILABILITY', 'NEEDS_CONFIRMATION', 'UNAVAILABLE', 'PAUSED']
    : ['TAKING_WORK', 'LIMITED', 'FULLY_BOOKED', 'RESTING', 'NEEDS_CONFIRMATION'];
}

export const emptyOfferDraft: OfferDraftFields = {
  kind: 'SERVICE', title: '', description: '', priceMinor: null, quantityAvailable: null,
  availabilityState: 'NEEDS_CONFIRMATION', published: true, mediaRefs: [],
};

/**
 * `/api/v1/stores/search` requires `kind` (PRODUCT|SERVICE — there is no "all kinds" value) and has no
 * free-text query parameter at all: only exact `kind` plus ILIKE `category`/`location` (ANDed together
 * server-side, never ORed). Bolt's locked StoreHome is a single free-text search box with no kind
 * picker. Rather than fabricate a full-text search the backend doesn't have, or force a kind picker
 * onto the locked visual, this fans the one query out across both real kinds and, when a query is
 * typed, both real filter fields *separately* (never both at once — an AND of the same string against
 * two different columns would usually match nothing) and merges the truthful results. An empty query
 * browses everything published, matching Bolt's existing empty-query behavior. A typed query that
 * matches only an offer's title/description (not its category or location) honestly returns nothing —
 * documented in docs/PRODUCTION_MIGRATION_LEDGER.md as a real backend gap, not simulated here.
 */
export function searchRequests(query: string, limit = 10): StoreSearchParams[] {
  const kinds: StoreSearchParams['kind'][] = ['PRODUCT', 'SERVICE'];
  const trimmed = query.trim();
  if (!trimmed) return kinds.map(kind => ({ kind, limit }));
  return kinds.flatMap(kind => [
    { kind, category: trimmed, limit },
    { kind, location: trimmed, limit },
  ]);
}

/** Recency-only merge across the fanned-out real result sets — no scoring, matching the backend's own no-ranking doctrine. */
export function mergeSearchResults(resultLists: StoreSearchResult[][]): StoreSearchResult[] {
  const seen = new Map<string, StoreSearchResult>();
  for (const list of resultLists) {
    for (const result of list) {
      seen.set(`${result.canonicalKsNumber}:${result.offer.id}`, result);
    }
  }
  return [...seen.values()].sort((a, b) => (a.offer.version < b.offer.version ? 1 : a.offer.version > b.offer.version ? -1 : 0));
}

export type StoreReadGateway = Pick<StoreGateway, 'search' | 'store' | 'offer'>;
export type StoreManageGateway = Pick<StoreGateway, 'myProfile' | 'myOffers' | 'createOffer' | 'updateOffer' | 'confirmAvailability'>;
