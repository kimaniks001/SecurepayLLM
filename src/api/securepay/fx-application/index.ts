import { segment, type HttpClient } from '../http';
import type { CreateFxApplicationRequest, FxApplicationResponse, FxCapabilityResponse } from './dto';

function freshIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `idem-${Date.now()}-${Math.random()}`;
}

/**
 * Currency/FX convergence -- provider-neutral customer-facing FX application surface. Never lets
 * the client compute or assert a rate/settlement outcome itself; every state comes straight from
 * the backend's own real, application-based Choice-backed flow.
 */
export function createFxApplicationGateway(http: HttpClient) {
  return {
    create: (request: Omit<CreateFxApplicationRequest, 'idempotencyKey'>) =>
      http.request<FxApplicationResponse>('/api/v1/fx-applications', {
        method: 'POST', auth: 'required', body: { ...request, idempotencyKey: freshIdempotencyKey() },
      }),
    get: (applicationId: string) =>
      http.request<FxApplicationResponse>(`/api/v1/fx-applications/${segment(applicationId)}`, { auth: 'required' }),
    list: () => http.request<FxApplicationResponse[]>('/api/v1/fx-applications', { auth: 'required' }),
    capability: () => http.request<FxCapabilityResponse>('/api/v1/fx/capability', { auth: 'required' }),
  };
}

export type FxApplicationGateway = ReturnType<typeof createFxApplicationGateway>;
export type {
  CreateFxApplicationRequest,
  FxApplicationResponse,
  FxApplicationStatus,
  FxCapabilityResponse,
  FxOperation,
} from './dto';
