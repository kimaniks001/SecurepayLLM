/**
 * B1 cross-platform publication guard (2026-11-16).
 *
 * The existing /stores/search endpoint means "publicly listed", NOT "opted in
 * to appearing in any SecurePay client". Only a future SecurePayAPI-backed,
 * freshly evaluated publication authority can authorize cross-surface display.
 *
 * This client code does not create permission, infer merchant subscriptions,
 * or implement a new Store search endpoint. Until a server gateway is wired,
 * cross-platform listings MUST remain unavailable.
 */
import {
  createBusinessConnect, selectListedOffer,
  type BusinessConnectCandidate, type BusinessConnectDiscovery,
  type BusinessConnectInspection, type BusinessConnectNeed,
  type BusinessConnectSelection, type BusinessConnectSurface,
} from './index';
import type { StoreGateway } from '../../api/securepay/store';

export interface NetworkPublicationDecision {
  /** Returned by SecurePayAPI, never generated from merchant/public Store DTOs. */
  sellerKsNumber: string;
  offerId: string;
  targetSurface: BusinessConnectSurface;
  status: 'ELIGIBLE' | 'NOT_ELIGIBLE';
  /** Server-specified limit for when this decision may be displayed. */
  validUntil: string;
  /** Version for audit/debug only; it never makes a client transaction authoritative. */
  publicationVersion: number;
}

export interface NetworkPublicationAuthority {
  /**
   * Pending backend API contract:
   * Must freshly check explicit cross-platform publication consent,
   * appropriate business subscription, credential restrictions and offer
   * eligibility for targetSurface. On failures DO NOT return ELIGIBLE.
   */
  evaluate(input: {
    sellerKsNumber: string;
    offerId: string;
    targetSurface: BusinessConnectSurface;
  }): Promise<NetworkPublicationDecision>;
}

export type NetworkDiscoveryResult =
  | { status: 'ready'; results: BusinessConnectCandidate[]; surface: BusinessConnectSurface; filteredCount: number }
  | { status: 'unavailable'; results: []; surface: BusinessConnectSurface; reason: string };

export type NetworkInspectionResult =
  | { status: 'eligible'; inspection: Extract<BusinessConnectInspection, { status: 'listed' }> }
  | { status: 'blocked'; reason: string };

function eligible(
  decision: NetworkPublicationDecision,
  input: { sellerKsNumber: string; offerId: string; targetSurface: BusinessConnectSurface },
  now: number,
): boolean {
  const expiry = Date.parse(decision.validUntil);
  return decision.status === 'ELIGIBLE'
    && decision.sellerKsNumber === input.sellerKsNumber
    && decision.offerId === input.offerId
    && decision.targetSurface === input.targetSurface
    && Number.isFinite(expiry) && expiry > now
    && Number.isSafeInteger(decision.publicationVersion)
    && decision.publicationVersion >= 1;
}

/**
 * Injectable policy bridge; DO NOT substitute an always-true mock in production.
 * The server must ALSO recheck policy during sourced agreement establishment.
 */
export function createGovernedBusinessConnect(
  store: Pick<StoreGateway, 'search' | 'offer'>,
  authority: NetworkPublicationAuthority,
  now = () => Date.now(),
) {
  const base = createBusinessConnect(store);

  async function allowed(
    sellerKsNumber: string, offerId: string, surface: BusinessConnectSurface,
  ): Promise<boolean> {
    try {
      const input = { sellerKsNumber, offerId, targetSurface: surface };
      return eligible(await authority.evaluate(input), input, now());
    } catch {
      return false; // No network publication on service failure.
    }
  }

  return {
    async discover(need: BusinessConnectNeed): Promise<NetworkDiscoveryResult> {
      const found: BusinessConnectDiscovery = await base.discover(need);
      if (found.status !== 'ready') {
        return { status: 'unavailable', surface: need.surface, results: [], reason: found.reason };
      }
      // Results are only public candidates until individually approved by API.
      const policy = await Promise.all(found.results.map(
        candidate => allowed(candidate.sellerKsNumber, candidate.offerId, need.surface),
      ));
      const results = found.results.filter((_, index) => policy[index]);
      return {
        status: 'ready', surface: need.surface, results,
        filteredCount: found.results.length - results.length,
      };
    },

    async inspect(
      sellerKsNumber: string, offerId: string, surface: BusinessConnectSurface,
    ): Promise<NetworkInspectionResult> {
      // Authoritative Store facts and publication policy must both still hold.
      const inspection = await base.inspect(sellerKsNumber, offerId);
      if (inspection.status !== 'listed') {
        return { status: 'blocked', reason: inspection.reason };
      }
      if (!(await allowed(sellerKsNumber, offerId, surface))) {
        return { status: 'blocked', reason: 'This merchant has not made the offer available through this service.' };
      }
      return { status: 'eligible', inspection };
    },

    async select(
      sellerKsNumber: string, offerId: string, surface: BusinessConnectSurface,
      explicitlySelectedByCustomer: boolean,
    ): Promise<BusinessConnectSelection> {
      if (!explicitlySelectedByCustomer) throw new Error('Customer selection is required');
      // Re-fetch both sources on each selection; publication can be withdrawn.
      const latest = await this.inspect(sellerKsNumber, offerId, surface);
      if (latest.status !== 'eligible') throw new Error('Offer is not available through this service');
      return selectListedOffer(latest.inspection, true);
    },
  };
}
