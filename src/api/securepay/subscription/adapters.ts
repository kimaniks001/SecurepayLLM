import { ApiError } from '../http';
import {
  ACTIVATION_FUNDING_COMPONENT_STATES,
  ACTIVATION_FUNDING_NEXT_ACTIONS,
  type ActivationFundingStatusResponse,
  type SubscriptionBillingCycleResponse,
  type SubscriptionPlan,
  type SubscriptionStatusResponse,
} from './dto';

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

/**
 * Final Completion Phase 1: fails closed on any component state or next-action value this
 * client does not recognize, rather than silently treating an unknown backend enum as success or
 * as safe to ignore.
 */
export function activationFundingStatusView(dto: ActivationFundingStatusResponse): ActivationFundingStatusResponse {
  if (!(ACTIVATION_FUNDING_NEXT_ACTIONS as readonly string[]).includes(dto.nextAction)) {
    throw new ApiError('invalid-response', `SecurePay returned an unrecognized activation-funding next action: ${dto.nextAction}`);
  }
  for (const component of dto.components) {
    if (!(ACTIVATION_FUNDING_COMPONENT_STATES as readonly string[]).includes(component.state)) {
      throw new ApiError('invalid-response', `SecurePay returned an unrecognized activation-funding component state: ${component.state}`);
    }
  }
  return dto;
}
