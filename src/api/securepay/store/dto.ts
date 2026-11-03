// Day 5 Gate 2: user-consented customer->merchant connections.
// None of these statuses is an order, accepted quotation or Agreement.
export interface StoreFavouriteDto {
  canonicalKsNumber: string;
  slug: string;
  storeName: string;
  serviceArea: string | null;
  createdAt: string;
}

export interface StoreEnquiryDto {
  id: string;
  offerId: string;
  offerTitle: string;
  storeName: string;
  sellerKsNumber: string;
  buyerKsNumber: string;
  offeredPriceMinorSnapshot: number | null;
  requestedQuantity: number;
  customerMessage: string;
  status: 'REQUESTED' | 'REPLIED' | 'DECLINED';
  sellerReply: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateStoreEnquiryRequest {
  canonicalKsNumber: string;
  offerId: string;
  clientRequestId: string;
  quantity: number;
  message: string;
}
export interface RespondToStoreEnquiryRequest {
  status: 'REPLIED' | 'DECLINED';
  message: string;
}

// Digital Store address is an alias of the same canonical KS identity, not a new account.
// Owner reads include private GPS. Public reads NEVER contain private GPS or accuracy.
export interface DigitalStoreAddress {
  slug: string;
  storeName: string;
  serviceArea: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  capturedAt: string | null;
  locationProvenance: 'DEVICE' | 'MAP_SELECTED' | 'MANUAL' | null;
  publicPin: boolean;
  updatedAt: string;
}
export type SaveDigitalStoreAddress = Omit<DigitalStoreAddress, 'updatedAt'>;
export interface PublicDigitalStoreAddress {
  slug: string;
  storeName: string;
  requestedSlug: string;
  canonicalKsNumber: string;
  serviceArea: string | null;
  latitude: number | null;
  longitude: number | null;
  publicPin: boolean;
}

// Verified against kimaniks001/SecurePayAPI feat/securepay-phase9-store-platform @ 69424c1f83173b71f7cf99d20d964786aef78aa3
// (StoreController.java, PublicStoreController.java, StoreService.java). The OpenAPI file
// contracts/openapi/market-store-v1.yaml is stale relative to this source (missing /stores/search,
// heroHeadline/storefrontPreset/storefrontTheme, mediaRefs) — do not use it as source of truth.

export type OfferKind = 'PRODUCT' | 'SERVICE' | 'CAPACITY';

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


export type SupplyRole =
  | 'MANUFACTURER'
  | 'PRODUCER'
  | 'DISTRIBUTOR'
  | 'WHOLESALER'
  | 'RETAILER'
  | 'SERVICE_PROVIDER'
  | 'TRANSPORT_PROVIDER'
  | 'ACCOMMODATION_PROVIDER'
  | 'EQUIPMENT_PROVIDER'
  | 'STORAGE_PROVIDER'
  | 'OTHER_APPROVED_ROLE';

export type PricingMode = 'LISTED_PRICE' | 'QUOTE_REQUIRED';

export interface BusinessStoreProfileResponse {
  businessKsNumber: string;
  displayName: string | null;
  tagline: string | null;
  about: string | null;
  locationLabel: string | null;
  heroHeadline: string | null;
  storefrontPreset: StorefrontPreset;
  storefrontTheme: StorefrontTheme;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StoreOfferFulfilmentResponse {
  offerId: string;
  supplyRoles: SupplyRole[];
  pricingMode: PricingMode;
  unit: string | null;
  minimumOrderQuantity: number | null;
  leadTimeHours: number | null;
  serviceAreas: string[];
  deliveryAvailable: boolean | null;
  capacityQuantity: number | null;
  capacityUnit: string | null;
  scheduleNote: string | null;
  warrantyTerms: string | null;
  returnTerms: string | null;
  fulfilmentConditions: string | null;
  credentialRefs: string[];
  evidenceExpectations: string[];
  updatedAt: string;
  version: number;
}

export interface UpsertStoreOfferFulfilmentRequest {
  supplyRoles?: SupplyRole[];
  pricingMode?: PricingMode;
  unit?: string | null;
  minimumOrderQuantity?: number | null;
  leadTimeHours?: number | null;
  serviceAreas?: string[];
  deliveryAvailable?: boolean | null;
  capacityQuantity?: number | null;
  capacityUnit?: string | null;
  scheduleNote?: string | null;
  warrantyTerms?: string | null;
  returnTerms?: string | null;
  fulfilmentConditions?: string | null;
  credentialRefs?: string[];
  evidenceExpectations?: string[];
}


export interface BusinessStoreOpportunityMatchedOffer {
  offerId: string;
  title: string;
  offerKind: OfferKind;
  availabilityState: string;
  supplyRoles: string[];
}

export interface BusinessStoreOpportunityResponse {
  fulfilmentNeedId: string;
  needType: 'PRODUCT' | 'TRANSPORT' | 'ACCOMMODATION' | 'LABOUR' | 'COURIER' | 'STORAGE' | 'EQUIPMENT' | 'SERVICE' | 'OTHER';
  quantity: number | null;
  unit: string | null;
  requiredBy: string | null;
  poolable: boolean;
  matchedOffers: BusinessStoreOpportunityMatchedOffer[];
}
