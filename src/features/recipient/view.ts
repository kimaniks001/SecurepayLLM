import type {
  AgreementConfirmationResponse, AgreementVersionResponse, JoinAgreementResponse, PublicInvitationViewResponse,
} from '../../api/securepay/agreements/dto';
import { formatMinor } from '../discovery/money';
import type { AgreementParticipantDto } from '../../api/securepay/agreements';
import type {
  CanonicalAgreementResponse, ErrorStateResponse, JoinPromptResponse, JoinedStatusResponse, NoticeResponse, RecipientReviewResponse,
} from '../../types';

// Integer-safe: amounts are minor units and never divided as floats.
function formatMoney(currency: string | null, amountMinor: number | null): string {
  if (amountMinor == null) return 'Not yet specified';
  return formatMinor(amountMinor, currency ?? '') ?? 'Not yet specified';
}
/** SecurePay's role codes (BUYER, SERVICE_PROVIDER…) in plain words; an unknown code is shown as SecurePay sent it, softened, never guessed. */
export function roleWords(code: string): string {
  const words = code.toLowerCase().replace(/_/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Participant';
}
function formatDate(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Composes the recipient-review card from backend public-invitation facts only -- no inviter
 * identity or trade detail beyond what SecurePay actually returns. Deep-review correction: the
 * previous version forced `proposedAmountMinor` into a "labour" field and hardcoded
 * `materials: 'Not specified'`, encoding a construction/labour assumption the public invitation
 * contract does not make. `purpose`/`proposedAmount` are `null` (never a fabricated placeholder
 * string) when the backend doesn't supply them, so the card can honestly represent a service,
 * product, contribution, project, or any other Agreement shape.
 */
export function recipientReviewView(invitation: PublicInvitationViewResponse): RecipientReviewResponse {
  return {
    type: 'RECIPIENT_REVIEW',
    // SecurePay's public invitation view exposes no inviter identity, so none is claimed.
    inviterName: '',
    title: invitation.title,
    role: roleWords(invitation.intendedRole),
    purpose: invitation.purpose || null,
    proposedAmount: invitation.proposedAmountMinor != null ? formatMoney(invitation.currency, invitation.proposedAmountMinor) : null,
    expiry: `Invitation expires ${formatDate(invitation.invitationExpiresAt)}`,
    nextSteps: [
      'Sign in, only if SecurePay needs to know who you are.',
      'Join, so you can take part. Joining does not mean you agree.',
      'Read the exact Agreement, then decide.',
    ],
    primaryLabel: 'Continue',
    primaryValue: 'continue_review',
    secondaryLabel: "Not me / I wasn't expecting this",
    secondaryValue: 'not_me',
  };
}

export function joinPromptView(): JoinPromptResponse {
  return {
    type: 'JOIN_PROMPT',
    title: 'Join this Agreement',
    text: 'Joining adds you as a participant so you can read the exact Agreement and respond. It does not mean you agree to the terms, and nothing is paid.',
    primaryLabel: 'Join this Agreement',
    primaryValue: 'join_agreement',
    secondaryLabel: 'Not now',
    secondaryValue: 'leave',
  };
}

export function joinedStatusView(join: JoinAgreementResponse): JoinedStatusResponse {
  return {
    type: 'JOINED_STATUS',
    title: 'You have joined this Agreement',
    text: `You are taking part as: ${roleWords(join.role)}. Next, read the exact version below.`,
    status: join.participantStatus === 'JOINED_UNCONFIRMED' ? 'Joined' : roleWords(join.participantStatus),
    notAgreed: 'You have not yet agreed to these terms.',
  };
}

/**
 * Who is on the Agreement, from SecurePay's own participant list: role and status only (it carries no name or
 * KS Number). The caller's own row is found by the participant id Join returned -- never by position or guess.
 */
export function participantsView(participants: AgreementParticipantDto[] | null, ownParticipantId: string | null): { name: string; role: string }[] {
  if (!participants) return [];
  const status = (value: string) => value === 'CONFIRMED' ? 'has confirmed' : value === 'JOINED_UNCONFIRMED' ? 'has joined' : (value === 'INVITED' || value === 'PENDING') ? 'invited' : value === 'CREATOR' ? 'started this Agreement' : roleWords(value).toLowerCase();
  return participants.map(p => ({
    name: p.id === ownParticipantId ? 'You' : 'Another participant',
    role: `${roleWords(p.roleCode)} · ${status(p.participantStatus)}`,
  }));
}

/** Renders only the verified snapshot keys SecurePay actually writes (title/purpose/description/currency/proposed_amount_minor); never a fabricated work/parties breakdown. */
export function exactVersionView(version: AgreementVersionResponse, parties: { name: string; role: string }[] = []): CanonicalAgreementResponse {
  const snapshot = version.snapshot;
  const title = typeof snapshot.title === 'string' ? snapshot.title : 'Agreement under review';
  const purpose = typeof snapshot.purpose === 'string' && snapshot.purpose ? snapshot.purpose : null;
  const description = typeof snapshot.description === 'string' && snapshot.description ? snapshot.description : null;
  const currency = typeof snapshot.currency === 'string' ? snapshot.currency : null;
  const amountMinor = typeof snapshot.proposed_amount_minor === 'number' ? snapshot.proposed_amount_minor : null;
  const work = [purpose, description].filter((value): value is string => !!value);
  return {
    type: 'CANONICAL_AGREEMENT',
    title,
    version: `${version.versionNumber}`,
    status: 'Current version — you have not confirmed it',
    parties,
    work: work.length ? work : ['Not yet specified'],
    price: formatMoney(currency, amountMinor),
    completion: 'Not yet specified',
    worthSettling: [],
    mustSettle: [],
    // Truthful: SecurePay records this participant's confirmation of THIS exact version (number + content hash).
    primaryLabel: 'Yes, I confirm this version',
    primaryValue: 'confirm_acceptance',
    secondaryLabel: 'This needs changing',
    secondaryValue: 'need_change',
    consequence: `Your confirmation is recorded against version ${version.versionNumber} exactly. If the Agreement changes, you will be asked again. It doesn’t mean everyone has confirmed, and nothing is paid.`,
  };
}

/** SecurePay has no recipient change-request or decline operation, so this says so and promises nothing else. */
export function needsChangingView(): NoticeResponse {
  return {
    type: 'NOTICE',
    label: 'This needs changing',
    text: 'There isn’t a way to send a change request from here yet, and nothing has been sent. You haven’t confirmed anything. If this isn’t what you understood, don’t confirm — speak to the person who invited you and ask them to revise it. If it changes, you’ll be asked to review the new version.',
    tone: 'worth_checking',
  };
}

export function changedVersionNoticeView(): NoticeResponse {
  return {
    type: 'NOTICE',
    label: 'This Agreement changed since you reviewed it',
    text: 'What you looked at earlier is no longer the current version, and nothing you did applied to the new one. Read the current version below before deciding.',
    tone: 'worth_checking',
  };
}

export function confirmedView(confirmation: AgreementConfirmationResponse): NoticeResponse {
  const extra = confirmation.reconfirmationRequired ? ' SecurePay may ask you to reconfirm again later.' : '';
  return {
    type: 'NOTICE',
    label: 'You confirmed this version',
    text: `Your confirmation of version ${confirmation.versionNumber} is recorded. This covers only you — it does not mean every participant has confirmed, and no payment has been made.${extra}`,
    tone: 'important',
  };
}

export function recipientErrorView(message: string): ErrorStateResponse {
  return { type: 'ERROR_STATE', title: 'This could not continue', text: message, primaryLabel: 'Leave', primaryValue: 'leave' };
}
