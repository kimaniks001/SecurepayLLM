/**
 * Final Completion Phase 2 completion pass, Section 1/10 -- the real, provider-driven funding
 * journey: rail discovery, quoting, agreement-bound payment-intent creation, and initiation.
 * Every shape here mirrors AgreementFundingController / PaymentIntentController exactly; the
 * frontend never invents an amount, currency, beneficiary, or rail eligibility -- every one of
 * those is server-derived.
 */

export interface AgreementFundingAuthorityResponse {
  authorized: boolean;
  reasonCode: string;
}

export interface AgreementFundingOptionResponse {
  railCode: string;
  displayName: string;
  currency: string;
  minimumAmountMinor: number | null;
  maximumAmountMinor: number | null;
  quoteAvailable: boolean;
}

export interface AgreementFundingOptionListResponse {
  items: AgreementFundingOptionResponse[];
}

export interface AgreementFundingQuoteResponse {
  quoteReference: string;
  agreementId: string;
  railCode: string;
  amountMinor: number;
  currency: string;
  providerChargeMinor: number;
  platformChargeMinor: number;
  totalChargeMinor: number;
  expiresAt: string;
}

export interface AgreementPaymentIntentCreateResponse {
  paymentIntentId: string;
  agreementId: string;
  obligationId: string;
  amountMinor: number;
  currency: string;
  status: PaymentIntentStatus;
  createdAt: string;
  replayed: boolean;
}

/** `retryEligible` true means this exact intent reached a terminal, unsuccessful state -- retry always means creating a new intent, never re-posting to this one. */
export interface AgreementPaymentIntentSummaryResponse {
  id: string;
  status: PaymentIntentStatus;
  amountMinor: number;
  currency: string;
  latestAttemptStatus: string | null;
  retryEligible: boolean;
  createdAt: string;
  lastStateChangeAt: string;
}

export interface AgreementPaymentIntentListResponse {
  items: AgreementPaymentIntentSummaryResponse[];
  page: number;
  size: number;
  totalElements: number;
}

export type PaymentIntentStatus =
  | 'CREATED'
  | 'INITIATION_PENDING'
  | 'ACTION_REQUIRED'
  | 'PROVIDER_PENDING'
  | 'CONFIRMATION_PENDING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface PaymentIntentResponse {
  id: string;
  currency: string;
  amountMinor: number;
  status: PaymentIntentStatus;
  actionRequired: boolean;
  providerConfirmationAccepted: boolean;
  conflictDetected: boolean;
  createdAt: string;
  lastStateChangeAt: string;
  confirmedAt: string | null;
  expiresAt: string | null;
  agreementId: string | null;
  obligationId: string | null;
}

export interface PaymentAttemptResponse {
  id: string;
  attemptNumber: number;
  providerIdentifier: string;
  initiationStatus: string;
  providerReference: string | null;
  redirectUrl: string | null;
  clientInstructionType: string | null;
  clientInstructionMetadata: Record<string, unknown> | null;
  submittedAt: string;
  responseAt: string | null;
}

export interface InitiatePaymentResponse {
  paymentIntentId: string;
  status: PaymentIntentStatus;
  attemptId: string;
  providerIdentifier: string;
  initiationStatus: string;
  redirectUrl: string | null;
  clientInstructionType: string | null;
  clientInstructionMetadata: Record<string, unknown> | null;
  replayed: boolean;
}
