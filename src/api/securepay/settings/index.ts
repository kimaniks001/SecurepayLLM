import type { HttpClient } from '../http';

/**
 * Phase 5 -- `TraderSettingsController` (`/api/v1/settings/me`). Self-scoped only: the backend
 * derives the identity from the authenticated session, never a request parameter. These five
 * fields are the entire real settings surface -- `profileVisibility` is exactly `PUBLIC`/`PRIVATE`,
 * never a richer visibility model the backend does not have.
 */
export interface TraderSettingsDto {
  notifyEmail: boolean;
  notifySms: boolean;
  notifyPush: boolean;
  marketingOptIn: boolean;
  profileVisibility: 'PUBLIC' | 'PRIVATE';
  saved: boolean;
}

export interface UpdateTraderSettingsRequest {
  notifyEmail: boolean;
  notifySms: boolean;
  notifyPush: boolean;
  marketingOptIn: boolean;
  profileVisibility: 'PUBLIC' | 'PRIVATE';
}

export function createSettingsGateway(http: HttpClient) {
  return {
    get: () => http.request<TraderSettingsDto>('/api/v1/settings/me', { auth: 'required' }),
    update: (body: UpdateTraderSettingsRequest) => http.request<TraderSettingsDto>('/api/v1/settings/me', { method: 'PUT', body, auth: 'required' }),
  };
}
export type SettingsGateway = ReturnType<typeof createSettingsGateway>;
