import type { SecureAuthResponse } from '../../types';
import type { SignupContext, SignupState } from './controller';

/** What creating an identity does NOT do, said plainly for the place signup started. */
const FORM_REASON: Record<SignupContext, string> = {
  GENERIC: 'This creates your SecurePay identity. It does not join The Trust Project or any Agreement.',
  TRUST_PROJECT_JOIN: 'This creates your SecurePay identity — your KS Number. You’ll choose whether to join The Trust Project next; nothing is joined yet.',
  AGREEMENT_INVITATION: 'Creating your SecurePay identity does not join or confirm this Agreement. You’ll come straight back here to decide that yourself.',
};

/**
 * KS001 Upgrade Phase 4 continuation (Section 14/15) — reuses the SAME locked SecureAuth card shape the
 * ordinary sign-in flow already uses (`identity/view.ts#secureAuthView`), never a second bespoke auth
 * component. The channel choice (phone/email) is rendered separately by the caller before this view's
 * fields, since `SecureAuthResponse.fields` only models text/password/otp inputs.
 */
export function signupView(state: SignupState, context: SignupContext = 'AGREEMENT_INVITATION'): SecureAuthResponse {
  if (state.phase === 'otp') {
    return {
      type: 'SECURE_AUTH',
      title: 'Enter the code sent to you',
      identityName: '',
      identityKsn: state.maskedDestination ?? '',
      reason: 'SecurePay sent a one-time code to verify you can be reached at this contact. Your KS Number is not ready until this is verified.',
      fields: [{ label: 'One-time code', placeholder: '6-digit code', type: 'otp' }],
      primaryLabel: state.busy ? 'Verifying…' : 'Verify',
      primaryValue: 'signup_verify',
      secondaryLabel: 'Start over',
      secondaryValue: 'signup_reset',
    };
  }
  return {
    type: 'SECURE_AUTH',
    title: 'Get your KS Number',
    identityName: '',
    identityKsn: '',
    reason: FORM_REASON[context],
    fields: [
      { label: 'Your name', placeholder: 'Full name', type: 'text' },
      { label: state.channelType === 'EMAIL' ? 'Email' : 'Phone number', placeholder: state.channelType === 'EMAIL' ? 'you@example.com' : '07XXXXXXXX', type: 'text' },
      { label: 'Choose a password', placeholder: 'Password', type: 'password' },
    ],
    primaryLabel: state.busy ? 'Sending code…' : 'Continue',
    primaryValue: 'signup_start',
    secondaryLabel: 'I have a KS Number',
    secondaryValue: 'signup_use_existing',
  };
}
