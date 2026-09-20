import { ApiError } from '../http';
import type {
  AvailabilityState, OfferKind, PublicOfferDetailView, PublicOfferView, PublicSearchResultView, PublicStoreView,
  StoreOfferResponse, StoreProfileResponse,
} from './dto';
import type { OfferLifecycle, OfferType, StoreIdentity, StoreOffer } from '../../../types';
import { availabilityStateLabel } from '../../../storeLabels';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

// Exact verified enums (StoreService.OfferKind / StoreService.AvailabilityState). An unrecognized
// value is never inferred a meaning — see task hardening pass point 2 — it fails the whole read closed.
const OFFER_KINDS: readonly OfferKind[] = ['PRODUCT', 'SERVICE'];
const AVAILABILITY_STATES: readonly AvailabilityState[] = [
  'AVAILABLE', 'LOW_AVAILABILITY', 'NEEDS_CONFIRMATION', 'UNAVAILABLE', 'PAUSED',
  'TAKING_WORK', 'LIMITED', 'FULLY_BOOKED', 'RESTING',
];
function assertKnownOfferKind(kind: string): asserts kind is OfferKind {
  if (!(OFFER_KINDS as readonly string[]).includes(kind)) throw new ApiError('invalid-response', `SecurePay returned an unrecognized offer kind: ${kind}`);
}
function assertKnownAvailabilityState(state: string): asserts state is AvailabilityState {
  if (!(AVAILABILITY_STATES as readonly string[]).includes(state)) throw new ApiError('invalid-response', `SecurePay returned an unrecognized availability state: ${state}`);
}

/** Backend truth: PRODUCT|SERVICE only, and only after assertKnownOfferKind — never a silent default. */
function offerType(kind: OfferKind): OfferType {
  return kind === 'PRODUCT' ? 'product' : 'service';
}

/**
 * Backend has 9 AvailabilityState values, Bolt's lifecycle is draft/published/unavailable/archived.
 * UNAVAILABLE/PAUSED/FULLY_BOOKED/RESTING are truthfully "not currently obtainable" and map to Bolt's
 * `unavailable` bucket (disables the action row, shows the unavailable banner). NEEDS_CONFIRMATION/
 * LOW_AVAILABILITY/LIMITED/TAKING_WORK remain actionable. There is no backend `archived` concept, so
 * this mapping never produces it. Only ever called after assertKnownAvailabilityState.
 */
function lifecycle(published: boolean, availabilityState: AvailabilityState): OfferLifecycle {
  if (!published) return 'draft';
  if (availabilityState === 'UNAVAILABLE' || availabilityState === 'PAUSED' || availabilityState === 'FULLY_BOOKED' || availabilityState === 'RESTING') return 'unavailable';
  return 'published';
}

function availabilityText(state: AvailabilityState): string {
  return availabilityStateLabel[state];
}

function formatPrice(minor: number | null, currency: string): { price: string; priceType: StoreOffer['priceType'] } {
  if (minor === null) return { price: 'Price not listed', priceType: 'unlisted' };
  const amount = minor / 100;
  const formatted = Number.isInteger(amount)
    ? amount.toLocaleString('en-US')
    : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return { price: `${currency} ${formatted}`, priceType: 'fixed' };
}

/**
 * There is no backend Store Offer version/content-hash — only `updatedAt`. Rendered as a plain
 * human-readable as-of date (e.g. "10 Sep 2026"), never dressed up as a version number; the Bolt
 * components that display this value are gated on `isDemoState` to say "Updated …" rather than
 * "Offer version …" for real data (see OfferDetail.tsx/OfferToTradeHandoff.tsx/StoreManagementHome.tsx).
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function asOfDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  // A fixed "DD Mon YYYY" format, not Intl/locale-dependent (ICU builds vary "Sep" vs "Sept").
  return `${String(date.getUTCDate()).padStart(2, '0')} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function validatePublicOfferView(offer: unknown): asserts offer is PublicOfferView {
  if (!isRecord(offer) || typeof offer.id !== 'string' || typeof offer.kind !== 'string' || typeof offer.title !== 'string'
    || typeof offer.currency !== 'string' || typeof offer.availabilityState !== 'string' || typeof offer.updatedAt !== 'string'
    || !isStringArray(offer.mediaRefs) || (offer.priceMinor !== null && typeof offer.priceMinor !== 'number')
    || (offer.description !== null && typeof offer.description !== 'string')) {
    throw new ApiError('invalid-response', 'SecurePay returned an unreadable Store offer.');
  }
}

/**
 * mediaRefs are client-supplied references (a URL or an opaque asset id) — never verified/trusted
 * media authority, and no SecurePay media resolver/proxy contract exists yet (task hardening pass
 * point 1). This is not a media service or a client-side proxy: a ref is rendered as an <img> src only
 * when it parses as an absolute URL whose origin exactly matches `trustedOrigin` — the one external
 * origin this architecture already has verified authority over, because it is the configured
 * SecurePayAPI origin itself. Every other case (a different domain, or a string that is not a URL at
 * all, e.g. an opaque asset id — `new URL()` throws and the ref is never treated as one) resolves to an
 * empty `url`, and the caller's existing "No photos available" empty state covers it unmodified.
 */
