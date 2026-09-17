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

/**
 * Final Completion Phase 1 (Outcome C). {@code state}/{@code nextAction} are backend-owned enum
 * strings -- this client must never invent a value that isn't in the known lists below, and must
 * fail closed (never silently treat as success) on anything it does not recognize.
 */
export const ACTIVATION_FUNDING_COMPONENT_STATES = [
  'NOT_STARTED', 'INTENDED', 'CONFIRMED', 'TRANSFERRED', 'RESERVED', 'EARNED', 'FAILED',
] as const;
export type ActivationFundingComponentState = (typeof ACTIVATION_FUNDING_COMPONENT_STATES)[number];

export const ACTIVATION_FUNDING_NEXT_ACTIONS = [
  'CONFIRM_AGREEMENT', 'FUND_SUBSCRIPTION', 'PREPARE_VERIFICATION_FUNDING', 'PAY_VERIFICATION_INTENT',
  'REGISTER_SETTLEMENT_DESTINATION', 'INITIATE_VERIFICATION_TRANSFER', 'PREPARE_RESERVE_FUNDING',
  'PAY_RESERVE_INTENT', 'ESTABLISH_REVIEW_RESERVE', 'RETRY_FAILED_COMPONENT',
  'RETRY_VERIFICATION_FUNDING', 'RETRY_VERIFICATION_TRANSFER', 'AWAIT_VERIFICATION_RECONCILIATION',
  'NONE_ACTIVATION_COMPLETE',
] as const;
export type ActivationFundingNextAction = (typeof ACTIVATION_FUNDING_NEXT_ACTIONS)[number];

export interface ActivationFundingComponentResponse {
  componentType: string;
  revenueClassification: string;
  amountMinor: number;
  currency: string;
  state: string;
  paymentIntentId: string | null;
  description: string;
}

export interface ActivationFundingStatusResponse {
  subscriptionId: string;
  agreementConfirmed: boolean;
  components: ActivationFundingComponentResponse[];
  financiallyEnabled: boolean;
  nextAction: string;
}

export interface SettlementVerificationResponse {
  verificationId: string;
  settlementDestinationId: string;
  canonicalKsNumber: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
  verificationStatus: string;
  verificationDecision: string | null;
  maskedDestinationFingerprint: string;
  providerTxReference: string | null;
}
