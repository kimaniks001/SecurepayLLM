import { segment, type HttpClient } from '../http';
import type {
  BusinessStoreOpportunityResponse, BusinessStoreProfileResponse, PublicOfferDetailView, PublicSearchResultView, PublicStoreView, StoreOfferFulfilmentResponse, StoreOfferResponse, RegisterStoreImageUseRequest, StoreImageUseResponse,
  LinkStoreImageEvidenceRequest, StoreImageEvidenceView,
  StoreImageReviewQuestion, RespondStoreImageReviewRequest, StoreImageSellerReviewReply,
  StoreProfileResponse, StoreSearchParams, UpsertStoreOfferFulfilmentRequest, UpdateStoreProfileRequest, UpsertStoreOfferRequest,
} from './dto';

/**
 * Verified against SecurePayAPI feat/securepay-phase9-store-platform @ 69424c1f. Trader (`/store/me/**`)
 * methods require auth; public (`/stores/**`) methods never do — do not add auth to them for
 * implementation convenience (see AGENTS.md "Authentication" boundary and task section 11).
 */
export function createStoreGateway(http: HttpClient) {
  const offer = (offerId: string) => `/api/v1/store/me/offers/${segment(offerId)}`;
  const businessStore = (businessKsNumber: string) => `/api/v1/business/${segment(businessKsNumber)}/store`;
  const businessOffer = (businessKsNumber: string, offerId: string) => `${businessStore(businessKsNumber)}/offers/${segment(offerId)}`;
  // Private pending image-use routes only; not an Identimark or published Store mediaRef.
  const personalImageUses = (offerId: string) => `${offer(offerId)}/image-uses`;
  const businessImageUses = (businessKsNumber: string, offerId: string) => `${businessOffer(businessKsNumber, offerId)}/image-uses`;
  const myImageEvidence = (offerId: string, imageUseId: string) =>
    `${personalImageUses(offerId)}/${segment(imageUseId)}/evidence`;
  const businessImageEvidence = (businessKsNumber: string, offerId: string, imageUseId: string) =>
    `${businessImageUses(businessKsNumber, offerId)}/${segment(imageUseId)}/evidence`;
  const myImageReviewQuestion = (offerId: string,imageUseId: string) =>
    `${personalImageUses(offerId)}/${segment(imageUseId)}/review-request`;
  const businessImageReviewQuestion = (businessKsNumber: string,offerId: string,imageUseId: string) =>
    `${businessImageUses(businessKsNumber,offerId)}/${segment(imageUseId)}/review-request`;
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
    businessProfile: (businessKsNumber: string) => http.request<BusinessStoreProfileResponse>(`${businessStore(businessKsNumber)}/profile`, { auth: 'required' }),
    updateBusinessProfile: (businessKsNumber: string, body: UpdateStoreProfileRequest) => http.request<BusinessStoreProfileResponse>(`${businessStore(businessKsNumber)}/profile`, { method: 'PUT', body, auth: 'required' }),
    businessOffers: (businessKsNumber: string) => http.request<StoreOfferResponse[]>(`${businessStore(businessKsNumber)}/offers`, { auth: 'required' }),
    businessOpportunities: (businessKsNumber: string, limit = 20) => http.request<BusinessStoreOpportunityResponse[]>(`${businessStore(businessKsNumber)}/opportunities?limit=${limit}`, { auth: 'required' }),
    createBusinessOffer: (businessKsNumber: string, body: UpsertStoreOfferRequest) => http.request<StoreOfferResponse>(`${businessStore(businessKsNumber)}/offers`, { method: 'POST', body, auth: 'required' }),
    updateBusinessOffer: (businessKsNumber: string, offerId: string, body: UpsertStoreOfferRequest) => http.request<StoreOfferResponse>(businessOffer(businessKsNumber, offerId), { method: 'PUT', body, auth: 'required' }),
    confirmBusinessOfferAvailability: (businessKsNumber: string, offerId: string) => http.request<StoreOfferResponse>(`${businessOffer(businessKsNumber, offerId)}/availability-confirmation`, { method: 'POST', auth: 'required' }),
    businessOfferFulfilment: (businessKsNumber: string, offerId: string) => http.request<StoreOfferFulfilmentResponse>(`${businessOffer(businessKsNumber, offerId)}/fulfilment`, { auth: 'required' }),
    updateBusinessOfferFulfilment: (businessKsNumber: string, offerId: string, body: UpsertStoreOfferFulfilmentRequest) => http.request<StoreOfferFulfilmentResponse>(`${businessOffer(businessKsNumber, offerId)}/fulfilment`, { method: 'PUT', body, auth: 'required' }),
    updateMyProfile: (body: UpdateStoreProfileRequest) => http.request<StoreProfileResponse>('/api/v1/store/me/profile', { method: 'PUT', body, auth: 'required' }),
    myOffers: () => http.request<StoreOfferResponse[]>('/api/v1/store/me/offers', { auth: 'required' }),
    createOffer: (body: UpsertStoreOfferRequest) => http.request<StoreOfferResponse>('/api/v1/store/me/offers', { method: 'POST', body, auth: 'required' }),
    updateOffer: (offerId: string, body: UpsertStoreOfferRequest) => http.request<StoreOfferResponse>(offer(offerId), { method: 'PUT', body, auth: 'required' }),
    confirmAvailability: (offerId: string) => http.request<StoreOfferResponse>(`${offer(offerId)}/availability-confirmation`, { method: 'POST', auth: 'required' }),
    // Phase 3 candidate API: caller must first have a real signed-in session,
    // a saved source conversation, and the currently-authorized Store offer revision.
    // These methods are deliberately NOT invoked by Mini's owner demo.
    registerMyImageUse: (offerId: string, body: RegisterStoreImageUseRequest) =>
      http.request<StoreImageUseResponse>(personalImageUses(offerId), { method: 'POST', body, auth: 'required' }),
    myImageUses: (offerId: string) =>
      http.request<StoreImageUseResponse[]>(personalImageUses(offerId), { auth: 'required' }),
    revokeMyImageUse: (offerId: string, imageUseId: string) =>
      http.request<StoreImageUseResponse>(`${personalImageUses(offerId)}/${segment(imageUseId)}/revoke`, { method: 'POST', auth: 'required' }),
    registerBusinessImageUse: (businessKsNumber: string, offerId: string, body: RegisterStoreImageUseRequest) =>
      http.request<StoreImageUseResponse>(businessImageUses(businessKsNumber, offerId), { method: 'POST', body, auth: 'required' }),
    businessImageUses: (businessKsNumber: string, offerId: string) =>
      http.request<StoreImageUseResponse[]>(businessImageUses(businessKsNumber, offerId), { auth: 'required' }),
    revokeBusinessImageUse: (businessKsNumber: string, offerId: string, imageUseId: string) =>
      http.request<StoreImageUseResponse>(`${businessImageUses(businessKsNumber, offerId)}/${segment(imageUseId)}/revoke`, { method: 'POST', auth: 'required' }),
    // Rights evidence remains UNVERIFIED. These private calls require a
    // server-ingested, explicitly selected source from the image submitter's
    // SAVED conversation. Never call from Mini's local owner-demo.
    linkMyImageEvidence: (offerId: string, imageUseId: string, body: LinkStoreImageEvidenceRequest) =>
      http.request<StoreImageEvidenceView>(myImageEvidence(offerId, imageUseId), { method: 'POST', body, auth: 'required' }),
    myImageEvidence: (offerId: string, imageUseId: string) =>
      http.request<StoreImageEvidenceView[]>(myImageEvidence(offerId, imageUseId), { auth: 'required' }),
    revokeMyImageEvidence: (offerId: string, imageUseId: string, evidenceId: string) =>
      http.request<StoreImageEvidenceView>(`${myImageEvidence(offerId, imageUseId)}/${segment(evidenceId)}/revoke`, { method: 'POST', auth: 'required' }),
    linkBusinessImageEvidence: (businessKsNumber: string, offerId: string, imageUseId: string, body: LinkStoreImageEvidenceRequest) =>
      http.request<StoreImageEvidenceView>(businessImageEvidence(businessKsNumber, offerId, imageUseId), { method: 'POST', body, auth: 'required' }),
    businessImageEvidence: (businessKsNumber: string, offerId: string, imageUseId: string) =>
      http.request<StoreImageEvidenceView[]>(businessImageEvidence(businessKsNumber, offerId, imageUseId), { auth: 'required' }),
    revokeBusinessImageEvidence: (businessKsNumber: string, offerId: string, imageUseId: string, evidenceId: string) =>
      http.request<StoreImageEvidenceView>(`${businessImageEvidence(businessKsNumber, offerId, imageUseId)}/${segment(evidenceId)}/revoke`, { method: 'POST', auth: 'required' }),
    // Phase 3: seller-facing answer pill question and fresh-evidence
    // re-review. Requires actual authenticated Store/source records and does
    // not submit local browser files or create an approved image/Identimark.
    myImageReviewQuestion: (offerId: string, imageUseId: string) =>
      http.request<StoreImageReviewQuestion>(myImageReviewQuestion(offerId,imageUseId), {auth: 'required'}),
    respondMyImageReviewQuestion: (offerId: string,imageUseId: string,body: RespondStoreImageReviewRequest) =>
      http.request<StoreImageSellerReviewReply>(`${myImageReviewQuestion(offerId,imageUseId)}/respond`, {method: 'POST',body,auth:'required'}),
    businessImageReviewQuestion: (businessKsNumber: string, offerId: string, imageUseId: string) =>
      http.request<StoreImageReviewQuestion>(businessImageReviewQuestion(businessKsNumber,offerId,imageUseId), {auth:'required'}),
    respondBusinessImageReviewQuestion: (businessKsNumber: string, offerId: string, imageUseId: string, body: RespondStoreImageReviewRequest) =>
      http.request<StoreImageSellerReviewReply>(`${businessImageReviewQuestion(businessKsNumber,offerId,imageUseId)}/respond`, {method:'POST',body,auth:'required'}),
    store: (canonicalKsNumber: string) => http.request<PublicStoreView>(`/api/v1/stores/${segment(canonicalKsNumber)}`, { auth: 'none' }),
    offer: (canonicalKsNumber: string, offerId: string) => http.request<PublicOfferDetailView>(`/api/v1/stores/${segment(canonicalKsNumber)}/offers/${segment(offerId)}`, { auth: 'none' }),
    search: (params: StoreSearchParams) => http.request<PublicSearchResultView[]>(search(params), { auth: 'none' }),
  };
}
export type StoreGateway = ReturnType<typeof createStoreGateway>;
