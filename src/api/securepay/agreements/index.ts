import { segment, type HttpClient } from '../http';
import type { AgreementCalendarEventResponse, AgreementConfirmationResponse, AgreementConfirmationStatusResponse, AgreementDetailResponse, AgreementInvitationInboxItemResponse, AgreementKeyContractReferralResponse, AgreementPeopleResponse, AgreementPlugAttributionResponse, AgreementSourceProvenanceResponse, AgreementVersionResponse, AgreementsHomeResponse, CurrentUserActionResponse, CurrentUserAgreementSummaryResponse, InvitationTargetResponse, JoinAgreementResponse, MilestoneEffectiveStateResponse, PersonalTagResponse, PublicInvitationViewResponse, SchedulingConflictResponse } from './dto';
export interface Page<T> { items: T[]; page: number; size: number; totalElements: number }
export interface HubDto {
  needsMe: CurrentUserAgreementSummaryResponse[]; waitingOnOthers: CurrentUserAgreementSummaryResponse[];
  takingShape: CurrentUserAgreementSummaryResponse[]; active: CurrentUserAgreementSummaryResponse[];
  changedReviewRequired: CurrentUserAgreementSummaryResponse[]; completed: CurrentUserAgreementSummaryResponse[];
  cancelled: CurrentUserAgreementSummaryResponse[]; expired: CurrentUserAgreementSummaryResponse[];
}
/** `invitationToken` is null on an idempotent REPLAY: SecurePay returns the existing invitation but never the raw token again. */
export interface IssueInvitationDto { invitationId: string; status: string; invitationToken: string | null; replayed: boolean; targetKind: 'KS_NUMBER' | 'CONTACT' | 'OPEN'; targetHint: string | null }
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
// KS001 Upgrade Phase 5 (SecureLink & Money Continuation) -- product activation and public locator (SecureLink) issuance.
export interface AgreementProductActivationDto { productId: string; productType: string; status: string; activatedAt: string; expiresAt: string | null; replayed: boolean }
export interface ActivateAgreementProductRequest { idempotencyKey: string; purposeSummary: string; publicAmountDisplay?: boolean }
/** `publicUrl` is null when no production public-facing base URL is configured yet -- never fabricate one client-side. */
export interface IssuePublicLocatorDto { locatorId: string; pathClass: string; status: string; slug: string; replayed: boolean; publicUrl: string | null }
/**
 * KS001 Upgrade Phase 5 continuation (Slice 2, Section 8/9) -- `publicUrl` here is the REPLACEMENT
 * locator's own fresh URL, never the rotated-away one; the old link is never shown as active again.
 */
export interface RotatePublicLocatorDto { previousLocatorId: string; replacementLocatorId: string; slug: string; status: string; replayed: boolean; publicUrl: string | null }
export interface RevokePublicLocatorDto { locatorId: string; pathClass: string; status: string; issuedAt: string; expiresAt: string | null; supersededByLocatorId: string | null }
/**
 * KS001 Upgrade Phase 5 continuation (Slice 2, Section 8) -- bounded existence truth only.
 * `hasActiveLocator=false` means no product exists yet OR no active locator does. Deliberately has no
 * slug/publicUrl field at all -- the plaintext slug is architecturally unrecoverable after issuance
 * (only a one-way digest is stored server-side), so this can only ever answer "does one exist, and
 * what state is it in," never "what is the URL." `locatorId` is opaque, for the rotate/revoke calls
 * only -- never for display.
 */
