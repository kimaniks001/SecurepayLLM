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

// ─── Phase 4: separate, owner-confirmed text-only publication ───────────────
// Dedicated API branch feat/mini-sell-phase4-text-publish-cas-20261117.
// It cannot publish local images, create an Agreement, or verify stock.
export interface PublishStoreTextOfferRequest {
  /** Exact updatedAt returned by the authenticated Store, not a local timestamp. */
  expectedUpdatedAt: string;
  /** The seller reviewed this listing and deliberately chose publication. */
  sellerConfirmsCurrentListing: true;
}
/** Revised text for an already-public offer: no media, stock or availability claim. */
export interface UpdatePublishedStoreTextOfferRequest {
  expectedUpdatedAt: string;
  sellerConfirmsCurrentListing: true;
  title: string;
  description: string | null;
  priceMinor: number | null;
}

export interface PublishedStoreTextOfferResponse {
  id: string;
  kind: OfferKind;
  title: string;
  description: string | null;
  priceMinor: number | null;
  currency: string;
  availabilityState: 'NEEDS_CONFIRMATION';
  published: true;
  mediaRefs: [];
  availabilityConfirmedAt: string | null;
  updatedAt: string;
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


// ─── Phase 3 pending-only Store photo-source linkage (API draft PR #475) ──
// These are PRIVATE, authenticated, backend-bound statuses. No rights-verified,
// licensed, stock-confirmed, approved, published or Identimark status exists.
export type StoreImageUseOrigin = 'SELLER_PHOTOGRAPH' | 'SUPPLIER_IMAGE' | 'OTHER_PERMISSIONED';
export type StoreImageUseStatus =
  | 'PENDING_REVIEW' | 'STALE_OFFER_REVIEW_REQUIRED'
  | 'SOURCE_CHANGED_REVIEW_REQUIRED' | 'REVOKED'
  | 'MORE_INFORMATION_REQUIRED' | 'ESCALATED' | 'REJECTED'
  | 'RESUBMITTED_FOR_REVIEW';

export interface RegisterStoreImageUseRequest {
  /** Already saved source conversation OWNED by the authenticated human. */
  conversationId: string;
  sourceArtifactId: string;
  /** Exact Store offer updatedAt returned by the backend, not a client timestamp. */
  expectedOfferUpdatedAt: string;
  origin: StoreImageUseOrigin;
  permissionToUse: boolean;
}
export interface StoreImageUseResponse {
  /** Private, pending image-use row ID. NOT a public mediaRef or Identimark. */
  id: string;
  status: StoreImageUseStatus;
  declaredOrigin: StoreImageUseOrigin;
  createdAt: string;
  /** A seller-safe question category. The reviewer's private note stays private. */
  requestTopic?: StoreImageReviewTopic | null;
}


// ─── Phase 3: seller-explicit, UNVERIFIED rights evidence link (API draft) ───
// Must refer to a real PHOTO/DOCUMENT already ingested from the SAME saved
// KS001 conversation as the pending image use; no local files or invented IDs.
export type StoreImageEvidencePurpose =
  'SUPPLIER_PERMISSION' | 'SELLER_AUTHORITY' | 'OTHER_RIGHTS_EVIDENCE';
export type StoreImageEvidenceStatus = 'LINKED_UNVERIFIED' | 'REVOKED';
export interface LinkStoreImageEvidenceRequest {
  sourceArtifactId: string;
  expectedOfferUpdatedAt: string;
  purpose: StoreImageEvidencePurpose;
}
export interface StoreImageEvidenceView {
  /** Private evidence-link ID, NOT a published photo, verified licence or mediaRef. */
  id: string;
  purpose: StoreImageEvidencePurpose;
  status: StoreImageEvidenceStatus;
  createdAt: string;
}


// ─── Phase 3: structured answer-pill response to independent review ───
// No free-form explanation. "I added proof" is accepted by the backend ONLY
// when a NEW validated, still-linked source was attached after the request.
export type StoreImageReviewTopic =
  | 'PHOTO_SOURCE' | 'SUPPLIER_PERMISSION' | 'SELLER_AUTHORITY'
  | 'PHOTO_CLARITY' | 'OFFER_DETAILS' | 'OTHER';
export type StoreImageSellerReviewStatus =
  | 'AWAITING_REVIEW' | 'MORE_INFORMATION_REQUIRED' | 'RESUBMITTED_FOR_REVIEW'
  | 'ESCALATED' | 'REJECTED';
export type StoreImageSellerResponseChoice = 'EVIDENCE_ATTACHED';
export interface StoreImageReviewQuestion {
  imageUseId: string;
  status: StoreImageSellerReviewStatus;
  topic: StoreImageReviewTopic | null;
  requestedAt: string | null;
}
export interface RespondStoreImageReviewRequest {
  expectedOfferUpdatedAt: string;
  choice: StoreImageSellerResponseChoice;
}
export interface StoreImageSellerReviewReply {
  id: string;
  imageUseId: string;
  status: 'RESUBMITTED_FOR_REVIEW';
  createdAt: string;
}
