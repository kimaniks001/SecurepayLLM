import type { AttentionItem, ProblemItem } from '../../types';
import type { InvitationForYouCardView } from '../workspace/view';
import { nextStep } from '../formation/nextStep';
import type { AgreementFormation } from '../formation/view';

export type HumanNextSource =
  | 'formal-review'
  | 'invitation'
  | 'agreement-next-action'
  | 'formation-question'
  | 'formation-review'
  | 'saved-build';

export type HumanDestination =
  | { kind: 'problem'; agreementId: string }
  | { kind: 'invitation'; invitationId: string }
  | { kind: 'agreement'; agreementId: string; actionCode?: string }
  | { kind: 'money'; agreementId: string; title: string }
  | { kind: 'conversation' }
  | { kind: 'formation-point'; pointId: string }
  | { kind: 'formation-review' };

export interface HumanNext {
  workId: string;
  workKind: 'agreement' | 'conversation';
  title: string;
  headline: string;
  detail?: string;
  primaryLabel: string;
  destination: HumanDestination;
  source: HumanNextSource;
  /** Presentation priority only. Never Agreement/Money authority. */
  priority: number;
}

export function resolveConversationHumanNext(input: {
  conversationId: string | null;
  title: string;
  formation: AgreementFormation | null;
  meaningfulWork: boolean;
  unsavedWork: boolean;
}): HumanNext | null {
  const { conversationId, title, formation, meaningfulWork, unsavedWork } = input;
  if (!conversationId || !meaningfulWork) return null;

  if (formation?.question) {
    return {
      workId: conversationId,
      workKind: 'conversation',
      title,
      headline: formation.question.text,
      detail: 'One thing needs your attention.',
      primaryLabel: 'Answer',
      destination: { kind: 'conversation' },
      source: 'formation-question',
      priority: 70,
    };
  }

  if (formation?.reviewable) {
    const step = nextStep(formation);
    if (step.kind === 'point') {
      return {
        workId: conversationId,
        workKind: 'conversation',
        title,
        headline: step.point.text,
        detail: 'Your agreement is taking shape.',
        primaryLabel: step.label,
        destination: { kind: 'formation-point', pointId: step.point.id },
        source: 'formation-review',
        priority: 65,
      };
    }
    if (step.kind === 'points') {
      return {
        workId: conversationId,
        workKind: 'conversation',
        title,
        headline: `${step.count} things need your review before this agreement is ready.`,
        primaryLabel: step.label,
        destination: { kind: 'formation-review' },
        source: 'formation-review',
        priority: 65,
      };
    }
    return {
      workId: conversationId,
      workKind: 'conversation',
      title,
      headline: 'Your agreement is ready to review.',
      primaryLabel: 'Review agreement',
      destination: { kind: 'formation-review' },
      source: 'formation-review',
      priority: 60,
    };
  }

  return {
    workId: conversationId,
    workKind: 'conversation',
    title,
    headline: unsavedWork ? 'You were still working on this.' : 'Pick up where you left off.',
    primaryLabel: 'Continue',
    destination: { kind: 'conversation' },
    source: 'saved-build',
    priority: 40,
  };
}

export function resolveWorkspaceHumanNext(input: {
  problems: ProblemItem[];
  invitations: InvitationForYouCardView[];
  attentionItems: AttentionItem[];
}): HumanNext | null {
  const problem = input.problems[0];
  if (problem) {
    return {
      workId: problem.agreementId,
      workKind: 'agreement',
      title: problem.title,
      headline: problem.detail || problem.stateLabel,
      detail: problem.detail ? problem.stateLabel : undefined,
      primaryLabel: 'Review issue',
      destination: { kind: 'problem', agreementId: problem.agreementId },
      source: 'formal-review',
      priority: 100,
    };
  }

  const invitation = input.invitations.find(item => item.actionable);
  if (invitation) {
    return {
      workId: invitation.invitationId,
      workKind: 'agreement',
      title: invitation.agreementTitle,
      headline: invitation.inviterLine,
      detail: [invitation.amountLine, invitation.expiryLine].filter(Boolean).join(' · ') || invitation.roleLine,
      primaryLabel: 'Review invitation',
      destination: { kind: 'invitation', invitationId: invitation.invitationId },
      source: 'invitation',
      priority: 90,
    };
  }

  const attention = input.attentionItems[0];
  if (attention) {
    const actionCode = attention.actionValue;
    const destination: HumanDestination = actionCode === 'FUND_AGREEMENT'
      ? { kind: 'money', agreementId: attention.agreementId, title: attention.title }
      : { kind: 'agreement', agreementId: attention.agreementId, actionCode };
    const primaryLabel = actionCode === 'REVIEW_AMENDMENT' || actionCode === 'RECONFIRM_AGREEMENT_VERSION'
      ? 'Review change'
      : actionCode === 'REVIEW_EVIDENCE' ? 'Inspect the work'
        : actionCode === 'FUND_AGREEMENT' ? 'See payment options'
          : 'Continue';
    return {
      workId: attention.agreementId,
      workKind: 'agreement',
      title: attention.title,
      headline: attention.detail,
      primaryLabel,
      destination,
      source: 'agreement-next-action',
      priority: 80,
    };
  }

  return null;
}

export function chooseHumanNext(...candidates: Array<HumanNext | null | undefined>): HumanNext | null {
  const valid = candidates.filter((candidate): candidate is HumanNext => !!candidate);
  if (valid.length === 0) return null;
  return valid.reduce((best, candidate) => candidate.priority > best.priority ? candidate : best);
}
