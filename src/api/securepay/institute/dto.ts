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
