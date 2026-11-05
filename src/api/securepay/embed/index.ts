import type { HttpClient } from '../http';

/**
 * Owner-only management, available only through the first-party signed-in SecurePay session.
 * Public hosts and their guest widgets NEVER receive this gateway or a bearer credential.
 * Sponsored turns are NOT actual model tokens, USD or KSh.
 */
export interface EmbedInstallation {
  siteId: string;
  ownerKsNumber: string;
  displayName: string;
  allowedOrigin: string;
  enabled: boolean;
  dailyTurnLimit: number;
  monthlyTurnLimit: number;
  visitorDailyLimit: number;
}
export interface EmbedOwnerStatus {
  installation: EmbedInstallation;
  todayUsed: number;
  monthUsed: number;
}
export type EmbedLimits = Pick<EmbedInstallation,'enabled'|'dailyTurnLimit'|'monthlyTurnLimit'|'visitorDailyLimit'>;

export function createEmbedOwnerGateway(http: HttpClient) {
  const base = '/api/v1/embed/installations';
  const url = (id: string) => {
    if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(id)) throw new Error('Invalid installation identifier');
    return base + '/' + encodeURIComponent(id);
  };
  return {
    register: (body: { siteId: string; displayName: string; allowedOrigin: string }) =>
      http.request<EmbedInstallation>(base, { method:'POST', body, auth:'required' }),
    get: (siteId: string) =>
      http.request<EmbedOwnerStatus>(url(siteId)+'/settings', { auth:'required' }),
    update: (siteId: string, body: EmbedLimits) =>
      http.request<EmbedOwnerStatus>(url(siteId)+'/settings', {
        method:'PATCH',body,auth:'required'
      }),
  };
}
export type EmbedOwnerGateway = ReturnType<typeof createEmbedOwnerGateway>;
