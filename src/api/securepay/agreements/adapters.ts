import { ApiError } from '../http';
import type { AgreementDetailResponse, AgreementKeyContractReferralResponse, AgreementPlugAttributionResponse } from './dto';
import { moneyHandoffView } from '../money/adapters';
/** Bolt section composition without deriving a lifecycle, completion, participant role or financial state. */
export function agreementDetailView(dto: AgreementDetailResponse) {
  return {
    id: dto.overview.agreementId, reference: dto.overview.publicReference,
    title: dto.overview.title, status: dto.overview.status,
    overview: dto.overview,
    version: dto.currentVersion ? { id: dto.currentVersion.versionId, number: dto.currentVersion.versionNumber, hash: dto.currentVersion.contentHash } : null,
    participants: dto.participants,
    milestones: dto.milestones,
    terms: dto.terms, documents: dto.documents,
    activity: dto.activity, versionHistory: dto.versionHistory,
    money: moneyHandoffView(dto.money),
  };
}

export interface AgreementPlugAttributionView {
  attributionRef: string;
  agreementId: string;
  relationshipRef: string;
  plugKsNumber: string;
  attributedAt: string;
}
export function agreementPlugAttributionView(dto: AgreementPlugAttributionResponse): AgreementPlugAttributionView {
  return { attributionRef: dto.attributionRef, agreementId: dto.agreementId, relationshipRef: dto.relationshipRef, plugKsNumber: dto.plugKsNumber, attributedAt: dto.attributedAt };
}

/** Exactly `KeyContractReferralEvaluationState` — never computed locally. */
export type KeyContractReferralState = 'NO_INTRODUCTION' | 'CANDIDATE' | 'NOT_QUALIFIED' | 'QUALIFIED';
const REFERRAL_STATES: readonly KeyContractReferralState[] = ['NO_INTRODUCTION', 'CANDIDATE', 'NOT_QUALIFIED', 'QUALIFIED'];

export interface AgreementKeyContractReferralView {
  agreementId: string;
  state: KeyContractReferralState;
  plugKsNumber: string | null;
  introducedAt: string | null;
  /** Present only once the backend supplies both a reward amount and a currency together — never guessed. */
  reward: { platformFeeMinor: string | null; amountMinor: string; currency: string; shareRuleVersion: string | null } | null;
  rewardEarned: boolean;
  /** Always `false` in every branch of this backend today — no payout authority exists. Never rendered as
   * a wallet/settlement/withdrawable balance (task doctrine section 5). */
  rewardPaid: boolean;
  qualifiedAt: string | null;
}
export function agreementKeyContractReferralView(dto: AgreementKeyContractReferralResponse): AgreementKeyContractReferralView {
  if (!(REFERRAL_STATES as readonly string[]).includes(dto.state)) {
    throw new ApiError('invalid-response', `SecurePay returned an unrecognized referral evaluation state: ${dto.state}`);
  }
  return {
    agreementId: dto.agreementId, state: dto.state as KeyContractReferralState, plugKsNumber: dto.plugKsNumber, introducedAt: dto.introducedAt,
    reward: dto.rewardAmountMinor !== null && dto.currency !== null ? { platformFeeMinor: dto.platformFeeMinor, amountMinor: dto.rewardAmountMinor, currency: dto.currency, shareRuleVersion: dto.shareRuleVersion } : null,
    rewardEarned: dto.rewardEarned, rewardPaid: dto.rewardPaid, qualifiedAt: dto.qualifiedAt,
  };
}
