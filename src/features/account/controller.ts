import type { CircleGateway } from '../../api/securepay/circle';
import { circleProfileView, type CircleProfileView } from '../../api/securepay/circle/adapters';
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
 * CircleExperience).
 *
 * Phase 4B (ADR-0022) -- the typed "Business KS Number" lookup is gone. Knowing a Business KS Number was
 * never authority, and SecurePay now lists the Businesses a person can act for (`GET /business/mine`), so
 * Account only offers the doorway to the Business area, which reads that list.
 *
 * Phase 6 final correction adds two real, previously-unwired capabilities: Plan & Subscription
 * (`subscription.myStatus`) and Change Password (`changePassword`, the real
 * `AuthenticationController#changePassword` -- verified to revoke every session and refresh token
 * for the identity, including the current one, so a successful change is truthfully reported as a
 * full sign-out, exactly like `signOutEverywhere`'s own copy already does).
 *
 * Phase 6 session-clearing correction: backend authority wins immediately, not eventually. A
 * successful password change already revokes the current session server-side (verified above), so
 * this controller notifies its caller via `onPasswordChanged` the moment that succeeds -- never on
 * failure, never on cancel (cancel never calls `changePassword` at all). The caller (AgentExperience)
 * owns the actual `SessionStore`; this controller is deliberately given only a narrow callback, not
 * the session object itself, so Account's dependency surface stays exactly what it needs and no
 * more. `signOutEverywhere` is intentionally left as-is by this correction -- it was not asked for
 * and changing it is out of this fix's narrow scope.
 */
export function createAccountController(gateway: {
  circle: Pick<CircleGateway, 'me'>;
  logoutAll: () => Promise<void>;
  subscription: Pick<SubscriptionGateway, 'myStatus'>;
  changePassword: (body: { currentPassword: string; newPassword: string }) => Promise<void>;
}, onPasswordChanged: () => void) {
  let state: AccountState = {
    identity: idle(),
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
        // Backend authority already revoked this session server-side -- reflect that immediately,
        // not on the next failed request. Called before this controller's own success flag so an
        // authenticated-only screen can never render a stale success card even for one extra
        // render pass: by the time anything re-renders, the session is already signed-out. Never
        // called on a failed attempt or a cancel.
        onPasswordChanged();
        update({ changePasswordBusy: false, changePasswordDone: true });
      } catch (error) {
        update({ changePasswordBusy: false, changePasswordError: errorText(error) });
      }
    },

    resetChangePasswordStatus() { update({ changePasswordError: null, changePasswordDone: false }); },
  };
}
export type AccountController = ReturnType<typeof createAccountController>;
