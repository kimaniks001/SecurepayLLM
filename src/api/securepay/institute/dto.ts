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
