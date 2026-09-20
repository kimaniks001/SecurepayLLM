import { ApiError } from '../../api/securepay/http';
import type { PublicOfferView, PublicSearchResultView, PublicStoreView } from '../../api/securepay/store/dto';
import { media } from '../../api/securepay/store/adapters';
import type { AgentListing, AgentOffer, AgentProfile, DiscoveryView } from '../../api/securepay/agent/discovery';
import { availabilityStateLabel } from '../../storeLabels';
import { formatMinor } from './money';
import type { StoreOffer } from '../../types';

/**
 * ONE result model for everything SecurePay can show as "something you could use": a published Store
 * offer (product or service) found by the Store search, listed in a Store, or -- with less information --
 * reported by the Agent's listing tool. Every field is a real backend value or absent; nothing is derived
 * into a score, badge or preference.
 *
 *  - `offerId` is the REAL Store offer id. It exists for Store-search / Store-view results and is what a
 *    commercial source is selected by. An Agent-tool listing has NO offer id, so it is `null` and can only
 *    lead to that seller's Store (where the real offers, with ids, are).
 *  - `mediaUrl` is set only when a media ref is on the one trusted origin (see store/adapters `media`).
 */
export type AvailabilityTone = 'open' | 'limited' | 'unconfirmed' | 'closed' | 'unstated';
export interface ResultOffer {
  key: string;
  offerId: string | null;
  ownerKs: string;
  ownerName: string;
  kind: 'PRODUCT' | 'SERVICE' | null;
  title: string;
  description: string;
  priceMinor: number | null;
  currency: string;
  priceLabel: string | null;
  availabilityState: string;
  availabilityLabel: string;
  tone: AvailabilityTone;
  quantity: number | null;
  place: string;
  updatedAt: string | null;
  mediaUrl: string | null;
}

const TONE: Record<string, AvailabilityTone> = {
  AVAILABLE: 'open', TAKING_WORK: 'open', LOW_AVAILABILITY: 'limited', LIMITED: 'limited', NEEDS_CONFIRMATION: 'unconfirmed',
  UNAVAILABLE: 'closed', PAUSED: 'closed', FULLY_BOOKED: 'closed', RESTING: 'closed',
};
export function availabilityView(state: string): { label: string; tone: AvailabilityTone } {
  const label = (availabilityStateLabel as Record<string, string>)[state];
  return label ? { label, tone: TONE[state] ?? 'unstated' } : { label: state ? state.toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : 'Availability not stated', tone: 'unstated' };
}
/** A closed availability means the seller says they cannot take this right now -- shown plainly, and "Use this" is not offered. */
export const isClosed = (offer: Pick<ResultOffer, 'tone'>): boolean => offer.tone === 'closed';

function offerFrom(view: PublicOfferView, ownerKs: string, ownerName: string, place: string | null, trustedOrigin: string | null): ResultOffer {
  if (typeof view?.id !== 'string' || typeof view.title !== 'string' || typeof view.currency !== 'string' || typeof view.availabilityState !== 'string'
    || (view.priceMinor !== null && !Number.isSafeInteger(view.priceMinor)) || !Array.isArray(view.mediaRefs)) {
    throw new ApiError('invalid-response', 'SecurePay returned an unreadable Store offer.');
  }
  const availability = availabilityView(view.availabilityState);
  return {
    key: `${ownerKs}:${view.id}`, offerId: view.id, ownerKs, ownerName,
    kind: view.kind === 'PRODUCT' || view.kind === 'SERVICE' ? view.kind : null,
    title: view.title, description: view.description ?? '', priceMinor: view.priceMinor, currency: view.currency,
    priceLabel: formatMinor(view.priceMinor, view.currency), availabilityState: view.availabilityState, availabilityLabel: availability.label, tone: availability.tone,
    quantity: typeof view.quantityAvailable === 'number' ? view.quantityAvailable : null, place: place ?? '',
    updatedAt: typeof view.updatedAt === 'string' && !Number.isNaN(Date.parse(view.updatedAt)) ? view.updatedAt : null,
    mediaUrl: media(view.mediaRefs.filter((ref): ref is string => typeof ref === 'string'), trustedOrigin).find(m => m.url)?.url ?? null,
  };
}
export function resultsFromSearch(pages: PublicSearchResultView[], trustedOrigin: string | null): ResultOffer[] {
  if (!Array.isArray(pages)) throw new ApiError('invalid-response', 'SecurePay returned an unreadable search result.');
  return pages.map(entry => {
    if (typeof entry?.canonicalKsNumber !== 'string' || typeof entry.displayName !== 'string' || typeof entry.offer !== 'object' || entry.offer === null) throw new ApiError('invalid-response', 'SecurePay returned an unreadable search result.');
    return offerFrom(entry.offer, entry.canonicalKsNumber, entry.displayName, typeof entry.locationLabel === 'string' ? entry.locationLabel : null, trustedOrigin);
  });
}
export interface StoreResults { ownerKs: string; ownerName: string; place: string; about: string; offers: ResultOffer[] }
export function resultsFromStore(view: PublicStoreView, trustedOrigin: string | null): StoreResults {
  if (typeof view?.canonicalKsNumber !== 'string' || typeof view.displayName !== 'string' || !Array.isArray(view.offers) || typeof view.profile !== 'object' || view.profile === null) throw new ApiError('invalid-response', 'SecurePay returned an unreadable Store.');
  const place = view.profile.locationLabel ?? '';
  return { ownerKs: view.canonicalKsNumber, ownerName: view.displayName, place, about: view.profile.about ?? view.profile.tagline ?? '', offers: view.offers.map(o => offerFrom(o, view.canonicalKsNumber, view.displayName, place, trustedOrigin)) };
}
/** An Agent-tool listing: real, but with no offer id -- so `offerId` is null and it can only lead to the seller's Store. */
export function resultFromAgentListing(listing: AgentListing, index: number): ResultOffer {
  const availability = availabilityView(listing.availabilityState);
  return {
    key: `${listing.providerRef}:listing:${index}`, offerId: null, ownerKs: listing.providerRef, ownerName: listing.displayName, kind: 'PRODUCT',
    title: listing.title, description: '', priceMinor: listing.priceMinor, currency: listing.currency, priceLabel: formatMinor(listing.priceMinor, listing.currency),
    availabilityState: listing.availabilityState, availabilityLabel: availability.label, tone: availability.tone, quantity: null, place: '', updatedAt: null, mediaUrl: null,
  };
}
/** Facts shown side by side. Differences only -- never a winner, never a score. Rows with no data anywhere are omitted. */
export interface CompareRow { label: string; values: (string | null)[] }
export function compareRows(offers: ResultOffer[]): CompareRow[] {
  const rows: CompareRow[] = [
    { label: 'Seller', values: offers.map(o => `${o.ownerName} · ${o.ownerKs}`) },
    { label: 'Kind', values: offers.map(o => o.kind === 'SERVICE' ? 'Service' : o.kind === 'PRODUCT' ? 'Product' : null) },
    { label: 'Listed price', values: offers.map(o => o.priceLabel ?? 'No price listed') },
    { label: 'Availability', values: offers.map(o => o.availabilityLabel) },
    { label: 'Quantity', values: offers.map(o => o.quantity === null ? null : String(o.quantity)) },
    { label: 'Place', values: offers.map(o => o.place || null) },
    { label: 'Last updated', values: offers.map(o => o.updatedAt ? new Date(o.updatedAt).toISOString().slice(0, 10) : null) },
  ];
  return rows.filter(row => row.values.some(v => v !== null));
}

