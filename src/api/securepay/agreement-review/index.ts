import { segment, type HttpClient } from '../http';
import type {
  AcknowledgeReviewRequest, OpenReviewCaseRequest, OpenReviewCaseResponse, ReviewActionResponse, ReviewCaseDetailResponse, ReviewCaseListResponse,
  ReviewEvidenceListResponse, ReviewListParams, SubmitReviewResponseRequest,
} from './dto';

/** Backend maximum page size for the participant list. */
export const REVIEW_MAX_PAGE_SIZE = 50;
/** Backend maximum response narrative length (`MAX_RESPONSE_NARRATIVE_LENGTH`). */
export const REVIEW_MAX_NARRATIVE = 4096;

/**
 * PARTICIPANT Agreement Review gateway. Every method is `auth: 'required'` (see `refresh.ts`).
 * Production wiring boundary (docs/UI_COMPLETION_PHASE9_AGREEMENT_REVIEW.md):
 *   LIVE:      list, detail, evidence (reads); acknowledge, respond (participant commands, bound to the fresh case `version`).
 *   UNWIRED:   openCase (no respondent enrolment + unreadable Review Reserve), requestEscalation (permission unprovable, outcome unreadable).
 *   NOT MODELLED: multipart evidence upload (this client is JSON-only; storage is an in-process placeholder with no retrieval endpoint).
 * Idempotency keys are caller-supplied; no method mints one.
 */
export function createAgreementReviewGateway(http: HttpClient) {
  const base = '/api/v1/agreement-reviews';
  const withAgreement = (reviewCaseId: string, agreementId: string, suffix = '') => `${base}/${segment(reviewCaseId)}${suffix}?agreementId=${segment(agreementId)}`;
  return {
    list: (params: ReviewListParams = {}) => {
      const page = params.page ?? 0; const size = params.size ?? 20;
      if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > REVIEW_MAX_PAGE_SIZE) throw new Error('Invalid pagination');
      const q = [`page=${page}`, `size=${size}`];
      if (params.agreementId) q.push(`agreementId=${segment(params.agreementId)}`);
      if (params.state) q.push(`state=${segment(params.state)}`);
      if (params.activeOnly) q.push('activeOnly=true');
      return http.request<ReviewCaseListResponse>(`${base}?${q.join('&')}`, { auth: 'required' });
    },
    detail: (reviewCaseId: string, agreementId: string) => http.request<ReviewCaseDetailResponse>(withAgreement(reviewCaseId, agreementId), { auth: 'required' }),
    evidence: (reviewCaseId: string, agreementId: string) => http.request<ReviewEvidenceListResponse>(withAgreement(reviewCaseId, agreementId, '/evidence'), { auth: 'required' }),
    acknowledge: (reviewCaseId: string, request: AcknowledgeReviewRequest, idempotencyKey: string) =>
      http.request<ReviewActionResponse>(`${base}/${segment(reviewCaseId)}/acknowledgements`, { method: 'POST', auth: 'required', body: request, headers: { 'Idempotency-Key': idempotencyKey } }),
    respond: (reviewCaseId: string, request: SubmitReviewResponseRequest, idempotencyKey: string) =>
      http.request<ReviewActionResponse>(`${base}/${segment(reviewCaseId)}/responses`, { method: 'POST', auth: 'required', body: request, headers: { 'Idempotency-Key': idempotencyKey } }),
    /** UNWIRED (archaeology): records escalation INTENT only; nothing readable proves it landed. */
    requestEscalation: (reviewCaseId: string, request: AcknowledgeReviewRequest, idempotencyKey: string) =>
      http.request<ReviewActionResponse>(`${base}/${segment(reviewCaseId)}/escalations`, { method: 'POST', auth: 'required', body: request, headers: { 'Idempotency-Key': idempotencyKey } }),
    /** UNWIRED (archaeology): creates only an OPENER-side case; no respondent is enrolled and nothing readable says the Review Reserve is sufficient. */
    openCase: (request: OpenReviewCaseRequest, idempotencyKey: string) =>
      http.request<OpenReviewCaseResponse>(`${base}/open`, { method: 'POST', auth: 'required', body: request, headers: { 'Idempotency-Key': idempotencyKey } }),
  };
}
export type AgreementReviewGateway = ReturnType<typeof createAgreementReviewGateway>;
export type * from './dto';
