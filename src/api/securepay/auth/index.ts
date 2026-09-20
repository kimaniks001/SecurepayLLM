import type { HttpClient } from '../http';
export interface SignInRequest { ksNumber: string; password: string; applicationId?: string; deviceId?: string; sourceIpHash?: string }
export interface PendingAuthenticationDto { challengeToken: string; expiresAt: string }
export interface SessionTokensDto { accessToken: string; accessTokenExpiresAt: string; refreshToken: string; refreshTokenExpiresAt: string }

// Phase 5 -- Recovery (`AuthenticationController.requestRecovery/verifyRecovery/resetRecoveryPassword`).
// `requestRecovery` deliberately always returns a token/expiry, whether or not the KS Number exists or
// has a verified notification destination (`DefaultAccountRecoveryService#resolveRecoveryContext`
// silently no-ops when it doesn't) -- an enumeration-resistant design. The frontend must therefore never
// say "that KS Number doesn't exist"; the only honest copy is "if that KS Number exists, a code was sent."
export interface RecoveryRequestDto { recoveryToken: string; expiresAt: string }
export interface RecoveryVerificationDto { recoveryToken: string; expiresAt: string; verified: boolean }

/** Caller supplies the existing session's token provider to HTTP. No JWT identity inference or parallel session store. */
export function createAuthGateway(http: HttpClient) {
  return {
    signIn: (body: SignInRequest) => http.request<PendingAuthenticationDto>('/api/v1/auth/login', { method: 'POST', body, auth: 'none' }),
    completeOtp: (body: { challengeToken: string; otpProof: string }) => http.request<SessionTokensDto>('/api/v1/auth/complete', { method: 'POST', body, auth: 'none' }),
    resendOtp: (challengeToken: string) => http.request<void>('/api/v1/auth/mfa/resend', { method: 'POST', body: { challengeToken }, auth: 'none' }),
    refresh: (refreshToken: string) => http.request<SessionTokensDto>('/api/v1/auth/refresh', { method: 'POST', body: { refreshToken }, auth: 'none' }),
    logout: () => http.request<void>('/api/v1/auth/logout', { method: 'POST', auth: 'required' }),
    // Phase 5 additions -- all real, previously-unwired AuthenticationController endpoints.
    logoutAll: () => http.request<void>('/api/v1/auth/logout-all', { method: 'POST', auth: 'required' }),
    changePassword: (body: { currentPassword: string; newPassword: string }) => http.request<void>('/api/v1/auth/password', { method: 'POST', body, auth: 'required' }),
    requestRecovery: (ksNumber: string) => http.request<RecoveryRequestDto>('/api/v1/auth/recovery/request', { method: 'POST', body: { ksNumber }, auth: 'none' }),
    verifyRecovery: (body: { recoveryToken: string; otpCode: string }) => http.request<RecoveryVerificationDto>('/api/v1/auth/recovery/verify', { method: 'POST', body, auth: 'none' }),
    resetRecoveryPassword: (body: { recoveryToken: string; newPassword: string }) => http.request<void>('/api/v1/auth/recovery/reset', { method: 'POST', body, auth: 'none' }),
  };
}
export type AuthGateway = ReturnType<typeof createAuthGateway>;
