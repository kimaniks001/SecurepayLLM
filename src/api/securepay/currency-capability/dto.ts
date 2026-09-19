/**
 * Currency/FX convergence -- "KS Identity -> regulated financial positions/accounts -> currency
 * capability" (locked product doctrine). Currency is never part of the KS identity itself; KES is
 * always the default. Mirrors the backend's CurrencyCapabilityStatus/CurrencyActivationOutcomeStatus.
 */
export type CurrencyCapabilityStatus = 'ACTIVE' | 'PENDING' | 'NOT_ACTIVATED' | 'FAILED';

export interface CurrencyCapability {
  currency: string;
  status: CurrencyCapabilityStatus;
  regulatedAccountMappingId: string | null;
}

export interface CurrencyCapabilityListResponse {
  items: CurrencyCapability[];
}

export type CurrencyActivationOutcomeStatus =
  | 'ACTIVE'
  | 'PENDING'
  | 'PARTNER_ONBOARDING_REQUIRED'
  | 'CURRENCY_NOT_SUPPORTED'
  | 'FAILED';

export interface ActivateCurrencyCapabilityResponse {
  currency: string;
  status: CurrencyActivationOutcomeStatus;
  applicationId: string | null;
  regulatedAccountMappingId: string | null;
  reason: string | null;
}
