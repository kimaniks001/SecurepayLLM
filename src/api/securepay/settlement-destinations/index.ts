import { segment, type HttpClient } from '../http';
import type {
  RegisterMySettlementDestinationRequest,
  SettlementDestinationResponse,
  SettlementVerificationStatusResponse,
} from './dto';

function freshIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `idem-${Date.now()}-${Math.random()}`;
}

/**
 * Final Completion Phase 2, Section 7 — the customer-facing self-service surface
 * (MySettlementDestinationController). The authenticated identity's own KSNumber, regulated
 * account mapping, and every internal fingerprint/token are always server-derived; the browser
 * only ever supplies real facts about the external account the customer wants paid into. No
 * canonicalKsNumber is ever passed by this client -- the backend resolves it from the session.
 */
export function createSettlementDestinationGateway(http: HttpClient) {
  return {
    current: (currency = 'KES') =>
      http.request<SettlementDestinationResponse>(`/api/v1/me/settlement-destinations/current?currency=${segment(currency)}`, { auth: 'required' }),
    history: (currency = 'KES') =>
      http.request<SettlementDestinationResponse[]>(`/api/v1/me/settlement-destinations/history?currency=${segment(currency)}`, { auth: 'required' }),
    verificationStatus: (destinationId: string) =>
      http.request<SettlementVerificationStatusResponse>(`/api/v1/me/settlement-destinations/${segment(destinationId)}/verification-status`, { auth: 'required' }),
    register: (request: RegisterMySettlementDestinationRequest) =>
      http.request<SettlementDestinationResponse>('/api/v1/me/settlement-destinations', {
        method: 'POST', auth: 'required', body: request, headers: { 'Idempotency-Key': freshIdempotencyKey() },
      }),
    replace: (request: RegisterMySettlementDestinationRequest) =>
      http.request<unknown>('/api/v1/me/settlement-destinations/replace', {
        method: 'POST',
        auth: 'required',
        body: request,
        headers: { 'Idempotency-Key': freshIdempotencyKey(), 'Verification-Idempotency-Key': freshIdempotencyKey() },
      }),
  };
}

export type SettlementDestinationGateway = ReturnType<typeof createSettlementDestinationGateway>;
export type {
  ExternalDestinationAccountKind,
  RegisterMySettlementDestinationRequest,
  SettlementDestinationResponse,
  SettlementVerificationStatusResponse,
} from './dto';
