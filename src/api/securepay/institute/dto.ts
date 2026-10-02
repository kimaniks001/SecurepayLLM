export type InstituteSourceType =
  | 'LEARNING_ASSET'
  | 'KNOWLEDGE_CORE'
  | 'COMMUNITY_CONTRIBUTION'
  | 'PROJECT_OBSERVATION';

export interface InstituteSourceDto {
  sourceRef: string;
  sourceType: InstituteSourceType;
  title: string;
  excerpt: string;
  tags: string[];
  authority: string;
  visibility: 'PUBLIC' | 'COMMUNITY' | 'PRIVATE' | 'INTERNAL' | 'PROJECT_ONLY';
  provenance: string;
  observedAt: string | null;
  relevance: number;
}

export interface InstituteLearningStepDto {
  label: string;
  reason: string;
  sourceRefs: string[];
}

export interface InstituteLearningSynthesisDto {
  answer: string;
  learningPath: InstituteLearningStepDto[];
  boundaries: string[];
  sourceRefs: string[];
}

export interface InstituteLearnResponseDto {
  status: 'SYNTHESIZED' | 'SOURCES_ONLY' | 'AI_UNAVAILABLE' | 'NO_MATCH';
  provider: string;
  message: string;
  synthesis: InstituteLearningSynthesisDto | null;
  sources: InstituteSourceDto[];
}


export type InstituteHostKind = 'INSTITUTE' | 'TRUST_PROJECT' | 'PERSONAL' | 'MASTER' | 'BUSINESS' | 'COMMUNITY' | 'PROJECT';
export type InstituteSpaceVisibility = 'PUBLIC' | 'COMMUNITY' | 'PRIVATE' | 'INTERNAL';
export type InstituteAssetKind =
  | 'ARTICLE' | 'LESSON' | 'GUIDE' | 'VIDEO' | 'AUDIO' | 'PODCAST' | 'DOCUMENT'
  | 'EXERCISE' | 'CASE_STUDY' | 'CHECKLIST' | 'TOOL' | 'TEMPLATE' | 'ASSESSMENT'
  | 'PRACTICAL_TASK' | 'PROJECT_RECORD';

