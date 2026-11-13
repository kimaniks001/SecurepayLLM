import { segment, type HttpClient } from '../http';

/**
 * M5C: these are the SecurePayAPI *seller's product quotation* endpoints.
 * They are NOT /commercial/quotes/single-recipient (platform fee quote).
 * All identity, seller representation, stock freshness and Agreement authority
 * must be decided by SecurePayAPI; these client types never grant authority.
 */
export type QuotedDeliveryBy = 'SELLER' | 'BUYER' | 'TO_AGREE';

export interface SellerQuoteRequest {
  idempotencyKey: string;
  buyerKsNumber: string;
  expectedOfferUpdatedAt: string;
  quantity: number;
  unitPriceMinor: number;
  currency: string;
  deliveryPlace: string;
  deliveryDate: string;
  deliveryBy: QuotedDeliveryBy;
  conditions: string | null;
  expiresAt: string;
}
export interface SellerQuoteRecord {
  id: string;
  offerId: string;
  sellerKsNumber: string;
  buyerKsNumber: string;
  offerTitle: string;
  offerUpdatedAt: string;
  publishedPriceMinor: number | null;
  currency: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
  deliveryPlace: string;
  deliveryDate: string;
  deliveryBy: QuotedDeliveryBy;
  conditions: string | null;
  expiresAt: string;
  createdAt: string;
  status: 'PROPOSAL_RECORDED';
  sourceCurrent: boolean;
}
export interface QuoteBoundAgreementDraft {
  quotationId: string;
  agreementId: string;
  boundVersionId: string;
  boundVersionNumber: number;
  boundContentHash: string;
  agreementStatus: string;
  versionCurrent: boolean;
  replayed: boolean;
}
export interface QuoteSellerInvitation {
  invitationId: string;
  status: string;
  invitationToken: string | null;
  replayed: boolean;
  targetKind: string | null;
  targetHint: string | null;
}
export interface QuoteReview {
  agreementId: string;
  quotationId: string;
  boundVersionId: string;
  boundVersionHash: string;
  agreementStatus: string;
  versionCurrent: boolean;
  sourceCurrent: boolean;
  originalSellerStillAuthorized: boolean;
  sellerInvitationIssued: boolean;
  sellerJoined: boolean;
  buyerConfirmedCurrent: boolean;
  sellerConfirmedCurrent: boolean;
  participantsUnambiguous: boolean;
  confirmationsComplete: boolean;
  obligationsExecutable: false;
  paymentEnabled: false;
  nextAction: string;
  previewOnlyObligations: Array<{
    responsible: 'SELLER_BUSINESS' | 'BUYER';
    description: string;
    amountMinor: number | null;
    currency: string | null;
    executable: false;
  }>;
}
export interface QuoteObligationPlan {
  planId: string;
  agreementId: string;
  quotationId: string;
  versionId: string;
  versionHash: string;
  buyerIdentityId: string;
  originalSellerIdentityId: string;
  currency: string;
  buyerPaymentMinor: number;
  sellerSupplyDescription: string;
  deliveryPlace: string;
  deliveryDate: string;
  deliveryBy: QuotedDeliveryBy;
  state: 'STAGED_NON_EXECUTABLE';
  sourceAndConsentCurrent: boolean;
  executable: false;
  paymentEnabled: false;
  replayed: boolean;
  recordedAt: string;
}

/** Strict, read-only UI proofs; never infer consent from a chat or HTTP 201. */
export const quotedRecordProof = (q: SellerQuoteRecord, expectedId?: string) =>
  !!q && q.status === 'PROPOSAL_RECORDED' &&
  (!expectedId || q.id.toLowerCase() === expectedId.toLowerCase()) &&
  /^KS\d{3,12}$/.test(q.buyerKsNumber) &&
  /^KS\d{3,}$/.test(q.sellerKsNumber) &&
  Number.isSafeInteger(q.quantity) && q.quantity > 0 && q.quantity <= 20 &&
  Number.isSafeInteger(q.unitPriceMinor) && q.unitPriceMinor > 0 &&
  Number.isSafeInteger(q.totalMinor) &&
  q.totalMinor === q.quantity * q.unitPriceMinor &&
  ['SELLER', 'BUYER', 'TO_AGREE'].includes(q.deliveryBy) &&
  typeof q.expiresAt === 'string';

export const boundDraftProof = (d: QuoteBoundAgreementDraft, quoteId: string) =>
  !!d && d.quotationId.toLowerCase() === quoteId.toLowerCase() &&
  /^[0-9a-f-]{36}$/i.test(d.agreementId) &&
  /^[0-9a-f-]{36}$/i.test(d.boundVersionId) &&
  /^[0-9a-f]{64}$/i.test(d.boundContentHash) &&
  d.boundVersionNumber === 1 && d.versionCurrent &&
  ['DRAFT','PROPOSED','INVITATION_PENDING','PARTICIPANTS_JOINING',
   'CONFIRMATION_PENDING'].includes(d.agreementStatus);

/** Neither quote completion nor independent consent turns this into Money. */
export const quoteReviewProof = (r: QuoteReview, agreementId: string, versionId: string, hash: string) =>
  !!r && r.agreementId.toLowerCase() === agreementId.toLowerCase() &&
  r.boundVersionId.toLowerCase() === versionId.toLowerCase() &&
  r.boundVersionHash === hash &&
  r.obligationsExecutable === false && r.paymentEnabled === false &&
  Array.isArray(r.previewOnlyObligations) &&
  r.previewOnlyObligations.every(o => o.executable === false);

export function createStoreQuotationGateway(http: HttpClient) {
  const quotePath = (quotationId: string) => `/api/v1/store/quotations/${segment(quotationId)}`;
  const agreementPath = (agreementId: string) => `/api/v1/store/quoted-agreements/${segment(agreementId)}`;
  return {
    issue: (businessKsNumber: string, offerId: string, body: SellerQuoteRequest) =>
      http.request<SellerQuoteRecord>(
        `/api/v1/business/${segment(businessKsNumber)}/store/offers/${segment(offerId)}/quotations`,
        { method: 'POST', body, auth: 'required' }),
    read: (quotationId: string) =>
      http.request<SellerQuoteRecord>(quotePath(quotationId), { auth: 'required' }),
    createDraft: (quotationId: string, idempotencyKey: string) =>
      http.request<QuoteBoundAgreementDraft>(`${quotePath(quotationId)}/agreement-draft`,
        { method: 'POST', body: { idempotencyKey }, auth: 'required' }),
    inviteOriginalSeller: (agreementId: string, expectedVersionId: string,
      expectedVersionHash: string, idempotencyKey: string) =>
      http.request<QuoteSellerInvitation>(`${agreementPath(agreementId)}/seller-invitation`,
        { method: 'POST', body: { expectedVersionId, expectedVersionHash, idempotencyKey }, auth: 'required' }),
    review: (agreementId: string) =>
      http.request<QuoteReview>(`${agreementPath(agreementId)}/review`, { auth: 'required' }),
    stageNonExecutablePlan: (agreementId: string, expectedVersionId: string,
      expectedVersionHash: string, idempotencyKey: string) =>
      http.request<QuoteObligationPlan>(`${agreementPath(agreementId)}/obligation-plan`,
        { method: 'POST', body: { expectedVersionId, expectedVersionHash, idempotencyKey }, auth: 'required' }),
    readNonExecutablePlan: (agreementId: string) =>
      http.request<QuoteObligationPlan>(`${agreementPath(agreementId)}/obligation-plan`,
        { auth: 'required' }),
  };
}
export type StoreQuotationGateway = ReturnType<typeof createStoreQuotationGateway>;
