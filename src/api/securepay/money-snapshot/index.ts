import { segment, type HttpClient } from '../http';
import type { AgreementMoneySnapshotResponse } from './dto';

/**
 * Vision Money Gap V1 — one strictly read-only Agreement Money truth call.
 * Fee quotation remains the existing explicit funding-quote action; this GET never creates quote
 * evidence and accepts no rail, amount, currency, beneficiary or destination authority.
 */
export function createMoneySnapshotGateway(http: HttpClient) {
  return {
    read: (agreementId: string) =>
      http.request<AgreementMoneySnapshotResponse>(
        `/api/v1/agreements/${segment(agreementId)}/money-snapshot`,
        { auth: 'required' },
      ),
  };
}

export type MoneySnapshotGateway = ReturnType<typeof createMoneySnapshotGateway>;
export type { AgreementMoneySnapshotPaymentReady, AgreementMoneySnapshotResponse } from './dto';
