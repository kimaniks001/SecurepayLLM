/**
 * Phase 6 Slice 5 (Discovery & Identity) -- matches `DiscoverySearchController.DiscoveryResults` and
 * `PublicProfileController.PublicProfileResponse` exactly. Every field here is factual/matching-only;
 * there is deliberately no score, rank, or "recommended" field anywhere in this contract (Section 44).
 */
export interface DiscoveryCommunityItem {
  id: string;
  objectType: 'QUESTION' | 'NEED' | 'OPPORTUNITY' | 'WORK_STORY' | 'DISCUSSION';
  title: string;
  locationLabel: string | null;
  authorCanonicalKsNumber: string | null;
  authorDisplayName: string | null;
  createdAt: string;
}

export interface DiscoveryCircleItem {
  id: string;
  name: string;
  purpose: string;
  categoryLabel: string | null;
  locationLabel: string | null;
  membershipMode: 'OPEN' | 'REQUEST_TO_JOIN' | 'INVITE_ONLY';
  memberCount: number;
}

export interface DiscoveryStoreItem {
  offerId: string;
  kind: 'PRODUCT' | 'SERVICE';
  title: string;
  priceMinor: number | null;
  currency: string | null;
  availabilityState: string;
  canonicalKsNumber: string;
  displayName: string;
  locationLabel: string | null;
}

/**
 * Never the internal identity UUID, email, phone, or any other private field (Section 16/17). Final
 * pre-merge correction (Section 5/6) -- a public directory identity is only ever a real person or
 * business; `SYSTEM`/`TEST` are structurally impossible values here (the backend never returns them),
 * so this union is intentionally narrower than the platform's own internal `IdentityType`.
 */
export interface DiscoveryPersonItem {
  canonicalKsNumber: string;
  displayName: string;
  identityType: PublicDirectoryIdentityType;
  hasStore: boolean;
}

/** Final pre-merge correction -- the only two identity types a public person/business directory may
 * ever show (Section 5/6). Never widen this to include `SYSTEM`/`TEST`. */
export type PublicDirectoryIdentityType = 'INDIVIDUAL' | 'BUSINESS';

/**
 * Final pre-merge correction -- one `*HasMore` boolean per section, never a fabricated total count
 * (Section 12: "Do not invent fake total counts"). Only meaningful for a specific `scope`; the
 * `EVERYTHING` preview never drives a "Load more" UI regardless of these values (Section 26).
 */
export interface DiscoveryResults {
  community: DiscoveryCommunityItem[];
  communityHasMore: boolean;
  circles: DiscoveryCircleItem[];
  circlesHasMore: boolean;
  stores: DiscoveryStoreItem[];
  storesHasMore: boolean;
  people: DiscoveryPersonItem[];
  peopleHasMore: boolean;
}

export type DiscoveryScope = 'EVERYTHING' | 'COMMUNITY' | 'CIRCLES' | 'STORES' | 'PEOPLE';

/** A bounded, Community-LIVE-only, ACTIVE-only preview of a profile's own public activity (Section
 * 35) -- never a private Circle post. */
export interface PublicActivityItem {
  id: string;
  objectType: 'QUESTION' | 'NEED' | 'OPPORTUNITY' | 'WORK_STORY' | 'DISCUSSION';
  title: string;
  locationLabel: string | null;
  createdAt: string;
}

/** Never the internal identity UUID, email, phone, legal ID, address, balances, Agreement history,
 * or private Circle membership (Section 16/17). */
export interface PublicProfileResponse {
  canonicalKsNumber: string;
  displayName: string;
  identityType: PublicDirectoryIdentityType;
  hasStore: boolean;
  storeTagline: string | null;
  storeLocationLabel: string | null;
  recentActivity: PublicActivityItem[];
}
