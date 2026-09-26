/**
 * Agreement Review -- PARTICIPANT surface only (`AgreementReviewParticipantController`, `/api/v1/agreement-reviews`). Shapes mirror the backend records
 * read in SecurePayAPI @ 75a490b. The Operations/Reviewer controller (`AgreementReviewOperationsController`) is a different authority and is deliberately
 * not modelled here. Backend enums arrive as strings: unknown values are handled by bounded copy in `features/review/display.ts`, never assumed.
 */
export type ReviewCaseState = 'OPENED' | 'AWAITING_RESPONSE' | 'EVIDENCE_COLLECTION' | 'UNDER_REVIEW' | 'DECISION_PENDING' | 'DECIDED' | 'CANCELLED' | 'EXPIRED' | 'SUPERSEDED';
export type ReviewSubjectType = 'AGREEMENT' | 'AGREEMENT_VERSION' | 'OBLIGATION' | 'DISTRIBUTION_OBLIGATION' | 'ALLOCATION' | 'EVIDENCE_ITEM' | 'RELEASE_INSTRUCTION' | 'SECUREPROMPT_DECISION';
export type ReviewParticipantRole = 'OPENER' | 'RESPONDENT' | 'AFFECTED_BENEFICIARY' | 'AFFECTED_FUNDER' | 'REVIEWER' | 'SENIOR_REVIEWER' | 'SYSTEM_ACTOR' | 'OPERATIONS_OBSERVER';
export type ReviewResponseType = 'ACKNOWLEDGEMENT' | 'DISPUTE_POSITION' | 'CLARIFICATION' | 'PARTIAL_ADMISSION';
export type ReviewOpenReasonCode = 'PARTICIPANT_DISPUTE_OBLIGATION' | 'PARTICIPANT_DISPUTE_EVIDENCE' | 'PARTICIPANT_DISPUTE_RELEASE_REQUIREMENT' | 'PARTICIPANT_DISPUTE_CONDITION';

export interface ReviewCaseSummaryResponse {
  reviewCaseId: string;
  agreementId: string;
  /** The exact Agreement version this case is bound to (immutable provenance). NOT the case `version`. */
  agreementVersionId: string;
  subjectType: string;
  subjectId: string;
  callerRole: string;
  state: string;
  openedAt: string;
  responseDeadlineAt: string | null;
  evidenceDeadlineAt: string | null;
  terminalOutcome: string | null;
  /** The Review case's OWN optimistic-concurrency revision. NOT an Agreement version number. */
  version: number;
}
export interface ReviewCaseListResponse { items: ReviewCaseSummaryResponse[]; page: number; size: number; totalElements: number }

export interface ReviewCaseDetailResponse {
  reviewCaseId: string;
  agreementId: string;
  agreementVersionId: string;
  subjectType: string;
  subjectId: string;
  callerRole: string;
  state: string;
  openedAt: string;
  responseDeadlineAt: string | null;
  evidenceDeadlineAt: string | null;
  terminalOutcome: string | null;
  decisionReasonCode: string | null;
  callerAcknowledged: boolean;
  callerResponded: boolean;
  /** The Review case's OWN optimistic-concurrency revision. NOT an Agreement version number. */
  version: number;
}

/** Idempotent participant action outcome (acknowledge, respond, escalate). */
export interface ReviewActionResponse {
  reviewCaseId: string;
  state: string;
  version: number;
  idempotentReplay: boolean;
  responseId: string | null;
  responseType: string | null;
  acknowledgedAt: string | null;
  submittedAt: string | null;
  slice8DecisionDeferred: boolean | null;
}

export interface ReviewEvidenceItemResponse {
  evidenceId: string;
  evidenceType: string;
  originalFilename: string;
  mediaType: string;
  contentLength: number;
  submittedAt: string;
  submittedByCaller: boolean;
  /** Phase 7 Slice 6 -- the SHA-256 SecurePay computed and stored with the content. */
  contentSha256Hex: string;
}
export interface ReviewEvidenceListResponse { items: ReviewEvidenceItemResponse[] }

/** ARCHAEOLOGY ONLY -- production UI never sends this: opening enrols no respondent and the Review Reserve eligibility is unreadable. */
export interface OpenReviewCaseRequest { agreementId: string; agreementVersionId: string; subjectType: ReviewSubjectType; subjectId: string; openReasonCode: ReviewOpenReasonCode; narrativeContext: string | null }
export interface OpenReviewCaseResponse { [field: string]: unknown }

export interface ReviewListParams { page?: number; size?: number; agreementId?: string; state?: ReviewCaseState; activeOnly?: boolean }
export interface AcknowledgeReviewRequest { agreementId: string; expectedVersion: number }
export interface SubmitReviewResponseRequest { agreementId: string; expectedVersion: number; responseType: ReviewResponseType; narrative: string }

/** Phase 7 Slice 6 -- evidence types SecurePay accepts (`review_case_evidence_type_check`). */
export type ReviewEvidenceType = 'DOCUMENT' | 'IMAGE' | 'RECEIPT' | 'DELIVERY_RECORD' | 'AGREEMENT_RECORD' | 'COMMUNICATION' | 'OTHER';
export interface SubmitReviewEvidenceInput { agreementId: string; evidenceType: ReviewEvidenceType; narrativeDescription: string | null; contentSha256Hex: string; file: Blob; filename: string }
/** Phase 7 Slice 6 -- `AgreementReviewEligibilityReadService.Eligibility`: backend truth, yes/no only; no balance is ever returned. */
export interface ReviewEligibilityResponse {
  agreementId: string;
  formalOpeningAvailable: boolean;
  formalOpeningUnavailableReason: string | null;
  reviewReserve: { currency: string; minimumMinor: number; eligible: boolean; reasonCode: string };
}
