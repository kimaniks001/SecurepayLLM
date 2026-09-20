import type { BusinessGateway, BusinessOrganizationDto, BusinessOrganizationMemberDto } from '../../api/securepay/business';
import type { AuthorizationGateway, AuthoritySummaryDto } from '../../api/securepay/authorization';
import { errorText } from '../agent/controller';

export type Loadable<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; data: T | null; error: string | null };
const idle = <T>(): Loadable<T> => ({ status: 'idle', data: null, error: null });

export interface BusinessState {
  businessKsNumber: string;
  organization: Loadable<BusinessOrganizationDto>;
  members: Loadable<BusinessOrganizationMemberDto[]>;
  authority: Loadable<AuthoritySummaryDto>;
  inviteKsInput: string;
  inviteBusy: boolean;
  inviteError: string | null;
  memberActionBusy: boolean;
  memberActionError: string | null;
  roleAssignmentInput: { subjectIdentityId: string; roleCode: string };
  roleAssignmentBusy: boolean;
  roleAssignmentError: string | null;
  /** Session-local only -- the protectedActionId a role-assignment initiate just returned, so the
   * person can hand it to whoever must approve it. There is no backend listing endpoint for pending
   * protected actions (confirmed absent), so this is never presented as a durable "approvals inbox." */
  lastInitiatedProtectedActionId: string | null;
}

/**
 * Phase 5 -- Business Home. Reuses the real `BusinessOrganizationController` +
 * `AuthorizationController` engines directly -- no second membership/authority model. Membership
 * status alone is never treated as full authority: `authoritySummary` is the one real source for
 * "what can I actually do here," shown separately from the plain member list, which carries no
 * role/permission field at all (see `BusinessOrganizationMemberResponse`'s own narrow shape).
 */
export function createBusinessController(gateway: {
  business: Pick<BusinessGateway, 'get' | 'activate' | 'members' | 'inviteMember' | 'removeMember'>;
  authorization: Pick<AuthorizationGateway, 'authoritySummary' | 'initiateRoleAssignment'>;
}) {
  let state: BusinessState = {
    businessKsNumber: '', organization: idle(), members: idle(), authority: idle(),
    inviteKsInput: '', inviteBusy: false, inviteError: null,
    memberActionBusy: false, memberActionError: null,
    roleAssignmentInput: { subjectIdentityId: '', roleCode: '' }, roleAssignmentBusy: false, roleAssignmentError: null,
    lastInitiatedProtectedActionId: null,
  };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<BusinessState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };

  async function loadMembersAndAuthority(businessKsNumber: string, organizationId: string) {
    update({ members: { status: 'loading', data: null, error: null }, authority: { status: 'loading', data: null, error: null } });
    try {
      const members = await gateway.business.members(businessKsNumber);
      update({ members: { status: 'ready', data: members, error: null } });
    } catch (error) {
      update({ members: { status: 'error', data: null, error: errorText(error) } });
    }
    try {
      const authority = await gateway.authorization.authoritySummary(organizationId);
      update({ authority: { status: 'ready', data: authority, error: null } });
    } catch (error) {
      update({ authority: { status: 'error', data: null, error: errorText(error) } });
    }
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    setBusinessKsNumber(value: string) { update({ businessKsNumber: value }); },

    async load(businessKsNumber: string) {
      update({ businessKsNumber, organization: { status: 'loading', data: null, error: null }, members: idle(), authority: idle() });
      try {
        const organization = await gateway.business.get(businessKsNumber);
        update({ organization: { status: 'ready', data: organization, error: null } });
        await loadMembersAndAuthority(businessKsNumber, organization.organizationId);
      } catch (error) {
        update({ organization: { status: 'error', data: null, error: errorText(error) } });
      }
    },

    /** Idempotent -- activating an already-linked Business just returns the existing organization. */
    async activate(businessKsNumber: string) {
      update({ businessKsNumber, organization: { status: 'loading', data: null, error: null }, members: idle(), authority: idle() });
      try {
        const organization = await gateway.business.activate(businessKsNumber);
        update({ organization: { status: 'ready', data: organization, error: null } });
        await loadMembersAndAuthority(businessKsNumber, organization.organizationId);
      } catch (error) {
        update({ organization: { status: 'error', data: null, error: errorText(error) } });
      }
    },

    setInviteKsInput(value: string) { update({ inviteKsInput: value, inviteError: null }); },

    async inviteMember() {
      const businessKsNumber = state.organization.data?.businessKsNumber;
      if (!businessKsNumber || !state.inviteKsInput.trim() || state.inviteBusy) return;
      update({ inviteBusy: true, inviteError: null });
      try {
        await gateway.business.inviteMember(businessKsNumber, state.inviteKsInput.trim());
        update({ inviteBusy: false, inviteKsInput: '' });
        await loadMembersAndAuthority(businessKsNumber, state.organization.data!.organizationId);
      } catch (error) {
        update({ inviteBusy: false, inviteError: errorText(error) });
      }
    },

    async removeMember(identityId: string) {
      const businessKsNumber = state.organization.data?.businessKsNumber;
      if (!businessKsNumber || state.memberActionBusy) return;
      update({ memberActionBusy: true, memberActionError: null });
      try {
        await gateway.business.removeMember(businessKsNumber, identityId);
        update({ memberActionBusy: false });
        await loadMembersAndAuthority(businessKsNumber, state.organization.data!.organizationId);
      } catch (error) {
        update({ memberActionBusy: false, memberActionError: errorText(error) });
      }
    },

    setRoleAssignmentInput(patch: Partial<BusinessState['roleAssignmentInput']>) {
      update({ roleAssignmentInput: { ...state.roleAssignmentInput, ...patch }, roleAssignmentError: null });
    },

    /**
     * Real maker-checker: this only INITIATES the assignment, returning a protectedActionId a
     * DIFFERENT authorised actor must separately approve before it takes effect. This screen never
     * claims the role is granted the moment this call succeeds.
     */
    async initiateRoleAssignment() {
      const organizationId = state.organization.data?.organizationId;
      const { subjectIdentityId, roleCode } = state.roleAssignmentInput;
      if (!organizationId || !subjectIdentityId.trim() || !roleCode.trim() || state.roleAssignmentBusy) return;
      update({ roleAssignmentBusy: true, roleAssignmentError: null, lastInitiatedProtectedActionId: null });
      try {
        const result = await gateway.authorization.initiateRoleAssignment(organizationId, subjectIdentityId.trim(), roleCode.trim());
        update({ roleAssignmentBusy: false, lastInitiatedProtectedActionId: result.protectedActionId, roleAssignmentInput: { subjectIdentityId: '', roleCode: '' } });
      } catch (error) {
        update({ roleAssignmentBusy: false, roleAssignmentError: errorText(error) });
      }
    },
  };
}
export type BusinessController = ReturnType<typeof createBusinessController>;