export interface ActiveLocatorSummaryDto { hasActiveLocator: boolean; locatorId: string | null; pathClass: string | null; status: string | null; issuedAt: string | null; expiresAt: string | null }
export interface PublicProductParticipantDto { displayLabel: string; roleCode: string }
export interface PublicProductMilestoneDto { sequenceOrder: number; title: string; status: string }
export interface PublicFairTradeGuidanceDto { principleNumber: number; principleTitle: string; guidance: string }
/** The bounded pre-Join public review -- Section 8's own "review is not Join/accept/pay" boundary. */
export interface PublicProductViewDto {
  productType: string; purposeSummary: string; currency: string | null; amountMinor: number | null;
  amountVisible: boolean; participants: PublicProductParticipantDto[]; publicStatus: string;
  expiresAt: string | null; milestones: PublicProductMilestoneDto[]; nextStepGuidance: string | null;
  verifyIdentityPrompt: string | null; fairTradeGuidance: PublicFairTradeGuidanceDto[];
  // KS001 Upgrade Phase 5 continuation (Slice 5, Section 10) -- the exact version this view reflects,
  // and whether the Agreement has since moved on. Closes a real gap: this view previously showed no
  // version information at all.
  versionNumber: number; isCurrentVersion: boolean;
}
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
    // KS001 Upgrade Phase 4 continuation -- deliberately no intendedIdentityId field: a public caller may
    // only ever name an intended recipient by KS Number (server re-resolved) OR a phone/email (bound to a
    // digest server-side, never persisted raw), never both.
    issueInvitation: (id: string, body: { idempotencyKey: string; roleCode: string; intendedKsNumber?: string; contactChannel?: 'EMAIL' | 'SMS'; contactDestination?: string }) => http.request<IssueInvitationDto>(`${agreement(id)}/invitations`, { method: 'POST', body, auth: 'required' }),
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
    // KS001 Upgrade Phase 4 continuation (Section 21/23) -- the self-scoped invitation inbox. No
    // identityId parameter exists anywhere here: every match is derived from the caller's OWN session.
    // KS001 Upgrade Phase 4 final convergence (Section 2) -- genuinely bounded/paginated (same Page<T>
    // convention as currentUserAgreements/currentUserActions); the backend never assembles or returns a
    // caller's entire lifetime invitation history in one response.
    myInvitations: (page = 0, size = 20) => http.request<Page<AgreementInvitationInboxItemResponse>>(`/api/v1/agreement-invitations/me${pagination(page, size)}`, { auth: 'required' }),
    viewMyInvitation: (invitationId: string) => http.request<PublicInvitationViewResponse>(`/api/v1/agreement-invitations/me/${segment(invitationId)}`, { auth: 'required' }),
    joinMyInvitation: (invitationId: string, idempotencyKey: string) => http.request<JoinAgreementResponse>(`/api/v1/agreement-invitations/me/${segment(invitationId)}/join`, { method: 'POST', body: { idempotencyKey }, auth: 'required' }),
    // KS001 Upgrade Phase 5 (SecureLink & Money Continuation, Section 6/7) -- creating a SecureLink is a
    // TWO-step server-owned sequence: activate the Agreement's product (the backend classifies
    // SECURE_LINK vs KEY_CONTRACT itself from the Agreement's own obligations -- the frontend never
    // supplies or guesses a productType), then issue a public locator against that now-active product.
    // Both are idempotent; the creator's own explicit choice, never automatic at SET.
    activateProduct: (id: string, body: ActivateAgreementProductRequest) => http.request<AgreementProductActivationDto>(`${agreement(id)}/product`, { method: 'POST', body, auth: 'required' }),
    issuePublicLocator: (id: string, idempotencyKey: string) => http.request<IssuePublicLocatorDto>(`${agreement(id)}/public-locators`, { method: 'POST', body: { idempotencyKey }, auth: 'required' }),
    // KS001 Upgrade Phase 5 continuation (Slice 2, Section 8) -- bounded existence truth, so the
    // creator's own experience can offer honest lifecycle actions instead of blindly re-showing the
    // creation form. Never returns a slug/URL -- see ActiveLocatorSummaryDto's own doctrine.
    activeLocator: (id: string) => http.request<ActiveLocatorSummaryDto>(`${agreement(id)}/public-locators/active`, { auth: 'required' }),
    // Section 9 -- "Replace SecureLink": the existing backend rotate authority, reused as-is. The
    // replacement's own fresh publicUrl is returned; the old link is never shown as active again.
    rotatePublicLocator: (id: string, locatorId: string, idempotencyKey: string) => http.request<RotatePublicLocatorDto>(`${agreement(id)}/public-locators/${segment(locatorId)}/rotate`, { method: 'POST', body: { idempotencyKey }, auth: 'required' }),
    // Section 10 -- "Revoke SecureLink": the existing backend revoke authority, reused as-is. Never
    // implies Agreement cancellation.
    revokePublicLocator: (id: string, locatorId: string, idempotencyKey: string) => http.request<RevokePublicLocatorDto>(`${agreement(id)}/public-locators/${segment(locatorId)}/revoke`, { method: 'POST', body: { idempotencyKey }, auth: 'required' }),
    // KS001 Upgrade Phase 5 continuation (Slice 5, UR-150) -- a PRE-ACTIVATION, Agreement-level public
    // review/Join doorway, distinct from the ACTIVE-product SecureLink above (activateProduct/
    // issuePublicLocator). Reuses the exact same response shapes (pathClass just reads
    // "AGREEMENT_DOORWAY" instead of "SECURE_LINK") since the backend's own locator model is shared.
    // Requires the Agreement to already be PROPOSED (or further along) -- never DRAFT.
    issuePublicDoorway: (id: string, idempotencyKey: string) => http.request<IssuePublicLocatorDto>(`${agreement(id)}/public-doorway`, { method: 'POST', body: { idempotencyKey }, auth: 'required' }),
    activeDoorway: (id: string) => http.request<ActiveLocatorSummaryDto>(`${agreement(id)}/public-doorway/active`, { auth: 'required' }),
    rotatePublicDoorway: (id: string, locatorId: string, idempotencyKey: string) => http.request<RotatePublicLocatorDto>(`${agreement(id)}/public-doorway/${segment(locatorId)}/rotate`, { method: 'POST', body: { idempotencyKey }, auth: 'required' }),
    revokePublicDoorway: (id: string, locatorId: string, idempotencyKey: string) => http.request<RevokePublicLocatorDto>(`${agreement(id)}/public-doorway/${segment(locatorId)}/revoke`, { method: 'POST', body: { idempotencyKey }, auth: 'required' }),
    // Public, unauthenticated review -- Section 8's own "opening a link is not Join/accept/pay" boundary.
    // Never the raw Agreement id; only ever the opaque slug already embedded in the shared SecureLink URL.
    // Serves BOTH a pre-activation doorway and an ACTIVE SecureLink -- the backend discriminates via
    // productType ("AGREEMENT_DOORWAY" vs "SECURE_LINK"/"KEY_CONTRACT"), never a second frontend route.
    viewSecureLink: (slug: string) => http.request<PublicProductViewDto>(`/api/v1/public/securelinks/${segment(slug)}`, { auth: 'none' }),
    // The authenticated-only bridge from a public SecureLink review into the SAME existing Join core:
    // on success, hands back a fresh single-use invitation token; the caller still makes a SEPARATE,
    // explicit `join(token, idempotencyKey)` call above -- this never joins anyone by itself.
    requestSecureLinkJoinAuthority: (slug: string, idempotencyKey: string) => http.request<IssueInvitationDto>(`/api/v1/public/securelinks/${segment(slug)}/join-authority`, { method: 'POST', body: { idempotencyKey }, auth: 'required' }),
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

    // Phase 6 Slice 4 (Community → Trade), item 18 -- the narrow, participant-safe read of an
    // Agreement's persisted commercial source provenance (AgreementSourceProvenanceController).
    // Server-side authority: creator or joined participant only -- never AGREEMENT_AUDIT_READ.
    source: (id: string) => http.request<AgreementSourceProvenanceResponse>(`${agreement(id)}/source`, { auth: 'required' }),

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
