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

/** Never the internal identity UUID, email, phone, or any other private field (Section 16/17). */
export interface DiscoveryPersonItem {
  canonicalKsNumber: string;
  displayName: string;
  identityType: 'INDIVIDUAL' | 'BUSINESS' | 'SYSTEM' | 'TEST';
  hasStore: boolean;
}

export interface DiscoveryResults {
  community: DiscoveryCommunityItem[];
  circles: DiscoveryCircleItem[];
  stores: DiscoveryStoreItem[];
  people: DiscoveryPersonItem[];
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
  identityType: 'INDIVIDUAL' | 'BUSINESS' | 'SYSTEM' | 'TEST';
  hasStore: boolean;
  storeTagline: string | null;
  storeLocationLabel: string | null;
  recentActivity: PublicActivityItem[];
}
