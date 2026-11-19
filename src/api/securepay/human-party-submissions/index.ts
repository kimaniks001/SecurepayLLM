import type { HttpClient } from '../http';

/**
 * H3 read-only legacy case submission seam. This endpoint does NOT create
 * a case, read attachments, examine uploaded content or authorize Money.
 * Invoke only with an Agreement/version/case selected from authenticated
 * source data, never arbitrary preview or invitation query parameters.
 */
export interface HumanReviewScope {
  agreementId: string;
  acceptedVersionId: string;
  reviewCaseId: string;
}
export interface PartySubmission {
  sourceResponseId: string;
  attribution: 'YOU' | 'OTHER_AGREEMENT_PARTY';
  responseType: string;
  submittedNarrative: string;
  submittedAt: string;
  status: 'SUBMITTED_NOT_VERIFIED';
}
export interface EvidenceSubmission {
  sourceEvidenceId: string;
  attribution: 'YOU' | 'OTHER_AGREEMENT_PARTY';
  evidenceType: string;
  submitterDescription: string;
  submittedAt: string;
  status: 'SUBMITTED_NOT_EXAMINED';
}
export interface HumanReviewCaseSnapshot extends HumanReviewScope {
  reviewCaseState: string;
  partyStatements: PartySubmission[];
  evidenceSubmissions: EvidenceSubmission[];
  yourSideSubmitted: boolean;
  anotherPartySubmitted: boolean;
  bothPartiesSubmissionsPresent: boolean;
  statementsVerified: false;
  evidenceExamined: false;
  bindingDecisionMade: false;
  agreementAmended: false;
  moneyInstructionAuthorized: false;
}

export function createHumanPartySubmissionGateway(http: Pick<HttpClient, 'request'>) {
  return {
    async read(scope: HumanReviewScope): Promise<HumanReviewCaseSnapshot> {
      if (!scope || !scope.agreementId?.trim() ||
          !scope.acceptedVersionId?.trim() || !scope.reviewCaseId?.trim())
        throw new Error('Select an authorized Agreement review and current version');
      const clean: HumanReviewScope = {
        agreementId: scope.agreementId.trim(),
        acceptedVersionId: scope.acceptedVersionId.trim(),
        reviewCaseId: scope.reviewCaseId.trim(),
      };
      const result = await http.request<HumanReviewCaseSnapshot>(
        '/api/v1/human-layer/help/party-submissions', {
          method: 'POST', auth: 'required', body: clean,
        });
      if (result.agreementId !== clean.agreementId ||
          result.acceptedVersionId !== clean.acceptedVersionId ||
          result.reviewCaseId !== clean.reviewCaseId)
        throw new Error('Unexpected Agreement or review case context');
      return result;
    },
  };
}
export type HumanPartySubmissionGateway = ReturnType<typeof createHumanPartySubmissionGateway>;
