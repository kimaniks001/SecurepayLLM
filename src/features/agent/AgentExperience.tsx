import { useEffect, useMemo, useState, useSyncExternalStore, useRef } from 'react';
import { consumeEntryView, consumeKs001EntryMessage } from '../experience/entryIntent';
import { Plus } from 'lucide-react';
import { SignedOutHome } from '../../components/SignedOutHome';
import { TrustProjectSection } from '../../components/TrustProjectSection';
import type { TrustProjectMembershipFact } from '../../components/trustProject';
import { NavBar } from '../../components/NavBar';
import { PublicHome } from '../public/PublicHome';
import { SignInExperience } from '../public/SignInExperience';
import { useSignInRoute } from '../public/signInRoute';
import { JoinExperience } from '../join/JoinExperience';
import { SignUpExperience } from '../join/SignUpExperience';
import { useJoinRoute } from '../join/route';
import type { ContinuationOutcome } from '../join/controller';
import { PublicShellProvider, createPublicShellBridge, focusKs001Composer, focusPublicSection, type PublicSectionId } from '../public/publicShell';
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
import type { FulfilmentNeedsGateway } from '../../api/securepay/fulfilment-needs';
import type { CircleGateway } from '../../api/securepay/circle';
import type { CommunityGateway } from '../../api/securepay/community';
import type { DiscoveryGateway } from '../../api/securepay/discovery';
import type { MasterGateway } from '../../api/securepay/master';
import type { MarketNetworkGateway } from '../../api/securepay/marketnetwork';
import type { ReferralGateway } from '../../api/securepay/referral';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import type { AppView } from '../../types';
import { deviceTimeZone, createAgentController, retryLabel, type AgentController } from './controller';
import { ConversationSurface } from '../conversation/ConversationSurface';
import { createInstrumentController } from '../instruments/controller';
import { InstrumentHost } from '../instruments/ui/InstrumentHost';
import { InstrumentPrompt } from '../instruments/ui/InstrumentPrompt';
import type { InstrumentSpec } from '../instruments/model';
import { UnderstoodWorkbench } from '../workbench/UnderstoodWorkbench';
import { createDiscoveryController, emptyQuery, type DiscoveryQuery } from '../discovery/controller';
import { DiscoveryHost } from '../discovery/ui/DiscoveryHost';
import { FoundOnSecurePay } from '../discovery/ui/FoundOnSecurePay';
import { SourceFailureNote, SourceReference } from '../discovery/ui/SourceReference';
import type { DiscoveryView } from '../../api/securepay/agent/discovery';
import { foundLabel } from '../discovery/result';
import { projectWorkbench, specForPrompt, type PromptResolution } from '../workbench/projection';
import type { PreviewView } from '../../api/securepay/agent/adapters';
import { createHandoffController } from '../handoff/controller';
import { createFormationController } from '../formation/controller';
import { AgreementShaping } from '../formation/AgreementShaping';
import { ContinuityChoice } from './ContinuityChoice';
import { clearComposerDrafts } from '../conversation/drafts';
import type { SendResult } from '../conversation/ConversationSurface';
import { conversationTitle, hasMeaningfulWork, isUnsaved, routeInput, startNewDecision } from '../entry/lifecycle';
import { StartFreshDialog } from '../entry/StartFreshDialog';
import { ContinueCard } from '../entry/ContinueCard';
import { FairTradePrinciplesPanel } from '../../components/FairTradePrinciples';
import { AgreementReview } from '../formation/AgreementReview';
import { retryPending, submitCorrection } from '../formation/correction';
import { MicroReview, type ResolveOutcome } from '../formation/MicroReview';
import { nextStep } from '../formation/nextStep';
import type { FormationOpenPoint, FormationSide } from '../formation/view';
import { HandoffPanel } from '../handoff/HandoffPanel';
import { createIdentityController } from '../identity/controller';
import { createSavedBuildController } from '../savedbuild/controller';
import { SavedBuildPanel, ContinueBuildingList } from '../savedbuild/SavedBuildPanel';
import { createSourceController, type SourceController } from '../sources/controller';
import { SourceMenu } from '../sources/ui/SourceMenu';
import { DeclaredSourcePanel, type DeclaredSourceKind } from '../sources/ui/DeclaredSourcePanel';
import { BringPlanPanel } from '../sources/ui/BringPlanPanel';
import { SourcesList } from '../sources/ui/SourceCard';
import { WorkspaceExperience } from '../workspace/WorkspaceExperience';
import { workspaceEntryFor, type WorkspaceEntry } from '../workspace/controller';
import { SupportExperience, type HelpNav } from '../support/SupportExperience';
import { peekSupportContext, clearSupportContext, type SupportContext } from '../support/context';
import { setDetailTabHint } from '../support/tabHint';
import { openMoneyFor } from '../money/handoff';
import type { AgreementReviewGateway } from '../../api/securepay/agreement-review';
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
import { VisionDreamHome } from '../visionboard/dreams/VisionDreamHome';
import { createVisionDreamController } from '../visionboard/dreams/controller';
import { prepareDreamHandoff } from '../visionboard/dreams/handoff';
import type { VisionDreamGateway } from '../../api/securepay/visiondreams';
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
import type { OrganizationGateway } from '../../api/securepay/organization';
import { createBusinessController } from '../business/controller';
import type { BusinessGateway } from '../../api/securepay/business';
import type { AuthorizationGateway } from '../../api/securepay/authorization';
import { DeveloperExperience } from '../developer/DeveloperExperience';
import { createDeveloperController } from '../developer/controller';
import type { DeveloperGateway } from '../../api/securepay/developer';

