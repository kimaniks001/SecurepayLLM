import type { AgreementCompletionResponse } from '../../api/securepay/agreements/dto';
import type { NextActionDto, ObligationDto } from '../../api/securepay/agreements';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** SecurePay's obligation statuses in plain words; an unknown status is "unavailable", never guessed. */
export const OBLIGATION_STATUS_WORDS: Readonly<Record<string, string>> = {
  PENDING: 'Not started', AVAILABLE: 'Ready to start', BLOCKED: 'Waiting', IN_PROGRESS: 'In progress', EVIDENCE_SUBMITTED: 'Evidence submitted',
  COMPLETED: 'Completed', REJECTED: 'Rejected', OVERDUE: 'Overdue', CANCELLED: 'Cancelled',
};
export const obligationStatusWord = (status: string) => OBLIGATION_STATUS_WORDS[status] ?? 'Status unavailable';

/** Milestone effective states (SecurePay's own; never derived from sequence order). */
export const MILESTONE_STATE_WORDS: Readonly<Record<string, string>> = { READY: 'Ready', IN_PROGRESS: 'In progress', WAITING: 'Waiting', COMPLETED: 'Completed', CANCELLED: 'Cancelled' };
export const milestoneStateWord = (state: string) => MILESTONE_STATE_WORDS[state] ?? 'Status unavailable';

/** What SecurePay's produced action codes mean, without turning any of them into a control. */
export const NEXT_ACTION_WORDS: Readonly<Record<string, string>> = {
  START_OBLIGATION: 'SecurePay says this work is ready for you to start.',
  SUBMIT_EVIDENCE: 'SecurePay is waiting for evidence from you.',
  REVIEW_EVIDENCE: 'SecurePay says this evidence needs review.',
  WAIT_FOR_DEPENDENCY: 'SecurePay is waiting — there is nothing for you to do yet.',
  WAIT_UNTIL_AVAILABLE: 'This work isn’t available to start yet — there is nothing for you to do yet.',
  REPLACE_EVIDENCE: 'Your evidence needs replacing. Submit new evidence in its place.',
  FUND_AGREEMENT: 'This is a payment obligation. Money is handled in the Money area.',
};
export const nextActionWords = (action: NextActionDto) => {
  // Phase 7 Slice 3 -- review outcomes, from SecurePay's own next action (never inferred here).
  if (action.actionType === 'REPLACE_EVIDENCE') return action.prerequisiteStatus === 'NEEDS_MORE_INFORMATION' ? 'More information was asked for. Replace your evidence with what was asked.' : 'Your evidence wasn’t accepted. Replace it with new evidence.';
  if (action.actionType === 'NO_ACTION_REQUIRED' && action.prerequisiteStatus === 'EVIDENCE_APPROVED') return 'Your evidence was approved. Completing the work comes later.';
  if (action.actionType === 'WAIT_FOR_DEPENDENCY') return action.prerequisiteStatus === 'EVIDENCE_SUBMITTED' ? 'SecurePay is waiting for the evidence to be reviewed.' : 'This work is waiting on other work to finish first.';
  return NEXT_ACTION_WORDS[action.actionType] ?? 'SecurePay has an action for this work that this screen can’t show yet.';
};

/** Evidence types as SecurePay names them (free strings from a condition's parameters). */
export const evidenceTypeWords = (type: string) => { const w = type.toLowerCase().replace(/_/g, ' ').trim(); return w ? w.charAt(0).toUpperCase() + w.slice(1) : 'Evidence'; };

/**
 * SecurePay's completion requirements are strings that embed ids ("dependency_obligation_<uuid>", "evidence_review_pending_<uuid>",
 * "condition_<uuid>"). Ids are never shown: known shapes get plain words (a prerequisite is named only when its title is in hand),
 * an unknown code fails closed.
 */
