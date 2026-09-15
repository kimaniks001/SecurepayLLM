import type { AgreementMoneyHandoffResponse, AgreementMoneyStatusResponse, CurrentUserActionResponse } from '../agreements/dto';
import { ApiError, type RemoteState } from '../http';
export type Readiness = 'NO_EVALUATION_YET' | 'READY' | 'NOT_READY' | 'PARTIALLY_READY' | 'BLOCKED' | 'UNKNOWN';
export function readiness(value: string): Readiness {
  switch (value) {
    case 'NO_EVALUATION_YET': case 'READY': case 'NOT_READY': case 'PARTIALLY_READY': case 'BLOCKED': return value;
    default: return 'UNKNOWN';
  }
}
export function moneyStatusView(dto: AgreementMoneyStatusResponse) {
  return { agreementId: dto.agreementId, readiness: readiness(dto.paymentReadyStatus),
    outstandingReasons: dto.outstandingReasons, evaluatedAt: dto.evaluatedAt, evaluationId: dto.evaluationId };
}
export function moneyHandoffView(dto: AgreementMoneyHandoffResponse) {
  return { readiness: readiness(dto.status), outstandingReasons: dto.outstandingReasons, recordCount: dto.moneyRecordCount };
}
/** Only this exact backend error means no evaluation. A generic 404/outage is unknown. */
export function moneyFailureView(error: ApiError) {
  return { readiness: error.status === 404 && error.code === 'PAYMENT_READY_EVALUATION_NOT_FOUND' ? 'NO_EVALUATION_YET' as const : 'UNKNOWN' as const, error };
}
/** Absence on a paginated actions page is not proof that no action exists; callers retain pagination/state. */
export function moneyNextActionView(agreementId: string, actions: RemoteState<CurrentUserActionResponse[]>) {
  if (actions.status !== 'ready') return { status: actions.status, action: null };
  return { status: 'ready' as const, action: actions.data.find(action => action.agreementId === agreementId && action.actionCode === 'FUND_AGREEMENT') ?? null };
}
