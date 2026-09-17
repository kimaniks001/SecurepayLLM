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

export interface AgreementMoneyTransactionResponse {
  eventId: string;
  type: 'FUNDED' | 'PROGRESSED' | 'RELEASED';
  amountMinor: number;
  currency: string;
  journalId: string | null;
  payerIdentityId: string | null;
  beneficiaryIdentityId: string | null;
  occurredAt: string;
}
