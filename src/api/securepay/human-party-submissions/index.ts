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

/** Source-grounded suggestions, never actual KS001 model findings or decisions. */
export interface HumanFairBrief extends HumanReviewScope {
  agreementReference: string;
  canonicalFacts: Array<{ field: string; value: string; provenance: string }>;
  attributedStatements: PartySubmission[];
  submittedEvidence: EvidenceSubmission[];
  nextQuestions: Array<{
    label: string; kind: 'HEAR_MISSING_PARTY'|'CLARIFY_TIMELINE'|
      'REVIEW_SOURCE_EVIDENCE'|'EXPLORE_INDEPENDENT_FACT_CHECK'|
      'INVITE_VOLUNTARY_DISCUSSION';
    requiresExplicitPartyAction: true;
  }>;
  bothPartySubmissionsPresent: boolean;
  affectedPartiesAllHeard: false;
  evidenceVerified: false;
  ks001HasMadeFinding: false;
  bindingDecisionMade: false;
  amendmentAuthorized: false;
  moneyInstructionAuthorized: false;
  automaticModelDisclosureAuthorized: false;
}

export function createHumanFairBriefGateway(http: Pick<HttpClient, 'request'>) {
  return {
    async read(scope: HumanReviewScope): Promise<HumanFairBrief> {
      if (!scope || !scope.agreementId?.trim() ||
          !scope.acceptedVersionId?.trim() || !scope.reviewCaseId?.trim())
        throw new Error('Select an authorized Agreement review and current version');
      const clean: HumanReviewScope = {
        agreementId: scope.agreementId.trim(),
        acceptedVersionId: scope.acceptedVersionId.trim(),
        reviewCaseId: scope.reviewCaseId.trim()
      };
      const result = await http.request<HumanFairBrief>(
        '/api/v1/human-layer/help/fair-brief', {
          method: 'POST', auth: 'required', body: clean
        });
      if (result.agreementId !== clean.agreementId ||
          result.acceptedVersionId !== clean.acceptedVersionId ||
          result.reviewCaseId !== clean.reviewCaseId)
        throw new Error('Unexpected source Agreement or review case');
      if (result.ks001HasMadeFinding || result.automaticModelDisclosureAuthorized ||
          result.moneyInstructionAuthorized || result.bindingDecisionMade ||
          result.amendmentAuthorized)
        throw new Error('The response made an unsupported authority claim');
      return result;
    }
  };
}
export type HumanFairBriefGateway = ReturnType<typeof createHumanFairBriefGateway>;

