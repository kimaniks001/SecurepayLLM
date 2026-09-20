import { segment, type HttpClient } from '../http';

/**
 * Phase 5 -- `AuthorizationController` (`/api/v1/authorization`). `authoritySummary` is the one real
 * source for "what am I actually allowed to do here" (Section 41's delegated-authority doctrine):
 * it always resolves to the CALLER's own identity (`rejectUntrustedActorSubstitution`), never an
 * arbitrary identity the frontend names. Role assignment beyond an Organization's founding admin is
 * real maker-checker: `initiateRoleAssignment` returns a `protectedActionId` that a DIFFERENT
 * authorised actor must separately `approve`/`reject` before `executeRoleAssignment` can apply it --
 * there is deliberately no bypass for "the same person also holds another qualifying role."
 * There is no GET listing endpoint for pending protected actions anywhere in this contract, so a
 * durable "approvals inbox" cannot be built from this alone -- see docs/PHASE5_LIFE_BUSINESS_WORLD.md.
 */
export type PermissionCode = string;

export interface AuthoritySummaryDto { identityId: string; organizationId: string; permissions: PermissionCode[] }
export interface ProtectedActionDto { protectedActionId: string }
export interface DelegationDto { delegationId: string }

export interface CreateDelegationRequest {
  organizationId: string;
  delegateIdentityId: string;
  purpose: string;
  resourceBoundaryType: string;
  resourceId?: string;
  effectiveFrom: string;
  effectiveUntil: string;
  permissions: PermissionCode[];
}

export function createAuthorizationGateway(http: HttpClient) {
  return {
    authoritySummary: (organizationId: string) => http.request<AuthoritySummaryDto>(`/api/v1/authorization/organizations/${segment(organizationId)}/authority-summary`, { auth: 'required' }),
    initiateRoleAssignment: (organizationId: string, subjectIdentityId: string, roleCode: string) =>
      http.request<ProtectedActionDto>('/api/v1/authorization/organizations/role-assignments/initiate', { method: 'POST', body: { organizationId, subjectIdentityId, roleCode }, auth: 'required' }),
    executeRoleAssignment: (protectedActionId: string, organizationId: string, subjectIdentityId: string, roleCode: string) =>
      http.request<void>('/api/v1/authorization/organizations/role-assignments/execute', { method: 'POST', body: { protectedActionId, organizationId, subjectIdentityId, roleCode }, auth: 'required' }),
    approveProtectedAction: (protectedActionId: string) => http.request<void>(`/api/v1/authorization/protected-actions/${segment(protectedActionId)}/approve`, { method: 'POST', auth: 'required' }),
    rejectProtectedAction: (protectedActionId: string) => http.request<void>(`/api/v1/authorization/protected-actions/${segment(protectedActionId)}/reject`, { method: 'POST', auth: 'required' }),
    createDelegation: (body: CreateDelegationRequest) => http.request<DelegationDto>('/api/v1/authorization/delegations', { method: 'POST', body, auth: 'required' }),
    revokeDelegation: (delegationId: string) => http.request<void>(`/api/v1/authorization/delegations/${segment(delegationId)}/revoke`, { method: 'POST', auth: 'required' }),
  };
}
export type AuthorizationGateway = ReturnType<typeof createAuthorizationGateway>;
