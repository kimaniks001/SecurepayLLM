import { segment, type HttpClient } from '../http';
import type { KsIdentityDto, AdoptFactRequest, AgentAgreementAccessGrantDto, AgentAgreementWorkspaceAskDto, AgentResponseDto, AgreementReviewResponseDto, ContinueHandoffRequest, ConversationDto, ExternalFactRequest, HandoffDto, SelectCommercialSourceRequest, SelectedCommercialSourceDto, TradeContextDto, TurnRequest } from './dto';
export function createAgentGateway(http: HttpClient) {
  const conversation = (id: string) => `/api/agent/conversations/${segment(id)}`;
  const handoff = (id: string) => `/api/agent/agreement-handoffs/${segment(id)}`;
  return {
    createConversation: () => http.request<ConversationDto>('/api/agent/conversations', { method: 'POST', auth: 'none' }),
    // Final Phase 3 correction (Section 4/6/9): the ONE place a bounded Agent access grant for an
    // existing, private Agreement is created. Idempotent for a retry of the same conversation/
    // owner/Agreement (the backend reuses the existing live grant); a live grant already pointed
    // at a DIFFERENT Agreement is refused -- see switchAccessGrant for that explicit transition.
    createAccessGrant: (conversationId: string, agreementId: string) =>
      http.request<AgentAgreementAccessGrantDto>(`${conversation(conversationId)}/access-grants`, { method: 'POST', body: { agreementId }, auth: 'required' }),
    // Final Phase 3 correction (Section 6): the explicit, audited transition for switching which
    // Agreement this conversation's grant points to (revokes the prior one first).
    switchAccessGrant: (conversationId: string, agreementId: string) =>
      http.request<AgentAgreementAccessGrantDto>(`${conversation(conversationId)}/access-grants/switch`, { method: 'POST', body: { agreementId }, auth: 'required' }),
    // Phase 3 Living Agreements: ask SecurePay about an EXISTING, already-established private
    // Agreement via the transitional, deterministic endpoint. Requires the caller's own real
    // authentication/authority AND an already-issued grantId (see createAccessGrant) -- conversation
    // alone never grants access, and this never mints a grant as a side effect of the read.
    agreementWorkspaceView: (conversationId: string, agreementId: string, grantId: string) =>
      http.request<AgentAgreementWorkspaceAskDto>(
          `${conversation(conversationId)}/agreements/${segment(agreementId)}/workspace-view?grantId=${segment(grantId)}`, { auth: 'required' }),
    // Final Phase 3 correction (Section 3): optional-auth transport -- a signed-out person may
    // still submit turns without credentials (formation stays available); a signed-in person's
    // turn carries their existing session so the backend can obtain the actual current actor for
    // private Agreement/Home tools. The model never supplies identity; this is purely a transport
    // concern, matching the existing createHandoff/readHandoff convention below.
    submitTurn: (id: string, body: TurnRequest) => http.request<AgentResponseDto>(`${conversation(id)}/turns`, { method: 'POST', body, auth: 'optional' }),
    // Phase 1 Conversational Workbench: the KSFinder's ONE identity read. `auth: 'optional'` because
    // formation is available signed-out. Caller MUST normalise/validate the KS Number first (the
    // backend parser is strict: ^KS[0-9]{3,}$, no whitespace) and MUST pass the result through
    // `ksIdentityView`, which drops every field except the participant-safe projection.
    lookupKsIdentity: (canonicalKsNumber: string) => http.request<KsIdentityDto>(`/api/v1/identities/by-ksnumber/${segment(canonicalKsNumber)}`, { auth: 'optional' }),
    readContext: (id: string) => http.request<TradeContextDto>(`${conversation(id)}/context`, { auth: 'none' }),
    adoptFact: (id: string, body: AdoptFactRequest) => http.request<TradeContextDto>(`${conversation(id)}/facts/adopt`, { method: 'POST', body, auth: 'none' }),
    submitAmount: (id: string, body: ExternalFactRequest & { amount: string; currency?: string }) => http.request<TradeContextDto>(`${conversation(id)}/external-facts/amount`, { method: 'POST', body, auth: 'none' }),
    // Final Phase 4 Economy Turn 2 (Section 3/9) -- records which real commercial source (e.g. a
    // published Store offer) this conversation is proceeding from. A pointer only -- the backend
    // re-derives every material fact from the real record itself, never trusting this body's
    // title/price. Read exactly once, at Agreement-handoff progression, never here.
    selectCommercialSource: (id: string, body: SelectCommercialSourceRequest) =>
      http.request<SelectedCommercialSourceDto>(`${conversation(id)}/commercial-source`, { method: 'POST', body, auth: 'none' }),
    submitDate: (id: string, body: ExternalFactRequest & { date: string }) => http.request<TradeContextDto>(`${conversation(id)}/external-facts/date`, { method: 'POST', body, auth: 'none' }),
    lookupPriorTerm: (id: string, body: { sourceAgreementPublicReference: string; termQuery: string; clientTurnId?: string }) => http.request<TradeContextDto>(`${conversation(id)}/prior-agreement-terms`, { method: 'POST', body, auth: 'required' }),
    createHandoff: (id: string, clientActionId?: string) => http.request<HandoffDto>(`${conversation(id)}/agreement-handoff`, { method: 'POST', body: { clientActionId }, auth: 'optional' }),
    readHandoff: (id: string) => http.request<HandoffDto>(handoff(id), { auth: 'optional' }),
    adoptHandoff: (id: string) => http.request<HandoffDto>(`${handoff(id)}/adopt`, { method: 'POST', auth: 'required' }),
    reviewHandoff: (id: string) => http.request<AgreementReviewResponseDto>(`${handoff(id)}/review`, { auth: 'required' }),
    continueHandoff: (id: string, body: ContinueHandoffRequest) => http.request<HandoffDto>(`${handoff(id)}/continue`, { method: 'POST', body, auth: 'required' }),
    // Final Phase 4 Economy Turn 3 (Section 7) -- "review/use current source": never mutates the
    // old, stale handoff; mints a brand new one bound to a freshly re-captured source selection.
    useCurrentSource: (id: string, clientActionId?: string) =>
      http.request<HandoffDto>(`${handoff(id)}/use-current-source`, { method: 'POST', body: { clientActionId }, auth: 'required' }),
  };
}
export type AgentGateway = ReturnType<typeof createAgentGateway>;
