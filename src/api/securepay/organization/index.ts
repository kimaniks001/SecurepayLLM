import { segment, type HttpClient } from '../http';

/**
 * Phase 4D (API ADR-0024) -- `OrganizationIdentityController`. An Organization KS is a non-Business collective
 * participant (a residents association, church, school, welfare group, chama and similar). This is a server-evaluated
 * fact: the signed-in person may act for this Organization now. It is re-derived by the backend on every read;
 * knowing an Organization KS Number is never evidence. `relationship` is customer-facing, never a role or permission
 * code, and no RBAC id is ever exposed.
 */
export interface OrganizationRepresentationDto {
  organizationKsNumber: string;
  displayName: string | null;
  identityType: 'ORGANIZATION';
  relationship: 'ADMINISTRATOR';
  canActFor: boolean;
  since: string;
}

export function createOrganizationGateway(http: HttpClient) {
  return {
    /**
     * Create an Organization KS; the caller becomes its administrator. One `Idempotency-Key` per logical attempt: a
     * retry after an uncertain outcome reuses it and never creates a second Organization.
     */
    create: (displayName: string, idempotencyKey: string) => http.request<OrganizationRepresentationDto>('/api/v1/organization', {
      method: 'POST', body: { displayName }, auth: 'required', headers: { 'Idempotency-Key': idempotencyKey },
    }),
    /** Only the Organizations the caller may act for, from backend authority. Businesses are never listed here. */
    mine: () => http.request<OrganizationRepresentationDto[]>('/api/v1/organization/mine', { auth: 'required' }),
    /** 404 for a missing Organization, a person, a Business and someone else's Organization alike. */
    representation: (organizationKsNumber: string) => http.request<OrganizationRepresentationDto>(
      `/api/v1/organization/${segment(organizationKsNumber)}/representation`, { auth: 'required' }),
  };
}
export type OrganizationGateway = ReturnType<typeof createOrganizationGateway>;
