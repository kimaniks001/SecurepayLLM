import type { SettingsGateway, TraderSettingsDto } from '../../api/securepay/settings';
import { errorText } from '../agent/controller';

export type Loadable<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; data: T | null; error: string | null };
const idle = <T>(): Loadable<T> => ({ status: 'idle', data: null, error: null });

export interface SettingsState {
  settings: Loadable<TraderSettingsDto>;
  draft: TraderSettingsDto | null;
  saving: boolean;
  saveError: string | null;
  /** True only immediately after a successful save() -- never derived from the DTO's own `saved` field, which reflects the backend's own persisted-state flag, not "you just clicked save." */
  justSaved: boolean;
}

/**
 * Phase 5 -- `TraderSettingsController` (`/api/v1/settings/me`). Self-scoped only. These five real
 * fields are the entire settings surface; no dead toggle was added for a capability the backend
 * does not have.
 */
export function createSettingsController(gateway: Pick<SettingsGateway, 'get' | 'update'>) {
  let state: SettingsState = { settings: idle(), draft: null, saving: false, saveError: null, justSaved: false };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<SettingsState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    async load() {
      update({ settings: { status: 'loading', data: null, error: null } });
      try {
        const result = await gateway.get();
        update({ settings: { status: 'ready', data: result, error: null }, draft: result });
      } catch (error) {
        update({ settings: { status: 'error', data: null, error: errorText(error) } });
      }
    },

    setDraft(patch: Partial<Pick<TraderSettingsDto, 'notifyEmail' | 'notifySms' | 'notifyPush' | 'marketingOptIn' | 'profileVisibility'>>) {
      if (!state.draft) return;
      update({ draft: { ...state.draft, ...patch }, justSaved: false });
    },

    async save() {
      if (!state.draft || state.saving) return;
      update({ saving: true, saveError: null, justSaved: false });
      try {
        const result = await gateway.update({
          notifyEmail: state.draft.notifyEmail, notifySms: state.draft.notifySms, notifyPush: state.draft.notifyPush,
          marketingOptIn: state.draft.marketingOptIn, profileVisibility: state.draft.profileVisibility,
        });
        update({ saving: false, settings: { status: 'ready', data: result, error: null }, draft: result, justSaved: true });
      } catch (error) {
        update({ saving: false, saveError: errorText(error) });
      }
    },
  };
}
export type SettingsController = ReturnType<typeof createSettingsController>;
