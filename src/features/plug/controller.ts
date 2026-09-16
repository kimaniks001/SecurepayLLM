import { ApiError, type RemoteState } from '../../api/securepay/http';
import {
  customerMarketRequestView, customerMarketSelectionView, customerPlugRelationshipView,
  interestedCandidateView, relationshipLifecycleView, type CustomerMarketRequestView,
  type CustomerMarketSelectionView, type CustomerPlugRelationshipView, type InterestedCandidateView,
  type RelationshipLifecycleView,
} from '../../api/securepay/marketnetwork/adapters';
import type { CustomerMarketRequestType } from '../../api/securepay/marketnetwork/dto';
import type { MarketNetworkGateway } from '../../api/securepay/marketnetwork';
import { agreementKeyContractReferralView, agreementPlugAttributionView, type AgreementKeyContractReferralView, type AgreementPlugAttributionView } from '../../api/securepay/agreements/adapters';
import type { AgreementGateway } from '../../api/securepay/agreements';

export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return 'SecurePay could not allow this request.';
    if (error.status === 404) return 'That could not be found. It may have expired or no longer exists.';
    if (error.status === 409) return 'This has already been attributed and cannot be changed.';
    if (error.status === 422) return 'That combination is not allowed.';
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) return 'SecurePay is unavailable. Please try again.';
    return error.message;
  }
  return 'SecurePay could not complete this step. Please try again.';
}
function asApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError('network', 'SecurePay is unavailable');
}

type Gateway = Pick<MarketNetworkGateway, 'createRequest' | 'candidates' | 'selectCandidate' | 'openRelationship' | 'relationshipLifecycle'> & {
  attribution: Pick<AgreementGateway, 'attributePlug' | 'plugAttribution' | 'referralStatus'>;
};

export interface PlugState {
  request: RemoteState<CustomerMarketRequestView>;
  candidates: RemoteState<InterestedCandidateView[]>;
  selectedCandidateRef: string | null;
  selection: RemoteState<CustomerMarketSelectionView>;
  relationship: RemoteState<CustomerPlugRelationshipView>;
  lifecycle: RemoteState<RelationshipLifecycleView>;
  /** `empty` = no attribution exists yet for this Agreement (a real, valid 404 state — never an error). */
  existingAttribution: RemoteState<AgreementPlugAttributionView>;
  referralStatus: RemoteState<AgreementKeyContractReferralView>;
  attributionBusy: boolean;
  attributionError: string | null;
}
const initial: PlugState = {
  request: { status: 'idle' }, candidates: { status: 'idle' }, selectedCandidateRef: null,
  selection: { status: 'idle' }, relationship: { status: 'idle' }, lifecycle: { status: 'idle' },
  existingAttribution: { status: 'idle' }, referralStatus: { status: 'idle' },
  attributionBusy: false, attributionError: null,
};

/**
 * Customer-side "get connected with a Plug" flow (task section 6/18): create a market request, browse the
 * real (opaque — task section 7 confirms no name/domain/geography exists) interested candidates, select
 * one, open the relationship, and — only as an explicit separate action — attribute the resulting real
 * `relationshipRef` to a specific Agreement. Every step is its own explicit call; nothing here ever
 * fabricates a relationshipRef or silently attributes a Plug (task section 6/18/19 doctrine).
 */
