import { segment, type HttpClient } from '../http';
import type { CreateMoneySessionRequest, CreateMoneySessionResponse, MoneySessionViewResponse } from './dto';

function freshIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `idem-${Date.now()}-${Math.random()}`;
}

/**
 * Final Completion Phase 2, Section 9 — Hosted SecurePay Money. `create` requires the same
 * authenticated payer session as ordinary Agreement Money operations (it derives payer authority
 * the same way `AgreementFundedAuthorityOrchestrationService` does). `resolve`/`redeem` operate on
 * the opaque token alone -- the hosted page never needs to know the agreementId/obligationId/
 * amount itself, since the session already bounds them server-side.
 */
export function createMoneySessionGateway(http: HttpClient) {
  return {
    create: (request: CreateMoneySessionRequest) =>
      http.request<CreateMoneySessionResponse>('/api/v1/money-sessions', { method: 'POST', auth: 'required', body: request }),
    resolve: (token: string) =>
      http.request<MoneySessionViewResponse>(`/api/v1/money-sessions/${segment(token)}`, { auth: 'required' }),
    redeem: (token: string) =>
      http.request<unknown>(`/api/v1/money-sessions/${segment(token)}/redeem`, {
        method: 'POST', auth: 'required', headers: { 'Idempotency-Key': freshIdempotencyKey() },
      }),
    // Revocation (DELETE) is not wired this pass -- the shared HttpClient type only supports
    // GET/POST/PUT, and adding DELETE app-wide was judged out of this pass's scope.
  };
}

export type MoneySessionGateway = ReturnType<typeof createMoneySessionGateway>;
export type { CreateMoneySessionRequest, CreateMoneySessionResponse, MoneySessionPurpose, MoneySessionViewResponse } from './dto';
