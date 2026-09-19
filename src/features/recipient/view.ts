import type {
  AgreementConfirmationResponse, AgreementVersionResponse, JoinAgreementResponse, PublicInvitationViewResponse,
} from '../../api/securepay/agreements/dto';
import type {
  CanonicalAgreementResponse, ErrorStateResponse, JoinPromptResponse, JoinedStatusResponse, NoticeResponse, RecipientReviewResponse,
} from '../../types';

function formatMoney(currency: string | null, amountMinor: number | null): string {
  if (amountMinor == null) return 'Not yet specified';
  const major = (amountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${currency} ${major}` : major;
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
    inviterName: 'Someone',
    title: invitation.title,
    role: invitation.intendedRole,
    purpose: invitation.purpose || null,
    proposedAmount: invitation.proposedAmountMinor != null ? formatMoney(invitation.currency, invitation.proposedAmountMinor) : null,
    expiry: `Invitation expires ${formatDate(invitation.invitationExpiresAt)}`,
    primaryLabel: 'Continue',
    primaryValue: 'continue_review',
    secondaryLabel: "Not me / I wasn't expecting this",
    secondaryValue: 'not_me',
  };
}

export function joinPromptView(): JoinPromptResponse {
  return {
    type: 'JOIN_PROMPT',
    title: 'Join agreement',
    text: 'Joining connects you as the intended participant. It does not mean you agree to the terms yet.',
    primaryLabel: 'Join agreement',
    primaryValue: 'join_agreement',
    secondaryLabel: 'Leave',
    secondaryValue: 'leave',
  };
}

export function joinedStatusView(join: JoinAgreementResponse): JoinedStatusResponse {
  return {
    type: 'JOINED_STATUS',
    title: "You've joined",
    text: 'Now review the exact agreement version before deciding whether you agree.',
    status: join.participantStatus === 'JOINED_UNCONFIRMED' ? 'Joined — not yet confirmed' : join.participantStatus,
  };
}

/** Renders only the verified snapshot keys SecurePay actually writes (title/purpose/description/currency/proposed_amount_minor); never a fabricated work/parties breakdown. */
export function exactVersionView(version: AgreementVersionResponse): CanonicalAgreementResponse {
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
    version: `Version ${version.versionNumber}`,
    status: 'Current version — awaiting your confirmation',
    parties: [],
    work: work.length ? work : ['Not yet specified'],
    price: formatMoney(currency, amountMinor),
    completion: 'Not yet specified',
    worthSettling: [],
    mustSettle: [],
    primaryLabel: 'Yes, this is what I agree to',
    primaryValue: 'confirm_acceptance',
    secondaryLabel: 'I need something changed',
    secondaryValue: 'need_change',
  };
}

export function changedVersionNoticeView(): NoticeResponse {
  return {
    type: 'NOTICE',
    label: 'This changed',
    text: 'The agreement changed since you joined or last reviewed it. Review the current version below before deciding.',
    tone: 'worth_checking',
  };
}

export function confirmedView(confirmation: AgreementConfirmationResponse): NoticeResponse {
  const extra = confirmation.reconfirmationRequired ? ' SecurePay may ask you to reconfirm again later.' : '';
  return {
    type: 'NOTICE',
    label: 'Confirmed',
    text: `You confirmed version ${confirmation.versionNumber}. This confirms only your own review — it does not mean every party has confirmed, that the agreement is active, or that payment is ready.${extra}`,
    tone: 'important',
  };
}

export function recipientErrorView(message: string): ErrorStateResponse {
  return { type: 'ERROR_STATE', title: 'This could not continue', text: message, primaryLabel: 'Leave', primaryValue: 'leave' };
}
