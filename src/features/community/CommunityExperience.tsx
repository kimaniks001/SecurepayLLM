import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import { CommunityHome } from '../../components/CommunityHome';
import { CommunityObjectDetail } from '../../components/CommunityObjectDetail';
import { CommunityCreatePanel } from '../../components/CommunityCreatePanel';
import { ErrorStateCard } from '../../components/ErrorState';
import { StatusNotice } from '../../components/dna/StatusNotice';
import type { StoreGateway } from '../../api/securepay/store';
import type { CommunityGateway } from '../../api/securepay/community';
import type { CircleResponse, CommunityObjectResponse } from '../../api/securepay/community/dto';
import type { AppView, ErrorStateResponse } from '../../types';
import {
  createCommunityController, errorText, REAL_COMPOSE_TYPES,
  type CommunityHomeTab, type CircleMembershipMode, type MembershipUiState,
} from './controller';
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
 * Phase 6 (Community Life) Slice 3 -- distinguishes the three Community Home sections named in the
 * product grammar: Community LIVE (the wider town square), Your Circles (the smaller spaces this
 * person belongs to), and Discover Circles. Only shown to an ACTIVE Trust Project member -- Circles
 * require that membership just as Community LIVE does.
 */
function CommunityHomeTabs({ tab, onSelect }: { tab: CommunityHomeTab; onSelect: (tab: CommunityHomeTab) => void }) {
  const tabs: { value: CommunityHomeTab; label: string }[] = [
    { value: 'live', label: 'Community LIVE' },
    { value: 'circles', label: 'Your Circles' },
    { value: 'discover', label: 'Discover Circles' },
  ];
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-3 flex gap-1.5">
      {tabs.map(t => (
        <button
          key={t.value}
          onClick={() => onSelect(t.value)}
          className={`text-[0.78rem] font-medium rounded-full px-3 py-1.5 transition-colors ${
            tab === t.value ? 'bg-forest-600 text-cream-50' : 'text-forest-700 bg-cream-50 hover:bg-cream-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

const CIRCLE_MODE_LABEL: Record<CircleResponse['membershipMode'], string> = {
  OPEN: 'Open — anyone may join',
  REQUEST_TO_JOIN: 'Request to join',
  INVITE_ONLY: 'Invite only',
};

/** A Circle card shows only discovery-safe facts -- never a fabricated activity/trust score. */
function CircleCard({ circle, onOpen }: { circle: CircleResponse; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl border border-cream-200 bg-white px-4 py-3.5 hover:border-forest-300 transition-colors animate-quiet-in"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-[0.95rem] text-forest-800 font-medium leading-snug">{circle.name}</h3>
        <span className="text-[0.68rem] text-sand-500 shrink-0">{circle.memberCount} member{circle.memberCount === 1 ? '' : 's'}</span>
      </div>
      <p className="text-[0.8rem] text-sand-600 mt-1 line-clamp-2">{circle.purpose}</p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="text-[0.68rem] font-medium text-forest-600 bg-forest-50 rounded-full px-2 py-0.5">
          {CIRCLE_MODE_LABEL[circle.membershipMode]}
        </span>
        {circle.categoryLabel && <span className="text-[0.68rem] text-sand-500">{circle.categoryLabel}</span>}
        {circle.locationLabel && <span className="text-[0.68rem] text-sand-500">{circle.locationLabel}</span>}
      </div>
    </button>
  );
}

/**
 * "Your Circles" -- the smaller spaces this person actually belongs to (real backend data, `circles.mine()`).
 */
function YourCirclesView({
  circles, loading, error, onOpen, onCreate, onRetry,
}: {
  circles: CircleResponse[];
  loading: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg text-forest-800 font-medium">Your Circles</h2>
            <p className="text-[0.8rem] text-sand-500">Smaller spaces inside The Trust Project for people with something useful in common.</p>
          </div>
          <button onClick={onCreate} className="text-[0.78rem] font-medium text-forest-600 hover:text-forest-700 shrink-0">
            + Create a Circle
          </button>
        </div>
        {loading && <p className="text-[0.8rem] text-sand-500">Loading…</p>}
        {error && <ErrorStateCard data={{ type: 'ERROR_STATE', title: 'SecurePay could not load your Circles', text: error, primaryLabel: 'Try again', primaryValue: 'retry' }} onChoice={onRetry} />}
        {!loading && !error && circles.length === 0 && (
          <p className="text-[0.82rem] text-sand-500 py-6 text-center">
            Find a Circle around a place, skill, profession, interest or problem worth working on.
          </p>
        )}
        {circles.map(c => <CircleCard key={c.id} circle={c} onOpen={() => onOpen(c.id)} />)}
      </div>
    </div>
  );
}

function DiscoverCirclesView({
  circles, loading, error, onOpen, onRetry,
}: {
  circles: CircleResponse[];
  loading: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-5 space-y-3">
        <h2 className="font-display text-lg text-forest-800 font-medium">Discover Circles</h2>
        <p className="text-[0.8rem] text-sand-500">
          Every ACTIVE Circle is listed here, deterministically by recency — never ranked, never a "recommended for you."
        </p>
        {loading && <p className="text-[0.8rem] text-sand-500">Loading…</p>}
        {error && <ErrorStateCard data={{ type: 'ERROR_STATE', title: 'SecurePay could not load Circles', text: error, primaryLabel: 'Try again', primaryValue: 'retry' }} onChoice={onRetry} />}
        {!loading && !error && circles.length === 0 && (
          <p className="text-[0.82rem] text-sand-500 py-6 text-center">No Circles exist yet.</p>
        )}
        {circles.map(c => <CircleCard key={c.id} circle={c} onOpen={() => onOpen(c.id)} />)}
      </div>
    </div>
  );
}

/**
 * Circle detail: name/purpose, the caller's own truthful membership state and action, and (only for
 * an ACTIVE member/owner) the Circle's own scoped feed and composer. A private non-member never sees
 * the feed -- it is never even fetched for them (see controller.ts `openCircle`).
 */
function CircleDetailPanel({
  circle, membershipStatus, isOwner, invitedByDisplayName, joinSubmitting, joinError,
  onJoin, onRequestToJoin, onAccept, onDecline, onLeave, onBack,
  objects, objectsLoading, onOpenObject, onCompose,
}: {
  circle: CircleResponse;
  membershipStatus: string | null;
  isOwner: boolean;
  invitedByDisplayName: string | null;
  joinSubmitting: boolean;
  joinError: string | null;
  onJoin: () => void;
  onRequestToJoin: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onLeave: () => void;
  onBack: () => void;
  objects: CommunityObjectResponse[];
  objectsLoading: boolean;
  onOpenObject: (id: string) => void;
  onCompose: () => void;
}) {
  const isMember = membershipStatus === 'ACTIVE' || isOwner;
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Your Circles
        </button>
      </div>
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
          <h1 className="font-display text-lg text-forest-800 font-medium">{circle.name}</h1>
          <p className="text-[0.85rem] text-forest-800 leading-relaxed mt-1.5">{circle.purpose}</p>
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="text-[0.68rem] font-medium text-forest-600 bg-forest-50 rounded-full px-2 py-0.5">
              {CIRCLE_MODE_LABEL[circle.membershipMode]}
            </span>
            <span className="text-[0.68rem] text-sand-500">{circle.memberCount} member{circle.memberCount === 1 ? '' : 's'}</span>
          </div>
        </div>

        {isOwner && (
          <p className="text-[0.75rem] text-sand-500 px-1">This is one of your Circles — you are its steward.</p>
        )}
        {!isOwner && membershipStatus === 'ACTIVE' && (
          <div className="flex items-center justify-between">
            <p className="text-[0.75rem] text-sand-500">This is one of your Circles.</p>
            <button onClick={onLeave} className="text-[0.75rem] text-sand-500 hover:text-forest-600">Leave Circle</button>
          </div>
        )}
        {membershipStatus === 'INVITED' && (
          <div className="rounded-xl border border-forest-200 bg-forest-50/40 px-4 py-3.5 space-y-2">
            <p className="text-[0.8rem] text-forest-800">
              {invitedByDisplayName ?? 'A Circle owner'} invited you to join this Circle.
            </p>
            <div className="flex gap-2">
              <button onClick={onAccept} className="rounded-xl bg-forest-600 text-cream-50 text-[0.8rem] font-medium px-4 py-2 hover:bg-forest-700 transition-colors">Accept</button>
              <button onClick={onDecline} className="rounded-xl border border-cream-200 text-forest-700 text-[0.8rem] font-medium px-4 py-2 hover:bg-cream-50 transition-colors">Decline</button>
            </div>
          </div>
        )}
        {membershipStatus === 'REQUESTED' && (
          <p className="text-[0.8rem] text-sand-600">Your request to join is waiting for the owner's review.</p>
        )}
        {!isOwner && (membershipStatus === null || membershipStatus === 'DECLINED' || membershipStatus === 'LEFT' || membershipStatus === 'REMOVED') && (
          <div className="space-y-2">
            {circle.membershipMode === 'OPEN' && (
              <button
                onClick={onJoin}
                disabled={joinSubmitting}
                className="w-full rounded-xl bg-forest-600 text-cream-50 text-[0.85rem] font-medium py-2.5 hover:bg-forest-700 transition-colors disabled:opacity-60"
              >
                {joinSubmitting ? 'Joining…' : 'Join'}
              </button>
            )}
            {circle.membershipMode === 'REQUEST_TO_JOIN' && (
              <button
                onClick={onRequestToJoin}
                disabled={joinSubmitting}
                className="w-full rounded-xl bg-forest-600 text-cream-50 text-[0.85rem] font-medium py-2.5 hover:bg-forest-700 transition-colors disabled:opacity-60"
              >
                {joinSubmitting ? 'Requesting…' : 'Request to join'}
              </button>
            )}
            {circle.membershipMode === 'INVITE_ONLY' && (
              <p className="text-[0.8rem] text-sand-600">
                Join this Circle to see and take part in its conversations. This Circle is invite-only — an existing member must invite you.
              </p>
            )}
            {joinError && <p role="alert" className="text-[0.75rem] text-red-600">{joinError}</p>}
          </div>
        )}

        {isMember && (
          <div className="space-y-3 pt-2 border-t border-cream-100">
            <div className="flex items-center justify-between">
              <h2 className="text-[0.75rem] font-medium text-sand-500 uppercase tracking-wide">Circle feed</h2>
              <button onClick={onCompose} className="text-[0.78rem] font-medium text-forest-600 hover:text-forest-700">+ Share</button>
            </div>
            {objectsLoading && <p className="text-[0.8rem] text-sand-500">Loading…</p>}
            {!objectsLoading && objects.length === 0 && (
              <p className="text-[0.8rem] text-sand-500 py-4 text-center">Nothing shared here yet.</p>
            )}
            <div className="space-y-2">
              {objects.map(o => (
                <button
                  key={o.id}
                  onClick={() => onOpenObject(o.id)}
                  className="w-full text-left rounded-xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-colors"
                >
                  <div className="text-[0.85rem] font-medium text-forest-800">{o.title}</div>
                  <p className="text-[0.78rem] text-sand-600 mt-0.5 line-clamp-2">{o.body}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The Trust Project (Slice 2): real membership (invite/accept/decline), real Conversation & Help
 * (reply/"I can help"), layered onto Slice 1's real Community objects. Store-offer search (Phase 10)
 * remains unchanged and available regardless of membership state -- Store keeps its own, separate
 * public authority; only the real Community feed/composer/detail are membership-gated, and the
 * backend independently enforces that gate regardless of what this component shows.
 *
 * <p>Slice 3 layers named Circles ("the homes inside The Trust Project") onto this: Community LIVE
 * (the wider town square) remains the default tab; Your Circles / Discover Circles are real backend
 * data, membership-gated exactly like LIVE. `onOpenCircle` below remains the OLD, unrelated per-
 * identity referral/growth "Circle profile" entry point (`CircleExperience`) -- untouched, unrenamed,
 * and never confused with these new named Circles.
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
  if (state.view === 'circleCompose') {
    body = (
      <CommunityCreatePanel
        options={REAL_COMPOSE_TYPES}
        objectType={state.circleComposeDraft.objectType}
        title={state.circleComposeDraft.title}
        body={state.circleComposeDraft.body}
        locationLabel={state.circleComposeDraft.locationLabel}
        submitting={state.circleComposeDraft.submitting}
        error={state.circleComposeDraft.error}
        onSelectType={type => controller.setCircleComposeType(type)}
        onTitleChange={value => controller.setCircleComposeField('title', value)}
        onBodyChange={value => controller.setCircleComposeField('body', value)}
        onLocationChange={value => controller.setCircleComposeField('locationLabel', value)}
        onSubmit={() => void controller.submitCircleCompose()}
        onCancel={() => controller.cancelCircleComposer()}
      />
    );
  } else if (state.view === 'circleDetail' && state.selectedCircle) {
    const membership = state.circleMembership.status === 'ready' ? state.circleMembership.data : null;
    body = (
      <CircleDetailPanel
        circle={state.selectedCircle}
        membershipStatus={membership?.status ?? null}
        isOwner={membership?.isOwner ?? false}
        invitedByDisplayName={membership?.invitedByDisplayName ?? null}
        joinSubmitting={state.circleJoinSubmitting}
        joinError={state.circleJoinError}
        onJoin={() => void controller.joinCircle()}
        onRequestToJoin={() => void controller.requestToJoinCircle()}
        onAccept={() => void controller.acceptCircleInvitation()}
        onDecline={() => void controller.declineCircleInvitation()}
        onLeave={() => void controller.leaveCircle()}
        onBack={() => controller.backToCommunityHome()}
        objects={state.circleObjects.status === 'ready' ? state.circleObjects.data : []}
        objectsLoading={state.circleObjects.status === 'loading'}
        onOpenObject={id => void controller.openCircleObject(id)}
        onCompose={() => controller.openCircleComposer()}
      />
    );
  } else if (state.view === 'compose') {
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
    // A Circle-scoped object is never in `ownObjectIds` (LIVE-only, from `mine()`) -- author-only
    // Close for a Circle-scoped object is deferred; the caller may still reply/help/withdraw normally.
    const isOwn = state.selectedCircleId === null && state.ownObjectIds.has(state.selectedRealObject.id);
    // Correction (Slice 2 pre-merge): whether the caller already has an ACTIVE "I can help" signal,
    // and which response id a withdrawal targets, is derived directly from the real, server-returned
    // help list -- never from session-scoped creation tracking -- so it is correct even immediately
    // after a page refresh/controller reload.
    const activeHelpResponseId = state.objectHelp.status === 'ready' ? myActiveHelpResponseId(state.objectHelp.data) : null;
    body = (
      <CommunityObjectDetail
        object={object}
        offer={null}
        onBack={() => (state.selectedCircleId ? controller.leaveCircleObjectDetail() : controller.backToHome())}
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
  } else if (state.communityTab === 'live' && state.search.status === 'error' && state.feed.status !== 'ready' && objects.length === 0) {
    body = (
      <>
        {banner}
        <div className="p-6"><ErrorStateCard data={errorView(errorText(state.search.error))} onChoice={() => void controller.submitSearch()} /></div>
      </>
    );
  } else if (state.communityTab === 'circles') {
    body = (
      <>
        {banner}
        {isActiveMember && <CommunityHomeTabs tab={state.communityTab} onSelect={tab => void controller.showCommunityTab(tab)} />}
        <YourCirclesView
          circles={state.myCircles.status === 'ready' ? state.myCircles.data : []}
          loading={state.myCircles.status === 'loading'}
          error={state.myCircles.status === 'error' ? errorText(state.myCircles.error) : null}
          onOpen={id => void controller.openCircle(id)}
          onCreate={() => controller.openCreateCircle()}
          onRetry={() => void controller.showCommunityTab('circles')}
        />
      </>
    );
  } else if (state.communityTab === 'discover') {
    body = (
      <>
        {banner}
        {isActiveMember && <CommunityHomeTabs tab={state.communityTab} onSelect={tab => void controller.showCommunityTab(tab)} />}
        <DiscoverCirclesView
          circles={state.discoverCircles.status === 'ready' ? state.discoverCircles.data : []}
          loading={state.discoverCircles.status === 'loading'}
          error={state.discoverCircles.status === 'error' ? errorText(state.discoverCircles.error) : null}
          onOpen={id => void controller.openCircle(id)}
          onRetry={() => void controller.showCommunityTab('discover')}
        />
      </>
    );
  } else {
    body = (
      <>
        {banner}
        {isActiveMember && <CommunityHomeTabs tab={state.communityTab} onSelect={tab => void controller.showCommunityTab(tab)} />}
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
              readOnly={state.inviteDraft.attemptedTargetKsNumber !== null}
              placeholder="Their KS Number (e.g. KS123)"
              className={`w-full rounded-xl border border-cream-200 px-3 py-2.5 text-[0.85rem] placeholder:text-sand-400 focus:outline-none focus:border-forest-300 mb-2 ${
                state.inviteDraft.attemptedTargetKsNumber !== null ? 'bg-cream-100 text-sand-500' : 'bg-white text-forest-800'
              }`}
            />
            {/* Correction (Slice 2 pre-merge, second pass): once a remote submission has been
                attempted, this draft's key is permanently bound to that invitee -- the field locks
                and a retry (or an explicit cancel to target someone else) are the only options. */}
            {state.inviteDraft.attemptedTargetKsNumber !== null && (
              <p className="text-[0.72rem] text-sand-500 mb-2">Retry this invitation, or cancel to invite someone else.</p>
            )}
            {state.inviteDraft.error && <p role="alert" className="text-[0.75rem] text-red-600 mb-2">{state.inviteDraft.error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => void controller.submitInvite()}
                disabled={state.inviteDraft.submitting}
                className="flex-1 rounded-xl bg-forest-600 text-cream-50 text-[0.82rem] font-medium py-2.5 hover:bg-forest-700 transition-colors disabled:opacity-60"
              >
                {state.inviteDraft.submitting
                  ? 'Sending…'
                  : state.inviteDraft.attemptedTargetKsNumber !== null ? 'Retry invitation' : 'Send invitation'}
              </button>
              <button onClick={() => controller.cancelInvite()} className="rounded-xl border border-cream-200 text-forest-700 text-[0.82rem] font-medium px-4 py-2.5 hover:bg-cream-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {state.createCircleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/30 backdrop-blur-sm" onClick={() => controller.cancelCreateCircle()}>
          <div className="w-full max-w-sm mx-4 rounded-2xl bg-white shadow-deliberate px-5 py-5" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-base text-forest-800 mb-1">Create a Circle</h2>
            <p className="text-[0.75rem] text-sand-500 mb-3">
              A smaller space inside The Trust Project for people with something useful in common. Not a partnership, joint
              venture, or commercial alliance — members remain fully independent.
            </p>
            <input
              type="text"
              value={state.createCircleDraft.name}
              onChange={e => controller.setCreateCircleField('name', e.target.value)}
              placeholder="Circle name"
              className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-[0.85rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300 mb-2"
            />
            <textarea
              value={state.createCircleDraft.purpose}
              onChange={e => controller.setCreateCircleField('purpose', e.target.value)}
              placeholder="What is this Circle for?"
              rows={2}
              className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-[0.85rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300 mb-2 resize-none"
            />
            <div className="flex gap-1.5 mb-3">
              {(['OPEN', 'REQUEST_TO_JOIN', 'INVITE_ONLY'] as CircleMembershipMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => controller.setCreateCircleMode(mode)}
                  className={`flex-1 text-[0.7rem] font-medium rounded-lg px-2 py-1.5 transition-colors ${
                    state.createCircleDraft.membershipMode === mode ? 'bg-forest-600 text-cream-50' : 'bg-cream-50 text-forest-700 hover:bg-cream-100'
                  }`}
                >
                  {CIRCLE_MODE_LABEL[mode]}
                </button>
              ))}
            </div>
            {state.createCircleDraft.error && <p role="alert" className="text-[0.75rem] text-red-600 mb-2">{state.createCircleDraft.error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => void controller.submitCreateCircle()}
                disabled={state.createCircleDraft.submitting}
                className="flex-1 rounded-xl bg-forest-600 text-cream-50 text-[0.82rem] font-medium py-2.5 hover:bg-forest-700 transition-colors disabled:opacity-60"
              >
                {state.createCircleDraft.submitting ? 'Creating…' : 'Create Circle'}
              </button>
              <button onClick={() => controller.cancelCreateCircle()} className="rounded-xl border border-cream-200 text-forest-700 text-[0.82rem] font-medium px-4 py-2.5 hover:bg-cream-50 transition-colors">
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
