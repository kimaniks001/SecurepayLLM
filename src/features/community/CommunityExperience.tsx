import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { NavBar } from '../../components/NavBar';
import { CommunityHome } from '../../components/CommunityHome';
import { CommunityObjectDetail } from '../../components/CommunityObjectDetail';
import { CommunityCreatePanel } from '../../components/CommunityCreatePanel';
import { ErrorStateCard } from '../../components/ErrorState';
import { StatusNotice } from '../../components/dna/StatusNotice';
import type { StoreGateway } from '../../api/securepay/store';
import type { CommunityGateway } from '../../api/securepay/community';
import type { AppView, ErrorStateResponse } from '../../types';
import { createCommunityController, errorText, REAL_COMPOSE_TYPES, type MembershipUiState } from './controller';
import { storeResultToCommunityObject, parseStoreOfferCommunityObjectId, realObjectToCommunityObject, combineRealResponses, myActiveHelpResponseId } from './view';

type Gateway = Pick<StoreGateway, 'search'>;

function errorView(message: string): ErrorStateResponse {
  return { type: 'ERROR_STATE', title: 'SecurePay could not load Community', text: message, primaryLabel: 'Try again', primaryValue: 'retry' };
}

/**
 * Phase 6 (Community Life) Slice 2 -- The Trust Project banner. Shows a truthful, restrained
 * membership state -- never a giant manifesto, never fake feed data, never implying membership
 * before it is real. Store search below remains available regardless of membership (Store keeps its
 * own, separate public authority) -- only the real Community feed/composer are membership-gated.
 */
function TrustProjectBanner({
  membership, onAccept, onDecline, onOpenInvite, principlesOpen, onTogglePrinciples, principles, principlesLoading,
}: {
  membership: MembershipUiState;
  onAccept: () => void;
  onDecline: () => void;
  onOpenInvite: () => void;
  principlesOpen: boolean;
  onTogglePrinciples: () => void;
  principles: { number: number; title: string; text: string }[];
  principlesLoading: boolean;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[0.68rem] uppercase tracking-wide text-forest-600 font-semibold">The Trust Project</p>
          <p className="text-[0.78rem] text-sand-500">A community of people choosing to trade fairly.</p>
        </div>
        <div className="flex items-center gap-3">
          {membership.kind === 'active' && (
            <button onClick={onOpenInvite} className="text-[0.75rem] font-medium text-forest-600 hover:text-forest-700">
              Invite someone
            </button>
          )}
          <button onClick={onTogglePrinciples} className="text-[0.75rem] font-medium text-forest-600 hover:text-forest-700">
            {principlesOpen ? 'Hide' : 'Our 12 Principles'}
          </button>
        </div>
      </div>

      {principlesOpen && (
        <div className="mt-3 rounded-xl border border-cream-200 bg-white px-4 py-3 max-h-64 overflow-y-auto space-y-2">
          {principlesLoading && <p className="text-[0.75rem] text-sand-500">Loading…</p>}
          {principles.map(p => (
            <div key={p.number} className="text-[0.78rem]">
              <span className="font-medium text-forest-800">{p.number}. {p.title}</span>
              <p className="text-sand-600">{p.text}</p>
            </div>
          ))}
        </div>
      )}

      {membership.kind === 'signed-out' && (
        <div className="mt-3 rounded-xl border border-cream-200 bg-white px-4 py-3">
          <p className="text-[0.8rem] text-forest-800">Sign in to see what the community is sharing.</p>
        </div>
      )}
      {membership.kind === 'none' && (
        <div className="mt-3 rounded-xl border border-cream-200 bg-white px-4 py-3">
          <p className="text-[0.8rem] text-forest-800">
            The Trust Project is invitation-based. You'll see Community posts once someone already here invites you.
          </p>
        </div>
      )}
      {membership.kind === 'invited' && (
        <div className="mt-3 rounded-xl border border-forest-200 bg-forest-50/40 px-4 py-4 space-y-3">
          <p className="text-[0.82rem] text-forest-800">
            {membership.membership.invitedByDisplayName ?? 'Someone in the community'} has invited you to join The Trust Project.
            Joining does not create any commercial obligation, and does not make you party to anyone else's Agreement.
            You remain independent — the community is guided by the 12 Principles above.
          </p>
          <div className="flex gap-2">
            <button onClick={onAccept} className="rounded-xl bg-forest-600 text-cream-50 text-[0.82rem] font-medium px-4 py-2 hover:bg-forest-700 transition-colors">
              Accept
            </button>
            <button onClick={onDecline} className="rounded-xl border border-cream-200 text-forest-700 text-[0.82rem] font-medium px-4 py-2 hover:bg-cream-50 transition-colors">
              Decline
            </button>
          </div>
        </div>
      )}
      {membership.kind === 'declined' && (
        <div className="mt-3 rounded-xl border border-cream-200 bg-white px-4 py-3">
          <p className="text-[0.8rem] text-sand-600">You declined this invitation.</p>
        </div>
      )}
      {membership.kind === 'revoked' && (
        <div className="mt-3 rounded-xl border border-cream-200 bg-white px-4 py-3">
          <p className="text-[0.8rem] text-sand-600">Your Trust Project membership is no longer active.</p>
        </div>
      )}
    </div>
  );
}

