import type { NotificationCategory, NotificationEvent, NotificationPreferences, NotificationQuietHours, WhatsAppConsentStatus, WhatsAppRecipientStatus, NotificationsGateway } from '../../api/securepay/notifications';
import { errorText } from '../agent/controller';

export type Loadable<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; data: T | null; error: string | null };
const idle = <T>(): Loadable<T> => ({ status: 'idle', data: null, error: null });

export interface NotificationsState {
  inbox: Loadable<NotificationEvent[]>;
  categoryFilter: NotificationCategory | null;
  unreadOnly: boolean;
  /** Zero-based index of the next page to request via loadMore(). */
  nextPage: number;
  /**
   * Whether another page may exist. Derived only from whether the last fetch returned a full page
   * (`length === PAGE_SIZE`) -- the backend returns a raw list, not a total count, so this is
   * never more than "there might be more," never a fabricated total.
   */
  hasMore: boolean;
  loadingMore: boolean;
  preferences: Loadable<NotificationPreferences>;
  preferencesDraft: NotificationPreferences | null;
  preferencesSaving: boolean;
  preferencesSaveError: string | null;
  preferencesJustSaved: boolean;
  whatsappConsent: Loadable<WhatsAppConsentStatus>;
  whatsappConsentBusy: boolean;
  whatsappConsentError: string | null;
  whatsappRecipient: Loadable<WhatsAppRecipientStatus>;
  whatsappRecipientBusy: boolean;
  whatsappRecipientError: string | null;
  recipientPhoneDraft: string;
  quietHours: Loadable<NotificationQuietHours>;
  quietHoursDraft: NotificationQuietHours | null;
  quietHoursSaving: boolean;
  quietHoursSaveError: string | null;
}

const PAGE_SIZE = 20;

/**
 * Phase 6 convergence -- the canonical in-app attention centre, backed by the real
 * `NotificationController` (`/api/v1/notifications`). Deliberately no client-side sort/priority
 * re-ordering: the backend's own list order (most recent first, per `NotificationQueryService`) is
 * used as-is, matching this project's existing doctrine for `nextActions` (see
 * tests/phase6-convergence.test.mjs test E).
 */
