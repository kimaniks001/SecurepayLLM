import type { HttpClient } from '../http';

/**
 * Phase 6 convergence -- `NotificationController` (`/api/v1/notifications`), the canonical
 * self-scoped in-app attention inbox. Verified against the real backend source
 * (`services/securepay-core/.../api/notification/response/NotificationResponse.java` and
 * `NotificationCategory`/`NotificationPriority` in the `notification-service` module) rather than
 * assumed from this task's own prompt. Field names mirror the backend response exactly.
 *
 * Note: this is a *different* domain from the `NotificationResponse` conversational card type in
 * `types.ts` (a KS001 in-conversation aside, part of the `AgentComponentView` union) -- the two
 * happen to share a name in the wider SecurePay vocabulary but are otherwise unrelated. This
 * gateway's DTOs are named `NotificationEvent`/`NotificationPreferences` to match the real backend
 * model classes and avoid colliding with that existing type.
 */
export type NotificationCategory = 'AGREEMENTS' | 'MONEY' | 'REVIEWS' | 'SECURITY' | 'COMMUNITY' | 'SUPPORT';
export type NotificationPriority = 'NORMAL' | 'HIGH';

/**
 * PHASE 4 Care convergence (Section 2) — the CLOSED navigation-hint vocabulary a notification's
 * `actionKey` may legitimately carry (mirrors the backend's own `NotificationActionKey` enum, persisted
 * as this exact wire string). Never itself authority (Section 27) — it only routes to an existing,
 * independently-authorized surface.
 */
export type NotificationActionKey = 'OPEN_INVITATIONS' | 'OPEN_AGREEMENT' | 'REVIEW_AGREEMENT';

/**
 * The one place a raw, persisted `actionKey` string is trusted. An unrecognized or absent value returns
 * `null` — informational only, never a guessed destination (Section 3/38's own "unknown actionKey -> no
 * action button" doctrine).
 */
export function parseNotificationActionKey(raw: string | null): NotificationActionKey | null {
  if (raw === 'OPEN_INVITATIONS' || raw === 'OPEN_AGREEMENT' || raw === 'REVIEW_AGREEMENT') return raw;
  return null;
}

export interface NotificationEvent {
  id: string;
  category: NotificationCategory;
  eventKey: string;
  priority: NotificationPriority;
  title: string;
  body: string;
  agreementId: string | null;
  bridgeId: string | null;
  /**
   * PHASE 4 Care convergence (Section 1/2) — the raw wire value of the backend's typed
   * `NotificationActionKey`. Real producers (invitation issued/revoked, and this slice's Join/
   * confirmation/reconfirmation Care triggers) now populate this; some older/other events may still
   * legitimately carry `null` (purely informational). ALWAYS pass this through `parseNotificationActionKey`
   * before routing on it — never compare this raw string directly, and never invent a mapping for a value
   * that parser does not recognize (Section 3/38's own "unknown actionKey -> no action button" doctrine).
   */
  actionKey: string | null;
  createdAt: string;
  readAt: string | null;
  resolvedAt: string | null;
  resolutionAction: string | null;
  version: number;
}

export interface NotificationPreferences {
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  agreementsCategoryEnabled: boolean;
  moneyCategoryEnabled: boolean;
  reviewsCategoryEnabled: boolean;
  securityCategoryEnabled: boolean;
  communityCategoryEnabled: boolean;
  supportCategoryEnabled: boolean;
  saved: boolean;
}

export interface UpdateNotificationPreferencesRequest {
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  agreementsCategoryEnabled: boolean;
  moneyCategoryEnabled: boolean;
  reviewsCategoryEnabled: boolean;
  securityCategoryEnabled: boolean;
  communityCategoryEnabled: boolean;
  supportCategoryEnabled: boolean;
}

export interface ListNotificationsParams {
  category?: NotificationCategory;
  unreadOnly?: boolean;
  page?: number;
  size?: number;
}

export function createNotificationsGateway(http: HttpClient) {
  return {
    list: (params: ListNotificationsParams = {}) => {
      const query = new URLSearchParams();
      if (params.category) query.set('category', params.category);
      if (params.unreadOnly !== undefined) query.set('unreadOnly', String(params.unreadOnly));
      if (params.page !== undefined) query.set('page', String(params.page));
      if (params.size !== undefined) query.set('size', String(params.size));
      const suffix = query.toString();
      return http.request<NotificationEvent[]>(`/api/v1/notifications/me${suffix ? `?${suffix}` : ''}`, { auth: 'required' });
    },
    get: (notificationId: string) => http.request<NotificationEvent>(`/api/v1/notifications/me/${notificationId}`, { auth: 'required' }),
    markRead: (notificationId: string) => http.request<NotificationEvent>(`/api/v1/notifications/me/${notificationId}/read`, { method: 'POST', auth: 'required' }),
    resolve: (notificationId: string, resolutionAction: string) =>
      http.request<NotificationEvent>(`/api/v1/notifications/me/${notificationId}/resolve`, { method: 'POST', body: { resolutionAction }, auth: 'required' }),
    getPreferences: () => http.request<NotificationPreferences>('/api/v1/notifications/me/preferences', { auth: 'required' }),
    updatePreferences: (body: UpdateNotificationPreferencesRequest) =>
      http.request<NotificationPreferences>('/api/v1/notifications/me/preferences', { method: 'PUT', body, auth: 'required' }),
  };
}
export type NotificationsGateway = ReturnType<typeof createNotificationsGateway>;
