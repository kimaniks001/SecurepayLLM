export interface AgreementFundedAuthorityStatusResponse {
  agreementId: string;
  obligationId: string | null;
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
}

export interface AgreementFundedAuthorityExerciseResponse {
  agreementId: string;
  obligationId: string;
  exerciseEventId: string;
  amountMinor: number;
  cumulativeExercisedMinor: number;
  remainingFundedMinor: number;
}

export interface AgreementFundedAuthorityReleaseResponse {
  agreementId: string;
  obligationId: string;
  releasedTotalMinor: number;
}
