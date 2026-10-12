import type { HttpClient } from '../http';
import type { SkillsLearnResponse, SkillsParticipation, SkillsSource } from './dto';

export function createSkillsInstituteGateway(http: HttpClient) {
  return {
    publicSearch: (query: string, limit = 10): Promise<SkillsSource[]> =>
      http.request<SkillsSource[]>(`/api/v1/institute/public/search?q=${encodeURIComponent(query)}&limit=${Math.max(1, Math.min(24, limit))}`),
    search: (query: string, limit = 10): Promise<SkillsSource[]> =>
      http.request<SkillsSource[]>(`/api/v1/institute/search?q=${encodeURIComponent(query)}&limit=${Math.max(1, Math.min(24, limit))}`, { auth: 'required' }),
    learn: (question: string, tags: string[] = [], sourceLimit = 10): Promise<SkillsLearnResponse> =>
      http.request<SkillsLearnResponse>('/api/v1/institute/learn', {
        method: 'POST',
        auth: 'required',
        body: { question, tags, sourceLimit },
      }),
    mine: (): Promise<SkillsParticipation[]> =>
      http.request<SkillsParticipation[]>('/api/v1/institute/participations', { auth: 'required' }),
    participation: (participationId: string): Promise<SkillsParticipation> =>
      http.request<SkillsParticipation>(`/api/v1/institute/participations/${encodeURIComponent(participationId)}`, { auth: 'required' }),
  };
}

export type SkillsInstituteGateway = ReturnType<typeof createSkillsInstituteGateway>;
export type * from './dto';
