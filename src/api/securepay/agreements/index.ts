import { segment, type HttpClient } from '../http';
import type { AgreementConfirmationResponse, AgreementDetailResponse, AgreementVersionResponse, AgreementVersionSummaryResponse, CurrentUserActionResponse, CurrentUserAgreementSummaryResponse, JoinAgreementResponse, PublicInvitationViewResponse } from './dto';
export interface Page<T> { items: T[]; page: number; size: number; totalElements: number }
export interface HubDto {
  needsMe: CurrentUserAgreementSummaryResponse[]; waitingOnOthers: CurrentUserAgreementSummaryResponse[];
  takingShape: CurrentUserAgreementSummaryResponse[]; active: CurrentUserAgreementSummaryResponse[];
  changedReviewRequired: CurrentUserAgreementSummaryResponse[]; completed: CurrentUserAgreementSummaryResponse[];
  cancelled: CurrentUserAgreementSummaryResponse[]; expired: CurrentUserAgreementSummaryResponse[];
}
export interface ConfirmVersionRequest { idempotencyKey: string; expectedVersionNumber: number; expectedContentHash: string }
export function createAgreementGateway(http: HttpClient) {
  const agreement = (id: string) => `/api/v1/agreements/${segment(id)}`;
  const pagination = (page: number, size: number) => {
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1) throw new Error('Invalid pagination');
    return `?page=${page}&size=${size}`;
  };
  return {
    currentUserAgreements: (page = 0, size = 20) => http.request<Page<CurrentUserAgreementSummaryResponse>>(`/api/v1/me/agreements${pagination(page, size)}`, { auth: 'required' }),
    currentUserActions: (page = 0, size = 20) => http.request<Page<CurrentUserActionResponse>>(`/api/v1/me/actions${pagination(page, size)}`, { auth: 'required' }),
    hub: () => http.request<HubDto>('/api/v1/me/agreements/hub', { auth: 'required' }),
    detail: (id: string) => http.request<AgreementDetailResponse>(`${agreement(id)}/detail`, { auth: 'required' }),
    issueInvitation: (id: string, body: { idempotencyKey: string; roleCode: string; intendedIdentityId?: string; intendedKsNumber?: string }) => http.request<{ invitationId: string; status: string; invitationToken: string; replayed: boolean }>(`${agreement(id)}/invitations`, { method: 'POST', body, auth: 'required' }),
    invitation: (token: string) => http.request<PublicInvitationViewResponse>(`/api/v1/agreement-invitations/${segment(token)}`, { auth: 'none' }),
    join: (token: string, idempotencyKey: string) => http.request<JoinAgreementResponse>(`/api/v1/agreement-invitations/${segment(token)}/join`, { method: 'POST', body: { idempotencyKey }, auth: 'required' }),
    versions: (id: string) => http.request<AgreementVersionSummaryResponse[]>(`${agreement(id)}/versions`, { auth: 'required' }),
    version: (id: string, versionId: string) => http.request<AgreementVersionResponse>(`${agreement(id)}/versions/${segment(versionId)}`, { auth: 'required' }),
    confirmVersion: (id: string, versionId: string, body: ConfirmVersionRequest) => http.request<AgreementConfirmationResponse>(`${agreement(id)}/versions/${segment(versionId)}/confirm`, { method: 'POST', body, auth: 'required' }),
  };
}
export type AgreementGateway = ReturnType<typeof createAgreementGateway>;
