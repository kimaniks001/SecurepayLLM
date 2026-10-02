import type { HttpClient } from '../http';
import type {
  InstituteAssetKind, InstituteKnowledgeSpaceDto, InstituteLearnResponseDto, InstituteLearningAssetDto,
  InstitutePaidProgramPackageDto, InstituteProgramDto, InstitutePublicProgramDto, InstitutePublicSessionDto, InstituteSourceDto,
  InstituteSpaceVisibility, InstituteHostKind, InstituteAccessMode, InstituteStepKind,
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
    createSpace: (body: { hostKind: InstituteHostKind; hostReference?: string | null; name: string; purpose: string; visibility: InstituteSpaceVisibility }) =>
      http.request<InstituteKnowledgeSpaceDto>('/api/v1/institute/spaces', { method: 'POST', body, auth: 'required' }),
    createAsset: (body: {
      spaceId: string; kind: InstituteAssetKind; title: string; summary: string; body?: string | null;
      mediaReference?: string | null; sourceNote?: string | null;
      tags?: { type: 'TOPIC' | 'CAPABILITY' | 'INTENT' | 'LEVEL' | 'FORMAT' | 'CONTEXT' | 'RISK' | 'AUTHORITY' | 'PROJECT'; value: string }[];
      sources?: { kind: 'KNOWLEDGE_CORE' | 'COMMUNITY_CONTRIBUTION' | 'COMMUNITY_PROJECT' | 'AGREEMENT' | 'MASTER' | 'STORE' | 'EXTERNAL_REFERENCE' | 'AUTHOR_EXPERIENCE'; reference: string; label: string; provenanceNote?: string | null }[];
    }) => http.request<InstituteLearningAssetDto>('/api/v1/institute/assets', { method: 'POST', body, auth: 'required' }),
    publishAsset: (assetId: string) =>
      http.request<InstituteLearningAssetDto>(`/api/v1/institute/assets/${encodeURIComponent(assetId)}/publish`, { method: 'POST', auth: 'required' }),
    createPaidProgramPackage: (body: { spaceId: string; initialAssetId: string; title: string; purpose: string; priceMinor: number }) =>
      http.request<InstitutePaidProgramPackageDto>('/api/v1/institute/programs/paid-package', { method: 'POST', body, auth: 'required' }),
    createProgram: (body: { spaceId: string; title: string; purpose: string; accessMode: InstituteAccessMode; commercialReference?: string | null }) =>
      http.request<InstituteProgramDto>('/api/v1/institute/programs', { method: 'POST', body, auth: 'required' }),
    addProgramStep: (programId: string, body: { ordinal: number; kind: InstituteStepKind; title: string; assetId?: string | null; capabilityKey?: string | null; evidenceRequired: boolean }) =>
      http.request<InstituteProgramDto>(`/api/v1/institute/programs/${encodeURIComponent(programId)}/steps`, { method: 'POST', body, auth: 'required' }),
    publishProgram: (programId: string) =>
      http.request<InstituteProgramDto>(`/api/v1/institute/programs/${encodeURIComponent(programId)}/publish`, { method: 'POST', auth: 'required' }),
  };
}

export type InstituteGateway = ReturnType<typeof createInstituteGateway>;
