import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { SignedOutHome } from '../../components/SignedOutHome';
import { NavBar } from '../../components/NavBar';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';
import { MessageBubble } from '../../components/MessageBubble';
import { AgreementPreviewCard } from '../../components/AgreementPreview';
import { AgentUnderstoodCard } from '../../components/AgentUnderstoodCard';
import { AgentAgreementsHomeCard } from '../../components/AgentAgreementsHomeCard';
import { UnderstoodTruthSections } from '../../components/UnderstoodTruthSections';
import { StatusNotice } from '../../components/dna/StatusNotice';
import type { AgentComponentView } from '../../api/securepay/agent/adapters';
import type { InstrumentPromptView } from '../../api/securepay/agent/instruments';
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
import { ConversationSurface } from '../conversation/ConversationSurface';
import { createInstrumentController } from '../instruments/controller';
import { InstrumentHost } from '../instruments/ui/InstrumentHost';
import { InstrumentPrompt } from '../instruments/ui/InstrumentPrompt';
import type { InstrumentSpec } from '../instruments/model';
import { UnderstoodWorkbench } from '../workbench/UnderstoodWorkbench';
import { projectWorkbench, specForPrompt, type PromptResolution } from '../workbench/projection';
import type { PreviewView } from '../../api/securepay/agent/adapters';
import { createHandoffController } from '../handoff/controller';
import { HandoffPanel } from '../handoff/HandoffPanel';
import { createIdentityController } from '../identity/controller';
import { WorkspaceExperience } from '../workspace/WorkspaceExperience';
import { StoreExperience } from '../store/StoreExperience';
import { CommunityExperience } from '../community/CommunityExperience';
import { CircleExperience } from '../circle/CircleExperience';
import { EcosystemExperience } from '../ecosystem/EcosystemExperience';
import { ProjectsExperience } from '../projects/ProjectsExperience';
import { createProjectsController } from '../projects/controller';
import type { ProjectGateway } from '../../api/securepay/projects';
import { VisionBoardExperience } from '../visionboard/VisionBoardExperience';
import { createVisionBoardController } from '../visionboard/controller';
import type { VisionBoardGateway } from '../../api/securepay/visionboard';
import { AccountExperience } from '../account/AccountExperience';
import { createAccountController } from '../account/controller';
import { SettingsExperience } from '../settings/SettingsExperience';
import { createSettingsController } from '../settings/controller';
import type { SettingsGateway } from '../../api/securepay/settings';
import type { SubscriptionGateway } from '../../api/securepay/subscription';
import { NotificationsExperience } from '../notifications/NotificationsExperience';
import { createNotificationsController } from '../notifications/controller';
import type { NotificationsGateway } from '../../api/securepay/notifications';
import { RecoveryExperience } from '../recovery/RecoveryExperience';
import { createRecoveryController } from '../recovery/controller';
import { BusinessExperience } from '../business/BusinessExperience';
import { createBusinessController } from '../business/controller';
import type { BusinessGateway } from '../../api/securepay/business';
import type { AuthorizationGateway } from '../../api/securepay/authorization';
import { DeveloperExperience } from '../developer/DeveloperExperience';
import { createDeveloperController } from '../developer/controller';
import type { DeveloperGateway } from '../../api/securepay/developer';

