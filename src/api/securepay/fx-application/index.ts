import { segment, type HttpClient } from '../http';
import type { CreateFxApplicationRequest, FxApplicationResponse, FxCapabilityResponse } from './dto';

/**
 * Currency/FX convergence -- provider-neutral customer-facing FX application surface. Never lets
 * the client compute or assert a rate/settlement outcome itself; every state comes straight from
 * the backend's own real, application-based Choice-backed flow.
 */
export function createFxApplicationGateway(http: HttpClient) {
  return {
    create: (request: Omit<CreateFxApplicationRequest, 'idempotencyKey'>, idempotencyKey: string) =>
      http.request<FxApplicationResponse>('/api/v1/fx-applications', {
        method: 'POST', auth: 'required', body: { ...request, idempotencyKey: idempotencyKey },
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
