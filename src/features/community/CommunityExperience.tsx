import { ShareInvitation } from '../join/ShareInvitation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import { CommunityHome } from '../../components/CommunityHome';
import { CommunityObjectDetail } from '../../components/CommunityObjectDetail';
import { CommunityCreatePanel } from '../../components/CommunityCreatePanel';
import { ErrorStateCard } from '../../components/ErrorState';
import { StatusNotice } from '../../components/dna/StatusNotice';
import type { StoreGateway } from '../../api/securepay/store';
import type { PublicStoreView } from '../../api/securepay/store/dto';
import type { CommunityGateway } from '../../api/securepay/community';
import type { ApprenticeshipProjectDto, CircleResponse, CirclePendingInvitationView, CommunityEventDto, CommunityHelpResponseView, CommunityObjectResponse, CommunityProjectDto, CommunityServiceOpportunityDto } from '../../api/securepay/community/dto';
import type { DiscoveryGateway } from '../../api/securepay/discovery';
import type { DiscoveryResults, DiscoveryScope, PublicDirectoryIdentityType, PublicProfileResponse } from '../../api/securepay/discovery/dto';
import { ApiError, type RemoteState } from '../../api/securepay/http';
import type { AppView, ErrorStateResponse } from '../../types';
import type { CommunitySourceFact } from '../agent/controller';
import {
  createCommunityController, errorText, REAL_COMPOSE_TYPES,
  type CommunityHomeTab, type CircleMembershipMode, type CircleVisibility, type MembershipUiState,
} from './controller';
import { realObjectToCommunityObject, combineRealResponses, myActiveHelpResponseId } from './view';
import { useAppNavPadding } from '../public/publicShell';
import { TrustProjectImpactHome } from './TrustProjectImpactHome';
import { CircleBoard } from './CircleBoard';

