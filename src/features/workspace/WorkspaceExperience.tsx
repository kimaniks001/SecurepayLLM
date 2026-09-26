import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { NavBar } from '../../components/NavBar';
import { SignedInHome } from '../../components/SignedInHome';
import { TrustProjectSection } from '../../components/TrustProjectSection';
import type { TrustProjectMembershipFact } from '../../components/trustProject';
import { AgreementHub } from '../../components/AgreementHub';
import { AgreementDetail } from '../../components/AgreementDetail';
import { MoneyDoorway } from '../money/MoneyDoorway';
import { openMoneyFor } from '../money/handoff';
import { ErrorStateCard } from '../../components/ErrorState';
import type { AgreementGateway } from '../../api/securepay/agreements';
import { InvitePanel } from '../invitations/InvitePanel';
import { AgreementSecureLinkSection } from '../securelink/AgreementSecureLinkSection';
import { createInviteController } from '../invitations/controller';
import { ChangesPanel } from '../amendments/ChangesPanel';
import { ReconfirmPanel, ownStanding } from '../amendments/ReconfirmPanel';
import { createAmendmentsController } from '../amendments/controller';
import { createReconfirmController } from '../amendments/reconfirm';
import { ProgressPanel } from '../execution/ProgressPanel';
import { ReviewPanel } from '../review/ReviewPanel';
import { peekDetailTabHint, clearDetailTabHint } from '../support/tabHint';
import type { SupportContext } from '../support/context';
import type { AgreementReviewGateway } from '../../api/securepay/agreement-review';
import { createExecutionController } from '../execution/controller';
import type { AgentGateway } from '../../api/securepay/agent';
import type { MoneyGateway } from '../../api/securepay/money';
import type { AppView, ErrorStateResponse } from '../../types';
import { createWorkspaceController, errorText } from './controller';
import { agreementCalendarView, agreementDetailView, agreementNextView, agreementProgressView, attentionItemsFromHub, conflictSeverityLabel, hubAgreementSummaries, invitationsForYouView, moneyByCurrencyView, moneyDetailView, problemsView, recentActivityView, upcomingHomeEventsView, waitingItemsFromHub } from './view';
import type { AgentController } from '../agent/controller';

type Gateway = Pick<AgreementGateway,
  'currentUserActions' | 'hub' | 'home' | 'detail' | 'confirmations' | 'confirmationStatus' | 'milestoneEffectiveStates' | 'propose' | 'invitations' | 'revokeInvitation' | 'issueInvitation' | 'lookupInvitationTargetByKsNumber' | 'people' | 'amendments' | 'amendmentDiff' | 'amendmentOverview' | 'acceptAmendment' | 'rejectAmendment' | 'withdrawAmendment' | 'versions' | 'version' | 'confirmVersion' | 'obligations' | 'obligationCompletionStatus' | 'startObligation' | 'completeObligation' | 'obligationEvidence' | 'submitEvidence' | 'reviewEvidence' | 'myNextActions'
  | 'calendarEvents' | 'calendarConflicts' | 'tagsForAgreement' | 'tagAgreement' | 'untagAgreement' | 'myCalendar' | 'myInvitations'
  // KS001 Upgrade Phase 5 continuation (Slice 4, UR-148) -- the persistent Agreement workspace
  // SecureLink entry point (AgreementSecureLinkSection) needs these; every real caller already passes
  // the full AgreementGateway through here (see AgentExperience.tsx's own workspaceGateway), so this
  // only widens the TYPE this component declares itself needing, not the authority granted anywhere.
  | 'activateProduct' | 'issuePublicLocator' | 'activeLocator' | 'rotatePublicLocator' | 'revokePublicLocator'
  // KS001 Upgrade Phase 5 continuation (Slice 5, UR-150) -- same widening, for the new pre-activation
  // public doorway entry point.
  | 'issuePublicDoorway' | 'activeDoorway' | 'rotatePublicDoorway' | 'revokePublicDoorway'
  // Phase 6 Slice 4 (Community → Trade), item 19 -- the participant-safe source-provenance read.
  | 'source'
