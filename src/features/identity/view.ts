import type { SecureAuthResponse } from '../../types';
import type { IdentityState } from './controller';

/** Composes the locked SecureAuth card for the real credential/OTP phases. No identity is claimed before SecurePay confirms it. */
export function secureAuthView(identity: IdentityState): SecureAuthResponse {
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
    title: 'You are ready to set this securely',
    identityName: '',
    identityKsn: '',
    reason: 'Verifying who you are keeps this secure. This is identity only — it does not join, confirm, or accept any Agreement on its own.',
    fields: [
      { label: 'KS Number', placeholder: 'KS-000000', type: 'text' },
      { label: 'Password', placeholder: 'Password', type: 'password' },
    ],
    primaryLabel: identity.busy ? 'Signing in…' : 'Sign in',
    primaryValue: 'submit_credentials',
    secondaryLabel: 'Back to conversation',
    secondaryValue: 'cancel_auth',
  };
}
