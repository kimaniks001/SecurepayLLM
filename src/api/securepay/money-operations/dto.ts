/**
 * Final Completion Phase 2 completion pass, Section 6 -- the Money-operations read surface for
 * support/ops roles. Summary fields only -- never a raw provider-adjacent payload. Reading this
 * never grants financial mutation authority (the backend enforces this via REGULATED_PARTNER_READ,
 * a read-only permission).
 */

export interface PartnerStatusResponse {
  partnerCode: string;
  displayName: string;
  partnerType: string;
  environment: string;
  status: string;
}

export interface OpenExceptionResponse {
  id: string;
  exceptionType: string;
  severity: string;
  status: string;
  summary: string;
  openedAt: string;
}

export interface PendingReconciliationResponse {
  id: string;
  settlementDestinationId: string;
  verificationStatus: string;
  initiatedAt: string;
}

export interface PendingRecoveryResponse {
  id: string;
  exerciseEventId: string;
  status: string;
  requestedAt: string;
}

export interface MoneyOperationsSummaryResponse {
  partners: PartnerStatusResponse[];
  choiceConnectorActive: boolean;
  choiceOutboundTransferAllowed: boolean;
  choiceInternalTransferCertified: boolean;
  fxEnabled: boolean;
  openExceptions: OpenExceptionResponse[];
  pendingReconciliation: PendingReconciliationResponse[];
  pendingRecovery: PendingRecoveryResponse[];
}