> & {
  money: Pick<MoneyGateway, 'status' | 'records'>;
  review: Pick<AgreementReviewGateway, 'list' | 'detail' | 'evidence' | 'acknowledge' | 'respond'>;
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
export function WorkspaceExperience({ onOpenSupport, gateway, agentGateway, agentController, initialAgreementId, onOpenStore, onOpenReferral, onOpenProjects, onOpenVisionBoard, onOpenCommunity, trustProjectMembership = null, onLeave }: {
  /** Help & Support, scoped by the minimum this screen already showed. Optional, mirroring onOpenStore. */
  onOpenSupport?: (context: SupportContext) => void;
  gateway: Gateway;
  /** Final Phase 3 correction (Sections 9/13): the ONE persistent SecurePay conversation, shared
   * with the main signed-in Agent experience -- never a second, separate mini-conversation.
   * Optional so this component still renders for any caller not yet wired with an Agent. */
  agentGateway?: AgentAskGateway;
  agentController?: Pick<AgentController, 'getSnapshot' | 'subscribe' | 'ensureConversationId' | 'send'>;
  initialAgreementId?: string | null;
  onOpenStore?: () => void;
  /** Phase 7 Slice 5B -- the real Community view (the Trust Project doorway and the nav item). Optional, mirroring onOpenStore. */
  onOpenCommunity?: () => void;
  /** Phase 7 Slice 5B -- the signed-in person's own membership + canonical KS Number; null when not known. */
  trustProjectMembership?: TrustProjectMembershipFact | null;
  onOpenReferral?: (agreementId: string) => void;
  /** Final Completion Phase 5A -- private Projects organization view. Optional, mirroring onOpenStore. */
  onOpenProjects?: () => void;
  /** Final Completion Phase 5B -- private Vision Board operating memory. Optional, mirroring onOpenProjects. */
  onOpenVisionBoard?: () => void;
  onLeave: (startText?: string) => void;
}) {
  const [controller] = useState(() => createWorkspaceController(gateway));
  // One-shot navigation hint from Help ("Reviews & issues"): captured at mount, cleared right after. Never Agreement truth.
  const [tabHint] = useState(() => peekDetailTabHint());
  useEffect(() => { clearDetailTabHint(); }, []);
  // One invite controller per selected Agreement; its in-memory state (incl. an unshared link) survives quiet refreshes.
  const [invites] = useState(() => new Map<string, ReturnType<typeof createInviteController>>());
  const [amendmentControllers] = useState(() => new Map<string, ReturnType<typeof createAmendmentsController>>());
  const [reconfirmControllers] = useState(() => new Map<string, ReturnType<typeof createReconfirmController>>());
  const [executionControllers] = useState(() => new Map<string, ReturnType<typeof createExecutionController>>());
  const executionFor = (agreementId: string) => {
    let c = executionControllers.get(agreementId);
    if (!c) {
      const detailNow = () => { const d = controller.getSnapshot().detail; return d.status === 'ready' ? d.data : null; };
      c = createExecutionController(
        gateway, agreementId,
        () => detailNow()?.dto.currentVersion?.versionId ?? null,
        () => { const rows = detailNow()?.myConfirmation; return rows && rows.length === 1 ? rows[0].participantId : null; },
        async () => { await Promise.all([controller.reloadDetailQuietly(), controller.refreshSummary()]); },
      );
      executionControllers.set(agreementId, c);
    }
    return c;
  };
  const amendmentsFor = (agreementId: string) => {
    let c = amendmentControllers.get(agreementId);
    if (!c) {
      c = createAmendmentsController(gateway, agreementId, () => controller.reloadDetailQuietly());
      amendmentControllers.set(agreementId, c);
    }
    return c;
  };
  const reconfirmFor = (agreementId: string) => {
    let c = reconfirmControllers.get(agreementId);
    if (!c) { c = createReconfirmController(gateway, agreementId, () => void controller.reloadDetailQuietly()); reconfirmControllers.set(agreementId, c); }
    return c;
  };
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
    else if (view === 'community' && onOpenCommunity) onOpenCommunity();
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
          invitations={invitationsForYouView(state.myInvitations)}
          onOpenAgreement={id => controller.openFromHome(id)}
          onNavigateAgreements={() => controller.goHub()}
          // PHASE 4 NEXT SLICE (Section 7) — same hash-route seam AgentExperience already uses for
          // `#/money`; RuntimeApp's own useMyInvitationRoute picks this up and mounts the existing
          // RecipientExperience by invitation id, never a Home-specific detail page.
          onReviewInvitation={invitationId => { window.location.hash = `#/my-invitations/${encodeURIComponent(invitationId)}`; }}
          // KS001 Upgrade Phase 4 final convergence (Section 4) -- the same top-level hash-route seam,
          // to the dedicated Invitations surface (RuntimeApp's own useInvitationInboxRoute).
          onViewAllInvitations={() => { window.location.hash = '#/invitations'; }}
          // Phase 7 Slice 5B -- The Trust Project, as a small doorway BELOW the person's own Home.
          belowHome={onOpenCommunity && onOpenStore
            ? <div className="mt-16"><TrustProjectSection compact membership={trustProjectMembership} onExploreCommunity={onOpenCommunity} onOpenStores={onOpenStore} /></div>
            : undefined}
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
      const { dto, confirmations, people, milestoneStates, events, conflicts, tags, sourceProvenance } = state.detail.data;
      const boltDetail = agreementDetailView(dto, confirmations, state.selectedStatus, state.selectedCompletion, people);
      const progress = agreementProgressView(dto, milestoneStates ?? []);
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
          onOpenMoney={() => openMoneyFor({ agreementId: boltDetail.id, title: dto.overview.title, versionLabel: dto.currentVersion ? `version ${dto.currentVersion.versionNumber}` : null, currentVersionId: dto.currentVersion?.versionId ?? null })}
          onOpenReferral={onOpenReferral ? () => onOpenReferral(boltDetail.id) : undefined}
          money={money}
          progress={progress}
          next={agreementNextView(state.selectedAgreementNextActions)}
          events={calendarEvents}
          conflicts={conflictViews}
          tags={tagViews}
          onAddTag={label => void controller.addTag(label)}
          onRemoveTag={tagId => void controller.removeTag(tagId)}
          initialTab={tabHint?.agreementId === boltDetail.id ? tabHint.tab : undefined}
          onOpenHelp={onOpenSupport ? () => onOpenSupport({ kind: 'agreement', agreementId: boltDetail.id, title: dto.overview.title, versionLabel: dto.currentVersion ? `version ${dto.currentVersion.versionNumber}` : null, currentVersionId: dto.currentVersion?.versionId ?? null }) : undefined}
          reviewPanel={<ReviewPanel key={boltDetail.id} gateway={gateway.review} agreementGateway={gateway} agreementId={boltDetail.id} currentVersionId={dto.currentVersion?.versionId ?? null} initialCaseId={tabHint?.agreementId === boltDetail.id ? tabHint.reviewCaseId ?? null : null} onGetHelp={onOpenSupport ? review => onOpenSupport({ kind: 'review', agreementId: boltDetail.id, title: dto.overview.title, versionLabel: dto.currentVersion ? `version ${dto.currentVersion.versionNumber}` : null, currentVersionId: dto.currentVersion?.versionId ?? null, reviewCaseId: review.reviewCaseId, reviewAgreementVersionId: review.agreementVersionId }) : undefined} onOpenMoney={() => openMoneyFor({ agreementId: boltDetail.id, title: dto.overview.title, versionLabel: dto.currentVersion ? `version ${dto.currentVersion.versionNumber}` : null, currentVersionId: dto.currentVersion?.versionId ?? null })} />}
          progressPanel={<ProgressPanel controller={executionFor(boltDetail.id)} detail={dto} effectiveStates={milestoneStates} completion={state.selectedCompletionFacts} ownParticipantId={(() => { const rows = state.detail.data.myConfirmation; return rows && rows.length === 1 ? rows[0].participantId : null; })()} onOpenMoney={() => openMoneyFor({ agreementId: boltDetail.id, title: dto.overview.title, versionLabel: dto.currentVersion ? `version ${dto.currentVersion.versionNumber}` : null, currentVersionId: dto.currentVersion?.versionId ?? null })} />}
          changesPanel={<ChangesPanel controller={amendmentsFor(boltDetail.id)} detail={dto} />}
          topExtra={<>
            {/* Phase 6 Slice 4 (Community → Trade), item 19 -- quiet, provenance-only "Started from"
                line, from the participant-safe GET .../source read. Present only once a real
                commercial source was attached (an ordinary DIRECT Agreement shows nothing here);
                `available=false` is worded as the source being gone, never as the Agreement itself
                having changed. A best-effort read failure (sourceProvenance === null) shows nothing,
                same as every other Phase 3 enrichment on this page. */}
            {sourceProvenance?.present && (
              <section aria-label="Where this started" className="rounded-2xl border border-cream-200 bg-cream-50/70 px-4 py-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">Started from</p>
                <p className="mt-0.5 text-[0.9rem] text-forest-800 break-words">
                  {sourceProvenance.sourceTitle ?? 'Selected source'}
                  {sourceProvenance.contextLabel ? <span className="text-sand-500"> · {sourceProvenance.contextLabel}</span> : null}
                </p>
                {!sourceProvenance.available && (
                  <p role="status" className="mt-1.5 text-[0.85rem] text-sand-700">
                    {sourceProvenance.contextLabel === 'Community'
                      ? 'Source is no longer available in Community.'
                      : 'This source is no longer available.'}
                  </p>
                )}
              </section>
            )}
            <ReconfirmPanel controller={reconfirmFor(boltDetail.id)} amendments={amendmentsFor(boltDetail.id)} detail={dto} standing={ownStanding(state.detail.data.myConfirmation, state.selectedActorStatus)} />
          </>}
          peopleExtra={<>
            <InvitePanel controller={inviteFor(boltDetail.id)} agreementStatus={dto.overview.status} isCreator={state.selectedActorStatus === 'CREATOR'} />
            <AgreementSecureLinkSection agreementId={boltDetail.id} agreementTitle={dto.overview.title} agreementStatus={dto.overview.status} gateway={gateway} />
          </>}
        />
      );
    }
  } else {
    // Phase 8: one Money experience. This view is only a doorway; the canonical Money screen (#/money) owns funding authority, Payment Ready,
    // money records, release and settlement truth. Nothing is duplicated or decided here.
    const context = state.detail.status === 'ready' ? state.detail.data.dto : null;
    body = (
      <MoneyDoorway
        title={context?.overview.title ?? 'This Agreement'}
        versionLabel={context?.currentVersion ? `version ${context.currentVersion.versionNumber}` : null}
        onOpen={() => openMoneyFor({ agreementId: state.selectedAgreementId ?? '', title: context?.overview.title ?? 'This Agreement', versionLabel: context?.currentVersion ? `version ${context.currentVersion.versionNumber}` : null, currentVersionId: context?.currentVersion?.versionId ?? null })}
        onBack={() => controller.backFromMoney()}
        canOpen={!!state.selectedAgreementId}
      />
    );
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
