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
export interface RelationshipDto { id: string; kind: string; subjectEntityId: string; objectEntityId: string; qualifiers: Record<string, string>; state: string; confidence: number }
export interface TradeContextDto { conversationId: string; version: number; entities: EntityDto[]; relationships: RelationshipDto[] }
export interface TurnRequest { message: string; clientTurnId?: string }
export interface AdoptFactRequest { targetId: string; targetKind: 'ENTITY' | 'RELATIONSHIP'; clientTurnId?: string }
export type SourceKind = 'QUOTATION' | 'DOCUMENT_EXTRACTION' | 'PHOTO_OBSERVATION' | 'PROVIDER_PROFILE' | 'STORE_LISTING' | 'LOCATION_RESULT' | 'PREVIOUS_AGREEMENT' | 'COMMUNITY_KNOWLEDGE' | 'PARTNER_INFORMATION' | 'MASTER_OPINION';
export interface ExternalFactRequest { sourceKind: SourceKind; sourceDescription?: string; clientTurnId?: string }
export interface CandidateDto { title: string | null; purpose: string | null; description: string | null; agreementType: string | null; currency: string | null; amountMinor: number | null; what: string[]; who: string[]; when: string[] }
export type HandoffStatus = 'IDENTITY_REQUIRED' | 'NEEDS_RESOLUTION' | 'REVIEW_STALE' | 'READY_FOR_REVIEW' | 'READY_TO_PROGRESS' | 'PROGRESSED' | 'EXPIRED';
export interface HandoffDto {
  handoffId: string; conversationId: string; status: string; agreementCandidateSummary: CandidateDto;
  unresolvedMatters: string[]; guidanceNotes: string[]; tradeContextVersion: number;
  candidateDigest: string; expiresAt: string; progressedAgreementId: string | null;
}
export interface ContinueHandoffRequest { expectedTradeContextVersion: number; expectedCandidateDigest: string }
