import type { AgreementCompletionResponse, WorkspaceNextActionResponse } from '../../api/securepay/agreements/dto';
import type { CalendarEventView } from './view';

export type AgreementNextDestination = 'progress' | 'changes' | 'money';

export type AgreementNextPresentation = {
  state: 'NEEDS_YOU' | 'WAITING' | 'UPCOMING' | 'DONE' | 'IDLE' | 'UNKNOWN';
  eyebrow: string;
  headline: string;
  detail?: string;
  actionLabel?: string;
  destination?: AgreementNextDestination;
  sourceActionCode?: string;
};

const PASSIVE = new Set(['NO_ACTION_REQUIRED', 'WAIT_FOR_DEPENDENCY', 'WAIT_UNTIL_AVAILABLE']);

function humanReason(action: WorkspaceNextActionResponse): string {
  if (action.reason?.trim()) return action.reason.trim();
  return action.actionCode
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function resolveAgreementNext(input: {
  actionsKnown: boolean;
  nextActions: WorkspaceNextActionResponse[];
  completion: AgreementCompletionResponse | null;
  nextDate: CalendarEventView | null;
  amountLabel: string;
}): AgreementNextPresentation {
  const { actionsKnown, nextActions, completion, nextDate, amountLabel } = input;

  if (!actionsKnown) {
    return {
      state: 'UNKNOWN',
      eyebrow: 'SecurePay is checking',
      headline: "SecurePay couldn't confirm what needs you next.",
      detail: 'No Agreement or Money action has been assumed.',
    };
  }

  const ac¶»§q«^