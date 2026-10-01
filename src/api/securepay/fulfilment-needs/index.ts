import { segment, type HttpClient } from '../http';

export type FulfilmentNeedType =
  | 'PRODUCT' | 'TRANSPORT' | 'ACCOMMODATION' | 'LABOUR' | 'COURIER'
  | 'STORAGE' | 'EQUIPMENT' | 'SERVICE' | 'OTHER';

export type FulfilmentNeedPrivacyLevel = 'PRIVATE' | 'MATCHABLE';
export type FulfilmentNeedStatus = 'OPEN' | 'PAUSED' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';

export interface DeriveFulfilmentNeedRequest {
  type: FulfilmentNeedType;
  poolable: boolean;
  privacyLevel: FulfilmentNeedPrivacyLevel;
}

export interface FulfilmentNeedDto {
  id: string;
  sourceType: 'VISION' | 'AGREEMENT';
  sourceVisionId: string | null;
  sourceAgreementId: string | null;
  sourceObligationId: string | null;
  type: FulfilmentNeedType;
  description: string;
  quantity: number | null;
  unit: string | null;
  origin: string | null;
  destination: string | null;
  requiredFrom: string | null;
  requiredBy: string | null;
  capacityRequirements: string | null;
  poolable: boolean;
  privacyLevel: FulfilmentNeedPrivacyLevel;
  budgetContext: string | null;
  status: FulfilmentNeedStatus;
  createdAt: string;
  version: number;
}

/**
 * Store Completion V1 Phase 3.
 *
 * A FulfilmentNeed is structured demand derived from an authorised Vision/Agreement source.
 * These methods do not create an Agreement, reserve stock, select a provider or move money.
 */
export function createFulfilmentNeedsGateway(http: HttpClient) {
  return {
    fromVision: (visionItemId: string, body: DeriveFulfilmentNeedRequest) =>
      http.request<FulfilmentNeedDto>(`/api/v1/fulfilment-needs/from-vision/${segment(visionItemId)}`, {
        method: 'POST', body, auth: 'required',
      }),
    fromAgreementObligation: (
      agreementId: string,
      obligationId: string,
      body: DeriveFulfilmentNeedRequest,
    ) => http.request<FulfilmentNeedDto>(
      `/api/v1/fulfilment-needs/from-agreement/${segment(agreementId)}/obligations/${segment(obligationId)}`,
      { method: 'POST', body, auth: 'required' },
    ),
    get: (needId: string) =>
      http.request<FulfilmentNeedDto>(`/api/v1/fulfilment-needs/${segment(needId)}`, { auth: 'required' }),
  };
}

export type FulfilmentNeedsGateway = ReturnType<typeof createFulfilmentNeedsGateway>;
