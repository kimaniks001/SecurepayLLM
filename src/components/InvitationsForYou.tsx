import type { InvitationForYouCardView } from '../features/workspace/view';

interface InvitationsForYouProps {
  items: InvitationForYouCardView[];
  onReview: (invitationId: string) => void;
  /** KS001 Upgrade Phase 4 final convergence (Section 4) — the real doorway to the full Invitations surface. */
  onViewAll: () => void;
}

const VISIBLE_LIMIT = 3;

/**
 * PHASE 4 NEXT SLICE (Section 4-10, 25-27) — Home's "Invitations for you". Bounded (never turns Home
 * into an inbox product), omitted entirely when empty (Section 25 — no "No one has invited you yet"
 * social-evaluation copy), and every card's first action is to REVIEW, never Accept/Confirm/Join/Pay
 * (Section 6/31's own closed-vocabulary doctrine).
 *
 * <p>KS001 Upgrade Phase 4 final convergence (Section 4) — "+N more" used to be dead text with no way
 * to actually open the rest. It is now a real "View all invitations" action to the dedicated Invitations
 * surface (never a Home-specific invitation detail page — Section 4's own "do not create Home invitation
 * detail" instruction).
 */
export function InvitationsForYou({ items, onReview, onViewAll }: InvitationsForYouProps) {
  if (items.length === 0) return null;
  const visible = items.slice(0, VISIBLE_LIMIT);
  const remaining = items.length - visible.length;

  return (
    <div className="animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">
        Invitations for you
      </div>
      <p className="text-[0.78rem] text-sand-600 mb-2 leading-relaxed">
        People have invited you to agreements. Review what they’re proposing before deciding whether to join.
      </p>
      <div className="space-y-2">
        {visible.map(item => (
          <div key={item.invitationId} className="rounded-xl border border-cream-200 bg-white px-4 py-3">
            <div className="text-[0.875rem] font-medium text-forest-800">{item.inviterLine}</div>
            <div className="text-[0.8rem] text-sand-700 mt-0.5">{item.agreementTitle}</div>
            <div className="text-[0.78rem] text-sand-600 mt-1.5">{item.roleLine}</div>
            {item.amountLine && <div className="text-[0.78rem] text-sand-600">{item.amountLine}</div>}
            {item.expiryLine && <div className="text-[0.75rem] text-sand-500 mt-1">{item.expiryLine}</div>}
            {item.statusNote && <div className="text-[0.78rem] text-sand-500 mt-1.5">{item.statusNote}</div>}
            {item.actionable && (
              <button
                type="button"
                onClick={() => onReview(item.invitationId)}
                className="mt-2 text-[0.78rem] font-medium text-forest-600 hover:text-forest-700"
              >
                Review invitation →
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onViewAll}
        className="mt-2 text-[0.75rem] font-medium text-sand-500 hover:text-forest-700"
      >
        View all invitations{remaining > 0 ? ` (+${remaining} more)` : ''}
      </button>
    </div>
  );
}
