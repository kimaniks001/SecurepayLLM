import type { CircleGateway } from '../../api/securepay/circle';
import { circleProfileView, type CircleProfileView } from '../../api/securepay/circle/adapters';
import type { BusinessGateway, BusinessOrganizationDto } from '../../api/securepay/business';
import type { AuthorizationGateway, AuthoritySummaryDto } from '../../api/securepay/authorization';
import type { SubscriptionGateway, SubscriptionStatusResponse } from '../../api/securepay/subscription';
import { ApiError } from '../../api/securepay/http';
import { errorText } from '../agent/controller';

export type Loadable<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; data: T | null; error: string | null };
const idle = <T>(): Loadable<T> => ({ status: 'idle', data: null, error: null });

/**
 * Phase 6 final correction -- `GET /api/v1/subscriptions/me` fails closed with a real, distinct
 * `NO_SUBSCRIPTION` (404) error when the identity has never opened a subscription (verified against
 * `SubscriptionController`/`ApiExceptionHandler` directly). That is a real, expected state -- not an
 * error -- so it gets its own status rather than being folded into `'error'`.
 */
export type SubscriptionLoadable = { status: 'idle' | 'loading' | 'ready' | 'none' | 'error'; data: SubscriptionStatusResponse | null; error: string | null };
const idleSubscription = (): SubscriptionLoadable => ({ status: 'idle', data: null, error: null });

export interface AccountState {
  identity: Loadable<CircleProfileView>;
  businessKsInput: string;
  business: Loadable<BusinessOrganizationDto>;
  authority: Loadable<AuthoritySummaryDto>;
  logoutAllBusy: boolean;
  logoutAllError: string | null;
  logoutAllDone: boolean;
  subscription: SubscriptionLoadable;
  changePasswordBusy: boolean;
  changePasswordError: string | null;
  changePasswordDone: boolean;
}

/**
 * Phase 5 -- Account. Personal identity is read once via the existing, already-proven, self-scoped
 * `GET /circle/me` (the closest real "who am I" read this codebase already trusts elsewhere -- see
 * CircleExperience). A Business membership is a SEPARATE, explicit lookup -- there is no backend index
 * of "which Businesses do I belong to" (confirmed absent -- see docs/PHASE5_LIFE_BUSINESS_WORLD.md),
 * so the person names the Business KS Number they administer, exactly like Projects/Vision Board's
 * own "manage a different KS" convention. `authoritySummary` always resolves to the caller's own
 * identity server-side (`rejectUntrustedActorSubstitution`) -- it can never be used to read someone
 * else's permissions.
 *
 * Phase 6 final correction adds two real, previously-unwired capabilities: Plan & Subscription
 * (`subscription.myStatus`) and Change Password (`changePassword`, the real
 * `AuthenticationController#changePassword` -- verified to revoke every session and refresh token
 * for the identity, including the current one, so a successful change is truthfully reported as a
 * full sign-out, exactly like `signOutEverywhere`'s own copy already does).
 */
export function createAccountController(gateway: {
  circle: Pick<CircleGateway, 'me'>;
  business: Pick<BusinessGateway, 'get'>;
  authorization: Pick<AuthorizationGateway, 'authoritySummary'>;
  logoutAll: () => Promise<void>;
  subscription: Pick<SubscriptionGateway, 'myStatus'>;
  changePassword: (body: { currentPassword: string; newPassword: string }) => Promise<void>;
}) {
  let state: AccountState = {
    identity: idle(), businessKsInput: '', business: idle(), authority: idle(),
    logoutAllBusy: false, logoutAllError: null, logoutAllDone: false,
    subscription: idleSubscription(),
    changePasswordBusy: false, changePasswordError: null, changePasswordDone: false,
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

    async loadSubscription() {
      update({ subscription: { status: 'loading', data: null, error: null } });
      try {
        const status = await gateway.subscription.myStatus();
        update({ subscription: { status: 'ready', data: status, error: null } });
      } catch (error) {
        if (error instanceof ApiError && error.code === 'NO_SUBSCRIPTION') {
          update({ subscription: { status: 'none', data: null, error: null } });
          return;
        }
        update({ subscription: { status: 'error', data: null, error: errorText(error) } });
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

    /**
     * `currentPassword`/`newPassword` are never held in controller state -- the component keeps
     * them locally only for the duration of the submit, and clears them itself on success, on
     * leaving the screen, or on cancel (see AccountExperience). This method never logs, persists,
     * or echoes either value back.
     */
    async changePassword(currentPassword: string, newPassword: string) {
      if (state.changePasswordBusy) return;
      update({ changePasswordBusy: true, changePasswordError: null, changePasswordDone: false });
      try {
        await gateway.changePassword({ currentPassword, newPassword });
        update({ changePasswordBusy: false, changePasswordDone: true });
      } catch (error) {
        update({ changePasswordBusy: false, changePasswordError: errorText(error) });
      }
    },

    resetChangePasswordStatus() { update({ changePasswordError: null, changePasswordDone: false }); },
  };
}
export type AccountController = ReturnType<typeof createAccountController>;