export function createPlugController(gateway: Gateway, id = () => crypto.randomUUID()) {
  let state: PlugState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<PlugState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };

  async function loadReferralStatus(agreementId: string) {
    update({ referralStatus: { status: 'loading' } });
    try {
      update({ referralStatus: { status: 'ready', data: agreementKeyContractReferralView(await gateway.attribution.referralStatus(agreementId)) } });
    } catch (error) { update({ referralStatus: { status: 'error', error: asApiError(error) } }); }
  }

  return {
    getSnapshot: (): PlugState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    async startRequest(requestType: CustomerMarketRequestType) {
      update({ request: { status: 'loading' }, candidates: { status: 'idle' }, selection: { status: 'idle' }, relationship: { status: 'idle' }, lifecycle: { status: 'idle' } });
      try {
        const dto = await gateway.createRequest(requestType, id());
        update({ request: { status: 'ready', data: customerMarketRequestView(dto) } });
      } catch (error) { update({ request: { status: 'error', error: asApiError(error) } }); }
    },

    async loadCandidates(requestId: string) {
      update({ candidates: { status: 'loading' } });
      try {
        const dtos = await gateway.candidates(requestId);
        const views = dtos.map(interestedCandidateView);
        update({ candidates: views.length === 0 ? { status: 'empty' } : { status: 'ready', data: views } });
      } catch (error) { update({ candidates: { status: 'error', error: asApiError(error) } }); }
    },
    selectCandidateRef(candidateRef: string) { update({ selectedCandidateRef: candidateRef }); },

    async confirmSelection(requestId: string) {
      if (!state.selectedCandidateRef) return;
      update({ selection: { status: 'loading' } });
      try {
        const dto = await gateway.selectCandidate(requestId, state.selectedCandidateRef);
        update({ selection: { status: 'ready', data: customerMarketSelectionView(dto) } });
      } catch (error) { update({ selection: { status: 'error', error: asApiError(error) } }); }
    },

    async openRelationship(requestId: string) {
      update({ relationship: { status: 'loading' } });
      try {
        const dto = await gateway.openRelationship(requestId);
        update({ relationship: { status: 'ready', data: customerPlugRelationshipView(dto) } });
      } catch (error) { update({ relationship: { status: 'error', error: asApiError(error) } }); }
    },
    async loadRelationshipLifecycle(relationshipRef: string) {
      update({ lifecycle: { status: 'loading' } });
      try {
        update({ lifecycle: { status: 'ready', data: relationshipLifecycleView(await gateway.relationshipLifecycle(relationshipRef)) } });
      } catch (error) { update({ lifecycle: { status: 'error', error: asApiError(error) } }); }
    },

    async loadExistingAttribution(agreementId: string) {
      update({ existingAttribution: { status: 'loading' } });
      try {
        const dto = await gateway.attribution.plugAttribution(agreementId);
        update({ existingAttribution: { status: 'ready', data: agreementPlugAttributionView(dto) } });
      } catch (error) {
        const apiError = asApiError(error);
        // A real, valid "no attribution yet" state — the server's own documented 404 for this read, never
        // conflated with a genuine failure (task section 18: fail closed only on real errors).
        if (apiError.status === 404) update({ existingAttribution: { status: 'empty' } });
        else update({ existingAttribution: { status: 'error', error: apiError } });
      }
    },
    loadReferralStatus,

    /**
     * Submits exactly the real `relationshipRef` this session obtained from `openRelationship` — never a
     * fabricated Plug identifier (task test K). On failure (404 not-found, 409 conflict/immutability), the
     * held `existingAttribution` is left completely untouched — a failed attribution never updates local
     * UI as if it had succeeded (task test L/M). A successful attribution also re-reads the real
     * referral-status projection: it just became causally possible for that state to move off
     * `NO_INTRODUCTION`, and the browser walkthrough found the previously-loaded (necessarily stale, since
     * it was read before any introduction existed) value would otherwise sit on screen unrefreshed.
     */
    async attributeToAgreement(agreementId: string, relationshipRef: string) {
      if (state.attributionBusy) return;
      update({ attributionBusy: true, attributionError: null });
      try {
        const dto = await gateway.attribution.attributePlug(agreementId, relationshipRef);
        update({ existingAttribution: { status: 'ready', data: agreementPlugAttributionView(dto) }, attributionBusy: false });
        await loadReferralStatus(agreementId);
      } catch (error) { update({ attributionBusy: false, attributionError: errorText(error) }); }
    },

    reset() { update({ ...initial }); },
  };
}
export type PlugController = ReturnType<typeof createPlugController>;
