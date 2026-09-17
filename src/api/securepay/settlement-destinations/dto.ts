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
