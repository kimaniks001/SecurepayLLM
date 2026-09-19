export type FxOperation = 'BUY' | 'SELL';

export type FxApplicationStatus =
  | 'REQUESTED'
  | 'SUBMITTED_TO_PROVIDER'
  | 'PROVIDER_PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SETTLED'
  | 'FAILED';

export interface CreateFxApplicationRequest {
  sourceAccountMappingId: string;
  targetAccountMappingId: string;
  operation: FxOperation;
  amountMinor: number;
  idempotencyKey: string;
}

/** Application-based, like Choice's own contract -- never an instant rate/settlement. */
export interface FxApplicationResponse {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  operation: FxOperation;
  amountMinor: number;
  status: FxApplicationStatus;
  requestedAt: string;
  resolvedAt: string | null;
  /** Present only once Choice has supplied genuine movement evidence -- this, not APPROVED alone, is what moves status to SETTLED. */
  providerExecutionReference: string | null;
}

export interface FxCapabilityResponse {
  available: boolean;
  applicationCertified: boolean;
  supportedCurrencies: string[];
}
