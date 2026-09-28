import type { BusinessGateway, BusinessOrganizationDto, BusinessOrganizationMemberDto, BusinessRepresentationDto } from '../../api/securepay/business';
import type { CircleGateway } from '../../api/securepay/circle';
import type { CommunityGateway } from '../../api/securepay/community';
import type { BusinessMembershipResponse, OrganizationMembershipResponse } from '../../api/securepay/community/dto';
import type { OrganizationGateway, OrganizationRepresentationDto } from '../../api/securepay/organization';
import { ApiError } from '../../api/securepay/http';
import { errorText } from '../agent/controller';

export type Loadable<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; data: T | null; error: string | null };
const idle = <T>(): Loadable<T> => ({ status: 'idle', data: null, error: null });

/**
 * Phase 4B (ADR-0022) -- who you are acting as inside the Business area. `self` is always the signed-in person.
 * A `business` capacity exists only after the backend confirmed, moments ago, that this person may act for it
 * (`/business/{ks}/representation`). It is held in memory only: never in storage or the URL, and a refresh or
 * sign-out returns to `self` until the backend confirms again.
 */
export type ActingCapacity =
  | { kind: 'self' }
  | { kind: 'business'; business: BusinessRepresentationDto }
  /**
   * Phase 4D (API ADR-0024) -- an Organization KS (a residents association, church, school, welfare group...). The same
   * rule as a Business: only one the backend listed, only after the backend confirmed it again, in memory only.
   */
  | { kind: 'organization'; organization: OrganizationRepresentationDto };

export interface BusinessCreateState {
  name: string;
  busy: boolean;
  error: string | null;
  created: BusinessRepresentationDto | null;
}

export interface BusinessState {
  self: Loadable<{ ksNumber: string; displayName: string | null }>;
  businesses: Loadable<BusinessRepresentationDto[]>;
  acting: ActingCapacity;
  switchBusy: boolean;
  switchError: string | null;
  create: BusinessCreateState;
  /** Phase 4D -- the Organization KSs SecurePay confirms this person may act for (never Businesses). */
  organizations: Loadable<OrganizationRepresentationDto[]>;
  organizationCreate: OrganizationCreateState;
  /** Phase 4D -- the acting Organization KS's OWN Trust Project membership (never the person's or a Business's). */
  organizationTrustProject: Loadable<OrganizationMembershipResponse>;
  organization: Loadable<BusinessOrganizationDto>;
  members: Loadable<BusinessOrganizationMemberDto[]>;
  /** Phase 4C -- the acting Business's OWN Trust Project membership (never the person's), read from SecurePay. */
  trustProject: Loadable<BusinessMembershipResponse>;
  inviteKsInput: string;
  inviteBusy: boolean;
  inviteError: string | null;
  memberActionBusy: boolean;
  memberActionError: string | null;
}

export interface OrganizationCreateState {
  name: string;
  busy: boolean;
  error: string | null;
  created: OrganizationRepresentationDto | null;
}

export const BUSINESS_NAME_MIN = 2;
export const BUSINESS_NAME_MAX = 80;
export const NOT_CONFIRMED = 'SecurePay couldn’t confirm you can act for that Business. You are still acting as yourself.';
export const ORGANIZATION_NOT_CONFIRMED = 'SecurePay couldn’t confirm you can act for that Organization. You are still acting as yourself.';
export const ORGANIZATION_NAME_MIN = 2;
export const ORGANIZATION_NAME_MAX = 80;

const initialCreate = (): BusinessCreateState => ({ name: '', busy: false, error: null, created: null });
const initialOrganizationCreate = (): OrganizationCreateState => ({ name: '', busy: false, error: null, created: null });
const initialState = (): BusinessState => ({
  self: idle(), businesses: idle(), acting: { kind: 'self' }, switchBusy: false, switchError: null,
  create: initialCreate(), organizations: idle(), organizationCreate: initialOrganizationCreate(), organizationTrustProject: idle(),
  organization: idle(), members: idle(), trustProject: idle(),
  inviteKsInput: '', inviteBusy: false, inviteError: null, memberActionBusy: false, memberActionError: null,
});

const uncertain = (error: unknown) => error instanceof ApiError
  && (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500);

