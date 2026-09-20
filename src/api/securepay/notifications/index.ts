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
   * Deep-link hint. As of this pass, no real production event producer populates this (every real
   * `PublishNotificationCommand` call site in SecurePayAPI passes `null`) -- see
   * docs/PHASE6_CONVERGENCE_PRODUCTION.md's Communication section. Frontend routing must not invent
   * a mapping for values that could appear here; it is carried through only so a future backend
   * producer can start using it without a frontend contract change.
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
