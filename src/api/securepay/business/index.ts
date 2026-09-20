import { segment, type HttpClient } from '../http';

/**
 * Phase 5 -- `BusinessOrganizationController` (`/api/v1/business/{businessKsNumber}/organization`).
 * Bridges a Business-typed KS identity to the existing Organization/RBAC engine (see
 * `BusinessAdministrationService`'s own doctrine comment) -- never a second membership model.
 * `BusinessOrganizationMemberResponse` deliberately carries no role/permission field: this
 * read alone cannot show what a member is authorised to do (see `AuthorizationGateway.authoritySummary`
 * for the caller's own permissions on this organization).
 */
export interface BusinessOrganizationDto { organizationId: string; businessKsNumber: string; activatedAt: string }
export interface BusinessOrganizationMemberDto { identityId: string; status: string }

export function createBusinessGateway(http: HttpClient) {
  const organization = (businessKsNumber: string) => `/api/v1/business/${segment(businessKsNumber)}/organization`;
  return {
    /** Idempotent -- activating an already-linked Business returns the existing link, never a second Organization. */
    activate: (businessKsNumber: string) => http.request<BusinessOrganizationDto>(organization(businessKsNumber), { method: 'POST', auth: 'required' }),
    get: (businessKsNumber: string) => http.request<BusinessOrganizationDto>(organization(businessKsNumber), { auth: 'required' }),
    members: (businessKsNumber: string) => http.request<BusinessOrganizationMemberDto[]>(`${organization(businessKsNumber)}/members`, { auth: 'required' }),
    inviteMember: (businessKsNumber: string, ksNumber: string) => http.request<void>(`${organization(businessKsNumber)}/members`, { method: 'POST', body: { ksNumber }, auth: 'required' }),
    /** Only the invited identity may accept their own pending invitation -- there is no "accept on someone else's behalf." */
    acceptInvitation: (businessKsNumber: string) => http.request<void>(`${organization(businessKsNumber)}/members/accept`, { method: 'POST', auth: 'required' }),
    /** Suspends (REVOKED), never deletes, the membership row. */
    removeMember: (businessKsNumber: string, identityId: string) => http.request<void>(`${organization(businessKsNumber)}/members/${segment(identityId)}/remove`, { method: 'POST', auth: 'required' }),
  };
}
export type BusinessGateway = ReturnType<typeof createBusinessGateway>;
