import type { ComponentDto } from './dto';

/**
 * Discovery components the SERVER composes from real tool output (search_securepay_providers,
 * search_securepay_store_listings, get_provider_profile, get_price_context). The model can never author
 * these (SecurePayAgentOrchestrator rejects them from a model), so this adapter only validates SHAPE and
 * never fills a missing value: an absent/invalid field makes that ONE entry unreadable, and a wholly
 * malformed payload is dropped while the Agent's message survives.
 *
 * The exact contracts (verified in SecurePayAPI):
 *  - PROVIDER_RESULTS kind=PROVIDERS       { supported, providerCount, providers: [{providerRef, displayName, serviceArea, matchingCapabilities[]}] }
 *  - PROVIDER_RESULTS kind=STORE_LISTINGS  { supported, listingCount, listings: [{providerRef, displayName, title, priceMinor?, currency, availabilityState}] }
 *      -> NO offer id and NO description: a listing here cannot be selected as a commercial source directly.
 *  - PROVIDER_PROFILE                      { providerRef, displayName, found, serviceArea, about, services[], products[] } (offers: title, description, priceMinor?, currency, availabilityState)
 *  - PROVIDER_COMPARISON                   { profiles: [PROVIDER_PROFILE...] }
 *  - PRICE_CONTEXT                         { category, location, unit, lowMinor?, highMinor?, medianMinor?, currency, sampleSize, sourceType, asOf }
 * There is NO rating, review, ranking, image, distance or verification field anywhere in these.
 */
export interface AgentListing { providerRef: string; displayName: string; title: string; priceMinor: number | null; currency: string; availabilityState: string }
export interface AgentProvider { providerRef: string; displayName: string; serviceArea: string; matchingCapabilities: string[] }
export interface AgentOffer { title: string; description: string; priceMinor: number | null; currency: string; availabilityState: string }
export interface AgentProfile { providerRef: string; displayName: string; found: boolean; serviceArea: string; about: string; services: AgentOffer[]; products: AgentOffer[] }
export interface AgentPriceContext { category: string; location: string; unit: string; lowMinor: number | null; highMinor: number | null; medianMinor: number | null; currency: string; sampleSize: number; sourceType: string; asOf: string | null }
export type DiscoveryPayload =
  | { kind: 'providers'; supported: boolean; providers: AgentProvider[]; dropped: number }
  | { kind: 'listings'; supported: boolean; listings: AgentListing[]; dropped: number }
  | { kind: 'profile'; profile: AgentProfile }
  | { kind: 'comparison'; profiles: AgentProfile[] }
  | { kind: 'price'; price: AgentPriceContext };
export interface DiscoveryView { type: 'DISCOVERY'; title: string; rows: { label: string; value: string }[]; payload: DiscoveryPayload | null }

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): string | null => typeof value === 'string' ? value : null;
const minor = (value: unknown): number | null | undefined => value === null || value === undefined ? null : typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
const strings = (value: unknown): string[] | null => Array.isArray(value) && value.every(item => typeof item === 'string') ? value as string[] : null;

function readOffer(value: unknown): AgentOffer | null {
  if (!record(value)) return null;
  const title = str(value.title); const currency = str(value.currency) ?? ''; const price = minor(value.priceMinor);
  if (title === null || price === undefined) return null;
  return { title, description: str(value.description) ?? '', priceMinor: price, currency, availabilityState: str(value.availabilityState) ?? '' };
}
function readProfile(value: unknown): AgentProfile | null {
  if (!record(value)) return null;
  const providerRef = str(value.providerRef); const displayName = str(value.displayName);
  if (providerRef === null || displayName === null || typeof value.found !== 'boolean') return null;
  const list = (raw: unknown) => (Array.isArray(raw) ? raw : []).map(readOffer).filter((offer): offer is AgentOffer => offer !== null);
  return { providerRef, displayName, found: value.found, serviceArea: str(value.serviceArea) ?? '', about: str(value.about) ?? '', services: list(value.services), products: list(value.products) };
}

