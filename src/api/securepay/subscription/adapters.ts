import { ApiError } from '../http';
import type { SubscriptionBillingCycleResponse, SubscriptionPlan, SubscriptionStatusResponse } from './dto';

const PLANS: readonly SubscriptionPlan[] = ['FOR_YOU', 'BUSINESS'];

function assertKnownPlan(plan: string): asserts plan is SubscriptionPlan {
  if (!(PLANS as readonly string[]).includes(plan)) {
    throw new ApiError('invalid-response', `SecurePay returned an unrecognized subscription plan: ${plan}`);
  }
}

export function subscriptionStatusView(dto: SubscriptionStatusResponse): SubscriptionStatusResponse {
  assertKnownPlan(dto.plan);
  return dto;
}

export function subscriptionBillingCycleView(dto: SubscriptionBillingCycleResponse): SubscriptionBillingCycleResponse {
  assertKnownPlan(dto.plan);
  return dto;
}
