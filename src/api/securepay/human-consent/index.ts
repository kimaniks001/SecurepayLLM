import type { HttpClient } from '../http';
import type { HumanReviewScope } from '../human-party-submissions';

export type HumanConsentScope = HumanReviewScope & {
  dataScope: 'SUBMITTED_STATEMENT_TEXT' | 'SUBMITTED_EVIDENCE_METADATA';
};
export interface HumanConsentStatus {
  scope: HumanConsentScope;
  myPermission: 'NOT_GIVEN'|'GRANTED'|'WITHDRAWN'|'EXPIRED';
  myExpiry: string | null;
  myRevision: number;
  participation: {
    state: 'WAITING_FOR_EXPLICIT_CONSENT'|'CONSENT_REVOKED_OR_EXPIRED'|
      'ALL_REQUIRED_PARTIES_CONSENTED'|'INVALID_SOURCE_OR_PARTICIPANTS';
    requiredOriginalPartyCount: number;
    explicitlyConsentingPartyCount: number;
    stillAwaitingPartyCount: number;
    allRequiredPartiesConsented: boolean;
    modelProcessingAuthorized: false;
  };
  privateContentSharedWithModel: false;
  bindingDecisionMade: false;
  moneyInstructionAuthorized: false;
}

function verify(source: HumanConsentScope, status: HumanConsentStatus): HumanConsentStatus {
  if (!status || status.scope?.agreementId !== source.agreementId ||
      status.scope?.acceptedVersionId !== source.acceptedVersionId ||
      status.scope?.reviewCaseId !== source.reviewCaseId ||
      status.scope?.dataScope !== source.dataScope ||
      status.participation?.modelProcessingAuthorized !== false ||
      status.privateContentSharedWithModel !== false ||
      status.bindingDecisionMade !== false ||
      status.moneyInstructionAuthorized !== false) {
    throw new Error('Permission status was not verified from the expected source');
  }
  return status;
}
function valid(source: HumanConsentScope) {
  if (!source || !source.agreementId?.trim() ||
      !source.acceptedVersionId?.trim() || !source.reviewCaseId?.trim() ||
      !['SUBMITTED_STATEMENT_TEXT','SUBMITTED_EVIDENCE_METADATA'].includes(source.dataScope))
    throw new Error('Choose the exact current Agreement review and information type');
  return {agreementId:source.agreementId.trim(),
    acceptedVersionId:source.acceptedVersionId.trim(),
    reviewCaseId:source.reviewCaseId.trim(),
    dataScope:source.dataScope} as HumanConsentScope;
}
function command(commandId: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(commandId))
    throw new Error('An independent permission command is required');
  return {'Idempotency-Key':commandId};
}
/**
 * H3 first-party exact-case consent journal. Every operation requires the
 * existing in-memory authenticated Mini session, with no model execution.
 * No account or scope is read from URL query parameters.
 */
export function createHumanConsentGateway(http: Pick<HttpClient, 'request'>) {
  return {
    async status(source: HumanConsentScope) {
      const s=valid(source);
      return verify(s,await http.request<HumanConsentStatus>(
        '/api/v1/human-layer/help/ai-consent/status',
        {method:'POST',auth:'required',body:s}));
    },
    async grant(source: HumanConsentScope, expiresAt: string, commandId: string) {
      const s=valid(source);
      if (!Number.isFinite(Date.parse(expiresAt))) throw new Error('Choose an expiry date');
      return verify(s,await http.request<HumanConsentStatus>(
        '/api/v1/human-layer/help/ai-consent/grant',
        {method:'POST',auth:'required',headers:command(commandId),
         body:{source:s,expiresAt,
           iExplicitlyConsentToFutureKs001ReviewOfMySelectedData:true}}));
    },
    async withdraw(source: HumanConsentScope, commandId: string) {
      const s=valid(source);
      return verify(s,await http.request<HumanConsentStatus>(
        '/api/v1/human-layer/help/ai-consent/withdraw',
        {method:'POST',auth:'required',headers:command(commandId),body:s}));
    }
  };
}
export type HumanConsentGateway = ReturnType<typeof createHumanConsentGateway>;