/**
 * The Trust Project (Slice 2): real membership (invite/accept/decline), real Conversation & Help
 * (reply/"I can help"), layered onto Slice 1's real Community objects. Store-offer search (Phase 10)
 * remains unchanged and available regardless of membership state -- Store keeps its own, separate
 * public authority; only the real Community feed/composer/detail are membership-gated, and the
 * backend independently enforces that gate regardless of what this component shows.
 */
export function CommunityExperience({ gateway, communityGateway, trustedMediaOrigin, onNavigate, onOpenStoreOffer, onOpenCircle }: {
  gateway: Gateway;
  communityGateway: CommunityGateway;
  trustedMediaOrigin: string | null;
  onNavigate: (view: AppView) => void;
  onOpenStoreOffer: (canonicalKsNumber: string, offerId: string) => void;
  onOpenCircle: () => void;
}) {
  const [controller] = useState(() => createCommunityController(gateway, communityGateway, trustedMediaOrigin));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  useEffect(() => {
    void controller.enter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // See the identical, more consequential fix in features/store/StoreExperience.tsx: a boolean
  // "skip the first run" ref is not safe under React 18 StrictMode's dev-only mount replay, which
  // re-invokes this effect twice on initial mount and would otherwise arm a real 400ms re-search timer.
  const previousQuery = useRef(state.query);
  useEffect(() => {
    if (previousQuery.current === state.query) return;
    previousQuery.current = state.query;
    const handle = setTimeout(() => void controller.submitSearch(), 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.query]);

  const isActiveMember = state.membership.kind === 'active';
  const realObjects = isActiveMember && state.feed.status === 'ready' ? state.feed.data.map(o => realObjectToCommunityObject(o)) : [];
  const storeObjects = state.search.status === 'ready' ? state.search.data.map(storeResultToCommunityObject) : [];
  const objects = [...realObjects, ...storeObjects];
  const selectedStore = state.selectedObjectId && !state.selectedRealObject
    ? (state.search.status === 'ready' ? state.search.data.find(r => storeResultToCommunityObject(r).id === state.selectedObjectId) : undefined)
    : undefined;

  const banner = (
    <TrustProjectBanner
      membership={state.membership}
      onAccept={() => void controller.acceptInvitation()}
      onDecline={() => void controller.declineInvitation()}
      onOpenInvite={() => controller.openInvite()}
      principlesOpen={state.principlesOpen}
      onTogglePrinciples={() => void controller.togglePrinciples()}
      principles={state.principles.status === 'ready' ? state.principles.data : []}
      principlesLoading={state.principles.status === 'loading'}
    />
  );

  let body: React.ReactNode;
  if (state.view === 'compose') {
    body = (
      <CommunityCreatePanel
        options={REAL_COMPOSE_TYPES}
        objectType={state.draft.objectType}
        title={state.draft.title}
        body={state.draft.body}
        locationLabel={state.draft.locationLabel}
        submitting={state.draft.submitting}
        error={state.draft.error}
        onSelectType={type => controller.setComposeType(type)}
        onTitleChange={value => controller.setComposeField('title', value)}
        onBodyChange={value => controller.setComposeField('body', value)}
        onLocationChange={value => controller.setComposeField('locationLabel', value)}
        onSubmit={() => void controller.submitCompose()}
        onCancel={() => controller.cancelComposer()}
      />
    );
  } else if (state.view === 'object' && state.selectedRealObject) {
    const responses = combineRealResponses(
      state.objectReplies.status === 'ready' ? state.objectReplies.data : [],
      state.objectHelp.status === 'ready' ? state.objectHelp.data : [],
    );
    const object = realObjectToCommunityObject(state.selectedRealObject, responses);
    const isOwn = state.ownObjectIds.has(state.selectedRealObject.id);
    // Correction (Slice 2 pre-merge): whether the caller already has an ACTIVE "I can help" signal,
    // and which response id a withdrawal targets, is derived directly from the real, server-returned
    // help list -- never from session-scoped creation tracking -- so it is correct even immediately
    // after a page refresh/controller reload.
    const activeHelpResponseId = state.objectHelp.status === 'ready' ? myActiveHelpResponseId(state.objectHelp.data) : null;
    body = (
      <CommunityObjectDetail
        object={object}
        offer={null}
        onBack={() => controller.backToHome()}
        onICanHelp={() => controller.showNotice('This area is not available yet.')}
        onDiscuss={() => controller.showNotice('This area is not available yet.')}
        onViewOffer={() => {}}
        onToTrade={() => controller.showNotice('This area is not available yet.')}
        onClose={isOwn ? () => void controller.closeObject(object.id) : undefined}
        realHelp={{
          offered: activeHelpResponseId !== null,
          offering: state.helpOffering,
          error: state.helpError,
          onOffer: () => void controller.offerHelp(),
          onWithdraw: () => { if (activeHelpResponseId) void controller.withdrawHelp(activeHelpResponseId); },
        }}
        realReply={{
          body: state.replyDraft.body,
          submitting: state.replyDraft.submitting,
          error: state.replyDraft.error,
          onBodyChange: value => controller.setReplyBody(value),
          onSubmit: () => void controller.submitReply(),
        }}
        onWithdrawReply={id => void controller.withdrawReply(id)}
      />
    );
  } else if (state.view === 'object' && selectedStore) {
    const object = storeResultToCommunityObject(selectedStore);
    body = (
      <CommunityObjectDetail
        object={object}
        offer={selectedStore.offer}
        onBack={() => controller.backToHome()}
        onICanHelp={() => controller.showNotice('This area is not available yet.')}
        onDiscuss={() => controller.showNotice('This area is not available yet.')}
        onViewOffer={() => {
          const ids = parseStoreOfferCommunityObjectId(object.id);
          if (ids) onOpenStoreOffer(ids.canonicalKsNumber, ids.offerId);
        }}
        onToTrade={() => controller.showNotice('This area is not available yet.')}
      />
    );
  } else if (state.search.status === 'error' && state.feed.status !== 'ready' && objects.length === 0) {
    body = (
      <>
        {banner}
        <div className="p-6"><ErrorStateCard data={errorView(errorText(state.search.error))} onChoice={() => void controller.submitSearch()} /></div>
      </>
    );
  } else {
    body = (
      <>
        {banner}
        <CommunityHome
          query={state.query}
          onQueryChange={q => controller.setQuery(q)}
          objects={objects}
          people={[]}
          businesses={[]}
          onOpenObject={id => void controller.openObject(id)}
          onOpenPerson={() => {}}
          onOpenBusiness={() => {}}
          onCreate={() => (isActiveMember ? controller.openComposer() : controller.showNotice('Join The Trust Project to share with the community.'))}
          onStartConversation={() => onNavigate('signed-in')}
          onOpenCircles={onOpenCircle}
          onOpenEcosystem={() => onNavigate('ecosystem')}
          storeSearchStatus={state.search.status === 'idle' ? undefined : state.search.status === 'loading' ? 'loading' : state.search.status === 'error' ? 'error' : 'ready'}
          storeSearchErrorText={state.search.status === 'error' ? errorText(state.search.error) : null}
          // No named-Circle/group authority exists on the backend (task: "Remove fake named-Circle copy
          // from real Community") — never name fictitious Circles or imply membership in one.
          circlesEntryLabel="Your Circle profile"
          circlesEntryDescription="See your real network activity — referrals, agreements brought in, and growth credit. Not a named Circle or group."
          // Phase 6 -- the real feed (Questions/Needs/Opportunities/Work Stories/Discussions) is shown
          // only to an ACTIVE Trust Project member; the search box still searches Store offers only
          // (real full-text Community search is a later slice) -- copy says exactly that, never more.
          searchPlaceholder="Search store offers by category or location..."
          noResultsMessage={`No store offers found for "${state.query}".`}
        />
      </>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <NavBar view={'community' as AppView} onNavigate={onNavigate} />
      {state.notice && (
        <div className="px-4 py-2">
          <StatusNotice tone="info" icon={false}>
            {state.notice} <button onClick={() => controller.dismissNotice()} className="underline">Dismiss</button>
          </StatusNotice>
        </div>
      )}
      {state.inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/30 backdrop-blur-sm" onClick={() => controller.cancelInvite()}>
          <div className="w-full max-w-sm mx-4 rounded-2xl bg-white shadow-deliberate px-5 py-5" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-base text-forest-800 mb-1">Invite someone</h2>
            <p className="text-[0.75rem] text-sand-500 mb-3">
              Invite someone you believe would add something useful to a community that chooses to trade fairly.
            </p>
            <input
              type="text"
              value={state.inviteDraft.ksNumber}
              onChange={e => controller.setInviteKsNumber(e.target.value)}
              placeholder="Their KS Number (e.g. KS123)"
              className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-[0.85rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300 mb-2"
            />
            {state.inviteDraft.error && <p role="alert" className="text-[0.75rem] text-red-600 mb-2">{state.inviteDraft.error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => void controller.submitInvite()}
                disabled={state.inviteDraft.submitting}
                className="flex-1 rounded-xl bg-forest-600 text-cream-50 text-[0.82rem] font-medium py-2.5 hover:bg-forest-700 transition-colors disabled:opacity-60"
              >
                {state.inviteDraft.submitting ? 'Sending…' : 'Send invitation'}
              </button>
              <button onClick={() => controller.cancelInvite()} className="rounded-xl border border-cream-200 text-forest-700 text-[0.82rem] font-medium px-4 py-2.5 hover:bg-cream-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">{body}</div>
    </div>
  );
}
