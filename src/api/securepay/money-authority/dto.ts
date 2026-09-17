export interface FundedAuthorityPositionResponse {
  authorityId: string;
  currency: string;
  authorisedMaxAmountMinor: number;
  fundedTotalMinor: number;
  exercisedOrSettledMinor: number;
  releasedTotalMinor: number;
  remainingFundedMinor: number;
  closed: boolean;
}

export interface FundedAuthorityExerciseResponse {
  authorityId: string;
  exerciseEventId: string;
  amountMinor: number;
  cumulativeExercisedMinor: number;
  remainingFundedMinor: number;
}

export interface FundedAuthorityReleaseResponse {
  authorityId: string;
  releasedTotalMinor: number;
}