export function media(refs: string[], trustedOrigin: string | null) {
  return refs.map((ref, i) => {
    let url = '';
    if (trustedOrigin) {
      try {
        if (new URL(ref).origin === trustedOrigin) url = ref;
      } catch {
        // Not an absolute URL (e.g. an opaque asset id) — never treated as one.
      }
    }
    return { id: `ref-${i}`, url, caption: '', isExample: false };
  });
}

/**
 * Backend has no rich Offer structure (scope included/excluded, conditions, documents, warranty,
 * milestone/obligation seeds, timing) — StoreOfferResponse/PublicOfferView carry only title,
 * description, price, quantity, availability and mediaRefs. Those Bolt fields render as truthful
 * empty/absent state (the locked OfferDetail component already hides each section when empty) rather
 * than being fabricated from the free-text description.
 */
function publicOfferToStoreOffer(view: PublicOfferView, canonicalKsNumber: string, displayName: string, secureLinkUrl: string, trustedMediaOrigin: string | null, locationLabel: string | null = null): StoreOffer {
  validatePublicOfferView(view);
  assertKnownOfferKind(view.kind);
  assertKnownAvailabilityState(view.availabilityState);
  const { price, priceType } = formatPrice(view.priceMinor, view.currency);
  return {
    id: view.id,
    storeId: canonicalKsNumber,
    storeName: displayName,
    title: view.title,
    description: view.description ?? '',
    offerType: offerType(view.kind),
    priceType,
    price,
    currency: view.currency,
    scope: { included: [], excluded: [] },
    media: media(view.mediaRefs, trustedMediaOrigin),
    // Backend has no per-offer location — this is the owning Store's own locationLabel, the closest real fact.
    serviceArea: locationLabel ?? '',
    availability: availabilityText(view.availabilityState),
    conditions: [],
    documents: [],
    milestoneSeeds: [],
    obligationSeeds: [],
    // Unused by any locked Bolt Store component this slice inspected; backend has no equivalent field.
    customizationAllowed: true,
    secureLink: { id: `store-offer-${view.id}`, url: secureLinkUrl, label: view.title, linkType: 'offer', qrAvailable: false, whatsappShareAvailable: false, embedAvailable: false },
    lifecycle: lifecycle(true, view.availabilityState), // public offers are published by contract (unpublished offers 404)
    version: asOfDate(view.updatedAt), // no backend version/hash for Store offers; honest "as of" date, not a fabricated version
    isExternalReference: false, // backend has no external-seller/distribution-provenance concept for Store
    isDemoState: false,
  };
}

function validateStoreView(dto: unknown): asserts dto is PublicStoreView {
  if (!isRecord(dto) || typeof dto.canonicalKsNumber !== 'string' || typeof dto.displayName !== 'string'
    || typeof dto.identityType !== 'string' || typeof dto.status !== 'string' || !isRecord(dto.profile) || !Array.isArray(dto.offers)) {
    throw new ApiError('invalid-response', 'SecurePay returned an unreadable Store.');
  }
}

export function storeIdentityView(dto: PublicStoreView): StoreIdentity {
  validateStoreView(dto);
  const profile = dto.profile;
  return {
    id: dto.canonicalKsNumber,
    name: dto.displayName,
    operator: dto.displayName, // backend has no separate legal-operator field; same real name in both slots
    businessIdentity: `${dto.identityType} KS identity — ${dto.canonicalKsNumber}`,
    serviceAreas: profile.locationLabel ? [profile.locationLabel] : [],
    verified: false, // no verification field in the backend Store contract; never claim true
    description: profile.about ?? profile.tagline ?? undefined,
  };
}

export function storeOffersView(dto: PublicStoreView, trustedMediaOrigin: string | null): StoreOffer[] {
  validateStoreView(dto);
  return dto.offers.map(offer => publicOfferToStoreOffer(offer, dto.canonicalKsNumber, dto.displayName, buildStoreOfferUrl(dto.canonicalKsNumber, offer.id), trustedMediaOrigin, dto.profile.locationLabel));
}

export function publicOfferDetailView(dto: PublicOfferDetailView, trustedMediaOrigin: string | null): { store: StoreIdentity; offer: StoreOffer } {
  if (!isRecord(dto) || typeof dto.canonicalKsNumber !== 'string' || typeof dto.displayName !== 'string' || !isRecord(dto.offer)) {
    throw new ApiError('invalid-response', 'SecurePay returned an unreadable Offer.');
  }
  const store = storeIdentityView({ canonicalKsNumber: dto.canonicalKsNumber, displayName: dto.displayName, identityType: dto.identityType, status: dto.status, profile: dto.profile, offers: [] });
  const offer = publicOfferToStoreOffer(dto.offer, dto.canonicalKsNumber, dto.displayName, buildStoreOfferUrl(dto.canonicalKsNumber, dto.offer.id), trustedMediaOrigin, dto.profile.locationLabel);
  return { store, offer };
}

