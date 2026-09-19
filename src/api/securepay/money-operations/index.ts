import type { HttpClient } from '../http';
import type { MoneyOperationsSummaryResponse } from './dto';

/** Final Completion Phase 2 completion pass, Section 6 -- read-only Money-operations summary for support/ops roles. */
export function createMoneyOperationsGateway(http: HttpClient) {
  return {
    summary: () => http.request<MoneyOperationsSummaryResponse>('/api/v1/money-operations/summary', { auth: 'required' }),
  };
}

export type MoneyOperationsGateway = ReturnType<typeof createMoneyOperationsGateway>;
export type {
  MoneyOperationsSummaryResponse,
  OpenExceptionResponse,
  PartnerStatusResponse,
  PendingReconciliationResponse,
  PendingRecoveryResponse,
} from './dto';
