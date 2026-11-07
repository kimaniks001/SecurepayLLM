import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { NavBar } from '../../components/NavBar';
import { StoreHome } from '../../components/StoreHome';
import { StoreCollectionPanel } from '../../components/StoreCollectionPanel';
import type { SelectionItem, StoreDestination } from './shopSelection.mjs';
import { collectOffer, itemFromOffer, removeSelected, updateSelectedQuantity, updateSelectedBuyerNote, selectionToKs001 } from './shopSelection.mjs';
import { storeOfferAssistTurn } from './offerAssistTurn.mjs';
import { StoreProfileView } from '../../components/StoreProfileView';
import { OfferDetail } from '../../components/OfferDetail';
import { OfferQuickPreview } from '../../components/OfferQuickPreview';
import { OfferToTradeHandoff } from '../../components/OfferToTradeHandoff';
import { SecureLinkShareSheet } from '../../components/SecureLinkShareSheet';
import { StoreManagementHome } from '../../components/StoreManagementHome';
import { OfferBuilderView } from '../../components/OfferBuilderView';
import { SecureAuthCard } from '../../components/SecureAuth';
import { ErrorStateCard } from '../../components/ErrorState';
import type { StoreGateway } from '../../api/securepay/store';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import type { BusinessGateway, BusinessRepresentationDto } from '../../api/securepay/business';
import type { MarketNetworkGateway } from '../../api/securepay/marketnetwork';
import type { PlugAvailabilityResponse, PlugMissionDto } from '../../api/securepay/marketnetwork/dto';
import type { FulfilmentNeedsGateway, FulfilmentNeedMatchDto, SupplyRouteDto } from '../../api/securepay/fulfilment-needs';
import type { AppView, ErrorStateResponse } from '../../types';
import { createStoreController, errorText } from './controller';
import { availabilityOptionsFor } from './view';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';
import { useAppNavPadding } from '../public/publicShell';
import { FulfilmentMiniAgreementReview } from './FulfilmentMiniAgreementReview';
import { DigitalStoreSetup } from './DigitalStoreSetup';
import type { PublicDigitalStoreAddress, StoreEnquiryDto } from '../../api/securepay/store/dto';
import { parseDigitalStoreAddressRoute, parseStoreEnquiryRoute } from './route';
import { holdFirstStoreOffer, consumeFirstStoreOffer } from '../experience/entryIntent';
import { StoreConnectionsHome } from './StoreConnectionsHome';
import { StoreCustomerConnections, emptyStoreCustomerDraft, type StoreCustomerDraft } from './StoreCustomerConnections';
import { StoreEnquiryInbox } from './StoreEnquiryInbox';

type Gateway = Pick<StoreGateway, 'search' | 'store' | 'offer' | 'myProfile' | 'myOffers' | 'createOffer' | 'updateOffer' | 'confirmAvailability' | 'businessProfile' | 'businessOffers' | 'businessOpportunities' | 'createBusinessOffer' | 'updateBusinessOffer' | 'confirmBusinessOfferAvailability' | 'updateMyProfile' | 'updateBusinessProfile' | 'myDigitalAddress' | 'businessDigitalAddress' | 'saveMyDigitalAddress' | 'saveBusinessDigitalAddress' | 'publicDigitalAddress' | 'publicDigitalAddressForKs'
  | 'myFavourites' | 'saveFavourite' | 'removeFavourite' | 'createStoreEnquiry'
  | 'myCustomerEnquiries' | 'myStoreEnquiries' | 'businessStoreEnquiries'
  | 'respondStoreEnquiry' | 'respondBusinessStoreEnquiry' | 'savedWorkForEnquiry'
  | 'personalEnquiryDraft' | 'savePersonalEnquiryDraft'
  | 'businessEnquiryDraft' | 'saveBusinessEnquiryDraft'
  | 'myCommunityProviderInterest' | 'saveMyCommunityProviderInterest'
  | 'businessCommunityProviderInterest' | 'saveBusinessCommunityProviderInterest'>;

function errorView(message: string): ErrorStateResponse {
  return { type: 'ERROR_STATE', title: 'SecurePay could not load this', text: message, primaryLabel: 'Try again', primaryValue: 'retry' };
}
function LoadingNotice({ text }: { text: string }) {
  return <p role="status" className="text-sm text-sand-500 text-center py-10">{text}</p>;
}

/**
 * Discover Store -> inspect Offer -> explicit "Use this" -> Trade Taking Shape -> (parent) seed the
 * real Agent conversation. Every screen here renders exactly the backend's own Store truth (see
 * controller.ts/adapters.ts); this component only wires the locked Bolt Store components to that truth
 * and to navigation. Nothing here lets a person pay or buy directly (task doctrine section 12) and no
 * Agreement/Trade authority is created here — only `onUseOffer` (a local view switch plus, on explicit
 * proceed, a call into the caller's Agent controller) ever leaves this feature.
 */
