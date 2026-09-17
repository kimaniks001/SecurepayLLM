export type SubscriptionPlan = 'FOR_YOU' | 'BUSINESS';

export interface SubscriptionStatusResponse {
  subscriptionId: string;
  plan: SubscriptionPlan;
  monthlyFeeMinor: number;
  currency: string;
  status: string;
  consecutivePaidCycles: number;
  lifetimePaidCycles: number;
  retentionQualified: boolean;
  qualifiedRewardAmountMinor: number | null;
  qualifiedRewardCurrency: string | null;
}

export interface ActivationAgreementResponse {
  agreementId: string;
  agreementVersionId: string;
  contentHash: string;
  title: string;
  purpose: string;
  description: string;
  confirmed: boolean;
  confirmedAt: string | null;
}

export interface SubscriptionBillingCycleResponse {
  subscriptionId: string;
  cycleMonth: string;
  plan: SubscriptionPlan;
  feeDueMinor: number;
  currency: string;
  paymentIntentId: string;
}
