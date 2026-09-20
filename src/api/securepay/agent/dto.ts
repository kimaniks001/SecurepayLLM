// AgentApiModels / AgentAgreementHandoffApiModels and agent.protocol at backend SHA in the audit.
export interface ConversationDto { conversationId: string; createdAt: string; contextVersion: number }
export interface ComponentDto { type: string; data: Record<string, unknown> }
export interface AgentResponseDto {
  protocolVersion: string; message: string;
  contextUpdates: { kind: string; targetId: string; summary: string }[];
  components: ComponentDto[];
  contextualPanel: { title: string; components: ComponentDto[] } | null;
  suggestedActions: { id: string; label: string; payload: Record<string, string> }[];
}
export interface EntityDto { id: string; type: string; name: string; state: string; confidence: number; attributes: Record<string, string> }
export interface RelationshipDto { id: string; kind: string; subjectEntityId: string; objectEntityId?: string | null; qualifiers: Record<string, string>; state: string; confidence: number }
export interface TradeContextDto { conversationId: string; version: number; entities: EntityDto[]; relationships: RelationshipDto[] }
export interface TurnRequest { message: string; clientTurnId?: string }
export interface AdoptFactRequest { targetId: string; targetKind: 'ENTITY' | 'RELATIONSHIP'; clientTurnId?: string }
export type SourceKind = 'QUOTATION' | 'DOCUMENT_EXTRACTION' | 'PHOTO_OBSERVATION' | 'PROVIDER_PROFILE' | 'STORE_LISTING' | 'LOCATION_RESULT' | 'PREVIOUS_AGREEMENT' | 'COMMUNITY_KNOWLEDGE' | 'PARTNER_INFORMATION' | 'MASTER_OPINION';
export interface ExternalFactRequest { sourceKind: SourceKind; sourceDescription?: string; clientTurnId?: string }
// Final Phase 4 Economy Turn 2 (Section 3/9) -- the ONE pointer the frontend ever tells SecurePay
// about a chosen commercial source. Never a title/price/owner -- those are always re-derived
// server-side from the real record; see AgentCommercialSourceController's own doctrine.
export interface SelectCommercialSourceRequest { sourceType: string; sourceId: string; sourceOwnerKsNumber: string }
export interface SelectedCommercialSourceDto {
  sourceType: string; sourceId: string; sourceTitle: string | null; sourceOwnerKsNumber: string | null;
  contextReference: string | null; capturedPriceMinor: number | null; capturedCurrency: string | null; selectedAt: string;
}
export interface CandidateDto { title: string | null; purpose: string | null; description: string | null; agreementType: string | null; currency: string | null; amountMinor: number | null; what: string[]; who: string[]; when: string[] }
// Final Phase 4 Economy Turn 3 (Section 6/7) -- the EXACT commercial source bound to a handoff at
// review/creation time, never the conversation's current mutable selection. `sourceStatus` is one
// of CURRENT / CHANGED / UNAVAILABLE; `current` carries the live facts only when CHANGED.
export type ReviewedSourceStatus = 'CURRENT' | 'CHANGED' | 'UNAVAILABLE';
export interface CurrentSourceFactsDto {
  title: string | null; capturedPriceMinor: number | null; capturedCurrency: string | null;
  capturedAvailabilityState: string | null; capturedQuantityAvailable: number | null; capturedDescription: string | null;
}
export interface ReviewedSourceDto {
  sourceType: string; sourceId: string; sourceTitle: string | null; sourceOwnerKsNumber: string | null;
  capturedPriceMinor: number | null; capturedCurrency: string | null; capturedAvailabilityState: string | null;
  capturedQuantityAvailable: number | null; capturedDescription: string | null; contextReference: string | null;
  boundAt: string; sourceStatus: string; current: CurrentSourceFactsDto | null;
}
export interface AgreementReviewResponseDto { agreementCandidateSummary: CandidateDto; reviewedSource: ReviewedSourceDto | null }
export type HandoffStatus = 'IDENTITY_REQUIRED' | 'NEEDS_RESOLUTION' | 'REVIEW_STALE' | 'READY_FOR_REVIEW' | 'READY_TO_PROGRESS' | 'PROGRESSED' | 'EXPIRED';
export interface HandoffDto {
  handoffId: string; conversationId: string; status: string; agreementCandidateSummary: CandidateDto;
  reviewedSource: ReviewedSourceDto | null;
  unresolvedMatters: string[]; guidanceNotes: string[]; tradeContextVersion: number;
  candidateDigest: string; expiresAt: string; progressedAgreementId: string | null;
}
/**
 * GET /api/v1/identities/by-ksnumber/{canonicalKsNumber}. The wire record is the FULL identity
 * record (internal id, sequence, timestamps). It is declared here only so the adapter can drop
 * everything except the participant-safe projection -- see `ksIdentityView`.
 */
