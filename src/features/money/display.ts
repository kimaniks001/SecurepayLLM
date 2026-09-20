import type { AgreementMoneyRecordResponse } from '../../api/securepay/agreements/dto';

/**
 * Bounded copy for SecurePay's closed money vocabularies. An unknown code is NEVER echoed as the main message and never guessed:
 * each mapper ends in a fail-closed sentence. (Raw enums are not customer language.)
 */

// ---- Payment Ready (`PaymentReadyOutcome` + `PaymentReadyReasonCode`)
export function paymentReadyFacts(status: string, paymentReady: boolean): { headline: string; text: string; ready: boolean } {
  if (status === 'READY' && paymentReady) return { headline: 'Payment Ready', text: 'SecurePay says the conditions for the next financial step are satisfied. This is not a payment, and no money has moved because of it.', ready: true };
  if (status === 'NOT_READY') return { headline: 'Not Payment Ready yet', text: 'SecurePay says some conditions for the next financial step aren’t satisfied yet.', ready: false };
  if (status === 'PARTIALLY_READY') return { headline: 'Partly Payment Ready', text: 'SecurePay says only part of what’s needed for the next financial step is satisfied.', ready: false };
  if (status === 'BLOCKED') return { headline: 'Payment Ready is blocked', text: 'SecurePay says something is blocking the next financial step.', ready: false };
  if (status === 'NO_EVALUATION_YET') return { headline: 'Not evaluated yet', text: 'SecurePay hasn’t evaluated Payment Ready for this Agreement yet.', ready: false };
  return { headline: 'Payment Ready can’t be described', text: 'SecurePay returned a Payment Ready status this screen can’t describe yet.', ready: false };
}
const REASON: Readonly<Record<string, string>> = {
  INSTR_SRC_NONE_ELIGIBLE: 'There is nothing eligible to release for this part of the Agreement yet.',
  INSTR_SRC_COUNTDOWN_PENDING: 'A waiting period before release hasn’t finished.',
  INSTR_SRC_REVIEW_UNRESOLVED: 'A review of this part of the Agreement hasn’t been resolved.',
  REVIEW_RELEASE_RESTRICTED: 'A review has restricted release.',
  FUNDING_INSUFFICIENT: 'The money funded so far is less than the amount required.',
  AGREEMENT_VERSION_MISMATCH: 'The Agreement version SecurePay evaluated isn’t the version now accepted.',
  AGREEMENT_NOT_ACCEPTED: 'The Agreement version isn’t accepted yet.',
  CONDITION_UNSATISFIED: 'A required condition isn’t satisfied yet.',
  MILESTONE_INCOMPLETE: 'A required milestone isn’t complete yet.',
  EVIDENCE_MISSING: 'Required evidence hasn’t been submitted yet.',
  EVIDENCE_UNVERIFIED: 'Submitted evidence hasn’t been verified yet.',
  APPROVAL_MISSING: 'A required approval hasn’t been given yet.',
  COUNTDOWN_NOT_EXPIRED: 'A required time hasn’t been reached yet.',
  COUNTDOWN_INTERRUPTED_BY_REVIEW: 'A review interrupted a waiting period.',
  COMPLIANCE_HOLD_ACTIVE: 'A compliance hold is recorded.',
  COMPLIANCE_NO_HOLD_ON_RECORD: 'No compliance hold is on record.',
  LEGAL_RESTRICTION_ACTIVE: 'A legal restriction applies.',
  DESTINATION_INVALID: 'The settlement destination isn’t valid.',
  DESTINATION_BLOCKED: 'The settlement destination is blocked.',
  RECONCILIATION_PENDING: 'A reconciliation with the provider is still pending.',
  RAIL_INELIGIBLE: 'The payment route isn’t currently eligible.',
  EVALUATION_INPUT_UNAVAILABLE: 'SecurePay couldn’t read something it needs to evaluate this.',
};
export const reasonWords = (code: string) => REASON[code] ?? 'SecurePay has a money requirement this screen can’t describe yet.';

// ---- Funding authority (`FundingAuthorityReasonCode`)
const FUNDING: Readonly<Record<string, string>> = {
  AUTHORIZED: 'SecurePay says you are the person who funds this Agreement.',
  NOT_PARTICIPANT: 'SecurePay says you aren’t a participant in this Agreement.',
  IDENTITY_INACTIVE: 'SecurePay says your identity isn’t active.',
  PARTICIPANT_NOT_CONFIRMED: 'SecurePay says your confirmation of the current Agreement version isn’t in place.',
  NOT_PAYER_FOR_AGREEMENT: 'SecurePay says you aren’t the payer for this Agreement.',
  NO_MONETARY_OBLIGATION: 'SecurePay says this Agreement has no payment obligation to fund.',
  MULTIPLE_MONETARY_OBLIGATIONS_AMBIGUOUS: 'SecurePay says this Agreement has more than one payment obligation, so funding the whole Agreement at once isn’t possible.',
  OBLIGATION_NOT_AVAILABLE: 'SecurePay says the payment obligation isn’t available to fund right now.',
  OBLIGATION_NOT_FOUND: 'SecurePay couldn’t find the payment obligation.',
};
export const fundingReasonWords = (code: string) => FUNDING[code] ?? 'SecurePay returned a funding reason this screen can’t describe yet.';

