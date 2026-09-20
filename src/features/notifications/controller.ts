import type { NotificationCategory, NotificationEvent, NotificationPreferences, NotificationsGateway } from '../../api/securepay/notifications';
import { errorText } from '../agent/controller';

export type Loadable<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; data: T | null; error: string | null };
const idle = <T>(): Loadable<T> => ({ status: 'idle', data: null, error: null });

export interface NotificationsState {
  inbox: Loadable<NotificationEvent[]>;
  categoryFilter: NotificationCategory | null;
  unreadOnly: boolean;
  preferences: Loadable<NotificationPreferences>;
  preferencesDraft: NotificationPreferences | null;
  preferencesSaving: boolean;
  preferencesSaveError: string | null;
  preferencesJustSaved: boolean;
}

/**
 * Phase 6 convergence -- the canonical in-app attention centre, backed by the real
 * `NotificationController` (`/api/v1/notifications`). Deliberately no client-side sort/priority
 * re-ordering: the backend's own list order (most recent first, per `NotificationQueryService`) is
 * used as-is, matching this project's existing doctrine for `nextActions` (see
 * tests/phase6-convergence.test.mjs test E).
 */
export function createNotificationsController(gateway: Pick<NotificationsGateway, 'list' | 'markRead' | 'resolve' | 'getPreferences' | 'updatePreferences'>) {
  let state: NotificationsState = {
    inbox: idle(),
    categoryFilter: null,
    unreadOnly: false,
    preferences: idle(),
    preferencesDraft: null,
    preferencesSaving: false,
    preferencesSaveError: null,
    preferencesJustSaved: false,
  };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<NotificationsState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };

  const loadInbox = async () => {
    update({ inbox: { status: 'loading', data: null, error: null } });
    try {
      const result = await gateway.list({ category: state.categoryFilter ?? undefined, unreadOnly: state.unreadOnly || undefined });
      update({ inbox: { status: 'ready', data: result, error: null } });
    } catch (error) {
      update({ inbox: { status: 'error', data: null, error: errorText(error) } });
    }
  };

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    load: loadInbox,

    setCategoryFilter(category: NotificationCategory | null) {
      update({ categoryFilter: category });
      void loadInbox();
    },

    setUnreadOnly(unreadOnly: boolean) {
      update({ unreadOnly });
      void loadInbox();
    },

    async markRead(notificationId: string) {
      try {
        const updated = await gateway.markRead(notificationId);
        if (state.inbox.data) {
          update({ inbox: { status: 'ready', data: state.inbox.data.map(n => (n.id === updated.id ? updated : n)), error: null } });
        }
      } catch {
        // Marking read is a quiet, best-effort courtesy -- a failure here must never block the
        // person from reading the notification body they already have on screen.
      }
    },

    async resolve(notificationId: string, resolutionAction: string) {
      try {
        const updated = await gateway.resolve(notificationId, resolutionAction);
        if (state.inbox.data) {
          update({ inbox: { status: 'ready', data: state.inbox.data.map(n => (n.id === updated.id ? updated : n)), error: null } });
        }
      } catch (error) {
        update({ inbox: { ...state.inbox, error: errorText(error) } });
      }
    },

    async loadPreferences() {
      update({ preferences: { status: 'loading', data: null, error: null } });
      try {
        const result = await gateway.getPreferences();
        update({ preferences: { status: 'ready', data: result, error: null }, preferencesDraft: result });
      } catch (error) {
        update({ preferences: { status: 'error', data: null, error: errorText(error) } });
      }
    },

    setPreferencesDraft(patch: Partial<NotificationPreferences>) {
      if (!state.preferencesDraft) return;
      update({ preferencesDraft: { ...state.preferencesDraft, ...patch }, preferencesJustSaved: false });
    },

    async savePreferences() {
      if (!state.preferencesDraft || state.preferencesSaving) return;
      update({ preferencesSaving: true, preferencesSaveError: null, preferencesJustSaved: false });
      const draft = state.preferencesDraft;
      try {
        const result = await gateway.updatePreferences({
          whatsappEnabled: draft.whatsappEnabled, smsEnabled: draft.smsEnabled, emailEnabled: draft.emailEnabled,
          agreementsCategoryEnabled: draft.agreementsCategoryEnabled, moneyCategoryEnabled: draft.moneyCategoryEnabled,
          reviewsCategoryEnabled: draft.reviewsCategoryEnabled, securityCategoryEnabled: draft.securityCategoryEnabled,
          communityCategoryEnabled: draft.communityCategoryEnabled, supportCategoryEnabled: draft.supportCategoryEnabled,
        });
        update({ preferencesSaving: false, preferences: { status: 'ready', data: result, error: null }, preferencesDraft: result, preferencesJustSaved: true });
      } catch (error) {
        update({ preferencesSaving: false, preferencesSaveError: errorText(error) });
      }
    },
  };
}
export type NotificationsController = ReturnType<typeof createNotificationsController>;
