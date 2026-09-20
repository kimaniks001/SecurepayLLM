import { segment, type HttpClient } from '../http';

/**
 * Outbound Payment Release, READ side only (`PaymentReleaseParticipantController`). The create-instruction / reserve / execute
 * commands are deliberately NOT modelled: they are gated by an environment guard no read exposes, are sandbox-only for execution, and are
 * not atomic against a concurrent Agreement version change (see docs/UI_COMPLETION_PHASE8_MONEY.md).
 */
export interface ReleaseAuthorityResponse { authorized: boolean; reasonCode: string; evaluationId: string | null; evaluationSequence: number | null }
export interface ReleaseInstructionResponse {
  instructionId: string; paymentReadyEvaluationId: string; paymentReadyEvaluationSequence: number; productType: string; agreementId: string; agreementVersion: string;
  scopeIdentifiers: string[]; recipientKsNumber: string | null; pricingSnapshotId: string | null; settlementDestinationId: string | null;
  settlementDestinationMaskedDisplay: string | null; sequence: number; createdAt: string;
}
export interface ReleaseExceptionResponse { exceptionId: string; instructionId: string; exceptionType: string; customerSafeReason: string | null; requiredAction: string | null; recordedAt: string; compensatedOutcome: boolean }
export interface ReleaseSettlementStatusResponse { instructionId: string; settlementPhase: string; reservationId: string | null; executionId: string | null; exception: ReleaseExceptionResponse | null; settledAt: string | null }

export function createPaymentReleaseGateway(http: HttpClient) {
  const base = (agreementId: string) => `/api/v1/agreements/${segment(agreementId)}/payment-release`;
  return {
    releaseAuthority: (agreementId: string) => http.request<ReleaseAuthorityResponse>(`${base(agreementId)}/participants/me/release-authority`, { auth: 'required' }),
    instructions: (agreementId: string) => http.request<ReleaseInstructionResponse[]>(`${base(agreementId)}/instructions`, { auth: 'required' }),
    settlementStatus: (agreementId: string, instructionId: string) => http.request<ReleaseSettlementStatusResponse>(`${base(agreementId)}/instructions/${segment(instructionId)}/settlement-status`, { auth: 'required' }),
  };
}
export type PaymentReleaseGateway = ReturnType<typeof createPaymentReleaseGateway>;
