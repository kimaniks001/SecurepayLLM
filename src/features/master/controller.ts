import { ApiError, type RemoteState } from '../../api/securepay/http';
import { masterOpinionView, masterProfileView, masterRequestView, type MasterOpinionView, type MasterProfileView, type MasterRequestView } from '../../api/securepay/master/adapters';
import type { CreateMasterRequestRequest, MasterRequestSourceContext, SubmitMasterOpinionRequest } from '../../api/securepay/master/dto';
import type { MasterGateway } from '../../api/securepay/master';

/**
 * `MasterAuthorityException` (wrong owner, invalid state transition, duplicate self-designation,
 * optimistic-lock conflict) has NO exception-handler mapping anywhere in the verified backend at this SHA
 * — every one of those is an unhandled 500 with no structured error body. This controller therefore cannot
 * distinguish "not found" from "wrong owner" from "wrong state" from "conflict" for ANY Master mutation; it
 * must treat every non-2xx from a mutation as one generic closed failure (task doctrine + verified backend
 * gap, docs/PRODUCTION_MIGRATION_LEDGER.md section 18). Reads (`profile`, `request`) still distinguish a
 * real 404 ("not found") since that IS handled.
 */
export function errorText(error: unknown, isMutation: boolean): string {
  if (error instanceof ApiError) {
    if (!isMutation && error.status === 404) return 'not-found';
    if (error.kind === 'network' || error.kind === 'timeout') return 'SecurePay is unavailable. Please try again.';
    if (isMutation) return 'This action could not be completed. It may not be allowed for your role or this request’s current state.';
    if (error.status === 401 || error.status === 403) return 'SecurePay could not allow this request.';
    return error.message;
  }
  return 'SecurePay could not complete this step. Please try again.';
}
function asApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError('network', 'SecurePay is unavailable');
}

export interface DraftMasterRequest {
  masterIdentityId: string;
  sourceContext: MasterRequestSourceContext;
  agreementId: string;
  question: string;
  scope: string;
  evidenceRefs: string;
  siteVisitRequired: boolean;
}
export const emptyDraftRequest: DraftMasterRequest = {
  masterIdentityId: '', sourceContext: 'GENERAL_ADVICE', agreementId: '', question: '', scope: '', evidenceRefs: '', siteVisitRequired: false,
};

export interface MasterState {
  profile: RemoteState<MasterProfileView>;
  draft: DraftMasterRequest;
  request: RemoteState<MasterRequestView>;
  requestActionBusy: boolean;
  requestActionError: string | null;
  opinion: RemoteState<MasterOpinionView>;
  opinionDraft: { reviewedEvidenceRefs: string; siteVisitDetails: string; observations: string; opinionText: string; limitations: string };
}
const initial: MasterState = {
  profile: { status: 'idle' }, draft: { ...emptyDraftRequest }, request: { status: 'idle' },
  requestActionBusy: false, requestActionError: null, opinion: { status: 'idle' },
  opinionDraft: { reviewedEvidenceRefs: '', siteVisitDetails: '', observations: '', opinionText: '', limitations: '' },
};

/**
 * Owns only Master profile lookup + the non-dispute request/opinion lifecycle (task section 21: never the
 * separate DisputeMasterEscalation domain). Every mutation is an explicit call — no request/opinion is ever
 * created from merely opening a profile (task section 9/13).
 */
