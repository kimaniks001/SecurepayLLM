import type { HttpClient } from '../http';
import type { HumanConsentScope } from '../human-consent';

/**
 * This is an auditable privacy-check request, NOT a model examination.
 * No statement, upload, evidence body, Money, client-supplied caller identity
 * or authorization token is included in the request payload.
 */
export interface HumanExamReadiness extends HumanConsentScope {
  outcome: 'AWAITING_PARTY_CONSENT' | 'PRIVACY_CHECK_READY';
  activeOriginalPartyCount: number;
  consentingOriginalPartyCount: number;
  awaitingOriginalPartyCount: number;
  nonbindingQuestions: string[];
  allPartiesConsentChecked: boolean;
  actualKs001ExaminationAvailable: false;
  ks001ModelInvoked: false;
  privateDataSentToModel: false;
  evidenceVerified: false;
  bindingDecisionMade: false;
  agreementChanged: false;
  moneyAuthorized: false;
}
const KEY=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function createHumanExamReadinessGateway(http: Pick<HttpClient,'request'>) {
  return {
    async prepare(source: HumanConsentScope, commandId: string): Promise<HumanExamReadiness> {
      if (!source?.agreementId?.trim() || !source?.acceptedVersionId?.trim() ||
          !source?.reviewCaseId?.trim() ||
          !['SUBMITTED_STATEMENT_TEXT','SUBMITTED_EVIDENCE_METADATA'].includes(source.dataScope) ||
          !KEY.test(commandId))
        throw new Error('Select the current authorized Agreement, case and information type');
      const clean={agreementId:source.agreementId.trim(),
        acceptedVersionId:source.acceptedVersionId.trim(),
        reviewCaseId:source.reviewCaseId.trim(),dataScope:source.dataScope};
      const response=await http.request<HumanExamReadiness>(
        '/api/v1/human-layer/help/ai-examination/prepare',{
          method:'POST',auth:'required',headers:{'Idempotency-Key':commandId},body:clean
        });
      if (!response || response.agreementId!==clean.agreementId ||
          response.acceptedVersionId!==clean.acceptedVersionId ||
          response.reviewCaseId!==clean.reviewCaseId ||
          response.dataScope!==clean.dataScope ||
          response.actualKs001ExaminationAvailable!==false ||
          response.ks001ModelInvoked!==false ||
          response.privateDataSentToModel!==false ||
          response.evidenceVerified!==false ||
          response.bindingDecisionMade!==false ||
          response.agreementChanged!==false ||
          response.moneyAuthorized!==false ||
          !Array.isArray(response.nonbindingQuestions) ||
          !Number.isInteger(response.activeOriginalPartyCount) ||
          !Number.isInteger(response.consentingOriginalPartyCount) ||
          !Number.isInteger(response.awaitingOriginalPartyCount) ||
          response.activeOriginalPartyCount<1 ||
          response.consentingOriginalPartyCount<0 ||
          response.awaitingOriginalPartyCount<0 ||
          response.activeOriginalPartyCount!==
            response.consentingOriginalPartyCount+response.awaitingOriginalPartyCount)
        throw new Error('KS001 readiness could not be verified');
      return response;
    }
  };
}
export type HumanExamReadinessGateway=ReturnType<typeof createHumanExamReadinessGateway>;