/** Facts about real provider PROFILES (from get_provider_profile), side by side. Ranges are only min/max of listed prices. */
function priceRange(offers: AgentOffer[]): string | null {
  const priced = offers.filter(o => o.priceMinor !== null);
  if (priced.length === 0) return offers.length ? 'No prices listed' : null;
  const currency = priced[0].currency;
  if (priced.some(o => o.currency !== currency)) return 'Prices in more than one currency';
  const values = priced.map(o => o.priceMinor as number);
  const low = Math.min(...values); const high = Math.max(...values);
  return low === high ? formatMinor(low, currency) : `${formatMinor(low, currency)} – ${formatMinor(high, currency)}`;
}
export function profileRows(profiles: AgentProfile[]): CompareRow[] {
  const titles = (offers: AgentOffer[]) => offers.length ? offers.map(o => o.title).join(' · ') : null;
  const rows: CompareRow[] = [
    { label: 'Seller', values: profiles.map(p => p.found ? `${p.displayName} · ${p.providerRef}` : 'Not found') },
    { label: 'Place', values: profiles.map(p => p.serviceArea || null) },
    { label: 'Services', values: profiles.map(p => titles(p.services) ?? 'None published') },
    { label: 'Service prices', values: profiles.map(p => priceRange(p.services)) },
    { label: 'Products', values: profiles.map(p => titles(p.products) ?? 'None published') },
    { label: 'Product prices', values: profiles.map(p => priceRange(p.products)) },
  ];
  return rows.filter(row => row.values.some(v => v !== null));
}

/**
 * The standalone Store (and a Store's own page) already hold the Bolt-shaped `StoreOffer` view. It is
 * converted to the SAME `ResultOffer` so the standalone Store and Agent discovery share one result card,
 * one factual semantics and one "Use this" pathway. `priceLabel` is the Store adapter's own formatted price
 * (null when the seller listed none); availability tone is recovered from the real state label, never guessed.
 */
const TONE_BY_LABEL = new Map<string, AvailabilityTone>(Object.entries(availabilityStateLabel).map(([state, label]) => [label, TONE[state] ?? 'unstated']));
export function resultFromStoreOffer(o: StoreOffer): ResultOffer {
  return {
    key: `${o.storeId}:${o.id}`, offerId: o.id, ownerKs: o.storeId, ownerName: o.storeName,
    kind: o.offerType === 'product' ? 'PRODUCT' : o.offerType === 'service' ? 'SERVICE' : null,
    title: o.title, description: o.description, priceMinor: null, currency: o.currency, priceLabel: o.priceType === 'unlisted' ? null : o.price,
    availabilityState: '', availabilityLabel: o.availability, tone: o.lifecycle === 'unavailable' ? 'closed' : TONE_BY_LABEL.get(o.availability) ?? 'unstated',
    quantity: null, place: o.serviceArea, updatedAt: null, mediaUrl: o.media.find(m => m.url)?.url ?? null,
  };
}

/** One short phrase for what a turn's discoveries contain ("3 Store listings · Price context") -- counts only, no judgement. */
export function foundLabel(views: DiscoveryView[]): string {
  const parts: string[] = [];
  for (const view of views) {
    const p = view.payload;
    if (!p) continue;
    if (p.kind === 'listings') parts.push(!p.supported ? 'Store search unavailable' : p.listings.length === 0 ? 'No Store listings' : `${p.listings.length} Store listing${p.listings.length === 1 ? '' : 's'}`);
    else if (p.kind === 'providers') parts.push(!p.supported ? 'People search unavailable' : p.providers.length === 0 ? 'Nobody found' : `${p.providers.length} ${p.providers.length === 1 ? 'person' : 'people'}`);
    else if (p.kind === 'profile') parts.push(`${p.profile.displayName || 'A'} profile`);
    else if (p.kind === 'comparison') parts.push('A side-by-side');
    else parts.push('Price context');
  }
  return parts.join(' · ');
}
