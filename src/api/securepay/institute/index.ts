import type { HttpClient } from '../http';
import type { InstituteLearnResponseDto, InstituteSourceDto } from './dto';

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
  };
}

export type InstituteGateway = ReturnType<typeof createInstituteGateway>;
