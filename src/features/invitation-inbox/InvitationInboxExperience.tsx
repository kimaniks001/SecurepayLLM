import { useEffect, useSyncExternalStore } from 'react';
import { ArrowLeft } from 'lucide-react';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import { Button } from '../../components/dna/Button';
import { PageHeader } from '../../components/dna/PageHeader';
import { StatusNotice } from '../../components/dna/StatusNotice';
import type { InvitationInboxController, InvitationInboxViewState } from './controller';
import { groupInvitationInboxItems, type InvitationInboxRowView } from './view';

function InvitationRow({ row, onReview }: { row: InvitationInboxRowView; onReview: (invitationId: string) => void }) {
  return (
    <div className="rounded-xl border border-cream-200 bg-white px-4 py-3">
      <div className="text-[0.875rem] font-medium text-forest-800">{row.inviterLine}</div>
      <div className="text-[0.8rem] text-sand-700 mt-0.5">{row.agreementTitle}</div>
      <div className="text-[0.78rem] text-sand-600 mt-1.5">{row.roleLine}</div>
      {row.amountLine && <div className="text-[0.78rem] text-sand-600">{row.amountLine}</div>}
      {row.expiryLine && <div className="text-[0.75rem] text-sand-500 mt-1">{row.expiryLine}</div>}
      {row.statusNote && <div className="text-[0.78rem] text-sand-500 mt-1.5">{row.statusNote}</div>}
      {row.actionable && (
        <button
          type="button"
          onClick={() => onReview(row.invitationId)}
          className="mt-2 text-[0.78rem] font-medium text-forest-600 hover:text-forest-700"
        >
          Review invitation →
        </button>
      )}
    </div>
  );
}

/**
 * KS001 Upgrade Phase 4 final convergence (Section 3/4) — the pure, stateless body: takes an already-
 * resolved {@link InvitationInboxViewState} directly rather than a controller/store, so it can be
 * rendered and asserted on synchronously in tests (the same reason other store-backed screens in this
 * codebase only source-assert on their live component — see `notifications: a REVIEWS notification can
 * only open the Agreement` in tests/ui-phase9.test.mjs — `useSyncExternalStore` has no
 * `getServerSnapshot` and cannot run under `renderToStaticMarkup`).
 */
export function InvitationInboxBody({ state, onReview, onLoadMore }: {
  state: InvitationInboxViewState;
  onReview: (invitationId: string) => void;
  onLoadMore: () => void;
}) {
  if (state.status === 'loading') return <p role="status" className="text-sm text-sand-500">Loading your invitations…</p>;
  if (state.status === 'error') return <StatusNotice tone="warning" icon={false}>{state.message}</StatusNotice>;

  const groups = groupInvitationInboxItems(state.items);
  const nothingAtAll = groups.needsResponse.length === 0 && groups.past.length === 0;
  return (
    <>
      {nothingAtAll && (
        <p className="text-[0.82rem] text-sand-500 py-8 text-center">No one has proposed an Agreement to you yet.</p>
      )}
      {groups.needsResponse.length > 0 && (
        <div>
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Needs your response</div>
          <div className="space-y-2">
            {groups.needsResponse.map(row => <InvitationRow key={row.invitationId} row={row} onReview={onReview} />)}
          </div>
        </div>
      )}
      {groups.past.length > 0 && (
        <div>
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2 mt-4">Past invitations</div>
          <div className="space-y-2">
            {groups.past.map(row => <InvitationRow key={row.invitationId} row={row} onReview={onReview} />)}
          </div>
        </div>
      )}
      {state.items.length < state.total && (
        <div className="pt-2">
          {state.loadMoreError && <StatusNotice tone="warning" icon={false} className="mb-2">{state.loadMoreError}</StatusNotice>}
          <Button variant="secondary" disabled={state.loadingMore} onClick={onLoadMore}>
            {state.loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </>
  );
}

/**
 * KS001 Upgrade Phase 4 final convergence (Section 3/4) — the lightweight first-party Invitations
 * surface. Reached from Home's "View all invitations" doorway and from `OPEN_INVITATIONS` notifications
 * (Section 5). Every row's primary action is "Review invitation" (Section 6 — review-first, never
 * Accept/Join now/Confirm from a list); selecting a row hands off to the SAME existing
 * `RecipientExperience(invitationId)` Join core via `onReview`, never a second Join implementation here.
 */
export function InvitationInboxExperience({ controller, onLeave, onReview }: {
  controller: InvitationInboxController;
  onLeave: () => void;
  onReview: (invitationId: string) => void;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useEffect(() => { void controller.load(); }, [controller]);

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <header className="border-b border-cream-200 bg-cream-50/90 px-4 md:px-8 py-3 flex items-center justify-between">
        <button onClick={onLeave} className="inline-flex items-center gap-1.5 text-sm text-sand-600 hover:text-forest-700">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <img src={securepayWordmark} alt="SecurePay" className="h-7 w-auto" />
      </header>
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4 w-full">
        <PageHeader title="Invitations" description="What has been proposed to you, and what still needs your response." />
        <InvitationInboxBody state={state} onReview={onReview} onLoadMore={() => void controller.loadMore()} />
      </div>
    </div>
  );
}
