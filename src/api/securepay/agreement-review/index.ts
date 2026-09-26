import { segment, type HttpClient } from '../http';
import type {
  AcknowledgeReviewRequest, OpenReviewCaseRequest, OpenReviewCaseResponse, ReviewActionResponse, ReviewCaseDetailResponse, ReviewCaseListResponse,
  ReviewEligibilityResponse, ReviewEvidenceItemResponse, ReviewEvidenceListResponse, ReviewListParams, SubmitReviewEvidenceInput, SubmitReviewResponseRequest,
} from './dto';

/** Backend maximum page size for the participant list. */
export const REVIEW_MAX_PAGE_SIZE = 50;
/** Backend maximum response narrative length (`MAX_RESPONSE_NARRATIVE_LENGTH`). */
export const REVIEW_MAX_NARRATIVE = 4096;
/** Phase 7 Slice 6 -- backend evidence bounds (`MAX_EVIDENCE_CONTENT_LENGTH`, `MAX_EVIDENCE_DESCRIPTION_LENGTH`, the media allowlist).
 *  A pre-check only: SecurePay re-validates everything and remains authoritative. */
export const REVIEW_EVIDENCE_MAX_BYTES = 10_485_760;
export const REVIEW_EVIDENCE_MAX_DESCRIPTION = 1024;
export const REVIEW_EVIDENCE_MEDIA_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'] as const;

/**
 * PARTICIPANT Agreement Review gateway. Every method is `auth: 'required'` (see `refresh.ts`).
 * Production wiring boundary (docs/UI_COMPLETION_PHASE9_AGREEMENT_REVIEW.md):
 *   LIVE:      list, detail, evidence, eligibility (reads); acknowledge, respond (bound to the fresh case `version`); submitEvidence
 *              (Phase 7 Slice 6: durable PostgreSQL storage, digest-verified, metadata only -- there is no content download).
 *   UNWIRED:   openCase (AGREEMENT_REVIEW_OPEN is ungranted until the v1/v2 opening decision), requestEscalation (an internal
 *              senior-review request; ungranted, nothing readable proves it landed).
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
    /** Phase 7 Slice 6 -- can a formal Review be started, and what does the Review Reserve require (yes/no; never a balance). */
    eligibility: (agreementId: string) => http.request<ReviewEligibilityResponse>(`${base}/eligibility?agreementId=${segment(agreementId)}`, { auth: 'required' }),
    /** Phase 7 Slice 6 -- one evidence file, multipart. The digest binds the request to the exact bytes; SecurePay recomputes and verifies it. */
    submitEvidence: (reviewCaseId: string, input: SubmitReviewEvidenceInput, idempotencyKey: string) => {
      const form = new FormData();
      form.append('agreementId', input.agreementId);
      form.append('evidenceType', input.evidenceType);
      if (input.narrativeDescription) form.append('narrativeDescription', input.narrativeDescription);
      form.append('contentSha256Hex', input.contentSha256Hex);
      form.append('file', input.file, input.filename);
      return http.request<ReviewEvidenceItemResponse>(`${base}/${segment(reviewCaseId)}/evidence`, { method: 'POST', auth: 'required', body: form, headers: { 'Idempotency-Key': idempotencyKey } });
    },
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
