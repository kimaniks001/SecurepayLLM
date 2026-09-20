import { segment, type HttpClient } from '../http';
import type { CreateFxApplicationRequest, FxApplicationResponse } from '../fx-application/dto';

/**
 * Currency/FX convergence -- Business FX authority. An authorized Business actor may request FX
 * for the Business's own regulated currency positions; Business membership alone does not grant
 * this (enforced server-side by the same REGULATED_ACCOUNT_MANAGE organization-scoped check used
 * for Business currency activation). Never lets the client compute a rate/settlement outcome.
 */
export function createBusinessFxApplicationGateway(http: HttpClient) {
  const base = (businessKsNumber: string) => `/api/v1/business/${segment(businessKsNumber)}/fx-applications`;
  return {
    create: (businessKsNumber: string, request: Omit<CreateFxApplicationRequest, 'idempotencyKey'>, idempotencyKey: string) =>
      http.request<FxApplicationResponse>(base(businessKsNumber), {
        method: 'POST', auth: 'required', body: { ...request, idempotencyKey: idempotencyKey },
      }),
    get: (businessKsNumber: string, applicationId: string) =>
      http.request<FxApplicationResponse>(`${base(businessKsNumber)}/${segment(applicationId)}`, { auth: 'required' }),
    list: (businessKsNumber: string) => http.request<FxApplicationResponse[]>(base(businessKsNumber), { auth: 'required' }),
  };
}

export type BusinessFxApplicationGateway = ReturnType<typeof createBusinessFxApplicationGateway>;
export type { CreateFxApplicationRequest, FxApplicationResponse, FxApplicationStatus, FxOperation } from '../fx-application/dto';
