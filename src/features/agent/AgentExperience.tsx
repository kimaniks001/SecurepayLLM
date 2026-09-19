import { useState, useSyncExternalStore } from 'react';
import { SignedOutHome } from '../../components/SignedOutHome';
import { ConversationWorkspace } from '../../components/ConversationWorkspace';
import { ContextPanel } from '../../components/ContextPanel';
import { NavBar } from '../../components/NavBar';
import { AgentIcon } from '../../components/AgentIcon';
import { MessageBubble } from '../../components/MessageBubble';
import { AgreementPreviewCard } from '../../components/AgreementPreview';
import { AgentUnderstoodCard } from '../../components/AgentUnderstoodCard';
import { AgentAgreementsHomeCard } from '../../components/AgentAgreementsHomeCard';
import { UnderstoodTruthSections } from '../../components/UnderstoodTruthSections';
import type { AgentComponentView } from '../../api/securepay/agent/adapters';
import type { AgentGateway } from '../../api/securepay/agent';
import type { AgreementGateway } from '../../api/securepay/agreements';
import type { MoneyGateway } from '../../api/securepay/money';
import type { StoreGateway } from '../../api/securepay/store';
import type { CircleGateway } from '../../api/securepay/circle';
import type { MasterGateway } from '../../api/securepay/master';
import type { MarketNetworkGateway } from '../../api/securepay/marketnetwork';
import type { ReferralGateway } from '../../api/securepay/referral';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import type { AppView } from '../../types';
import { createAgentController } from './controller';
import { TradeContext } from './TradeContext';
import { createHandoffController } from '../handoff/controller';
import { HandoffPanel } from '../handoff/HandoffPanel';
import { createIdentityController } from '../identity/controller';
import { WorkspaceExperience } from '../workspace/WorkspaceExperience';
import { StoreExperience } from '../store/StoreExperience';
import { CommunityExperience } from '../community/CommunityExperience';
import { CircleExperience } from '../circle/CircleExperience';
import { EcosystemExperience } from '../ecosystem/EcosystemExperience';

