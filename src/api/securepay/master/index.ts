import { segment, type HttpClient } from '../http';
import type {
  CreateMasterRequestRequest, DesignateMasterRequest, MasterOpinionResponse, MasterProfileResponse,
  MasterRequestResponse, ProposeMasterRequestCostRequest, SubmitMasterOpinionRequest,
} from './dto';

/**
 * Verified against SecurePayAPI feat/securepay-phase11-referrals-plugs-masters @ 978437f3
 * (MasterController.java — `@RequestMapping("/api/v1/master")`). The entire package is new to this phase,
 * not on `main` (docs/PRODUCTION_MIGRATION_LEDGER.md section 18).
 *
 * `GET /{identityId}/profile` and `GET /requests/{requestId}` are genuinely public — the controller makes
 * no `actorProvider` call in either method. Every mutation (`designateSelf`, `createRequest`,
 * `proposeCost`, `accept`, `decline`, `submitOpinion`) requires auth and derives the acting identity from
 * the authenticated session only, never a client-supplied identity.
 *
 * `MasterAuthorityException` (wrong owner, invalid state transition, duplicate self-designation, optimistic-
 * lock conflict) has NO `@ExceptionHandler` anywhere in `ApiExceptionHandler` at this SHA — every one of
 * those becomes an unhandled 500 with no structured `ApiErrorResponse` body. This gateway cannot distinguish
 * "wrong owner" from "wrong state" from "conflict" for any Master mutation; callers must treat any non-2xx
 * from a mutation as one generic closed failure (see features/master/controller.ts `errorText`).
 */
export function createMasterGateway(http: HttpClient) {
  const request = (requestId: string) => `/api/v1/master/requests/${segment(requestId)}`;
  return {
    designateSelf: (body: DesignateMasterRequest) => http.request<MasterProfileResponse>('/api/v1/master/me/designate', { method: 'POST', body, auth: 'required' }),
    profile: (identityId: string) => http.request<MasterProfileResponse>(`/api/v1/master/${segment(identityId)}/profile`, { auth: 'none' }),
    createRequest: (body: CreateMasterRequestRequest) => http.request<MasterRequestResponse>('/api/v1/master/requests', { method: 'POST', body, auth: 'required' }),
    request: (requestId: string) => http.request<MasterRequestResponse>(request(requestId), { auth: 'none' }),
    proposeCost: (requestId: string, body: ProposeMasterRequestCostRequest) => http.request<MasterRequestResponse>(`${request(requestId)}/propose-cost`, { method: 'POST', body, auth: 'required' }),
    accept: (requestId: string) => http.request<MasterRequestResponse>(`${request(requestId)}/accept`, { method: 'POST', auth: 'required' }),
    decline: (requestId: string) => http.request<MasterRequestResponse>(`${request(requestId)}/decline`, { method: 'POST', auth: 'required' }),
    submitOpinion: (requestId: string, body: SubmitMasterOpinionRequest) => http.request<MasterOpinionResponse>(`${request(requestId)}/opinion`, { method: 'POST', body, auth: 'required' }),
  };
}
export type MasterGateway = ReturnType<typeof createMasterGateway>;
