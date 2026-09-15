import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { NavBar } from '../../components/NavBar';
import { StoreHome } from '../../components/StoreHome';
import { StoreProfileView } from '../../components/StoreProfileView';
import { OfferDetail } from '../../components/OfferDetail';
import { OfferToTradeHandoff } from '../../components/OfferToTradeHandoff';
import { SecureLinkShareSheet } from '../../components/SecureLinkShareSheet';
import { StoreManagementHome } from '../../components/StoreManagementHome';
import { OfferBuilderView } from '../../components/OfferBuilderView';
import { SecureAuthCard } from '../../components/SecureAuth';
import { ErrorStateCard } from '../../components/ErrorState';
import type { StoreGateway } from '../../api/securepay/store';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import type { AppView, ErrorStateResponse } from '../../types';
import { createStoreController, errorText } from './controller';
import { availabilityOptionsFor } from './view';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';

type Gateway = Pick<StoreGateway, 'search' | 'store' | 'offer' | 'myProfile' | 'myOffers' | 'createOffer' | 'updateOffer' | 'confirmAvailability'>;

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
export function StoreExperience({ gateway, auth, session, initialOfferRoute, trustedMediaOrigin, onUseOffer, onNavigate }: {
  gateway: Gateway; auth: AuthGateway; session: SessionStore;
  initialOfferRoute?: { canonicalKsNumber: string; offerId: string } | null;
  /** The only origin a mediaRef may be loaded from as an <img> src — see adapters.ts `media()`. */
  trustedMediaOrigin: string | null;
  onUseOffer: (payload: { amount?: string; currency?: string; sourceDescription: string }) => void;
  onNavigate: (view: AppView) => void;
}) {
  const [controller] = useState(() => createStoreController(gateway, trustedMediaOrigin));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [identityController, setIdentityController] = useState(() => createIdentityController(auth, session));
  const identityState = useSyncExternalStore(identityController.subscribe, identityController.getSnapshot);
  const [signInGate, setSignInGate] = useState<'manage' | 'create' | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);

  useEffect(() => {
    if (initialOfferRoute) void controller.openOffer(initialOfferRoute.canonicalKsNumber, initialOfferRoute.offerId);
    else void controller.enter();
    // Runs once on mount only — controller/initialOfferRoute are stable for this component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (gate === 'manage') void controller.enterManagement();
      else controller.openBuilder(null);
    }
  }, [signInGate, identityState.phase, controller, auth, session]);

  const requireAuth = (gate: 'manage' | 'create') => {
    if (session.getSnapshot().status === 'signed-in') { if (gate === 'manage') void controller.enterManagement(); else controller.openBuilder(null); return; }
    setSignInGate(gate);
  };

  const navBarView: AppView = 'store';
  const handleNavigate = (view: AppView) => { if (view === 'store') { setSignInGate(null); controller.backToHome(); } else onNavigate(view); };

  if (signInGate) {
    const authData = secureAuthView(identityState);
    return (
      <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
        <NavBar view={navBarView} onNavigate={handleNavigate} />
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
        </div>
      </div>
    );
  }

  let body: React.ReactNode;

  if (state.view === 'home') {
    body = (
      <StoreHome
        onOpenOffer={id => { if (state.search.status === 'ready') { const found = state.search.data.find(r => r.offer.id === id); if (found) void controller.openOffer(found.canonicalKsNumber, id); } }}
        onOpenStore={() => {}}
        onManageStore={() => requireAuth('manage')}
        onCreateOffer={() => requireAuth('create')}
        onStartConversation={() => onNavigate('signed-in')}
        offers={state.search.status === 'ready' ? state.search.data.map(r => r.offer) : []}
        stores={[]}
        query={state.query}
        onQueryChange={q => controller.setQuery(q)}
        searchStatus={state.search.status === 'idle' ? 'idle' : state.search.status === 'loading' ? 'loading' : state.search.status === 'error' ? 'error' : 'ready'}
        searchErrorText={state.search.status === 'error' ? errorText(state.search.error) : null}
      />
    );
  } else if (state.view === 'profile') {
    if (state.selectedStore.status === 'error') body = <div className="p-6"><ErrorStateCard data={errorView(errorText(state.selectedStore.error))} onChoice={() => controller.backToHome()} /></div>;
    else if (state.selectedStore.status !== 'ready') body = <LoadingNotice text="Loading this Store…" />;
    else body = <StoreProfileView store={state.selectedStore.data.store} offers={state.selectedStore.data.offers} onBack={() => controller.backToHome()} onOpenOffer={id => void controller.openOffer(state.selectedStore.status === 'ready' ? state.selectedStore.data.store.id : '', id)} />;
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
            });
          }}
        />
      );
    } else {
      body = (
        <>
          <OfferDetail
            offer={state.selectedOffer.data.offer}
            onBack={() => controller.backToHome()}
            onInterested={() => onNavigate('signed-in')}
            onUseThis={() => controller.useThis()}
            onAskSecurePay={() => onNavigate('signed-in')}
            onShare={() => setShowShareSheet(true)}
            onViewStore={id => void controller.openStore(id)}
          />
          {showShareSheet && <SecureLinkShareSheet offer={state.selectedOffer.data.offer} onClose={() => setShowShareSheet(false)} />}
        </>
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
        onSubmit={() => void controller.submitDraft()}
      />
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <NavBar view={navBarView} onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col overflow-hidden">{body}</div>
    </div>
  );
}
