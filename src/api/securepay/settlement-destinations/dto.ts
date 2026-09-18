export interface SettlementDestinationResponse {
  destinationId: string;
  ownerIdentityId: string;
  canonicalKsNumber: string;
  currency: string;
  destinationStatus: string;
  verificationStatus: string;
  maskedDestinationDisplay: string;
  beneficiaryNameReturned: string | null;
  coolingOffUntil: string | null;
  predecessorDestinationId: string | null;
}

export interface SettlementVerificationStatusResponse {
  verificationId: string;
  settlementDestinationId: string;
  canonicalKsNumber: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
  verificationStatus: string;
  verificationDecision: string | null;
  maskedDestinationFingerprint: string;
  providerTxReference: string | null;
}

export type ExternalDestinationAccountKind = 'BANK' | 'MOBILE_MONEY';

/**
 * Final Completion Phase 2, Section 7 — every field here is real information only the customer
 * can supply about the external account they want paid into. There is no ownerIdentityId,
 * canonicalKsNumber, regulatedAccountMappingId, destinationFingerprintDigest, or
 * maskedDestinationDisplay field: the backend derives those from the authenticated identity.
 */
export interface RegisterMySettlementDestinationRequest {
  destinationType: 'PRIMARY_SETTLEMENT' | 'COLLECTION' | 'DISBURSEMENT' | 'OTHER';
  currency: string;
  accountKind: ExternalDestinationAccountKind;
  bankCode: string | null;
  accountNumber: string;
  beneficiaryName: string;
}
