import type { ComponentDto } from './dto';

export interface DiscoveryView { type: 'DISCOVERY'; title: string; rows: { label: string; value: string }[] }
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
/** Only known, inspected public tool fields; never infer ranking, role, hiring or source adoption. */
export function discoveryView(component: ComponentDto): DiscoveryView | null {
  if (!record(component.data)) return null;
  const data = component.data;
  const rows: DiscoveryView['rows'] = [];
  const fields = (entry: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const value = entry[key];
      if (typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isSafeInteger(value))) rows.push({ label: key.replace(/([A-Z])/g, ' $1'), value: String(value) });
      else if (Array.isArray(value) && value.every(item => typeof item === 'string')) rows.push({ label: key, value: value.join(' · ') });
    }
  };
  const profile = (entry: Record<string, unknown>) => {
    fields(entry, ['found', 'providerRef', 'displayName', 'serviceArea', 'about']);
    for (const key of ['services', 'products']) if (Array.isArray(entry[key])) for (const offer of entry[key]) if (record(offer)) fields(offer, ['title', 'description', 'priceMinor', 'currency', 'availabilityState']);
  };
  let title: string;
  switch (component.type) {
    case 'PROVIDER_RESULTS':
      title = data.kind === 'STORE_LISTINGS' ? 'Store listings' : 'People to consider';
      fields(data, ['supported', 'providerCount', 'listingCount']);
      for (const key of ['providers', 'listings']) if (Array.isArray(data[key])) for (const entry of data[key]) if (record(entry)) fields(entry, ['providerRef', 'displayName', 'serviceArea', 'matchingCapabilities', 'title', 'priceMinor', 'currency', 'availabilityState']);
      break;
    case 'PROVIDER_PROFILE': title = 'Provider profile'; profile(data); break;
    case 'PROVIDER_COMPARISON':
      title = 'Provider comparison';
      if (Array.isArray(data.profiles)) for (const entry of data.profiles) if (record(entry)) profile(entry);
      break;
    case 'PRICE_CONTEXT':
      title = 'Price context';
      fields(data, ['category', 'location', 'unit', 'lowMinor', 'highMinor', 'medianMinor', 'currency', 'sampleSize', 'sourceType', 'asOf']);
      break;
    default: return null;
  }
  return rows.length ? { type: 'DISCOVERY', title, rows } : null;
}
