import { ApiError } from '../../api/securepay/http';
import type { AgreementReviewGateway } from '../../api/securepay/agreement-review';
import { REVIEW_MAX_NARRATIVE } from '../../api/securepay/agreement-review';
import type { ReviewActionResponse, ReviewResponseType } from '../../api/securepay/agreement-review/dto';
import { isUncertainFinancialError, type AttemptStore } from '../money/attempt';

/**
 * Participant Review commands (acknowledge, respond). One logical command = one exact request + one idempotency key (Phase 8 attempt discipline):
 * an unresolved (uncertain) attempt is immutable -- a different request is REFUSED and no fresh key is minted. `expectedVersion` is ALWAYS the Review
 * case's own `version` from the freshly read case, never an Agreement version and never a cached number. A version conflict is never silently retried.
 */
export type ReviewOutcome =
  | { kind: 'ok'; result: ReviewActionResponse }
  | { kind: 'uncertain' }                 // network / timeout / 5xx: SecurePay may have recorded it -> retry the SAME request, or re-read
  | { kind: 'refused' }                   // a different request while one is unresolved: nothing sent
  | { kind: 'invalid'; problem: 'empty' | 'too-long' }
  | { kind: 'stale' }                     // AGREEMENT_REVIEW_STALE_VERSION
  | { kind: 'deadline' }                  // AGREEMENT_REVIEW_RESPONSE_DEADLINE_PASSED
  | { kind: 'not-found' }                 // AGREEMENT_REVIEW_NOT_FOUND (404)
  | { kind: 'forbidden' }                 // 403
  | { kind: 'rejected' };                 // any other definite rejection

export interface CaseContext { reviewCaseId: string; agreementId: string; expectedVersion: number }

function classify(error: unknown): ReviewOutcome {
  if (isUncertainFinancialError(error)) return { kind: 'uncertain' };
  if (error instanceof ApiError) {
    if (error.code === 'AGREEMENT_REVIEW_STALE_VERSION') return { kind: 'stale' };
    if (error.code === 'AGREEMENT_REVIEW_RESPONSE_DEADLINE_PASSED') return { kind: 'deadline' };
    if (error.status === 404) return { kind: 'not-found' };
    if (error.status === 403) return { kind: 'forbidden' };
  }
  return { kind: 'rejected' };
}

export async function runAcknowledge(gateway: Pick<AgreementReviewGateway, 'acknowledge'>, attempts: AttemptStore, ctx: CaseContext): Promise<ReviewOutcome> {
  const key = attempts.keyFor(JSON.stringify(['acknowledge', ctx.reviewCaseId, ctx.agreementId, ctx.expectedVersion]));
  if (!key.ok) return { kind: 'refused' };
  try {
    const result = await gateway.acknowledge(ctx.reviewCaseId, { agreementId: ctx.agreementId, expectedVersion: ctx.expectedVersion }, key.key);
    attempts.settle();
    return { kind: 'ok', result };
  } catch (error) {
    const outcome = classify(error);
    if (outcome.kind !== 'uncertain') attempts.settle();
    return outcome;
  }
}

export function validateNarrative(narrative: string): 'empty' | 'too-long' | null {
  if (narrative.trim().length === 0) return 'empty';
  if (narrative.length > REVIEW_MAX_NARRATIVE) return 'too-long';
  return null;
}

export async function runRespond(
  gateway: Pick<AgreementReviewGateway, 'respond'>, attempts: AttemptStore, ctx: CaseContext, response: { responseType: ReviewResponseType; narrative: string },
): Promise<ReviewOutcome> {
  const problem = validateNarrative(response.narrative);
  if (problem) return { kind: 'invalid', problem };
  const key = attempts.keyFor(JSON.stringify(['respond', ctx.reviewCaseId, ctx.agreementId, ctx.expectedVersion, response.responseType, response.narrative]));
  if (!key.ok) return { kind: 'refused' };
  try {
    const result = await gateway.respond(ctx.reviewCaseId, { agreementId: ctx.agreementId, expectedVersion: ctx.expectedVersion, responseType: response.responseType, narrative: response.narrative }, key.key);
    attempts.settle();
    return { kind: 'ok', result };
  } catch (error) {
    const outcome = classify(error);
    if (outcome.kind !== 'uncertain') attempts.settle();
    return outcome;
  }
}

/** Customer wording for each outcome. Never says the review was decided, and never says money moved. */
export const ACK_WORDS = {
  ok: 'SecurePay recorded that you have seen this review. This does not mean you agree with it or accept any outcome.',
  already: 'SecurePay shows that you have acknowledged this review.',
} as const;
export const RESPOND_WORDS = {
  ok: 'SecurePay recorded your response. This does not decide the review.',
  already: 'SecurePay shows that you have responded.',
} as const;
export const OUTCOME_WORDS: Readonly<Record<Exclude<ReviewOutcome['kind'], 'ok' | 'invalid'>, string>> = {
  uncertain: 'SecurePay is not yet sure whether that was recorded. Trying again sends the same request, so it can’t be recorded twice.',
  refused: 'An earlier request is still unresolved. Try that exact request again before making a different one.',
  stale: 'This review changed while you were looking at it. SecurePay refreshed the current review before you continue.',
  deadline: 'The response deadline had passed, so SecurePay did not record your response.',
  'not-found': 'SecurePay couldn’t find this review for your account.',
  forbidden: 'SecurePay says this account can’t do that on this review.',
  rejected: 'SecurePay did not record that. The review is shown as SecurePay currently has it.',
};
