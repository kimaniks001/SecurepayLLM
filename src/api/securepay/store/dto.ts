// Verified against kimaniks001/SecurePayAPI feat/securepay-phase9-store-platform @ 69424c1f83173b71f7cf99d20d964786aef78aa3
// (StoreController.java, PublicStoreController.java, StoreService.java). The OpenAPI file
// contracts/openapi/market-store-v1.yaml is stale relative to this source (missing /stores/search,
// heroHeadline/storefrontPreset/storefrontTheme, mediaRefs) — do not use it as source of truth.

export type OfferKind = 'PRODUCT' | 'SERVICE';

export type AvailabilityState =
  | 'AVAILABLE' | 'LOW_AVAILABILITY' | 'NEEDS_CONFIRMATION' | 'UNAVAILABLE' | 'PAUSED'
  | 'TAKING_WORK' | 'LIMITED' | 'FULLY_BOOKED' | 'RESTING';

export type StorefrontPreset = 'SIGNATURE' | 'MERCHANT' | 'SERVICE_PRO' | 'BOUTIQUE' | 'BUILDER' | 'COMMUNITY' | 'CREATOR';
export type StorefrontTheme = 'FOREST' | 'SUNSET' | 'MIDNIGHT' | 'EARTH' | 'OCEAN' | 'MONOCHROME';

// ─── Trader side (/api/v1/store/me/**, auth required) ───────────────────

export interface StoreProfileResponse {
  identityId: string;
  tagline: string | null;
  about: string | null;
  locationLabel: string | null;
  heroHeadline: string | null;
  storefrontPreset: StorefrontPreset;
  storefrontTheme: StorefrontTheme;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateStoreProfileRequest {
  tagline?: string | null;
  about?: string | null;
  locationLabel?: string | null;
  heroHeadline?: string | null;
  storefrontPreset?: StorefrontPreset;
  storefrontTheme?: StorefrontTheme;
}

export interface StoreOfferResponse {
  id: string;
  kind: OfferKind;
  title: string;
  description: string | null;
  priceMinor: number | null;
  currency: string;
  quantityAvailable: number | null;
  availabilityState: AvailabilityState;
  availabilityConfirmedAt: string | null;
  published: boolean;
  mediaRefs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertStoreOfferRequest {
  kind: OfferKind;
  title: string;
  description?: string | null;
  priceMinor?: number | null;
  quantityAvailable?: number | null;
  availabilityState: AvailabilityState;
  published: boolean;
  mediaRefs?: string[];
}

// ─── Public / customer side (/api/v1/stores/**, no auth) ───────────────────

export interface PublicStoreProfileView {
  tagline: string | null;
  about: string | null;
  locationLabel: string | null;
  heroHeadline: string | null;
  storefrontPreset: string;
  storefrontTheme: string;
  updatedAt: string;
}

export interface PublicOfferView {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  priceMinor: number | null;
  currency: string;
  quantityAvailable: number | null;
  availabilityState: string;
  availabilityConfirmedAt: string | null;
  mediaRefs: string[];
  updatedAt: string;
}

export interface PublicStoreView {
  canonicalKsNumber: string;
  displayName: string;
  identityType: string;
  status: string;
  profile: PublicStoreProfileView;
  offers: PublicOfferView[];
}

export interface PublicOfferDetailView {
  canonicalKsNumber: string;
  displayName: string;
  identityType: string;
  status: string;
  profile: PublicStoreProfileView;
  offer: PublicOfferView;
}

export interface PublicSearchResultView {
  canonicalKsNumber: string;
  displayName: string;
  locationLabel: string | null;
  offer: PublicOfferView;
}

export interface StoreSearchParams {
  kind: OfferKind;
  category?: string;
  location?: string;
  limit?: number;
}
