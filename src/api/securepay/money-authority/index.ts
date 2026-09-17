import { segment, type HttpClient } from '../http';
import type {
  AgreementFundedAuthorityExerciseResponse,
  AgreementFundedAuthorityReleaseResponse,
  AgreementFundedAuthorityStatusResponse,
} from './dto';

function freshIdempotencyKey(): string {
  // A request-safety key only (so a retried click can never double-post) -- never a financial
  // reference or receipt number; the backend alone decides the real journalId/exerciseEventId.
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `idem-${Date.now()}-${Math.random()}`;
}

/**
 * Final Completion Phase 2 correction pass — every operation is Agreement-scoped. There is no
 * "load by arbitrary authority id": the backend derives the obligation, authorised maximum,
 * currency and beneficiary from the Agreement's own persisted MONETARY obligation, and requires
 * the caller be that obligation's own authorised payer before fund/exercise/release will do
 * anything (see AgreementFundedAuthorityOrchestrationService).
 */
export function createMoneyAuthorityGateway(http: HttpClient) {
  return {
    status: (agreementId: string) =>
      http.request<AgreementFundedAuthorityStatusResponse>(`/api/v1/agreements/${segment(agreementId)}/funded-authority`, { auth: 'required' }),
    open: (agreementId: string) =>
      http.request<AgreementFundedAuthorityStatusResponse>(`/api/v1/agreements/${segment(agreementId)}/funded-authority`, { method: 'POST', auth: 'required' }),
    fund: (agreementId: string, amountMinor: number) =>
      http.request<AgreementFundedAuthorityStatusResponse>(`/api/v1/agreements/${segment(agreementId)}/funded-authority/fund`, {
        method: 'POST', auth: 'required', body: { amountMinor }, headers: { 'Idempotency-Key': freshIdempotencyKey() },
      }),
    exercise: (agreementId: string, amountMinor: number) =>
      http.request<AgreementFundedAuthorityExerciseResponse>(`/api/v1/agreements/${segment(agreementId)}/funded-authority/exercise`, {
        method: 'POST', auth: 'required', body: { amountMinor }, headers: { 'Idempotency-Key': freshIdempotencyKey() },
      }),
    release: (agreementId: string) =>
      http.request<AgreementFundedAuthorityReleaseResponse>(`/api/v1/agreements/${segment(agreementId)}/funded-authority/release`, {
        method: 'POST', auth: 'required', headers: { 'Idempotency-Key': freshIdempotencyKey() },
      }),
  };
}

export type MoneyAuthorityGateway = ReturnType<typeof createMoneyAuthorityGateway>;
export type {
  AgreementFundedAuthorityExerciseResponse,
  AgreementFundedAuthorityReleaseResponse,
  AgreementFundedAuthorityStatusResponse,
} from './dto';
