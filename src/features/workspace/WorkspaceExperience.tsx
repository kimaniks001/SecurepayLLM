import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { NavBar } from '../../components/NavBar';
import { SignedInHome } from '../../components/SignedInHome';
import { AgreementHub } from '../../components/AgreementHub';
import { AgreementDetail } from '../../components/AgreementDetail';
import { MoneyWorkspace } from '../../components/MoneyWorkspace';
import { MoneyUnavailableState } from '../../components/MoneyUnavailableState';
import { ErrorStateCard } from '../../components/ErrorState';
import type { AgreementGateway } from '../../api/securepay/agreements';
import type { MoneyGateway } from '../../api/securepay/money';
import type { AppView, ErrorStateResponse } from '../../types';
import { createWorkspaceController, errorText } from './controller';
import { agreementCalendarView, agreementDetailView, agreementProgressView, attentionItemsFromHub, conflictSeverityLabel, hubAgreementSummaries, moneyDetailView, upcomingHomeEventsView, waitingItemsFromHub } from './view';

type Gateway = Pick<AgreementGateway,
  'currentUserActions' | 'hub' | 'detail' | 'confirmationStatus' | 'milestoneEffectiveStates'
  | 'calendarEvents' | 'calendarConflicts' | 'tagsForAgreement' | 'tagAgreement' | 'untagAgreement' | 'myCalendar'
> & {
  money: Pick<MoneyGateway, 'status' | 'records'>;
};

/**
 * There is no verified authenticated display-name contract, and the general Agent conversation
 * endpoints remain `auth: 'none'` with no signed-in Agreement/people/activity context wired into
 * them (see Golden Spine A/B). Real mode must never claim a person's name or an account-aware Agent
 * memory, and its suggested prompts must never presuppose personal Agreement history the Agent cannot
 * truthfully answer — they mirror the kind of trade-intent prompt the signed-out Agent already handles.
 */
const realGreeting = 'Welcome back';
const realSubheading = 'Ask anything, or start something new.';
const realSuggestedPrompts = ['Help me set up a new trade', 'I need someone to fix a leaking tap', 'What is Payment Ready?', 'How do I invite someone to an agreement?'];

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
export function WorkspaceExperience({ gateway, initialAgreementId, onOpenStore, onOpenReferral, onLeave }: {
  gateway: Gateway;
  initialAgreementId?: string | null;
  onOpenStore?: () => void;
  onOpenReferral?: (agreementId: string) => void;
  onLeave: (startText?: string) => void;
}) {
  const [controller] = useState(() => createWorkspaceController(gateway));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [notice, setNotice] = useState<string | null>(null);
  const [askResponses, setAskResponses] = useState<{ text: string }[]>([]);
  const restorationConsumed = useRef(false);

  useEffect(() => { controller.enter(); }, [controller]);
  useEffect(() => {
    if (restorationConsumed.current || !initialAgreementId || state.hub.status !== 'ready') return;
    restorationConsumed.current = true;
    controller.openFromHome(initialAgreementId);
  }, [controller, initialAgreementId, state.hub.status]);
  useEffect(() => { setAskResponses([]); }, [state.selectedAgreementId]);

  const navBarView: AppView = state.view === 'home' ? 'signed-in' : state.view === 'hub' ? 'agreements' : state.view === 'detail' ? 'agreement-detail' : 'money';
  const handleNavigate = (view: AppView) => {
    setNotice(null);
    if (view === 'signed-in') controller.goHome();
    else if (view === 'agreements') controller.goHub();
    else if (view === 'money') setNotice('Open Money from a specific agreement to view it.');
    else if (view === 'store' && onOpenStore) onOpenStore();
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
          // No cross-agreement activity-feed contract is verified in this slice; a fabricated feed
          // would violate the never-fabricate-financial/agreement-history rule, so this stays empty.
          recentActivity={[]}
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
          onAskAgent={text => { void text; setAskResponses(r => [...r, { text: 'Asking SecurePay from inside an agreement is not available yet. Return to the conversation to keep talking with SecurePay.' }]); }}
          isThinking={false}
          agentResponses={askResponses}
          isStale={state.selectedStatus === 'change_requested'}
          viewedVersion={state.selectedStatus === 'change_requested' ? 'a previous version' : undefined}
          onViewCurrent={state.selectedStatus === 'change_requested' ? () => void controller.refreshDetail() : undefined}
          onRaiseIssue={undefined}
          onOpenMoney={() => void controller.openMoney(boltDetail.id)}
          onOpenReferral={onOpenReferral ? () => onOpenReferral(boltDetail.id) : undefined}
          money={money}
          progress={progress}
          events={calendarEvents}
          conflicts={conflictViews}
          tags={tagViews}
          onAddTag={label => void controller.addTag(label)}
          onRemoveTag={tagId => void controller.removeTag(tagId)}
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
      {notice && <div role="status" className="px-4 py-2 text-sm text-sand-600 bg-cream-50">{notice} <button onClick={() => setNotice(null)} className="underline">Dismiss</button></div>}
      <div className="flex-1 flex flex-col overflow-hidden">{body}</div>
    </div>
  );
}
