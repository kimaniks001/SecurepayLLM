import type { HttpClient } from '../http';
import type { RegulatedPartnerResponse } from './dto';

/** Factual discovery only -- read authority, never Agreement or Money authority (mirrors backend Phase 12 isolation doctrine applied to regulated partners). */
export function createFinancialPartnerGateway(http: HttpClient) {
  return {
    list: () => http.request<RegulatedPartnerResponse[]>('/api/v1/regulated-accounts/partners', { auth: 'required' }),
  };
}

export type FinancialPartnerGateway = ReturnType<typeof createFinancialPartnerGateway>;
export type { RegulatedPartnerResponse, PartnerCapabilityResponse } from './dto';
