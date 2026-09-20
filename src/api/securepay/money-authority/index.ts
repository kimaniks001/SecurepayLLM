import { segment, type HttpClient } from '../http';
import type {
  AgreementFundedAuthorityExerciseResponse,
  AgreementFundedAuthorityListResponse,
  AgreementFundedAuthorityReleaseResponse,
  AgreementFundedAuthorityStatusResponse,
  AgreementMoneyTransactionResponse,
} from './dto';

/**
 * Final Completion Phase 2 completion pass — Section 1: an Agreement is not permanently one
 * "Agreement Money" position. `list` enumerates every MONETARY obligation's own independent
 * position; every other operation is scoped to one obligationId. The backend derives the
 * authorised maximum, currency and beneficiary from that obligation's own persisted definition,
 * and requires the caller be that obligation's own authorised payer (open/fund/release) or a
 * bounded delegate (exercise) before doing anything (see AgreementFundedAuthorityOrchestrationService).
 */
/**
 * NOTE: in production the fund / exercise / release / open commands are NOT wired to any control (see docs/UI_COMPLETION_PHASE8_MONEY.md): the backend
 * gates them by an environment guard no read exposes and does not make them atomic against a concurrent version change. Idempotency keys are
 * caller-supplied so no code path can mint a fresh key for a retry. An idempotency key is a request-safety key only -- never a financial
 * reference or receipt number.
 */
export function createMoneyAuthorityGateway(http: HttpClient) {
  const base = (agreementId: string, obligationId: string) =>
    `/api/v1/agreements/${segment(agreementId)}/funded-authority/${segment(obligationId)}`;
  return {
    list: (agreementId: string) =>
      http.request<AgreementFundedAuthorityListResponse>(`/api/v1/agreements/${segment(agreementId)}/funded-authority`, { auth: 'required' }),
    status: (agreementId: string, obligationId: string) =>
      http.request<AgreementFundedAuthorityStatusResponse>(base(agreementId, obligationId), { auth: 'required' }),
    open: (agreementId: string, obligationId: string) =>
      http.request<AgreementFundedAuthorityStatusResponse>(base(agreementId, obligationId), { method: 'POST', auth: 'required' }),
    fund: (agreementId: string, obligationId: string, amountMinor: number, idempotencyKey: string) =>
      http.request<AgreementFundedAuthorityStatusResponse>(`${base(agreementId, obligationId)}/fund`, {
        method: 'POST', auth: 'required', body: { amountMinor }, headers: { 'Idempotency-Key': idempotencyKey },
      }),
    exercise: (agreementId: string, obligationId: string, amountMinor: number, idempotencyKey: string) =>
      http.request<AgreementFundedAuthorityExerciseResponse>(`${base(agreementId, obligationId)}/exercise`, {
        method: 'POST', auth: 'required', body: { amountMinor }, headers: { 'Idempotency-Key': idempotencyKey },
      }),
    release: (agreementId: string, obligationId: string, idempotencyKey: string) =>
      http.request<AgreementFundedAuthorityReleaseResponse>(`${base(agreementId, obligationId)}/release`, {
        method: 'POST', auth: 'required', headers: { 'Idempotency-Key': idempotencyKey },
      }),
    transactions: (agreementId: string, obligationId: string) =>
      http.request<AgreementMoneyTransactionResponse[]>(`${base(agreementId, obligationId)}/transactions`, { auth: 'required' }),
  };
}

export type MoneyAuthorityGateway = ReturnType<typeof createMoneyAuthorityGateway>;
export type {
  AgreementFundedAuthorityExerciseResponse,
  AgreementFundedAuthorityListResponse,
  AgreementFundedAuthorityReleaseResponse,
  AgreementFundedAuthorityStatusResponse,
  AgreementMoneyTransactionResponse,
} from './dto';
