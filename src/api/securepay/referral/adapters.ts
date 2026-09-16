import { ApiError } from '../http';
import type { ReferralHistoryResponse, ReferralRelationshipResponse, ReferralRelationshipStatus } from './dto';

const RELATIONSHIP_STATUSES: readonly ReferralRelationshipStatus[] = ['PENDING', 'ACTIVATED', 'QUALIFIED'];
function assertKnownStatus(status: string): asserts status is ReferralRelationshipStatus {
  if (!(RELATIONSHIP_STATUSES as readonly string[]).includes(status)) {
    throw new ApiError('invalid-response', `SecurePay returned an unrecognized referral relationship status: ${status}`);
  }
}

export interface ReferralRelationshipView {
  relationshipId: string;
  referredKsNumber: string;
  status: ReferralRelationshipStatus;
  createdAt: string;
  activatedAt: string | null;
  qualifiedAt: string | null;
  /** Present only when the backend supplied both an amount and a currency — never guessed/defaulted. */
  reward: { amountMinor: number; currency: string } | null;
  qualificationExplanation: string | null;
}
export function referralRelationshipView(dto: ReferralRelationshipResponse): ReferralRelationshipView {
  assertKnownStatus(dto.status);
  return {
    relationshipId: dto.relationshipId, referredKsNumber: dto.referredKsNumber, status: dto.status,
    createdAt: dto.createdAt, activatedAt: dto.activatedAt, qualifiedAt: dto.qualifiedAt,
    reward: dto.rewardAmountMinor !== null && dto.rewardCurrency !== null ? { amountMinor: dto.rewardAmountMinor, currency: dto.rewardCurrency } : null,
    qualificationExplanation: dto.qualificationExplanation,
  };
}

export interface ReferralHistoryView {
  referralCode: string;
  totalReferred: number;
  activatedOrLaterCount: number;
  relationships: ReferralRelationshipView[];
}
export function referralHistoryView(dto: ReferralHistoryResponse): ReferralHistoryView {
  return {
    referralCode: dto.referralCode, totalReferred: dto.totalReferred, activatedOrLaterCount: dto.activatedOrLaterCount,
    relationships: dto.relationships.map(referralRelationshipView),
  };
}
