/**
 * SecurePay Business Connect B0: headless, read-only bridge for external sites and
 * first-party apps. Current architectural decision (2026-11-16).
 *
 * Canonical authority stays in SecurePayAPI. This module NEVER issues a KSNumber,
 * agreement, SecureLink, notification or payment instruction. The host controls
 * its own visual experience; selecting an offer requires a separate explicit action.
 *
 * Current limitations: Store search is category/location ILIKE, not semantic search.
 * Server-side cross-app merchant consent, live fulfilment, subscription checks,
 * Store Guide knowledge, and network-wide search are future API requirements.
 */
import type { StoreGateway } from '../../api/securepay/store';
import type {
  OfferKind, PublicOfferDetailView, PublicSearchResultView, StoreSearchParams,
} from '../../api/securepay/store/dto';

export type BusinessConnectSurface =
  | 'SHORTSTAYS' | 'ESTATE' | 'MY_RIDE' | 'STORAGE'
  | 'MINI' | 'LIVING_WORKSPACE' | 'EXTERNAL_SITE';

export interface BusinessConnectNeed {
  surface: BusinessConnectSurface;
  kind: OfferKind;
  /** The caller must supply a known catalogue category, NOT raw AI-generated text. */
  category?: string;
  /** An optional location filter as supported by the current Store API. */
  location?: string;
  /** Maximum per real API search, 1 through 10. */
  limit?: number;
}

export interface BusinessConnectCandidate {
  sellerKsNumber: string;
  sellerName: string;
  offerId: string;
  offerTitle: string;
  kind: string;
  listedAvailability: string;
  availabilityConfirmedAt: string | null;
  priceMinor: number | null;
  currency: string;
  locationLabel: string | null;
  /** A listing is not a promise of stock, delivery, price acceptance, or eligibility. */
  requiresFreshConfirmation: true;
}

export type BusinessConnectDiscovery =
  | { status: 'ready'; results: BusinessConnectCandidate[]; surface: BusinessConnectSurface }
  | { status: 'unavailable'; results: []; surface: BusinessConnectSurface; reason: string };

export type BusinessConnectInspection =
  | { status: 'listed'; detail: PublicOfferDetailView; requiresFreshConfirmation: true }
  | { status: 'not_eligible'; reason: string };

export interface BusinessConnectSelection {
  sourceType: 'STORE_LISTING';
  sourceId: string;
  sourceOwnerKsNumber: string;
  sourceDescription: string;
  /** Canonical agreement and amount are deliberately NOT established here. */
}

type ReadOnlyStoreGateway = Pick<StoreGateway, 'search' | 'offer'>;
const kinds: readonly OfferKind[] = ['PRODUCT', 'SERVICE', 'CAPACITY'];
const surfaces: readonly BusinessConnectSurface[] = [
  'SHORTSTAYS', 'ESTATE', 'MY_RIDE', 'STORAGE', 'MINI', 'LIVING_WORKSPACE', 'EXTERNAL_SITE',
];

function boundedText(value: string | undefined, field: string): string | undefined {
  if (value === undefined) return undefined;
  const clean = value.trim();
  if (!clean) return undefined;
  if (clean.length > 120) throw new Error(`${field} must be 120 characters or fewer`);
  return clean;
}

export function storeSearchForNeed(need: BusinessConnectNeed): StoreSearchParams {
  if (!surfaces.includes(need.surface)) throw new Error('Unsupported SecurePay surface');
  if (!kinds.includes(need.kind)) throw new Error('Unsupported Store offer kind');
  if (need.limit !== undefined && (!Number.isInteger(need.limit) || need.limit < 1 || need.limit > 10)) {
    throw new Error('Store search limit must be between 1 and 10');
  }
  const category = boundedText(need.category, 'Category');
  const location = boundedText(need.location, 'Location');
  if (!category && !location) {
    throw new Error('Provide a category or location for contextual business discovery');
  }
  // The SecurePayAPI searches these filters using AND. Do not claim a semantic match.
  return { kind: need.kind, ...(category ? { category } : {}), ...(location ? { location } : {}), limit: need.limit ?? 10 };
}

function candidateFromBackend(row: PublicSearchResultView): BusinessConnectCandidate {
  return {
    sellerKsNumber: row.canonicalKsNumber,
    sellerName: row.displayName,
    offerId: row.offer.id,
    offerTitle: row.offer.title,
    kind: row.offer.kind,
    listedAvailability: row.offer.availabilityState,
    availabilityConfirmedAt: row.offer.availabilityConfirmedAt,
    priceMinor: row.offer.priceMinor,
    currency: row.offer.currency,
    locationLabel: row.locationLabel,
    requiresFreshConfirmation: true,
  };
}

/**
 * Reads SecurePay's existing public, published-store endpoint only. Callers MUST
 * treat results as candidates, not independently verified fulfilment promises.
 * No fallback inventory or simulated merchant data on API failures.
 */
export function createBusinessConnect(store: ReadOnlyStoreGateway) {
  return {
    async discover(need: BusinessConnectNeed): Promise<BusinessConnectDiscovery> {
      const params = storeSearchForNeed(need);
      try {
        const rows = await store.search(params);
        const unique = new Map<string, BusinessConnectCandidate>();
        for (const row of rows) {
          if (!row.canonicalKsNumber || !row.offer?.id || !row.offer?.title) continue;
          unique.set(`${row.canonicalKsNumber}:${row.offer.id}`, candidateFromBackend(row));
        }
        return { status: 'ready', results: [...unique.values()], surface: need.surface };
      } catch {
        return { status: 'unavailable', results: [], surface: need.surface, reason: 'SecurePay Store search is temporarily unavailable.' };
      }
    },

    async inspect(sellerKsNumber: string, offerId: string): Promise<BusinessConnectInspection> {
      if (!sellerKsNumber.trim() || !offerId.trim()) {
        return { status: 'not_eligible', reason: 'Select an identifiable merchant offer.' };
      }
      try {
        const detail = await store.offer(sellerKsNumber, offerId);
        if (detail.canonicalKsNumber !== sellerKsNumber ||
            detail.offer.id !== offerId ||
            detail.status !== 'ACTIVE' ||
            ['UNAVAILABLE', 'PAUSED', 'FULLY_BOOKED', 'RESTING'].includes(detail.offer.availabilityState)) {
          return { status: 'not_eligible', reason: 'This offer cannot currently be selected.' };
        }
        return { status: 'listed', detail, requiresFreshConfirmation: true };
      } catch {
        return { status: 'not_eligible', reason: 'SecurePay could not verify that offer.' };
      }
    },
  };
}

/**
 * Explicit "Use this" bridge into the EXISTING Agent/SourceReference journey.
 * Never interpret this pointer as a binding Agreement, verified stock, payment
 * authorization or SecureLink. Caller must present this as a separate user action
 * and send the pointer to SecurePay's canonical source-selection API.
 */
export function selectListedOffer(
  inspection: BusinessConnectInspection,
  explicitlySelectedByCustomer: boolean,
): BusinessConnectSelection {
  if (!explicitlySelectedByCustomer || inspection.status !== 'listed') {
    throw new Error('A current inspected offer and explicit customer selection are required');
  }
  const { detail } = inspection;
  return {
    sourceType: 'STORE_LISTING',
    sourceId: detail.offer.id,
    sourceOwnerKsNumber: detail.canonicalKsNumber,
    sourceDescription: `Offer: ${detail.offer.title} — ${detail.displayName} — offer ${detail.offer.id} (${detail.offer.updatedAt})`,
  };
}
