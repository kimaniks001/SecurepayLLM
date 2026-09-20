import type { SecureAuthResponse } from '../../types';
import type { IdentityState } from './controller';

/** Composes the locked SecureAuth card for the real credential/OTP phases. No identity is claimed before SecurePay confirms it. */
export function secureAuthView(identity: IdentityState, context?: { title: string; reason: string; secondaryLabel?: string }): SecureAuthResponse {
  if (identity.phase === 'otp') {
    return {
      type: 'SECURE_AUTH',
      title: 'Enter the code sent to you',
      identityName: '',
      identityKsn: identity.ksNumber,
      reason: 'SecurePay sent a one-time code to verify this is really you. This only proves identity — it does not join or confirm any Agreement.',
      fields: [{ label: 'One-time code', placeholder: '6-digit code', type: 'otp' }],
      primaryLabel: identity.busy ? 'Verifying…' : 'Verify',
      primaryValue: 'submit_otp',
      secondaryLabel: 'Start over',
      secondaryValue: 'reset_credentials',
    };
  }
  return {
    type: 'SECURE_AUTH',
    title: context?.title ?? 'Sign in to review this',
    identityName: '',
    identityKsn: '',
    reason: context?.reason ?? 'Signing in only proves who you are, so SecurePay can show you the full review. It does not create, join, confirm or accept anything.',
    fields: [
      { label: 'KS Number', placeholder: 'KS-000000', type: 'text' },
      { label: 'Password', placeholder: 'Password', type: 'password' },
    ],
    primaryLabel: identity.busy ? 'Signing in…' : 'Sign in',
    primaryValue: 'submit_credentials',
    secondaryLabel: context?.secondaryLabel ?? 'Back to conversation',
    secondaryValue: 'cancel_auth',
  };
}