export function requirementWords(code: string, titleOf: (obligationId: string) => string | null): string {
  if (code === 'evidence_required') return 'Evidence has to be submitted.';
  if (code === 'obligation_not_completable') return 'This work can no longer be completed.';
  if (code.startsWith('evidence_review_pending_')) return 'Evidence is waiting for an approving review.';
  if (code.startsWith('dependency_obligation_')) { const t = titleOf(code.slice('dependency_obligation_'.length)); return t ? `“${t}” has to be completed first.` : 'Other work has to be completed first.'; }
  if (code.startsWith('condition_')) return 'A required condition isn’t satisfied yet.';
  return 'SecurePay lists a requirement this screen can’t describe yet.';
}
export function satisfiedWords(code: string): string | null {
  if (code === 'no_dependencies' || code === 'dependencies_satisfied') return 'Nothing else has to finish first.';
  if (code.startsWith('evidence_approved_')) return 'Evidence has been approved in review.';
  if (code.startsWith('condition_')) return 'A required condition is satisfied.';
  return null; // e.g. monetary_obligation_described_only: not shown as customer content
}

/** "waiting on milestone(s): <uuid>, <uuid>" -> titles where known; never ids. */
export function milestoneReasonWords(reason: string | null | undefined, titleOfMilestone: (id: string) => string | null): string | null {
  if (!reason) return null;
  const ids = reason.match(new RegExp(UUID.source, 'gi')) ?? [];
  if (ids.length === 0) return 'Waiting on other work.';
  const titles = ids.map(titleOfMilestone).filter((t): t is string => !!t);
  return titles.length === ids.length ? `Waiting for ${titles.map(t => `“${t}”`).join(', ')} to be completed.` : 'Waiting on another milestone to be completed.';
}

export interface CompletionFacts { headline: string; text: string; tone: 'complete' | 'open' | 'neutral'; completedAt: string | null }
/**
 * Whole-Agreement completion is a READ MODEL (`AgreementCompletionProjectionService`); there is no command. Statuses:
 * COMPLETED / NOT_COMPLETED / INELIGIBLE / UNSUPPORTED. Unsupported and unknown are never "unfinished".
 */
export function completionFacts(c: AgreementCompletionResponse | null | undefined): CompletionFacts {
  if (!c) return { headline: 'Completion status unavailable', text: 'SecurePay’s completion status couldn’t be loaded right now.', tone: 'neutral', completedAt: null };
  if (c.completed === true) return { headline: 'Agreement completed', text: 'SecurePay records the current Agreement version as completed.', tone: 'complete', completedAt: c.completedAt ?? null };
  const has = (code: string) => (c.reasonCodes ?? []).includes(code);
  if (c.status === 'UNSUPPORTED') return { headline: 'Completion isn’t available for this Agreement', text: 'SecurePay doesn’t evaluate completion for this type of Agreement, so this says nothing about whether the work is finished.', tone: 'neutral', completedAt: null };
  if (c.status === 'INELIGIBLE') return { headline: 'This Agreement can’t be completed', text: has('AGREEMENT_CANCELLED') ? 'This Agreement was cancelled.' : has('AGREEMENT_EXPIRED') ? 'This Agreement expired.' : 'SecurePay says this Agreement isn’t eligible for completion.', tone: 'neutral', completedAt: null };
  if (c.status === 'NOT_COMPLETED') {
    const parts: string[] = [];
    if (has('OBLIGATION_INCOMPLETE')) parts.push('Some work in this Agreement isn’t complete yet.');
    if (has('REQUIRED_OBLIGATIONS_MISSING')) parts.push('This Agreement doesn’t list any work to complete yet.');
    if (has('REQUIRED_SETTLEMENT_SCOPE_UNSETTLED') || has('SETTLEMENT_EVIDENCE_STALE')) parts.push('Settlement activity for this Agreement is still outstanding.');
    if (parts.length > 0) return { headline: 'Not complete yet', text: parts.join(' '), tone: 'open', completedAt: null };
  }
  return { headline: 'Completion can’t be determined', text: 'SecurePay can’t determine completion from this Agreement yet.', tone: 'neutral', completedAt: null };
}

/** Current-version scoping by EXPLICIT id: never "highest version", never chronology. `null` current version = nothing is current work. */
export function currentVersionObligations(all: ObligationDto[], currentVersionId: string | null): ObligationDto[] {
  if (!currentVersionId) return [];
  return all.filter(o => o.agreementVersionId === currentVersionId);
}