// ---- Payment intents. PROVIDER_PENDING (the provider is processing) and CONFIRMATION_PENDING (SecurePay is reconciling) are different uncertainty boundaries.
const INTENT: Readonly<Record<string, string>> = {
  CREATED: 'A payment was created and hasn’t been started.',
  INITIATION_PENDING: 'SecurePay is starting this payment with the provider.',
  ACTION_REQUIRED: 'This payment needs a step from you with your provider.',
  PROVIDER_PENDING: 'Your provider is processing this payment.',
  CONFIRMATION_PENDING: 'The provider has responded and SecurePay is reconciling it. It isn’t confirmed yet.',
  CONFIRMED: 'SecurePay has confirmed this payment.',
  FAILED: 'This payment attempt failed.',
  EXPIRED: 'This payment attempt expired.',
  CANCELLED: 'This payment attempt was cancelled.',
};
export const intentWords = (status: string) => INTENT[status] ?? 'This payment has a status this screen can’t describe yet.';
export const IN_FLIGHT_INTENT = ['CREATED', 'INITIATION_PENDING', 'ACTION_REQUIRED', 'PROVIDER_PENDING', 'CONFIRMATION_PENDING'];

// ---- Money records (`AgreementMoneyRecordResponse`): each says only what it proves.
export function recordWords(r: AgreementMoneyRecordResponse): { label: string; detail: string } {
  if (r.recordType === 'RELEASE_INSTRUCTION_CREATED') return { label: 'Release requested', detail: 'A release instruction was created. That isn’t reserved, sent or settled.' };
  if (r.recordType === 'FUNDING_PAYMENT_INTENT') return { label: 'Funding payment', detail: intentWords(r.status) };
  return { label: 'Money record', detail: 'SecurePay recorded something this screen can’t describe yet.' };
}

// ---- Release authority (`ReleaseAuthorityReasonCode`)
const RELEASE: Readonly<Record<string, string>> = {
  AUTHORIZED: 'SecurePay says you may request release under the current Payment Ready evaluation.',
  NO_CURRENT_EVALUATION: 'SecurePay has no current Payment Ready evaluation for this Agreement.',
  PAYMENT_READY_NOT_SATISFIED: 'Payment Ready isn’t satisfied, so release can’t be requested.',
  AGREEMENT_NOT_ELIGIBLE: 'SecurePay says this Agreement isn’t eligible for release.',
  NOT_AUTHORIZED: 'SecurePay says you aren’t authorised to request release for this Agreement.',
  RELEASE_ALREADY_REQUESTED: 'A release has already been requested for this Agreement.',
};
export const releaseReasonWords = (code: string) => RELEASE[code] ?? 'SecurePay returned a release reason this screen can’t describe yet.';

// ---- Settlement phase. SecurePay's own label "SETTLED" is set whenever an EXECUTION RECORD exists (a dispatch outcome); the response carries no
// provider or bank certification, so it is never shown as "Settled".
const PHASE: Readonly<Record<string, string>> = {
  INSTRUCTION_CREATED: 'A release instruction exists. Nothing has been reserved yet.',
  RESERVED: 'Funds are reserved for this release. Nothing has been sent yet.',
  SETTLED: 'SecurePay recorded an execution for this release. SecurePay doesn’t report bank or provider settlement confirmation here, so this isn’t shown as settled.',
  HELD_EXCEPTION: 'SecurePay’s settlement read shows this release as held. That is a settlement state, separate from any exception details.',
  COMPENSATED: 'SecurePay records this release as compensated: it did not complete. That does not say money was restored to the Agreement’s original spending authority.',
};
export const settlementPhaseWords = (phase: string) => PHASE[phase] ?? 'SecurePay returned a settlement status this screen can’t describe yet.';

// ---- Release instruction version scope. A release instruction is immutable and bound to the Agreement version it was created for; the
// instruction list is Agreement-WIDE history. Never guess: if the current version can't be established the instruction is neutral history.
export type InstructionScope = 'current' | 'earlier' | 'unknown';
export function instructionScope(instructionVersion: string | null | undefined, currentVersionId: string | null | undefined): InstructionScope {
  if (!currentVersionId || !instructionVersion) return 'unknown';
  return instructionVersion === currentVersionId ? 'current' : 'earlier';
}
export const INSTRUCTION_SCOPE_WORDS: Readonly<Record<InstructionScope, string>> = {
  current: 'Current Agreement version',
  earlier: 'Earlier Agreement version',
  unknown: 'Release history',
};
