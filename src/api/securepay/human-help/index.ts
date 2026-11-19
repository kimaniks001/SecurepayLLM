import type { HttpClient } from '../http';

/**
 * H3 shared-core help/KS001 handoff contract.
 * A response is guidance only: never a new case, selected provider,
 * authorization to amend terms or authorization to move Money.
 */
export type HumanNeed =
  | 'REPORT_SAFETY_CONCERN' | 'REVIEW_AGREEMENT' | 'TALK_TO_SOMEONE'
  | 'LOCAL_KNOWLEDGE' | 'FIELD_FACT_FINDING' | 'SPECIALIST_ADVICE';
export type HelpJourney = 'BUY' | 'SELL' | 'PAY' | 'COLLECT' | 'LIVING_AGREEMENT';
export interface HumanHelpRequest {
  need: HumanNeed;
  journey: HelpJourney;
  agreementId?: string;
  acceptedVersionId?: string;
}
export interface HumanHelpResponse {
  need: HumanNeed;
  journey: HelpJourney;
  next: 'START_WITH_KS001' | 'OPEN_AGREEMENT_REVIEW' | 'SAFETY_GUIDANCE' | 'EXPLORE_VOLUNTARY_HUMAN_HELP';
  serviceRoute: 'INCLUDED_AGREEMENT_HELP' | 'OPTIONAL_HUMAN_SERVICE';
  agreementVerified: boolean;
  agreementId: string | null;
  acceptedVersionId: string | null;
  answerOptions: string[];
  humanContactEstablished: false;
  caseOpened: false;
  agreementChanged: false;
  moneyAuthorized: false;
}
export function createHumanHelpGateway(http: Pick<HttpClient, 'request'>) {
  return {
    triage(request: HumanHelpRequest): Promise<HumanHelpResponse> {
      if (!request || !request.need || !request.journey) throw new Error('Choose how SecurePay can help');
      if (!!request.agreementId !== !!request.acceptedVersionId) throw new Error('Agreement and current version go together');
      return http.request<HumanHelpResponse>('/api/v1/human-layer/help/triage', {
        method: 'POST', auth: 'required',
        body: { need: request.need, journey: request.journey,
          agreementId: request.agreementId ?? null,
          acceptedVersionId: request.acceptedVersionId ?? null }
      });
    }
  };
}
export type HumanHelpGateway = ReturnType<typeof createHumanHelpGateway>;
