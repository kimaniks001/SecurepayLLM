import { segment, type HttpClient } from '../http';
import type { AdoptFactRequest, AgentAgreementAccessGrantDto, AgentAgreementWorkspaceAskDto, AgentResponseDto, AgreementReviewResponseDto, ContinueHandoffRequest, ConversationDto, ConversationHistoryResponseDto, ExternalFactRequest, HandoffDto, KsIdentitySelectionRequest, KsIdentitySelectionResult, SavedBuildDto, SelectCommercialSourceRequest, SelectedCommercialSourceDto, StructuredInputRequest, StructuredInputResult, TradeContextDto, TurnRequest } from './dto';
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
    // KS001 Upgrade Phase 2 final acceptance correction (item 1) -- FIX: these six calls were `auth:
    // 'none'`, which explicitly strips the token even for a signed-in caller (see http client: 'none'
    // forces token = null, unlike 'optional' which attaches one when present but never requires it).
    // AgentConversationAccessPolicy now gates every one of these on the backend once a conversation is
    // saved, resolving the current actor from that same token -- with 'none' the true OWNER of a saved
    // conversation would always be sent as anonymous and rejected exactly like a stranger, breaking
    // "Continue Building" the moment a conversation is actually saved. 'optional' preserves today's
    // signed-out-friendly behaviour for a never-saved conversation (no token is required) while letting
    // a signed-in owner's token reach the backend so the ownership check can actually succeed.
    readContext: (id: string) => http.request<TradeContextDto>(`${conversation(id)}/context`, { auth: 'optional' }),
    // KS001 Upgrade Phase 2 final acceptance correction (item 1) -- the user-visible dialogue history
    // for resuming a conversation. Same access-policy ratchet as readContext; see that field's own
    // comment for why 'optional' (never 'none') is required here.
    conversationHistory: (id: string, limit?: number) =>
      http.request<ConversationHistoryResponseDto>(
          `${conversation(id)}/history${limit !== undefined ? `?limit=${limit}` : ''}`, { auth: 'optional' }),
    adoptFact: (id: string, body: AdoptFactRequest) => http.request<TradeContextDto>(`${conversation(id)}/facts/adopt`, { method: 'POST', body, auth: 'optional' }),
    submitAmount: (id: string, body: ExternalFactRequest & { amount: string; currency?: string }) => http.request<TradeContextDto>(`${conversation(id)}/external-facts/amount`, { method: 'POST', body, auth: 'optional' }),
    // Final Phase 4 Economy Turn 2 (Section 3/9) -- records which real commercial source (e.g. a
    // published Store offer) this conversation is proceeding from. A pointer only -- the backend
    // re-derives every material fact from the real record itself, never trusting this body's
    // title/price. Read exactly once, at Agreement-handoff progression, never here.
    selectCommercialSource: (id: string, body: SelectCommercialSourceRequest) =>
      http.request<SelectedCommercialSourceDto>(`${conversation(id)}/commercial-source`, { method: 'POST', body, auth: 'optional' }),
    submitDate: (id: string, body: ExternalFactRequest & { date: string }) => http.request<TradeContextDto>(`${conversation(id)}/external-facts/date`, { method: 'POST', body, auth: 'optional' }),
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
    // Phase 4 of the Agent/Trade-Context Convergence -- the second legitimate Trade Context write path:
    // an EXPLICIT UI ACTION (an instrument submission or a direct UNDERSTOOD edit), never a fabricated
    // chat sentence. Idempotent on the caller-supplied clientActionId, exactly like every other
    // idempotency-keyed command in this codebase.
    submitStructuredInput: (id: string, body: StructuredInputRequest) =>
      http.request<StructuredInputResult>(`${conversation(id)}/structured-inputs`, { method: 'POST', body, auth: 'optional' }),
    // Phase 4, Part C -- the Who instrument's "I have their KS Number" trusted-user-action path. Omitting
    // expectedTradeContextVersion performs a PURE lookup (a preview, no Trade Context effect); supplying
    // it also binds the resolved identity as a CANDIDATE participant.
    selectKsIdentity: (id: string, body: KsIdentitySelectionRequest) =>
      http.request<KsIdentitySelectionResult>(`${conversation(id)}/identity-selections`, { method: 'POST', body, auth: 'optional' }),
    // KS001 Upgrade Phase 2 (Sections 14-17) -- "Save for later." Requires authentication; the backend
    // enforces every ownership boundary (AgentSavedBuildService), this is a thin transport only. Not part
    // of the public OpenAPI contract, matching createHandoff/readHandoff's own First-Party precedent.
    saveBuild: (conversationId: string) =>
      http.request<SavedBuildDto>(`${conversation(conversationId)}/saved-build`, { method: 'POST', auth: 'required' }),
    listSavedBuilds: (limit = 50, offset = 0) =>
      http.request<SavedBuildDto[]>(`/api/agent/saved-builds?limit=${limit}&offset=${offset}`, { auth: 'required' }),
    resumeSavedBuild: (savedBuildId: string) =>
      http.request<SavedBuildDto>(`/api/agent/saved-builds/${segment(savedBuildId)}/resume`, { method: 'POST', auth: 'required' }),
  };
}
export type AgentGateway = ReturnType<typeof createAgentGateway>;