export interface InstituteKnowledgeSpaceDto {
  id: string;
  ownerIdentityId: string;
  hostKind: InstituteHostKind;
  hostReference: string | null;
  name: string;
  purpose: string;
  visibility: InstituteSpaceVisibility;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface InstituteAssetTagDto {
  type: 'TOPIC' | 'CAPABILITY' | 'INTENT' | 'LEVEL' | 'FORMAT' | 'CONTEXT' | 'RISK' | 'AUTHORITY' | 'PROJECT';
  value: string;
}
export interface InstituteSourceLinkDto {
  kind: 'KNOWLEDGE_CORE' | 'COMMUNITY_CONTRIBUTION' | 'COMMUNITY_PROJECT' | 'AGREEMENT' | 'MASTER' | 'STORE' | 'EXTERNAL_REFERENCE' | 'AUTHOR_EXPERIENCE';
  reference: string;
  label: string;
  provenanceNote?: string | null;
}
export interface InstituteLearningAssetDto {
  id: string;
  spaceId: string;
  authorIdentityId: string;
  kind: InstituteAssetKind;
  title: string;
  summary: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  tags: InstituteAssetTagDto[];
  sources: InstituteSourceLinkDto[];
}

export type InstituteAccessMode = 'FREE' | 'SPONSORED' | 'PAID' | 'INVITE_ONLY';
export type InstituteStepKind =
  | 'LEARN' | 'DISCUSS' | 'ATTEND' | 'PRACTISE' | 'SUBMIT_EVIDENCE' | 'ASSESSMENT'
  | 'SUPERVISED_WORK' | 'MASTER_REVIEW' | 'AGREEMENT_WORK' | 'APPRENTICESHIP' | 'TEACH';

export interface InstituteProgramStepDto {
  id: string;
  programId: string;
  ordinal: number;
  kind: InstituteStepKind;
  title: string;
  assetId: string | null;
  capabilityKey: string | null;
  evidenceRequired: boolean;
  createdAt: string;
}
export interface InstituteProgramDto {
  id: string;
  spaceId: string;
  authorIdentityId: string;
  title: string;
  purpose: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  accessMode: InstituteAccessMode;
  commercialReference: string | null;
  createdAt: string;
  updatedAt: string;
  steps: InstituteProgramStepDto[];
}
export interface InstitutePublicProgramDto {
  id: string;
  title: string;
  purpose: string;
  accessMode: InstituteAccessMode;
  commercialReference: string | null;
}

export interface InstitutePublicSessionDto {
  id: string;
  kind: 'PUBLIC_TALK' | 'LIVE_CLASS' | 'PRIVATE_SESSION' | 'WORKSHOP' | 'COHORT' | 'MENTORING' | 'REVIEW' | 'PODCAST_LIVE';
  title: string;
  description: string;
  accessMode: InstituteAccessMode;
  commercialReference: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  recordingAssetId: string | null;
}


export interface InstitutePaidProgramPackageDto {
  program: InstituteProgramDto;
  storeOfferId: string;
  priceMinor: number;
  currency: string;
}


export type InstituteParticipationStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'WITHDRAWN';
export type InstituteStepProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'EVIDENCE_PENDING' | 'COMPLETED';
export type InstituteEvidenceType =
  | 'PRACTICE' | 'WORK_SAMPLE' | 'OBSERVATION' | 'ASSESSMENT'
  | 'MASTER_REVIEW' | 'PROJECT_EVIDENCE' | 'AGREEMENT_WORK';
export type InstituteEvidenceReviewStatus = 'SUBMITTED' | 'ACCEPTED' | 'MORE_WORK_REQUIRED' | 'REJECTED';

export interface InstituteStepProgressDto {
  stepId: string;
  ordinal: number;
  kind: InstituteStepKind;
  title: string;
  capabilityKey: string | null;
  evidenceRequired: boolean;
  status: InstituteStepProgressStatus;
  completedAt: string | null;
}

export interface InstituteParticipationDto {
  id: string;
  identityId: string;
  programId: string;
  status: InstituteParticipationStatus;
  accessReference: string | null;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
  steps: InstituteStepProgressDto[];
}

export interface InstituteLearningEvidenceDto {
  id: string;
  participationId: string;
  stepId: string;
  evidenceType: InstituteEvidenceType;
  evidenceReference: string;
  reviewStatus: InstituteEvidenceReviewStatus;
  reviewNote: string | null;
  reviewedByIdentityId: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export type InstituteGrantType = 'SPONSORED' | 'INVITE_ONLY' | 'PAID_CONFIRMED';

export interface InstituteAccessGrantDto {
  id: string;
  programId: string;
  learnerIdentityId: string;
  grantedByIdentityId: string;
  grantType: InstituteGrantType;
  sourceReference: string;
  status: 'ACTIVE' | 'REVOKED' | 'CONSUMED';
  createdAt: string;
  updatedAt: string;
}

export type InstituteMasterBackingType =
  | 'SUPERVISION' | 'REVIEW_BEFORE_DELIVERY' | 'MILESTONE_REVIEW' | 'FINAL_SIGN_OFF' | 'MENTOR_ON_CALL';

export interface InstituteMasterBackingOfferDto {
  id: string;
  masterIdentityId: string;
  capabilityKey: string;
  backingType: InstituteMasterBackingType;
  title: string;
  scopeText: string;
  exclusionsText: string;
  feeMinor: number | null;
  currency: string | null;
  storeOfferReference: string | null;
  agreementRequired: boolean;
  status: 'DRAFT' | 'AVAILABLE' | 'PAUSED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export interface InstitutePublicMasterBackingOfferDto {
  id: string;
  capabilityKey: string;
  backingType: InstituteMasterBackingType;
  title: string;
  scopeText: string;
  exclusionsText: string;
  feeMinor: number | null;
  currency: string | null;
  storeOfferReference: string | null;
}

export interface InstituteAwarenessPackDto {
  topic: string;
  note: string;
  sources: InstituteSourceDto[];
}

export interface InstituteKnowledgeCandidateDto {
  id: string;
  circleId: string | null;
  sourceType: string;
  sourceReference: string;
  title: string;
  lessonText: string;
  status: 'CAPTURED' | 'SUBMITTED_FOR_REVIEW' | 'LINKED_TO_KNOWLEDGE_RECORD' | 'REJECTED';
  knowledgeRecordId: string | null;
  createdAt: string;
  updatedAt: string;
}


export type InstituteSessionKind =
  | 'PUBLIC_TALK' | 'LIVE_CLASS' | 'PRIVATE_SESSION' | 'WORKSHOP'
  | 'COHORT' | 'MENTORING' | 'REVIEW' | 'PODCAST_LIVE';

export type InstituteSessionVisibility = 'PUBLIC' | 'COMMUNITY' | 'PRIVATE';

export interface InstituteSessionDto {
  id: string;
  spaceId: string;
  programId: string | null;
  hostIdentityId: string;
  kind: InstituteSessionKind;
  title: string;
  description: string;
  visibility: InstituteSessionVisibility;
  accessMode: InstituteAccessMode;
  commercialReference: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  status: 'DRAFT' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  recordingAssetId: string | null;
  createdAt: string;
  updatedAt: string;
}


export interface InstitutePaidSessionPackageDto {
  session: InstituteSessionDto;
  storeOfferId: string;
  priceMinor: number;
  currency: string;
}


export type InstituteProjectObservationType =
  | 'COST' | 'MATERIAL' | 'TIME' | 'WASTE' | 'SAFETY' | 'LOGISTICS' | 'DECISION'
  | 'ISSUE' | 'CORRECTION' | 'OUTCOME' | 'MAINTENANCE' | 'ENVIRONMENT' | 'SKILL' | 'OTHER';

export type InstituteProjectObservationVisibility = 'PUBLIC' | 'COMMUNITY' | 'PROJECT_ONLY';
export type InstituteProjectObservationVerification = 'REPORTED' | 'VERIFIED' | 'DISPUTED';

export interface InstituteProjectObservationDto {
  id: string;
  projectId: string;
  recordedByIdentityId: string;
  type: InstituteProjectObservationType;
  label: string;
  textValue: string | null;
  numericValue: number | null;
  unit: string | null;
  amountMinor: number | null;
  currency: string | null;
  occurredOn: string | null;
  evidenceReference: string | null;
  visibility: InstituteProjectObservationVisibility;
  attributes: Record<string, string>;
  verificationStatus: InstituteProjectObservationVerification;
  verifiedByIdentityId: string | null;
  verifiedAt: string | null;
  createdAt: string;
}


export interface InstituteAiIndexedTagDto {
  type: string;
  value: string;
  reason: string | null;
  origin: 'AI_SUGGESTED';
}

export interface InstituteAiIndexResultDto {
  assetId: string;
  provider: string;
  indexedAt: string;
  tags: InstituteAiIndexedTagDto[];
}
