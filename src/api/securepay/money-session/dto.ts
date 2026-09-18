export type MoneySessionPurpose = 'OPEN' | 'FUND' | 'EXERCISE' | 'RELEASE';

export interface CreateMoneySessionRequest {
  agreementId: string;
  obligationId: string;
  purpose: MoneySessionPurpose;
  amountMinorCap: number | null;
}

/** `token` is returned exactly once -- the backend stores only its digest and cannot show it again. */
export interface CreateMoneySessionResponse {
  sessionId: string;
  token: string;
  expiresAt: string;
}

/**
 * Final Completion Phase 2 completion pass, Section 13/4 -- every field below is server-derived
 * from the underlying Agreement/Obligation/position, never fabricated for display.
 * `allowedEmbedOrigins` is the owning developer application's own pre-registered trusted-origin
 * allow-list (empty for a self-service, non-embeddable session) -- see Section 4's embed contract.
 */
export interface MoneySessionViewResponse {
  agreementId: string;
  obligationId: string;
  purpose: MoneySessionPurpose;
  amountMinorCap: number | null;
  currency: string;
  expiresAt: string;
  agreementTitle: string | null;
  obligationTitle: string | null;
  obligationDescription: string | null;
  beneficiaryMaskedKsNumber: string | null;
  remainingAfterMinor: number | null;
  providerSettlementCertified: boolean;
  allowedEmbedOrigins: string[];
}
