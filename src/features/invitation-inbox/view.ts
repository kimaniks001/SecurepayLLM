import type { AgreementInvitationInboxItemResponse } from '../../api/securepay/agreements/dto';

function formatMoney(currency: string | null, amountMinor: number | null): string | null {
  if (currency == null || amountMinor == null) return null;
  return `${currency} ${(amountMinor / 100).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
}
function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}
function humanizeCode(code: string): string {
  return code.toLowerCase().split('_').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * KS001 Upgrade Phase 4 final convergence (Section 3) — one row of the full Invitations surface. Always
 * a review-first affordance (Section 6 — never "Accept"/"Join now"/"Confirm" from a list); a historical
 * row simply has no action at all.
 */
export interface InvitationInboxRowView {
  invitationId: string;
  actionable: boolean;
  inviterLine: string;
  agreementTitle: string;
  roleLine: string;
  amountLine: string | null;
  expiryLine: string | null;
  statusNote: string | null;
}

function toRow(item: AgreementInvitationInboxItemResponse): InvitationInboxRowView {
  return {
    invitationId: item.invitationId,
    actionable: item.needsAttention,
    inviterLine: item.inviterDisplayName ? `${item.inviterDisplayName} invited you` : 'You’ve been invited',
    agreementTitle: item.agreementTitle ?? 'An agreement',
    roleLine: `Your proposed role: ${humanizeCode(item.roleCode)}`,
    amountLine: formatMoney(item.currency, item.proposedAmountMinor) != null
      ? `${formatMoney(item.currency, item.proposedAmountMinor)} proposed` : null,
    expiryLine: item.needsAttention ? `Expires ${formatShortDate(item.expiresAt)}` : null,
    statusNote: item.needsAttention
      ? null
      : item.status === 'EXPIRED'
        ? 'This invitation has expired.'
        : item.status === 'REVOKED'
          ? 'This invitation is no longer available.'
          : item.status === 'JOINED'
            ? 'You already joined this Agreement.'
            : null,
  };
}

export interface InvitationInboxGroups {
  needsResponse: InvitationInboxRowView[];
  past: InvitationInboxRowView[];
}

/**
 * KS001 Upgrade Phase 4 final convergence (Section 3) — "NEEDS YOUR RESPONSE" / "PAST INVITATIONS"
 * grouping over the backend's own {@code needsAttention} and {@code status} truth; never a re-derived
 * lifecycle judgement.
 *
 * <p>Documented choice (Section 3's own "make one consistent choice and document it"): a `JOINED`
 * invitation IS shown here, in Past, as restrained historical context ("You already joined this
 * Agreement.", no action) — unlike Home's own "Invitations for you", which omits it entirely because
 * Home's job is "what needs me?" and the Agreement itself already lives in the person's normal Agreement
 * surfaces. This full surface's job is different: it is the complete, honest record of "what has been
 * proposed to me", so a joined invitation staying visible (without any action) is the more truthful
 * choice here.
 */
export function groupInvitationInboxItems(items: AgreementInvitationInboxItemResponse[]): InvitationInboxGroups {
  const needsResponse: InvitationInboxRowView[] = [];
  const past: InvitationInboxRowView[] = [];
  for (const item of items) {
    const row = toRow(item);
    (item.needsAttention ? needsResponse : past).push(row);
  }
  return { needsResponse, past };
}
