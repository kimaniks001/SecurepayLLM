import { segment, type HttpClient } from '../http';
import type { AgreementCalendarEventResponse, AgreementConfirmationResponse, AgreementConfirmationStatusResponse, AgreementDetailResponse, AgreementKeyContractReferralResponse, AgreementPlugAttributionResponse, AgreementVersionResponse, AgreementsHomeResponse, CurrentUserActionResponse, CurrentUserAgreementSummaryResponse, JoinAgreementResponse, MilestoneEffectiveStateResponse, PersonalTagResponse, PublicInvitationViewResponse, SchedulingConflictResponse } from './dto';
export interface Page<T> { items: T[]; page: number; size: number; totalElements: number }
export interface HubDto {
  needsMe: CurrentUserAgreementSummaryResponse[]; waitingOnOthers: CurrentUserAgreementSummaryResponse[];
  takingShape: CurrentUserAgreementSummaryResponse[]; active: CurrentUserAgreementSummaryResponse[];
  changedReviewRequired: CurrentUserAgreementSummaryResponse[]; completed: CurrentUserAgreementSummaryResponse[];
  cancelled: CurrentUserAgreementSummaryResponse[]; expired: CurrentUserAgreementSummaryResponse[];
}
export interface AgreementInvitationDto { id: string; roleCode: string; status: string; issuedAt: string; expiresAt: string; revokedAt: string | null }
export interface AgreementParticipantDto { id: string; identityId: string; roleCode: string; participantStatus: string; addedAt: string }
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
    // Final Phase 3 correction (Section 9) -- the complete Agreements Home composition (needs
    // attention, in progress, waiting on others, problems, recently completed, upcoming, recent
    // activity, Money by currency). `hub()` above remains the source for AgreementHub's own
    // lifecycle-bucket search/filter list (taking shape/changed/cancelled/expired aren't part of
    // this shape); this is the richer, dashboard-facing read.
    home: () => http.request<AgreementsHomeResponse>('/api/v1/me/agreements/home', { auth: 'required' }),
    detail: (id: string) => http.request<AgreementDetailResponse>(`${agreement(id)}/detail`, { auth: 'required' }),
    // Real shape: List<AgreementConfirmationStatusResponse> — one entry per current participant, carrying
    // that participant's own confirmedVersionNumber/currentVersionNumber and confirmationCurrent/
    // reconfirmationRequired. Used only to render real "who confirmed the current version" and this
    // caller's own stale-review state — never to derive Agreement or Money authority.
    confirmationStatus: (id: string) => http.request<AgreementConfirmationStatusResponse[]>(`${agreement(id)}/confirmation-status`, { auth: 'required' }),
    issueInvitation: (id: string, body: { idempotencyKey: string; roleCode: string; intendedIdentityId?: string; intendedKsNumber?: string }) => http.request<{ invitationId: string; status: string; invitationToken: string; replayed: boolean }>(`${agreement(id)}/invitations`, { method: 'POST', body, auth: 'required' }),
    // Draft -> Proposed (creator only, idempotent if already PROPOSED). Invitations can only be issued from PROPOSED onward.
    propose: (id: string) => http.request<{ id: string; status: string }>(`${agreement(id)}/propose`, { method: 'POST', auth: 'required' }),
    // Real shape: List<AgreementInvitationResponse> -- id, roleCode, status (ISSUED|VIEWED|JOINED|REVOKED|EXPIRED), issuedAt, expiresAt, revokedAt. No target, no token.
    invitations: (id: string) => http.request<AgreementInvitationDto[]>(`${agreement(id)}/invitations`, { auth: 'required' }),
    revokeInvitation: (id: string, invitationId: string) => http.request<AgreementInvitationDto>(`${agreement(id)}/invitations/${segment(invitationId)}/revoke`, { method: 'POST', auth: 'required' }),
    // Every confirmation on the Agreement (all participants), each flagged confirmationCurrent against the CURRENT version.
    // (`confirmation-status` above returns ONLY the caller's own row.)
    confirmations: (id: string) => http.request<AgreementConfirmationResponse[]>(`${agreement(id)}/confirmations`, { auth: 'required' }),
    invitation: (token: string) => http.request<PublicInvitationViewResponse>(`/api/v1/agreement-invitations/${segment(token)}`, { auth: 'none' }),
    join: (token: string, idempotencyKey: string) => http.request<JoinAgreementResponse>(`/api/v1/agreement-invitations/${segment(token)}/join`, { method: 'POST', body: { idempotencyKey }, auth: 'required' }),
    // Real shape: List<AgreementVersionResponse> — each entry is the full version record (id,
    // versionStatus included), not the lighter AgreementVersionSummaryResponse used in Detail's
    // versionHistory. Callers must select CURRENT by versionStatus, never by highest versionNumber.
    versions: (id: string) => http.request<AgreementVersionResponse[]>(`${agreement(id)}/versions`, { auth: 'required' }),
    // Real shape: List<AgreementParticipantResponse> -- id, identityId, roleCode, participantStatus, addedAt. No name / KS Number.
    participants: (id: string) => http.request<AgreementParticipantDto[]>(`${agreement(id)}/participants`, { auth: 'required' }),
    version: (id: string, versionId: string) => http.request<AgreementVersionResponse>(`${agreement(id)}/versions/${segment(versionId)}`, { auth: 'required' }),
    confirmVersion: (id: string, versionId: string, body: ConfirmVersionRequest) => http.request<AgreementConfirmationResponse>(`${agreement(id)}/versions/${segment(versionId)}/confirm`, { method: 'POST', body, auth: 'required' }),
    // Verified against SecurePayAPI feat/securepay-phase11-referrals-plugs-masters @ 978437f3
    // (AgreementPlugAttributionController). POST/GET plug-attribution and referral-status are all now
    // live on `SecurePayAPI main` (PR #207 has since merged; re-confirmed during the Phase 4 final
    // correction pass, 2026-09-20 -- see docs/PHASE4_TRADE_COMMUNITY.md). Server-side authority: only
    // the Agreement's own creator may attribute/read attribution or read referral-status.
    attributePlug: (id: string, relationshipRef: string) => http.request<AgreementPlugAttributionResponse>(`${agreement(id)}/plug-attribution`, { method: 'POST', body: { relationshipRef }, auth: 'required' }),
    plugAttribution: (id: string) => http.request<AgreementPlugAttributionResponse>(`${agreement(id)}/plug-attribution`, { auth: 'required' }),
    referralStatus: (id: string) => http.request<AgreementKeyContractReferralResponse>(`${agreement(id)}/plug-attribution/referral-status`, { auth: 'required' }),

    // Phase 3 Living Agreements -- milestone DAG effective state, never derived from sequenceOrder.
    milestoneEffectiveStates: (id: string) => http.request<MilestoneEffectiveStateResponse[]>(`${agreement(id)}/milestones/effective-states`, { auth: 'required' }),

    // KSCalendar. One canonical event model; conflicts are always warnings, never automatic blocks,
    // unless an event is explicitly exclusive.
    calendarEvents: (id: string) => http.request<AgreementCalendarEventResponse[]>(`${agreement(id)}/calendar/events`, { auth: 'required' }),
    calendarConflicts: (id: string) => http.request<SchedulingConflictResponse[]>(`${agreement(id)}/calendar/conflicts`, { auth: 'required' }),
    myCalendar: () => http.request<AgreementCalendarEventResponse[]>('/api/v1/me/calendar', { auth: 'required' }),

    // Personal, free-typed, owner-private tags -- organizational only.
    tagsForAgreement: (id: string) => http.request<PersonalTagResponse[]>(`${agreement(id)}/tags`, { auth: 'required' }),
    tagAgreement: (id: string, label: string) => http.request<PersonalTagResponse>(`${agreement(id)}/tags`, { method: 'POST', body: { label }, auth: 'required' }),
    untagAgreement: (id: string, tagId: string) => http.request<void>(`${agreement(id)}/tags/${segment(tagId)}`, { method: 'DELETE', auth: 'required' }),
    myTags: () => http.request<PersonalTagResponse[]>('/api/v1/me/tags', { auth: 'required' }),
  };
}
export type AgreementGateway = ReturnType<typeof createAgreementGateway>;
