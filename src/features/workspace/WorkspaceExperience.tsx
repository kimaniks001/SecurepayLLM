import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { NavBar } from '../../components/NavBar';
import { SignedInHome } from '../../components/SignedInHome';
import { AgreementHub } from '../../components/AgreementHub';
import { AgreementDetail } from '../../components/AgreementDetail';
import { MoneyWorkspace } from '../../components/MoneyWorkspace';
import { MoneyUnavailableState } from '../../components/MoneyUnavailableState';
import { ErrorStateCard } from '../../components/ErrorState';
import type { AgreementGateway } from '../../api/securepay/agreements';
import { InvitePanel } from '../invitations/InvitePanel';
import { createInviteController } from '../invitations/controller';
import type { AgentGateway } from '../../api/securepay/agent';
import type { MoneyGateway } from '../../api/securepay/money';
import type { AppView, ErrorStateResponse } from '../../types';
import { createWorkspaceController, errorText } from './controller';
import { agreementCalendarView, agreementDetailView, agreementNextView, agreementProgressView, attentionItemsFromHub, conflictSeverityLabel, hubAgreementSummaries, moneyByCurrencyView, moneyDetailView, problemsView, recentActivityView, upcomingHomeEventsView, waitingItemsFromHub } from './view';
import type { AgentController } from '../agent/controller';

type Gateway = Pick<AgreementGateway,
  'currentUserActions' | 'hub' | 'home' | 'detail' | 'confirmations' | 'milestoneEffectiveStates' | 'propose' | 'invitations' | 'revokeInvitation' | 'issueInvitation'
  | 'calendarEvents' | 'calendarConflicts' | 'tagsForAgreement' | 'tagAgreement' | 'untagAgreement' | 'myCalendar'
> & {
  money: Pick<MoneyGateway, 'status' | 'records'>;
};

type AgentAskGateway = Pick<AgentGateway, 'switchAccessGrant'>;

/**
 * There is no verified authenticated display-name contract, so real mode must never claim a
 * person's name. Final Phase 3 correction (Section 22): now that the signed-in turn carries the
 * caller's own session (auth: 'optional' on submitTurn) and `read_my_agreements_home` is wired
 * into the real orchestrator for FORMATION conversations, these prompts route to genuinely
 * answerable, authorized questions about the person's own Agreements -- never a claim SecurePay
 * remembers anything outside that real, authorized context.
 */
const realGreeting = 'Welcome back';
const realSubheading = 'Ask anything, or start something new.';
const realSuggestedPrompts = ['What needs me today?', 'What changed recently?', "What's happening this week?", 'Show my Agreements tagged Home'];

function errorStateView(message: string): ErrorStateResponse {
  return { type: 'ERROR_STATE', title: 'SecurePay could not load this', text: message, primaryLabel: 'Try again', primaryValue: 'retry' };
}

function LoadingNotice({ text }: { text: string }) {
  return <p role="status" className="text-sm text-sand-500 text-center py-10">{text}</p>;
}

/**
 * Signed-in Home → Agreement Hub → Agreement Detail → Money for a selected Agreement. Every screen
 * renders exactly the backend's own truth (see controller.ts / view.ts); this component only wires
 * locked Bolt components to that truth and to navigation — it derives no Agreement or Money state.
 *
 * `initialAgreementId` is only a one-shot navigation restoration hint. The component never trusts it
 * as Agreement truth: it first loads the authoritative Hub and only opens the id when that Hub contains
 * it. Once consumed, normal Home/Hub/Detail navigation is no longer influenced by the hint.
 */
