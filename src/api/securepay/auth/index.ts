import type { HttpClient } from '../http';
export interface SignInRequest { ksNumber: string; password: string; applicationId?: string; deviceId?: string; sourceIpHash?: string }
export interface PendingAuthenticationDto { challengeToken: string; expiresAt: string }
export interface SessionTokensDto { accessToken: string; accessTokenExpiresAt: string; refreshToken: string; refreshTokenExpiresAt: string }
/** Caller supplies the existing session's token provider to HTTP. No JWT identity inference or parallel session store. */
export function createAuthGateway(http: HttpClient) {
  return {
    signIn: (body: SignInRequest) => http.request<PendingAuthenticationDto>('/api/v1/auth/login', { method: 'POST', body, auth: 'none' }),
    completeOtp: (body: { challengeToken: string; otpProof: string }) => http.request<SessionTokensDto>('/api/v1/auth/complete', { method: 'POST', body, auth: 'none' }),
    resendOtp: (challengeToken: string) => http.request<void>('/api/v1/auth/mfa/resend', { method: 'POST', body: { challengeToken }, auth: 'none' }),
    refresh: (refreshToken: string) => http.request<SessionTokensDto>('/api/v1/auth/refresh', { method: 'POST', body: { refreshToken }, auth: 'none' }),
    logout: () => http.request<void>('/api/v1/auth/logout', { method: 'POST', auth: 'required' }),
  };
}