export function createErrorText(error: unknown): string {
  if (uncertain(error)) return 'SecurePay couldn’t confirm that just now. Trying again is safe and never creates a second Business.';
  if (error instanceof ApiError && error.status === 401) return 'Your session has ended. Sign in again to create a Business.';
  if (error instanceof ApiError && error.status === 403) return 'Only a personal KS Number can create a Business.';
  if (error instanceof ApiError && error.status === 409) return 'That request was already used for a different name. Check your Businesses before trying again.';
  if (error instanceof ApiError && error.status === 400) return `Give your Business a name of ${BUSINESS_NAME_MIN} to ${BUSINESS_NAME_MAX} characters.`;
  return 'That didn’t work. No Business was created.';
}

export function organizationCreateErrorText(error: unknown): string {
  if (uncertain(error)) return 'SecurePay couldn’t confirm that just now. Trying again is safe and never creates a second Organization.';
  if (error instanceof ApiError && error.status === 401) return 'Your session has ended. Sign in again to create an Organization.';
  if (error instanceof ApiError && error.status === 403) return 'Only a personal KS Number can create an Organization.';
  if (error instanceof ApiError && error.status === 409) return 'That request was already used for a different name. Check your Organizations before trying again.';
  if (error instanceof ApiError && error.status === 400) return `Give your Organization a name of ${ORGANIZATION_NAME_MIN} to ${ORGANIZATION_NAME_MAX} characters.`;
  return 'That didn’t work. No Organization was created.';
}

/**
 * Phase 5 -- Business Home, reusing the real `BusinessOrganizationController`.
 *
 * Phase 5 final correction (kept) -- role assignment to other members is not offered, because
 * `initiateRoleAssignment` requires the subject to be the caller themself (see
 * docs/PHASE5_LIFE_BUSINESS_WORLD.md section E).
 *
 * Phase 4B (ADR-0022) replaces the typed "Business KS Number" lookup and the legacy "activate as the Business
 * KS itself" affordance:
 * - the Businesses listed are exactly `GET /business/mine`, backend truth only;
 * - a new Business is created with `POST /business`, and the backend makes this person its administrator;
 * - acting for a Business is allowed only from that list, and only after the backend re-confirms it;
 * - a failed or refused confirmation leaves the person acting as themself.
 *
 * Phase 4B live finding (UR-227): `authoritySummary(organizationId)` also counts the person's org-less personal
 * roles inside the Organization, so its list is NOT "what you can do for this Business". It is no longer shown
 * here; the only authority statement is the backend-confirmed relationship from `/representation`.
 */