type Gateway = Pick<StoreGateway, 'search' | 'store'>;

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
  membership, onJoin, onDecline, onOpenInvite, principlesOpen, onTogglePrinciples, principles, principlesLoading,
}: {
  membership: MembershipUiState;
  /** Public Experience Convergence Phase 4 -- the Join page (direct Join, or accepting an invitation). */
  onJoin: () => void;
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
          <p className="text-[0.78rem] text-sand-600">A community of people choosing to trade fairly.</p>
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
          <p className="text-[0.8rem] text-forest-800">Sign in or join The Trust Project to take part in Community.</p>
        </div>
      )}
      {membership.kind === 'unknown' && (
        <div className="mt-3 rounded-xl border border-cream-200 bg-white px-4 py-3">
          <p className="text-[0.8rem] text-sand-600">SecurePay couldn’t check your Trust Project membership just now.</p>
        </div>
      )}
      {membership.kind === 'none' && (
        <div className="mt-3 rounded-xl border border-cream-200 bg-white px-4 py-3 space-y-2">
          <p className="text-[0.8rem] text-forest-800">You’re not a member of The Trust Project yet.</p>
          <button onClick={onJoin} className="min-h-11 rounded-xl bg-forest-600 text-cream-50 text-[0.82rem] font-medium px-4 py-2 hover:bg-forest-700 transition-colors">
            Join The Trust Project
          </button>
        </div>
      )}
      {membership.kind === 'invited' && (
        <div className="mt-3 rounded-xl border border-forest-200 bg-forest-50/40 px-4 py-4 space-y-3">
          <p className="text-[0.82rem] text-forest-800">
            {membership.membership.invitedByDisplayName ?? 'Someone in the community'} has invited you to join The Trust Project.
            Joining does not create any commercial obligation, and does not make you party to anyone else's Agreement.
            You remain independent — the community is guided by the 12 Principles above.
          </p>
          <p className="text-[0.8rem] text-forest-700">
            Joining gives you access to shared fair-trade technologies, systems and people while you remain independent.
          </p>
          <div className="flex gap-2">
            <button onClick={onJoin} className="min-h-11 rounded-xl bg-forest-600 text-cream-50 text-[0.82rem] font-medium px-4 py-2 hover:bg-forest-700 transition-colors">
              Review invitation
            </button>
            <button onClick={onDecline} className="rounded-xl border border-cream-200 text-forest-700 text-[0.82rem] font-medium px-4 py-2 hover:bg-cream-50 transition-colors">
              Decline
            </button>
          </div>
        </div>
      )}
      {membership.kind === 'declined' && (
        <div className="mt-3 rounded-xl border border-cream-200 bg-white px-4 py-3">
          <p className="text-[0.8rem] text-sand-600">You declined an invitation earlier. You can still choose to join.</p>
          <button onClick={onJoin} className="mt-2 min-h-11 rounded-xl border border-forest-200 text-forest-800 text-[0.82rem] font-medium px-4 py-2 hover:bg-forest-50 transition-colors">
            Join The Trust Project
          </button>
        </div>
      )}
      {membership.kind === 'revoked' && (
        <div className="mt-3 rounded-xl border border-cream-200 bg-white px-4 py-3">
          <p className="text-[0.8rem] text-sand-600">Your Trust Project membership is no longer active. If you think this is a mistake, use Help & Support.</p>
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
    { value: 'live', label: 'LIVE' },
    { value: 'serve', label: 'PROJECTS & ACTIVITIES' },
    { value: 'learn', label: 'LEARN' },
    { value: 'circles', label: 'CIRCLES' },
    { value: 'happening', label: 'HAPPENING' },
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
 * Final pre-merge correction pass -- a pending Circle invitation. The one legitimate route for the
 * invitee to discover a PRIVATE Circle otherwise invisible to general discovery ("Your Circles" is
 * ACTIVE-only, general discovery is PUBLIC-only). Opening one routes into the SAME Circle detail
 * experience every other Circle uses -- there is no separate accept/decline UI here.
 */
function CircleInvitationCard({ invitation, onOpen }: { invitation: CirclePendingInvitationView; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl border border-forest-200 bg-forest-50/60 px-4 py-3.5 hover:border-forest-300 transition-colors animate-quiet-in"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-[0.95rem] text-forest-800 font-medium leading-snug">{invitation.circleName}</h3>
        <span className="text-[0.68rem] font-medium text-forest-600 bg-forest-100 rounded-full px-2 py-0.5 shrink-0">Invited</span>
      </div>
      <p className="text-[0.8rem] text-sand-600 mt-1 line-clamp-2">{invitation.circlePurpose}</p>
      {invitation.invitedByDisplayName && (
        <p className="text-[0.72rem] text-sand-500 mt-1.5">Invited by {invitation.invitedByDisplayName}</p>
      )}
      <span className="inline-block mt-2 text-[0.75rem] font-medium text-forest-600">View invitation →</span>
    </button>
  );
}

function CircleInvitationsSection({
  invitations, loading, onOpen,
}: {
  invitations: CirclePendingInvitationView[];
  loading: boolean;
  onOpen: (circleId: string) => void;
}) {
  if (!loading && invitations.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-[0.78rem] font-medium text-sand-500 uppercase tracking-wide">Circle invitations</h3>
      {loading && <p className="text-[0.8rem] text-sand-500">Loading…</p>}
      {invitations.map(inv => (
        <CircleInvitationCard key={inv.circleId} invitation={inv} onOpen={() => onOpen(inv.circleId)} />
      ))}
    </div>
  );
}

/**
 * "Your Circles" -- the smaller spaces this person actually belongs to (real backend data, `circles.mine()`).
 */
function YourCirclesView({
  circles, loading, error, onOpen, onCreate, onRetry, onDiscover, invitations, invitationsLoading,
}: {
  circles: CircleResponse[];
  loading: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onRetry: () => void;
  onDiscover: () => void;
  invitations: CirclePendingInvitationView[];
  invitationsLoading: boolean;
}) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg text-forest-800 font-medium">Your Circles</h2>
            <p className="text-[0.8rem] text-sand-500">Smaller spaces inside The Trust Project for people with something useful in common.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={onDiscover} className="text-[0.78rem] font-medium text-forest-600 hover:text-forest-700">Find Circles</button>
            <button onClick={onCreate} className="text-[0.78rem] font-medium text-forest-600 hover:text-forest-700">+ Create</button>
          </div>
        </div>
        <CircleInvitationsSection invitations={invitations} loading={invitationsLoading} onOpen={onOpen} />
        {loading && <p className="text-[0.8rem] text-sand-500">Loading…</p>}
        {error && <ErrorStateCard data={{ type: 'ERROR_STATE', title: 'SecurePay could not load your Circles', text: error, primaryLabel: 'Try again', primaryValue: 'retry' }} onChoice={onRetry} />}
        {!loading && !error && circles.length === 0 && invitations.length === 0 && (
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
  circles, loading, error, onOpen, onRetry, query, onQueryChange,
}: {
  circles: CircleResponse[];
  loading: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onRetry: () => void;
  /** Phase 6 Slice 5 (Discovery & Identity, Section 12) -- additive text query; blank means the
   * original unfiltered browse, unchanged. */
  query: string;
  onQueryChange: (query: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-5 space-y-3">
        <h2 className="font-display text-lg text-forest-800 font-medium">Discover Circles</h2>
        <p className="text-[0.8rem] text-sand-500">
          Every ACTIVE Circle is listed here, deterministically by recency — never ranked, never a "recommended for you."
        </p>
        <input
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Search Circles by name, purpose, or category…"
          className="w-full rounded-xl border border-cream-200 bg-white px-3.5 py-2.5 text-[0.85rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300"
        />
        {loading && <p className="text-[0.8rem] text-sand-500">Loading…</p>}
        {error && <ErrorStateCard data={{ type: 'ERROR_STATE', title: 'SecurePay could not load Circles', text: error, primaryLabel: 'Try again', primaryValue: 'retry' }} onChoice={onRetry} />}
        {!loading && !error && circles.length === 0 && (
          <p className="text-[0.82rem] text-sand-500 py-6 text-center">{query ? `No Circles found for "${query}".` : 'No Circles exist yet.'}</p>
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
  circle, membershipStatus, isOwner, isSteward, invitedByDisplayName, joinSubmitting, joinError,
  onJoin, onRequestToJoin, onAccept, onDecline, onLeave, onBack,
  objects, objectsLoading, onOpenObject, onCompose,
  members, membersLoading, stewards, onRemoveMember, onAppointSteward, onRemoveSteward,
  pendingRequests, onApproveRequest, onDeclineRequest,
  onOpenInvite, onOpenCloseConfirm, onSetLifecycle, onInvokeKs001, communityGateway,
  messageBody, messageSubmitting, messageError, onMessageChange, onSendMessage,
}: {
  circle: CircleResponse;
  membershipStatus: string | null;
  isOwner: boolean;
  isSteward: boolean;
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
  members: { membershipId: string; canonicalKsNumber: string | null; displayName: string | null; isSelf: boolean }[];
  membersLoading: boolean;
  stewards: { membershipId: string; canonicalKsNumber: string; displayName: string | null; founder: boolean; active: boolean }[];
  onRemoveMember: (membershipId: string) => void;
  onAppointSteward: (membershipId: string) => void;
  onRemoveSteward: (membershipId: string) => void;
  pendingRequests: { membershipId: string; requesterCanonicalKsNumber: string | null; requesterDisplayName: string | null }[];
  onApproveRequest: (membershipId: string) => void;
  onDeclineRequest: (membershipId: string) => void;
  onOpenInvite: () => void;
  onOpenCloseConfirm: () => void;
  onSetLifecycle: (status: 'ACTIVE' | 'QUIET' | 'ARCHIVED') => void;
  onInvokeKs001: () => void;
  communityGateway: CommunityGateway;
  messageBody: string;
  messageSubmitting: boolean;
  messageError: string | null;
  onMessageChange: (body: string) => void;
  onSendMessage: () => void;
}) {
  const isMember = membershipStatus === 'ACTIVE' || isOwner;
  const canSteward = isOwner || isSteward;
  const stewardMembershipIds = new Set(stewards.filter(s => s.active).map(s => s.membershipId));
  const [circleSpace, setCircleSpace] = useState<'conversation' | 'board'>('conversation');
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
            <span className="text-[0.68rem] font-medium text-sand-600 bg-cream-100 rounded-full px-2 py-0.5">
              {circle.visibility === 'PUBLIC' ? 'Discoverable by anyone in The Trust Project' : 'Private — not in general discovery'}
            </span>
            <span className="text-[0.68rem] text-sand-500">{circle.memberCount} member{circle.memberCount === 1 ? '' : 's'}</span>
            {circle.status !== 'ACTIVE' && (
              <span className="text-[0.68rem] font-medium text-sand-500 bg-cream-50 rounded-full px-2 py-0.5">{circle.status.charAt(0) + circle.status.slice(1).toLowerCase()}</span>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.75rem] text-sand-500">You are the founding steward of this Circle.</p>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {circle.status === 'ACTIVE' && <button onClick={() => onSetLifecycle('QUIET')} className="text-[0.75rem] text-sand-500 hover:text-forest-600">Mark quiet</button>}
              {circle.status === 'QUIET' && <button onClick={() => onSetLifecycle('ACTIVE')} className="text-[0.75rem] text-forest-600 hover:text-forest-700">Reactivate</button>}
              {(circle.status === 'ACTIVE' || circle.status === 'QUIET') && <button onClick={() => onSetLifecycle('ARCHIVED')} className="text-[0.75rem] text-sand-500 hover:text-forest-600">Archive</button>}
              {circle.status === 'ARCHIVED' && <button onClick={() => onSetLifecycle('ACTIVE')} className="text-[0.75rem] text-forest-600 hover:text-forest-700">Restore</button>}
              {circle.status !== 'CLOSED' && <button onClick={onOpenCloseConfirm} className="text-[0.75rem] text-sand-500 hover:text-forest-600">Close Circle</button>}
            </div>
          </div>
        )}
        {!isOwner && membershipStatus === 'ACTIVE' && (
          <div className="flex items-center justify-between">
            <p className="text-[0.75rem] text-sand-500">{isSteward ? 'You are a steward of this Circle.' : 'This is one of your Circles.'}</p>
            <div className="flex items-center gap-2">
              {isSteward && circle.status === 'ACTIVE' && <button onClick={() => onSetLifecycle('QUIET')} className="text-[0.75rem] text-sand-500 hover:text-forest-600">Mark quiet</button>}
              {isSteward && circle.status === 'QUIET' && <button onClick={() => onSetLifecycle('ACTIVE')} className="text-[0.75rem] text-forest-600 hover:text-forest-700">Reactivate</button>}
              <button onClick={onLeave} className="text-[0.75rem] text-sand-500 hover:text-forest-600">Leave Circle</button>
            </div>
          </div>
        )}
        {membershipStatus === 'INVITED' && (
          <div className="rounded-xl border border-forest-200 bg-forest-50/40 px-4 py-3.5 space-y-2">
            <p className="text-[0.8rem] text-forest-800">
              {invitedByDisplayName ?? 'The Circle owner'} invited you to join this Circle.
            </p>
            <div className="flex gap-2">
              <button onClick={onAccept} className="rounded-xl bg-forest-600 text-cream-50 text-[0.8rem] font-medium px-4 py-2 hover:bg-forest-700 transition-colors">Accept</button>
              <button onClick={onDecline} className="rounded-xl border border-cream-200 text-forest-700 text-[0.8rem] font-medium px-4 py-2 hover:bg-cream-50 transition-colors">Decline</button>
            </div>
          </div>
        )}
        {membershipStatus === 'REQUESTED' && (
          <p className="text-[0.8rem] text-sand-600">Your request to join is waiting for a Circle steward's review.</p>
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
                {/* Correction (Slice 3 pre-merge completion pass): the backend's real invitation
                    authority is owner-only -- this copy must say exactly that, never the previous,
                    inaccurate wording naming any member as able to invite. */}
                This Circle is invite-only. A Circle steward must invite you before you can join.
              </p>
            )}
            {joinError && <p role="alert" className="text-[0.75rem] text-red-600">{joinError}</p>}
          </div>
        )}

        {/* Steward management is Circle-space care only. Founder retains ownership/close authority. */}
        {canSteward && circle.membershipMode === 'INVITE_ONLY' && circle.status === 'ACTIVE' && (
          <button onClick={onOpenInvite} className="text-[0.78rem] font-medium text-forest-600 hover:text-forest-700 text-left">
            Invite someone
          </button>
        )}
        {canSteward && circle.membershipMode === 'REQUEST_TO_JOIN' && pendingRequests.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-cream-100">
            <h2 className="text-[0.75rem] font-medium text-sand-500 uppercase tracking-wide">Requests to join</h2>
            {pendingRequests.map(r => (
              <div key={r.membershipId} className="flex items-center justify-between rounded-xl border border-cream-200 bg-white px-4 py-2.5">
                <span className="text-[0.82rem] text-forest-800">{r.requesterDisplayName ?? r.requesterCanonicalKsNumber ?? 'A Trust Project member'}</span>
                <div className="flex gap-2">
                  <button onClick={() => onApproveRequest(r.membershipId)} className="text-[0.75rem] font-medium text-forest-600 hover:text-forest-700">Approve</button>
                  <button onClick={() => onDeclineRequest(r.membershipId)} className="text-[0.75rem] text-sand-500 hover:text-forest-600">Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isMember && circle.status !== 'ACTIVE' && (
          <div className="rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 text-[0.78rem] text-sand-600">
            This Circle is {circle.status.toLowerCase()}. Existing members can read its history, but new posts and membership activity are paused.
          </div>
        )}

        {isMember && circle.status === 'ACTIVE' && (
          <div className="rounded-xl border border-forest-100 bg-forest-50/40 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[0.78rem] font-medium text-forest-800">KS001 in this Circle</div>
              <p className="text-[0.7rem] text-sand-600 mt-0.5">KS001 opens in this Circle's shared context, so it can help members catch up and organise what the Circle has already shared. A member's private conversations stay separate. KS001 cannot post, RSVP, commit anyone, create an Agreement, or move money.</p>
            </div>
            <button onClick={onInvokeKs001} className="shrink-0 rounded-xl border border-forest-200 px-3 py-2 text-[0.75rem] font-medium text-forest-700 hover:bg-white">Ask KS001</button>
          </div>
        )}

        {isMember && (
          <div className="space-y-3 pt-2 border-t border-cream-100">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex rounded-xl border border-cream-200 bg-white p-1">
                <button
                  onClick={() => setCircleSpace('conversation')}
                  className={`rounded-lg px-3 py-1.5 text-[0.75rem] font-medium transition-colors ${circleSpace === 'conversation' ? 'bg-forest-600 text-cream-50' : 'text-forest-700 hover:bg-cream-50'}`}
                >
                  Conversation
                </button>
                <button
                  onClick={() => setCircleSpace('board')}
                  className={`rounded-lg px-3 py-1.5 text-[0.75rem] font-medium transition-colors ${circleSpace === 'board' ? 'bg-forest-600 text-cream-50' : 'text-forest-700 hover:bg-cream-50'}`}
                >
                  Circle Board
                </button>
              </div>
              {circleSpace === 'conversation' && circle.status === 'ACTIVE' && (
                <button onClick={onCompose} className="text-[0.78rem] font-medium text-forest-600 hover:text-forest-700">+ Share</button>
              )}
            </div>

            {circleSpace === 'board' ? (
              <CircleBoard
                circleId={circle.id}
                gateway={communityGateway}
                objects={objects}
                loading={objectsLoading}
                active={circle.status === 'ACTIVE'}
                onOpenObject={onOpenObject}
                onAdd={onCompose}
              />
            ) : (
              <>
                <div>
                  <h2 className="text-[0.75rem] font-medium text-sand-500 uppercase tracking-wide">Circle conversation</h2>
                  <p className="text-[0.7rem] text-sand-500 mt-0.5">Talk, coordinate and keep the working context together. Formal Agreement decisions still happen in the Agreement.</p>
                </div>
                {circle.status === 'ACTIVE' && (
                  <div className="rounded-2xl border border-cream-200 bg-white p-3">
                    <textarea
                      value={messageBody}
                      onChange={e => onMessageChange(e.target.value)}
                      rows={2}
                      placeholder="Message the Circle…"
                      className="w-full resize-none bg-transparent px-1 py-1 text-[0.84rem] text-forest-800 placeholder:text-sand-400 focus:outline-none"
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-[0.67rem] text-sand-500">A Circle message is coordination, not an Agreement decision.</p>
                      <button
                        onClick={onSendMessage}
                        disabled={messageSubmitting || !messageBody.trim()}
                        className="shrink-0 rounded-xl bg-forest-600 px-3.5 py-2 text-[0.75rem] font-medium text-cream-50 hover:bg-forest-700 disabled:opacity-50"
                      >
                        {messageSubmitting ? 'Sending…' : 'Send'}
                      </button>
                    </div>
                    {messageError && <p role="alert" className="mt-2 text-[0.72rem] text-red-600">{messageError}</p>}
                  </div>
                )}
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[0.85rem] font-medium text-forest-800">{o.title}</div>
                        <span className="shrink-0 text-[0.64rem] uppercase tracking-wide text-sand-500">{o.objectType.replace('_', ' ').toLowerCase()}</span>
                      </div>
                      <p className="text-[0.78rem] text-sand-600 mt-0.5 line-clamp-2">{o.body}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Member list -- community-safe identity fields only. Stewardship does not expose private account data. */}
        {isMember && (
          <div className="space-y-2 pt-2 border-t border-cream-100">
            <h2 className="text-[0.75rem] font-medium text-sand-500 uppercase tracking-wide">Members</h2>
            {membersLoading && <p className="text-[0.8rem] text-sand-500">Loading…</p>}
            <div className="space-y-1.5">
              {members.map(m => (
                <div key={m.membershipId} className="flex items-center justify-between text-[0.82rem] text-forest-800 px-1">
                  <span>{m.displayName ?? m.canonicalKsNumber ?? 'A Circle member'}{m.isSelf ? ' (you)' : ''}</span>
                  {/* UX-only cleanup (final pre-merge correction pass): the backend already rejects
                      self-removal (CannotRemoveOwnerException) regardless of this check -- hiding the
                      owner's own Remove button here just avoids offering an action that always fails. */}
                  <div className="flex items-center gap-2">
                    {stewardMembershipIds.has(m.membershipId) && (
                      <span className="text-[0.65rem] text-forest-600">{stewards.find(s => s.membershipId === m.membershipId)?.founder ? 'Founder steward' : 'Steward'}</span>
                    )}
                    {isOwner && !m.isSelf && !stewardMembershipIds.has(m.membershipId) && (
                      <button onClick={() => onAppointSteward(m.membershipId)} className="text-[0.7rem] text-forest-600 hover:text-forest-700">
                        Make steward
                      </button>
                    )}
                    {isOwner && !m.isSelf && stewardMembershipIds.has(m.membershipId) && !stewards.find(s => s.membershipId === m.membershipId)?.founder && (
                      <button onClick={() => onRemoveSteward(m.membershipId)} className="text-[0.7rem] text-sand-500 hover:text-forest-600">
                        Remove steward
                      </button>
                    )}
                    {canSteward && !m.isSelf && !stewardMembershipIds.has(m.membershipId) && (
                      <button onClick={() => onRemoveMember(m.membershipId)} className="text-[0.7rem] text-sand-500 hover:text-forest-600">
                        Remove member
                      </button>
                    )}
                  </div>
                </div>
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

/**
 * Phase 6 Slice 4 (Community → Trade) -- resolves a real, backend-verified "Use this" pointer from a
 * real Community object. `sourceType` is derived from the object's own real `objectType` (OPPORTUNITY
 * → 'OPPORTUNITY', everything else -- NEED/WORK_STORY/QUESTION/DISCUSSION -- → 'COMMUNITY_POST');
 * the backend independently re-verifies this against the real object regardless. `null` only when
 * the object carries no resolvable author KS Number (should not happen for a real object, but this
 * never fabricates one).
 *
 * <p>Final pre-merge correction -- carries no opening message any more. The object's own title/body
 * is never submitted as a conversational turn (it may not be the current human's own words); KS001
 * instead receives it as bounded, server-composed model context (see the Agent controller's own
 * `continueAfterSourceSelection`), never a fabricated human statement.
 */
function communitySourceFactFor(
  object: CommunityObjectResponse, candidateParticipantKsNumber?: string,
): CommunitySourceFact | null {
  if (!object.authorCanonicalKsNumber) return null;
  return {
    sourceType: object.objectType === 'OPPORTUNITY' ? 'OPPORTUNITY' : 'COMMUNITY_POST',
    sourceId: object.id,
    sourceOwnerKsNumber: object.authorCanonicalKsNumber,
    candidateParticipantKsNumber,
  };
}

const SEARCH_SCOPES: { value: DiscoveryScope; label: string }[] = [
  { value: 'EVERYTHING', label: 'Everything' },
  { value: 'COMMUNITY', label: 'Community' },
  { value: 'CIRCLES', label: 'Circles' },
  { value: 'STORES', label: 'Stores' },
  { value: 'PEOPLE', label: 'People & businesses' },
];

const COMMUNITY_TYPE_LABEL: Record<DiscoveryResults['community'][number]['objectType'], string> = {
  QUESTION: 'Question', NEED: 'Need', OPPORTUNITY: 'Opportunity', WORK_STORY: 'Work story', DISCUSSION: 'Discussion',
};

/** Final pre-merge correction (Section 6) -- an exhaustive mapping over the narrowed
 * `PublicDirectoryIdentityType` union (`INDIVIDUAL`/`BUSINESS` only), never a ternary against a wider
 * identity-type union that could silently treat a third value as "Person". */
const IDENTITY_TYPE_LABEL: Record<PublicDirectoryIdentityType, string> = {
  INDIVIDUAL: 'Person', BUSINESS: 'Business',
};

/**
 * Phase 6 Slice 5 (Discovery & Identity) -- "find what actually exists in their Community without
 * SecurePay deciding what is best for them" (Section 2/28). Results are grouped by real type
 * (Section 8) -- never flattened into one generic list -- and factual only: no score, rank, star
 * rating, "recommended", or "trending" label anywhere here. Opening a result always leads to that
 * item's own authoritative surface (Community object detail, Circle detail, the real Store offer, or
 * a public profile) -- never a shortcut into Agreement/trade authority (Section 47/56).
 */
function CommunitySearchView({
  query, scope, results, onQueryChange, onSubmit, onScopeChange, onBack,
  onOpenCommunityItem, onOpenCircleItem, onOpenStoreItem, onOpenPersonItem,
  loadingMore, loadMoreError, onLoadMore,
}: {
  query: string;
  scope: DiscoveryScope;
  results: RemoteState<DiscoveryResults>;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  onScopeChange: (scope: DiscoveryScope) => void;
  onBack: () => void;
  onOpenCommunityItem: (id: string) => void;
  onOpenCircleItem: (id: string) => void;
  onOpenStoreItem: (canonicalKsNumber: string, offerId: string) => void;
  onOpenPersonItem: (canonicalKsNumber: string) => void;
  /** Final pre-merge correction -- real pagination for a specific (non-EVERYTHING) scope only
   * (Section 9/26); `EVERYTHING` never renders "Load more" regardless of these props. */
  loadingMore: boolean;
  loadMoreError: string | null;
  onLoadMore: () => void;
}) {
  const data = results.status === 'ready' ? results.data : null;
  const totalShown = data ? data.community.length + data.circles.length + data.stores.length + data.people.length : 0;
  const hasMore = data && scope !== 'EVERYTHING' && (
    scope === 'COMMUNITY' ? data.communityHasMore
      : scope === 'CIRCLES' ? data.circlesHasMore
      : scope === 'STORES' ? data.storesHasMore
      : data.peopleHasMore
  );
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-5 space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-lg hover:bg-cream-100 transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-forest-700" />
          </button>
          <h2 className="font-display text-lg text-forest-800 font-medium">Search Community</h2>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSubmit(); }} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="What are you looking for?"
            className="flex-1 rounded-xl border border-cream-200 bg-white px-3.5 py-2.5 text-[0.85rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300"
          />
          <button type="submit" className="rounded-xl bg-forest-600 text-cream-50 text-[0.82rem] font-medium px-4 py-2.5 hover:bg-forest-700 transition-colors">
            Search
          </button>
        </form>
        <div className="flex gap-1.5 flex-wrap">
          {SEARCH_SCOPES.map(s => (
            <button
              key={s.value}
              onClick={() => onScopeChange(s.value)}
              className={`text-[0.78rem] font-medium rounded-full px-3 py-1.5 transition-colors ${
                scope === s.value ? 'bg-forest-600 text-cream-50' : 'text-forest-700 bg-cream-50 hover:bg-cream-100'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {results.status === 'loading' && <p className="text-[0.8rem] text-sand-500 py-4 text-center">Searching…</p>}
        {results.status === 'error' && (
          <ErrorStateCard data={errorView(errorText(results.error))} onChoice={onSubmit} />
        )}
        {results.status === 'ready' && totalShown === 0 && (
          <div className="py-8 text-center space-y-2">
            <p className="text-[0.85rem] text-sand-500">No matches for &quot;{query}&quot;.</p>
            <p className="text-[0.78rem] text-sand-400">Ask the Community, post a Need, start a Discussion, or browse Circles instead.</p>
          </div>
        )}

        {data && data.community.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[0.72rem] font-medium text-sand-500 uppercase tracking-wide">Community</h3>
            {data.community.map(item => (
              <button
                key={item.id}
                onClick={() => onOpenCommunityItem(item.id)}
                className="w-full text-left rounded-2xl border border-cream-200 bg-white px-4 py-3.5 hover:border-forest-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-display text-[0.9rem] text-forest-800 font-medium leading-snug">{item.title}</h4>
                  <span className="text-[0.68rem] font-medium text-forest-600 bg-forest-50 rounded-full px-2 py-0.5 shrink-0">
                    {COMMUNITY_TYPE_LABEL[item.objectType]}
                  </span>
                </div>
                <p className="text-[0.72rem] text-sand-500 mt-1">
                  {item.authorDisplayName ?? 'A Community member'}{item.locationLabel ? ` · ${item.locationLabel}` : ''}
                </p>
              </button>
            ))}
          </div>
        )}

        {data && data.circles.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[0.72rem] font-medium text-sand-500 uppercase tracking-wide">Circles</h3>
            {data.circles.map(circle => (
              <button
                key={circle.id}
                onClick={() => onOpenCircleItem(circle.id)}
                className="w-full text-left rounded-2xl border border-cream-200 bg-white px-4 py-3.5 hover:border-forest-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-display text-[0.9rem] text-forest-800 font-medium leading-snug">{circle.name}</h4>
                  <span className="text-[0.68rem] text-sand-500 shrink-0">{circle.memberCount} member{circle.memberCount === 1 ? '' : 's'}</span>
                </div>
                <p className="text-[0.8rem] text-sand-600 mt-1 line-clamp-2">{circle.purpose}</p>
              </button>
            ))}
          </div>
        )}

        {data && data.stores.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[0.72rem] font-medium text-sand-500 uppercase tracking-wide">Stores</h3>
            {data.stores.map(offer => (
              <button
                key={offer.offerId}
                onClick={() => onOpenStoreItem(offer.canonicalKsNumber, offer.offerId)}
                className="w-full text-left rounded-2xl border border-cream-200 bg-white px-4 py-3.5 hover:border-forest-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-display text-[0.9rem] text-forest-800 font-medium leading-snug">{offer.title}</h4>
                  {offer.priceMinor !== null && offer.currency && (
                    <span className="text-[0.75rem] font-medium text-forest-700 shrink-0">{(offer.priceMinor / 100).toFixed(2)} {offer.currency}</span>
                  )}
                </div>
                <p className="text-[0.72rem] text-sand-500 mt-1">{offer.displayName}{offer.locationLabel ? ` · ${offer.locationLabel}` : ''}</p>
              </button>
            ))}
          </div>
        )}

        {data && data.people.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[0.72rem] font-medium text-sand-500 uppercase tracking-wide">People &amp; businesses</h3>
            {data.people.map(person => (
              <button
                key={person.canonicalKsNumber}
                onClick={() => onOpenPersonItem(person.canonicalKsNumber)}
                className="w-full text-left rounded-2xl border border-cream-200 bg-white px-4 py-3.5 hover:border-forest-300 transition-colors flex items-center justify-between gap-2"
              >
                <div>
                  <h4 className="font-display text-[0.9rem] text-forest-800 font-medium leading-snug">{person.displayName}</h4>
                  <p className="text-[0.72rem] text-sand-500 mt-0.5">{IDENTITY_TYPE_LABEL[person.identityType]}{person.hasStore ? ' · Has a Store' : ''}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="pt-1">
            {loadMoreError ? (
              <div className="text-center space-y-2">
                <p className="text-[0.78rem] text-red-600">{loadMoreError}</p>
                <button onClick={onLoadMore} className="text-[0.8rem] font-medium text-forest-600 hover:text-forest-700">
                  Try again
                </button>
              </div>
            ) : (
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                aria-busy={loadingMore || undefined}
                className="w-full rounded-xl border border-cream-200 bg-white px-4 py-2.5 text-[0.82rem] font-medium text-forest-600 hover:border-forest-300 transition-colors disabled:opacity-60"
              >
                {loadingMore ? 'Loading more…' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Phase 6 Slice 5 -- a public person/business profile (Section 16/17). Informational only: never an
 * account/Settings surface (Section 34), never a "Hire this person" shortcut (Section 37). Verified
 * means exactly the backend's real state -- there is deliberately no "trusted"/"recommended" language
 * anywhere here (Section 23).
 */
function CommunityProfileView({
  profile, storeGateway, onBack, onOpenActivityItem, onOpenStoreOffer,
}: {
  profile: RemoteState<PublicProfileResponse>;
  storeGateway: Pick<StoreGateway, 'store'>;
  onBack: () => void;
  onOpenActivityItem: (id: string) => void;
  onOpenStoreOffer: (canonicalKsNumber: string, offerId: string) => void;
}) {
  const [store, setStore] = useState<RemoteState<PublicStoreView>>({ status: 'idle' });

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-5 space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-lg hover:bg-cream-100 transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-forest-700" />
          </button>
          <h2 className="font-display text-lg text-forest-800 font-medium">Profile</h2>
        </div>

        {profile.status === 'loading' && <p className="text-[0.8rem] text-sand-500 py-4 text-center">Loading…</p>}
        {profile.status === 'error' && <ErrorStateCard data={errorView(errorText(profile.error))} onChoice={onBack} />}

        {profile.status === 'ready' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-cream-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base text-forest-800 font-medium">{profile.data.displayName}</h3>
                <span className="text-[0.68rem] font-medium text-forest-600 bg-forest-50 rounded-full px-2 py-0.5 shrink-0">
                  {IDENTITY_TYPE_LABEL[profile.data.identityType]}
                </span>
              </div>
              {profile.data.hasStore && (
                <div className="mt-3 pt-3 border-t border-cream-100">
                  {profile.data.storeTagline && <p className="text-[0.8rem] text-sand-600">{profile.data.storeTagline}</p>}
                  {profile.data.storeLocationLabel && <p className="text-[0.72rem] text-sand-500 mt-0.5">{profile.data.storeLocationLabel}</p>}
                  <button
                    onClick={async () => {
                      if (store.status === 'loading' || store.status === 'ready') return;
                      setStore({ status: 'loading' });
                      try {
                        const view = await storeGateway.store(profile.data.canonicalKsNumber);
                        setStore({ status: 'ready', data: view });
                      } catch (error) {
                        setStore({ status: 'error', error: error instanceof ApiError ? error : new ApiError('network', 'SecurePay is unavailable') });
                      }
                    }}
                    className="mt-2 text-[0.8rem] font-medium text-forest-600 hover:text-forest-700"
                  >
                    View Store →
                  </button>
                </div>
              )}
            </div>

            {store.status === 'loading' && <p className="text-[0.8rem] text-sand-500">Loading Store…</p>}
            {store.status === 'error' && <p className="text-[0.8rem] text-red-600">{errorText(store.error)}</p>}
            {store.status === 'ready' && (
              <div className="rounded-2xl border border-cream-200 bg-white px-4 py-4 space-y-2">
                <h4 className="text-[0.72rem] font-medium text-sand-500 uppercase tracking-wide">Store offers</h4>
                {store.data.offers.length === 0 && <p className="text-[0.8rem] text-sand-500">No published offers yet.</p>}
                {store.data.offers.map(offer => (
                  <button
                    key={offer.id}
                    onClick={() => onOpenStoreOffer(profile.data.canonicalKsNumber, offer.id)}
                    className="w-full text-left rounded-xl border border-cream-200 px-3 py-2.5 hover:border-forest-300 transition-colors"
                  >
                    <p className="text-[0.85rem] text-forest-800 font-medium">{offer.title}</p>
                  </button>
                ))}
              </div>
            )}

            {profile.data.recentActivity.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[0.72rem] font-medium text-sand-500 uppercase tracking-wide">Recent public activity</h4>
                {profile.data.recentActivity.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onOpenActivityItem(item.id)}
                    className="w-full text-left rounded-xl border border-cream-200 bg-white px-3.5 py-2.5 hover:border-forest-300 transition-colors"
                  >
                    <p className="text-[0.85rem] text-forest-800 font-medium">{item.title}</p>
                    <p className="text-[0.68rem] text-sand-500 mt-0.5">{COMMUNITY_TYPE_LABEL[item.objectType]}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommunityExperience({ gateway, communityGateway, discoveryGateway, trustedMediaOrigin, onNavigate, onOpenStoreOffer, onOpenCircle, onUseThis, onJoinTrustProject, onInvokeKs001InCircle }: {
  gateway: Gateway;
  communityGateway: CommunityGateway;
  /** Phase 6 Slice 5 (Discovery & Identity) -- Community/Circle/Store/People search, composed thinly
   * from each domain's own real authority (see `DiscoverySearchController`'s own doctrine). */
  discoveryGateway: DiscoveryGateway;
  trustedMediaOrigin: string | null;
  onNavigate: (view: AppView) => void;
  onOpenStoreOffer: (canonicalKsNumber: string, offerId: string) => void;
  onOpenCircle: () => void;
  /**
   * Phase 6 Slice 4 (Community → Trade) -- "Use this": bring a real Need/Opportunity into a trade
   * conversation as CONTEXT. The caller (AgentExperience, which owns the real Agent conversation
   * controller) is responsible for actually selecting the source and leaving Community; this
   * component only ever resolves the real, backend-verified pointer -- never fabricates a title,
   * owner, or candidate.
   */
  onUseThis: (fact: CommunitySourceFact) => void;
  /** Public Experience Convergence Phase 4 -- opens `#/join` (direct Join / invitation acceptance). */
  onJoinTrustProject: () => void;
  onInvokeKs001InCircle: (circleId: string) => void;
}) {
  // Phase 4 -- the invite dialog offers two different things: a canonical invitation of an EXISTING KS
  // Number, or a quick share link (no membership row, no referral, no capacity).
  const [inviteMode, setInviteMode] = useState<'choose' | 'ks' | 'share'>('choose');
  const navPadding = useAppNavPadding(); // Public Experience Convergence Phase 2: no bottom-nav room in the public shell
  const [controller] = useState(() => createCommunityController(gateway, communityGateway, discoveryGateway, trustedMediaOrigin));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<'SAFETY'|'HARASSMENT'|'SPAM'|'MISLEADING'|'PRIVACY'|'OTHER'>('OTHER');
  const [reportDetails, setReportDetails] = useState('');
  const [moderationBusy, setModerationBusy] = useState(false);

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

  // Phase 6 Slice 5 (Discovery & Identity) -- the exact same debounce discipline as the Store-search
  // box above, applied to Discover Circles' own new text query and the dedicated Search screen.
  const previousDiscoverCirclesQuery = useRef(state.discoverCirclesQuery);
  useEffect(() => {
    if (previousDiscoverCirclesQuery.current === state.discoverCirclesQuery) return;
    previousDiscoverCirclesQuery.current = state.discoverCirclesQuery;
    const handle = setTimeout(() => void controller.submitDiscoverCirclesQuery(), 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.discoverCirclesQuery]);

  const previousSearchQuery = useRef(state.searchQuery);
  useEffect(() => {
    if (previousSearchQuery.current === state.searchQuery) return;
    previousSearchQuery.current = state.searchQuery;
    if (state.view !== 'search') return;
    const handle = setTimeout(() => void controller.submitDiscoverySearch(), 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.searchQuery]);

  const isActiveMember = state.membership.kind === 'active';
  const [serviceItems, setServiceItems] = useState<CommunityServiceOpportunityDto[]>([]);
  const [communityEvents, setCommunityEvents] = useState<CommunityEventDto[]>([]);
  const [communityProjects, setCommunityProjects] = useState<CommunityProjectDto[]>([]);
  const [apprenticeships, setApprenticeships] = useState<ApprenticeshipProjectDto[]>([]);
  const [purposeLoading, setPurposeLoading] = useState(false);
  const [purposeError, setPurposeError] = useState<string | null>(null);
  const [purposeCreate, setPurposeCreate] = useState<'service' | 'event' | 'apprenticeship' | null>(null);
  const [serviceDraft, setServiceDraft] = useState({ title: '', description: '', outcome: '', locationLabel: '', skills: '' });
  const [eventDraft, setEventDraft] = useState({ title: '', description: '', startsAt: '', locationLabel: '' });
  const [apprenticeshipDraft, setApprenticeshipDraft] = useState({ apprenticeKsNumber: '', title: '', learningGoal: '' });
  const [purposeSubmitting, setPurposeSubmitting] = useState(false);
  const [lessonProjectId, setLessonProjectId] = useState<string | null>(null);
  const [lessonDraft, setLessonDraft] = useState('');

  useEffect(() => {
    if (!isActiveMember) {
      setServiceItems([]);
      setCommunityEvents([]);
      setCommunityProjects([]);
      setApprenticeships([]);
      setPurposeLoading(false);
      setPurposeError(null);
      return;
    }
    let cancelled = false;
    setPurposeLoading(true);
    setPurposeError(null);
    Promise.all([
      communityGateway.serviceOpportunities.list(),
      communityGateway.events.list(),
      communityGateway.projects.list(),
      communityGateway.apprenticeships.list(),
    ]).then(([service, events, projects, learning]) => {
      if (cancelled) return;
      setServiceItems(service);
      setCommunityEvents(events);
      setCommunityProjects(projects);
      setApprenticeships(learning);
    }).catch(error => {
      if (!cancelled) setPurposeError(errorText(error));
    }).finally(() => {
      if (!cancelled) setPurposeLoading(false);
    });
    return () => { cancelled = true; };
  }, [isActiveMember, communityGateway]);

  const realObjects = isActiveMember && state.feed.status === 'ready' ? state.feed.data.map(o => realObjectToCommunityObject(o)) : [];
  // Community LIVE is human Community content only. Store discovery remains available through the
  // deliberate cross-domain Search surface and explicit transitions, never injected into LIVE.
  const objects = realObjects;

  const banner = (
    <>
      <TrustProjectBanner
        membership={state.membership}
        onJoin={onJoinTrustProject}
        onDecline={() => void controller.declineInvitation()}
        onOpenInvite={() => { setInviteMode('choose'); controller.openInvite(); }}
        principlesOpen={state.principlesOpen}
        onTogglePrinciples={() => void controller.togglePrinciples()}
        principles={state.principles.status === 'ready' ? state.principles.data : []}
        principlesLoading={state.principles.status === 'loading'}
      />
      {isActiveMember && (
        <div className="max-w-2xl mx-auto px-4 md:px-6 pt-3">
          <button
            onClick={() => controller.openSearch()}
            className="w-full flex items-center gap-2 rounded-xl border border-cream-200 bg-white px-3.5 py-2.5 text-[0.82rem] text-sand-500 hover:border-forest-300 transition-colors"
          >
            <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
            Search Community, Circles, Stores, people &amp; businesses
          </button>
        </div>
      )}
    </>
  );

  let body: React.ReactNode;
  if (state.view === 'search') {
    body = (
      <CommunitySearchView
        query={state.searchQuery}
        scope={state.searchScope}
        results={state.discoverySearch}
        onQueryChange={q => controller.setSearchQuery(q)}
        onSubmit={() => void controller.submitDiscoverySearch()}
        onScopeChange={scope => controller.setSearchScope(scope)}
        onBack={() => controller.backToHome()}
        onOpenCommunityItem={id => void controller.openObject(id)}
        onOpenCircleItem={id => void controller.openCircle(id)}
        onOpenStoreItem={(ks, offerId) => onOpenStoreOffer(ks, offerId)}
        onOpenPersonItem={ks => void controller.openProfile(ks)}
        loadingMore={state.searchLoadingMore}
        loadMoreError={state.searchLoadMoreError}
        onLoadMore={() => void controller.loadMoreSearchResults()}
      />
    );
  } else if (state.view === 'profile') {
    body = (
      <CommunityProfileView
        profile={state.selectedProfile}
        storeGateway={gateway}
        onBack={() => controller.backToSearch()}
        onOpenActivityItem={id => void controller.openObject(id)}
        onOpenStoreOffer={(ks, offerId) => onOpenStoreOffer(ks, offerId)}
      />
    );
  } else if (state.view === 'circleCompose') {
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
        isSteward={membership?.isSteward ?? false}
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
        members={state.circleMembers.status === 'ready' ? state.circleMembers.data : []}
        membersLoading={state.circleMembers.status === 'loading'}
        stewards={state.circleStewards.status === 'ready' ? state.circleStewards.data : []}
        onRemoveMember={id => void controller.removeCircleMember(id)}
        onAppointSteward={id => void controller.appointCircleSteward(id)}
        onRemoveSteward={id => void controller.removeCircleSteward(id)}
        pendingRequests={state.circlePendingRequests.status === 'ready' ? state.circlePendingRequests.data : []}
        onApproveRequest={id => void controller.approveCircleRequest(id)}
        onDeclineRequest={id => void controller.declineCircleRequest(id)}
        onOpenInvite={() => controller.openCircleInvite()}
        onOpenCloseConfirm={() => controller.openCircleCloseConfirm()}
        onSetLifecycle={status => void controller.setCircleLifecycle(status)}
        onInvokeKs001={() => onInvokeKs001InCircle(state.selectedCircle!.id)}
        communityGateway={communityGateway}
        messageBody={state.circleMessageDraft.body}
        messageSubmitting={state.circleMessageDraft.submitting}
        messageError={state.circleMessageDraft.error}
        onMessageChange={body => controller.setCircleMessageBody(body)}
        onSendMessage={() => void controller.submitCircleMessage()}
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
    // Correction (Slice 3 pre-merge completion pass): server-derived `canClose` (status === ACTIVE &&
    // authorIdentityId === requester) drives the Close action identically for a Community LIVE object
    // and a Circle-scoped one -- never inferred from the LIVE-only `ownObjectIds` set, which never
    // covered Circle-scoped objects at all.
    const isOwn = state.selectedRealObject.canClose;
    // Correction (Slice 2 pre-merge): whether the caller already has an ACTIVE "I can help" signal,
    // and which response id a withdrawal targets, is derived directly from the real, server-returned
    // help list -- never from session-scoped creation tracking -- so it is correct even immediately
    // after a page refresh/controller reload.
    const activeHelpResponseId = state.objectHelp.status === 'ready' ? myActiveHelpResponseId(state.objectHelp.data) : null;
    // Phase 6 Slice 4 final pre-merge correction -- EVERY real, current ACTIVE "I can help" responder,
    // rendered distinctly (never just the first one) so the object's own owner explicitly chooses
    // exactly one by clicking THAT responder's own button. Supplied only to the owner (isOwn) -- a
    // non-owner viewer never sees a "Start a trade with X" affordance for someone else's Need/Opportunity.
    const activeHelpResponders = isOwn && state.objectHelp.status === 'ready'
      ? state.objectHelp.data
          .filter((h: CommunityHelpResponseView) => h.status === 'ACTIVE')
          .map(h => ({ id: h.id, displayName: h.authorDisplayName, canonicalKsNumber: h.authorCanonicalKsNumber }))
      : undefined;
    body = (
      <CommunityObjectDetail
        object={object}
        offer={null}
        onBack={() => (state.selectedCircleId ? controller.leaveCircleObjectDetail() : controller.backToHome())}
        onICanHelp={() => controller.showNotice('This area is not available yet.')}
        onDiscuss={() => controller.showNotice('This area is not available yet.')}
        onViewOffer={() => {}}
        onUseThis={() => {
          const fact = communitySourceFactFor(state.selectedRealObject!);
          if (fact) onUseThis(fact);
        }}
        onSaveToVision={() => void communityGateway.transitions.objectToVision(state.selectedRealObject!.id)
          .then(() => onNavigate('vision-board'))
          .catch(error => controller.showNotice(errorText(error)))}
        onToTrade={() => controller.showNotice('This area is not available yet.')}
        activeHelpResponders={activeHelpResponders}
        onStartTradeWithResponder={candidateKsNumber => {
          // The EXPLICIT human choice -- candidateKsNumber is exactly the KS Number of the button the
          // person clicked, never inferred, never a default, never "whichever is first."
          const fact = communitySourceFactFor(state.selectedRealObject!, candidateKsNumber);
          if (fact) onUseThis(fact);
        }}
        onClose={isOwn ? () => void controller.closeObject(object.id) : undefined}
        onReport={!isOwn ? () => setReportOpen(true) : undefined}
        onMuteAuthor={!isOwn && state.selectedRealObject.authorCanonicalKsNumber ? () => {
          setModerationBusy(true);
          void communityGateway.moderation.mute(state.selectedRealObject!.authorCanonicalKsNumber!).then(() => {
            setModerationBusy(false);
            controller.showNotice('Member muted. Their Community posts will no longer appear for you.');
            controller.backToHome();
            void controller.refreshFeed();
          }).catch(error => { setModerationBusy(false); controller.showNotice(errorText(error)); });
        } : undefined}
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
  } else if (state.communityTab === 'live' && state.search.status === 'error' && state.feed.status !== 'ready' && objects.length === 0) {
    body = (
      <>
        {banner}
        <div className="p-6"><ErrorStateCard data={errorView(errorText(state.search.error))} onChoice={() => void controller.submitSearch()} /></div>
      </>
    );
  } else if (state.communityTab === 'serve') {
    body = (
      <>
        {banner}
        {isActiveMember && <CommunityHomeTabs tab={state.communityTab} onSelect={tab => void controller.showCommunityTab(tab)} />}
        <div className="flex-1 overflow-y-auto"><div className="max-w-2xl mx-auto px-4 md:px-6 py-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-display text-lg text-forest-800 font-medium">Projects & Activities</h2><p className="text-[0.8rem] text-sand-500">Start with an intention. Ask the Community for people and skills, then shape it into something real.</p></div>
            <button onClick={() => setPurposeCreate(purposeCreate === 'service' ? null : 'service')} className="text-[0.75rem] font-medium text-forest-600">+ Declare intention</button>
          </div>
          {purposeCreate === 'service' && (
            <div className="rounded-2xl border border-cream-200 bg-white px-4 py-4 space-y-2">
              <div>
                <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Declare the intention</div>
                <p className="text-[0.72rem] text-sand-500 mt-0.5">Start with the change you want to make. This is not a request for money or materials.</p>
              </div>
              <input value={serviceDraft.title} onChange={e => setServiceDraft(d => ({...d,title:e.target.value}))} placeholder="What are you trying to do?" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem]" />
              <textarea value={serviceDraft.description} onChange={e => setServiceDraft(d => ({...d,description:e.target.value}))} placeholder="Why does it matter?" rows={3} className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem]" />
              <textarea value={serviceDraft.outcome} onChange={e => setServiceDraft(d => ({...d,outcome:e.target.value}))} placeholder="What would you like to see happen?" rows={2} className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem]" />
              <input value={serviceDraft.locationLabel} onChange={e => setServiceDraft(d => ({...d,locationLabel:e.target.value}))} placeholder="Where is this happening? (optional)" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem]" />
              <input value={serviceDraft.skills} onChange={e => setServiceDraft(d => ({...d,skills:e.target.value}))} placeholder="What do you want from the Community? skills, labour, mentoring…" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem]" />
              <div className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5 text-[0.7rem] text-sand-600">
                Materials, equipment and funding are organised separately through the appropriate Store / Agreement / Money path. Community participation is about people, skills, labour, knowledge and presence.
              </div>
              <button
                disabled={purposeSubmitting || !serviceDraft.title.trim() || !serviceDraft.description.trim() || !serviceDraft.outcome.trim()}
                onClick={() => {
                  setPurposeSubmitting(true); setPurposeError(null);
                  void communityGateway.serviceOpportunities.create({
                    title: serviceDraft.title.trim(), description: `${serviceDraft.description.trim()}\n\nWhat we hope to see: ${serviceDraft.outcome.trim()}`,
                    locationLabel: serviceDraft.locationLabel.trim() || null,
                    skillsNeeded: serviceDraft.skills.split(',').map(x => x.trim()).filter(Boolean),
                  }).then(created => {
                    setServiceItems(items => [created, ...items]);
                    setServiceDraft({ title: '', description: '', outcome: '', locationLabel: '', skills: '' });
                    setPurposeCreate(null);
                  }).catch(error => setPurposeError(errorText(error))).finally(() => setPurposeSubmitting(false));
                }}
                className="w-full rounded-xl bg-forest-600 text-cream-50 text-[0.8rem] font-medium py-2.5 disabled:opacity-50"
              >Declare intention</button>
            </div>
          )}
          {purposeLoading && <p className="text-[0.8rem] text-sand-500">Loading…</p>}
          {purposeError && <p role="alert" className="text-[0.8rem] text-red-600">{purposeError}</p>}
          {!purposeLoading && !purposeError && serviceItems.length === 0 && <p className="text-[0.82rem] text-sand-500 py-6 text-center">No service opportunities are open right now.</p>}
          {serviceItems.map(item => <div key={item.id} className="rounded-2xl border border-cream-200 bg-white px-4 py-3">
            <div className="text-[0.9rem] font-medium text-forest-800">{item.title}</div>
            <p className="text-[0.78rem] text-sand-600 mt-1">{item.description}</p>
            <div className="text-[0.68rem] text-sand-500 mt-2">{item.locationLabel ?? 'Location to be agreed'}{item.skillsNeeded.length ? ` · ${item.skillsNeeded.join(', ')}` : ''}</div>
            <div className="mt-3 flex items-center gap-4">
              <button onClick={() => void communityGateway.serviceOpportunities.volunteer(item.id,true).then(updated => setServiceItems(items => items.map(x => x.id===updated.id?updated:x)))} className="text-[0.75rem] font-medium text-forest-600">I'm interested</button>
              <button
                onClick={() => {
                  setPurposeSubmitting(true); setPurposeError(null);
                  void communityGateway.projects.create({
                    circleId: item.circleId, sourceServiceOpportunityId: item.id,
                    title: item.title, purpose: item.description, locationLabel: item.locationLabel,
                  }).then(created => {
                    setCommunityProjects(items => [created, ...items.filter(x => x.id !== created.id)]);
                    void controller.showCommunityTab('learn');
                  }).catch(error => setPurposeError(errorText(error))).finally(() => setPurposeSubmitting(false));
                }}
                className="text-[0.75rem] font-medium text-forest-600"
              >Shape as project</button>
            </div>
          </div>)}
        </div></div>
      </>
    );
  } else if (state.communityTab === 'learn') {
    body = (
      <>
        {banner}
        {isActiveMember && <CommunityHomeTabs tab={state.communityTab} onSelect={tab => void controller.showCommunityTab(tab)} />}
        <div className="flex-1 overflow-y-auto"><div className="max-w-2xl mx-auto px-4 md:px-6 py-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-display text-lg text-forest-800 font-medium">Learn</h2><p className="text-[0.8rem] text-sand-500">Knowledge, mentorship and supervised Apprenticeship Projects grounded in real work.</p></div>
            <button onClick={() => setPurposeCreate(purposeCreate === 'apprenticeship' ? null : 'apprenticeship')} className="text-[0.75rem] font-medium text-forest-600">+ Apprenticeship Project</button>
          </div>
          {purposeCreate === 'apprenticeship' && (
            <div className="rounded-2xl border border-cream-200 bg-white px-4 py-4 space-y-2">
              <p className="text-[0.72rem] text-sand-500">Only a currently designated Master can create this. SecurePay checks that on the server.</p>
              <input value={apprenticeshipDraft.apprenticeKsNumber} onChange={e => setApprenticeshipDraft(d => ({...d,apprenticeKsNumber:e.target.value}))} placeholder="Apprentice KS Number" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem]" />
              <input value={apprenticeshipDraft.title} onChange={e => setApprenticeshipDraft(d => ({...d,title:e.target.value}))} placeholder="Project title" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem]" />
              <textarea value={apprenticeshipDraft.learningGoal} onChange={e => setApprenticeshipDraft(d => ({...d,learningGoal:e.target.value}))} placeholder="What should the apprentice learn?" rows={3} className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem]" />
              <button
                disabled={purposeSubmitting || !apprenticeshipDraft.apprenticeKsNumber.trim() || !apprenticeshipDraft.title.trim() || !apprenticeshipDraft.learningGoal.trim()}
                onClick={() => {
                  setPurposeSubmitting(true); setPurposeError(null);
                  void communityGateway.apprenticeships.create({
                    apprenticeKsNumber: apprenticeshipDraft.apprenticeKsNumber.trim(),
                    title: apprenticeshipDraft.title.trim(),
                    learningGoal: apprenticeshipDraft.learningGoal.trim(),
                  }).then(created => {
                    setApprenticeships(items => [created, ...items]);
                    setApprenticeshipDraft({ apprenticeKsNumber: '', title: '', learningGoal: '' });
                    setPurposeCreate(null);
                  }).catch(error => setPurposeError(errorText(error))).finally(() => setPurposeSubmitting(false));
                }}
                className="w-full rounded-xl bg-forest-600 text-cream-50 text-[0.8rem] font-medium py-2.5 disabled:opacity-50"
              >Create Apprenticeship Project</button>
            </div>
          )}
          {purposeLoading && <p className="text-[0.8rem] text-sand-500">Loading…</p>}
          {purposeError && <p role="alert" className="text-[0.8rem] text-red-600">{purposeError}</p>}
          {apprenticeships.map(item => <div key={item.id} className="rounded-2xl border border-cream-200 bg-white px-4 py-3">
            <div className="text-[0.88rem] font-medium text-forest-800">{item.title}</div><p className="text-[0.78rem] text-sand-600 mt-1">{item.learningGoal}</p>
            <div className="text-[0.68rem] text-sand-500 mt-2">Apprentice {item.apprenticeKsNumber} · {item.status.toLowerCase()}</div>
          </div>)}
          {communityProjects.map(item => <div key={item.id} className="rounded-2xl border border-cream-200 bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[0.88rem] font-medium text-forest-800">{item.title}</div>
                <p className="text-[0.78rem] text-sand-600 mt-1 whitespace-pre-line">{item.purpose}</p>
              </div>
              <span className="shrink-0 text-[0.66rem] uppercase tracking-wide text-sand-500">{item.status.toLowerCase()}</span>
            </div>
            <div className="text-[0.68rem] text-sand-500 mt-2">{item.locationLabel ?? 'Location still being organised'} · Community project</div>

            <div className="mt-3 rounded-xl border border-forest-100 bg-forest-50/35 px-3 py-3">
              <div className="text-[0.72rem] font-medium text-forest-800">Taking part should not make the organiser your travel agent.</div>
              <p className="text-[0.7rem] text-sand-600 mt-1">Use the Project to coordinate the work. If you need accommodation, transport, local services or human coordination, prepare the appropriate Store or Plug path.</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => void communityGateway.transitions.prepareProject(item.id,'STORE')
                    .then(() => controller.showNotice('Store help prepared. Nothing has been booked or paid for.'))
                    .catch(error => controller.showNotice(errorText(error)))}
                  className="text-[0.73rem] font-medium text-forest-600"
                >
                  Find practical services
                </button>
                <button
                  onClick={() => void communityGateway.transitions.prepareProject(item.id,'PLUG')
                    .then(() => controller.showNotice('Plug coordination prepared. No one has been assigned yet.'))
                    .catch(error => controller.showNotice(errorText(error)))}
                  className="text-[0.73rem] font-medium text-forest-600"
                >
                  Ask for Plug coordination
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              <button
                onClick={() => void communityGateway.transitions.projectToVision(item.id)
                  .then(() => onNavigate('vision-board'))
                  .catch(error => controller.showNotice(errorText(error)))}
                className="text-[0.75rem] font-medium text-forest-600"
              >
                Add to Vision
              </button>
              {(['AGREEMENT','STORE','PLUG','MASTER'] as const).map(target => (
                <button
                  key={target}
                  onClick={() => void communityGateway.transitions.prepareProject(item.id,target)
                    .then(() => controller.showNotice(`${target.charAt(0)+target.slice(1).toLowerCase()} handoff prepared. Nothing was created or committed yet.`))
                    .catch(error => controller.showNotice(errorText(error)))}
                  className="text-[0.75rem] font-medium text-forest-600"
                >
                  Prepare {target.charAt(0)+target.slice(1).toLowerCase()}
                </button>
              ))}
              {item.circleId && (
                <button
                  onClick={() => void controller.openCircle(item.circleId!)}
                  className="text-[0.75rem] font-medium text-forest-600"
                >
                  Plan the day in Circle
                </button>
              )}
              <button
                onClick={() => { setLessonProjectId(lessonProjectId === item.id ? null : item.id); setLessonDraft(''); }}
                className="text-[0.75rem] font-medium text-forest-600"
              >
                Capture lesson
              </button>
            </div>
            {lessonProjectId === item.id && (
              <div className="mt-3 rounded-xl border border-cream-200 bg-cream-50 px-3 py-3 space-y-2">
                <p className="text-[0.7rem] text-sand-500">This creates a Knowledge review candidate. It is not approved SecurePay knowledge until Knowledge governance approves it.</p>
                <textarea
                  value={lessonDraft}
                  onChange={e => setLessonDraft(e.target.value)}
                  placeholder="What should future members learn from this project?"
                  rows={3}
                  className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-[0.82rem]"
                />
                <button
                  disabled={purposeSubmitting || !lessonDraft.trim()}
                  onClick={() => {
                    setPurposeSubmitting(true);
                    void communityGateway.knowledge.capture({
                      circleId: item.circleId,
                      sourceType: 'PROJECT_LESSON',
                      sourceReference: item.id,
                      title: `Lesson from ${item.title}`,
                      lessonText: lessonDraft.trim(),
                    }).then(candidate => communityGateway.knowledge.submit(candidate.id))
                      .then(() => {
                        setLessonProjectId(null);
                        setLessonDraft('');
                        controller.showNotice('Lesson submitted for Knowledge review. It is not approved Knowledge Core truth yet.');
                      })
                      .catch(error => controller.showNotice(errorText(error)))
                      .finally(() => setPurposeSubmitting(false));
                  }}
                  className="rounded-lg bg-forest-600 px-3 py-2 text-[0.75rem] font-medium text-cream-50 disabled:opacity-50"
                >
                  Submit lesson for review
                </button>
              </div>
            )}
          </div>)}
          {!purposeLoading && !purposeError && apprenticeships.length===0 && communityProjects.length===0 && <p className="text-[0.82rem] text-sand-500 py-6 text-center">No learning or project work is visible to you yet.</p>}
        </div></div>
      </>
    );
  } else if (state.communityTab === 'happening') {
    body = (
      <>
        {banner}
        {isActiveMember && <CommunityHomeTabs tab={state.communityTab} onSelect={tab => void controller.showCommunityTab(tab)} />}
        <div className="flex-1 overflow-y-auto"><div className="max-w-2xl mx-auto px-4 md:px-6 py-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-display text-lg text-forest-800 font-medium">Happening</h2><p className="text-[0.8rem] text-sand-500">Meet, teach, hike, serve and gather. RSVP is a plan, not a contractual commitment.</p></div>
            <button onClick={() => setPurposeCreate(purposeCreate === 'event' ? null : 'event')} className="text-[0.75rem] font-medium text-forest-600">+ Event</button>
          </div>
          {purposeCreate === 'event' && (
            <div className="rounded-2xl border border-cream-200 bg-white px-4 py-4 space-y-2">
              <input value={eventDraft.title} onChange={e => setEventDraft(d => ({...d,title:e.target.value}))} placeholder="Event title" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem]" />
              <textarea value={eventDraft.description} onChange={e => setEventDraft(d => ({...d,description:e.target.value}))} placeholder="What is happening?" rows={3} className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem]" />
              <input type="datetime-local" value={eventDraft.startsAt} onChange={e => setEventDraft(d => ({...d,startsAt:e.target.value}))} className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem]" />
              <input value={eventDraft.locationLabel} onChange={e => setEventDraft(d => ({...d,locationLabel:e.target.value}))} placeholder="Location (optional)" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.82rem]" />
              <button
                disabled={purposeSubmitting || !eventDraft.title.trim() || !eventDraft.description.trim() || !eventDraft.startsAt}
                onClick={() => {
                  setPurposeSubmitting(true); setPurposeError(null);
                  void communityGateway.events.create({
                    title: eventDraft.title.trim(), description: eventDraft.description.trim(),
                    startsAt: new Date(eventDraft.startsAt).toISOString(),
                    locationLabel: eventDraft.locationLabel.trim() || null,
                  }).then(created => {
                    setCommunityEvents(items => [...items, created].sort((a,b) => a.startsAt.localeCompare(b.startsAt)));
                    setEventDraft({ title: '', description: '', startsAt: '', locationLabel: '' });
                    setPurposeCreate(null);
                  }).catch(error => setPurposeError(errorText(error))).finally(() => setPurposeSubmitting(false));
                }}
                className="w-full rounded-xl bg-forest-600 text-cream-50 text-[0.8rem] font-medium py-2.5 disabled:opacity-50"
              >Create event</button>
            </div>
          )}
          {purposeLoading && <p className="text-[0.8rem] text-sand-500">Loading…</p>}
          {purposeError && <p role="alert" className="text-[0.8rem] text-red-600">{purposeError}</p>}
          {!purposeLoading && !purposeError && communityEvents.length===0 && <p className="text-[0.82rem] text-sand-500 py-6 text-center">Nothing is scheduled yet.</p>}
          {communityEvents.map(event => <div key={event.id} className="rounded-2xl border border-cream-200 bg-white px-4 py-3">
            <div className="text-[0.9rem] font-medium text-forest-800">{event.title}</div><p className="text-[0.78rem] text-sand-600 mt-1">{event.description}</p>
            <div className="text-[0.68rem] text-sand-500 mt-2">{new Date(event.startsAt).toLocaleString()}{event.locationLabel ? ` · ${event.locationLabel}` : ''} · {event.goingCount} going</div>
            <button onClick={() => void communityGateway.events.rsvp(event.id,true).then(updated => setCommunityEvents(items => items.map(x => x.id===updated.id?updated:x)))} className="mt-3 text-[0.75rem] font-medium text-forest-600">I'm going</button>
          </div>)}
        </div></div>
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
          onDiscover={() => void controller.showCommunityTab('discover')}
          invitations={state.circleInvitations.status === 'ready' ? state.circleInvitations.data : []}
          invitationsLoading={state.circleInvitations.status === 'loading'}
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
          onRetry={() => void controller.submitDiscoverCirclesQuery()}
          query={state.discoverCirclesQuery}
          onQueryChange={q => controller.setDiscoverCirclesQuery(q)}
        />
      </>
    );
  } else {
    body = (
      <>
        {banner}
        {isActiveMember && <CommunityHomeTabs tab={state.communityTab} onSelect={tab => void controller.showCommunityTab(tab)} />}
        <TrustProjectImpactHome
          gateway={communityGateway}
          activeMember={isActiveMember}
          onOpenCircles={() => void controller.showCommunityTab('circles')}
          onJoin={onJoinTrustProject}
          onOpenVision={() => onNavigate('vision-board')}
        />
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
          onOpenCircles={onOpenCircle}
          showSearch={false}
          // Phase 6 Slice 6 (Production Convergence) -- renamed from "Your Circle profile" (originally
          // chosen back when no named-Circle authority existed at all). Named Circles ("Your Circles"/
          // "Discover Circles", the CommunityHomeTabs directly above this screen) are now a real
          // product surface, so reusing the word "Circle" here for this completely separate per-
          // identity referral/growth summary was a genuine terminology collision on the SAME screen.
          // See CircleExperience.tsx for the matching destination-page rename; this card still routes
          // to that same, unrenamed backend surface (`GET /api/v1/circle/me`) -- only the label changed.
          circlesEntryLabel="Your network activity"
          circlesEntryDescription="Referrals, agreements brought in, and growth credit. Not a named Circle or group."
          // Phase 6 -- the real feed (Questions/Needs/Opportunities/Work Stories/Discussions) is shown
          // only to an ACTIVE Trust Project member; this inline box still searches Store offers only,
          // copy says exactly that, never more. Real Community/Circle/People search now exists as its
          // own dedicated entry point (Slice 5, Section 28-29) -- see the "Search Community" button.
          searchPlaceholder="Search store offers by category or location..."
          noResultsMessage={`No store offers found for "${state.query}".`}
          heading="Community activity"
          description="Questions, needs, discussions, work stories and Store references."
          composerLabel="Start a question, need or discussion"
          composerDescription="Use a Project Contribution above for experiences, criticism, reflection, art and longer-form stories."
        />
      </>
    );
  }

  return (
    <div className={`sp-life-canvas min-h-dvh flex flex-col ${navPadding}`}>
      <NavBar view={'community' as AppView} onNavigate={onNavigate} />
      {state.notice && (
        <div className="px-4 py-2">
          <StatusNotice tone="info" icon={false}>
            {state.notice} <button onClick={() => controller.dismissNotice()} className="underline">Dismiss</button>
          </StatusNotice>
        </div>
      )}
      {reportOpen && state.selectedRealObject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/30 backdrop-blur-sm" onClick={() => !moderationBusy && setReportOpen(false)}>
          <div className="w-full max-w-sm mx-4 rounded-2xl bg-white shadow-deliberate px-5 py-5" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-base text-forest-800">Report this Community post</h2>
            <p className="text-[0.75rem] text-sand-600 mt-1">A report asks for review. It does not automatically remove the post or change anyone's account.</p>
            <select value={reportReason} onChange={e => setReportReason(e.target.value as typeof reportReason)}
              className="mt-3 w-full rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5 text-[0.82rem] text-forest-800">
              <option value="SAFETY">Safety</option><option value="HARASSMENT">Harassment</option>
              <option value="SPAM">Spam</option><option value="MISLEADING">Misleading</option>
              <option value="PRIVACY">Privacy</option><option value="OTHER">Other</option>
            </select>
            <textarea value={reportDetails} onChange={e => setReportDetails(e.target.value)} rows={3}
              placeholder="Optional details"
              className="mt-2 w-full rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5 text-[0.82rem] text-forest-800 resize-none" />
            <div className="mt-3 flex gap-2">
              <button disabled={moderationBusy} onClick={() => {
                setModerationBusy(true);
                void communityGateway.moderation.report(state.selectedRealObject!.id, reportReason, reportDetails || null).then(() => {
                  setModerationBusy(false); setReportOpen(false); setReportDetails('');
                  controller.showNotice('Report sent for review.');
                }).catch(error => { setModerationBusy(false); controller.showNotice(errorText(error)); });
              }} className="rounded-xl bg-forest-600 px-4 py-2 text-[0.8rem] font-medium text-cream-50 disabled:opacity-50">
                {moderationBusy ? 'Sending…' : 'Send report'}
              </button>
              <button disabled={moderationBusy} onClick={() => setReportOpen(false)} className="rounded-xl border border-cream-200 px-4 py-2 text-[0.8rem] text-forest-700">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {state.inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/30 backdrop-blur-sm" onClick={() => controller.cancelInvite()}>
          <div className="w-full max-w-sm mx-4 rounded-2xl bg-white shadow-deliberate px-5 py-5" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-base text-forest-800 mb-1">Invite someone</h2>
            <p className="text-[0.75rem] text-sand-600 mb-3">
              Invite someone you believe would add something useful to a community that chooses to trade fairly. An invitation is not a referral, and recruiting members earns nothing automatically.
            </p>
            {inviteMode === 'choose' && (
              <div className="space-y-2">
                <button onClick={() => setInviteMode('ks')} className="w-full min-h-11 rounded-xl border border-cream-200 px-4 text-left text-[0.85rem] font-medium text-forest-800 hover:bg-cream-50">
                  They already have a KS Number
                </button>
                <button onClick={() => setInviteMode('share')} className="w-full min-h-11 rounded-xl border border-cream-200 px-4 text-left text-[0.85rem] font-medium text-forest-800 hover:bg-cream-50">
                  Share an invitation
                </button>
                <button onClick={() => controller.cancelInvite()} className="w-full min-h-11 rounded-xl text-[0.82rem] text-forest-700 hover:bg-cream-50">Cancel</button>
              </div>
            )}
            {inviteMode === 'share' && <ShareInvitation interest="member" onClose={() => controller.cancelInvite()} />}
            {inviteMode === 'ks' && <>
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
            </>}
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
            <p className="text-[0.68rem] font-medium text-sand-500 uppercase tracking-wide mb-1">How do people join?</p>
            {state.createCircleDraft.visibility === 'PRIVATE' ? (
              // Final pre-merge correction pass: a PRIVATE Circle is server-enforced as INVITE_ONLY-
              // only, so the mode choice is locked and hidden rather than offered only to fail once
              // submitted -- see CommunityCircleService#create's own doctrine comment.
              <div className="mb-3">
                <div className="w-full text-center text-[0.7rem] font-medium rounded-lg px-2 py-1.5 bg-forest-600 text-cream-50">
                  {CIRCLE_MODE_LABEL.INVITE_ONLY}
                </div>
                <p className="text-[0.68rem] text-sand-500 mt-1">
                  Private Circles are invite-only. Only people you invite can find and join them.
                </p>
              </div>
            ) : (
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
            )}
            {/* Correction (Slice 3 pre-merge completion pass): visibility is a SEPARATE choice from
                membership mode -- "who can find this Circle?" vs. "how do people join?". */}
            <p className="text-[0.68rem] font-medium text-sand-500 uppercase tracking-wide mb-1">Who can find this Circle?</p>
            <div className="flex gap-1.5 mb-3">
              {([
                { value: 'PUBLIC' as CircleVisibility, label: 'Public', description: 'Anyone in The Trust Project can discover it.' },
                { value: 'PRIVATE' as CircleVisibility, label: 'Private', description: 'Only invited/connected members can see it.' },
              ]).map(v => (
                <button
                  key={v.value}
                  onClick={() => controller.setCreateCircleVisibility(v.value)}
                  title={v.description}
                  className={`flex-1 text-[0.7rem] font-medium rounded-lg px-2 py-1.5 transition-colors ${
                    state.createCircleDraft.visibility === v.value ? 'bg-forest-600 text-cream-50' : 'bg-cream-50 text-forest-700 hover:bg-cream-100'
                  }`}
                >
                  {v.label}
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
      {state.circleInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/30 backdrop-blur-sm" onClick={() => controller.cancelCircleInvite()}>
          <div className="w-full max-w-sm mx-4 rounded-2xl bg-white shadow-deliberate px-5 py-5" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-base text-forest-800 mb-1">Invite someone</h2>
            <p className="text-[0.75rem] text-sand-500 mb-3">
              Invite an existing Trust Project member into this Circle.
            </p>
            <input
              type="text"
              value={state.circleInviteDraft.ksNumber}
              onChange={e => controller.setCircleInviteKsNumber(e.target.value)}
              readOnly={state.circleInviteDraft.attemptedTargetKsNumber !== null}
              placeholder="Their KS Number (e.g. KS123)"
              className={`w-full rounded-xl border border-cream-200 px-3 py-2.5 text-[0.85rem] placeholder:text-sand-400 focus:outline-none focus:border-forest-300 mb-2 ${
                state.circleInviteDraft.attemptedTargetKsNumber !== null ? 'bg-cream-100 text-sand-500' : 'bg-white text-forest-800'
              }`}
            />
            {state.circleInviteDraft.attemptedTargetKsNumber !== null && (
              <p className="text-[0.72rem] text-sand-500 mb-2">Retry this invitation, or cancel to invite someone else.</p>
            )}
            {state.circleInviteDraft.error && <p role="alert" className="text-[0.75rem] text-red-600 mb-2">{state.circleInviteDraft.error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => void controller.submitCircleInvite()}
                disabled={state.circleInviteDraft.submitting}
                className="flex-1 rounded-xl bg-forest-600 text-cream-50 text-[0.82rem] font-medium py-2.5 hover:bg-forest-700 transition-colors disabled:opacity-60"
              >
                {state.circleInviteDraft.submitting
                  ? 'Sending…'
                  : state.circleInviteDraft.attemptedTargetKsNumber !== null ? 'Retry invitation' : 'Send invitation'}
              </button>
              <button onClick={() => controller.cancelCircleInvite()} className="rounded-xl border border-cream-200 text-forest-700 text-[0.82rem] font-medium px-4 py-2.5 hover:bg-cream-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {state.circleCloseConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/30 backdrop-blur-sm" onClick={() => controller.cancelCircleCloseConfirm()}>
          <div className="w-full max-w-sm mx-4 rounded-2xl bg-white shadow-deliberate px-5 py-5" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-base text-forest-800 mb-1">Close this Circle?</h2>
            <p className="text-[0.75rem] text-sand-500 mb-4">
              Closing stops new Circle activity. Existing posts and membership history are preserved.
              Members do not leave The Trust Project.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => void controller.confirmCloseCircle()}
                disabled={state.circleClosing}
                className="flex-1 rounded-xl bg-forest-600 text-cream-50 text-[0.82rem] font-medium py-2.5 hover:bg-forest-700 transition-colors disabled:opacity-60"
              >
                {state.circleClosing ? 'Closing…' : 'Close Circle'}
              </button>
              <button onClick={() => controller.cancelCircleCloseConfirm()} className="rounded-xl border border-cream-200 text-forest-700 text-[0.82rem] font-medium px-4 py-2.5 hover:bg-cream-50 transition-colors">
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
