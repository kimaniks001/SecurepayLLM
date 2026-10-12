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
  return action.actionCode.toLowerCase().split('_').filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function resolveAgreementNext(input: {
  actionsKnown: boolean;
  nextActions: WorkspaceNextActionResponse[];
  completion: AgreementCompletionResponse | null;
  nextDate: CalendarEventView | null;
  amountLabel: string;
}): AgreementNextPresentation {
  const { actionsKnown, nextActions, completion, nextDate, amountLabel } = input;

  if (!actionsKnown) return {
    state: 'UNKNOWN',
    eyebrow: 'SecurePay is checking',
    headline: "SecurePay couldn't confirm what needs you next.",
    detail: 'No Agreement or Money action has been assumed.',
  };

  const action = nextActions[0] ?? null;
  if (action) {
    if (PASSIVE.has(action.actionCode)) {
      if (nextDate && action.actionCode === 'WAIT_UNTIL_AVAILABLE') return {
        state: 'UPCOMING',
        eyebrow: 'Upcoming',
        headline: nextDate.title,
        detail: nextDate.dateLabel + (nextDate.timeLabel ? ' · ' + nextDate.timeLabel : '') + '. Nothing needs your attention before then.',
        sourceActionCode: action.actionCode,
      };
      return {
        state: 'WAITING',
        eyebrow: 'Waiting',
        headline: humanReason(action),
        detail: action.deadline
          ? 'SecurePay is waiting until ' + new Date(action.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) + '.'
          : 'There is no action for you to take from this state.',
        sourceActionCode: action.actionCode,
      };
    }

    if (action.actionCode === 'FUND_AGREEMENT') return {
      state: 'NEEDS_YOU',
      eyebrow: 'Needs you',
      headline: amountLabel + ' can now be funded for this Agreement.',
      detail: 'Payment options are shown only after SecurePay has authorised this funding step.',
      actionLabel: 'See payment options',
      destination: 'money',
      sourceActionCode: action.actionCode,
    };

    if (action.actionCode === 'REVIEW_AMENDMENT' || action.actionCode === 'RECONFIRM_AGREEMENT_VERSION') return {
      state: 'NEEDS_YOU',
      eyebrow: 'Needs you',
      headline: action.actionCode === 'REVIEW_AMENDMENT' ? 'A proposed change needs your decision.' : 'The Agreement changed and needs your review.',
      detail: humanReason(action),
      actionLabel: 'Review change',
      destination: 'changes',
      sourceActionCode: action.actionCode,
    };

    if (action.actionCode === 'REVIEW_EVIDENCE') return {
      state: 'NEEDS_YOU',
      eyebrow: 'Needs you',
      headline: 'Evidence for the work needs your review.',
      detail: 'Reviewing evidence does not by itself complete the work or release money.',
      actionLabel: 'Inspect the work',
      destination: 'progress',
      sourceActionCode: action.actionCode,
    };

    const progressActions: Record<string, { headline: string; actionLabel: string }> = {
      START_OBLIGATION: { headline: 'The agreed work can begin.', actionLabel: 'Start work' },
      SUBMIT_EVIDENCE: { headline: 'Add evidence for the work you have done.', actionLabel: 'Add evidence' },
      REPLACE_EVIDENCE: { headline: 'Your evidence needs attention.', actionLabel: 'Replace evidence' },
      COMPLETE_OBLIGATION: { headline: 'The work can now be marked complete.', actionLabel: 'Complete work' },
      PROVIDE_LOCATION: { headline: 'This Agreement needs the required location.', actionLabel: 'Add location' },
      RECORD_ATTENDANCE: { headline: 'Attendance needs to be recorded for this Agreement.', actionLabel: 'Record attendance' },
      SUBMIT_DELIVERY: { headline: 'Record the delivery for this Agreement.', actionLabel: 'Record delivery' },
      ACKNOWLEDGE_DELIVERY: { headline: 'A delivery needs your acknowledgement.', actionLabel: 'Review delivery' },
      PROVIDE_MORE_INFORMATION: { headline: 'SecurePay needs more information for this work.', actionLabel: 'Provide information' },
    };
    const progress = progressActions[action.actionCode];
    if (progress) return {
      state: 'NEEDS_YOU',
      eyebrow: 'Needs you',
      headline: progress.headline,
      detail: action.deadline
        ? 'Do this by ' + new Date(action.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) + '.'
        : 'SecurePay identified this from the current Agreement state.',
      actionLabel: progress.actionLabel,
      destination: 'progress',
      sourceActionCode: action.actionCode,
    };

    return {
      state: 'NEEDS_YOU',
      eyebrow: 'Needs you',
      headline: humanReason(action),
      detail: 'SecurePay has identified a real action, but this screen has no safe direct control for it yet.',
      sourceActionCode: action.actionCode,
    };
  }

  if (completion?.completed) return {
    state: 'DONE',
    eyebrow: 'Done',
    headline: 'The agreed work is complete.',
    detail: completion.completedAt
      ? 'SecurePay recorded completion on ' + new Date(completion.completedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) + '.'
      : 'SecurePay records this Agreement as complete.',
  };

  if (nextDate) return {
    state: 'UPCOMING',
    eyebrow: 'Upcoming',
    headline: nextDate.title,
    detail: nextDate.dateLabel + (nextDate.timeLabel ? ' · ' + nextDate.timeLabel : '') + '. Nothing needs your attention before then.',
  };

  return {
    state: 'IDLE',
    eyebrow: 'Right now',
    headline: 'Nothing needs your attention today.',
    detail: 'SecurePay has not identified an action for you on this Agreement.',
  };
}

export function AgreementNextStep({ next, onOpenProgress, onOpenChanges, onOpenMoney, onAskKs001 }: {
  next: AgreementNextPresentation;
  onOpenProgress: () => void;
  onOpenChanges: () => void;
  onOpenMoney: () => void;
  onAskKs001?: () => void;
}) {
  const run = next.destination === 'money' ? onOpenMoney
    : next.destination === 'changes' ? onOpenChanges
      : next.destination === 'progress' ? onOpenProgress
        : null;

  return (
    <section aria-label="What matters next" data-phase4-next-step data-next-state={next.state} data-next-action={next.sourceActionCode ?? ''}
      className="rounded-3xl border border-cream-200 bg-white px-5 py-5 md:px-6 md:py-6">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-600">{next.eyebrow}</p>
      <h2 className="mt-2 max-w-2xl font-display text-[1.35rem] leading-7 text-forest-900 md:text-[1.55rem]">{next.headline}</h2>
      {next.detail && <p className="mt-2 max-w-2xl text-[0.86rem] leading-6 text-sand-700">{next.detail}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {run && next.actionLabel && <button type="button" onClick={run}
          className="inline-flex min-h-11 items-center rounded-full bg-forest-700 px-5 text-[0.86rem] font-semibold text-white hover:bg-forest-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
          {next.actionLabel} →
        </button>}
        {onAskKs001 && <button type="button" onClick={onAskKs001}
          className="min-h-11 px-1 text-[0.82rem] font-medium text-forest-700 underline decoration-forest-200 underline-offset-4">
          Ask KS001
        </button>}
      </div>
    </section>
  );
}
