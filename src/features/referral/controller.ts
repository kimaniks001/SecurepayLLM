import { ApiError, type RemoteState } from '../../api/securepay/http';
import { referralHistoryView, type ReferralHistoryView } from '../../api/securepay/referral/adapters';
import type { ReferralCodeResponse } from '../../api/securepay/referral/dto';
import type { ReferralGateway } from '../../api/securepay/referral';

export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return 'SecurePay could not allow this request.';
    if (error.status === 400) return 'That referral code could not be read.';
    if (error.status === 409 || error.status === 422) return 'That referral code could not be redeemed — it may be your own code or already used.';
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) return 'SecurePay is unavailable. Please try again.';
    return error.message;
  }
  return 'SecurePay could not complete this step. Please try again.';
}
function asApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError('network', 'SecurePay is unavailable');
}

export interface ReferralState {
  code: RemoteState<ReferralCodeResponse>;
  history: RemoteState<ReferralHistoryView>;
  redeemInput: string;
  redeemBusy: boolean;
  redeemError: string | null;
  redeemedStatus: string | null;
}
const initial: ReferralState = { code: { status: 'idle' }, history: { status: 'idle' }, redeemInput: '', redeemBusy: false, redeemError: null, redeemedStatus: null };

/**
 * The R11A generic referral-code system (task doc never named this endpoint; verified real and live on
 * `origin/main` — see docs/PRODUCTION_MIGRATION_LEDGER.md section 18). Distinct from the per-Agreement
 * KeyContract Plug-attribution referral state (features/plug/controller.ts) — this is "my own shareable
 * code and who I've referred," never conflated with "who introduced me to this specific Agreement."
 */
export function createReferralController(gateway: Pick<ReferralGateway, 'myCode' | 'myHistory' | 'redeem'>) {
  let state: ReferralState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<ReferralState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };

  return {
    getSnapshot: (): ReferralState => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    async load() {
      update({ code: { status: 'loading' }, history: { status: 'loading' } });
      try {
        const [code, historyDto] = await Promise.all([gateway.myCode(), gateway.myHistory()]);
        update({ code: { status: 'ready', data: code }, history: { status: 'ready', data: referralHistoryView(historyDto) } });
      } catch (error) {
        const apiError = asApiError(error);
        update({ code: { status: 'error', error: apiError }, history: { status: 'error', error: apiError } });
      }
    },

    setRedeemInput(value: string) { update({ redeemInput: value, redeemError: null }); },
    async redeem() {
      if (!state.redeemInput.trim() || state.redeemBusy) return;
      update({ redeemBusy: true, redeemError: null });
      try {
        const result = await gateway.redeem(state.redeemInput.trim());
        update({ redeemBusy: false, redeemedStatus: result.status, redeemInput: '' });
      } catch (error) { update({ redeemBusy: false, redeemError: errorText(error) }); }
    },

    reset() { update({ ...initial }); },
  };
}
export type ReferralController = ReturnType<typeof createReferralController>;