function RichResponse({ component, onReview, live = false, onPrompt, resolvePrompt, onRequestDiscovery }: { component: AgentComponentView; onReview: () => void; live?: boolean; onPrompt?: (prompt: InstrumentPromptView) => void; resolvePrompt?: (prompt: InstrumentPromptView) => PromptResolution; onRequestDiscovery?: (targetEntityId: string) => void }) {
  if (component.type === 'MESSAGE') return <MessageBubble text={component.text} sender="agent" />;
  // KS001 Upgrade Phase 1 final integration fix -- DISCOVERY OFFERED becomes a real, explicit, visible
  // accept action ONLY on the live/newest turn (matching INSTRUMENT_PROMPT's own doctrine below): an
  // older offer in the transcript is never re-actionable. Clicking it is the ONLY thing that ever calls
  // requestDiscovery -- never automatic, never inferred from prose.
  if (component.type === 'DISCOVERY_OFFER') {
    if (!live || !onRequestDiscovery) return null;
    return <div className="pl-1"><button type="button" onClick={() => onRequestDiscovery(component.targetEntityId)}
      className="inline-flex min-h-11 items-center rounded-full border border-forest-200 bg-forest-50/70 px-3.5 text-[0.85rem] font-medium text-forest-800 hover:border-forest-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">Look on SecurePay</button></div>;
  }
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
/** User-Ready Beta Gate 1 (EP-CERT-006) -- START NEW, always visible while working: an unrelated intention, never a reset of saved work. */
function NewWorkButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return <button type="button" onClick={onClick} aria-label="New — start something unrelated" data-new-work
    className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-forest-200 bg-white/90 ${compact ? 'px-3' : 'px-4'} text-[0.85rem] font-medium text-forest-700 shadow-soft hover:border-forest-300 hover:bg-forest-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300`}>
    <Plus className="h-4 w-4" aria-hidden="true" />New
  </button>;
}
type PublicShellBridge = ReturnType<typeof createPublicShellBridge>;

/**
 * Public Experience Convergence Phase 2 -- the public shell is provided here, OUTSIDE the router below, so
 * every screen the router can return (Home, a conversation, Store, Community, Recovery, Help, Sign in) gets
 * the public navigation while nobody is signed in, and the unchanged app navigation once someone is.
 */
export function AgentExperience(props: Omit<Parameters<typeof AgentExperienceRouter>[0], 'publicShell'>) {
  const sessionState = useSyncExternalStore(props.session.subscribe, props.session.getSnapshot);
  const [bridge] = useState(createPublicShellBridge);
  return (
    <PublicShellProvider value={sessionState.status === 'signed-in' ? null : bridge}>
      <AgentExperienceRouter {...props} publicShell={bridge} />
    </PublicShellProvider>
  );
}

function AgentExperienceRouter({ publicShell, gateway, agreementGateway, moneyGateway, agreementReviewGateway, storeGateway, fulfilmentNeedsGateway, circleGateway, communityGateway, discoveryGateway, masterGateway, marketNetworkGateway, referralGateway, projectGateway, visionBoardGateway, visionDreamGateway, settingsGateway, businessGateway, organizationGateway, developerGateway, notificationsGateway, subscriptionGateway, auth, session, initialStoreOfferRoute, trustedMediaOrigin }: {
  gateway: AgentGateway; agreementGateway: AgreementGateway; moneyGateway: MoneyGateway; agreementReviewGateway: AgreementReviewGateway; storeGateway: StoreGateway; fulfilmentNeedsGateway?: FulfilmentNeedsGateway; circleGateway: CircleGateway;
  communityGateway: CommunityGateway;
  /** Phase 6 Slice 5 (Discovery & Identity) -- Community/Circle/Store/People search. */
  discoveryGateway: DiscoveryGateway;
  masterGateway: MasterGateway; marketNetworkGateway: MarketNetworkGateway; referralGateway: ReferralGateway; projectGateway: ProjectGateway;
  visionBoardGateway: VisionBoardGateway;
  visionDreamGateway: VisionDreamGateway;
  settingsGateway: SettingsGateway; businessGateway: BusinessGateway; authorizationGateway: AuthorizationGateway; developerGateway: DeveloperGateway;
  /** Phase 4D (API ADR-0024) -- Organization KS onboarding and representation; absent means no Organization capacity. */
  organizationGateway?: OrganizationGateway;
  notificationsGateway: NotificationsGateway;
  subscriptionGateway: Pick<SubscriptionGateway, 'myStatus'>;
  auth: AuthGateway; session: SessionStore;
  initialStoreOfferRoute?: { canonicalKsNumber: string; offerId: string } | null;
  trustedMediaOrigin: string | null;
  publicShell: PublicShellBridge;
}) {
  const [externalEntryView] = useState(() => consumeEntryView());
  const [externalKs001Message] = useState(() => consumeKs001EntryMessage());
  const [controller, setController] = useState(() => createAgentController(gateway, undefined, { timeZone: deviceTimeZone }));
  const [handoffController, setHandoffController] = useState(() => createHandoffController(gateway));
  // Entry Perfection Phase 6 -- the server-owned emerging agreement (Review), and whether the person has opened it.
  const [formationController, setFormationController] = useState(() => createFormationController(gateway));
  const [reviewOpen, setReviewOpen] = useState(false);
  // User-Ready Beta Gate 1 (EP-CERT-007) -- the ONE open point being decided in a micro-review, if any.
  const [microReview, setMicroReview] = useState<string | null>(null);
  // User-Ready Beta Gate 1 (decision D1) -- a new intention waiting on "Start fresh?" because unsaved work would be left behind.
  const [freshIntent, setFreshIntent] = useState<null | ((set: { controller: AgentController; sourceController: SourceController }) => void)>(null);
  // User-Ready Beta Gate 1 (EP-CERT-010) -- KS001's compass, opened from KS001 itself (never navigating away from the work).
  const [compassOpen, setCompassOpen] = useState(false);
  const [identityController, setIdentityController] = useState(() => createIdentityController(auth, session));
  // KS001 Upgrade Phase 2 (Sections 14-17) -- "Save for later" / "Continue Building". Reuses the SAME
  // identityController the handoff flow uses (one sign-in surface, not two), reset alongside it below.
  const [savedBuildController, setSavedBuildController] = useState(() => createSavedBuildController(gateway));
  const savedBuildState = useSyncExternalStore(savedBuildController.subscribe, savedBuildController.getSnapshot);
  // KS001 Upgrade Phase 3 (Bring what you already have) -- "bring what you already have" into the SAME
  // canonical BUILD. onSourceIngested refreshes the REAL Trade Context once a source's extraction actually
  // lands new CANDIDATE facts, so BUILD reflects them without a manual chat turn (Section 30/31).
  //
  // KS001 Upgrade Phase 3 completion correction (item 7) -- refreshAfterSourceIngestion (not the plain
  // review()) also surfaces KS001's own real, server-composed continuation reply, so the person sees KS001
  // actually react to what was brought in, never only a silent BUILD refresh.
  //
  // KS001 Upgrade Phase 3 final merge-readiness correction (item 1) -- removal is a SEPARATE event
  // (onSourceChanged): the server invalidates unadopted candidates but never records a continuation reply
  // for it, so this deliberately calls the plain review() (context re-read only), never
  // refreshAfterSourceIngestion (which would look for a KS001 reply that was never produced), and never
  // fabricates one client-side either.
  const [sourceController, setSourceController] = useState(() => createSourceController(gateway, controller.ensureConversationId, {
    onSourceIngested: source => controller.refreshAfterSourceIngestion(source),
    onSourceChanged: () => void controller.review(),
  }));
  const sourcesState = useSyncExternalStore(sourceController.subscribe, sourceController.getSnapshot);
  const [bringPlanOpen, setBringPlanOpen] = useState(false);
  // Entry Perfection Phase 2 -- the pasted text is kept until SecurePay has actually read it (never lost on failure).
  const [bringPlanDraft, setBringPlanDraft] = useState<{ text: string; label: string }>({ text: '', label: '' });
  // Public Experience Convergence Phase 3 (Slice 3B) -- the Link / Place form, one at a time.
  const [declaredOpen, setDeclaredOpen] = useState<DeclaredSourceKind | null>(null);
  // User-Ready Beta Gate 1 (EP-CERT-014) -- a panel shows only the outcome of ITS OWN submission, never a stale error left
  // by some other source (a failed DOCX must not reappear inside a later "Paste" or "Link" panel).
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [declaredDraft, setDeclaredDraft] = useState<{ value: string; label: string }>({ value: '', label: '' });
  const openBringPlan = () => { setDeclaredOpen(null); setIntakeError(null); setBringPlanOpen(true); };
  const openDeclared = (kind: DeclaredSourceKind) => { setBringPlanOpen(false); setIntakeError(null); setDeclaredDraft({ value: '', label: '' }); setDeclaredOpen(kind); };
  const [projectsController] = useState(() => createProjectsController(projectGateway));
  const [visionBoardController] = useState(() => createVisionBoardController(visionBoardGateway));
  const [visionDreamController] = useState(() => createVisionDreamController(visionDreamGateway, gateway));
  const visionDreamState = useSyncExternalStore(visionDreamController.subscribe, visionDreamController.getSnapshot);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useEffect(() => {
    if (externalKs001Message) void controller.send(externalKs001Message);
    // one-shot message consumed from sessionStorage at mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase 1 Interaction Instruments: bound to the CURRENT conversation controller, so a new
  // conversation always starts with a fresh, closed instrument.
  const instruments = useMemo(() => createInstrumentController(controller), [controller]);
  const instrumentState = useSyncExternalStore(instruments.subscribe, instruments.getSnapshot);
  // Phase 2 "Find on SecurePay": bound to the same conversation controller so choosing a result is the SAME
  // commercial-source selection (`useOffer`) the standalone Store already uses -- one pathway, one conversation.
  const discovery = useMemo(() => createDiscoveryController(storeGateway, controller, trustedMediaOrigin), [storeGateway, controller, trustedMediaOrigin]);
  const discoveryState = useSyncExternalStore(discovery.subscribe, discovery.getSnapshot);
  const [panelSlot, setPanelSlot] = useState<HTMLElement | null>(null);
  const [composerFocusKey, setComposerFocusKey] = useState(0);
  // "See what SecurePay found": bring the visible FOUND ON SECUREPAY section into view and focus it.
  const [foundFocusKey, setFoundFocusKey] = useState(0);
  useEffect(() => {
    if (!foundFocusKey) return;
    const target = [...document.querySelectorAll<HTMLElement>('[data-found-on-securepay]')].find(el => el.offsetParent !== null);
    target?.focus(); target?.scrollIntoView({ block: 'start' });
  }, [foundFocusKey]);
  const handoffState = useSyncExternalStore(handoffController.subscribe, handoffController.getSnapshot);
  const formationState = useSyncExternalStore(formationController.subscribe, formationController.getSnapshot);
  // Entry Perfection Phase 6 -- the emerging agreement follows every new version of SecurePay's understanding (a turn, a
  // source, a correction), so what the person reviews is always the current one.
  const contextVersion = state.context.data?.version;
  useEffect(() => {
    if (state.conversationId && contextVersion !== undefined) void formationController.load(state.conversationId);
  }, [state.conversationId, contextVersion, formationController]);
  // Entry Perfection Phase 7 -- a finished turn can change what SecurePay needs to ask without changing the agreement itself
  // ("I don't know" leaves the point open), so the question is re-read after every completed turn too.
  const lastTurnId = state.turns.length > 0 ? state.turns[state.turns.length - 1].id : null;
  useEffect(() => {
    if (state.conversationId && lastTurnId && !state.busy && !state.pending) void formationController.load(state.conversationId);
  }, [state.conversationId, lastTurnId, state.busy, state.pending, formationController]);
  const sessionState = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const signedIn = sessionState.status === 'signed-in';
  // Public Experience Convergence Phase 2 -- the public Sign in route and in-page chapter navigation.
  const signInRoute = useSignInRoute();
  // Public Experience Convergence Phase 4 -- the live Join route and the identity-only signup route.
  // The generic signup (#/sign-up, "Get one") is the second leg of the Sign in journey: it shares Sign in's
  // one in-memory origin + intent (signInRoute), so a KS Number created there returns the person to the
  // same place Sign in would have. Join owns its own continuation and never uses it.
  const joinRoute = useJoinRoute();
  const [pendingSection, setPendingSection] = useState<PublicSectionId | null>(null);
  const [pendingComposerFocus, setPendingComposerFocus] = useState(false);
  // Once SecurePay confirms the person, leave Sign in for where they came from, or the area they asked
  // for. A signed-in person who lands on #/sign-in is simply returned too.
  useEffect(() => {
    if (!signedIn || !(signInRoute.active || signInRoute.signingUp)) return;
    const intent = signInRoute.close();
    if (intent) navigateTo(intent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, signInRoute.active, signInRoute.signingUp]);
  const [notice, setNotice] = useState<string | null>(null);
  const [home, setHome] = useState(false);
  // Public Experience Convergence Phase 2 -- once the public Home is showing, finish a pending chapter/composer focus.
  useEffect(() => {
    if (pendingSection && focusPublicSection(pendingSection)) setPendingSection(null);
    if (pendingComposerFocus && focusKs001Composer()) setPendingComposerFocus(false);
  }, [pendingSection, pendingComposerFocus, home]);
  const [workspace, setWorkspace] = useState(externalEntryView === 'agreements' || externalEntryView === 'signed-in');
  // Final Phase 3 completion pass, Section 4 -- mobile-first BUILD | UNDERSTOOD. BUILD is the
  // default; a person taps to UNDERSTOOD, never the other way around. Desktop shows both
  // simultaneously and ignores this entirely (see the render below).
  const [mobileTab, setMobileTab] = useState<'build' | 'understood'>('build');
  const [lastSeenStructuredTurnId, setLastSeenStructuredTurnId] = useState<string | null>(null);
  const [workspaceAgreementId, setWorkspaceAgreementId] = useState<string | null>(null);
  // Phase 4 final navigation correction -- which Workspace view an App-level destination ENTERS on:
  // 'agreements' -> the Agreements Hub, everything else -> Signed-in Home. One-shot (read at mount).
  const [workspaceEntry, setWorkspaceEntry] = useState<WorkspaceEntry>(externalEntryView === 'agreements' ? 'hub' : 'home');
  const [store, setStore] = useState(!!initialStoreOfferRoute || externalEntryView === 'store');
  const [storeOfferRoute, setStoreOfferRoute] = useState(initialStoreOfferRoute ?? null);
  const [community, setCommunity] = useState(false);
  const [circle, setCircle] = useState(false);
  const [ecosystem, setEcosystem] = useState(false);
  const [ecosystemAgreementId, setEcosystemAgreementId] = useState<string | null>(null);
  const [projects, setProjects] = useState(false);
  const [visionBoard, setVisionBoard] = useState(externalEntryView === 'vision-board');
  const [visionLibrary, setVisionLibrary] = useState(false);
  const [dreamHandoffError, setDreamHandoffError] = useState<string | null>(null);
  // Phase 5 -- Life & Business World destinations, all authenticated-only, same router.
  const [account, setAccount] = useState(false);
  const [settingsView, setSettingsView] = useState(false);
  const [recoveryView, setRecoveryView] = useState(false);
  const [businessView, setBusinessView] = useState(false);
  const [developerView, setDeveloperView] = useState(false);
  const [notificationsView, setNotificationsView] = useState(false);
  // Help & Support. A context is pending when Help was opened from the Money route (which sits outside this shell); it is held in memory only.
  const [helpContext, setHelpContext] = useState<SupportContext | null>(() => peekSupportContext());
  const [supportView, setSupportView] = useState(() => peekSupportContext() !== null && session.getSnapshot().status === 'signed-in');
  useEffect(() => { clearSupportContext(); }, []);
  // Session-clearing correction: the backend already revoked this session the moment a password
  // change succeeds (verified in controller.ts's own doc comment) -- the frontend must reflect that
  // immediately, not wait for a subsequent request to fail. session.clear() is the one real session
  // boundary (api/securepay/session.ts); reusing the existing `notice` banner (already used for
  // "sign in to view your account" elsewhere in this router) avoids building a new flash-message
  // mechanism for one narrow case.
  const [accountController] = useState(() => createAccountController(
    { circle: circleGateway, logoutAll: auth.logoutAll, subscription: subscriptionGateway, changePassword: auth.changePassword },
    () => { session.clear(); setNotice('Password changed. Sign in again with your new password.'); },
  ));
  const [settingsController] = useState(() => createSettingsController(settingsGateway));
  const [notificationsController] = useState(() => createNotificationsController(notificationsGateway));
  const [recoveryController] = useState(() => createRecoveryController(auth));
  const [businessController] = useState(() => createBusinessController({ business: businessGateway, circle: circleGateway, trustProject: communityGateway.membership, organization: organizationGateway }));
  // Phase 4C -- the Join page adapts to the capacity SecurePay confirmed in the Business area (never to local state).
  const businessState = useSyncExternalStore(businessController.subscribe, businessController.getSnapshot, businessController.getSnapshot);
  const actingForBusiness = businessState.acting.kind === 'business'
    ? { businessKsNumber: businessState.acting.business.businessKsNumber, displayName: businessState.acting.business.displayName }
    : null;
  // Phase 4D -- likewise for an Organization KS the person acts for.
  const actingForOrganization = businessState.acting.kind === 'organization'
    ? { organizationKsNumber: businessState.acting.organization.organizationKsNumber, displayName: businessState.acting.organization.displayName }
    : null;
  const [developerController] = useState(() => createDeveloperController(developerGateway));
  // Phase 5 -- resolved once via the same real, self-scoped `/circle/me` read Account/Circle already
  // use, so Projects never forces the person to type their own KS Number for the common case (Vision
  // Board's own backend already defaults to the caller's own KS when none is supplied; Projects'
  // `ownerKsNumber` query parameter is required server-side, so this is the frontend-side equivalent).
  const [ownKsNumber, setOwnKsNumber] = useState<string | null>(null);
  useEffect(() => {
    // Phase 7 Slice 5B -- cleared on sign-out: Home now shows it as the member's identity, so it must
    // never carry over to the next person who signs in on this device.
    // Phase 4B -- the Business list and any "acting as" capacity belong to this person only.
    if (sessionState.status !== 'signed-in') { setOwnKsNumber(null); businessController.reset(); return; }
    if (ownKsNumber) return;
    let cancelled = false;
    void circleGateway.me().then(profile => { if (!cancelled) setOwnKsNumber(profile.canonicalKsNumber); }).catch(() => { /* Projects still works with manual KS entry. */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState.status]);
  // Phase 7 Slice 5B -- the Home's Trust Project doorway reads the SAME self-scoped membership record
  // Community uses. Unknown (signed out, or a failed read) shows no membership claim at all.
  const onJoinPage = !!joinRoute.value;
  const [trustMembershipStatus, setTrustMembershipStatus] = useState<TrustProjectMembershipFact['status'] | undefined>(undefined);
  useEffect(() => {
    if (sessionState.status !== 'signed-in') { setTrustMembershipStatus(undefined); return; }
    let cancelled = false;
    // Re-read on leaving Community (decline happens there) and on leaving the Join page (Phase 4).
    if (community || onJoinPage) return;
    // The backend omits a null `status` (non_null inclusion): an absent status is a known non-member (null),
    // distinct from a failed read (undefined, which makes no membership claim at all).
    void communityGateway.membership.me().then(m => { if (!cancelled) setTrustMembershipStatus(m.status ?? null); }).catch(() => { if (!cancelled) setTrustMembershipStatus(undefined); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState.status, community, onJoinPage]);
  // Entry Perfection Phase 6 -- refreshing what SecurePay understands refreshes the emerging agreement too, even when the
  // understanding's version is unchanged (a Store price or an open point can still have moved).
  const reviewing = () => { void controller.review(); if (state.conversationId) void formationController.load(state.conversationId); };
  /**
   * START NEW -- an unrelated intention. Replaces the ACTIVE workspace with fresh controllers (conversation, sources,
   * formation/Review, handoff, identity, saved-build, instruments/discovery via their memo on the controller) and returns
   * them, so the caller can put the new intention straight into the NEW conversation (never the old one -- EP-CERT-013).
   * Saved work is untouched: it lives on the server and is reachable through Continue.
   */
  const startNewConversation = (): { controller: AgentController; sourceController: SourceController } => {
    instruments.cancel();
    discovery.close();
    const freshController = createAgentController(gateway, undefined, { timeZone: deviceTimeZone });
    const freshSourceController = createSourceController(gateway, freshController.ensureConversationId, {
      onSourceIngested: source => freshController.refreshAfterSourceIngestion(source),
      onSourceChanged: () => void freshController.review(),
    });
    setController(freshController);
    setHandoffController(createHandoffController(gateway));
    setFormationController(createFormationController(gateway));
    setReviewOpen(false);
    setIdentityController(createIdentityController(auth, session));
    setSavedBuildController(createSavedBuildController(gateway));
    setSourceController(freshSourceController);
    setBringPlanOpen(false);
    setBringPlanDraft({ text: "", label: "" });
    setDeclaredOpen(null);
    setNotice(null);
    // User-Ready Beta Gate 1 -- nothing of the previous workspace's presentation state carries over either.
    setMobileTab('build');
    setLastSeenStructuredTurnId(null);
    setMicroReview(null);
    setFreshIntent(null);
    setDirectAck(null);
    // Phase 3 (Slice 3A) -- leaving a conversation on purpose leaves its anonymous access behind too.
    gateway.forgetResumableConversation?.();
    // Entry Perfection Phase 9 -- and any unsent words from it (a shared device's next person never sees them).
    clearComposerDrafts();
    setContinuityDismissed(false);
    return { controller: freshController, sourceController: freshSourceController };
  };

  // ---- User-Ready Beta Gate 1 -- START NEW / CONTINUE (EP-CERT-006/013, decision D1) and ONE universal input (EP-CERT-001).
  type WorkSet = { controller: AgentController; sourceController: SourceController };
  const currentSet = (): WorkSet => ({ controller, sourceController });
  const meaningfulWork = hasMeaningfulWork({ turns: state.turns, sources: sourcesState.sources,
    factCount: (state.context.data?.entities.length ?? 0) + (state.context.data?.relationships.length ?? 0) });
  const unsavedWork = isUnsaved(state.conversationId, gateway.resumableConversationId?.() ?? null);
  const currentTitle = conversationTitle(formationState.data?.what[0]?.value,
    state.turns.map(turn => turn.sender === 'user' ? { sender: 'user', text: turn.text } : { sender: 'agent' }));
  /**
   * Runs a NEW intention in a fresh workspace. Nothing open: the current (empty) one. Unsaved meaningful work: ask first
   * ("Start fresh?"), holding the intention until the person decides. Otherwise: start fresh cleanly. Returns whether it ran now.
   */
  const requestFresh = (run: (set: WorkSet) => void): boolean => {
    const decision = startNewDecision({ conversationId: state.conversationId, unsaved: unsavedWork, meaningful: meaningfulWork });
    if (decision === 'none') { run(currentSet()); return true; }
    if (decision === 'confirm') { setFreshIntent(() => run); return false; }
    run(startNewConversation());
    return true;
  };
  /**
   * The ONE input door: <= 1,200 characters is a conversational turn; longer is read in full as a pasted source (the person
   * never chooses a transport). A source keeps the words until SecurePay has really read them; on failure they are kept.
   */
  const submitInput = (text: string, set: WorkSet = currentSet()): SendResult => {
    if (routeInput(text) === 'source') {
      return set.sourceController.addPastedText(text).then(outcome => {
        // Nothing typed ever disappears: a read that FAILED keeps its text on the server (its card offers Try again); one that
        // was refused or never confirmed (no card) re-opens the paste panel with the words and the reason, ready to retry.
        if (!outcome.ok && !outcome.source) { setBringPlanDraft({ text, label: '' }); setIntakeError(outcome.error); setBringPlanOpen(true); }
        return outcome.ok || !!outcome.source;
      });
    }
    const snapshot = set.controller.getSnapshot();
    if (snapshot.busy || snapshot.pending) return false;
    void set.controller.send(text);
    return true;
  };
  const startNewFromConversation = () => { requestFresh(() => setPendingComposerFocus(true)); };

  // ---- User-Ready Beta Gate 1 -- settle ONE decision directly (EP-CERT-003/007, "direct conflict resolution").
  // One stable clientActionId per intention (point + kept side + typed amount), reused by any retry: never applied twice.
  const resolveActionIds = useRef(new Map<string, string>());
  const [directAck, setDirectAck] = useState<string | null>(null);
  useEffect(() => { setDirectAck(null); }, [lastTurnId]);
  const resolveConflict = async (point: FormationOpenPoint, side: FormationSide, typed?: { amount: string; currency: string }): Promise<ResolveOutcome> => {
    const formation = formationState.data;
    if (!formation || !side.factId) return { ok: false, error: 'This can’t be settled here. Tell KS001 which is right.' };
    const intention = `${point.id}|${side.factId}|${typed?.amount ?? ''}|${typed?.currency ?? ''}`;
    const clientActionId = resolveActionIds.current.get(intention) ?? crypto.randomUUID();
    resolveActionIds.current.set(intention, clientActionId);
    const outcome = await controller.submitStructuredInput({
      type: 'RESOLVE_CONFLICT', conflictId: point.id, expectedTradeContextVersion: formation.version, clientActionId,
      ...(point.topic === 'DATE' ? { targetEntityId: side.factId } : { targetRelationshipId: side.factId }),
      ...(typed ? { amount: typed.amount, currency: typed.currency } : {}),
    });
    if (outcome.ok) {
      resolveActionIds.current.delete(intention);
      if (state.conversationId) void formationController.load(state.conversationId);
      setDirectAck(typed ? `Updated — ${typed.currency} ${Number(typed.amount).toLocaleString('en-KE')}.` : `Using ${side.value}${side.from ? `, from ${side.from}` : ''}.`);
      return { ok: true };
    }
    return { ok: false, error: outcome.stale ? outcome.error : `${outcome.error} You can also tell KS001 which is right.` };
  };
  const tellKs001 = async (text: string): Promise<ResolveOutcome> => {
    const result = await submitCorrection(controller, text);
    return result.status === 'ok' ? { ok: true } : { ok: false, error: result.message };
  };
  const microPoint = microReview ? formationState.data?.openPoints.find(point => point.id === microReview) ?? null : null;
  const step = nextStep(formationState.data);
  const goNext = () => { if (step.kind === 'point') setMicroReview(step.point.id); else setReviewOpen(true); };

  // Entry Perfection Phase 8 (§28) -- signing out leaves the conversation behind: an unsaved conversation's possession secret
  // must never carry over to the next person on this device (a saved one is already unreachable once signed out).
  const previousSessionStatus = useRef(sessionState.status);
  useEffect(() => {
    const was = previousSessionStatus.current;
    previousSessionStatus.current = sessionState.status;
    if (was === 'signed-in' && sessionState.status === 'signed-out') startNewConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState.status]);

  // Public Experience Convergence Phase 3 (Slice 3A) -- same-tab continuity. A reload in THIS tab finds the
  // tab-scoped record (kept only by the agent gateway's continuity module) and resumes that conversation;
  // another tab never has it. The
  // context read proves the token still works first -- a 404 (expired, claimed, or legacy) forgets the
  // record in the gateway and the person simply starts fresh on Home.
  useEffect(() => {
    const resumable = gateway.resumableConversationId?.();
    if (!resumable || controller.getSnapshot().conversationId) return;
    let cancelled = false;
    void gateway.readContext(resumable).then(
      () => { if (!cancelled && !controller.getSnapshot().conversationId) void controller.resumeConversation(resumable); },
      () => { /* not resumable any more -- the gateway already forgot it on a 404 */ },
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // KS001 Upgrade Phase 3 -- keeps the visible source list in step with whichever conversation is
  // actually current (a fresh one, a resumed saved build, or one seeded from a Store offer/AI handoff).
  useEffect(() => {
    void sourceController.list(state.conversationId);
  }, [state.conversationId, sourceController]);

  /**
   * Public Experience Convergence Phase 2 -- a signed-out person asking for a private area is taken to the
   * public Sign in route (never a dead-end notice), then on to that area once SecurePay confirms them.
   */
  const requestSignIn = (intent: AppView) => { setHome(true); signInRoute.open(intent); };
  /** Shared by the top NavBar, WorkspaceExperience's own NavBar, StoreExperience's own NavBar, and
   * CommunityExperience/CircleExperience/EcosystemExperience's own NavBars — one navigation-out policy. */
  const navigateTo = (view: AppView) => {
    setNotice(null);
    // Phase 5 -- cleared unconditionally on every navigation so the pre-existing branches below
    // never need editing to know about these five new destinations.
    setAccount(false); setSettingsView(false); setRecoveryView(false); setBusinessView(false); setDeveloperView(false); setNotificationsView(false); setSupportView(false); setHelpContext(null); setVisionLibrary(false); setDreamHandoffError(null); // a scoped Help context never outlives its screen
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
      requestSignIn('projects');
      return;
    }
    // Final Completion Phase 5B -- the Vision Board is a private, authenticated-only KS operating
    // memory (ideas, plans, guidance, templates), never a shared or public surface; a signed-out
    // visitor is routed to sign in first, exactly like Projects above.
    if (view === 'vision-board') {
      setStore(false); setCommunity(false); setCircle(false); setEcosystem(false); setEcosystemAgreementId(null); setWorkspace(false); setWorkspaceAgreementId(null); setProjects(false);
      if (sessionState.status === 'signed-in') { setVisionBoard(true); return; }
      requestSignIn('vision-board');
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
      requestSignIn('account');
      return;
    }
    // Notifications is the canonical in-app attention centre -- private and authenticated-only,
    // exactly like Account/Settings/Business/Developer above.
    if (view === 'notifications') {
      setStore(false); setCommunity(false); setCircle(false); setEcosystem(false); setEcosystemAgreementId(null); setWorkspace(false); setWorkspaceAgreementId(null); setProjects(false); setVisionBoard(false);
      if (sessionState.status === 'signed-in') { setNotificationsView(true); return; }
      requestSignIn('notifications');
      return;
    }
    // Help & Support is reachable signed in or out ("Trouble signing in" must work signed out); its own content is scoped by what the person can read as themselves.
    if (view === 'support') {
      setStore(false); setCommunity(false); setCircle(false); setEcosystem(false); setEcosystemAgreementId(null); setWorkspace(false); setWorkspaceAgreementId(null); setProjects(false); setVisionBoard(false); setHome(false);
      setSupportView(true);
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
        setWorkspaceEntry(workspaceEntryFor(view));
        setWorkspace(true);
        return;
      }
      setWorkspaceAgreementId(null);
      setHome(true);
      if (view !== 'signed-in') requestSignIn(view);
      return;
    }
    setWorkspaceAgreementId(null);
    setNotice('That isn’t available here. You can keep talking with KS001.');
  };
  const askKs001FromSurface = (message: string) => {
    const text = message.trim();
    if (!text) return;
    setNotice(null);
    setStore(false);
    setCommunity(false);
    setCircle(false);
    setEcosystem(false);
    setEcosystemAgreementId(null);
    setProjects(false);
    setVisionBoard(false);
    setVisionLibrary(false);
    setWorkspace(false);
    setWorkspaceAgreementId(null);
    setAccount(false);
    setSettingsView(false);
    setBusinessView(false);
    setDeveloperView(false);
    setNotificationsView(false);
    setSupportView(false);
    setHelpContext(null);
    setHome(false);
    void controller.send(text);
  };

  /** Opens the given Agreement directly in the Workspace -- the same real mechanism
   * WorkspaceExperience's own controller uses internally, not a new one. PHASE 4 Care convergence:
   * `NotificationsExperience` itself now decides WHETHER to call this at all (gated on the notification's
   * own closed `actionKey` contract -- `OPEN_AGREEMENT`/`REVIEW_AGREEMENT`, never `agreementId`'s mere
   * presence); this function only performs the navigation once that decision has already been made. */
  const openAgreementFromNotification = (agreementId: string) => {
    setNotificationsView(false);
    setStore(false); setCommunity(false); setCircle(false); setEcosystem(false); setEcosystemAgreementId(null); setProjects(false); setVisionBoard(false);
    setWorkspaceAgreementId(agreementId);
    setWorkspaceEntry('home');
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

  // Public Experience Convergence Phase 2 -- what the public navigation does, bound on every render so it
  // always acts on this router's current state.
  const leaveSignIn = () => { if (signInRoute.active || signInRoute.signingUp) signInRoute.close(); };
  publicShell.bind({
    home: () => { leaveSignIn(); joinRoute.close(); navigateTo('signed-in'); },
    signIn: () => signInRoute.open(null),
    join: () => { leaveSignIn(); joinRoute.open(); },
    section: id => { leaveSignIn(); navigateTo('signed-in'); setPendingSection(id); },
    skipToKs001: () => { if (focusKs001Composer()) return; leaveSignIn(); navigateTo('signed-in'); setPendingComposerFocus(true); },
  });

  // Public Experience Convergence Phase 4 -- conversation continuity through Join is a SEPARATE authority:
  // only after membership succeeds, the tab's anonymous conversation (if any) is claimed with its Phase 3
  // possession token; a failure here never rolls membership back.
  // Entry Perfection Phase 9 (UR-267) -- Join never claims the tab's anonymous conversation silently: possessing the tab is not
  // proof that the person joining is the one who typed it. The explicit "Continue with the agreement you started in this tab?"
  // choice (below, shown to any signed-in person while an unsaved conversation is in this tab) is the only claim.
  const continueConversationAfterJoin = async (): Promise<ContinuationOutcome> => ({ kind: 'none' });

  const [continuityDismissed, setContinuityDismissed] = useState(false);
  const [continuityBusy, setContinuityBusy] = useState(false);
  const [dreamClaimOpen, setDreamClaimOpen] = useState(false);
  const [dreamClaimThought, setDreamClaimThought] = useState('');
  const resumableAnonymous = gateway.resumableConversationId?.() ?? null;
  const continuityChoice = signedIn && !continuityDismissed && !!resumableAnonymous && resumableAnonymous === state.conversationId
    && handoffState.phase === 'idle';
  const continueWithThisTab = async () => {
    if (!resumableAnonymous) return;
    setContinuityBusy(true);
    try {
      await gateway.saveBuild(resumableAnonymous); // the ONE claim: explicit, with the possession proof, exactly once
      setDreamClaimOpen(false);
      setContinuityDismissed(true);
    } catch {
      setNotice('SecurePay couldn’t save this to your account just now. It’s still here — try again.');
    } finally {
      setContinuityBusy(false);
    }
  };
  const finishDreamClaim = (saved: Awaited<ReturnType<typeof visionDreamController.retry>>) => {
    if (!saved) return;
    setContinuityDismissed(true); setDreamClaimOpen(false); setDreamClaimThought('');
    setDreamHandoffError(null); setVisionBoard(true); setHome(false);
  };
  const saveTemporaryAsDream = async () => {
    if (!resumableAnonymous) return;
    finishDreamClaim(await visionDreamController.claimExisting(resumableAnonymous, dreamClaimThought));
  };
  const retryTemporaryDream = async () => finishDreamClaim(await visionDreamController.retry());
  const reconcileTemporaryDream = async () => finishDreamClaim(await visionDreamController.reconcilePending());

  if (joinRoute.value) {
    return (
      <div className={`min-h-dvh flex flex-col bg-cream-100 ${signedIn ? 'pb-16 md:pb-0' : ''}`}>
        <NavBar view="community" onNavigate={view => { joinRoute.close(); navigateTo(view); }} />
        <JoinExperience
          key={signedIn ? `signed-in:${actingForBusiness ? `business:${actingForBusiness.businessKsNumber}` : actingForOrganization ? `organization:${actingForOrganization.organizationKsNumber}` : 'self'}` : 'signed-out'}
          actingFor={actingForBusiness}
          actingForOrganization={actingForOrganization}
          selfName={businessState.self.data?.displayName ?? null}
          onSwitchToSelf={() => { businessController.actAsSelf(); void businessController.loadMine(); }}
          communityGateway={communityGateway}
          auth={auth}
          session={session}
          signedIn={signedIn}
          interest={joinRoute.value.interest}
          continueConversation={continueConversationAfterJoin}
          onExploreCommunity={() => { joinRoute.close(); navigateTo('community'); }}
          onReturnToConversation={conversationId => {
            joinRoute.close();
            setHome(false);
            if (controller.getSnapshot().conversationId !== conversationId) void controller.resumeConversation(conversationId);
            else void controller.review();
          }}
          onHelp={() => { joinRoute.close(); navigateTo(signedIn ? 'support' : 'recovery'); }}
          onDone={() => { joinRoute.close(); navigateTo('signed-in'); }}
        />
      </div>
    );
  }

  if (signInRoute.signingUp && !signedIn) {
    return (
      <div className="min-h-dvh flex flex-col bg-cream-100">
        <NavBar view="signed-out" onNavigate={navigateTo} />
        <SignUpExperience
          auth={auth}
          session={session}
          onSignIn={() => { signInRoute.toSignIn(); }}
          onCancel={() => { signInRoute.toSignIn(); }}
        />
      </div>
    );
  }

  if (signInRoute.active && !signedIn) {
    return (
      <div className="min-h-dvh flex flex-col bg-cream-100">
        <NavBar view="signed-out" onNavigate={navigateTo} />
        <SignInExperience
          auth={auth}
          session={session}
          onSignedIn={noop}
          onCancel={() => { signInRoute.close(); }}
          onRecover={() => { signInRoute.close(); navigateTo('recovery'); }}
          onGetKsNumber={() => { signInRoute.toSignUp(); }}
        />
      </div>
    );
  }

  if (store) {
    return (
      <StoreExperience
        gateway={storeGateway}
        businessGateway={businessGateway}
        marketNetworkGateway={marketNetworkGateway}
        fulfilmentNeedsGateway={fulfilmentNeedsGateway}
        auth={auth}
        session={session}
        initialOfferRoute={storeOfferRoute}
        trustedMediaOrigin={trustedMediaOrigin}
        onNavigate={navigateTo}
        onUseOffer={fact => { setStore(false); setHome(false); void controller.useOffer(fact); }}
        onOpenBusinessVision={businessKsNumber => {
          setStore(false);
          setVisionLibrary(true);
          void visionBoardController.loadForOwner(businessKsNumber);
        }}
        onAskKs001={askKs001FromSurface}
      />
    );
  }

  if (community) {
    return (
      <CommunityExperience
        gateway={storeGateway}
        communityGateway={communityGateway}
        discoveryGateway={discoveryGateway}
        trustedMediaOrigin={trustedMediaOrigin}
        onNavigate={navigateTo}
        onOpenCircle={() => navigateTo('circle')}
        onInvokeKs001InCircle={circleId => {
          void gateway.createCircleConversation(circleId).then(created => {
            setCommunity(false);
            setHome(false);
            if (created.conversationId) void controller.resumeConversation(created.conversationId);
          });
        }}
        onOpenStoreOffer={(canonicalKsNumber, offerId) => { setStoreOfferRoute({ canonicalKsNumber, offerId }); navigateTo('store'); }}
        // Phase 6 Slice 4 (Community → Trade) -- mirrors onUseOffer's own pattern exactly: leave
        // Community, then let the SAME real Agent conversation controller select the source.
        onUseThis={fact => { setCommunity(false); setHome(false); void controller.useCommunitySource(fact); }}
        onJoinTrustProject={() => { setCommunity(false); joinRoute.open(); }}
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
      <VisionDreamHome
        controller={visionDreamController}
        handoffError={dreamHandoffError}
        onContinue={continuation => {
          setDreamHandoffError(null);
          void prepareDreamHandoff(controller, continuation).then(result => {
            if (result.ok) { setVisionBoard(false); setHome(false); return; }
            setDreamHandoffError(result.error);
          });
        }}
        onOpenLibrary={() => { setDreamHandoffError(null); setVisionBoard(false); setVisionLibrary(true); }}
        onNavigate={navigateTo}
      />
    );
  }

  if (visionLibrary && sessionState.status === 'signed-in') {
    return (
      <VisionBoardExperience
        controller={visionBoardController}
        documentGateway={visionBoardGateway}
        fulfilmentNeedsGateway={fulfilmentNeedsGateway}
        defaultOwnerKsNumber={visionBoardController.getSnapshot().ownerKsNumber}
        onNavigate={navigateTo}
        onOpenStoreOffer={(canonicalKsNumber, offerId) => {
          setVisionLibrary(false);
          setStoreOfferRoute({ canonicalKsNumber, offerId });
          setStore(true);
        }}
        onAskKs001={askKs001FromSurface}
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
    return <BusinessExperience controller={businessController} onNavigate={navigateTo} onOpenJoin={() => { setBusinessView(false); joinRoute.open(); }} />;
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

  if (supportView) {
    const signedIn = sessionState.status === 'signed-in';
    const leaveSupport = () => { setSupportView(false); setHelpContext(null); };
    const openAgreement = (agreementId: string) => { leaveSupport(); openAgreementFromNotification(agreementId); };
    const helpNav: HelpNav = {
      openAgreement,
      openAgreementReviews: (agreementId, reviewCaseId) => { setDetailTabHint({ agreementId, tab: 'support', reviewCaseId }); openAgreement(agreementId); },
      openMoney: handoff => { leaveSupport(); openMoneyFor(handoff); },
      askAgent: () => { setHelpContext(null); if (signedIn) navigateTo('signed-in'); else { setSupportView(false); setHome(false); setWorkspace(false); } },
      recovery: () => { setHelpContext(null); navigateTo('recovery'); },
      notifications: () => { setHelpContext(null); navigateTo('notifications'); },
      account: () => { setHelpContext(null); navigateTo('account'); },
      agreements: () => { setHelpContext(null); navigateTo('agreements'); },
      money: () => { leaveSupport(); window.location.hash = '#/money'; },
      store: () => { setHelpContext(null); navigateTo('store'); },
      community: () => { setHelpContext(null); navigateTo('community'); },
    };
    return <SupportExperience ctx={helpContext} signedIn={signedIn} agreementGateway={agreementGateway} reviewGateway={agreementReviewGateway} moneyGateway={moneyGateway} nav={helpNav} navigate={navigateTo} onBack={helpContext ? () => openAgreement(helpContext.agreementId) : signedIn ? () => { leaveSupport(); navigateTo('signed-in'); } : leaveSupport} />;
  }

  if (workspace && sessionState.status === 'signed-in') {
    const workspaceGateway = { ...agreementGateway, money: moneyGateway, review: agreementReviewGateway };
    return <WorkspaceExperience
      onOpenSupport={context => { setHelpContext(context); setWorkspace(false); setWorkspaceAgreementId(null); setSupportView(true); }}
      gateway={workspaceGateway}
      fulfilmentNeedsGateway={fulfilmentNeedsGateway}
      agentGateway={gateway}
      agentController={controller}
      initialAgreementId={workspaceAgreementId}
      initialView={workspaceEntry}
      onOpenStore={() => navigateTo('store')}
      onOpenStoreOffer={(canonicalKsNumber, offerId) => {
        setWorkspace(false);
        setWorkspaceAgreementId(null);
        setStoreOfferRoute({ canonicalKsNumber, offerId });
        setStore(true);
      }}
      onOpenCommunity={() => navigateTo('community')}
      onJoinTrustProject={() => joinRoute.open()}
      trustProjectMembership={trustMembershipStatus !== undefined ? { status: trustMembershipStatus, canonicalKsNumber: ownKsNumber } : null}
      onOpenReferral={openEcosystemForAgreement}
      onOpenProjects={() => navigateTo('projects')}
      onOpenVisionBoard={() => navigateTo('vision-board')}
      onOpenAccount={() => navigateTo('account')}
      onOpenNotifications={() => navigateTo('notifications')}
      onAskKs001={askKs001FromSurface}
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
  const workbenchModel = projectWorkbench(state.context.data, new Set(state.offeredDiscoveryEntityIds));
  // KS001 Upgrade Phase 3 completion correction (item 9) -- how many CURRENT BUILD rows trace back to
  // each source, computed live from the workbench's own item.source (never a stale ingestion-time count
  // -- see SourceCard's own factCount doctrine for exactly why this stays honest after an adoption/
  // correction/removal changes what a source is still credited with).
  const sourceFactCounts: Record<string, number> = {};
  for (const item of workbenchModel.items) {
    if (item.source) sourceFactCounts[item.source.sourceArtifactId] = (sourceFactCounts[item.source.sourceArtifactId] ?? 0) + 1;
  }
  const preview = panel?.components.find((c): c is PreviewView => c.type === 'AGREEMENT_PREVIEW');
  const panelRest = (panel?.components ?? []).filter(c => c.type !== 'AGREEMENT_PREVIEW' && c.type !== 'INSTRUMENT_PROMPT' && c.type !== 'UNAVAILABLE_INPUT');
  // One contextual surface at a time: opening an instrument closes discovery, and vice versa.
  const openInstrument = (spec: InstrumentSpec) => { discovery.close(); instruments.open(spec); };
  const openDiscovery = (query: DiscoveryQuery = emptyQuery(), runNow = false) => { instruments.cancel(); discovery.open(query, runNow); };
  const openStoreOf = (ownerKs: string, ownerName: string) => { instruments.cancel(); void discovery.openStore(ownerKs, ownerName); };
  // Every discovery the SERVER composed in this conversation, newest first (real tool output only).
  const discoveryGroups: DiscoveryView[][] = [...state.turns].reverse().map(turn => turn.sender === 'agent' ? turn.response.components.filter((c): c is DiscoveryView => c.type === 'DISCOVERY') : []).filter(group => group.length > 0).slice(0, 5);
  const discoveryViews: DiscoveryView[] = discoveryGroups[0] ?? [];
  // Real facts already understood that Store search cannot filter by -- shown as "still to check", never searched.
  const contextDetails = workbenchModel.items.filter(item => (item.section === 'money' || item.section === 'other') && item.value.length <= 40).map(item => item.value);
  const understoodContent = (
    <UnderstoodTruthSections
      confirmed={structuredComponents.length > 0
        ? <div className="space-y-3">{structuredComponents.map((component, i) => <RichResponse key={i} component={component} onReview={reviewing} />)}</div>
        : null}
      stillToDecide={<div className="space-y-3">
        <UnderstoodWorkbench state={state} controller={controller} activeSpec={instrumentState.active} onOpen={openInstrument} onFind={(kind, what) => openDiscovery({ ...emptyQuery(kind), what: what ?? '' }, !!what)} stillToSettle={preview?.stillToSettle} notes={preview?.disclaimer}
          onResolve={concept => {
            const point = formationState.data?.openPoints.find(p => p.kind === 'CONFLICT' && p.text.toLowerCase().startsWith(concept.toLowerCase()));
            return point ? () => setMicroReview(point.id) : null;
          }} />
        {workbenchModel.empty && preview && <RichResponse component={preview} onReview={reviewing} />}
        {panelRest.length > 0 && <div className="space-y-3">{panelRest.map((component, i) => <RichResponse key={i} component={component} onReview={reviewing} />)}</div>}
      </div>}
      foundOnSecurePay={discoveryGroups.length > 0 ? <div data-found-on-securepay tabIndex={-1} className="focus:outline-none"><FoundOnSecurePay views={discoveryViews} earlier={discoveryGroups.slice(1)} onOpenStore={openStoreOf} /></div> : undefined}
    />
  );
  const openUnderstood = () => { setMobileTab('understood'); if (lastResponse) setLastSeenStructuredTurnId(lastResponse.id); };
  // A Store "Use this" seeds a real conversation/Trade Context with no chat turn (see useOffer in
  // controller.ts) — state.conversationId alone must also route to the conversation view, or the
  // person would land back on the generic Home prompt with no visible sign their offer was used.
  const showHome = home || (state.turns.length === 0 && !state.conversationId);
  // The "Bring your plan" panel, opened from either Home's intake.
  // Closes ONLY when SecurePay really read it (READY/PARTIAL, reconciled). FAILED/refused/unknown keep the panel, the text
  // and the reason on screen so the person can try again or change it. From Home it is a NEW intention (EP-CERT-013).
  const submitPlan = (text: string, label: string, set: WorkSet) => {
    setBringPlanDraft({ text, label });
    setBringPlanOpen(true);
    setIntakeError(null);
    void set.sourceController.addPastedText(text, label || undefined).then(outcome => {
      if (outcome.ok) { setBringPlanOpen(false); setBringPlanDraft({ text: '', label: '' }); } else setIntakeError(outcome.error);
    });
  };
  const bringPlanPanel = bringPlanOpen ? (
    <BringPlanPanel
      busy={sourcesState.phase === 'submitting' || sourcesState.phase === 'checking'}
      error={intakeError}
      onClose={() => setBringPlanOpen(false)}
      initialText={bringPlanDraft.text}
      initialLabel={bringPlanDraft.label}
      onSubmit={(text, label) => {
        setBringPlanDraft({ text, label });
        requestFresh(set => { setHome(false); submitPlan(text, label, set); });
      }}
    />
  ) : null;
  const declaredPanel = declaredOpen ? (
    <DeclaredSourcePanel
      key={`${declaredOpen}:${state.conversationId ?? 'new'}`}
      kind={declaredOpen}
      busy={sourcesState.phase === 'submitting' || sourcesState.phase === 'checking'}
      error={intakeError}
      initialValue={declaredDraft.value}
      initialLabel={declaredDraft.label}
      onClose={() => setDeclaredOpen(null)}
      onSubmit={(value, label) => {
        const kind = declaredOpen;
        const add = (set: WorkSet) => {
          setDeclaredDraft({ value, label });
          setDeclaredOpen(kind);
          setIntakeError(null);
          const outcome = kind === 'link' ? set.sourceController.addLink(value, label || undefined) : set.sourceController.addPlace(value);
          void outcome.then(result => {
            if (result.ok) { setDeclaredOpen(null); setDeclaredDraft({ value: '', label: '' }); setHome(false); } else setIntakeError(result.error);
          });
        };
        // From Home, a link or place starts something new; inside a conversation it belongs to that conversation.
        if (showHome) requestFresh(add); else add(currentSet());
      }}
    />
  ) : null;
  // EP-CERT-013 -- the Home composer ALWAYS starts something new; continuing earlier work is the separate Continue action.
  const startFromHome = (text: string): SendResult => {
    let result: SendResult = false;
    const ran = requestFresh(set => { setHome(false); result = submitInput(text, set); });
    return ran ? result : false;
  };
  // KS001 Upgrade Phase 3 (Section 39) -- signed-out value first: each intake mode transitions straight into
  // the SAME conversation experience the free-text composer would, then immediately opens the relevant
  // source-ingestion path -- never a sign-in wall in front of BUILD.
  //
  // KS001 Upgrade Phase 3 completion correction (item 6) -- "Bring your plan" opens BringPlanPanel directly
  // ON Home; submitting it calls sourceController.addPastedText, whose own ensureConversationId creates the
  // ONE real conversation and updates state.conversationId, which is what naturally flips showHome to false
  // and lands the person in BUILD -- exactly the same real transition Document/Photo already produce.
  const pickDocument = (file: File) => { requestFresh(set => { setHome(false); void set.sourceController.addUpload('DOCUMENT', file); }); };
  const pickPhoto = (file: File) => { requestFresh(set => { setHome(false); void set.sourceController.addUpload('PHOTO', file); }); };
  const resumeSaved = (conversationId: string) => {
    if (conversationId === state.conversationId) { setHome(false); return; }
    requestFresh(set => { setHome(false); void set.controller.resumeConversation(conversationId); });
  };
  // EP-CERT-013 -- Home shows CONTINUE (explicit, separate) whenever this tab holds meaningful work, and the universal
  // composer below it always starts something NEW. The composer is only disabled while a brand-new first step is in flight.
  const continueSlot = state.conversationId && meaningfulWork
    ? <ContinueCard title={currentTitle} detail={unsavedWork ? 'Not saved yet' : null} onContinue={() => setHome(false)} />
    : null;
  const homeDisabled = !state.conversationId && (state.busy || !!state.pending);
  // Public Experience Convergence Phase 2 -- the signed-in app reserves room for its mobile bottom
  // navigation; the public shell has none.
  return <div className={`h-dvh flex flex-col bg-cream-100 ${signedIn ? 'pb-16 md:pb-0' : ''}`}>
    <NavBar view={showHome ? 'signed-out' : 'conversation'} onNavigate={navigateTo} />
    {notice && <div role="status" className="px-4 py-2 text-sm text-sand-700 bg-cream-50">{notice} <button onClick={() => setNotice(null)} className="underline">Dismiss</button></div>}
    {showHome ? <div className="flex-1 overflow-auto">
      {signedIn ? <>
        {/* KS001 Upgrade Phase 2 (Section 17) -- one restrained "Continue Building" section, never a whole
            Home redesign. Resuming re-opens the SAME conversationId in this SAME controller (Scenario F). */}
        <div className="px-4 md:px-6 pt-4"><ContinueBuildingList savedBuild={savedBuildController} onResume={resumeSaved} /></div>
        <SignedOutHome
          continueSlot={continueSlot}
          disabled={homeDisabled}
          onStart={startFromHome}
          onBringPlan={openBringPlan}
          onPickDocument={pickDocument}
          onPickPhoto={pickPhoto}
          onAddLink={() => openDeclared('link')}
          onAddPlace={() => openDeclared('place')}
        />
        {bringPlanPanel && <div className="px-4 md:px-6 pb-6">{bringPlanPanel}</div>}
        {declaredPanel && <div className="px-4 md:px-6 pb-6 max-w-xl mx-auto">{declaredPanel}</div>}
        {/* Phase 7 Slice 5B -- The Trust Project, BELOW the KS001 Home: an "About / why this exists"
            section, never a separate product surface, nav item or second Home. Signed-in people get a
            smaller doorway with the full explanation one tap away. */}
        <TrustProjectSection
          compact={sessionState.status === 'signed-in'}
          membership={sessionState.status === 'signed-in' && trustMembershipStatus !== undefined ? { status: trustMembershipStatus, canonicalKsNumber: ownKsNumber } : null}
          onExploreCommunity={() => navigateTo('community')}
          onOpenStores={() => navigateTo('store')}
          onJoin={() => joinRoute.open()}
        />
      </> : (
        // Public Experience Convergence Phase 2 -- the signed-out public Home: its own composition that
        // reuses the same KS001 centre. Public-only chapters never render in the signed-in Home above.
        <PublicHome
          continueSlot={continueSlot}
          disabled={homeDisabled}
          onStart={startFromHome}
          onBringPlan={openBringPlan}
          onPickDocument={pickDocument}
          onPickPhoto={pickPhoto}
          onAddLink={() => openDeclared('link')}
          onAddPlace={() => openDeclared('place')}
          bringPlanPanel={bringPlanPanel}
          declaredPanel={declaredPanel}
          onFocusComposer={() => { focusKs001Composer(); }}
          onBrowseStores={() => navigateTo('store')}
          onSignIn={() => signInRoute.open(null)}
          onRecover={() => navigateTo('recovery')}
          onHelp={() => navigateTo('support')}
          onSection={id => { focusPublicSection(id); }}
          onJoin={() => joinRoute.open()}
        />
      )}
    </div> : <>
      {/* Final Phase 3 completion pass, Section 4 -- mobile-first sticky BUILD | UNDERSTOOD.
          Phase 6 final correction: a compact KS001 identity row now sits above the tabs so mobile
          (which hides the desktop identity block below) still clearly shows who the person is
          talking to -- one coherent header, not a second bulky bar. */}
      <div className="md:hidden sticky top-0 z-10 bg-cream-50 border-b border-cream-200/60">
        {/* User-Ready Beta Gate 1 (EP-CERT-006/010) -- who you are talking to, what this conversation is, and + New. */}
        <div className="flex items-center gap-2 px-3 pt-1.5 pb-1">
          <img src={securepayMark} alt="" className={`w-5 h-5 shrink-0 ${state.busy ? 'animate-pulse-soft' : ''}`} />
          <button type="button" onClick={() => setCompassOpen(true)} aria-label="KS001, guided by the 12 Principles of Fair Trade"
            className="min-h-11 min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 rounded-lg">
            <span className="block truncate text-[0.8rem] text-forest-800"><span className="font-display">KS001</span> <span className="text-sand-500">· {state.busy ? 'thinking' : currentTitle}</span></span>
            <span className="block text-[0.65rem] text-sand-600 underline decoration-sand-300 underline-offset-2">Guided by the 12 Principles of Fair Trade</span>
          </button>
          <NewWorkButton onClick={startNewFromConversation} compact />
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
        <div className="hidden md:flex items-center gap-3 px-4 md:px-6 py-2.5 border-b border-cream-200/60">
          <img src={securepayMark} alt="" className={`w-7 h-7 shrink-0 transition-opacity ${state.busy ? 'animate-pulse-soft' : ''}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-sm text-forest-800">KS001</span>
              {/* EP-CERT-010 -- KS001 is the voice, the 12 Principles are its compass: one identity, one tap, no navigation. */}
              <button type="button" onClick={() => setCompassOpen(true)} className="text-[0.72rem] text-sand-600 underline decoration-sand-300 underline-offset-2 hover:text-forest-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 rounded">Guided by the 12 Principles of Fair Trade</button>
              <span className="text-[0.7rem] text-sand-500" aria-live="polite">{state.busy ? '· thinking' : ''}</span>
            </div>
            <p className="truncate text-[0.78rem] text-forest-700" data-conversation-title>{currentTitle}{unsavedWork && meaningfulWork ? <span className="text-sand-500"> · not saved yet</span> : null}</p>
          </div>
          <NewWorkButton onClick={startNewFromConversation} />
        </div>
        {/* Mobile: what SecurePay understands is one tap away, never a second copy of the desktop panel. */}
        {workbenchModel.items.length > 0 && <button onClick={openUnderstood} className="md:hidden mx-4 mt-3 flex min-h-11 items-center justify-between rounded-xl border border-cream-200 bg-white/80 px-3.5 text-left text-[0.85rem] text-forest-700 shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
          <span>What SecurePay understands <span className="text-sand-500">· {workbenchModel.items.length}</span></span><span aria-hidden="true" className="text-sand-400">›</span>
        </button>}
        {reviewOpen && formationState.data?.reviewable && state.conversationId ? <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 md:px-6">
          <AgreementReview formation={formationState.data} changes={formationState.changes} busy={state.busy || !!state.pending}
            checking={formationState.checking} error={formationState.error}
            onBack={() => { setReviewOpen(false); setComposerFocusKey(key => key + 1); }}
            onCheck={pointId => { if (state.conversationId) void formationController.check(state.conversationId, pointId); }}
            onCorrect={text => submitCorrection(controller, text)}
            onRetryCorrection={() => retryPending(controller)}
            onResolve={(point, side) => resolveConflict(point, side)}
            onOpenPoint={point => setMicroReview(point.id)}
            onSetUp={version => { if (state.conversationId) void handoffController.start(state.conversationId, version); }}
            onAcknowledgeChanges={() => formationController.acknowledgeChanges()}
            settingUpAs={signedIn ? { signedIn: true, actingFor: actingForBusiness?.displayName ?? actingForOrganization?.displayName ?? null } : undefined}
            onUnlink={partyKey => { if (state.conversationId) void formationController.unlink(state.conversationId, partyKey); }}
            setUp={handoffState.phase !== 'idle' ? <HandoffPanel handoff={handoffController} identity={identityController} onDone={noop} onOpenAgreement={agreementId => { setWorkspaceAgreementId(agreementId); setWorkspaceEntry('home'); setWorkspace(true); }} agreementGateway={agreementGateway} /> : null} />
        </div> : <div className="flex-1 overflow-hidden">
          <ConversationSurface
            tail={state.turns.length > 0 ? { id: state.turns[state.turns.length - 1].id, sender: state.turns[state.turns.length - 1].sender } : null}
            thinking={state.busy && state.turns[state.turns.length - 1]?.sender === 'user'}
            disabled={state.busy || !!state.pending} onSend={text => submitInput(text)} composerFocusKey={composerFocusKey}
            draftKey={state.conversationId ?? 'new'}
            leading={<SourceMenu
              placement="above"
              disabled={state.busy || sourcesState.phase === 'submitting' || sourcesState.phase === 'checking'}
              onBringPlan={openBringPlan}
              onPickDocument={file => { void sourceController.addUpload('DOCUMENT', file); }}
              onPickPhoto={file => { void sourceController.addUpload('PHOTO', file); }}
              onAddLink={() => openDeclared('link')}
              onAddPlace={() => openDeclared('place')}
            />}
            status={<div className="space-y-3">
              {/* Entry Perfection Phase 6 -- once SecurePay understands a coherent arrangement, the agreement leads. */}
              {continuityChoice && <div className="space-y-2">
                <ContinuityChoice busy={continuityBusy || dreamClaimOpen || visionDreamState.phase === 'saving' || visionDreamState.phase === 'reconciling' || !!visionDreamState.pending}
                  onContinue={() => void continueWithThisTab()} onStartFresh={() => startNewConversation()} />
                {!dreamClaimOpen ? <button type="button" onClick={() => { setDreamClaimThought(''); setDreamClaimOpen(true); }}
                  className="min-h-11 text-[0.8rem] text-forest-700 underline underline-offset-2">Save as a private Dream instead</button>
                : <div className="rounded-2xl border border-cream-200 bg-white p-4 space-y-3">
                  <div><p className="text-sm font-medium text-forest-800">Save this as a private Dream</p>
                    <p className="text-xs text-sand-600 mt-1">Write the thought you want to remember. This saves a private Vision IDEA from this same temporary conversation; it does not turn the note into an Agreement fact or send another KS001 message.</p></div>
                  <textarea value={dreamClaimThought} onChange={event => setDreamClaimThought(event.target.value)}
                    disabled={!!visionDreamState.pending || visionDreamState.phase === 'saving' || visionDreamState.phase === 'reconciling'}
                    maxLength={4000} rows={4} aria-label="Dream to remember"
                    className="w-full rounded-xl border border-cream-200 p-3 text-sm text-forest-800 disabled:opacity-60"
                    placeholder="What do you want to remember from this idea?" />
                  <p className="text-xs text-sand-500">{dreamClaimThought.length} / 4,000</p>
                  {visionDreamState.error && <StatusNotice tone="warning" icon={false}>{visionDreamState.error}</StatusNotice>}
                  <div className="flex flex-wrap gap-2">
                    {!visionDreamState.pending && <button type="button" disabled={!dreamClaimThought.trim() || visionDreamState.phase === 'saving'} onClick={() => void saveTemporaryAsDream()}
                      className="min-h-11 rounded-xl bg-forest-700 px-4 text-sm font-medium text-white disabled:opacity-50">{visionDreamState.phase === 'saving' ? 'Saving…' : 'Save Dream'}</button>}
                    {visionDreamState.pending && <button type="button" disabled={visionDreamState.phase === 'saving' || visionDreamState.phase === 'reconciling'} onClick={() => void retryTemporaryDream()}
                      className="min-h-11 rounded-xl border border-forest-300 px-4 text-sm text-forest-700 disabled:opacity-50">Retry same save</button>}
                    {visionDreamState.pending?.conversationId && <button type="button" disabled={visionDreamState.phase === 'saving' || visionDreamState.phase === 'reconciling'} onClick={() => void reconcileTemporaryDream()}
                      className="min-h-11 rounded-xl border border-forest-300 px-4 text-sm text-forest-700 disabled:opacity-50">{visionDreamState.phase === 'reconciling' ? 'Checking…' : 'Check if it saved'}</button>}
                    {!visionDreamState.pending && <button type="button" onClick={() => setDreamClaimOpen(false)} className="min-h-11 px-3 text-sm text-sand-600 underline">Cancel</button>}
                  </div>
                </div>}
              </div>}
              <AgreementShaping formation={formationState.data} onReview={() => setReviewOpen(true)}
                onResolvePoint={point => setMicroReview(point.id)}
                onAnswer={text => void controller.send(text)} answering={state.busy || !!state.pending} />
              {directAck && <p role="status" className="text-[0.85rem] text-forest-800"><span className="font-display">KS001 · </span>{directAck}
                <button type="button" onClick={() => setDirectAck(null)} className="ml-2 min-h-11 text-[0.8rem] text-sand-700 underline">OK</button></p>}
              {/* Final Phase 4 Economy Turn 3 (Section 5) -- a failed Store "Use this" is never
                  silent: the person must explicitly retry or continue without the source before
                  anything from the offer reaches the conversation. */}
              {state.offerSelectionFailure && discoveryState.phase !== 'source-failed' && <SourceFailureNote busy={state.busy} error={state.offerSelectionFailure.error}
                onRetry={() => void controller.retryOfferSelection()} onContinueWithout={() => void controller.continueOfferWithoutSource()} />}
              {/* Phase 6 Slice 4 (Community → Trade) -- the SAME failed-selection discipline for a
                  Community "Use this": never silent, held until an explicit retry/continue. */}
              {state.communitySourceSelectionFailure && <SourceFailureNote busy={state.busy} error={state.communitySourceSelectionFailure.error}
                onRetry={() => void controller.retryCommunitySourceSelection()} onContinueWithout={() => void controller.continueCommunitySourceWithoutSource()} />}
              {/* Phase 6 Slice 4 -- "Trade Taking Shape" quietly shows where this trade started, once
                  a source (Store or Community) has actually been selected. Provenance only -- never
                  Agreement/CONFIRMED truth, never a bigger presence than the conversation itself. */}
              {state.source && !state.offerSelectionFailure && !state.communitySourceSelectionFailure && (
                <SourceReference source={{
                  sourceType: state.source.sourceType,
                  title: state.source.sourceTitle ?? 'Selected source',
                  ownerKs: state.source.sourceOwnerKsNumber,
                  capturedPriceMinor: state.source.capturedPriceMinor,
                  capturedCurrency: state.source.capturedCurrency,
                }} />
              )}
              {state.error && instrumentState.active === null && <StatusNotice tone="warning">{state.error}
                <button disabled={state.busy} onClick={() => void controller.retry()} className="block mt-2 min-h-11 text-forest-700 underline disabled:opacity-40">{state.busy && state.outcomeUnknown ? 'Checking…' : retryLabel(state.pending, state.outcomeUnknown)}</button>
              </StatusNotice>}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-forest-700">
                {/* KS001 Upgrade Phase 3 (Bring what you already have, Section 40) -- one quiet attach
                    control (Document / Photo / Paste a plan), never a toolbar jungle. Real bytes only
                    reach SecurePay once the person actually picks a file -- never a local preview shown as
                    success (Section 65). */}
                {/* Opens downward: this row sits at the TOP of the scrolling conversation panel, where an upward
                    menu would be clipped (found in live Phase 3 verification). */}
                {/* REFRESH re-reads SecurePay's current understanding. It never resets or starts anything (that is + New). */}
                <button disabled={state.busy} onClick={reviewing} aria-label="Refresh what SecurePay understands" className="min-h-11 underline disabled:opacity-40">Refresh</button>
                {/* Entry Perfection Phase 6 -- REVIEW THIS opens the emerging agreement itself (no sign-in, nothing created);
                    setting it up securely is a separate, explicit step inside Review. */}
                {/* User-Ready Beta Gate 1 -- the actual next step ("Resolve price", "Review 2 points", "Review agreement"). */}
                <button
                  disabled={!state.conversationId || state.busy || !!state.pending || !formationState.data?.reviewable}
                  onClick={goNext}
                  className="min-h-11 underline disabled:opacity-40"
                >
                  {step.kind === 'none' ? 'Review agreement' : step.label}
                </button>
                {/* KS001 Upgrade Phase 5 continuation (Slice 3, UR-145) -- "Review this" is correctly
                    disabled while a suggested (not-yet-confirmed) WHAT still needs the person's own
                    explicit "Use this." Live testing found this gate itself is legitimate (never a
                    predicate bug -- see the Phase 5 completion report's own root-cause account), but
                    nothing told the person WHY the button stayed disabled after a seemingly-complete
                    conversation. This names the exact real reason, using the server's own
                    mustResolve description verbatim -- never a second, independently-drifting copy
                    of the sufficiency rule. */}
                {/* Entry Perfection Phase 6 -- DELIBERATELY RESTATED: the old hint told the person to confirm facts one by one with
                    "Use this" before Review, which UR-239 retired. Review waits only for a coherent arrangement, and says so. */}
                {!state.busy && !state.pending && formationState.data && !formationState.data.reviewable && formationState.data.reviewBlockedReason
                  && formationState.data.stage === 'BUILD' && (
                  <p className="w-full text-[0.78rem] text-sand-500 basis-full">{formationState.data.reviewBlockedReason}</p>
                )}
                {/* KS001 Upgrade Phase 2 (Sections 14/15/20), final convergence correction (item 8) -- a
                    PRIVATE pre-agreement save, never "Set up Agreement" done twice: this only binds
                    ownership to the SAME conversation, it never creates a draft Agreement. Gated on the
                    server-owned sufficiency.canSave (always true once a real conversation exists, but read
                    directly rather than assumed, matching "Review this"'s own canReview gate). */}
                <button
                  disabled={!state.conversationId || state.busy || !!state.pending || savedBuildState.phase === 'saving'
                    || (state.context.data?.sufficiency && !state.context.data.sufficiency.canSave)}
                  onClick={() => { if (state.conversationId) void savedBuildController.save(state.conversationId); }}
                  className="min-h-11 underline disabled:opacity-40"
                >
                  {savedBuildState.phase === 'saved' ? 'Saved for later' : 'Save for later'}
                </button>
              </div>
              {bringPlanOpen && (
                <BringPlanPanel
                  busy={sourcesState.phase === 'submitting' || sourcesState.phase === 'checking'}
                  error={intakeError}
                  onClose={() => setBringPlanOpen(false)}
                  initialText={bringPlanDraft.text}
                  initialLabel={bringPlanDraft.label}
                  onSubmit={(text, label) => submitPlan(text, label, currentSet())}
                />
              )}
              {declaredPanel}
              {/* KS001 Upgrade Phase 3 (Section 41) -- calm, first-class source cards; never a giant
                  extraction-debug screen. BUILD itself remains the primary structured view. */}
              <SourcesList
                sources={sourcesState.sources}
                busy={sourcesState.phase === 'submitting' || sourcesState.phase === 'checking'}
                onRetry={id => { if (state.conversationId) void sourceController.retry(state.conversationId, id); }}
                onRemove={id => { if (state.conversationId) void sourceController.remove(state.conversationId, id); }}
                // EP-CERT-015 -- "Start fresh" fits when nothing else is here yet: only the failed source(s), no words, no facts.
                onStartFresh={!state.turns.some(turn => turn.sender === 'user') && workbenchModel.items.length === 0
                  && sourcesState.sources.every(source => source.extractionStatus === 'REMOVED' || source.extractionStatus === 'FAILED' || source.stalled)
                  ? startNewFromConversation : undefined}
                factCountsBySourceId={sourceFactCounts}
              />
              {/* Entry Perfection Phase 2 -- an interrupted or still-running read is "checking", never shown as failed. */}
              {sourcesState.phase === 'checking' && <p role="status" className="text-[0.8rem] text-sand-700">SecurePay is checking whether it has finished reading this — nothing will be added twice.</p>}
              {/* EP-CERT-014 -- only when no source card already says it (refused before reading, a connection problem), and
                  always dismissible: a failure never blocks chatting, adding another source or starting new work. */}
              {sourcesState.phase === 'error' && !sourcesState.errorSourceId && !bringPlanOpen && !declaredOpen && <div role="alert" className="flex items-start justify-between gap-2 text-[0.82rem] text-ember-800">
                <span>{sourcesState.error}</span>
                <button type="button" onClick={() => sourceController.clearError()} className="min-h-11 shrink-0 px-1 text-[0.8rem] text-forest-700 underline">Dismiss</button>
              </div>}
              {savedBuildState.phase === 'error' && <p role="alert" className="mt-1 text-[0.8rem] text-ember-700">{savedBuildState.error}</p>}
              <SavedBuildPanel savedBuild={savedBuildController} identity={identityController} />
            </div>}>
            {[
              ...state.turns.map(turn => <div key={turn.id} data-turn-id={turn.id} className="space-y-3">
                {turn.sender === 'user' ? <MessageBubble text={turn.text} sender="user" /> : <>
                  <MessageBubble text={turn.response.message.text} sender="agent" />
                  {turn.response.components.filter(component => (component.type !== 'MESSAGE' || component.text !== turn.response.message.text) && component.type !== 'AGREEMENT_WORKSPACE' && component.type !== 'AGREEMENTS_HOME' && component.type !== 'DISCOVERY' && component.type !== 'AGREEMENT_PREVIEW')
                    .map((component, i) => <RichResponse key={i} component={component} onReview={reviewing}
                      live={turn.id === lastResponse?.id && !state.busy && turn.id === state.turns[state.turns.length - 1]?.id}
                      resolvePrompt={prompt => specForPrompt(prompt, workbenchModel)}
                      onPrompt={prompt => { const resolved = specForPrompt(prompt, workbenchModel); if ('spec' in resolved) instruments.open(resolved.spec); }}
                      onRequestDiscovery={targetEntityId => void controller.requestDiscovery(targetEntityId)} />)}
                  {(() => {
                    const found = turn.response.components.filter((c): c is DiscoveryView => c.type === 'DISCOVERY' && c.payload !== null);
                    return found.length > 0 ? <div className="ml-[2.625rem]"><button type="button" onClick={() => { setMobileTab('understood'); setFoundFocusKey(k => k + 1); }}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-forest-200 bg-white px-4 text-[0.85rem] text-forest-700 shadow-soft hover:bg-forest-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">Found on SecurePay · {foundLabel(found)}<span aria-hidden="true">›</span></button></div> : null;
                  })()}
                </>}
              </div>),
              handoffState.phase !== 'idle' && <div key="handoff" className="space-y-3">
                <HandoffPanel handoff={handoffController} identity={identityController} onDone={noop} onOpenAgreement={agreementId => { setWorkspaceAgreementId(agreementId); setWorkspaceEntry('home'); setWorkspace(true); }} agreementGateway={agreementGateway} />
              </div>,
            ]}
          </ConversationSurface>
        </div>}
      </div>
      {/* User-Ready Beta Gate 1 -- WORKSPACE ARCHITECTURE: what SecurePay understands is a slightly recessed plane (level 1);
          facts sit above it (level 2) and decisions rise above ordinary facts (level 3). */}
      <div className={`${mobileTab === 'understood' ? 'flex' : 'hidden'} md:flex md:flex-[1] flex-col border-l border-cream-200/60 surface-region min-w-0 ${mobileTab === 'understood' ? 'flex-1 overflow-y-auto p-4' : ''}`} data-understood-plane>
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
    <DiscoveryHost controller={discovery} panelSlot={panelSlot} contextDetails={contextDetails}
      onBackToConversation={() => { discovery.close(); setMobileTab('build'); setComposerFocusKey(key => key + 1); }}
      onAddPerson={() => { discovery.close(); const add = workbenchModel.adds.find(a => a.key === 'who'); if (add) instruments.open(add.spec); }} />
    <InstrumentHost controller={instruments} agentBusy={state.busy} agentUncertain={!!state.pending} panelSlot={panelSlot}
      onBackToConversation={() => { instruments.cancel(); setMobileTab('build'); setComposerFocusKey(key => key + 1); }}
      onFind={() => { instruments.cancel(); openDiscovery(emptyQuery('SERVICE')); }} />
    {freshIntent && <StartFreshDialog title={currentTitle} busy={savedBuildState.phase === 'saving'}
      onStay={() => setFreshIntent(null)}
      onSave={() => { const id = state.conversationId; setFreshIntent(null); setHome(false); if (id) void savedBuildController.save(id); }}
      onStartFresh={() => { const run = freshIntent; run(startNewConversation()); }} />}
    {compassOpen && <FairTradePrinciplesPanel withKs001 onClose={() => setCompassOpen(false)} />}
    {microPoint && <MicroReview point={microPoint} busy={state.busy}
      onUse={(side, typed) => resolveConflict(microPoint, side, typed)}
      onTell={tellKs001}
      onCheck={microPoint.checkable && state.conversationId ? () => { void formationController.check(state.conversationId!, microPoint.id); } : undefined}
      onClose={() => setMicroReview(null)} />}
  </div>;
}
