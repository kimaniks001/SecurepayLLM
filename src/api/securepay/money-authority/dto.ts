export interface AgreementFundedAuthorityStatusResponse {
  agreementId: string;
  obligationId: string | null;
  obligationTitle: string | null;
  obligationDescription: string | null;
  proposedCurrency: string | null;
  proposedAmountMinor: number | null;
  established: boolean;
  reasonCode: string | null;
  currency: string | null;
  authorisedMaxAmountMinor: number | null;
  fundedTotalMinor: number | null;
  exercisedOrSettledMinor: number | null;
  releasedTotalMinor: number | null;
  remainingFundedMinor: number | null;
  closed: boolean | null;
  beneficiaryMaskedKsNumber: string | null;
  providerSettlementCertified: boolean;
}

export interface AgreementFundedAuthorityListResponse {
  agreementId: string;
  positions: AgreementFundedAuthorityStatusResponse[];
}

export interface AgreementFundedAuthorityExerciseResponse {
  agreementId: string;
  obligationId: string;
  exerciseEventId: string;
  amountMinor: number;
  cumulativeExercisedMinor: number;
  remainingFundedMinor: number;
  exercisedByDelegate: boolean;
  providerSettlementCertified: boolean;
}

export interface AgreementFundedAuthorityReleaseResponse {
  agreementId: string;
  obligationId: string;
  releasedTotalMinor: number;
}

/**
 * Final Completion Phase 2 completion pass, Section 7 -- REQUESTED/RECOVERY_PENDING/
 * RECOVERY_COMPLETED/RECOVERY_FAILED are an exercise reversal's own lifecycle, appearing as their
 * own distinct, later entry -- never a rewrite of the original PROGRESSED entry they reverse.
 */
export interface AgreementMoneyTransactionResponse {
  eventId: string;
  type: 'FUNDED' | 'PROGRESSED' | 'RELEASED' | 'REQUESTED' | 'RECOVERY_PENDING' | 'RECOVERY_COMPLETED' | 'RECOVERY_FAILED';
  amountMinor: number;
  currency: string;
  journalId: string | null;
  payerIdentityId: string | null;
  beneficiaryIdentityId: string | null;
  occurredAt: string;
}