export interface StoreSearchResult { canonicalKsNumber: string; displayName: string; locationLabel: string | null; offer: StoreOffer }
export function searchResultsView(results: PublicSearchResultView[], trustedMediaOrigin: string | null): StoreSearchResult[] {
  if (!Array.isArray(results)) throw new ApiError('invalid-response', 'SecurePay returned an unreadable search result.');
  return results.map(result => {
    if (!isRecord(result) || typeof result.canonicalKsNumber !== 'string' || typeof result.displayName !== 'string' || !isRecord(result.offer)) {
      throw new ApiError('invalid-response', 'SecurePay returned an unreadable search result.');
    }
    const locationLabel = typeof result.locationLabel === 'string' ? result.locationLabel : null;
    return {
      canonicalKsNumber: result.canonicalKsNumber,
      displayName: result.displayName,
      locationLabel,
      offer: publicOfferToStoreOffer(result.offer as PublicOfferView, result.canonicalKsNumber, result.displayName, buildStoreOfferUrl(result.canonicalKsNumber, (result.offer as PublicOfferView).id), trustedMediaOrigin, locationLabel),
    };
  });
}

/**
 * The trader's own `/store/me/**` responses carry no canonicalKsNumber/displayName at all (only an
 * opaque `identityId` UUID) — there is no verified `GET /me` identity contract that resolves it, and
 * decoding one from the session token is against this repo's identity doctrine. The trader-owned
 * "Store" header therefore cannot show a real business name or a real outbound SecureLink from this
 * endpoint; both degrade to a generic, non-fabricated label with the identity/link lines hidden. See
 * docs/PRODUCTION_MIGRATION_LEDGER.md for the exact gap.
 */
export function myStoreIdentityView(dto: StoreProfileResponse): StoreIdentity {
  if (!isRecord(dto) || typeof dto.identityId !== 'string') throw new ApiError('invalid-response', 'SecurePay returned an unreadable Store profile.');
  return {
    id: dto.identityId,
    name: dto.heroHeadline || dto.tagline || 'Your Store',
    operator: '', // no real legal-operator/display-name field on this endpoint; hidden by the caller
    businessIdentity: '', // no canonicalKsNumber/identityType on this endpoint; hidden by the caller
    serviceAreas: dto.locationLabel ? [dto.locationLabel] : [],
    verified: false,
    description: dto.about ?? undefined,
  };
}

/** No canonicalKsNumber is known trader-side, so no real public URL can be constructed for the offer's own SecureLink (see myStoreIdentityView doc). */
export function myOfferView(dto: StoreOfferResponse, trustedMediaOrigin: string | null): StoreOffer {
  if (!isRecord(dto) || typeof dto.id !== 'string' || typeof dto.kind !== 'string' || typeof dto.title !== 'string'
    || typeof dto.currency !== 'string' || typeof dto.availabilityState !== 'string' || typeof dto.published !== 'boolean'
    || typeof dto.updatedAt !== 'string' || !isStringArray(dto.mediaRefs)) {
    throw new ApiError('invalid-response', 'SecurePay returned an unreadable Store offer.');
  }
  assertKnownOfferKind(dto.kind);
  assertKnownAvailabilityState(dto.availabilityState);
  const { price, priceType } = formatPrice(dto.priceMinor, dto.currency);
  return {
    id: dto.id,
    storeId: '', // StoreOfferResponse carries no identity/KS-number linkage (trader-owned read, see myStoreIdentityView doc)
    storeName: '',
    title: dto.title,
    description: dto.description ?? '',
    offerType: offerType(dto.kind),
    priceType,
    price,
    currency: dto.currency,
    scope: { included: [], excluded: [] },
    media: media(dto.mediaRefs, trustedMediaOrigin),
    serviceArea: '',
    availability: availabilityText(dto.availabilityState),
    conditions: [],
    documents: [],
    milestoneSeeds: [],
    obligationSeeds: [],
    customizationAllowed: true,
    secureLink: { id: `store-offer-${dto.id}`, url: '', label: dto.title, linkType: 'offer', qrAvailable: false, whatsappShareAvailable: false, embedAvailable: false },
    lifecycle: lifecycle(dto.published, dto.availabilityState),
    version: asOfDate(dto.updatedAt),
    isExternalReference: false,
    isDemoState: false,
  };
}

function buildStoreOfferUrl(canonicalKsNumber: string, offerId: string): string {
  const origin = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
  return `${origin}#/store/${encodeURIComponent(canonicalKsNumber)}/offer/${encodeURIComponent(offerId)}`;
}
