// Wire projections from SecurePayAPI Java response records; see compatibility audit for pinned revision.
export interface CurrentUserAgreementSummaryResponse {
  agreementId: string;
  publicReference: string;
  title: string;
  purpose: string;
  status: string;
  agreementType: string;
  proposedAmountMinor: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  currentActor: CurrentUserActorResponse | null;
  counterparty: SafeCounterpartyResponse | null;
  nextDeadline: string | null;
  attentionRequired: boolean;
  nextActions: WorkspaceNextActionResponse[];
  currentAgreementVersionId: string;
  completion: AgreementCompletionResponse;
}
export interface CurrentUserActorResponse {
  roleCode: string;
  participantStatus: string;
}
export interface SafeCounterpartyResponse {
  ksNumber: string | null;
  displayName: string | null;
}
export interface WorkspaceNextActionResponse {
  actionCode: string;
  category: string;
  reason: string;
  deadline: string | null;
  attentionClass: string;
}
export interface AgreementCompletionResponse {
  completed: boolean;
  status: string;
  reasonCodes: string[];
  agreementVersionId: string;
  completedAt: string | null;
}
export interface CurrentUserActionResponse {
  agreementId: string;
  agreementReference: string;
  agreementTitle: string;
  actionCode: string;
  category: string;
  reason: string;
  deadline: string | null;
  attentionClass: string;
}
export interface AgreementDetailResponse {
  overview: AgreementOverviewResponse;
  currentVersion: AgreementVersionSummaryResponse | null;
  participants: AgreementParticipantSummaryResponse[];
  milestones: AgreementMilestoneSummaryResponse[];
  terms: AgreementTermResponse[];
  documents: AgreementDocumentResponse[];
  activity: AgreementActivityEntryResponse[];
  versionHistory: AgreementVersionSummaryResponse[];
  money: AgreementMoneyHandoffResponse;
}
export interface AgreementOverviewResponse {
  agreementId: string;
  publicReference: string;
  title: string;
  purpose: string;
  description: string;
  agreementType: string;
  status: string;
  currency: string;
  proposedAmountMinor: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}
export interface AgreementParticipantSummaryResponse {
  participantId: string;
  roleCode: string;
  participantStatus: string;
  ksNumber: string | null;
  displayName: string | null;
}
export interface AgreementMilestoneSummaryResponse {
  milestoneId: string;
  title: string;
  description: string;
  sequenceOrder: number;
  availableFrom: string | null;
  dueAt: string | null;
  status: string;
  obligationIds: string[];
}
export interface AgreementTermResponse {
  obligationId: string;
  title: string;
  description: string;
  obligationType: string;
  status: string;
  currency: string;
  amountMinor: number | null;
  sequenceOrder: number;
}
export interface AgreementDocumentResponse {
  evidenceId: string;
  description: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number | null;
  submittedAt: string;
  status: string;
}
export interface AgreementActivityEntryResponse {
  id: string;
  activityType: string;
  actorIdentityId: string;
  occurredAt: string;
}
export interface AgreementVersionSummaryResponse {
  versionId: string;
  versionNumber: number;
  contentHash: string;
  createdAt: string;
  amendmentReason: string | null;
  materialChange: boolean;
}
export interface AgreementMoneyHandoffResponse {
  status: string;
  outstandingReasons: OutstandingMoneyReason[];
  moneyRecordCount: number;
}
export interface OutstandingMoneyReason {
  gateCode: string;
  reasonCode: string;
}
export interface PublicInvitationViewResponse {
  publicReference: string;
  title: string;
  purpose: string;
  intendedRole: string;
  currency: string;
  proposedAmountMinor: number | null;
  invitationExpiresAt: string;
  proposalVersionNumber: number;
  notice: string;
}
export interface JoinAgreementResponse {
  agreementId: string;
  publicReference: string;
  participantId: string;
  role: string;
  participantStatus: string;
  joinedVersionId: string;
  joinedVersionNumber: number;
  confirmationRequired: boolean;
  joinedAt: string;
  notice: string;
}
export interface AgreementConfirmationResponse {
  id: string;
  agreementVersionId: string;
  participantId: string;
  versionNumber: number;
  versionContentHash: string;
  status: string;
  assuranceMethod: string;
  confirmedAt: string;
  confirmationCurrent: boolean;
  reconfirmationRequired: boolean;
}
export interface AgreementVersionResponse {
  id: string;
  versionNumber: number;
  snapshot: Record<string, unknown>;
  contentHash: string;
  parentVersionId: string | null;
  amendmentReason: string | null;
  materialChange: boolean;
  versionStatus: string;
  createdAt: string;
}
export interface AgreementMoneyStatusResponse {
  agreementId: string;
  agreementCurrency: string;
  proposedAmountMinor: number | null;
  evaluatedCurrency: string;
  evaluatedAmountMinor: number;
  paymentReady: boolean;
  paymentReadyStatus: string;
  outstandingReasons: OutstandingReason[];
  evaluatedAt: string;
  evaluationId: string;
}
export interface OutstandingReason {
  gateCode: string;
  reasonCode: string;
}
export interface AgreementMoneyRecordResponse {
  recordType: string;
  occurredAt: string;
  status: string;
  currency: string;
  amountMinor: string;
}
// Verified against kimaniks001/SecurePayAPI feat/securepay-phase11-referrals-plugs-masters @
// 978437f300244119302607ba3e656a76253190bb (AgreementPlugAttributionController.java, the exact
// api/agreement/request|response DTOs). `POST`/`GET .../plug-attribution` and
// `.../plug-attribution/referral-status` are all real, live backend authority on `SecurePayAPI main`
// (PR #207, which originally added `referral-status`, has since merged; re-confirmed during the
// Phase 4 final correction pass, 2026-09-20 -- see docs/PHASE4_TRADE_COMMUNITY.md and
// docs/PRODUCTION_MIGRATION_LEDGER.md section 18 for the original archaeology).
export interface AgreementPlugAttributionRequest { relationshipRef: string }
export interface AgreementPlugAttributionResponse {
  attributionRef: string;
  agreementId: string;
  relationshipRef: string;
  plugKsNumber: string;
  attributedAt: string;
}
/** `state` is exactly one of NO_INTRODUCTION/CANDIDATE/NOT_QUALIFIED/QUALIFIED — never computed by the
 * frontend. Amounts are decimal strings and populate only once QUALIFIED. `rewardPaid` is always `false`
 * today — no payout authority exists anywhere in this backend yet (re-confirmed against current
 * `SecurePayAPI main` during the Phase 4 final correction pass, 2026-09-20 -- this substantive claim
 * is still accurate; only the now-merged PR #207's "pending" framing was stale, see index.ts). */
