import type { OfferDraftFields } from '../../components/OfferBuilderView';
import { availabilityOptionsFor } from './view';

/** Current architectural decision: Gate 1 keeps only an unsubmitted offer in this tab for
 * up to 24 hours, so signup/reload cannot discard it. No credentials, GPS, owner identity,
 * permissions or publication authority are stored. Successful API save or discard clears it. */
export const FIRST_OFFER_KEY = 'securepay.store.first-offer.v1';
const LIFETIME = 24 * 60 * 60 * 1000;
function browserStorage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.sessionStorage; } catch { return null; }
}
function clean(value: unknown): OfferDraftFields | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.kind !== 'PRODUCT' && v.kind !== 'SERVICE' && v.kind !== 'CAPACITY') return null;
  if (typeof v.title !== 'string' || v.title.length > 160 || typeof v.description !== 'string' || v.description.length > 4000) return null;
  if (typeof v.availabilityState !== 'string' || !availabilityOptionsFor(v.kind).includes(v.availabilityState as OfferDraftFields['availabilityState'])) return null;
  for (const key of ['priceMinor', 'quantityAvailable']) {
    if (v[key] !== null && (typeof v[key] !== 'number' || !Number.isSafeInteger(v[key]) || Number(v[key]) < 0)) return null;
  }
  if (!Array.isArray(v.mediaRefs) || v.mediaRefs.length > 20 || v.mediaRefs.some(x => typeof x !== 'string' || x.length > 2000)) return null;
  return {kind: v.kind, title: v.title, description: v.description,
    priceMinor: v.priceMinor as number | null, quantityAvailable: v.quantityAvailable as number | null,
    availabilityState: v.availabilityState as OfferDraftFields['availabilityState'],
    published: false, mediaRefs: [...v.mediaRefs] as string[]};
}
export function createFirstOfferDraftStore(storage: Storage | null = browserStorage(), now = () => Date.now()) {
  let memory: {draft: OfferDraftFields; expiresAt: number} | null = null;
  const clear = () => { memory = null; try { storage?.removeItem(FIRST_OFFER_KEY); } catch { /* memory cleared */ } };
  return {
    clear,
    remember(value: OfferDraftFields): void {
      const draft = clean(value);
      if (!draft || (!draft.title.trim() && !draft.description.trim())) { clear(); return; }
      memory = {draft, expiresAt: now() + LIFETIME};
      try { storage?.setItem(FIRST_OFFER_KEY, JSON.stringify(memory)); } catch { /* Same-page recovery remains available. */ }
    },
    read(): OfferDraftFields | null {
      let value: unknown = memory;
      try { const raw = storage?.getItem(FIRST_OFFER_KEY); if (raw) value = JSON.parse(raw); } catch { /* memory fallback */ }
      if (!value || typeof value !== 'object') return null;
      const record = value as {draft?: unknown; expiresAt?: unknown};
      const draft = clean(record.draft);
      if (!draft || typeof record.expiresAt !== 'number' || !Number.isFinite(record.expiresAt)
          || record.expiresAt <= now() || record.expiresAt > now() + LIFETIME) { clear(); return null; }
      return draft;
    },
  };
}
export const firstOfferDraftStore = createFirstOfferDraftStore();
