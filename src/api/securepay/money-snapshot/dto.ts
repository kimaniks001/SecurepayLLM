import type { AgreementFundedAuthorityStatusResponse } from '../money-authority/dto';
import type { AgreementFundingOptionResponse } from '../payment-intent/dto';

export interface AgreementMoneySnapshotPaymentReady {
  state: 'NOT_EVALUATED' | 'AMBIGUOUS' | 'EVALUATED';
  ready: boolean | null;
  outcome: string | null;
  currency: string | null;
  amountMinor: number | null;
  outstandingReasons: Array<{ gateCode: string; reasonCode: string }>;
  evaluatedAt: string | null;
  evaluationId: string | null;
}

export interface AgreementMoneyReleaseRequestSnapshot {
  authorityGranted: boolean;
  reasonCode: string;
  participantCommandsPermitted: boolean;
  evaluationId: string | null;
  evaluationSequence: number | null;
}

export interface AgreementMoneyMovementEconomicsSnapshot {
  recipientPrincipalMinor: number;
  securePayFeeMinor: number;
  providerRailChargeMinor: number;
  taxMinor: number;
  totalPayableMinor: number;
  payerRole: string;
  feeBearer: string;
  railChargeBearer: string;
  pricingVersion: string;
}

export interface AgreementMoneyMovementSnapshot {
  state: 'READY' | 'BLOCKED' | 'UNAVAILABLE';
  reasonCode: string;
  authorityReasonCode: string | null;
  amountMinor: number | null;
  currency: string | null;
  economics: AgreementMoneyMovementEconomicsSnapshot | null;
  destinationClassification: 'INTERNAL' | 'EXTERNAL' | null;
  railCode: string | null;
  evaluationId: string | null;
  evaluationSequence: number | null;
}

export interface AgreementMoneySnapshotResponse {
  agreementId: string;
  currentVersionId: string;
  positions: AgreementFundedAuthorityStatusResponse[];
  paymentReady: AgreementMoneySnapshotPaymentReady;
  fundingOptions: AgreementFundingOptionResponse[];
  feeQuoteRequestsPermitted: boolean;
  releaseRequest: AgreementMoneyReleaseRequestSnapshot;
  /**
   * Side-effect-free backend movement preflight. Only READY may carry a movable amount.
   * The UI never derives this from balance, Payment Ready, or release authority.
   */
  movement: AgreementMoneyMovementSnapshot;
}
