import type { AuthGateway } from '../../api/securepay/auth';
import { errorText } from '../agent/controller';

export type RecoveryStep = 'request' | 'verify' | 'reset' | 'done';

export interface RecoveryState {
  step: RecoveryStep;
  ksNumber: string;
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
  recoveryToken: string | null;
  busy: boolean;
  error: string | null;
  /** Set once verification succeeds -- never re-derived from ksNumber, only from the backend's own response. */
  verified: boolean;
}

const initial: RecoveryState = {
  step: 'request', ksNumber: '', otpCode: '', newPassword: '', confirmPassword: '',
  recoveryToken: null, busy: false, error: null, verified: false,
};

/**
 * Phase 5 -- Recovery. `requestRecovery` always succeeds with a token whether or not the KS Number
 * exists or has a verified destination (`DefaultAccountRecoveryService#resolveRecoveryContext`
 * silently no-ops on a miss) -- a deliberate, enumeration-resistant backend design. This controller
 * therefore never claims a KS Number was or was not found; the only honest copy is "if that KS
 * Number exists, a code was sent." Resetting the password revokes every session/refresh-token/MFA/
 * recovery-challenge for that identity server-side and returns no session of its own -- the person
 * must sign in fresh afterward with the new password, exactly like any other credential change. No
 * Business/Agreement/delegated authority is restored by this flow; only the login credential is.
 */
export function createRecoveryController(gateway: Pick<AuthGateway, 'requestRecovery' | 'verifyRecovery' | 'resetRecoveryPassword'>) {
  let state: RecoveryState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<RecoveryState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    setKsNumber(value: string) { if (state.step === 'request') update({ ksNumber: value, error: null }); },
    setOtpCode(value: string) { if (state.step === 'verify') update({ otpCode: value, error: null }); },
    setNewPassword(value: string) { if (state.step === 'reset') update({ newPassword: value, error: null }); },
    setConfirmPassword(value: string) { if (state.step === 'reset') update({ confirmPassword: value, error: null }); },

    async requestRecovery() {
      if (state.busy || !state.ksNumber.trim()) return;
      update({ busy: true, error: null });
      try {
        const result = await gateway.requestRecovery(state.ksNumber.trim());
        update({ busy: false, step: 'verify', recoveryToken: result.recoveryToken });
      } catch (error) {
        update({ busy: false, error: errorText(error) });
      }
    },

    async verifyOtp() {
      if (state.busy || !state.recoveryToken || !state.otpCode.trim()) return;
      update({ busy: true, error: null });
      try {
        const result = await gateway.verifyRecovery({ recoveryToken: state.recoveryToken, otpCode: state.otpCode.trim() });
        if (!result.verified) { update({ busy: false, error: 'That code was not accepted. Please check it and try again.' }); return; }
        update({ busy: false, step: 'reset', verified: true, recoveryToken: result.recoveryToken });
      } catch (error) {
        update({ busy: false, error: errorText(error) });
      }
    },

    async resetPassword() {
      if (state.busy || !state.recoveryToken || !state.newPassword) return;
      if (state.newPassword !== state.confirmPassword) { update({ error: 'Those two passwords do not match.' }); return; }
      update({ busy: true, error: null });
      try {
        await gateway.resetRecoveryPassword({ recoveryToken: state.recoveryToken, newPassword: state.newPassword });
        // The recovery token, OTP proof and password material have served their purpose. Clear them
        // immediately on success rather than retaining secrets until the person later navigates away.
        update({ busy: false, step: 'done', recoveryToken: null, otpCode: '', newPassword: '', confirmPassword: '', verified: false, error: null });
      } catch (error) {
        update({ busy: false, error: errorText(error) });
      }
    },

    reset() { update({ ...initial }); },
  };
}
export type RecoveryController = ReturnType<typeof createRecoveryController>;
