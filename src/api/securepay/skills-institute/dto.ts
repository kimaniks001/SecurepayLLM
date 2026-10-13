export interface SkillsSource {
  sourceRef: string;
  sourceType: 'LEARNING_ASSET' | 'KNOWLEDGE_CORE' | 'COMMUNITY_CONTRIBUTION' | 'PROJECT_OBSERVATION' | string;
  title: string;
  excerpt: string;
  tags: string[];
  authority: string;
  visibility: 'PUBLIC' | 'COMMUNITY' | 'PRIVATE' | 'INTERNAL' | 'PROJECT_ONLY' | string;
  provenance: string;
  observedAt: string | null;
  relevance: number;
}

export interface SkillsLearningStep {
  label: string;
  reason: string;
  sourceRefs: string[];
}

export interface SkillsLearningSynthesis {
  answer: string;
  learningPath: SkillsLearningStep[];
  boundaries: string[];
  sourceRefs: string[];
}

export interface SkillsLearnResponse {
  status: 'SYNTHESIZED' | 'SOURCES_ONLY' | 'AI_UNAVAILABLE' | 'NO_MATCH';
  provider: string | null;
  message: string;
  synthesis: SkillsLearningSynthesis | null;
  sources: SkillsSource[];
}

export interface SkillsStepProgress {
  stepId: string;
  ordinal: number;
  kind: string;
  title: string;
  capabilityKey: string | null;
  evidenceRequired: boolean;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'EVIDENCE_PENDING' | 'COMPLETED' | string;
  completedAt: string | null;
}

export interface SkillsParticipation {
  id: string;
  identityId: string;
  programId: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'WITHDRAWN' | string;
  accessReference: string | null;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
  steps: SkillsStepProgress[];
}
