import { segment, type HttpClient } from '../http';
import type { FundedAuthorityExerciseResponse, FundedAuthorityPositionResponse, FundedAuthorityReleaseResponse } from './dto';

function freshIdempotencyKey(): string {
  // A request-safety key only (so a retried click can never double-post) -- never a financial
  // reference or receipt number; the backend alone decides the real journalId/exerciseEventId.
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `idem-${Date.now()}-${Math.random()}`;
}

export function createMoneyAuthorityGateway(http: HttpClient) {
  return {
    open: (authorityId: string, currency: string, maxAmountMinor: number, agreementId?: string) =>
      http.request<FundedAuthorityPositionResponse>('/api/v1/money/authorities', {
        method: 'POST', auth: 'required', body: { authorityId, currency, maxAmountMinor, agreementId: agreementId ?? null },
      }),
    status: (authorityId: string) =>
      http.request<FundedAuthorityPositionResponse>(`/api/v1/money/authorities/${segment(authorityId)}`, { auth: 'required' }),
    fund: (authorityId: string, amountMinor: number) =>
      http.request<FundedAuthorityPositionResponse>(`/api/v1/money/authorities/${segment(authorityId)}/fund`, {
        method: 'POST', auth: 'required', body: { amountMinor }, headers: { 'Idempotency-Key': freshIdempotencyKey() },
      }),
    exercise: (authorityId: string, beneficiaryKsNumber: string, amountMinor: number) =>
      http.request<FundedAuthorityExerciseResponse>(`/api/v1/money/authorities/${segment(authorityId)}/exercise`, {
        method: 'POST', auth: 'required', body: { beneficiaryKsNumber, amountMinor }, headers: { 'Idempotency-Key': freshIdempotencyKey() },
      }),
    release: (authorityId: string) =>
      http.request<FundedAuthorityReleaseResponse>(`/api/v1/money/authorities/${segment(authorityId)}/release`, {
        method: 'POST', auth: 'required', headers: { 'Idempotency-Key': freshIdempotencyKey() },
      }),
  };
}

export type MoneyAuthorityGateway = ReturnType<typeof createMoneyAuthorityGateway>;
export type { FundedAuthorityExerciseResponse, FundedAuthorityPositionResponse, FundedAuthorityReleaseResponse } from './dto';