export interface AgreementKeyContractReferralResponse {
  agreementId: string;
  state: string;
  plugKsNumber: string | null;
  introducedAt: string | null;
  platformFeeMinor: string | null;
  rewardAmountMinor: string | null;
  currency: string | null;
  shareRuleVersion: string | null;
  rewardEarned: boolean;
  rewardPaid: boolean;
  qualifiedAt: string | null;
}

export interface AgreementConfirmationStatusResponse {
  participantId: string;
  identityId: string;
  roleCode: string;
  participantStatus: string;
  confirmedVersionId: string | null;
  confirmedVersionNumber: number | null;
  currentVersionId: string;
  currentVersionNumber: number;
  confirmationCurrent: boolean;
  reconfirmationRequired: boolean;
}

// Phase 3 Living Agreements -- milestone DAG, KSCalendar, personal tags.
export interface MilestoneEffectiveStateResponse {
  milestoneId: string;
  state: 'READY' | 'IN_PROGRESS' | 'WAITING' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
  reason: string | null;
}

export interface AgreementCalendarEventResponse {
  id: string;
  agreementId: string;
  eventType: string;
  source: 'EXPLICIT' | 'DERIVED';
  title: string;
  occursAt: string;
  endsAt: string | null;
  exclusive: boolean;
  sourceReference: string | null;
  cancelled: boolean;
}

export interface SchedulingConflictResponse {
  firstEventId: string;
  secondEventId: string;
  severity: 'POSSIBLE_PERSONAL_CONFLICT' | 'AGREEMENT_CONFLICT' | 'EXPLICIT_EXCLUSIVITY_VIOLATION';
}

// Final Phase 3 correction (Section 9) -- the complete Agreements Home read from
// GET /api/v1/me/agreements/home. Every field is backend-authoritative; the frontend performs no
// lifecycle or financial calculation of its own on this shape.
export interface AgreementProblemSummaryResponse {
  agreementId: string;
  agreementTitle: string | null;
  reviewCaseId: string;
  state: string;
  subjectType: string;
  openedAt: string;
  responseDeadlineAt: string | null;
  evidenceDeadlineAt: string | null;
}

export interface RecentActivityEntryResponse {
  agreementId: string;
  agreementTitle: string;
  activityType: string;
  occurredAt: string;
}

export interface AgreementMoneyByCurrencyResponse {
  currency: string;
  fundedTotalMinor: number;
  exercisedOrSettledMinor: number;
  releasedTotalMinor: number;
  remainingFundedMinor: number;
  positionCount: number;
}

export interface AgreementsHomeResponse {
  needsMe: CurrentUserAgreementSummaryResponse[];
  inProgress: CurrentUserAgreementSummaryResponse[];
  waitingOnOthers: CurrentUserAgreementSummaryResponse[];
  problems: AgreementProblemSummaryResponse[];
  recentlyCompleted: CurrentUserAgreementSummaryResponse[];
  upcoming: AgreementCalendarEventResponse[];
  recentActivity: RecentActivityEntryResponse[];
  moneyByCurrency: AgreementMoneyByCurrencyResponse[];
}

export interface PersonalTagResponse {
  id: string;
  label: string;
  createdAt: string;
}
