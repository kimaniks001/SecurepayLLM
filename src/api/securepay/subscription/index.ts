import type { HttpClient } from '../http';
import type { ActivationAgreementResponse, SubscriptionBillingCycleResponse, SubscriptionPlan, SubscriptionStatusResponse } from './dto';

export function createSubscriptionGateway(http: HttpClient) {
  return {
    myStatus: () => http.request<SubscriptionStatusResponse>('/api/v1/subscriptions/me', { auth: 'required' }),
    selectPlan: (plan: SubscriptionPlan) => http.request<SubscriptionStatusResponse>('/api/v1/subscriptions/me', { method: 'POST', body: { plan }, auth: 'required' }),
    activationAgreement: () => http.request<ActivationAgreementResponse>('/api/v1/subscriptions/me/activation-agreement', { auth: 'required' }),
    establishActivationAgreement: () => http.request<ActivationAgreementResponse>('/api/v1/subscriptions/me/activation-agreement', { method: 'POST', auth: 'required' }),
    confirmActivationAgreement: () => http.request<ActivationAgreementResponse>('/api/v1/subscriptions/me/activation-agreement/confirm', { method: 'POST', auth: 'required' }),
    prepareCurrentBillingCycle: () => http.request<SubscriptionBillingCycleResponse>('/api/v1/subscriptions/me/billing-cycles', { method: 'POST', auth: 'required' }),
  };
}
export type SubscriptionGateway = ReturnType<typeof createSubscriptionGateway>;
export type { ActivationAgreementResponse, SubscriptionBillingCycleResponse, SubscriptionPlan, SubscriptionStatusResponse } from './dto';
