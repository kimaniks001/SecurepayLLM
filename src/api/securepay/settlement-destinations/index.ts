import { segment, type HttpClient } from '../http';
import type { SettlementDestinationResponse, SettlementVerificationStatusResponse } from './dto';

/**
 * Real backend authority (services/securepay-core ChoiceKsAccountLifecycleController) --
 * registration/replacement genuinely require backend-computed values (regulated account mapping,
 * destination fingerprint/token) this client never fabricates. This gateway only ever reads;
 * closing the register/replace UI gap is deferred and disclosed, not faked.
 */
export function createSettlementDestinationGateway(http: HttpClient) {
  return {
    current: (canonicalKsNumber: string) =>
      http.request<SettlementDestinationResponse>(`/api/v1/choice-ks-accounts/settlement-destinations/${segment(canonicalKsNumber)}/current`, { auth: 'required' }),
    history: (canonicalKsNumber: string) =>
      http.request<SettlementDestinationResponse[]>(`/api/v1/choice-ks-accounts/settlement-destinations/${segment(canonicalKsNumber)}/history`, { auth: 'required' }),
    verificationStatus: (destinationId: string) =>
      http.request<SettlementVerificationStatusResponse>(`/api/v1/choice-ks-accounts/settlement-destinations/${segment(destinationId)}/verification-status`, { auth: 'required' }),
  };
}

export type SettlementDestinationGateway = ReturnType<typeof createSettlementDestinationGateway>;
export type { SettlementDestinationResponse, SettlementVerificationStatusResponse } from './dto';
