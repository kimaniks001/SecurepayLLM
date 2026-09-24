import { segment, type HttpClient } from '../http';
import type { AgreementCalendarEventResponse, AgreementConfirmationResponse, AgreementConfirmationStatusResponse, AgreementDetailResponse, AgreementKeyContractReferralResponse, AgreementPeopleResponse, AgreementPlugAttributionResponse, AgreementVersionResponse, AgreementsHomeResponse, CurrentUserActionResponse, CurrentUserAgreementSummaryResponse, InvitationTargetResponse, JoinAgreementResponse, MilestoneEffectiveStateResponse, PersonalTagResponse, PublicInvitationViewResponse, SchedulingConflictResponse } from './dto';
export interface Page<T> { items: T[]; page: number; size: number; totalElements: number }
export interface HubDto {
  needsMe: CurrentUserAgreementSummaryResponse[]; waitingOnOthers: CurrentUserAgreementSummaryResponse[];
  takingShape: CurrentUserAgreementSummaryResponse[]; active: CurrentUserAgreementSummaryResponse[];
  changedReviewRequired: CurrentUserAgreementSummaryResponse[]; completed: CurrentUserAgreementSummaryResponse[];
  cancelled: CurrentUserAgreementSummaryResponse[]; expired: CurrentUserAgreementSummaryResponse[];
}
/** `invitationToken` is null on an idempotent REPLAY: SecurePay returns the existing invitation but never the raw token again. */
export interface IssueInvitationDto { invitationId: string; status: string; invitationToken: string | null; replayed: boolean }
export interface ObligationDto { id: string; publicReference: string; agreementId: string; agreementVersionId: string; obligationType: string; title: string; description: string | null; responsibleParticipantId: string; beneficiaryParticipantId: string | null; currency: string | null; amountMinor: number | null; status: string; createdAt: string }
export interface ObligationCompletionStatusDto { eligible: boolean; currentStatus: string; unmetRequirements: string[]; satisfiedRequirements: string[]; evidenceIds: string[]; explanationCodes: string[] }
export interface EvidenceDto { id: string; obligationId: string; evidenceType: string; description: string | null; contentType: string | null; status: string; submittedAt: string }
export interface NextActionDto { participantId: string; agreementId: string; currentAgreementVersionId: string; actionType: string; targetObligationId: string | null; targetMilestoneId: string | null; actionReason: string; prerequisiteStatus: string | null; deadline: string | null; urgency: string; requiredEvidenceTypes: string[]; blockedByObligationIds: string[]; supportingEvidenceIds: string[] }
export interface AgreementAmendmentDto { id: string; sourceVersionId: string; proposedTerms: Record<string, unknown>; reason: string | null; status: string; appliedVersionId: string | null; createdAt: string; updatedAt: string }
export interface AmendmentFieldChangeDto { field: string; oldValue: unknown; newValue: unknown; changeType: string }
export interface AmendmentDiffDto { amendmentId: string; sourceVersionId: string; changes: AmendmentFieldChangeDto[] }
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
    issueInvitation: (id: string, body: { idempotencyKey: string; roleCode: string; intendedIdentityId?: string; intendedKsNumber?: string }) => http.request<IssueInvitationDto>(`${agreement(id)}/invitations`, { method: 'POST', body, auth: 'required' }),
    // KS001 Upgrade Phase 4 (Section 10) -- the bounded creator-facing preview before issuing a
    // KS-Number-targeted invitation. A 404 means "no such active identity" (never distinguished from
    // "known but ineligible" -- Section 15's own anti-enumeration doctrine) -- the caller checks
    // `error.status === 404` and treats it as "not found," not a failure to report.
    lookupInvitationTargetByKsNumber: (id: string, ksNumber: string) => http.request<InvitationTargetResponse>(`${agreement(id)}/invitation-targets/by-ks-number?ksNumber=${encodeURIComponent(ksNumber)}`, { auth: 'required' }),
    // KS001 Upgrade Phase 4 (Section 7/9) -- the ONE server-owned People projection: who is here, their
    // bounded identity display, invitation/join/confirmation state and a human participation state,
    // plus small server-computed summary counts (never a percentage/meter).
    people: (id: string) => http.request<AgreementPeopleResponse>(`${agreement(id)}/people`, { auth: 'required' }),
    // Draft -> Proposed (creator only, idempotent if already PROPOSED). Invitations can only be issued from PROPOSED onward.
    propose: (id: string) => http.request<{ id: string; status: string }>(`${agreement(id)}/propose`, { method: 'POST', auth: 'required' }),
    // Real shape: List<AgreementInvitationResponse> -- id, roleCode, status (ISSUED|VIEWED|JOINED|REVOKED|EXPIRED), issuedAt, expiresAt, revokedAt. No target, no token.
    invitations: (id: string) => http.request<AgreementInvitationDto[]>(`${agreement(id)}/invitations`, { auth: 'required' }),
    revokeInvitation: (id: string, invitationId: string) => http.request<AgreementInvitationDto>(`${agreement(id)}/invitations/${segment(invitationId)}/revoke`, { method: 'POST', auth: 'required' }),
    // Every confirmation on the Agreement (all participants), each flagged confirmationCurrent against the CURRENT version.
    // (`confirmation-status` above returns ONLY the caller's own row.)
    confirmations: (id: string) => http.request<AgreementConfirmationResponse[]>(`${agreement(id)}/confirmations`, { auth: 'required' }),
    // Execution (Phase 7). Verified against AgreementObligationController / ObligationService / EvidenceService (read-only).
    // NOTE: `obligations` returns EVERY obligation of the Agreement across ALL versions; scope by `agreementVersionId`.
    obligations: (id: string) => http.request<ObligationDto[]>(`${agreement(id)}/obligations`, { auth: 'required' }),
    obligationCompletionStatus: (id: string, obligationId: string) => http.request<ObligationCompletionStatusDto>(`${agreement(id)}/obligations/${segment(obligationId)}/completion-status`, { auth: 'required' }),
    // The server's own "participant not responsible" check compares the responsible participant with ITSELF (never fails), so
    // callers MUST gate on the participant's own START_OBLIGATION next action.
    startObligation: (id: string, obligationId: string, idempotencyKey: string) => http.request<ObligationDto>(`${agreement(id)}/obligations/${segment(obligationId)}/start`, { method: 'POST', body: { idempotencyKey }, auth: 'required' }),
    // The server checks no participant at all for completion; it only requires the completion requirements to be met.
    completeObligation: (id: string, obligationId: string, idempotencyKey: string) => http.request<ObligationDto>(`${agreement(id)}/obligations/${segment(obligationId)}/complete`, { method: 'POST', body: { idempotencyKey }, auth: 'required' }),
    // Narrow evidence RECORD list (no filename, uploader, size, hash or object reference). There is no upload or retrieval API.
    obligationEvidence: (id: string, obligationId: string) => http.request<EvidenceDto[]>(`${agreement(id)}/obligations/${segment(obligationId)}/evidence`, { auth: 'required' }),
    // Records a review decision. It does NOT change the evidence's status (nothing in the backend ever moves it past SUBMITTED).
    reviewEvidence: (id: string, evidenceId: string, body: { idempotencyKey: string; decision: 'APPROVED' | 'REJECTED'; reason?: string; reviewerParticipantId?: string }) => http.request<EvidenceDto>(`${agreement(id)}/evidence/${segment(evidenceId)}/review`, { method: 'POST', body, auth: 'required' }),
    myNextActions: (id: string) => http.request<{ actions: NextActionDto[] }>(`${agreement(id)}/participants/me/next-actions`, { auth: 'required' }),
    // Amendments. Real shapes verified against AgreementController / AgreementAmendmentService (read-only).
    // Listing works ONLY while the Agreement allows amendments (PARTICIPANTS_JOINING | CONFIRMATION_PENDING); otherwise 422.
    amendments: (id: string) => http.request<AgreementAmendmentDto[]>(`${agreement(id)}/amendments`, { auth: 'required' }),
    // NOT safe to render as "what will change" unless it contains no REMOVED entry (diff treats proposedTerms as a full
    // snapshot; apply merges it as a patch). See features/amendments/display.ts.
    amendmentDiff: (id: string, amendmentId: string) => http.request<AmendmentDiffDto>(`${agreement(id)}/amendments/${segment(amendmentId)}/diff`, { auth: 'required' }),
    // Returns the NEW canonical version. A replay of an already-applied amendment answers 422 "amendment not applicable"
    // (the status check runs before the idempotency lookup), so an uncertain outcome must be settled by re-reading.
    applyAmendment: (id: string, amendmentId: string, idempotencyKey: string) => http.request<AgreementVersionResponse>(`${agreement(id)}/amendments/${segment(amendmentId)}/apply`, { method: 'POST', body: { idempotencyKey }, auth: 'required' }),
    // Reject / withdraw return the amendment and are a silent no-op (200, unchanged status) when it is no longer PROPOSED.
    rejectAmendment: (id: string, amendmentId: string) => http.request<AgreementAmendmentDto>(`${agreement(id)}/amendments/${segment(amendmentId)}/reject`, { method: 'POST', auth: 'required' }),
    withdrawAmendment: (id: string, amendmentId: string) => http.request<AgreementAmendmentDto>(`${agreement(id)}/amendments/${segment(amendmentId)}/withdraw`, { method: 'POST', auth: 'required' }),
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
