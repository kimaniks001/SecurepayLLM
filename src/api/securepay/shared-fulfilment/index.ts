import { segment, type HttpClient } from '../http';

export type SharedFulfilmentStatus =
  | 'DETECTED' | 'PROPOSED' | 'POOLING_WINDOW_OPEN' | 'MATCH_PARTIAL' | 'MATCH_READY'
  | 'PARTICIPANT_REVIEW' | 'APPROVED' | 'SUPPORTING_AGREEMENT_CREATED' | 'FULFILLING'
  | 'COMPLETED' | 'EXPIRED_NO_MATCH' | 'DECLINED' | 'CANCELLED';

export interface SharedFulfilmentPoolDto {
  id: string;
  anchorNeedId: string;
  status: SharedFulfilmentStatus;
  supportingAgreementId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface OpenPoolingWindowRequest {
  remainingCapacity?: number | null;
  capacityUnit?: string | null;
  compatibilityConstraints?: string | null;
  broadCorridor?: string | null;
  deadline: string;
  maxDelayHours?: number | null;
  minimumAdditionalAmount?: number | null;
  maximumAdditionalAmount?: number | null;
  estimatedSavingsBasis?: string | null;
}

export interface PoolingWindowDto {
  id: string;
  poolId: string;
  remainingCapacity: number | null;
  capacityUnit: string | null;
  compatibilityConstraints: string | null;
  broadCorridor: string | null;
  deadline: string;
  maxDelayHours: number | null;
  minimumAdditionalAmount: number | null;
  maximumAdditionalAmount: number | null;
  estimatedSavingsBasis: string | null;
  createdAt: string;
}

/**
 * Pooling is proposal-only here. No method approves participants, creates a supporting Agreement,
 * or moves money.
 */
export function createSharedFulfilmentGateway(http: HttpClient) {
  const pool = (poolId: string) => `/api/v1/shared-fulfilment/pools/${segment(poolId)}`;
  return {
    proposeFromNeed: (needId: string) =>
      http.request<SharedFulfilmentPoolDto>(`/api/v1/shared-fulfilment/from-need/${segment(needId)}`, {
        method: 'POST', auth: 'required',
      }),
    get: (poolId: string) => http.request<SharedFulfilmentPoolDto>(pool(poolId), { auth: 'required' }),
    openWindow: (poolId: string, body: OpenPoolingWindowRequest) =>
      http.request<PoolingWindowDto>(`${pool(poolId)}/window`, { method: 'POST', body, auth: 'required' }),
    window: (poolId: string) => http.request<PoolingWindowDto>(`${pool(poolId)}/window`, { auth: 'required' }),
  };
}
export type SharedFulfilmentGateway = ReturnType<typeof createSharedFulfilmentGateway>;