export interface KsIdentityDto {
  identityId?: string; canonicalKsNumber: string; sequenceNumber?: number; identityType?: string;
  status: string; displayName?: string | null; createdAt?: string; updatedAt?: string;
}
export interface ContinueHandoffRequest { expectedTradeContextVersion: number; expectedCandidateDigest: string }

// Phase 3 Living Agreements -- SecurePay Agent wired into an existing, already-established Agreement.
export interface AgentAgreementMilestoneFactDto { title: string; effectiveState: string; waitingReason: string | null }
export interface AgentAgreementMoneyPositionFactDto { currency: string; fundedTotalMinor: number; exercisedOrSettledMinor: number; remainingFundedMinor: number }
export interface AgentAgreementUpcomingEventFactDto { title: string; eventType: string; occursAt: string }
export interface AgentAgreementProblemFactDto { state: string; responseDeadlineAt: string | null; evidenceDeadlineAt: string | null }
// Final Phase 3 correction (Section 20) -- never a raw object-storage reference, only metadata.
export interface AgentAgreementEvidenceFactDto { evidenceType: string; description: string | null; contentType: string | null; status: string; submittedAt: string | null }
// Final Phase 3 focus-semantics pass -- a narrow, safe per-Agreement activity fact: activity type +
// when it occurred only, never raw actor/participant/metadata detail.
export interface AgentAgreementActivityFactDto { activityType: string; occurredAt: string | null }
// Final Phase 3 question-focused pass -- the EFFECTIVE, non-authority-bearing presentation
// projection the server actually applied (never inferred client-side from the question text).
export type AgentAgreementWorkspaceFocus =
  | 'FULL' | 'OVERVIEW' | 'NEXT_ACTIONS' | 'MILESTONES' | 'EVIDENCE' | 'CALENDAR' | 'MONEY' | 'PROBLEMS' | 'TAGS' | 'ACTIVITY';
export type AgentAgreementsHomeFocus =
  | 'FULL' | 'NEEDS_ATTENTION' | 'WAITING' | 'PROBLEMS' | 'RECENTLY_COMPLETED' | 'UPCOMING' | 'RECENT_ACTIVITY' | 'MONEY' | 'TAGGED';
export interface AgentAgreementWorkspaceViewDto {
  focus: AgentAgreementWorkspaceFocus;
  title: string; status: string; version: number;
  milestones: AgentAgreementMilestoneFactDto[];
  moneyPositions: AgentAgreementMoneyPositionFactDto[];
  upcomingEvents: AgentAgreementUpcomingEventFactDto[];
  tags: string[];
  problems: AgentAgreementProblemFactDto[];
  evidence: AgentAgreementEvidenceFactDto[];
  activity: AgentAgreementActivityFactDto[];
}
export interface AgentAgreementWorkspaceAskDto { grantId: string; summaryText: string; workspace: AgentAgreementWorkspaceViewDto }

// Final Phase 3 completion pass, Section 9 -- the explicit, one-time bounded access grant a person
// gives SecurePay to work with one existing, private Agreement inside a conversation.
export interface AgentAgreementAccessGrantDto {
  grantId: string; agreementId: string; conversationId: string; grantedAt: string; expiresAt: string;
}

// Final Phase 3 completion pass, Section 17 -- the real, server-composed UNDERSTOOD artifacts
// carried on a normal AgentResponseDto turn (AGREEMENT_WORKSPACE / AGREEMENTS_HOME component
// types), built entirely from read_agreement_workspace / read_my_agreements_home's real tool
// output -- never invented by the model.
export interface AgentAgreementSummaryFactDto { title: string; status: string; nextDeadline: string | null; tags: string[] }
export interface AgentHomeProblemFactDto { agreementTitle: string; state: string; responseDeadlineAt: string | null; evidenceDeadlineAt: string | null }
export interface AgentHomeUpcomingEventFactDto { agreementTitle: string; title: string; eventType: string; occursAt: string | null }
export interface AgentHomeActivityFactDto { agreementTitle: string; activityType: string; occurredAt: string | null }
export interface AgentHomeMoneyByCurrencyFactDto {
  currency: string; fundedTotalMinor: number; exercisedOrSettledMinor: number; releasedTotalMinor: number;
  remainingFundedMinor: number; positionCount: number;
}
export interface AgentAgreementsHomeViewDto {
  focus: AgentAgreementsHomeFocus;
  needsAttention: AgentAgreementSummaryFactDto[];
  waitingOnOthers: AgentAgreementSummaryFactDto[];
  problems: AgentHomeProblemFactDto[];
  recentlyCompleted: AgentAgreementSummaryFactDto[];
  upcoming: AgentHomeUpcomingEventFactDto[];
  recentActivity: AgentHomeActivityFactDto[];
  moneyByCurrency: AgentHomeMoneyByCurrencyFactDto[];
}
