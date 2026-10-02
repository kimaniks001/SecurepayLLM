import type { HttpClient } from '../http';
import type {
  InstituteAssetKind, InstituteKnowledgeSpaceDto, InstituteLearnResponseDto, InstituteLearningAssetDto,
  InstitutePaidProgramPackageDto, InstituteProgramDto, InstitutePublicProgramDto, InstitutePublicSessionDto, InstituteSourceDto,
  InstituteSpaceVisibility, InstituteHostKind, InstituteAccessMode, InstituteStepKind,
  InstituteParticipationDto, InstituteLearningEvidenceDto, InstituteEvidenceType, InstituteEvidenceReviewStatus,
  InstituteAccessGrantDto, InstituteGrantType, InstituteMasterBackingOfferDto, InstitutePublicMasterBackingOfferDto,
  InstituteMasterBackingType, InstituteAwarenessPackDto, InstituteKnowledgeCandidateDto,
  InstituteSessionDto, InstituteSessionKind, InstituteSessionVisibility, InstitutePaidSessionPackageDto,
  InstituteProjectObservationDto, InstituteProjectObservationType, InstituteProjectObservationVisibility,
  InstituteProjectObservationVerification, InstituteAiIndexResultDto,
} from './dto';

export function createInstituteGateway(http: HttpClient) {
  return {
    publicSearch: (q: string, tags: string[] = [], limit = 10) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      for (const tag of tags) if (tag.trim()) params.append('tags', tag.trim());
      params.set('limit', String(limit));
      return http.request<InstituteSourceDto[]>('/api/v1/institute/public/search?' + params.toString());
    },
    learn: (question: string, tags: string[] = [], sourceLimit = 10) =>
      http.request<InstituteLearnResponseDto>('/api/v1/institute/learn', {
        method: 'POST',
        body: { question, tags, sourceLimit },
        auth: 'required',
      }),
    publicPrograms: (limit = 20) =>
      http.request<InstitutePublicProgramDto[]>(`/api/v1/institute/public/programs?limit=${limit}`),
    publicSessions: (limit = 20) =>
      http.request<InstitutePublicSessionDto[]>(`/api/v1/institute/public/sessions?limit=${limit}`),
    mySpaces: () =>
      http.request<InstituteKnowledgeSpaceDto[]>('/api/v1/institute/spaces', { auth: 'required' }),
    createSpace: (body: { hostKind: InstituteHostKind; hostReference?: string | null; name: string; purpose: string; visibility: InstituteSpaceVisibility }) =>
      http.request<InstituteKnowledgeSpaceDto>('/api/v1/institute/spaces', { method: 'POST', body, auth: 'required' }),
    createPrivateProjectSpace: (projectId: string, body: { name?: string | null; purpose?: string | null; visibility: Extract<InstituteSpaceVisibility, 'PRIVATE' | 'INTERNAL'> }) =>
      http.request<InstituteKnowledgeSpaceDto>(`/api/v1/institute/project-spaces/securepay/${encodeURIComponent(projectId)}`, {
        method: 'POST', body, auth: 'required',
      }),
    createCommunityProjectSpace: (projectId: string, body: { name?: string | null; purpose?: string | null; visibility: InstituteSpaceVisibility }) =>
      http.request<InstituteKnowledgeSpaceDto>(`/api/v1/institute/project-spaces/community/${encodeURIComponent(projectId)}`, {
        method: 'POST', body, auth: 'required',
      }),
    createAsset: (body: {
      spaceId: string; kind: InstituteAssetKind; title: string; summary: string; body?: string | null;
      mediaReference?: string | null; sourceNote?: string | null;
      tags?: { type: 'TOPIC' | 'CAPABILITY' | 'INTENT' | 'LEVEL' | 'FORMAT' | 'CONTEXT' | 'RISK' | 'AUTHORITY' | 'PROJECT'; value: string }[];
      sources?: { kind: 'KNOWLEDGE_CORE' | 'COMMUNITY_CONTRIBUTION' | 'COMMUNITY_PROJECT' | 'AGREEMENT' | 'MASTER' | 'STORE' | 'EXTERNAL_REFERENCE' | 'AUTHOR_EXPERIENCE'; reference: string; label: string; provenanceNote?: string | null }[];
    }) => http.request<InstituteLearningAssetDto>('/api/v1/institute/assets', { method: 'POST', body, auth: 'required' }),
    publishAsset: (assetId: string) =>
      http.request<InstituteLearningAssetDto>(`/api/v1/institute/assets/${encodeURIComponent(assetId)}/publish`, { method: 'POST', auth: 'required' }),
    aiIndexAsset: (assetId: string) =>
      http.request<InstituteAiIndexResultDto>(`/api/v1/institute/assets/${encodeURIComponent(assetId)}/ai-index`, { method: 'POST', auth: 'required' }),
    createPaidProgramPackage: (body: { spaceId: string; initialAssetId: string; title: string; purpose: string; priceMinor: number }) =>
      http.request<InstitutePaidProgramPackageDto>('/api/v1/institute/programs/paid-package', { method: 'POST', body, auth: 'required' }),
    createProgram: (body: { spaceId: string; title: string; purpose: string; accessMode: InstituteAccessMode; commercialReference?: string | null }) =>
      http.request<InstituteProgramDto>('/api/v1/institute/programs', { method: 'POST', body, auth: 'required' }),
    addProgramStep: (programId: string, body: { ordinal: number; kind: InstituteStepKind; title: string; assetId?: string | null; capabilityKey?: string | null; evidenceRequired: boolean }) =>
      http.request<InstituteProgramDto>(`/api/v1/institute/programs/${encodeURIComponent(programId)}/steps`, { method: 'POST', body, auth: 'required' }),
    publishProgram: (programId: string) =>
      http.request<InstituteProgramDto>(`/api/v1/institute/programs/${encodeURIComponent(programId)}/publish`, { method: 'POST', auth: 'required' }),
    startProgram: (programId: string) =>
      http.request<InstituteParticipationDto>(`/api/v1/institute/programs/${encodeURIComponent(programId)}/start`, { method: 'POST', auth: 'required' }),
    activatePaidAccess: (programId: string, agreementId: string) =>
      http.request<InstituteParticipationDto>(`/api/v1/institute/programs/${encodeURIComponent(programId)}/activate-paid-access`, {
        method: 'POST', auth: 'required', body: { agreementId },
      }),
    myParticipations: () =>
      http.request<InstituteParticipationDto[]>('/api/v1/institute/participations', { auth: 'required' }),
    participation: (participationId: string) =>
      http.request<InstituteParticipationDto>(`/api/v1/institute/participations/${encodeURIComponent(participationId)}`, { auth: 'required' }),
    completeLearningStep: (participationId: string, stepId: string) =>
      http.request<InstituteParticipationDto>(`/api/v1/institute/participations/${encodeURIComponent(participationId)}/steps/${encodeURIComponent(stepId)}/complete`, { method: 'POST', auth: 'required' }),
    submitLearningEvidence: (participationId: string, stepId: string, evidenceType: InstituteEvidenceType, evidenceReference: string) =>
      http.request<InstituteLearningEvidenceDto>(`/api/v1/institute/participations/${encodeURIComponent(participationId)}/steps/${encodeURIComponent(stepId)}/evidence`, {
        method: 'POST', auth: 'required', body: { evidenceType, evidenceReference },
      }),
    completeParticipation: (participationId: string) =>
      http.request<InstituteParticipationDto>(`/api/v1/institute/participations/${encodeURIComponent(participationId)}/complete`, { method: 'POST', auth: 'required' }),
    grantProgramAccess: (programId: string, learnerIdentityId: string, grantType: InstituteGrantType, sourceReference: string) =>
      http.request<InstituteAccessGrantDto>(`/api/v1/institute/programs/${encodeURIComponent(programId)}/access-grants`, {
        method: 'POST', auth: 'required', body: { learnerIdentityId, grantType, sourceReference },
      }),
    reviewLearningEvidence: (evidenceId: string, outcome: InstituteEvidenceReviewStatus, note?: string | null) =>
      http.request<InstituteLearningEvidenceDto>(`/api/v1/institute/evidence/${encodeURIComponent(evidenceId)}/review`, {
        method: 'POST', auth: 'required', body: { outcome, note: note ?? null },
      }),
    publicMasterBacking: (capability = '', limit = 20) => {
      const params = new URLSearchParams({ capability, limit: String(limit) });
      return http.request<InstitutePublicMasterBackingOfferDto[]>('/api/v1/institute/master-backing/public?' + params.toString());
    },
    myMasterBacking: () =>
      http.request<InstituteMasterBackingOfferDto[]>('/api/v1/institute/master-backing/mine', { auth: 'required' }),
    createMasterBacking: (body: {
      capabilityKey: string; backingType: InstituteMasterBackingType; title: string;
      scopeText: string; exclusionsText: string; feeMinor?: number | null;
    }) => http.request<InstituteMasterBackingOfferDto>('/api/v1/institute/master-backing', { method: 'POST', auth: 'required', body }),
    publishMasterBacking: (offerId: string) =>
      http.request<InstituteMasterBackingOfferDto>(`/api/v1/institute/master-backing/${encodeURIComponent(offerId)}/publish`, { method: 'POST', auth: 'required' }),
    publicAwareness: (topic = '', tags: string[] = [], limit = 10) => {
      const params = new URLSearchParams();
      if (topic.trim()) params.set('topic', topic.trim());
      tags.forEach(tag => { if (tag.trim()) params.append('tags', tag.trim()); });
      params.set('limit', String(limit));
      return http.request<InstituteAwarenessPackDto>('/api/v1/institute/public/awareness?' + params.toString());
    },
    proposeKnowledgeCandidate: (assetId: string, candidateTitle: string, lessonText: string) =>
      http.request<InstituteKnowledgeCandidateDto>('/api/v1/institute/knowledge-candidates', {
        method: 'POST', auth: 'required', body: { assetId, candidateTitle, lessonText },
      }),
    submitKnowledgeCandidate: (candidateId: string) =>
      http.request<InstituteKnowledgeCandidateDto>(`/api/v1/institute/knowledge-candidates/${encodeURIComponent(candidateId)}/submit`, { method: 'POST', auth: 'required' }),
    createSession: (body: {
      spaceId: string; programId?: string | null; kind: InstituteSessionKind; title: string; description: string;
      visibility: InstituteSessionVisibility; accessMode: InstituteAccessMode; commercialReference?: string | null;
      startsAt: string; endsAt?: string | null; capacity?: number | null;
    }) => http.request<InstituteSessionDto>('/api/v1/institute/sessions', { method: 'POST', auth: 'required', body }),
    createPaidSessionPackage: (body: {
      spaceId: string; kind: InstituteSessionKind; title: string; description: string;
      visibility: InstituteSessionVisibility; startsAt: string; endsAt?: string | null;
      capacity?: number | null; priceMinor: number;
    }) => http.request<InstitutePaidSessionPackageDto>('/api/v1/institute/sessions/paid-package', { method: 'POST', auth: 'required', body }),
    scheduleSession: (sessionId: string) =>
      http.request<InstituteSessionDto>(`/api/v1/institute/sessions/${encodeURIComponent(sessionId)}/schedule`, { method: 'POST', auth: 'required' }),
    attachSessionRecording: (sessionId: string, assetId: string) =>
      http.request<InstituteSessionDto>(`/api/v1/institute/sessions/${encodeURIComponent(sessionId)}/recording`, {
        method: 'POST', auth: 'required', body: { assetId },
      }),

    projectObservations: (projectId: string) =>
      http.request<InstituteProjectObservationDto[]>(`/api/v1/institute/projects/${encodeURIComponent(projectId)}/observations`, { auth: 'required' }),
    recordProjectObservation: (projectId: string, body: {
      type: InstituteProjectObservationType; label: string; textValue?: string | null;
      numericValue?: number | null; unit?: string | null; amountMinor?: number | null;
      currency?: string | null; occurredOn?: string | null; evidenceReference?: string | null;
      visibility: InstituteProjectObservationVisibility; attributes?: Record<string, string>;
    }) =>
      http.request<InstituteProjectObservationDto>(`/api/v1/institute/projects/${encodeURIComponent(projectId)}/observations`, {
        method: 'POST', auth: 'required', body,
      }),
    reviewProjectObservation: (projectId: string, observationId: string, outcome: Exclude<InstituteProjectObservationVerification, 'REPORTED'>) =>
      http.request<InstituteProjectObservationDto>(`/api/v1/institute/projects/${encodeURIComponent(projectId)}/observations/${encodeURIComponent(observationId)}/review`, {
        method: 'POST', auth: 'required', body: { outcome },
      }),
  };
}

export type InstituteGateway = ReturnType<typeof createInstituteGateway>;
