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

export interface AgreementMoneySnapshotResponse {
  agreementId: string;
  currentVersionId: string;
  positions: AgreementFundedAuthorityStatusResponse[];
  paymentReady: AgreementMoneySnapshotPaymentReady;
  fundingOptions: AgreementFundingOptionResponse[];
  feeQuoteRequestsPermitted: boolean;
  releaseRequest: AgreementMoneyReleaseRequestSnapshot;
  /**
   * V1 deliberately fails closed. Until the backend exposes the complete command preflight,
   * the UI must never infer "can move now" from balances or Payment Ready alone.
   */
  movementAssessment: 'NOT_ASSESSED';
}
