import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import { errorText } from '../agent/controller';

export type IdentityPhase = 'credentials' | 'otp' | 'signed-in';
export interface IdentityState {
  phase: IdentityPhase;
  busy: boolean;
  ksNumber: string;
  password: string;
  otp: string;
  challengeToken: string | null;
  error: string | null;
}
const initial: IdentityState = { phase: 'credentials', busy: false, ksNumber: '', password: '', otp: '', challengeToken: null, error: null };

/**
 * Owns identity/session authority only: real KSNumber/password/OTP against SecurePay auth.
 * Never decodes tokens and never touches handoff, Agreement, or Money state.
 */
export function createIdentityController(auth: Pick<AuthGateway, 'signIn' | 'completeOtp' | 'resendOtp'>, session: Pick<SessionStore, 'setTokens'>) {
  let state: IdentityState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<IdentityState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setKsNumber(value: string) { if (state.phase === 'credentials' && !state.busy) update({ ksNumber: value, error: null }); },
    setPassword(value: string) { if (state.phase === 'credentials' && !state.busy) update({ password: value, error: null }); },
    setOtp(value: string) { if (state.phase === 'otp' && !state.busy) update({ otp: value, error: null }); },
    async submitCredentials() {
      if (state.phase !== 'credentials' || state.busy || !state.ksNumber.trim() || !state.password) return;
      update({ busy: true, error: null });
      try {
        const pending = await auth.signIn({ ksNumber: state.ksNumber.trim(), password: state.password });
        update({ phase: 'otp', busy: false, challengeToken: pending.challengeToken, password: '', otp: '', error: null });
      } catch (error) {
        update({ busy: false, error: errorText(error) });
      }
    },
    async submitOtp() {
      if (state.phase !== 'otp' || state.busy || !state.challengeToken || !state.otp.trim()) return;
      update({ busy: true, error: null });
      try {
        const tokens = await auth.completeOtp({ challengeToken: state.challengeToken, otpProof: state.otp.trim() });
        session.setTokens(tokens);
        update({ ...initial, phase: 'signed-in' });
      } catch (error) {
        update({ busy: false, otp: '', error: errorText(error) });
      }
    },
    async resendOtp() {
      if (state.phase !== 'otp' || state.busy || !state.challengeToken) return;
      update({ busy: true, error: null });
      try {
        await auth.resendOtp(state.challengeToken);
        update({ busy: false });
      } catch (error) {
        update({ busy: false, error: errorText(error) });
      }
    },
    reset() { update({ ...initial }); },
  };
}
export type IdentityController = ReturnType<typeof createIdentityController>;
