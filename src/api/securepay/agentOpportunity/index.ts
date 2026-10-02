import type { HttpClient } from '../http';
import type { QuickContractResultDto, SupportResultDto } from './dto';

export function createAgentOpportunityGateway(http: HttpClient) {
  return {
    triage: (body: { requestReference?: string; mode: 'ANSWER' | 'SUPPORT' | 'QUICK_CONTRACT' | 'COMMUNITY_SAVER' | 'OUTREACH'; reasonCode: string; subjectReference?: string }) =>
      http.request<void>('/api/v1/agent-opportunities/triage', { method: 'POST', body, auth: 'required' }),

    setSupportRate: (body: { helperRole: 'PLUG' | 'MASTER'; capabilityKey: string; rateMinor: number; currency: string; billingBasis: 'FIXED' | 'HOURLY' | 'PER_SESSION'; active: boolean }) =>
      http.request<void>('/api/v1/agent-opportunities/support-rates', { method: 'PUT', body, auth: 'required' }),

    setCapacityAvailability: (body: {
      capacityKind: 'MASTER' | 'PARTICIPANT'; available: boolean; availableFrom?: string | null; availableUntil?: string | null;
      scheduleNote?: string | null; areas?: string[]; capabilities?: string[]; maximumTasks?: number | null;
      currentTasks?: number | null; rateMinor?: number | null; currency?: string | null;
    }) => http.request<void>('/api/v1/agent-opportunities/capacity-availability', { method: 'PUT', body, auth: 'required' }),

    createSupport: (body: {
      idempotencyKey: string; conversationReference?: string | null; contextKind: 'GENERAL' | 'AGREEMENT' | 'STORE' | 'COMMUNITY' | 'INSTITUTE';
      contextReference?: string | null; summary: string; capabilityKey: string;
    }) => http.request<SupportResultDto>('/api/v1/agent-opportunities/support', { method: 'POST', body, auth: 'required' }),

    selectSupportOffer: (requestId: string, offerId: string) =>
      http.request<{ quickContractOpportunityId: string }>('/api/v1/agent-opportunities/support/' + encodeURIComponent(requestId) + '/offers/' + encodeURIComponent(offerId) + '/select', {
        method: 'POST', auth: 'required',
      }),

    createQuickContract: (body: {
      idempotencyKey: string; sourceKind: 'DIRECT' | 'STORE' | 'AGREEMENT' | 'COMMUNITY_SAVER'; sourceReference?: string | null;
      workNeeded: string; quantity?: number | null; unit?: string | null; locationLabel?: string | null; deadline?: string | null;
      requiredCapability?: string | null; riskLevel: 'LOW' | 'STANDARD' | 'HIGH' | 'PROFESSIONAL'; complianceNote?: string | null;
      priceMinor?: number | null; currency?: string | null; completionCondition: string; evidenceRequired?: string | null;
    }) => http.request<QuickContractResultDto>('/api/v1/agent-opportunities/quick-contracts', { method: 'POST', body, auth: 'required' }),

    decideQuickContract: (opportunityId: string, accept: boolean) =>
      http.request<void>('/api/v1/agent-opportunities/quick-contracts/' + encodeURIComponent(opportunityId) + '/decision', {
        method: 'POST', body: { accept }, auth: 'required',
      }),

    selectQuickContractCandidate: (opportunityId: string, candidateId: string) =>
      http.request<void>('/api/v1/agent-opportunities/quick-contracts/' + encodeURIComponent(opportunityId) + '/select', {
        method: 'POST', body: { candidateId }, auth: 'required',
      }),

    bindQuickContractAgreement: (opportunityId: string, agreementId: string) =>
      http.request<void>('/api/v1/agent-opportunities/quick-contracts/' + encodeURIComponent(opportunityId) + '/agreement', {
        method: 'POST', body: { agreementId }, auth: 'required',
      }),

    grantCommunitySaver: (body: { sourceKind: 'AGREEMENT' | 'QUICK_CONTRACT' | 'COMMUNITY_PROJECT'; sourceReference: string; shareScope: Record<string, boolean>; consentText: string }) =>
      http.request<{ consentId: string }>('/api/v1/agent-opportunities/community-saver', { method: 'POST', body, auth: 'required' }),

    withdrawCommunitySaver: (sourceKind: string, sourceReference: string) =>
      http.request<void>('/api/v1/agent-opportunities/community-saver/' + encodeURIComponent(sourceKind) + '/' + encodeURIComponent(sourceReference), {
        method: 'DELETE', auth: 'required',
      }),

    createOutreachCandidate: (body: { sourceKind: string; sourceReference: string; purpose: string }) =>
      http.request<{ candidateId: string }>('/api/v1/agent-opportunities/outreach/candidates', { method: 'POST', body, auth: 'required' }),

    grantOutreachPermission: (candidateId: string, body: { allowedFields: string[]; allowedChannels: string[]; participantStatement?: string | null }) =>
      http.request<void>('/api/v1/agent-opportunities/outreach/candidates/' + encodeURIComponent(candidateId) + '/permission', {
        method: 'PUT', body, auth: 'required',
      }),

    withdrawOutreachPermission: (candidateId: string) =>
      http.request<void>('/api/v1/agent-opportunities/outreach/candidates/' + encodeURIComponent(candidateId) + '/permission', {
        method: 'DELETE', auth: 'required',
      }),
  };
}

export type AgentOpportunityGateway = ReturnType<typeof createAgentOpportunityGateway>;