export function createBusinessController(gateway: {
  business: Pick<BusinessGateway, 'get' | 'members' | 'inviteMember' | 'removeMember' | 'create' | 'mine' | 'representation'>;
  circle?: Pick<CircleGateway, 'me'>;
  trustProject?: Pick<CommunityGateway['membership'], 'business'> & Partial<Pick<CommunityGateway['membership'], 'organization'>>;
  /** Phase 4D -- Organization KS onboarding and representation. Absent: no Organization capacity is offered at all. */
  organization?: Pick<OrganizationGateway, 'create' | 'mine' | 'representation'>;
}, newKey: () => string = () => `business-create-${crypto.randomUUID()}`,
newOrganizationKey: () => string = () => `organization-create-${crypto.randomUUID()}`) {
  let state: BusinessState = initialState();
  const listeners = new Set<() => void>();
  const update = (patch: Partial<BusinessState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };
  // One key per logical creation: a retry after an uncertain outcome reuses it and can never create twice.
  let createKey: string | null = null;
  let createKeyName: string | null = null;
  let organizationCreateKey: string | null = null;
  let organizationCreateKeyName: string | null = null;

  async function loadMembers(businessKsNumber: string) {
    update({ members: { status: 'loading', data: null, error: null } });
    try {
      const members = await gateway.business.members(businessKsNumber);
      update({ members: { status: 'ready', data: members, error: null } });
    } catch (error) {
      update({ members: { status: 'error', data: null, error: errorText(error) } });
    }
  }

  async function loadTrustProject(businessKsNumber: string) {
    if (!gateway.trustProject) return;
    update({ trustProject: { status: 'loading', data: null, error: null } });
    try {
      update({ trustProject: { status: 'ready', data: await gateway.trustProject.business(businessKsNumber), error: null } });
    } catch (error) {
      update({ trustProject: { status: 'error', data: null, error: errorText(error) } });
    }
  }

  async function loadOrganizationTrustProject(organizationKsNumber: string) {
    if (!gateway.trustProject?.organization) return;
    update({ organizationTrustProject: { status: 'loading', data: null, error: null } });
    try {
      update({ organizationTrustProject: { status: 'ready', data: await gateway.trustProject.organization(organizationKsNumber), error: null } });
    } catch (error) {
      update({ organizationTrustProject: { status: 'error', data: null, error: errorText(error) } });
    }
  }

  function actAsSelf() {
    update({ acting: { kind: 'self' }, switchError: null, organization: idle(), members: idle(), trustProject: idle(), organizationTrustProject: idle(), inviteKsInput: '', inviteError: null, memberActionError: null });
  }

  async function loadMineOrganizations() {
    if (!gateway.organization) return;
    update({ organizations: { status: 'loading', data: state.organizations.data, error: null } });
    try {
      const organizations = await gateway.organization.mine();
      update({ organizations: { status: 'ready', data: organizations, error: null } });
      // A capacity the backend no longer lists is dropped at once -- never kept from memory.
      if (state.acting.kind === 'organization') {
        const current = state.acting.organization.organizationKsNumber;
        if (!organizations.some(o => o.organizationKsNumber === current)) actAsSelf();
      }
    } catch (error) {
      update({ organizations: { status: 'error', data: null, error: errorText(error) } });
    }
  }

  async function loadMine() {
    update({ businesses: { status: 'loading', data: state.businesses.data, error: null } });
    try {
      const businesses = await gateway.business.mine();
      update({ businesses: { status: 'ready', data: businesses, error: null } });
      // A capacity the backend no longer lists is dropped at once -- never kept from memory.
      if (state.acting.kind === 'business') {
        const current = state.acting.business.businessKsNumber;
        if (!businesses.some(b => b.businessKsNumber === current)) actAsSelf();
      }
    } catch (error) {
      update({ businesses: { status: 'error', data: null, error: errorText(error) } });
    }
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    /** Entering the Business area: who you are, and the Businesses the backend says you can act for. */
    async enter() {
      if (gateway.circle && state.self.status !== 'ready') {
        update({ self: { status: 'loading', data: null, error: null } });
        try {
          const me = await gateway.circle.me();
          update({ self: { status: 'ready', data: { ksNumber: me.canonicalKsNumber, displayName: me.displayName ?? null }, error: null } });
        } catch (error) {
          update({ self: { status: 'error', data: null, error: errorText(error) } });
        }
      }
      await Promise.all([loadMine(), loadMineOrganizations()]);
    },
    /** Re-read everything this person may act for (Businesses and Organizations) from the backend. */
    async loadMine() { await Promise.all([loadMine(), loadMineOrganizations()]); },

    /**
     * Act for a Business -- only one the backend listed, and only once the backend confirms it again now.
     * Anything else (not listed, 404, 403, network) leaves the person acting as themself.
     */
    async actAsBusiness(businessKsNumber: string) {
      if (state.switchBusy) return;
      const listed = state.businesses.data?.some(b => b.businessKsNumber === businessKsNumber) ?? false;
      if (!listed) {
        update({ acting: { kind: 'self' }, switchError: NOT_CONFIRMED });
        return;
      }
      update({ switchBusy: true, switchError: null });
      let confirmed: BusinessRepresentationDto;
      try {
        confirmed = await gateway.business.representation(businessKsNumber);
        if (!confirmed.canActFor || confirmed.businessKsNumber !== businessKsNumber) throw new Error('not confirmed');
      } catch {
        update({ switchBusy: false, acting: { kind: 'self' }, switchError: NOT_CONFIRMED, organization: idle(), members: idle(), trustProject: idle() });
        await loadMine();
        return;
      }
      update({ switchBusy: false, acting: { kind: 'business', business: confirmed }, organization: { status: 'loading', data: null, error: null }, members: idle(), trustProject: idle(), organizationTrustProject: idle() });
      void loadTrustProject(businessKsNumber);
      try {
        const organization = await gateway.business.get(businessKsNumber);
        update({ organization: { status: 'ready', data: organization, error: null } });
        await loadMembers(businessKsNumber);
      } catch (error) {
        update({ organization: { status: 'error', data: null, error: errorText(error) } });
      }
    },

    actAsSelf,

    /**
     * Phase 4D -- act for an Organization KS: only one the backend listed, and only once the backend confirms it again
     * now. Anything else (not listed, 404, 403, network) leaves the person acting as themself.
     */
    async actAsOrganization(organizationKsNumber: string) {
      if (state.switchBusy || !gateway.organization) return;
      const listed = state.organizations.data?.some(o => o.organizationKsNumber === organizationKsNumber) ?? false;
      if (!listed) {
        update({ acting: { kind: 'self' }, switchError: ORGANIZATION_NOT_CONFIRMED });
        return;
      }
      update({ switchBusy: true, switchError: null });
      let confirmed: OrganizationRepresentationDto;
      try {
        confirmed = await gateway.organization.representation(organizationKsNumber);
        if (!confirmed.canActFor || confirmed.organizationKsNumber !== organizationKsNumber || confirmed.identityType !== 'ORGANIZATION') {
          throw new Error('not confirmed');
        }
      } catch {
        update({ switchBusy: false, acting: { kind: 'self' }, switchError: ORGANIZATION_NOT_CONFIRMED, organization: idle(), members: idle(), trustProject: idle(), organizationTrustProject: idle() });
        await loadMineOrganizations();
        return;
      }
      // An Organization has no Business member management here: only who it is and its own Trust Project membership.
      update({ switchBusy: false, acting: { kind: 'organization', organization: confirmed }, organization: idle(), members: idle(), trustProject: idle(), organizationTrustProject: idle() });
      await loadOrganizationTrustProject(organizationKsNumber);
    },

    /** Re-read the acting Business's or Organization's Trust Project membership (e.g. after the Join page). */
    async refreshTrustProject() {
      if (state.acting.kind === 'business') await loadTrustProject(state.acting.business.businessKsNumber);
      if (state.acting.kind === 'organization') await loadOrganizationTrustProject(state.acting.organization.organizationKsNumber);
    },

    setOrganizationCreateName(name: string) { update({ organizationCreate: { ...state.organizationCreate, name, error: null, created: null } }); },

    async createOrganization() {
      if (!gateway.organization) return;
      const name = state.organizationCreate.name.trim().replace(/\s+/g, ' ');
      if (state.organizationCreate.busy) return;
      if (name.length < ORGANIZATION_NAME_MIN || name.length > ORGANIZATION_NAME_MAX) {
        update({ organizationCreate: { ...state.organizationCreate, error: `Give your Organization a name of ${ORGANIZATION_NAME_MIN} to ${ORGANIZATION_NAME_MAX} characters.` } });
        return;
      }
      // A different name is a different logical request, so it gets a new key.
      if (!organizationCreateKey || organizationCreateKeyName !== name) { organizationCreateKey = newOrganizationKey(); organizationCreateKeyName = name; }
      update({ organizationCreate: { ...state.organizationCreate, busy: true, error: null, created: null } });
      try {
        const created = await gateway.organization.create(name, organizationCreateKey);
        organizationCreateKey = null; organizationCreateKeyName = null;
        update({ organizationCreate: { name: '', busy: false, error: null, created } });
        await loadMineOrganizations();
      } catch (error) {
        if (!uncertain(error)) { organizationCreateKey = null; organizationCreateKeyName = null; }
        update({ organizationCreate: { ...state.organizationCreate, busy: false, error: organizationCreateErrorText(error) } });
      }
    },

    setCreateName(name: string) { update({ create: { ...state.create, name, error: null, created: null } }); },

    async createBusiness() {
      const name = state.create.name.trim().replace(/\s+/g, ' ');
      if (state.create.busy) return;
      if (name.length < BUSINESS_NAME_MIN || name.length > BUSINESS_NAME_MAX) {
        update({ create: { ...state.create, error: `Give your Business a name of ${BUSINESS_NAME_MIN} to ${BUSINESS_NAME_MAX} characters.` } });
        return;
      }
      // A different name is a different logical request, so it gets a new key.
      if (!createKey || createKeyName !== name) { createKey = newKey(); createKeyName = name; }
      update({ create: { ...state.create, busy: true, error: null, created: null } });
      try {
        const created = await gateway.business.create(name, createKey);
        createKey = null; createKeyName = null;
        update({ create: { name: '', busy: false, error: null, created } });
        await loadMine();
      } catch (error) {
        if (!uncertain(error)) { createKey = null; createKeyName = null; }
        update({ create: { ...state.create, busy: false, error: createErrorText(error) } });
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
        await loadMembers(businessKsNumber);
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
        // Removing someone (including yourself) can end your own authority -- re-read it from the backend first.
        await loadMine();
        if (state.acting.kind === 'business') await loadMembers(businessKsNumber);
      } catch (error) {
        update({ memberActionBusy: false, memberActionError: errorText(error) });
      }
    },

    /** Sign-out: nothing about one person's Businesses or capacity may carry over to the next. */
    reset() {
      createKey = null; createKeyName = null; organizationCreateKey = null; organizationCreateKeyName = null;
      state = initialState(); listeners.forEach(l => l());
    },
  };
}
export type BusinessController = ReturnType<typeof createBusinessController>;
