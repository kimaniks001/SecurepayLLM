import { ApiError, type RemoteState } from '../../api/securepay/http';
import type { ActivationAgreementResponse, SubscriptionBillingCycleResponse, SubscriptionGateway, SubscriptionPlan, SubscriptionStatusResponse } from '../../api/securepay/subscription';

export interface ActivationState {
  subscription: RemoteState<SubscriptionStatusResponse | null>;
  agreement: RemoteState<ActivationAgreementResponse | null>;
  billing: RemoteState<SubscriptionBillingCycleResponse | null>;
  busy: boolean;
  error: string | null;
}

const initial: ActivationState = {
  subscription: { status: 'idle' }, agreement: { status: 'idle' }, billing: { status: 'idle' }, busy: false, error: null,
};

function text(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return 'SecurePay could not allow this activation step.';
    if (error.status === 409) return error.message || 'This activation step is not available in the current state.';
    if (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500) return 'SecurePay is unavailable. Please try again.';
    return error.message;
  }
  return 'SecurePay could not complete this activation step.';
}

/**
 * Activation is a composition over existing backend authorities, never a client-side state machine:
 * subscription plan -> backend-authored canonical Activation Agreement -> canonical confirmation ->
 * first subscription billing-cycle PaymentIntent. The controller never marks activation complete from
 * a successful click and never conflates that subscription PaymentIntent with the separate settlement-
 * verification transfer or Review Reserve authorities.
 */
export function createActivationController(gateway: SubscriptionGateway) {
  let state: ActivationState = { ...initial };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<ActivationState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };

  async function loadAgreement() {
    try {
      const agreement = await gateway.activationAgreement();
      update({ agreement: { status: 'ready', data: agreement } });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) update({ agreement: { status: 'ready', data: null } });
      else update({ agreement: { status: 'error', error: error instanceof ApiError ? error : new ApiError('network', 'SecurePay is unavailable') } });
    }
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async load() {
      update({ subscription: { status: 'loading' }, agreement: { status: 'idle' }, billing: { status: 'idle' }, error: null });
      try {
        const subscription = await gateway.myStatus();
        update({ subscription: { status: 'ready', data: subscription } });
        await loadAgreement();
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          update({ subscription: { status: 'ready', data: null }, agreement: { status: 'ready', data: null } });
        } else {
          update({ subscription: { status: 'error', error: error instanceof ApiError ? error : new ApiError('network', 'SecurePay is unavailable') }, error: text(error) });
        }
      }
    },
    async selectPlan(plan: SubscriptionPlan) {
      if (state.busy) return;
      update({ busy: true, error: null });
      try {
        const subscription = await gateway.selectPlan(plan);
        update({ subscription: { status: 'ready', data: subscription }, agreement: { status: 'ready', data: null }, billing: { status: 'idle' }, busy: false });
      } catch (error) { update({ busy: false, error: text(error) }); }
    },
    async establishAgreement() {
      if (state.busy) return;
      update({ busy: true, error: null });
      try {
        const agreement = await gateway.establishActivationAgreement();
        update({ agreement: { status: 'ready', data: agreement }, busy: false });
      } catch (error) { update({ busy: false, error: text(error) }); }
    },
    async confirmAgreement() {
      if (state.busy) return;
      update({ busy: true, error: null });
      try {
        await gateway.confirmActivationAgreement();
        // Re-read backend truth after the mutation; never manufacture `confirmed: true` locally.
        const agreement = await gateway.activationAgreement();
        update({ agreement: { status: 'ready', data: agreement }, busy: false });
      } catch (error) { update({ busy: false, error: text(error) }); }
    },
    async prepareBilling() {
      if (state.busy) return;
      update({ busy: true, error: null, billing: { status: 'loading' } });
      try {
        const billing = await gateway.prepareCurrentBillingCycle();
        update({ billing: { status: 'ready', data: billing }, busy: false });
      } catch (error) {
        update({ billing: { status: 'error', error: error instanceof ApiError ? error : new ApiError('network', 'SecurePay is unavailable') }, busy: false, error: text(error) });
      }
    },
    reset() { update({ ...initial }); },
  };
}
export type ActivationController = ReturnType<typeof createActivationController>;
