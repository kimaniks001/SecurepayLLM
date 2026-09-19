import { segment, type HttpClient } from '../http';
import type {
  PublicOfferDetailView, PublicSearchResultView, PublicStoreView, StoreOfferResponse,
  StoreProfileResponse, StoreSearchParams, UpdateStoreProfileRequest, UpsertStoreOfferRequest,
} from './dto';

/**
 * Verified against SecurePayAPI feat/securepay-phase9-store-platform @ 69424c1f. Trader (`/store/me/**`)
 * methods require auth; public (`/stores/**`) methods never do — do not add auth to them for
 * implementation convenience (see AGENTS.md "Authentication" boundary and task section 11).
 */
export function createStoreGateway(http: HttpClient) {
  const offer = (offerId: string) => `/api/v1/store/me/offers/${segment(offerId)}`;
  const search = (params: StoreSearchParams) => {
    if (params.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 10)) {
      throw new Error('Store search limit must be an integer between 1 and 10');
    }
    const query = new URLSearchParams({ kind: params.kind });
    if (params.category) query.set('category', params.category);
    if (params.location) query.set('location', params.location);
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    return `/api/v1/stores/search?${query.toString()}`;
  };
  return {
    myProfile: () => http.request<StoreProfileResponse>('/api/v1/store/me/profile', { auth: 'required' }),
    updateMyProfile: (body: UpdateStoreProfileRequest) => http.request<StoreProfileResponse>('/api/v1/store/me/profile', { method: 'PUT', body, auth: 'required' }),
    myOffers: () => http.request<StoreOfferResponse[]>('/api/v1/store/me/offers', { auth: 'required' }),
    createOffer: (body: UpsertStoreOfferRequest) => http.request<StoreOfferResponse>('/api/v1/store/me/offers', { method: 'POST', body, auth: 'required' }),
    updateOffer: (offerId: string, body: UpsertStoreOfferRequest) => http.request<StoreOfferResponse>(offer(offerId), { method: 'PUT', body, auth: 'required' }),
    confirmAvailability: (offerId: string) => http.request<StoreOfferResponse>(`${offer(offerId)}/availability-confirmation`, { method: 'POST', auth: 'required' }),
    store: (canonicalKsNumber: string) => http.request<PublicStoreView>(`/api/v1/stores/${segment(canonicalKsNumber)}`, { auth: 'none' }),
    offer: (canonicalKsNumber: string, offerId: string) => http.request<PublicOfferDetailView>(`/api/v1/stores/${segment(canonicalKsNumber)}/offers/${segment(offerId)}`, { auth: 'none' }),
    search: (params: StoreSearchParams) => http.request<PublicSearchResultView[]>(search(params), { auth: 'none' }),
  };
}
export type StoreGateway = ReturnType<typeof createStoreGateway>;
