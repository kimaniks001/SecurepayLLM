import { segment, type HttpClient } from '../http';
import type {
  CreateProjectRequest, ProjectCalendarDto, ProjectAgreementListDto, ProjectDto, ProjectLifecycleRequest,
  ProjectListDto, ProjectSummaryDto, UpdateProjectRequest,
} from './dto';

/**
 * SecurePay Final Completion Phase 5A -- every call here is organizational only. There is
 * deliberately no `share`, `invite`, or `member` method: no such SecurePay endpoint exists.
 */
export function createProjectGateway(http: HttpClient) {
  const project = (id: string) => `/api/v1/projects/${segment(id)}`;
  return {
    create: (body: CreateProjectRequest) => http.request<ProjectDto>('/api/v1/projects', { method: 'POST', body, auth: 'required' }),
    list: (ownerKsNumber: string, active?: boolean, query?: string) => {
      const params = new URLSearchParams({ ownerKsNumber });
      if (active !== undefined) params.set('active', String(active));
      if (query) params.set('query', query);
      return http.request<ProjectListDto>(`/api/v1/projects?${params.toString()}`, { auth: 'required' });
    },
    get: (projectId: string) => http.request<ProjectDto>(project(projectId), { auth: 'required' }),
    update: (projectId: string, body: UpdateProjectRequest) => http.request<ProjectDto>(project(projectId), { method: 'PATCH', body, auth: 'required' }),
    archive: (projectId: string, body: ProjectLifecycleRequest) => http.request<ProjectDto>(`${project(projectId)}/archive`, { method: 'POST', body, auth: 'required' }),
    restore: (projectId: string, body: ProjectLifecycleRequest) => http.request<ProjectDto>(`${project(projectId)}/restore`, { method: 'POST', body, auth: 'required' }),
    // Organizational only -- "Add to Project" / "Remove from Project." Never Agreement authority.
    addAgreement: (projectId: string, agreementId: string) => http.request<void>(`${project(projectId)}/agreements/${segment(agreementId)}`, { method: 'POST', auth: 'required' }),
    removeAgreement: (projectId: string, agreementId: string) => http.request<void>(`${project(projectId)}/agreements/${segment(agreementId)}`, { method: 'DELETE', auth: 'required' }),
    agreements: (projectId: string) => http.request<ProjectAgreementListDto>(`${project(projectId)}/agreements`, { auth: 'required' }),
    summary: (projectId: string) => http.request<ProjectSummaryDto>(`${project(projectId)}/summary`, { auth: 'required' }),
    calendar: (projectId: string) => http.request<ProjectCalendarDto>(`${project(projectId)}/calendar`, { auth: 'required' }),
  };
}
export type ProjectGateway = ReturnType<typeof createProjectGateway>;
