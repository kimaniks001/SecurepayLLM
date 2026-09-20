import type { CircleGateway } from '../../api/securepay/circle';
import { circleProfileView, type CircleProfileView } from '../../api/securepay/circle/adapters';
import type { BusinessGateway, BusinessOrganizationDto } from '../../api/securepay/business';
import type { AuthorizationGateway, AuthoritySummaryDto } from '../../api/securepay/authorization';
import { errorText } from '../agent/controller';

export type Loadable<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; data: T | null; error: string | null };
const idle = <T>(): Loadable<T> => ({ status: 'idle', data: null, error: null });

export interface AccountState {
  identity: Loadable<CircleProfileView>;
  businessKsInput: string;
  business: Loadable<BusinessOrganizationDto>;
  authority: Loadable<AuthoritySummaryDto>;
  logoutAllBusy: boolean;
  logoutAllError: string | null;
  logoutAllDone: boolean;
}

/**
 * Phase 5 -- Account. Personal identity is read once via the existing, already-proven, self-scoped
 * `GET /circle/me` (the closest real "who am I" read this codebase already trusts elsewhere -- see
 * CircleExperience). A Business membership is a SEPARATE, explicit lookup: there is no backend index
 * of "which Businesses do I belong to" (confirmed absent -- see docs/PHASE5_LIFE_BUSINESS_WORLD.md),
 * so the person names the Business KS Number they administer, exactly like Projects/Vision Board's
 * own "manage a different KS" convention. `authoritySummary` always resolves to the caller's own
 * identity server-side (`rejectUntrustedActorSubstitution`) -- it can never be used to read someone
 * else's permissions.
 */
export function createAccountController(gateway: {
  circle: Pick<CircleGateway, 'me'>;
  business: Pick<BusinessGateway, 'get'>;
  authorization: Pick<AuthorizationGateway, 'authoritySummary'>;
  logoutAll: () => Promise<void>;
}) {
  let state: AccountState = {
    identity: idle(), businessKsInput: '', business: idle(), authority: idle(),
    logoutAllBusy: false, logoutAllError: null, logoutAllDone: false,
  };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<AccountState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    async load() {
      update({ identity: { status: 'loading', data: null, error: null } });
      try {
        const profile = circleProfileView(await gateway.circle.me());
        update({ identity: { status: 'ready', data: profile, error: null } });
      } catch (error) {
        update({ identity: { status: 'error', data: null, error: errorText(error) } });
      }
    },

    setBusinessKsInput(value: string) { update({ businessKsInput: value }); },

    async checkBusiness() {
      const businessKsNumber = state.businessKsInput.trim();
      if (!businessKsNumber) return;
      update({ business: { status: 'loading', data: null, error: null }, authority: idle() });
      try {
        const organization = await gateway.business.get(businessKsNumber);
        // Correction: reading this organization's name is not proof of authority for it --
        // `requireLink` (the backend behind this read) performs no authorization check of its own
        // (confirmed by reading BusinessAdministrationService directly). authoritySummary is
        // therefore checked immediately and unconditionally, before this Business is ever presented
        // as one the person administers -- see AccountExperience's fail-closed rendering.
        update({ business: { status: 'ready', data: organization, error: null }, authority: { status: 'loading', data: null, error: null } });
        try {
          const summary = await gateway.authorization.authoritySummary(organization.organizationId);
          update({ authority: { status: 'ready', data: summary, error: null } });
        } catch (error) {
          update({ authority: { status: 'error', data: null, error: errorText(error) } });
        }
      } catch (error) {
        update({ business: { status: 'error', data: null, error: errorText(error) } });
      }
    },

    async signOutEverywhere() {
      if (state.logoutAllBusy) return;
      update({ logoutAllBusy: true, logoutAllError: null, logoutAllDone: false });
      try {
        await gateway.logoutAll();
        update({ logoutAllBusy: false, logoutAllDone: true });
      } catch (error) {
        update({ logoutAllBusy: false, logoutAllError: errorText(error) });
      }
    },
  };
}
export type AccountController = ReturnType<typeof createAccountController>;