function RichResponse({ component, onReview }: { component: AgentComponentView; onReview: () => void }) {
  if (component.type === 'MESSAGE') return <MessageBubble text={component.text} sender="agent" />;
  if (component.type === 'AGREEMENT_PREVIEW') return <AgreementPreviewCard data={component} onChoice={choice => { if (choice === 'review_agreement') onReview(); }} />;
  // Final Phase 3 correction (Section 17/18): the real, server-composed UNDERSTOOD artifact for
  // one Agreement -- built entirely from read_agreement_workspace's own tool output, never
  // invented here. Rendered wherever the persistent conversation surfaces it, including from the
  // signed-in Home conversation itself, not only from inside Agreement Workspace.
  if (component.type === 'AGREEMENT_WORKSPACE') return <AgentUnderstoodCard workspace={component.workspace} />;
  if (component.type === 'AGREEMENTS_HOME') return <AgentAgreementsHomeCard home={component.home} />;
  return <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
    <div className="px-4 py-3 text-[0.75rem] font-medium text-sand-500 uppercase tracking-wide">{component.title}</div>
    <dl className="px-4 pb-4 space-y-2">{component.rows.map((row, i) => <div key={i} className="break-words"><dt className="text-[0.7rem] text-sand-500">{row.label}</dt><dd className="text-[0.875rem] text-forest-800">{row.value}</dd></div>)}</dl>
    <p className="px-4 py-2 bg-cream-50 text-[0.75rem] text-sand-500">For consideration. No provider or terms have been selected by viewing this.</p>
  </div>;
}
const noop = () => {};
export function AgentExperience({ gateway, agreementGateway, moneyGateway, storeGateway, circleGateway, masterGateway, marketNetworkGateway, referralGateway, auth, session, initialStoreOfferRoute, trustedMediaOrigin }: {
  gateway: AgentGateway; agreementGateway: AgreementGateway; moneyGateway: MoneyGateway; storeGateway: StoreGateway; circleGateway: CircleGateway;
  masterGateway: MasterGateway; marketNetworkGateway: MarketNetworkGateway; referralGateway: ReferralGateway;
  auth: AuthGateway; session: SessionStore;
  initialStoreOfferRoute?: { canonicalKsNumber: string; offerId: string } | null;
  trustedMediaOrigin: string | null;
}) {
  const [controller, setController] = useState(() => createAgentController(gateway));
  const [handoffController, setHandoffController] = useState(() => createHandoffController(gateway));
  const [identityController, setIdentityController] = useState(() => createIdentityController(auth, session));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const handoffState = useSyncExternalStore(handoffController.subscribe, handoffController.getSnapshot);
  const sessionState = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [expanded, setExpanded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [home, setHome] = useState(false);
  const [workspace, setWorkspace] = useState(false);
  // Final Phase 3 completion pass, Section 4 -- mobile-first BUILD | UNDERSTOOD. BUILD is the
  // default; a person taps to UNDERSTOOD, never the other way around. Desktop shows both
  // simultaneously and ignores this entirely (see the render below).
  const [mobileTab, setMobileTab] = useState<'build' | 'understood'>('build');
  const [lastSeenStructuredTurnId, setLastSeenStructuredTurnId] = useState<string | null>(null);
  const [workspaceAgreementId, setWorkspaceAgreementId] = useState<string | null>(null);
  const [store, setStore] = useState(!!initialStoreOfferRoute);
  const [storeOfferRoute, setStoreOfferRoute] = useState(initialStoreOfferRoute ?? null);
  const [community, setCommunity] = useState(false);
  const [circle, setCircle] = useState(false);
  const [ecosystem, setEcosystem] = useState(false);
  const [ecosystemAgreementId, setEcosystemAgreementId] = useState<string | null>(null);
  const reviewing = () => { setExpanded(true); void controller.review(); };
  const startNewConversation = () => {
    setController(createAgentController(gateway));
    setHandoffController(createHandoffController(gateway));
    setIdentityController(createIdentityController(auth, session));
    setExpanded(false);
    setNotice(null);
  };

  /** Shared by the top NavBar, WorkspaceExperience's own NavBar, StoreExperience's own NavBar, and
   * CommunityExperience/CircleExperience/EcosystemExperience's own NavBars — one navigation-out policy. */
  const navigateTo = (view: AppView) => {
    setNotice(null);
    if (view === 'store') { setWorkspace(false); setWorkspaceAgreementId(null); setCommunity(false); setCircle(false); setEcosystem(false); setEcosystemAgreementId(null); setStore(true); return; }
    if (view === 'community') { setWorkspace(false); setWorkspaceAgreementId(null); setStore(false); setCircle(false); setEcosystem(false); setEcosystemAgreementId(null); setCommunity(true); return; }
    if (view === 'circle') { setWorkspace(false); setWorkspaceAgreementId(null); setStore(false); setCommunity(false); setEcosystem(false); setEcosystemAgreementId(null); setCircle(true); return; }
    if (view === 'ecosystem') { setWorkspace(false); setWorkspaceAgreementId(null); setStore(false); setCommunity(false); setCircle(false); setEcosystemAgreementId(null); setEcosystem(true); return; }

    // Agreement-scoped Plug help temporarily unmounts the workspace. Preserve the exact Agreement id
    // before clearing the ecosystem context so remounting can reopen it from the authoritative Hub.
    const returningAgreementId = view === 'agreement-detail' ? ecosystemAgreementId : null;
    setStore(false); setCommunity(false); setCircle(false); setEcosystem(false); setEcosystemAgreementId(null);
    if (view === 'signed-in' || view === 'agreements' || view === 'money' || view === 'agreement-detail') {
      if (sessionState.status === 'signed-in') {
        setWorkspaceAgreementId(returningAgreementId);
        setWorkspace(true);
        return;
      }
      setWorkspaceAgreementId(null);
      setHome(true);
      if (view !== 'signed-in') setNotice('Sign in through "Continue with this" to view your agreements.');
      return;
    }
    setWorkspaceAgreementId(null);
    setNotice('This area is not available yet. You can keep talking with SecurePay.');
  };
  /** Entry from a specific Agreement's Support tab (task section 17/18) — reuses the same router with an
   * Agreement in scope so PlugExperience can also offer real attribution, not just the general help menu. */
  const openEcosystemForAgreement = (agreementId: string) => {
    setWorkspaceAgreementId(agreementId);
    setWorkspace(false);
    setStore(false);
    setCommunity(false);
    setCircle(false);
    setEcosystemAgreementId(agreementId);
    setEcosystem(true);
  };

  if (store) {
    return (
      <StoreExperience
        gateway={storeGateway}
        auth={auth}
        session={session}
        initialOfferRoute={storeOfferRoute}
        trustedMediaOrigin={trustedMediaOrigin}
        onNavigate={navigateTo}
        onUseOffer={fact => { setStore(false); setHome(false); setExpanded(true); void controller.useOffer(fact); }}
      />
    );
  }

  if (community) {
    return (
      <CommunityExperience
        gateway={storeGateway}
        trustedMediaOrigin={trustedMediaOrigin}
        onNavigate={navigateTo}
        onOpenCircle={() => navigateTo('circle')}
        onOpenStoreOffer={(canonicalKsNumber, offerId) => { setStoreOfferRoute({ canonicalKsNumber, offerId }); navigateTo('store'); }}
      />
    );
  }

  if (circle) {
    return (
      <CircleExperience
        gateway={circleGateway}
        auth={auth}
        session={session}
        onNavigate={navigateTo}
        onAskAgent={() => navigateTo('signed-in')}
      />
    );
  }

  if (ecosystem) {
    return (
      <EcosystemExperience
        masterGateway={masterGateway}
        marketNetworkGateway={marketNetworkGateway}
        referralGateway={referralGateway}
        agreementGateway={agreementGateway}
        auth={auth}
        session={session}
        agreementId={ecosystemAgreementId}
        onNavigate={navigateTo}
        onAskAgent={() => navigateTo('signed-in')}
      />
    );
  }

  if (workspace && sessionState.status === 'signed-in') {
    const workspaceGateway = { ...agreementGateway, money: moneyGateway };
    return <WorkspaceExperience
      gateway={workspaceGateway}
      agentGateway={gateway}
      agentController={controller}
      initialAgreementId={workspaceAgreementId}
      onOpenStore={() => navigateTo('store')}
      onOpenReferral={openEcosystemForAgreement}
      onLeave={startText => {
        setWorkspaceAgreementId(null);
        setWorkspace(false);
        setHome(false);
        if (startText) void controller.send(startText);
      }}
    />;
  }

  const context = <TradeContext state={state} controller={controller} expanded={expanded} onToggle={() => setExpanded(value => !value)} />;
  const lastResponse = [...state.turns].reverse().find(turn => turn.sender === 'agent');
  const panel = lastResponse?.sender === 'agent' ? lastResponse.response.panel : null;
  // Final Phase 3 completion pass, Section 9 -- structured artifacts (AGREEMENT_WORKSPACE/
  // AGREEMENTS_HOME) are real, server-composed UNDERSTOOD truth; they surface in UNDERSTOOD only,
  // never duplicated inline in the BUILD transcript, so a question gets a brief prose answer in
  // BUILD while the richer visual truth lives in the ONE place UNDERSTOOD shows it.
  const structuredComponents = lastResponse?.sender === 'agent'
    ? lastResponse.response.components.filter(c => c.type === 'AGREEMENT_WORKSPACE' || c.type === 'AGREEMENTS_HOME')
    : [];
  // Final Phase 4 Economy pass (sections 8/9/42) -- real Agent market-discovery output (provider
  // search, Store listings, price context, and any future Store/Community/opportunity result the
  // model requested) already arrives as a real, server-composed 'DISCOVERY' component (see
  // discoveryView in api/securepay/agent/discovery.ts) exactly like AGREEMENT_WORKSPACE/
  // AGREEMENTS_HOME. It belongs in UNDERSTOOD's FOUND ON SECUREPAY section -- discovery truth, never
  // Agreement truth -- not duplicated inline in BUILD.
  const foundOnSecurePayComponents = lastResponse?.sender === 'agent'
    ? lastResponse.response.components.filter(c => c.type === 'DISCOVERY')
    : [];
  const hasUnseenUnderstood = (structuredComponents.length > 0 || foundOnSecurePayComponents.length > 0)
    && lastResponse?.id !== lastSeenStructuredTurnId;
  const understoodContent = (
    <UnderstoodTruthSections
      confirmed={structuredComponents.length > 0
        ? <div className="space-y-3">{structuredComponents.map((component, i) => <RichResponse key={i} component={component} onReview={reviewing} />)}</div>
        : null}
      stillToDecide={<>{context}{panel && <div className="space-y-3 mt-3">{panel.components.map((component, i) => <RichResponse key={i} component={component} onReview={reviewing} />)}</div>}</>}
      foundOnSecurePay={foundOnSecurePayComponents.length > 0
        ? <div className="space-y-3">{foundOnSecurePayComponents.map((component, i) => <RichResponse key={i} component={component} onReview={reviewing} />)}</div>
        : undefined}
    />
  );
  const openUnderstood = () => { setMobileTab('understood'); if (lastResponse) setLastSeenStructuredTurnId(lastResponse.id); };
  // A Store "Use this" seeds a real conversation/Trade Context with no chat turn (see useOffer in
  // controller.ts) — state.conversationId alone must also route to the conversation view, or the
  // person would land back on the generic Home prompt with no visible sign their offer was used.
  const showHome = home || (state.turns.length === 0 && !state.conversationId);
  return <div className="h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
    <NavBar view={showHome ? 'signed-out' : 'conversation'} onNavigate={navigateTo} />
    {notice && <div role="status" className="px-4 py-2 text-sm text-sand-600 bg-cream-50">{notice} <button onClick={() => setNotice(null)} className="underline">Dismiss</button></div>}
    {showHome ? <div className="flex-1 overflow-auto">
      {state.turns.length > 0 && <button onClick={() => setHome(false)} className="px-6 py-3 text-forest-700 underline">Return to conversation</button>}
      <SignedOutHome disabled={state.busy || !!state.pending} onStart={text => { setHome(false); if (!state.busy && !state.pending) void controller.send(text); }} />
    </div> : <>
      {/* Final Phase 3 completion pass, Section 4 -- mobile-first sticky BUILD | UNDERSTOOD. */}
      <div className="md:hidden sticky top-0 z-10 flex border-b border-cream-200/60 bg-cream-50">
        <button
          onClick={() => setMobileTab('build')}
          aria-current={mobileTab === 'build'}
          className={`flex-1 py-2.5 text-[0.8rem] font-medium transition-colors ${mobileTab === 'build' ? 'text-forest-700 border-b-2 border-forest-600' : 'text-sand-500 border-b-2 border-transparent'}`}
        >
          Build
        </button>
        <button
          onClick={openUnderstood}
          aria-current={mobileTab === 'understood'}
          className={`relative flex-1 py-2.5 text-[0.8rem] font-medium transition-colors ${mobileTab === 'understood' ? 'text-forest-700 border-b-2 border-forest-600' : 'text-sand-500 border-b-2 border-transparent'}`}
        >
          Understood
          {hasUnseenUnderstood && <span className="absolute top-2 right-[calc(50%-2.2rem)] w-1.5 h-1.5 rounded-full bg-ember-500" aria-label="New structured content" />}
        </button>
      </div>
      <div className="flex-1 flex overflow-hidden">
      <div className={`${mobileTab === 'build' ? 'flex' : 'hidden'} md:flex flex-1 md:flex-[1.35] flex-col min-w-0 bg-cream-50`}>
        <div className="hidden md:flex items-center gap-2.5 px-4 md:px-6 py-3 border-b border-cream-200/60">
          <AgentIcon state={state.busy ? 'thinking' : 'listening'} size={28} />
          <div><div className="font-display text-sm text-forest-800">SecurePay</div><div className="text-[0.7rem] text-sand-500">{state.busy ? 'thinking' : 'listening'}</div></div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationWorkspace turns={[]} understandingContent={context} isThinking={state.busy} inputDisabled={state.busy || !!state.pending}
            onSend={text => void controller.send(text)} selectedProviderId={null} onSelectProvider={noop} onPhotoUpload={noop} onPhotoSkip={noop} onDateSelect={noop} onChoice={noop}
            conversationContent={[
              ...state.turns.map(turn => <div key={turn.id} className="space-y-3">
                {turn.sender === 'user' ? <MessageBubble text={turn.text} sender="user" /> : <>
                  <MessageBubble text={turn.response.message.text} sender="agent" />
                  {turn.response.components.filter(component => (component.type !== 'MESSAGE' || component.text !== turn.response.message.text) && component.type !== 'AGREEMENT_WORKSPACE' && component.type !== 'AGREEMENTS_HOME' && component.type !== 'DISCOVERY').map((component, i) => <RichResponse key={i} component={component} onReview={reviewing} />)}
                </>}
              </div>),
              handoffState.phase !== 'idle' && <div key="handoff" className="space-y-3">
                <HandoffPanel handoff={handoffController} identity={identityController} onDone={noop} />
              </div>,
            ]}
            statusContent={<div className="space-y-3">
              {/* Final Phase 4 Economy Turn 3 (Section 5) -- a failed Store "Use this" is never
                  silent: the person must explicitly retry or continue without the source before
                  anything from the offer reaches the conversation. */}
              {state.offerSelectionFailure && <div role="alert" className="rounded-xl border border-ember-200 bg-white p-3 text-sm text-sand-700">
                SecurePay could not confirm this Store offer as a real commercial source. {state.offerSelectionFailure.error}
                <div className="flex flex-wrap gap-3 mt-2">
                  <button disabled={state.busy} onClick={() => void controller.retryOfferSelection()} className="text-forest-700 underline disabled:opacity-40">Retry</button>
                  <button disabled={state.busy} onClick={() => void controller.continueOfferWithoutSource()} className="text-sand-500 underline disabled:opacity-40">Continue without this source</button>
                </div>
              </div>}
              {state.error && <div role="alert" className="rounded-xl border border-cream-200 bg-white p-3 text-sm text-sand-700">{state.pending?.kind === 'turn' && 'SecurePay could not complete your turn. '}{state.error}
                <button disabled={state.busy} onClick={() => void controller.retry()} className="block mt-2 text-forest-700 underline disabled:opacity-40">Retry {state.pending?.kind === 'adopt' ? 'Use this' : 'turn'}</button>
              </div>}
              <div className="flex flex-wrap gap-3 text-sm text-forest-700">
                <button disabled={state.busy} onClick={reviewing} className="underline disabled:opacity-40">Review what we have</button>
                <button
                  disabled={!state.conversationId || state.busy || !!state.pending || handoffState.phase !== 'idle'}
                  onClick={() => { if (state.conversationId) void handoffController.start(state.conversationId); }}
                  className="underline disabled:opacity-40"
                >
                  Continue with this
                </button>
                <button disabled={state.busy} onClick={startNewConversation} className="text-sand-500 underline disabled:opacity-40">Start new conversation</button>
              </div>
            </div>} />
        </div>
      </div>
      <div className={`${mobileTab === 'understood' ? 'flex' : 'hidden'} md:flex md:flex-[1] flex-col border-l border-cream-200/60 bg-cream-100/50 min-w-0 ${mobileTab === 'understood' ? 'flex-1 overflow-y-auto p-4' : ''}`}>
        <div className="md:hidden">{understoodContent}</div>
        <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0">
          <ContextPanel lastRichResponses={[]} selectedProviderId={null} onSelectProvider={noop} panelTitle={panel?.title || 'Trade taking shape'} panelMode="understanding"
            contextContent={understoodContent} />
        </div>
      </div>
      </div>
    </>}
  </div>;
}