export function createNotificationsController(gateway: Pick<NotificationsGateway, 'list' | 'markRead' | 'resolve' | 'getPreferences' | 'updatePreferences' | 'getQuietHours' | 'updateQuietHours'> & Partial<Pick<NotificationsGateway, 'getWhatsAppConsent' | 'optInWhatsApp' | 'optOutWhatsApp' | 'getWhatsAppRecipient' | 'bindWhatsAppRecipient' | 'unbindWhatsAppRecipient'>>) {
  let state: NotificationsState = {
    inbox: idle(),
    categoryFilter: null,
    unreadOnly: false,
    nextPage: 0,
    hasMore: false,
    loadingMore: false,
    preferences: idle(),
    preferencesDraft: null,
    preferencesSaving: false,
    preferencesSaveError: null,
    preferencesJustSaved: false,
    whatsappConsent: idle(),
    whatsappConsentBusy: false,
    whatsappConsentError: null,
    whatsappRecipient: idle(),
    whatsappRecipientBusy: false,
    whatsappRecipientError: null,
    recipientPhoneDraft: '',
    quietHours: idle(),
    quietHoursDraft: null,
    quietHoursSaving: false,
    quietHoursSaveError: null,
  };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<NotificationsState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };

  /** Resets to page 0 -- used on initial load and whenever a filter changes. */
  const loadInbox = async () => {
    update({ inbox: { status: 'loading', data: null, error: null }, nextPage: 0, hasMore: false });
    try {
      const result = await gateway.list({ category: state.categoryFilter ?? undefined, unreadOnly: state.unreadOnly || undefined, page: 0, size: PAGE_SIZE });
      update({ inbox: { status: 'ready', data: result, error: null }, nextPage: 1, hasMore: result.length === PAGE_SIZE });
    } catch (error) {
      update({ inbox: { status: 'error', data: null, error: errorText(error) } });
    }
  };

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    load: loadInbox,

    /**
     * Calm "Load more," not infinite scroll: fetches exactly the next page with the same filters,
     * appends it, and de-duplicates by id in case of an overlapping read. Never invents a total --
     * `hasMore` only ever means "the last page was full," per doctrine.
     */
    async loadMore() {
      if (state.loadingMore || !state.hasMore || state.inbox.status !== 'ready') return;
      update({ loadingMore: true });
      try {
        const result = await gateway.list({ category: state.categoryFilter ?? undefined, unreadOnly: state.unreadOnly || undefined, page: state.nextPage, size: PAGE_SIZE });
        const existingIds = new Set((state.inbox.data ?? []).map(n => n.id));
        const appended = [...(state.inbox.data ?? []), ...result.filter(n => !existingIds.has(n.id))];
        update({ inbox: { status: 'ready', data: appended, error: null }, nextPage: state.nextPage + 1, hasMore: result.length === PAGE_SIZE, loadingMore: false });
      } catch (error) {
        update({ loadingMore: false, inbox: { ...state.inbox, error: errorText(error) } });
      }
    },

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
      update({
        preferences: { status: 'loading', data: null, error: null },
        quietHours: { status: 'loading', data: null, error: null },
        whatsappConsent: { status: 'loading', data: null, error: null },
        whatsappConsentError: null,
        whatsappRecipient: { status: 'loading', data: null, error: null },
        whatsappRecipientError: null,
        recipientPhoneDraft: '',
      });
      const [preferencesResult, quietResult, consentResult, recipientResult] = await Promise.allSettled([
        gateway.getPreferences(),
        gateway.getQuietHours(),
        gateway.getWhatsAppConsent ? gateway.getWhatsAppConsent() : Promise.reject(new Error('WhatsApp consent API is not available')),
        gateway.getWhatsAppRecipient ? gateway.getWhatsAppRecipient() : Promise.reject(new Error('WhatsApp recipient API is not available')),
      ]);
      if (preferencesResult.status === 'fulfilled') {
        update({ preferences: { status: 'ready', data: preferencesResult.value, error: null }, preferencesDraft: preferencesResult.value });
      } else {
        update({ preferences: { status: 'error', data: null, error: errorText(preferencesResult.reason) } });
      }
      if (consentResult.status === 'fulfilled') {
        update({ whatsappConsent: { status: 'ready', data: consentResult.value, error: null } });
      } else {
        update({ whatsappConsent: { status: 'error', data: null, error: errorText(consentResult.reason) } });
      }
      if (recipientResult.status === 'fulfilled') {
        update({ whatsappRecipient: { status: 'ready', data: recipientResult.value, error: null } });
      } else {
        update({ whatsappRecipient: { status: 'error', data: null, error: errorText(recipientResult.reason) } });
      }
      if (quietResult.status === 'fulfilled') {
        update({ quietHours: { status: 'ready', data: quietResult.value, error: null }, quietHoursDraft: quietResult.value });
      } else {
        update({ quietHours: { status: 'error', data: null, error: errorText(quietResult.reason) } });
      }
    },

    async optInWhatsApp() {
      if (!gateway.optInWhatsApp || state.whatsappConsentBusy || state.whatsappConsent.status !== 'ready') return;
      update({ whatsappConsentBusy: true, whatsappConsentError: null });
      try {
        const result = await gateway.optInWhatsApp('WA_TRANSACTIONAL_V1');
        update({ whatsappConsentBusy: false, whatsappConsent: { status: 'ready', data: result, error: null },
          recipientPhoneDraft: '', whatsappRecipient: { status: 'idle', data: null, error: null } });
        if (gateway.getWhatsAppRecipient) {
          const recipient = await gateway.getWhatsAppRecipient();
          update({ whatsappRecipient: { status: 'ready', data: recipient, error: null } });
        }
      } catch (error) {
        update({ whatsappConsentBusy: false, whatsappConsentError: errorText(error) });
      }
    },

    async optOutWhatsApp() {
      if (!gateway.optOutWhatsApp || state.whatsappConsentBusy || state.whatsappConsent.status !== 'ready') return;
      update({ whatsappConsentBusy: true, whatsappConsentError: null });
      try {
        const result = await gateway.optOutWhatsApp();
        update({ whatsappConsentBusy: false, whatsappConsent: { status: 'ready', data: result, error: null } });
      } catch (error) {
        update({ whatsappConsentBusy: false, whatsappConsentError: errorText(error) });
      }
    },

    setRecipientPhoneDraft(phone: string) {
      // Ephemeral input only; never save the raw number in browser storage.
      update({ recipientPhoneDraft: phone.slice(0, 40), whatsappRecipientError: null });
    },

    async bindVerifiedWhatsAppRecipient() {
      if (!gateway.bindWhatsAppRecipient || state.whatsappRecipientBusy
          || !state.whatsappConsent.data?.optedIn) return;
      const phone = state.recipientPhoneDraft;
      if (!phone.trim()) {
        update({ whatsappRecipientError: 'Enter the phone you already verified with SecurePay.' });
        return;
      }
      update({ whatsappRecipientBusy: true, whatsappRecipientError: null });
      try {
        const result = await gateway.bindWhatsAppRecipient(phone);
        update({ whatsappRecipientBusy: false,
          whatsappRecipient: { status: 'ready', data: result, error: null },
          recipientPhoneDraft: '' });
      } catch (error) {
        // Do not echo phone in the error state or saved notification.
        update({ whatsappRecipientBusy: false,
          whatsappRecipientError: 'SecurePay could not bind this verified phone. Check your consent and try again.' });
      }
    },

    async unbindWhatsAppRecipient() {
      if (!gateway.unbindWhatsAppRecipient || state.whatsappRecipientBusy) return;
      update({ whatsappRecipientBusy: true, whatsappRecipientError: null });
      try {
        const result = await gateway.unbindWhatsAppRecipient();
        update({ whatsappRecipientBusy: false,
          whatsappRecipient: { status: 'ready', data: result, error: null },
          recipientPhoneDraft: '' });
      } catch {
        update({ whatsappRecipientBusy: false, whatsappRecipientError: 'Unable to remove the WhatsApp recipient binding.' });
      }
    },

    setPreferencesDraft(patch: Partial<NotificationPreferences>) {
      if (!state.preferencesDraft) return;
      update({ preferencesDraft: { ...state.preferencesDraft, ...patch }, preferencesJustSaved: false });
    },


    setQuietHoursDraft(patch: Partial<NotificationQuietHours>) {
      const current = state.quietHoursDraft ?? { enabled: false, startLocal: null, endLocal: null, zoneId: null };
      update({ quietHoursDraft: { ...current, ...patch }, quietHoursSaveError: null });
    },

    async saveQuietHours() {
      if (!state.quietHoursDraft || state.quietHoursSaving) return;
      const draft = state.quietHoursDraft;
      if (draft.enabled && (!draft.startLocal || !draft.endLocal || !draft.zoneId)) {
        update({ quietHoursSaveError: 'Choose a start time, end time and time zone.' });
        return;
      }
      update({ quietHoursSaving: true, quietHoursSaveError: null });
      try {
        const result = await gateway.updateQuietHours(draft);
        update({ quietHoursSaving: false, quietHours: { status: 'ready', data: result, error: null }, quietHoursDraft: result });
      } catch (error) {
        update({ quietHoursSaving: false, quietHoursSaveError: errorText(error) });
      }
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
          communityCategoryEnabled: draft.communityCategoryEnabled,
          storesCategoryEnabled: draft.storesCategoryEnabled ?? true,
          supportCategoryEnabled: draft.supportCategoryEnabled,
        });
        update({ preferencesSaving: false, preferences: { status: 'ready', data: result, error: null }, preferencesDraft: result, preferencesJustSaved: true });
      } catch (error) {
        update({ preferencesSaving: false, preferencesSaveError: errorText(error) });
      }
    },
  };
}
export type NotificationsController = ReturnType<typeof createNotificationsController>;
