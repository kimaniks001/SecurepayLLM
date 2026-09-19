import type { HttpClient } from '../http';
import type { LifetimeShareResponse, ReferralCodeResponse, ReferralHistoryResponse, RedeemReferralCodeResponse } from './dto';

/**
 * Verified byte-identical against `origin/main` (`ReferralController.java` @ `/api/v1/referrals`) — real,
 * live backend authority, not gated on any open PR. Caller identity always comes from the authenticated
 * session; every endpoint requires auth.
 */
export function createReferralGateway(http: HttpClient) {
  return {
    myCode: () => http.request<ReferralCodeResponse>('/api/v1/referrals/me/code', { auth: 'required' }),
    redeem: (code: string) => http.request<RedeemReferralCodeResponse>('/api/v1/referrals/redeem', { method: 'POST', body: { code }, auth: 'required' }),
    myHistory: () => http.request<ReferralHistoryResponse>('/api/v1/referrals/me/history', { auth: 'required' }),
    myLifetimeShare: (limit = 50, offset = 0) => http.request<LifetimeShareResponse>(`/api/v1/referrals/me/lifetime-share?limit=${limit}&offset=${offset}`, { auth: 'required' }),
  };
}
export type ReferralGateway = ReturnType<typeof createReferralGateway>;