function RichResponse({ component, onReview, live = false, onPrompt, resolvePrompt }: { component: AgentComponentView; onReview: () => void; live?: boolean; onPrompt?: (prompt: InstrumentPromptView) => void; resolvePrompt?: (prompt: InstrumentPromptView) => PromptResolution }) {
  if (component.type === 'MESSAGE') return <MessageBubble text={component.text} sender="agent" />;
  if (component.type === 'AGREEMENT_PREVIEW') return <AgreementPreviewCard data={component} onChoice={choice => { if (choice === 'review_agreement') onReview(); }} />;
  // Final Phase 3 correction (Section 17/18): the real, server-composed UNDERSTOOD artifact for
  // one Agreement -- built entirely from read_agreement_workspace's own tool output, never
  // invented here. Rendered wherever the persistent conversation surfaces it, including from the
  // signed-in Home conversation itself, not only from inside Agreement Workspace.
  if (component.type === 'AGREEMENT_WORKSPACE') return <AgentUnderstoodCard workspace={component.workspace} />;
  if (component.type === 'AGREEMENTS_HOME') return <AgentAgreementsHomeCard home={component.home} />;
  // Phase 1: a model-proposed input affordance is an invitation to open ONE instrument -- live only
  // on the newest agent turn (an older prompt is stale), and never an action by itself.
  if (component.type === 'INSTRUMENT_PROMPT') {
    if (!live || !onPrompt) return null;
    const resolved = resolvePrompt?.(component);
    return resolved && 'note' in resolved ? <InstrumentPrompt note={resolved.note} /> : <InstrumentPrompt prompt={component} onOpen={() => onPrompt(component)} />;
  }
  if (component.type === 'UNAVAILABLE_INPUT') return live ? <InstrumentPrompt unavailable={component.input} /> : null;
  return <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
    <div className="px-4 py-3 text-[0.75rem] font-medium text-sand-500 uppercase tracking-wide">{component.title}</div>
    <dl className="px-4 pb-4 space-y-2">{component.rows.map((row, i) => <div key={i} className="break-words"><dt className="text-[0.7rem] text-sand-500">{row.label}</dt><dd className="text-[0.875rem] text-forest-800">{row.value}</dd></div>)}</dl>
    <p className="px-4 py-2 bg-cream-50 text-[0.75rem] text-sand-500">For consideration. No provider or terms have been selected by viewing this.</p>
  </div>;
}
const noop = () => {};
export function AgentExperience({ gateway, agreementGateway, moneyGateway, storeGateway, circleGateway, masterGateway, marketNetworkGateway, referralGateway, projectGateway, visionBoardGateway, settingsGateway, businessGateway, authorizationGateway, developerGateway, notificationsGateway, subscriptionGateway, auth, session, initialStoreOfferRoute, trustedMediaOrigin }: {
  gateway: AgentGateway; agreementGateway: AgreementGateway; moneyGateway: MoneyGateway; storeGateway: StoreGateway; circleGateway: CircleGateway;
  masterGateway: MasterGateway; marketNetworkGateway: MarketNetworkGateway; referralGateway: ReferralGateway; projectGateway: ProjectGateway;
  visionBoardGateway: VisionBoardGateway;
  settingsGateway: SettingsGateway; businessGateway: BusinessGateway; authorizationGateway: AuthorizationGateway; developerGateway: DeveloperGateway;
  notificationsGateway: NotificationsGateway;
  subscriptionGateway: Pick<SubscriptionGateway, 'myStatus'>;
  auth: AuthGateway; session: SessionStore;
  initialStoreOfferRoute?: { canonicalKsNumber: string; offerId: string } | null;
  trustedMediaOrigin: string | null;
}) {
  const [controller, setController] = useState(() => createAgentController(gateway));
  const [handoffController, setHandoffController] = useState(() => createHandoffController(gateway));
  const [identityController, setIdentityController] = useState(() => createIdentityController(auth, session));
  const [projectsController] = useState(() => createProjectsController(projectGateway));
  const [visionBoardController] = useState(() => createVisionBoardController(visionBoardGateway));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  // Phase 1 Interaction Instruments: bound to the CURRENT conversation controller, so a new
  // conversation always starts with a fresh, closed instrument.
  const instruments = useMemo(() => createInstrumentController(controller), [controller]);
  const instrumentState = useSyncExternalStore(instruments.subscribe, instruments.getSnapshot);
  const [panelSlot, setPanelSlot] = useState<HTMLElement | null>(null);
  const [composerFocusKey, setComposerFocusKey] = useState(0);
  const handoffState = useSyncExternalStore(handoffController.subscribe, handoffController.getSnapshot);
  const sessionState = useSyncExternalStore(session.subscribe, session.getSnapshot);
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
  const [projects, setProjects] = useState(false);
  const [visionBoard, setVisionBoard] = useState(false);
  // Phase 5 -- Life & Business World destinations, all authenticated-only, same router.
  const [account, setAccount] = useState(false);
  const [settingsView, setSettingsView] = useState(false);
  const [recoveryView, setRecoveryView] = useState(false);
  const [businessView, setBusinessView] = useState(false);
  const [developerView, setDeveloperView] = useState(false);
  const [notificationsView, setNotificationsView] = useState(false);
  // Session-clearing correction: the backend already revoked this session the moment a password
  // change succeeds (verified in controller.ts's own doc comment) -- the frontend must reflect that
  // immediately, not wait for a subsequent request to fail. session.clear() is the one real session
  // boundary (api/securepay/session.ts); reusing the existing `notice` banner (already used for
  // "sign in to view your account" elsewhere in this router) avoids building a new flash-message
  // mechanism for one narrow case.
  const [accountController] = useState(() => createAccountController(
    { circle: circleGateway, business: businessGateway, authorization: authorizationGateway, logoutAll: auth.logoutAll, subscription: subscriptionGateway, changePassword: auth.changePassword },
    () => { session.clear(); setNotice('Password changed. Sign in again with your new password.'); },
  ));
  const [settingsController] = useState(() => createSettingsController(settingsGateway));
  const [notificationsController] = useState(() => createNotificationsController(notificationsGateway));
  const [recoveryController] = useState(() => createRecoveryController(auth));
  const [businessController] = useState(() => createBusinessController({ business: businessGateway, authorization: authorizationGateway }));
  const [developerController] = useState(() => createDeveloperController(developerGateway));
  // Phase 5 -- resolved once via the same real, self-scoped `/circle/me` read Account/Circle already
  // use, so Projects never forces the person to type their own KS Number for the common case (Vision
  // Board's own backend already defaults to the caller's own KS when none is supplied; Projects'
  // `ownerKsNumber` query parameter is required server-side, so this is the frontend-side equivalent).
  const [ownKsNumber, setOwnKsNumber] = useState<string | null>(null);
  useEffect(() => {
    if (sessionState.status !== 'signed-in' || ownKsNumber) return;
    let cancelled = false;
    void circleGateway.me().then(profile => { if (!cancelled) setOwnKsNumber(profile.canonicalKsNumber); }).catch(() => { /* Projects still works with manual KS entry. */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState.status]);
  const reviewing = () => { void controller.review(); };
  const startNewConversation = () => {
    instruments.cancel();
    setController(createAgentController(gateway));
    setHandoffController(createHandoffController(gateway));
    setIdentityController(createIdentityController(auth, session));
    setNotice(null);
  };

  /** Shared by the top NavBar, WorkspaceExperience's own NavBar, StoreExperience's own NavBar, and
   * CommunityExperience/CircleExperience/EcosystemExperience's own NavBars — one navigation-out policy. */
  const navigateTo = (view: AppView) => {
    setNotice(null);
    // Phase 5 -- cleared unconditionally on every navigation so the pre-existing branches below
    // never need editing to know about these five new destinations.
    setAccount(false); setSettingsView(false); setRecoveryView(false); setBusinessView(false); setDeveloperView(false); setNotificationsView(false);
    // Final correction -- sensitive/one-time state must not survive leaving its own screen. Both
    // calls are no-ops (harmless re-render of an unmounted screen) except at the exact moment of
    // actually leaving Recovery or Developer; entering Recovery still separately calls reset() below
    // for clarity, redundantly but harmlessly. See docs/PHASE5_LIFE_BUSINESS_WORLD.md sections G/K.
    recoveryController.reset();
    developerController.clearSensitiveTransientState();
    if (view === 'store') { setWorkspace(false); setWorkspaceAgreementId(null); setCommunity(false); setCircle(false); setEcosystem(false); setEcosystemAgreementId(null); setProjects(false); setVisionBoard(false); setStore(true); return; }
    if (view === 'community') { setWorkspace(false); setWorkspaceAgreementId(null); setStore(false); setCircle(false); setEcosystem(false); setEcosystemAgreementId(null); setProjects(false); setVisionBoard(false); setCommunity(true); return; }
    if (view === 'circle') { setWorkspace(false); setWorkspaceAgreementId(null); setStore(false); setCommunity(false); setEcosystem(false); setEcosystemAgreementId(null); setProjects(false); setVisionBoard(false); setCircle(true); return; }
    if (view === 'ecosystem') { setWorkspace(false); setWorkspaceAgreementId(null); setStore(false); setCommunity(false); setCircle(false); setEcosystemAgreementId(null); setProjects(false); setVisionBoard(false); setEcosystem(true); return; }
    // Final Completion Phase 5A -- Projects is a private, authenticated-only organizational view
    // over the person's own Agreements; a signed-out visitor is routed to sign in first, exactly
    // like 'agreements'/'money' below, never shown an empty/mock Projects screen.
    if (view === 'projects') {
      setStore(false); setCommunity(false); setCircle(false); setEcosystem(false); setEcosystemAgreementId(null); setWorkspace(false); setWorkspaceAgreementId(null); setVisionBoard(false);
      if (sessionState.status === 'signed-in') { setProjects(true); return; }
      setHome(true);
      setNotice('Sign in through "Continue with this" to view your Projects.');
      return;
    }
    // Final Completion Phase 5B -- the Vision Board is a private, authenticated-only KS operating
    // memory (ideas, plans, guidance, templates), never a shared or public surface; a signed-out
    // visitor is routed to sign in first, exactly like Projects above.
    if (view === 'vision-board') {
      setStore(false); setCommunity(false); setCircle(false); setEcosystem(false); setEcosystemAgreementId(null); setWorkspace(false); setWorkspaceAgreementId(null); setProjects(false);
      if (sessionState.status === 'signed-in') { setVisionBoard(true); return; }
      setHome(true);
      setNotice('Sign in through "Continue with this" to view your Vision Board.');
      return;
    }
    // Phase 5 -- Account/Settings/Business/Developer are all private and authenticated-only, exactly
    // like Projects/Vision Board above. Recovery is the one exception: it must be reachable while
    // signed out (that is the entire point of account recovery).
    if (view === 'account' || view === 'settings' || view === 'business' || view === 'developer') {
      setStore(false); setCommunity(false); setCircle(false); setEcosystem(false); setEcosystemAgreementId(null); setWorkspace(false); setWorkspaceAgreementId(null); setProjects(false); setVisionBoard(false);
      if (sessionState.status === 'signed-in') {
        if (view === 'account') setAccount(true);
        else if (view === 'settings') setSettingsView(true);
        else if (view === 'business') setBusinessView(true);
        else setDeveloperView(true);
        return;
      }
      setHome(true);
      setNotice('Sign in through "Continue with this" to view your account.');
      return;
    }
    // Notifications is the canonical in-app attention centre -- private and authenticated-only,
    // exactly like Account/Settings/Business/Developer above.
    if (view === 'notifications') {
      setStore(false); setCommunity(false); setCircle(false); setEcosystem(false); setEcosystemAgreementId(null); setWorkspace(false); setWorkspaceAgreementId(null); setProjects(false); setVisionBoard(false);
      if (sessionState.status === 'signed-in') { setNotificationsView(true); return; }
      setHome(true);
      setNotice('Sign in through "Continue with this" to view your notifications.');
      return;
    }
    if (view === 'recovery') {
      setStore(false); setCommunity(false); setCircle(false); setEcosystem(false); setEcosystemAgreementId(null); setWorkspace(false); setWorkspaceAgreementId(null); setProjects(false); setVisionBoard(false); setHome(false);
      recoveryController.reset();
      setRecoveryView(true);
      return;
    }

    // Agreement-scoped Plug help temporarily unmounts the workspace. Preserve the exact Agreement id
    // before clearing the ecosystem context so remounting can reopen it from the authoritative Hub.
    const returningAgreementId = view === 'agreement-detail' ? ecosystemAgreementId : null;
    setStore(false); setCommunity(false); setCircle(false); setEcosystem(false); setEcosystemAgreementId(null); setProjects(false); setVisionBoard(false);
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
  /** A Notification with a real `agreementId` opens that Agreement directly in the Workspace --
   * the same real mechanism WorkspaceExperience's own controller uses internally, not a new one.
   * Never routes on `actionKey`, which no real backend event producer populates today (task
   * section 20 -- see the notifications gateway's own doc comment on this). */
  const openAgreementFromNotification = (agreementId: string) => {
    setNotificationsView(false);
    setStore(false); setCommunity(false); setCircle(false); setEcosystem(false); setEcosystemAgreementId(null); setProjects(false); setVisionBoard(false);
    setWorkspaceAgreementId(agreementId);
    setWorkspace(true);
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
        onUseOffer={fact => { setStore(false); setHome(false); void controller.useOffer(fact); }}
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

  if (projects && sessionState.status === 'signed-in') {
    return (
      <ProjectsExperience
        controller={projectsController}
        agreementGateway={agreementGateway}
        defaultOwnerKsNumber={ownKsNumber}
        onNavigate={navigateTo}
        onOpenVisionBoard={() => navigateTo('vision-board')}
      />
    );
  }

  if (visionBoard && sessionState.status === 'signed-in') {
    return (
      <VisionBoardExperience
        controller={visionBoardController}
        documentGateway={visionBoardGateway}
        onNavigate={navigateTo}
      />
    );
  }

  if (account && sessionState.status === 'signed-in') {
    return <AccountExperience controller={accountController} onNavigate={navigateTo} />;
  }

  if (settingsView && sessionState.status === 'signed-in') {
    return <SettingsExperience controller={settingsController} onNavigate={navigateTo} />;
  }

  if (businessView && sessionState.status === 'signed-in') {
    return <BusinessExperience controller={businessController} onNavigate={navigateTo} />;
  }

  if (developerView && sessionState.status === 'signed-in') {
    return <DeveloperExperience controller={developerController} onNavigate={navigateTo} />;
  }

  if (notificationsView && sessionState.status === 'signed-in') {
    return <NotificationsExperience controller={notificationsController} onNavigate={navigateTo} onOpenAgreement={openAgreementFromNotification} />;
  }

  if (recoveryView) {
    // 'signed-in' is deliberate here, not 'signed-out': navigateTo's own fallback for that view,
    // when the session is not actually signed in yet, quietly returns to Home with no notice --
    // exactly "ready to sign in" with the new password, never a stray "not available yet" message.
    return <RecoveryExperience controller={recoveryController} onNavigate={navigateTo} onSignIn={() => navigateTo('signed-in')} />;
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
      onOpenProjects={() => navigateTo('projects')}
      onOpenVisionBoard={() => navigateTo('vision-board')}
      onLeave={startText => {
        setWorkspaceAgreementId(null);
        setWorkspace(false);
        setHome(false);
        if (startText) void controller.send(startText);
      }}
    />;
  }

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
  // Phase 1: UNDERSTOOD is a workbench over the REAL Trade Context. The Agent's AGREEMENT_PREVIEW
  // restates the same what/who/money/when, so it is no longer drawn as a second card (in BUILD or
  // here) -- only its server-derived "still worth settling" lines and disclaimer are kept. If Trade
  // Context could not be read at all, the preview remains as a fallback so nothing is lost.
  const workbenchModel = projectWorkbench(state.context.data);
  const preview = panel?.components.find((c): c is PreviewView => c.type === 'AGREEMENT_PREVIEW');
  const panelRest = (panel?.components ?? []).filter(c => c.type !== 'AGREEMENT_PREVIEW' && c.type !== 'INSTRUMENT_PROMPT' && c.type !== 'UNAVAILABLE_INPUT');
  const openInstrument = (spec: InstrumentSpec) => instruments.open(spec);
  const understoodContent = (
    <UnderstoodTruthSections
      confirmed={structuredComponents.length > 0
        ? <div className="space-y-3">{structuredComponents.map((component, i) => <RichResponse key={i} component={component} onReview={reviewing} />)}</div>
        : null}
      stillToDecide={<div className="space-y-3">
        <UnderstoodWorkbench state={state} controller={controller} activeSpec={instrumentState.active} onOpen={openInstrument} stillToSettle={preview?.stillToSettle} notes={preview?.disclaimer} />
        {workbenchModel.empty && preview && <RichResponse component={preview} onReview={reviewing} />}
        {panelRest.length > 0 && <div className="space-y-3">{panelRest.map((component, i) => <RichResponse key={i} component={component} onReview={reviewing} />)}</div>}
      </div>}
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
      {sessionState.status !== 'signed-in' && (
        <p className="text-center pb-6"><button onClick={() => navigateTo('recovery')} className="text-[0.8rem] text-forest-700 underline">Trouble signing in? Recover your account</button></p>
      )}
    </div> : <>
      {/* Final Phase 3 completion pass, Section 4 -- mobile-first sticky BUILD | UNDERSTOOD.
          Phase 6 final correction: a compact KS001 identity row now sits above the tabs so mobile
          (which hides the desktop identity block below) still clearly shows who the person is
          talking to -- one coherent header, not a second bulky bar. */}
      <div className="md:hidden sticky top-0 z-10 bg-cream-50 border-b border-cream-200/60">
        <div className="flex items-center gap-2 px-3 pt-2 pb-1.5">
          <img src={securepayMark} alt="" className={`w-5 h-5 ${state.busy ? 'animate-pulse-soft' : ''}`} />
          <span className="font-display text-[0.8rem] text-forest-800">KS001</span>
          <span className="text-[0.65rem] text-sand-500">{state.busy ? 'thinking' : 'listening'}</span>
        </div>
        <div className="flex">
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
      </div>
      <div className="flex-1 flex overflow-hidden">
      {/* Phase 6 final correction: a restrained soft-green atmosphere on the active KS001
          conversation surface (see tailwind.config.js's `ks001-surface` token) -- warm cream base,
          quiet green tonal light, no flat solid color and no decorative gradient. */}
      <div className={`${mobileTab === 'build' ? 'flex' : 'hidden'} md:flex flex-1 md:flex-[1.35] flex-col min-w-0 bg-cream-50 bg-ks001-surface`}>
        {/* Task doctrine (KS001 identity): the person is talking to KS001, not "SecurePay" --
            SecurePay is the system/brand (see NavBar's top-left brand), KS001 is who is in this
            conversation. Reuses the one real, canonical SecurePay mark asset -- no generic
            silhouette, no separately-drawn avatar. Mobile's equivalent identity row is in the
            sticky header above. */}
        <div className="hidden md:flex items-center gap-2.5 px-4 md:px-6 py-3 border-b border-cream-200/60">
          <img src={securepayMark} alt="" className={`w-7 h-7 transition-opacity ${state.busy ? 'animate-pulse-soft' : ''}`} />
          <div><div className="font-display text-sm text-forest-800">KS001</div><div className="text-[0.7rem] text-sand-500">{state.busy ? 'thinking' : 'listening'}</div></div>
        </div>
        {/* Mobile: what SecurePay understands is one tap away, never a second copy of the desktop panel. */}
        {workbenchModel.items.length > 0 && <button onClick={openUnderstood} className="md:hidden mx-4 mt-3 flex min-h-11 items-center justify-between rounded-xl border border-cream-200 bg-white/80 px-3.5 text-left text-[0.85rem] text-forest-700 shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
          <span>What SecurePay understands <span className="text-sand-500">· {workbenchModel.items.length}</span></span><span aria-hidden="true" className="text-sand-400">›</span>
        </button>}
        <div className="flex-1 overflow-hidden">
          <ConversationSurface
            tail={state.turns.length > 0 ? { id: state.turns[state.turns.length - 1].id, sender: state.turns[state.turns.length - 1].sender } : null}
            thinking={state.busy && state.turns[state.turns.length - 1]?.sender === 'user'}
            disabled={state.busy || !!state.pending} onSend={text => void controller.send(text)} composerFocusKey={composerFocusKey}
            status={<div className="space-y-3">
              {/* Final Phase 4 Economy Turn 3 (Section 5) -- a failed Store "Use this" is never
                  silent: the person must explicitly retry or continue without the source before
                  anything from the offer reaches the conversation. */}
              {state.offerSelectionFailure && <StatusNotice tone="warning">
                SecurePay could not confirm this Store offer as a real commercial source. {state.offerSelectionFailure.error}
                <div className="flex flex-wrap gap-3 mt-2">
                  <button disabled={state.busy} onClick={() => void controller.retryOfferSelection()} className="text-forest-700 underline disabled:opacity-40">Retry</button>
                  <button disabled={state.busy} onClick={() => void controller.continueOfferWithoutSource()} className="text-sand-500 underline disabled:opacity-40">Continue without this source</button>
                </div>
              </StatusNotice>}
              {state.error && instrumentState.active === null && <StatusNotice tone="warning">{state.pending?.kind === 'turn' && 'SecurePay could not complete your turn. '}{state.error}
                <button disabled={state.busy} onClick={() => void controller.retry()} className="block mt-2 text-forest-700 underline disabled:opacity-40">Retry {state.pending?.kind === 'adopt' ? 'Use this' : 'turn'}</button>
              </StatusNotice>}
              <div className="flex flex-wrap gap-x-4 text-sm text-forest-700">
                <button disabled={state.busy} onClick={reviewing} className="min-h-11 underline disabled:opacity-40">Review what we have</button>
                <button
                  disabled={!state.conversationId || state.busy || !!state.pending || handoffState.phase !== 'idle'}
                  onClick={() => { if (state.conversationId) void handoffController.start(state.conversationId); }}
                  className="min-h-11 underline disabled:opacity-40"
                >
                  Continue with this
                </button>
                <button disabled={state.busy} onClick={startNewConversation} className="min-h-11 text-sand-500 underline disabled:opacity-40">Start new conversation</button>
              </div>
            </div>}>
            {[
              ...state.turns.map(turn => <div key={turn.id} data-turn-id={turn.id} className="space-y-3">
                {turn.sender === 'user' ? <MessageBubble text={turn.text} sender="user" /> : <>
                  <MessageBubble text={turn.response.message.text} sender="agent" />
                  {turn.response.components.filter(component => (component.type !== 'MESSAGE' || component.text !== turn.response.message.text) && component.type !== 'AGREEMENT_WORKSPACE' && component.type !== 'AGREEMENTS_HOME' && component.type !== 'DISCOVERY' && component.type !== 'AGREEMENT_PREVIEW')
                    .map((component, i) => <RichResponse key={i} component={component} onReview={reviewing}
                      live={turn.id === lastResponse?.id && !state.busy && turn.id === state.turns[state.turns.length - 1]?.id}
                      resolvePrompt={prompt => specForPrompt(prompt, workbenchModel)}
                      onPrompt={prompt => { const resolved = specForPrompt(prompt, workbenchModel); if ('spec' in resolved) instruments.open(resolved.spec); }} />)}
                </>}
              </div>),
              handoffState.phase !== 'idle' && <div key="handoff" className="space-y-3">
                <HandoffPanel handoff={handoffController} identity={identityController} onDone={noop} />
              </div>,
            ]}
          </ConversationSurface>
        </div>
      </div>
      <div className={`${mobileTab === 'understood' ? 'flex' : 'hidden'} md:flex md:flex-[1] flex-col border-l border-cream-200/60 bg-cream-50 bg-ks001-surface min-w-0 ${mobileTab === 'understood' ? 'flex-1 overflow-y-auto p-4' : ''}`}>
        <div className="md:hidden">{understoodContent}</div>
        <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0">
          {/* Product doctrine (task section 4): the overall panel title is always "What SecurePay
              understands" -- KS001 talks with the person, SecurePay maintains the structured
              understanding. A backend-supplied `panel.title` (a per-turn contextual heading) must
              never replace this; it simply isn't surfaced as the panel's own title. */}
          <div className="px-5 py-3 border-b border-cream-200/60"><h2 className="font-display text-sm text-forest-800">What SecurePay understands</h2></div>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-4">
            <div ref={setPanelSlot} />
            {understoodContent}
          </div>
        </div>
      </div>
      </div>
    </>}
    <InstrumentHost controller={instruments} agentBusy={state.busy || !!state.pending} panelSlot={panelSlot}
      onBackToConversation={() => { instruments.cancel(); setMobileTab('build'); setComposerFocusKey(key => key + 1); }} />
  </div>;
}
