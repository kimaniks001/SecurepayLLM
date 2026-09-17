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

export interface MoneySessionViewResponse {
  agreementId: string;
  obligationId: string;
  purpose: MoneySessionPurpose;
  amountMinorCap: number | null;
  currency: string;
  expiresAt: string;
}
