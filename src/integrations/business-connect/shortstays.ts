/**
 * Shortstays B1 adapter: read-only discovery from the approved cross-platform
 * merchant network. Public Store listing alone is never network eligibility.
 * Shortstays Prototype 4 remains the visual authority.
 */
import type { StoreGateway } from '../../api/securepay/store';
import {
  createGovernedBusinessConnect,
  type NetworkPublicationAuthority,
} from './governed';

export interface ShortstaysGuestStoreNeed {
  /** A recognized catalogue category (not arbitrary AI-generated terms). */
  category: string;
  /** Coarse permitted guest area, not private room/booking details. */
  area?: string;
}

/**
 * Until SecurePayAPI provides the publication/entitlement gateway, Shortstays
 * MUST NOT display outside merchants. Never provide a permissive stub.
 */
export function createShortstaysBusinessConnect(
  store: Pick<StoreGateway, 'search' | 'offer'>,
  publication: NetworkPublicationAuthority,
) {
  const bridge = createGovernedBusinessConnect(store, publication);

  return {
    findCandidateListingsForGuest(input: ShortstaysGuestStoreNeed) {
      return bridge.discover({
        surface: 'SHORTSTAYS',
        kind: 'PRODUCT',
        category: input.category,
        ...(input.area ? { location: input.area } : {}),
      });
    },

    inspectMerchantOffer(sellerKsNumber: string, offerId: string) {
      return bridge.inspect(sellerKsNumber, offerId, 'SHORTSTAYS');
    },

    /** Requires a fresh authoritative publication check and explicit choice. */
    useThisOffer(sellerKsNumber: string, offerId: string, customerConfirmed: boolean) {
      return bridge.select(sellerKsNumber, offerId, 'SHORTSTAYS', customerConfirmed);
    },
  };
}
