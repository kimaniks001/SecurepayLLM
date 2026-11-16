/**
 * Shortstays B0 adapter: imports the shared Business Connect core rather than
 * copying SecurePay Checkout, Store Guide, SecureLink, or Agreement authority.
 *
 * This is a headless bridge. Shortstays Prototype 4 remains the visual authority.
 * A guest destination is a search hint, NOT delivery confirmation.
 */
import type { StoreGateway } from '../../api/securepay/store';
import {
  createBusinessConnect, selectListedOffer,
  type BusinessConnectInspection, type BusinessConnectNeed,
} from './index';

export interface ShortstaysGuestStoreNeed {
  /** A recognized catalogue category, e.g. "solar" or "electrical". */
  category: string;
  /** The guest's permitted, sufficiently coarse location (not private room data). */
  area?: string;
}

export function createShortstaysBusinessConnect(store: Pick<StoreGateway, 'search' | 'offer'>) {
  const bridge = createBusinessConnect(store);
  return {
    /** Candidate listings only; delivery to the campsite remains to be confirmed. */
    findCandidateListingsForGuest(input: ShortstaysGuestStoreNeed) {
      const need: BusinessConnectNeed = {
        surface: 'SHORTSTAYS',
        kind: 'PRODUCT',
        category: input.category,
        ...(input.area ? { location: input.area } : {}),
      };
      return bridge.discover(need);
    },
    inspectMerchantOffer: bridge.inspect,
    /** Does not create an Agreement. The host invokes the canonical Agent handoff. */
    useThisOffer(inspection: BusinessConnectInspection, customerConfirmed: boolean) {
      return selectListedOffer(inspection, customerConfirmed);
    },
  };
}
