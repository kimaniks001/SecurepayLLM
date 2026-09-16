import { segment, type HttpClient } from '../http';
import type {
  CustomerMarketRequestResponse, CustomerMarketSelectionResponse, CustomerPlugRelationshipResponse,
  InterestedCandidateResponse, RelationshipLifecycleResponse,
} from './dto';

/**
 * Customer-side Plug matching flow. Verified byte-identical against `origin/main`
 * (`PlugMarketEntryController` @ `/api/v1/market-network`, `CustomerPlugRelationshipLifecycleController`
 * @ `/api/v1/market-network/relationships`) — real, live backend authority, not a still-stacked PR.
 * Every method requires auth; the acting identity always comes from the authenticated session.
 */
export function createMarketNetworkGateway(http: HttpClient) {
  const req = (requestId: string) => `/api/v1/market-network/customer-requests/${segment(requestId)}`;
  return {
    createRequest: (requestType: string, idempotencyKey: string) => http.request<CustomerMarketRequestResponse>('/api/v1/market-network/customer-requests', { method: 'POST', body: { requestType }, auth: 'required', headers: { 'Idempotency-Key': idempotencyKey } }),
    myRequests: () => http.request<CustomerMarketRequestResponse[]>('/api/v1/market-network/customer-requests/mine', { auth: 'required' }),
    cancelRequest: (requestId: string) => http.request<CustomerMarketRequestResponse>(`${req(requestId)}/cancel`, { method: 'POST', auth: 'required' }),
    candidates: (requestId: string) => http.request<InterestedCandidateResponse[]>(`${req(requestId)}/candidates`, { auth: 'required' }),
    selection: (requestId: string) => http.request<CustomerMarketSelectionResponse>(`${req(requestId)}/selection`, { auth: 'required' }),
    selectCandidate: (requestId: string, candidateRef: string) => http.request<CustomerMarketSelectionResponse>(`${req(requestId)}/selection`, { method: 'POST', body: { candidateRef }, auth: 'required' }),
    relationship: (requestId: string) => http.request<CustomerPlugRelationshipResponse>(`${req(requestId)}/relationship`, { auth: 'required' }),
    openRelationship: (requestId: string) => http.request<CustomerPlugRelationshipResponse>(`${req(requestId)}/relationship`, { method: 'POST', auth: 'required' }),
    relationshipLifecycle: (relationshipRef: string) => http.request<RelationshipLifecycleResponse>(`/api/v1/market-network/relationships/${segment(relationshipRef)}`, { auth: 'required' }),
  };
}
export type MarketNetworkGateway = ReturnType<typeof createMarketNetworkGateway>;