export function WorkspaceExperience({ gateway, agentGateway, agentController, initialAgreementId, onOpenStore, onOpenReferral, onOpenProjects, onOpenVisionBoard, onLeave }: {
  gateway: Gateway;
  /** Final Phase 3 correction (Sections 9/13): the ONE persistent SecurePay conversation, shared
   * with the main signed-in Agent experience -- never a second, separate mini-conversation.
   * Optional so this component still renders for any caller not yet wired with an Agent. */
  agentGateway?: AgentAskGateway;
  agentController?: Pick<AgentController, 'getSnapshot' | 'subscribe' | 'ensureConversationId' | 'send'>;
  initialAgreementId?: string | null;
  onOpenStore?: () => void;
  onOpenReferral?: (agreementId: string) => void;
  /** Final Completion Phase 5A -- private Projects organization view. Optional, mirroring onOpenStore. */
  onOpenProjects?: () => void;
  /** Final Completion Phase 5B -- private Vision Board operating memory. Optional, mirroring onOpenProjects. */
  onOpenVisionBoard?: () => void;
  onLeave: (startText?: string) => void;
}) {
  const [controller] = useState(() => createWorkspaceController(gateway));
  // One invite controller per selected Agreement; its in-memory state (incl. an unshared link) survives quiet refreshes.
  const [invites] = useState(() => new Map<string, ReturnType<typeof createInviteController>>());
  const inviteFor = (agreementId: string) => {
    let c = invites.get(agreementId);
    if (!c) { c = createInviteController(gateway, agreementId, window.location.origin, () => void controller.reloadDetailQuietly()); invites.set(agreementId, c); }
    return c;
  };
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const agentState = useSyncExternalStore(
    agentController?.subscribe ?? (() => () => {}),
    agentController?.getSnapshot ?? (() => null),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  // Final Phase 3 correction (Section 14): the underlying conversation is never restarted just
  // because a different Agreement is opened -- this only narrows WHICH already-shared turns this
  // panel displays, to the ones that happened since this exact Agreement was opened.
  const [turnsBaseline, setTurnsBaseline] = useState(0);
  const restorationConsumed = useRef(false);

  /**
   * Real "Ask SecurePay" from inside an Agreement (Final Phase 3 completion): an explicit,
   * idempotent access-grant transition (Section 6) establishes/confirms this conversation's
   * bounded authority for this exact Agreement, then the typed question is submitted as a REAL
   * turn on the SAME persistent conversation -- the backend's own orchestrator decides whether
   * `read_agreement_workspace` is useful for this specific question and returns a real, structured
   * AGREEMENT_WORKSPACE artifact when it is (see AgentUnderstoodCard). Nothing here fabricates an
   * answer; a missing agentController/agentGateway fails honestly rather than pretending to ask.
   */
  async function askAgentAboutAgreement(agreementId: string, question: string) {
    if (!agentGateway || !agentController) {
      setAskError('SecurePay cannot answer from here yet.');
      return;
    }
    setAskError(null);
    try {
      const conversationId = await agentController.ensureConversationId();
      await agentGateway.switchAccessGrant(conversationId, agreementId);
      await agentController.send(question);
    } catch (error) {
      setAskError(errorText(error));
    }
  }

  useEffect(() => { controller.enter(); }, [controller]);
  useEffect(() => {
    if (restorationConsumed.current || !initialAgreementId || state.hub.status !== 'ready') return;
    restorationConsumed.current = true;
    controller.openFromHome(initialAgreementId);
  }, [controller, initialAgreementId, state.hub.status]);
  useEffect(() => {
    setAskError(null);
    setTurnsBaseline(agentState?.turns.length ?? 0);
    // Only re-baseline when the selected Agreement actually changes -- not on every agentState tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedAgreementId]);

  const visibleAgentTurns = (agentState?.turns ?? []).slice(turnsBaseline);
  const askResponses = visibleAgentTurns
    .filter((turn): turn is Extract<typeof turn, { sender: 'agent' }> => turn.sender === 'agent')
    .map(turn => ({ text: turn.response.message.text }));
  if (askError) askResponses.push({ text: askError });
  const askStructured = [...visibleAgentTurns].reverse()
    .flatMap(turn => (turn.sender === 'agent' ? turn.response.components : []))
    .find((component): component is Extract<typeof component, { type: 'AGREEMENT_WORKSPACE' }> => component.type === 'AGREEMENT_WORKSPACE')
    ?.workspace ?? null;
  const askBusy = agentState?.busy ?? false;

  const navBarView: AppView = state.view === 'home' ? 'signed-in' : state.view === 'hub' ? 'agreements' : state.view === 'detail' ? 'agreement-detail' : 'money';
  const handleNavigate = (view: AppView) => {
    setNotice(null);
    if (view === 'signed-in') controller.goHome();
    else if (view === 'agreements') controller.goHub();
    else if (view === 'money') setNotice('Open Money from a specific agreement to view it.');
    else if (view === 'store' && onOpenStore) onOpenStore();
    else if (view === 'projects' && onOpenProjects) onOpenProjects();
    else if (view === 'vision-board' && onOpenVisionBoard) onOpenVisionBoard();
    else setNotice('This area is not available yet.');
  };

  let body: React.ReactNode;

  if (state.view === 'home') {
    if (state.hub.status === 'error') body = <div className="p-6"><ErrorStateCard data={errorStateView(errorText(state.hub.error))} onChoice={() => controller.goHome()} /></div>;
    else if (state.hub.status !== 'ready') body = <LoadingNotice text="Loading your SecurePay agreements…" />;
    else {
      body = (
        <SignedInHome
          onStart={text => onLeave(text)}
          greeting={realGreeting}
          subheading={realSubheading}
          suggestedPrompts={realSuggestedPrompts}
          attentionItems={attentionItemsFromHub(state.hub.data.changedReviewRequired, state.hub.data.needsMe)}
          waitingItems={waitingItemsFromHub(state.hub.data.waitingOnOthers)}
          upcomingEvents={upcomingHomeEventsView(state.hub.data, state.myCalendarEvents)}
          // Final Phase 3 correction (Section 9): real cross-Agreement facts from
          // GET /api/v1/me/agreements/home, never fabricated -- best-effort, defaults to empty.
          recentActivity={recentActivityView(state.homeExtras.recentActivity)}
          problems={problemsView(state.homeExtras.problems)}
          moneyByCurrency={moneyByCurrencyView(state.homeExtras.moneyByCurrency)}
          onOpenAgreement={id => controller.openFromHome(id)}
          onNavigateAgreements={() => controller.goHub()}
        />
      );
    }
  } else if (state.view === 'hub') {
    if (state.hub.status === 'error') body = <div className="p-6"><ErrorStateCard data={errorStateView(errorText(state.hub.error))} onChoice={() => controller.goHub()} /></div>;
    else if (state.hub.status !== 'ready') body = <LoadingNotice text="Loading your agreements…" />;
    else {
      const agreements = hubAgreementSummaries(state.hub.data);
      body = <AgreementHub agreements={agreements} onOpenAgreement={id => controller.openFromHub(id)} onOpenTakingShape={id => controller.openFromHub(id)} />;
    }
  } else if (state.view === 'detail') {
    if (state.detail.status === 'error') body = <div className="p-6"><ErrorStateCard data={errorStateView(errorText(state.detail.error))} onChoice={() => controller.backToHub()} /></div>;
    else if (state.detail.status !== 'ready') body = <LoadingNotice text="Loading this agreement…" />;
    else if (state.selectedStatus && state.selectedCompletion) {
      const { dto, confirmations, milestoneStates, events, conflicts, tags } = state.detail.data;
      const boltDetail = agreementDetailView(dto, confirmations, state.selectedStatus, state.selectedCompletion);
      const progress = agreementProgressView(dto, milestoneStates);
      const calendarEvents = agreementCalendarView(events);
      const eventTitleById = new Map(events.map(e => [e.id, e.title]));
      const conflictViews = conflicts.map(c => ({
        firstEventId: c.firstEventId,
        secondEventId: c.secondEventId,
        isViolation: c.severity === 'EXPLICIT_EXCLUSIVITY_VIOLATION',
        label: `${conflictSeverityLabel(c.severity)}: ${eventTitleById.get(c.firstEventId) ?? 'an event'} and ${eventTitleById.get(c.secondEventId) ?? 'another event'}`,
      }));
      const tagViews = tags.map(t => ({ id: t.id, label: t.label }));
      // Detail's inline Money summary never claims a financial next action: doing so would require
      // either a fresh authoritative /me/actions read on every Detail load (duplicating Money's own
      // fetch) or reusing a cache that can go stale the moment a fresh refresh fails elsewhere. The
      // dedicated Money view (via "Open Money") already refetches /me/actions fresh on every open and
      // is the sole place the Fund affordance is gated from real, current authority.
      const money = dto.money.status === 'NO_EVALUATION_YET' || dto.money.status === 'READY' || dto.money.status === 'NOT_READY' || dto.money.status === 'PARTIALLY_READY' || dto.money.status === 'BLOCKED'
        ? moneyDetailView({
            agreementId: boltDetail.id, agreementTitle: boltDetail.title, agreementVersion: boltDetail.version,
            currency: dto.overview.currency, amountMinor: dto.overview.proposedAmountMinor,
            readiness: dto.money.status, outstandingReasons: dto.money.outstandingReasons, moneyRecordCount: dto.money.moneyRecordCount,
            records: [], fundActionAvailable: false,
          })
        : null; // An unrecognized status fails closed to no Money summary rather than a guessed one.
      body = (
        <AgreementDetail
          detail={boltDetail}
          onBack={() => controller.backToHub()}
          onAskAgent={text => void askAgentAboutAgreement(boltDetail.id, text)}
          isThinking={askBusy}
          agentResponses={askResponses}
          understoodWorkspace={askStructured}
          isStale={state.selectedStatus === 'change_requested'}
          viewedVersion={state.selectedStatus === 'change_requested' ? 'a previous version' : undefined}
          onViewCurrent={state.selectedStatus === 'change_requested' ? () => void controller.refreshDetail() : undefined}
          onRaiseIssue={undefined}
          onOpenMoney={() => void controller.openMoney(boltDetail.id)}
          onOpenReferral={onOpenReferral ? () => onOpenReferral(boltDetail.id) : undefined}
          money={money}
          progress={progress}
          next={agreementNextView(state.selectedAgreementNextActions)}
          events={calendarEvents}
          conflicts={conflictViews}
          tags={tagViews}
          onAddTag={label => void controller.addTag(label)}
          onRemoveTag={tagId => void controller.removeTag(tagId)}
          peopleExtra={<InvitePanel controller={inviteFor(boltDetail.id)} agreementStatus={dto.overview.status} isCreator={state.selectedActorStatus === 'CREATOR'} />}
        />
      );
    }
  } else {
    if (state.money.status === 'error') body = <div className="p-6"><ErrorStateCard data={errorStateView(errorText(state.money.error))} onChoice={() => controller.backFromMoney()} /></div>;
    else if (state.money.status !== 'ready') body = <LoadingNotice text="Loading Money…" />;
    else if (state.money.data.kind === 'unavailable') {
      body = <div className="p-6"><MoneyUnavailableState message={state.money.data.message} onViewAgreement={() => controller.backFromMoney()} /></div>;
    } else {
      const context = state.detail.status === 'ready' ? state.detail.data.dto : null;
      const { readiness, outstandingReasons, records, fundActionAvailable } = state.money.data;
      const detail = moneyDetailView({
        agreementId: state.selectedAgreementId ?? '',
        agreementTitle: context?.overview.title ?? 'This agreement',
        agreementVersion: context?.currentVersion ? `v${context.currentVersion.versionNumber}` : '—',
        currency: context?.overview.currency ?? '', amountMinor: context?.overview.proposedAmountMinor ?? null,
        readiness, outstandingReasons, moneyRecordCount: records.length, records, fundActionAvailable,
      });
      body = (
        <MoneyWorkspace
          detail={detail}
          onBack={() => controller.backFromMoney()}
          fundingFlowEnabled={false}
        />
      );
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <NavBar view={navBarView} onNavigate={handleNavigate} />
      {/* Final Completion Phase 5A/5B -- private Projects organization and private Vision Board
          operating memory, one tap from Home/Agreements. Own markup, not part of any locked Bolt
          component, so it never affects fixture parity. */}
      {(state.view === 'home' || state.view === 'hub') && (onOpenProjects || onOpenVisionBoard) && (
        <div className="px-4 md:px-6 py-2 border-b border-cream-200/60 bg-cream-50/50 flex justify-end gap-4">
          {onOpenProjects && <button onClick={onOpenProjects} className="text-[0.8rem] text-forest-700 underline">My Projects</button>}
          {onOpenVisionBoard && <button onClick={onOpenVisionBoard} className="text-[0.8rem] text-forest-700 underline">My Vision Board</button>}
        </div>
      )}
      {notice && <div role="status" className="px-4 py-2 text-sm text-sand-600 bg-cream-50">{notice} <button onClick={() => setNotice(null)} className="underline">Dismiss</button></div>}
      <div className="flex-1 flex flex-col overflow-hidden">{body}</div>
    </div>
  );
}