export function discoveryPayload(component: ComponentDto): DiscoveryPayload | null {
  const data = component.data;
  if (!record(data)) return null;
  switch (component.type) {
    case 'PROVIDER_RESULTS': {
      if (typeof data.supported !== 'boolean') return null;
      if (data.kind === 'STORE_LISTINGS') {
        const raw = Array.isArray(data.listings) ? data.listings : [];
        const listings: AgentListing[] = [];
        for (const entry of raw) {
          if (!record(entry)) continue;
          const providerRef = str(entry.providerRef); const displayName = str(entry.displayName); const title = str(entry.title); const price = minor(entry.priceMinor);
          if (providerRef === null || displayName === null || title === null || price === undefined) continue;
          listings.push({ providerRef, displayName, title, priceMinor: price, currency: str(entry.currency) ?? '', availabilityState: str(entry.availabilityState) ?? '' });
        }
        return { kind: 'listings', supported: data.supported, listings, dropped: raw.length - listings.length };
      }
      if (data.kind === 'PROVIDERS') {
        const raw = Array.isArray(data.providers) ? data.providers : [];
        const providers: AgentProvider[] = [];
        for (const entry of raw) {
          if (!record(entry)) continue;
          const providerRef = str(entry.providerRef); const displayName = str(entry.displayName); const caps = strings(entry.matchingCapabilities);
          if (providerRef === null || displayName === null) continue;
          providers.push({ providerRef, displayName, serviceArea: str(entry.serviceArea) ?? '', matchingCapabilities: caps ?? [] });
        }
        return { kind: 'providers', supported: data.supported, providers, dropped: raw.length - providers.length };
      }
      return null;
    }
    case 'PROVIDER_PROFILE': { const profile = readProfile(data); return profile ? { kind: 'profile', profile } : null; }
    case 'PROVIDER_COMPARISON': {
      if (!Array.isArray(data.profiles)) return null;
      const profiles = data.profiles.map(readProfile).filter((p): p is AgentProfile => p !== null);
      return profiles.length >= 2 ? { kind: 'comparison', profiles } : null;
    }
    case 'PRICE_CONTEXT': {
      const category = str(data.category); const location = str(data.location); const currency = str(data.currency); const sourceType = str(data.sourceType);
      const low = minor(data.lowMinor); const high = minor(data.highMinor); const median = minor(data.medianMinor);
      if (category === null || location === null || currency === null || sourceType === null || low === undefined || high === undefined || median === undefined
        || typeof data.sampleSize !== 'number' || !Number.isSafeInteger(data.sampleSize) || data.sampleSize < 0) return null;
      const asOf = str(data.asOf);
      return { kind: 'price', price: { category, location, unit: str(data.unit) ?? '', lowMinor: low, highMinor: high, medianMinor: median, currency, sampleSize: data.sampleSize, sourceType, asOf: asOf && !Number.isNaN(Date.parse(asOf)) ? asOf : null } };
    }
    default: return null;
  }
}

/** Kept for the generic label/value fallback and existing consumers; the rich `payload` is what customers see. */
export function discoveryView(component: ComponentDto): DiscoveryView | null {
  const payload = discoveryPayload(component);
  if (!payload) return null;
  const rows: DiscoveryView['rows'] = [];
  let title = 'Found on SecurePay';
  switch (payload.kind) {
    case 'providers': title = 'People to consider'; rows.push({ label: 'supported', value: String(payload.supported) }, { label: 'provider Count', value: String(payload.providers.length) }); break;
    case 'listings': title = 'Store listings'; rows.push({ label: 'supported', value: String(payload.supported) }, { label: 'listing Count', value: String(payload.listings.length) }); break;
    case 'profile': title = 'Provider profile'; rows.push({ label: 'display Name', value: payload.profile.displayName }); break;
    case 'comparison': title = 'Provider comparison'; rows.push({ label: 'profiles', value: String(payload.profiles.length) }); break;
    case 'price': title = 'Price context'; rows.push({ label: 'category', value: payload.price.category }, { label: 'sample Size', value: String(payload.price.sampleSize) }); break;
  }
  return { type: 'DISCOVERY', title, rows, payload };
}
