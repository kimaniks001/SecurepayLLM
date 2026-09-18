import { segment, type HttpClient } from '../http';
import type { AdoptFactRequest, AgentAgreementWorkspaceAskDto, AgentResponseDto, CandidateDto, ContinueHandoffRequest, ConversationDto, ExternalFactRequest, HandoffDto, TradeContextDto, TurnRequest } from './dto';
export function createAgentGateway(http: HttpClient) {
  const conversation = (id: string) => `/api/agent/conversations/${segment(id)}`;
  const handoff = (id: string) => `/api/agent/agreement-handoffs/${segment(id)}`;
  return {
    createConversation: () => http.request<ConversationDto>('/api/agent/conversations', { method: 'POST', auth: 'none' }),
    // Phase 3 Living Agreements: ask SecurePay about an EXISTING, already-established private
    // Agreement. Requires the caller's own real authentication/authority -- see
    // AgentAgreementWorkspaceController; conversation alone never grants access.
    agreementWorkspaceView: (conversationId: string, agreementId: string) =>
      http.request<AgentAgreementWorkspaceAskDto>(
          `${conversation(conversationId)}/agreements/${segment(agreementId)}/workspace-view`, { auth: 'required' }),
    submitTurn: (id: string, body: TurnRequest) => http.request<AgentResponseDto>(`${conversation(id)}/turns`, { method: 'POST', body, auth: 'none' }),
    readContext: (id: string) => http.request<TradeContextDto>(`${conversation(id)}/context`, { auth: 'none' }),
    adoptFact: (id: string, body: AdoptFactRequest) => http.request<TradeContextDto>(`${conversation(id)}/facts/adopt`, { method: 'POST', body, auth: 'none' }),
    submitAmount: (id: string, body: ExternalFactRequest & { amount: string; currency?: string }) => http.request<TradeContextDto>(`${conversation(id)}/external-facts/amount`, { method: 'POST', body, auth: 'none' }),
    submitDate: (id: string, body: ExternalFactRequest & { date: string }) => http.request<TradeContextDto>(`${conversation(id)}/external-facts/date`, { method: 'POST', body, auth: 'none' }),
    lookupPriorTerm: (id: string, body: { sourceAgreementPublicReference: string; termQuery: string; clientTurnId?: string }) => http.request<TradeContextDto>(`${conversation(id)}/prior-agreement-terms`, { method: 'POST', body, auth: 'required' }),
    createHandoff: (id: string, clientActionId?: string) => http.request<HandoffDto>(`${conversation(id)}/agreement-handoff`, { method: 'POST', body: { clientActionId }, auth: 'optional' }),
    readHandoff: (id: string) => http.request<HandoffDto>(handoff(id), { auth: 'optional' }),
    adoptHandoff: (id: string) => http.request<HandoffDto>(`${handoff(id)}/adopt`, { method: 'POST', auth: 'required' }),
    reviewHandoff: (id: string) => http.request<CandidateDto>(`${handoff(id)}/review`, { auth: 'required' }),
    continueHandoff: (id: string, body: ContinueHandoffRequest) => http.request<HandoffDto>(`${handoff(id)}/continue`, { method: 'POST', body, auth: 'required' }),
  };
}
export type AgentGateway = ReturnType<typeof createAgentGateway>;
