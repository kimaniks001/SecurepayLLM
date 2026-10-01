import { segment, type HttpClient } from '../http';
import type { AgreementMoneySnapshotResponse } from './dto';

/**
 * Vision Money Gap V1 — one read-only Agreement Money truth call.
 * A rail code requests the backend's existing authoritative quote; no amount/currency/beneficiary
 * is accepted from the UI.
 */
export function createMoneySnapshotGateway(http: HttpClient) {
  return {
    read: (agreementId: string, railCode?: string) => {
      const query = railCode ? `?railCode=${encodeURIComponent(railCode)}` : '';
      return http.request<AgreementMoneySnapshotResponse>(
        `/api/v1/agreements/${segment(agreementId)}/money-snapshot${query}`,
        { auth: 'required' },
      );
    },
  };
}

export type MoneySnapshotGateway = ReturnType<typeof createMoneySnapshotGateway>;
export type { AgreementMoneySnapshotPaymentReady, AgreementMoneySnapshotResponse } from './dto';