export function createMasterController(gateway: Pick<MasterGateway, 'profile' | 'createRequest' | 'request' | 'proposeCost' | 'accept' | 'decline' | 'submitOpinion'>) {
  let state: MasterState = { ...initial, draft: { ...emptyDraftRequest }, opinionDraft: { ...initial.opinionDraft } };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<MasterState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  let profileSequence = 0;

  return {
    getSnapshot: (): MasterState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    async lookupProfile(identityId: string) {
      if (!identityId.trim()) return;
      const sequence = ++profileSequence;
      update({ profile: { status: 'loading' } });
      try {
        const view = masterProfileView(await gateway.profile(identityId.trim()));
        if (sequence === profileSequence) update({ profile: { status: 'ready', data: view } });
      } catch (error) {
        if (sequence === profileSequence) update({ profile: { status: 'error', error: asApiError(error) } });
      }
    },
    resetProfile() { update({ profile: { status: 'idle' } }); },

    setDraft(patch: Partial<DraftMasterRequest>) { update({ draft: { ...state.draft, ...patch } }); },
    async submitRequest(): Promise<boolean> {
      if (!state.draft.masterIdentityId.trim() || !state.draft.question.trim() || !state.draft.scope.trim()) return false;
      update({ request: { status: 'loading' } });
      const body: CreateMasterRequestRequest = {
        masterIdentityId: state.draft.masterIdentityId.trim(), sourceContext: state.draft.sourceContext,
        agreementId: state.draft.agreementId.trim() || undefined,
        question: state.draft.question.trim(), scope: state.draft.scope.trim(),
        evidenceRefs: state.draft.evidenceRefs.split('\n').map(line => line.trim()).filter(Boolean),
        siteVisitRequired: state.draft.siteVisitRequired,
      };
      try {
        update({ request: { status: 'ready', data: masterRequestView(await gateway.createRequest(body)) } });
        return true;
      } catch (error) {
        update({ request: { status: 'error', error: asApiError(error) } });
        return false;
      }
    },

    async loadRequest(requestId: string): Promise<boolean> {
      if (!requestId.trim()) return false;
      update({ request: { status: 'loading' }, requestActionError: null });
      try {
        update({ request: { status: 'ready', data: masterRequestView(await gateway.request(requestId.trim())) } });
        return true;
      } catch (error) {
        update({ request: { status: 'error', error: asApiError(error) } });
        return false;
      }
    },

    async proposeCost(requestId: string, currency: string, quotedCostMinor: number) {
      if (state.requestActionBusy) return;
      update({ requestActionBusy: true, requestActionError: null });
      try {
        update({ request: { status: 'ready', data: masterRequestView(await gateway.proposeCost(requestId, { currency, quotedCostMinor })) }, requestActionBusy: false });
      } catch (error) { update({ requestActionBusy: false, requestActionError: errorText(error, true) }); }
    },
    async acceptCost(requestId: string) {
      if (state.requestActionBusy) return;
      update({ requestActionBusy: true, requestActionError: null });
      try {
        update({ request: { status: 'ready', data: masterRequestView(await gateway.accept(requestId)) }, requestActionBusy: false });
      } catch (error) { update({ requestActionBusy: false, requestActionError: errorText(error, true) }); }
    },
    async declineRequest(requestId: string) {
      if (state.requestActionBusy) return;
      update({ requestActionBusy: true, requestActionError: null });
      try {
        update({ request: { status: 'ready', data: masterRequestView(await gateway.decline(requestId)) }, requestActionBusy: false });
      } catch (error) { update({ requestActionBusy: false, requestActionError: errorText(error, true) }); }
    },

    setOpinionDraft(patch: Partial<MasterState['opinionDraft']>) { update({ opinionDraft: { ...state.opinionDraft, ...patch } }); },
    async submitOpinion(requestId: string): Promise<boolean> {
      if (!state.opinionDraft.opinionText.trim() || state.requestActionBusy) return false;
      update({ requestActionBusy: true, requestActionError: null });
      const body: SubmitMasterOpinionRequest = {
        reviewedEvidenceRefs: state.opinionDraft.reviewedEvidenceRefs.split('\n').map(line => line.trim()).filter(Boolean),
        siteVisitDetails: state.opinionDraft.siteVisitDetails.trim() || undefined,
        observations: state.opinionDraft.observations.trim() || undefined,
        opinionText: state.opinionDraft.opinionText.trim(),
        limitations: state.opinionDraft.limitations.trim() || undefined,
      };
      try {
        const dto = await gateway.submitOpinion(requestId, body);
        update({ opinion: { status: 'ready', data: masterOpinionView(dto) }, request: { status: 'loading' } });
        try {
          const authoritativeRequest = await gateway.request(requestId);
          update({ request: { status: 'ready', data: masterRequestView(authoritativeRequest) }, requestActionBusy: false });
          return true;
        } catch (error) {
          update({ request: { status: 'error', error: asApiError(error) }, requestActionBusy: false, requestActionError: 'Opinion submitted, but SecurePay could not refresh the authoritative request state. Please reload this request.' });
          return false;
        }
      } catch (error) {
        update({ requestActionBusy: false, requestActionError: errorText(error, true) });
        return false;
      }
    },

    reset() { update({ ...initial, draft: { ...emptyDraftRequest }, opinionDraft: { ...initial.opinionDraft } }); },
    resetSession() {
      update({ draft: { ...emptyDraftRequest }, request: { status: 'idle' }, requestActionBusy: false, requestActionError: null, opinion: { status: 'idle' }, opinionDraft: { ...initial.opinionDraft } });
    },
  };
}
export type MasterController = ReturnType<typeof createMasterController>;
