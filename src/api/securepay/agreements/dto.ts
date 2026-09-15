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
