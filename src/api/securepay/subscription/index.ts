import type { HttpClient } from '../http';
import { activationFundingStatusView, subscriptionBillingCycleView, subscriptionStatusView } from './adapters';
import type {
  ActivationAgreementResponse,
  ActivationFundingStatusResponse,
  SettlementVerificationResponse,
  SubscriptionBillingCycleResponse,
  SubscriptionPlan,
  SubscriptionStatusResponse,
} from './dto';

export function createSubscriptionGateway(http: HttpClient) {
  return {
    myStatus: () => http.request<SubscriptionStatusResponse>('/api/v1/subscriptions/me', { auth: 'required' }).then(subscriptionStatusView),
    selectPlan: (plan: SubscriptionPlan) => http.request<SubscriptionStatusResponse>('/api/v1/subscriptions/me', { method: 'POST', body: { plan }, auth: 'required' }).then(subscriptionStatusView),
    activationAgreement: () => http.request<ActivationAgreementResponse>('/api/v1/subscriptions/me/activation-agreement', { auth: 'required' }),
    establishActivationAgreement: () => http.request<ActivationAgreementResponse>('/api/v1/subscriptions/me/activation-agreement', { method: 'POST', auth: 'required' }),
    confirmActivationAgreement: () => http.request<ActivationAgreementResponse>('/api/v1/subscriptions/me/activation-agreement/confirm', { method: 'POST', auth: 'required' }),
    prepareCurrentBillingCycle: () => http.request<SubscriptionBillingCycleResponse>('/api/v1/subscriptions/me/billing-cycles', { method: 'POST', auth: 'required' }).then(subscriptionBillingCycleView),
    activationFundingStatus: () => http.request<ActivationFundingStatusResponse>('/api/v1/subscriptions/me/activation-funding', { auth: 'required' }).then(activationFundingStatusView),
    prepareVerificationFunding: () => http.request<ActivationFundingStatusResponse>('/api/v1/subscriptions/me/activation-funding/verification/prepare', { method: 'POST', auth: 'required' }).then(activationFundingStatusView),
    initiateVerificationTransfer: () => http.request<SettlementVerificationResponse>('/api/v1/subscriptions/me/activation-funding/verification/initiate', { method: 'POST', auth: 'required' }),
    prepareReserveFunding: () => http.request<ActivationFundingStatusResponse>('/api/v1/subscriptions/me/activation-funding/reserve/prepare', { method: 'POST', auth: 'required' }).then(activationFundingStatusView),
    establishReviewReserve: () => http.request<ActivationFundingStatusResponse>('/api/v1/subscriptions/me/activation-funding/reserve/establish', { method: 'POST', auth: 'required' }).then(activationFundingStatusView),
  };
}

export type SubscriptionGateway = ReturnType<typeof createSubscriptionGateway>;
export type {
  ActivationAgreementResponse,
  ActivationFundingComponentResponse,
  ActivationFundingNextAction,
  ActivationFundingStatusResponse,
  SettlementVerificationResponse,
  SubscriptionBillingCycleResponse,
  SubscriptionPlan,
  SubscriptionStatusResponse,
} from './dto';