export function StoreExperience({ gateway, businessGateway, marketNetworkGateway, fulfilmentNeedsGateway, auth, session, initialOfferRoute, returnContext, trustedMediaOrigin, onUseOffer, onResumeSavedWork, onNavigate, onOpenBusinessVision, onAskKs001, onStageSelections, onSelectionChange, workspaceSelection, shoppingWide = false, embedded = false }: {
  gateway: Gateway; businessGateway: Pick<BusinessGateway, 'mine' | 'representation'>; marketNetworkGateway: Pick<MarketNetworkGateway, 'plugAvailability' | 'updatePlugAvailability' | 'plugMissions'>; fulfilmentNeedsGateway?: Pick<FulfilmentNeedsGateway, 'matches' | 'routes' | 'miniAgreementReview'>; auth: AuthGateway; session: SessionStore;
  initialOfferRoute?: { canonicalKsNumber: string; offerId: string } | null;
  returnContext?: { label: string; onReturn: () => void } | null;
  /** The only origin a mediaRef may be loaded from as an <img> src — see adapters.ts `media()`. */
  trustedMediaOrigin: string | null;
  onUseOffer: (payload: { amount?: string; currency?: string; sourceDescription: string; sourceId?: string; sourceOwnerKsNumber?: string; enquiryId?: string }) => void;
  onResumeSavedWork: (conversationId: string) => void;
  onNavigate: (view: AppView) => void;
  onOpenBusinessVision: (businessKsNumber: string) => void;
  onAskKs001?: (message: string) => void;
  onStageSelections?: (message: string, destination: StoreDestination) => Promise<void>;
  onSelectionChange?: (items: SelectionItem[]) => void;
  /** Parent editing in SecurePay Check updates the same live Store collection. */
  workspaceSelection?: SelectionItem[];
  shoppingWide?: boolean;
  /** Signed-in Store is a CHILD of the approved Living Workspace; public routes remain standalone. */
  embedded?: boolean;
}) {
  const navPadding = useAppNavPadding(); // Public Experience Convergence Phase 2: no bottom-nav room in the public shell
  const [controller] = useState(() => createStoreController(gateway, trustedMediaOrigin));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [identityController, setIdentityController] = useState(() => createIdentityController(auth, session));
  const identityState = useSyncExternalStore(identityController.subscribe, identityController.getSnapshot);
  const sessionEpoch = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const storeSignedIn = sessionEpoch.status === 'signed-in';
  // Access-token renewal must not re-key a trader's unsent reply draft or a
  // buyer's unfinished enquiry. Only an ACTUAL sign-in/out transition creates
  // a new privacy epoch for the child inbox/history components.
  const previousSessionStatus = useRef(sessionEpoch.status);
  const privateStoreSessionEpoch = useRef<object>({});
  if(previousSessionStatus.current !== sessionEpoch.status) {
    previousSessionStatus.current = sessionEpoch.status;
    privateStoreSessionEpoch.current = {};
  }
  const [signInGate, setSignInGate] = useState<'manage' | 'create' | 'connect' | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showFullOffer, setShowFullOffer] = useState(false);
  const [selection,setSelection]=useState<SelectionItem[]>([]);
  const selectionRef=useRef<SelectionItem[]>([]);
  const [collectionNotice,setCollectionNotice]=useState('');
  useEffect(()=>{
    if(workspaceSelection && workspaceSelection!==selectionRef.current){
      selectionRef.current=workspaceSelection;setSelection(workspaceSelection);
      setCollectionNotice('Selection updated in SecurePay Check. Listed prices are unchanged.');
    }
  },[workspaceSelection]);
  const [collectionBusy,setCollectionBusy]=useState(false);
  const [publicDigitalAddress, setPublicDigitalAddress] = useState<PublicDigitalStoreAddress | null>(null);
  const [customerDraft, setCustomerDraft] = useState<StoreCustomerDraft>(emptyStoreCustomerDraft);
  const [focusedEnquiry, setFocusedEnquiry] = useState(() =>
    typeof window === 'undefined' ? null : parseStoreEnquiryRoute(window.location.hash));
  const continueEnquiryWithKs001 = (enquiry: StoreEnquiryDto) => {
    // The enquiry is a server-recorded buyer action. Carry ONLY canonical
    // pointers; KS001's backend revalidates owner, buyer, price, published state
    // and status before exposing proposal context. Never calculate a total or
    // treat a seller reply as acceptance.
    if (enquiry.status === 'DECLINED' || !enquiry.id || !enquiry.offerId || !enquiry.sellerKsNumber) return;
    onUseOffer({
      sourceId: enquiry.offerId, sourceOwnerKsNumber: enquiry.sellerKsNumber,
      enquiryId: enquiry.id,
      sourceDescription: 'Your enquiry at ' + enquiry.storeName + ' about ' + enquiry.offerTitle,
    });
  };

  const collect=(offer:import('../../types').StoreOffer,destination:StoreDestination)=>{
    try{
      const next=collectOffer(selectionRef.current,offer,destination,false);
      selectionRef.current=next;setSelection(next);onSelectionChange?.(next);
      setCollectionNotice('Added '+offer.title+' to '+(destination==='vision'?'Vision':'your agreement list')+'. Keep browsing.');
    }catch(error){setCollectionNotice(error instanceof Error?error.message:'Could not add that offer.');}
  };
  const quickAsk=async(offer:import('../../types').StoreOffer)=>{
    if(collectionBusy)return;
    setCollectionBusy(true);setCollectionNotice('');
    try{
      const next=collectOffer(selectionRef.current,offer,'agreement',false);
      selectionRef.current=next;setSelection(next);onSelectionChange?.(next);
      const question=selectionToKs001([itemFromOffer(offer,'agreement',false)],'agreement');
      if(onStageSelections)await onStageSelections(question,'agreement');
      else if(onAskKs001)onAskKs001(question);
      else throw new Error('Sign in to the full SecurePay KS001 workspace to continue. Your item remains selected.');
      setCollectionNotice('This offer is ready in the KS001 composer for your review. Nothing was automatically sent or agreed.');
    }catch(error){setCollectionNotice(error instanceof Error?error.message:'Could not prepare KS001. Your selection is still here.');}
    finally{setCollectionBusy(false);}
  };
  const stageCollection=async(destination:StoreDestination)=>{
    if(collectionBusy)return;
    setCollectionBusy(true);setCollectionNotice('');
    try{
      const text=selectionToKs001(selectionRef.current,destination);
      if(onStageSelections)await onStageSelections(text,destination);
      else if(destination==='agreement' && onAskKs001)onAskKs001(text);
      else throw new Error('This Store is not connected to a safe '+(destination==='vision'?'Vision':'KS001')+' handoff. Your selection remains here.');
      setCollectionNotice(destination==='vision'
        ? 'Your selected ideas are ready in the Vision composer for review. They have not been saved as a Dream.'
        : 'Your selected offers are ready in the existing KS001 composer. No Agreement has been accepted or funded.');
    }catch(error){setCollectionNotice(error instanceof Error?error.message:'Could not prepare the selected offers. They remain here.');}
    finally{setCollectionBusy(false);}
  };
  const previousStoreSession = useRef(sessionEpoch);
  useEffect(() => {
    // Unsent customer messages must not follow a former authenticated identity.
    // A guest signing in keeps their own draft; any transition away from an
    // authenticated session clears pending private enquiry content.
    // Normal token refresh reissues the same account's tokens and MUST NOT
    // delete an unsent Store enquiry. An actual sign-out clears private work.
    if (previousStoreSession.current.status === 'signed-in'
        && sessionEpoch.status === 'signed-out')
      {setCustomerDraft(emptyStoreCustomerDraft);selectionRef.current=[];setSelection([]);onSelectionChange?.([]);setCollectionNotice('');}
    previousStoreSession.current = sessionEpoch;
  }, [sessionEpoch]);
  const [manageChoices, setManageChoices] = useState<BusinessRepresentationDto[] | null>(null);
  const [manageChoiceBusy, setManageChoiceBusy] = useState(false);
  const [manageChoiceError, setManageChoiceError] = useState<string | null>(null);
  const [plugAvailability, setPlugAvailability] = useState<PlugAvailabilityResponse | null>(null);
  const [plugAvailabilityBusy, setPlugAvailabilityBusy] = useState(false);
  const [plugAvailabilityError, setPlugAvailabilityError] = useState<string | null>(null);
  const [plugMissions, setPlugMissions] = useState<PlugMissionDto[]>([]);
  const [opportunityInspection, setOpportunityInspection] = useState<{
    needId: string;
    loading: boolean;
    error: string | null;
    matches: FulfilmentNeedMatchDto[];
    routes: SupplyRouteDto[];
  } | null>(null);
  const [miniAgreementReview, setMiniAgreementReview] = useState<{
    route: SupplyRouteDto;
    review: import('../../api/securepay/fulfilment-needs').MiniAgreementReviewDto | null;
    loading: boolean;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    const addressSlug = typeof window !== 'undefined' ? parseDigitalStoreAddressRoute(window.location.hash) : null;
    const enquiryRoute = typeof window !== 'undefined' ? parseStoreEnquiryRoute(window.location.hash) : null;
    if (enquiryRoute) {
      setFocusedEnquiry(enquiryRoute);
      if (enquiryRoute.audience === 'trader' && session.getSnapshot().status === 'signed-in')
        void openManageChooser();
      else {
        void controller.enter();
        if (session.getSnapshot().status !== 'signed-in')
          setSignInGate(enquiryRoute.audience === 'trader' ? 'manage' : 'connect');
      }
    }
    else if (initialOfferRoute) { setShowFullOffer(false); void controller.openOffer(initialOfferRoute.canonicalKsNumber, initialOfferRoute.offerId); }
    else if (addressSlug) {
      void gateway.publicDigitalAddress(addressSlug).then(result => {
        setPublicDigitalAddress(result);
        if (result.slug !== addressSlug && parseDigitalStoreAddressRoute(window.location.hash) === addressSlug)
          window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/shop/' + result.slug);
        void controller.openStore(result.canonicalKsNumber);
      }).catch(() => { setPublicDigitalAddress(null); void controller.openStore(''); });
    }
    else if (typeof window !== 'undefined' && window.location.hash === '#/store/open') {
      // A resident's invitation takes the trader straight to THEIR first offer.
      // It does not create an account or a public Store without their own action.
      controller.openBuilder(null);
    } else {
      const first = consumeFirstStoreOffer();
      if (first) controller.restoreFirstOffer(first);
      else void controller.enter();
    }
    // Runs once on mount only — controller/initialOfferRoute are stable for this component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A customer may follow several merchant links in the same tab. Re-read each
  // address; never carry one seller's pin or identity into another Store.
  useEffect(() => {
    const onStoreAddressChange = () => {
      if (window.location.hash === '#/store/open') {
        setPublicDigitalAddress(null);
        controller.openBuilder(null);
        return;
      }
      const slug = parseDigitalStoreAddressRoute(window.location.hash);
      if (!slug) return;
      setPublicDigitalAddress(null);
      void gateway.publicDigitalAddress(slug).then(result => {
        if (parseDigitalStoreAddressRoute(window.location.hash) !== slug) return;
        setPublicDigitalAddress(result);
        if (result.slug !== slug)
          window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/shop/' + result.slug);
        void controller.openStore(result.canonicalKsNumber);
      }).catch(() => {
        if (parseDigitalStoreAddressRoute(window.location.hash) === slug)
          void controller.openStore('');
      });
    };
    window.addEventListener('hashchange', onStoreAddressChange);
    return () => window.removeEventListener('hashchange', onStoreAddressChange);
  }, [gateway, controller]);

  // Public Store search also opens Stores by canonical KS, not only by /s/ links.
  // Resolve the same server-owned privacy-safe Store address for either entrance.
  const selectedSellerKs = state.selectedStore.status === 'ready' ? state.selectedStore.data.store.id : null;
  useEffect(() => {
    if (!selectedSellerKs) return;
    let active = true;
    setCustomerDraft(emptyStoreCustomerDraft);
    setPublicDigitalAddress(current => current?.canonicalKsNumber === selectedSellerKs ? current : null);
    void gateway.publicDigitalAddressForKs(selectedSellerKs).then(found => {
      if (active) setPublicDigitalAddress(found);
    }).catch(() => {
      if (active) setPublicDigitalAddress(null);
    });
    return () => { active = false; };
  }, [selectedSellerKs, gateway]);

  // Debounced live search: the locked StoreHome box has no submit button. The initial empty-query
  // search already runs via controller.enter() above (or the direct-offer-link openOffer() call), so a
  // query value that has not actually changed must never re-trigger it. A boolean "skip the first run"
  // ref is NOT safe here: React 18 StrictMode's dev-only mount→cleanup→mount replay re-invokes this
  // effect twice on initial mount, and a boolean ref reads as already-flipped on the replay, arming a
  // real 400ms timer that later fires `runSearch` and force-resets `view` back to 'home' — discovered via
  // the Golden Spine G browser walkthrough landing on a real Offer via `initialOfferRoute` (Community's
  // "View offer" hand-off; the same fresh-mount path the `#/store/{ks}/offer/{id}` SecureLink deep link
  // already used). Comparing against the last real query value is immune to the replay, since the query
  // itself is identical across it.
  const previousQuery = useRef(state.query);
  useEffect(() => {
    if (previousQuery.current === state.query) return;
    previousQuery.current = state.query;
    const handle = setTimeout(() => void controller.submitSearch(), 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.query]);

  useEffect(() => {
    if (signInGate && identityState.phase === 'signed-in') {
      const gate = signInGate;
      setSignInGate(null);
      setIdentityController(createIdentityController(auth, session));
      if (gate === 'manage') void openManageChooser();
      // The first offer remains in the builder. Never auto-publish on identity completion.
    }
  }, [signInGate, identityState.phase, controller, auth, session]);

  const openManageChooser = async () => {
    setManageChoiceBusy(true);
    setManageChoiceError(null);
    try {
      const businesses = await businessGateway.mine();
      setManageChoices(businesses);
    } catch (error) {
      setManageChoiceError(errorText(error));
      setManageChoices([]);
    } finally {
      setManageChoiceBusy(false);
    }
  };

  const loadPlugAvailability = async () => {
    try {
      const current = await marketNetworkGateway.plugAvailability();
      setPlugAvailability(current.qualified ? current : null);
      if (current.qualified) {
        try { setPlugMissions(await marketNetworkGateway.plugMissions()); }
        catch { setPlugMissions([]); }
      } else {
        setPlugMissions([]);
      }
      setPlugAvailabilityError(null);
    } catch {
      // Store remains fully usable when Plug availability cannot be loaded.
      setPlugAvailability(null);
    }
  };

  const reviewRouteForAgreement = async (needId: string, route: SupplyRouteDto) => {
    if (!fulfilmentNeedsGateway) return;
    setMiniAgreementReview({ route, review: null, loading: true, error: null });
    try {
      const review = await fulfilmentNeedsGateway.miniAgreementReview(needId, route.offerId);
      setMiniAgreementReview({ route, review, loading: false, error: null });
    } catch (error) {
      setMiniAgreementReview({ route, review: null, loading: false, error: errorText(error) });
    }
  };

  const inspectOpportunity = async (needId: string) => {
    if (!fulfilmentNeedsGateway) return;
    setOpportunityInspection({ needId, loading: true, error: null, matches: [], routes: [] });
    try {
      const [matches, routes] = await Promise.all([
        fulfilmentNeedsGateway.matches(needId),
        fulfilmentNeedsGateway.routes(needId),
      ]);
      setOpportunityInspection({ needId, loading: false, error: null, matches, routes });
    } catch (error) {
      setOpportunityInspection({ needId, loading: false, error: errorText(error), matches: [], routes: [] });
    }
  };

  const togglePlugAvailability = async () => {
    if (!plugAvailability || plugAvailabilityBusy) return;
    setPlugAvailabilityBusy(true);
    setPlugAvailabilityError(null);
    try {
      const updated = await marketNetworkGateway.updatePlugAvailability({
        available: !plugAvailability.available,
        scheduleNote: plugAvailability.scheduleNote,
        availableUntil: plugAvailability.availableUntil,
        areas: plugAvailability.areas,
        radiusKm: plugAvailability.radiusKm,
        capabilities: plugAvailability.capabilities,
        maximumTasks: plugAvailability.maximumTasks,
        minimumTaskValueMinor: plugAvailability.minimumTaskValueMinor,
        notificationPreferences: plugAvailability.notificationPreferences,
      });
      setPlugAvailability(updated.qualified ? updated : null);
    } catch (error) {
      setPlugAvailabilityError(errorText(error));
    } finally {
      setPlugAvailabilityBusy(false);
    }
  };

  const openBusinessStore = async (business: BusinessRepresentationDto) => {
    setManageChoiceBusy(true);
    setManageChoiceError(null);
    try {
      const confirmed = await businessGateway.representation(business.businessKsNumber);
      if (!confirmed.canActFor || confirmed.businessKsNumber !== business.businessKsNumber) throw new Error('not confirmed');
      setManageChoices(null);
      await controller.enterBusinessManagement(confirmed.businessKsNumber, confirmed.displayName ?? confirmed.businessKsNumber);
      await loadPlugAvailability();
    } catch (error) {
      setManageChoiceError(errorText(error));
    } finally {
      setManageChoiceBusy(false);
    }
  };

  const requireAuth = (gate: 'manage' | 'create') => {
    if (gate === 'create') {
      // Do not ask for credentials before someone understands what they sell.
      controller.openBuilder(null);
      return;
    }
    if (session.getSnapshot().status === 'signed-in') { void openManageChooser(); return; }
    setSignInGate(gate);
  };

  const navBarView: AppView = 'store';
  const handleNavigate = (view: AppView) => { if (view === 'store') { setSignInGate(null); controller.backToHome(); } else onNavigate(view); };


  if (manageChoices !== null) {
    return (
      <div className={embedded ? 'min-h-0 flex-1 overflow-y-auto bg-cream-50' : `min-h-dvh flex flex-col bg-cream-100 ${navPadding}`}>
        {!embedded && <NavBar view={navBarView} onNavigate={handleNavigate} />}
        <div className="max-w-2xl w-full mx-auto px-4 md:px-6 py-6 space-y-4">
          <button onClick={() => setManageChoices(null)} className="text-sm text-forest-700">← Store</button>
          <div>
            <h1 className="font-display text-xl text-forest-800">Which Store are you managing?</h1>
            <p className="text-sm text-sand-500 mt-1">SecurePay re-confirms your authority before opening a Business Store.</p>
          </div>
          <button disabled={manageChoiceBusy} onClick={() => { setManageChoices(null); void controller.enterManagement().then(loadPlugAvailability); }}
            className="w-full text-left rounded-2xl border border-cream-200 bg-white px-4 py-4">
            <div className="font-medium text-forest-800">My personal Store</div>
            <div className="text-xs text-sand-500 mt-1">Your own KS Store.</div>
          </button>
          {manageChoices.map(business => (
            <button key={business.businessKsNumber} disabled={manageChoiceBusy} onClick={() => void openBusinessStore(business)}
              className="w-full text-left rounded-2xl border border-cream-200 bg-white px-4 py-4">
              <div className="font-medium text-forest-800">{business.displayName ?? business.businessKsNumber}</div>
              <div className="text-xs text-sand-500 mt-1">{business.businessKsNumber} · Business Store</div>
            </button>
          ))}
          {manageChoiceBusy && <LoadingNotice text="Confirming Store authority…" />}
          {manageChoiceError && <p role="alert" className="text-sm text-ember-600">{manageChoiceError}</p>}
        </div>
      </div>
    );
  }

  if (signInGate) {
    const authData = secureAuthView(identityState);
    return (
      <div className={embedded ? 'min-h-0 flex-1 overflow-y-auto bg-cream-50' : `min-h-dvh flex flex-col bg-cream-100 ${navPadding}`}>
        {!embedded && <NavBar view={navBarView} onNavigate={handleNavigate} />}
        <div className="flex-1 flex items-center justify-center p-6">
          <SecureAuthCard
            data={authData}
            values={identityState.phase === 'otp' ? [identityState.otp] : [identityState.ksNumber, identityState.password]}
            disabled={identityState.busy}
            errorText={identityState.error}
            onFieldChange={(index, value) => {
              if (identityState.phase === 'otp') identityController.setOtp(value);
              else if (index === 0) identityController.setKsNumber(value);
              else identityController.setPassword(value);
            }}
            onChoice={value => {
              if (value === 'submit_credentials') void identityController.submitCredentials();
              else if (value === 'submit_otp') void identityController.submitOtp();
              else if (value === 'reset_credentials') identityController.reset();
              else if (value === 'cancel_auth') { setSignInGate(null); identityController.reset(); }
            }}
          />
          {signInGate === 'create' && (
            <div className="mt-4 max-w-md w-full rounded-xl border border-forest-200 bg-white p-4">
              <p className="text-sm text-forest-800">Your first offer is still a private draft. A KS Number is required before publishing.</p>
              <button type="button" className="mt-3 min-h-11 text-sm font-medium text-forest-700 underline"
                onClick={() => {
                  holdFirstStoreOffer(state.draft);
                  setSignInGate(null);
                  // Existing generic signup remains identity-only. It cannot publish the draft.
                  window.location.hash = '#/sign-up';
                }}>Get my KS Number</button>
              <button type="button" className="ml-4 min-h-11 text-sm text-sand-600 underline"
                onClick={() => setSignInGate(null)}>Review my offer first</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  let body: React.ReactNode;

  if (state.view === 'home') {
    body = (
      <StoreHome
        embedded={embedded}
        shoppingWide={shoppingWide || !embedded}
        selection={selection}
        onCollect={collect}
        onQuickKs001={offer=>{void quickAsk(offer);}}
        selectionPanel={shoppingWide || !embedded ? <StoreCollectionPanel
          items={selection}
          onQuantity={(key,value)=>{const next=updateSelectedQuantity(selectionRef.current,key,value);selectionRef.current=next;setSelection(next);onSelectionChange?.(next);}}
          onRemove={key=>{const next=removeSelected(selectionRef.current,key);selectionRef.current=next;setSelection(next);onSelectionChange?.(next);}}
          onNote={(key,note)=>{const next=updateSelectedBuyerNote(selectionRef.current,key,note);selectionRef.current=next;setSelection(next);onSelectionChange?.(next);}}
          onContinue={destination=>{void stageCollection(destination);}}
          notice={collectionNotice}
          busy={collectionBusy}
        /> : undefined}
        onOpenOffer={id => { if (state.search.status === 'ready') { const found = state.search.data.find(r => r.offer.id === id); if (found) { setShowFullOffer(false); void controller.openOffer(found.canonicalKsNumber, id); } } }}
        onOpenStore={id => { void controller.openStore(id); }}
        onManageStore={() => requireAuth('manage')}
        onCreateOffer={() => requireAuth('create')}
        onStartConversation={() => onNavigate('signed-in')}
        offers={state.search.status === 'ready' ? state.search.data.map(r => r.offer) : []}
        stores={[]}
        storeLinks={state.search.status === 'ready'
          ? Array.from(new Map(state.search.data.map(result => [result.canonicalKsNumber,
              { ksNumber: result.canonicalKsNumber, displayName: result.displayName,
                locationLabel: result.locationLabel }])).values()).slice(0, 12)
          : []}
        query={state.query}
        onQueryChange={q => controller.setQuery(q)}
        searchStatus={state.search.status === 'idle' ? 'idle' : state.search.status === 'loading' ? 'loading' : state.search.status === 'error' ? 'error' : 'ready'}
        searchErrorText={state.search.status === 'error' ? errorText(state.search.error) : null}
        onJourneyNavigate={onNavigate}
        onAskKs001={onAskKs001 ? () => onAskKs001('I’m browsing the SecurePay Store. Based on what I am looking for here, what real SecurePay products, services or capabilities could help me choose, compare or move toward an Agreement? Only suggest things SecurePay can actually verify.') : undefined}
        contextLabel={returnContext?.label ?? null}
        connectionsPanel={<StoreConnectionsHome gateway={gateway} signedIn={storeSignedIn} sessionEpoch={privateStoreSessionEpoch.current} onContinueWithKs001={continueEnquiryWithKs001} onResumeSavedWork={onResumeSavedWork} focusedEnquiryId={focusedEnquiry?.audience === 'buyer' ? focusedEnquiry.enquiryId : null}/>} 
      />
    );
  } else if (state.view === 'profile') {
    if (state.selectedStore.status === 'error') body = <div className="p-6"><ErrorStateCard data={errorView(errorText(state.selectedStore.error))} onChoice={() => controller.backToHome()} /></div>;
    else if (state.selectedStore.status !== 'ready') body = <LoadingNotice text="Loading this Store…" />;
    else body = <StoreProfileView store={state.selectedStore.data.store} offers={state.selectedStore.data.offers} onBack={() => controller.backToHome()} onOpenOffer={id => { setShowFullOffer(false); void controller.openOffer(state.selectedStore.status === 'ready' ? state.selectedStore.data.store.id : '', id); }}
      digitalAddress={publicDigitalAddress?.canonicalKsNumber === state.selectedStore.data.store.id ? publicDigitalAddress : null}
      connectionPanel={publicDigitalAddress?.canonicalKsNumber === state.selectedStore.data.store.id
        ? <StoreCustomerConnections key={state.selectedStore.data.store.id}
            gateway={gateway} sellerKs={state.selectedStore.data.store.id}
            storeName={publicDigitalAddress.storeName} offers={state.selectedStore.data.offers}
            signedIn={storeSignedIn} sessionEpoch={privateStoreSessionEpoch.current}
            onContinueWithKs001={continueEnquiryWithKs001}
            draft={customerDraft} setDraft={setCustomerDraft}
            onRequestSignIn={() => setSignInGate('connect')}
          />
        : <p className="mb-4 text-xs text-sand-600">This Store has not yet confirmed a shareable digital address for direct customer connections.</p>}
    />;
  } else if (state.view === 'offer' || state.view === 'toAgreement') {
    if (state.selectedOffer.status === 'error') body = <div className="p-6"><ErrorStateCard data={errorView(errorText(state.selectedOffer.error))} onChoice={() => controller.backToHome()} /></div>;
    else if (state.selectedOffer.status !== 'ready') body = <LoadingNotice text="Loading this offer…" />;
    else if (state.view === 'toAgreement') {
      body = (
        <OfferToTradeHandoff
          offer={state.selectedOffer.data.offer}
          onBack={() => controller.backToOffer()}
          onProceed={() => {
            const load = state.selectedOffer.status === 'ready' ? state.selectedOffer.data : null;
            if (!load) return;
            const amount = load.priceMinor !== null ? String(load.priceMinor / 100) : undefined;
            onUseOffer({
              amount, currency: amount ? load.offer.currency : undefined,
              // offer.version is an as-of update date (no backend Store Offer version/hash exists — see
              // adapters.ts asOfDate); phrased here as "updated", never as a version.
              sourceDescription: `Offer: ${load.offer.title} — ${load.offer.storeName} — offer ${load.offer.id}, updated ${load.offer.version}`,
              // Final Phase 4 Economy Turn 2 (Section 2/3): the real, stable offer id and owner KS
              // Number -- never fabricated -- so the backend can attach immutable source provenance
              // if this conversation ever becomes a real Agreement. See controller.ts's useOffer.
              sourceId: load.offer.id, sourceOwnerKsNumber: load.store.id,
            });
          }}
        />
      );
    } else if (showFullOffer) {
      body = (
        <>
          <OfferDetail
            offer={state.selectedOffer.data.offer}
            onBack={() => setShowFullOffer(false)}
            onInterested={() => onNavigate('signed-in')}
            onUseThis={() => controller.useThis()}
            onAskSecurePay={() => {
              if(state.selectedOffer.status !== 'ready') return;
              if(onAskKs001) onAskKs001(storeOfferAssistTurn(state.selectedOffer.data.offer));
              else onNavigate('signed-in');
            }}
            onShare={() => setShowShareSheet(true)}
            onViewStore={id => void controller.openStore(id)}
          />
          {showShareSheet && <SecureLinkShareSheet offer={state.selectedOffer.data.offer} onClose={() => setShowShareSheet(false)} />}
        </>
      );
    } else {
      body = (
        <OfferQuickPreview
          offer={state.selectedOffer.data.offer}
          onBack={() => returnContext ? returnContext.onReturn() : controller.backToHome()}
          backLabel={returnContext ? `Back to ${returnContext.label}` : 'Results'}
          sourceLabel={returnContext ? `From ${returnContext.label}` : null}
          onUseThis={() => controller.useThis()}
          onAskKs001={() => {
              if(state.selectedOffer.status !== 'ready') return;
              if(onAskKs001) onAskKs001(storeOfferAssistTurn(state.selectedOffer.data.offer));
              else onNavigate('signed-in');
            }}
          onOpenStore={() => void controller.openStore(state.selectedOffer.status === 'ready' ? state.selectedOffer.data.store.id : '')}
          onOpenFull={() => setShowFullOffer(true)}
        />
      );
    }
  } else if (state.view === 'manage') {
    if (state.mine.status === 'error') body = <div className="p-6"><ErrorStateCard data={errorView(errorText(state.mine.error))} onChoice={() => void controller.enterManagement()} /></div>;
    else if (state.mine.status !== 'ready') body = <LoadingNotice text="Loading your Store…" />;
    else body = (
      <StoreManagementHome
        store={state.mine.data.profile}
        offers={state.mine.data.offers}
        activity={[]}
        enquiries={[]}
        onBack={() => controller.backToHome()}
        onCreateOffer={() => controller.openBuilder(null)}
        onEditOffer={offerId => controller.openBuilder(offerId)}
        onConfirmAvailability={offerId => void controller.confirmAvailability(offerId)}
        businessMode={state.managedBusiness !== null}
        opportunities={state.mine.status === 'ready' ? state.mine.data.opportunities : []}
        onOpenGrow={state.managedBusiness ? () => onOpenBusinessVision(state.managedBusiness!.ksNumber) : undefined}
        onOpenMoney={() => onNavigate('money')}
        plugAvailability={plugAvailability}
        plugAvailabilityBusy={plugAvailabilityBusy}
        plugAvailabilityError={plugAvailabilityError}
        plugMissions={plugMissions}
        onTogglePlugAvailability={plugAvailability ? () => void togglePlugAvailability() : undefined}
        onInspectOpportunity={fulfilmentNeedsGateway ? needId => void inspectOpportunity(needId) : undefined}
        onOpenRouteOffer={(providerKsNumber, offerId) => { setShowFullOffer(false); void controller.openOffer(providerKsNumber, offerId); }}
        onReviewRoute={fulfilmentNeedsGateway ? (needId, route) => void reviewRouteForAgreement(needId, route) : undefined}
        onAskKs001={onAskKs001 ? () => onAskKs001('I’m in my Store. Looking at my offers, fulfilment opportunities and current Store work, what real SecurePay products, services or capabilities could help me now? Only suggest things SecurePay can actually verify, and tell me why each one fits.') : undefined}
        opportunityInspection={opportunityInspection}
        enquiryInbox={<StoreEnquiryInbox key={state.managedBusiness?.ksNumber ?? 'personal'} gateway={gateway} businessKs={state.managedBusiness?.ksNumber ?? null} sessionEpoch={privateStoreSessionEpoch.current} focusedEnquiryId={focusedEnquiry?.audience === 'trader' ? focusedEnquiry.enquiryId : null}/>}
        agreementProgress={<section aria-label="Agreement progress" className="rounded-2xl border border-cream-200 bg-white p-4">
          <h3 className="font-display text-lg text-forest-900">Where an enquiry becomes work</h3>
          <p className="mt-1 text-xs leading-5 text-sand-600">
            A reply is only a reply. When KS001 and the participants establish an Agreement,
            its reviews, responsibilities and progress belong in the existing Agreements workspace.
          </p>
          <button type="button" onClick={() => onNavigate('agreements')}
            className="mt-3 min-h-11 rounded-xl border border-forest-200 bg-white px-4 text-xs font-medium text-forest-800">
            Open my Agreements
          </button>
        </section>}
        digitalStoreSetup={<DigitalStoreSetup
          gateway={gateway}
          businessKsNumber={state.managedBusiness?.ksNumber ?? null}
          publishedCount={state.mine.data.raw.filter(offer => offer.published).length}
          onProfileSaved={() => { void controller.refreshMine(); }}
          onCommunityProviderContinue={onAskKs001 ? serviceTypes => onAskKs001(
            'I have explicitly registered my interest in serving my community through ' +
            serviceTypes.map(type => type === 'SHORTSTAYS' ? 'ShortStays' : type === 'MY_RIDE' ? 'My Ride' : 'Storage').join(', ') +
            ' during my Digital Store setup. Help me prepare the relevant service-specific provider onboarding. ' +
            'This is an application only; do not claim I am verified, publish an offer, accept bookings or agreements, or activate any financial action.'
          ) : undefined}
        />}
      />
    );
  } else {
    body = (
      <OfferBuilderView
        draft={state.draft}
        availabilityOptions={availabilityOptionsFor(state.draft.kind)}
        busy={state.draftBusy}
        error={state.draftError}
        isEditing={!!state.editingOfferId}
        onChange={patch => controller.setDraft(patch)}
        onBack={() => controller.backFromBuilder()}
        onSubmit={() => {
          if (session.getSnapshot().status !== 'signed-in') {
            setSignInGate('create');
            return;
          }
          void controller.submitDraft();
        }}
      />
    );
  }

  if (miniAgreementReview) {
    const route = miniAgreementReview.route;
    return (
      <div className={embedded ? 'min-h-0 flex-1 overflow-y-auto bg-cream-50' : `min-h-dvh flex flex-col bg-cream-100 ${navPadding}`}>
        {!embedded && <NavBar view={navBarView} onNavigate={handleNavigate} />}
        <div className="max-w-2xl w-full mx-auto px-4 md:px-6 py-6">
          {miniAgreementReview.loading && <LoadingNotice text="Preparing the Agreement review…" />}
          {miniAgreementReview.error && (
            <div className="rounded-2xl border border-ember-200 bg-ember-50 px-4 py-4">
              <p role="alert" className="text-sm text-ember-700">{miniAgreementReview.error}</p>
              <button type="button" onClick={() => setMiniAgreementReview(null)} className="mt-3 min-h-11 text-sm text-forest-700 underline">Back to Store</button>
            </div>
          )}
          {miniAgreementReview.review && (
            <FulfilmentMiniAgreementReview
              review={miniAgreementReview.review}
              route={route}
              onBack={() => setMiniAgreementReview(null)}
              onOpenOffer={() => { setMiniAgreementReview(null); void controller.openOffer(route.providerKsNumber, route.offerId); }}
              onContinue={() => {
                const review = miniAgreementReview.review;
                if (!review) return;
                const amount = review.proposedAmountMinor !== null ? String(review.proposedAmountMinor / 100) : undefined;
                onUseOffer({
                  amount,
                  currency: amount ? review.currency : undefined,
                  sourceDescription: `Fulfilment route: ${review.what} — ${review.providerDisplayName ?? review.providerKsNumber} — offer ${review.offerId}`,
                  sourceId: review.offerId,
                  sourceOwnerKsNumber: review.providerKsNumber,
                });
              }}
            />
          )}
        </div>
      </div>
    );
  }

  // Only the public/direct-link experience owns the standalone header.
  // An authenticated Living Workspace supplies the ONE Tool Shelf, ONE KS001
  // conversation and ONE authoritative Agreement/SecurePay Check instead.
  if (embedded) {
    return <section data-store-embedded-body aria-label="Digital Store workspace"
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-cream-50">
      {body}
    </section>;
  }
  return (
    <div className={`min-h-dvh flex flex-col bg-cream-100 ${navPadding}`}>
      <NavBar view={navBarView} onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col overflow-hidden">{body}</div>
    </div>
  );
}
