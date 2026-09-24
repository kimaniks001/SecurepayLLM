import type { AuthGateway, StartSignupRequest } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import { ApiError } from '../../api/securepay/http';

export type SignupPhase = 'form' | 'otp' | 'completed';
export interface SignupState {
  phase: SignupPhase;
  busy: boolean;
  displayName: string;
  channelType: StartSignupRequest['channelType'];
  destination: string;
  password: string;
  otp: string;
  challengeToken: string | null;
  maskedDestination: string | null;
  error: string | null;
}
const initial: SignupState = {
  phase: 'form', busy: false, displayName: '', channelType: 'SMS', destination: '', password: '',
  otp: '', challengeToken: null, maskedDestination: null, error: null,
};

/**
 * KS001 Upgrade Phase 4 continuation (Section 15/16/17) — "Get my KS Number." Wires the existing,
 * unmodified `/api/v1/auth/signup/{start,resend,verify}` endpoints. Owns ONLY the contact -> OTP -> KS
 * Number -> authenticated session bootstrap.
 *
 * <p>Mechanically SIGNUP ≠ JOIN: this controller has no dependency on any Agreement/invitation gateway
 * method and never calls anything resembling `join()` itself — see the mirrored structural proof in
 * SecurePayAPI's own `ParticipationAuthoritySeparationTest`. `session.setTokens(...)` establishes the
 * SecurePay identity's session the same way ordinary sign-in does; it is the caller's job (see
 * `RecipientExperience`) to still require a separate, explicit Join action afterward — completion here
 * only reaches `phase: 'completed'`, never anything that reads as "joined."
 *
 * <p>Errors are deliberately undifferentiated for every 4xx cause (wrong OTP, expired challenge, an
 * already-registered contact) — the backend itself returns ONE generic message for all of them
 * (`SignupChallengeException`'s own javadoc: "callers must never branch client-visible behavior on why
 * this was thrown"), so showing anything more specific here would be inventing a distinction SecurePay
 * itself refuses to make (Section 19's own anti-enumeration doctrine).
 */
export function createSignupController(
  auth: Pick<AuthGateway, 'signupStart' | 'signupResend' | 'signupVerify'>,
  session: Pick<SessionStore, 'setTokens'>,
) {
  let state: SignupState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<SignupState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };

  return {
    getSnapshot: (): SignupState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    setDisplayName(value: string) { if (state.phase === 'form' && !state.busy) update({ displayName: value, error: null }); },
    /** Changing the channel clears any half-typed destination -- a phone typed for SMS is not a valid email. */
    setChannelType(value: StartSignupRequest['channelType']) { if (state.phase === 'form' && !state.busy) update({ channelType: value, destination: '', error: null }); },
    setDestination(value: string) { if (state.phase === 'form' && !state.busy) update({ destination: value, error: null }); },
    setPassword(value: string) { if (state.phase === 'form' && !state.busy) update({ password: value, error: null }); },
    setOtp(value: string) { if (state.phase === 'otp' && !state.busy) update({ otp: value, error: null }); },

    async start() {
      if (state.phase !== 'form' || state.busy) return;
      if (!state.displayName.trim() || !state.destination.trim() || !state.password) return;
      update({ busy: true, error: null });
      try {
        const pending = await auth.signupStart({
          displayName: state.displayName.trim(),
          channelType: state.channelType,
          destination: state.destination.trim(),
          password: state.password,
        });
        update({
          phase: 'otp', busy: false, challengeToken: pending.signupChallengeToken,
          maskedDestination: pending.maskedDestination, password: '', otp: '', error: null,
        });
      } catch (error) {
        update({ busy: false, error: signupErrorText(error) });
      }
    },

    async resend() {
      if (state.phase !== 'otp' || state.busy || !state.challengeToken) return;
      update({ busy: true, error: null });
      try {
        await auth.signupResend(state.challengeToken);
        update({ busy: false });
      } catch (error) {
        update({ busy: false, error: signupErrorText(error) });
      }
    },

    async verify() {
      if (state.phase !== 'otp' || state.busy || !state.challengeToken || !state.otp.trim()) return;
      update({ busy: true, error: null });
      try {
        const completed = await auth.signupVerify({ signupChallengeToken: state.challengeToken, otp: state.otp.trim() });
        session.setTokens(completed);
        update({ ...initial, phase: 'completed' });
      } catch (error) {
        update({ busy: false, otp: '', error: signupErrorText(error) });
      }
    },

    /** Returns to the initial form. Does not affect any invitation state — the invitation itself remains usable. */
    reset() { update({ ...initial }); },
  };
}
export type SignupController = ReturnType<typeof createSignupController>;

/**
 * Deliberately ONE generic message for every 4xx cause (see this module's own doctrine comment above).
 * Only a genuine delivery/network failure gets different, honest wording.
 */
function signupErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) {
      return 'SecurePay couldn’t send or check that code right now. Nothing has been joined. Your invitation is still available.';
    }
  }
  return 'That didn’t work. Nothing has been joined. Your invitation is still available if it hasn’t expired.';
}
