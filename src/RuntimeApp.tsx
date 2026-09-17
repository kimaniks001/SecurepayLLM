import { lazy, Suspense, useEffect, useState } from 'react';
import { AgentExperience } from './features/agent/AgentExperience';
import { RecipientExperience } from './features/recipient/RecipientExperience';
import { ActivationExperience } from './features/activation/ActivationExperience';
import { parseInvitationRoute } from './features/recipient/route';
import { parseStoreOfferRoute } from './features/store/route';
import { createSecurePayApi } from './api/securepay';
import { createSessionStore, withSessionRefresh } from './api/securepay/session';
import { runtimeMode } from './config/securepay';

const session = createSessionStore();
let api: ReturnType<typeof createSecurePayApi> | undefined;
try { api = createSecurePayApi(import.meta.env.VITE_SECUREPAY_API_BASE_URL, session.getAccessToken); } catch { /* Missing configuration fails closed. */ }
const agentGateway = api ? withSessionRefresh(api.agent, ['adoptHandoff', 'reviewHandoff', 'continueHandoff'], session, api.auth) : undefined;
const agreementGateway = api ? withSessionRefresh(api.agreements, ['join', 'versions', 'version', 'confirmVersion', 'currentUserAgreements', 'currentUserActions', 'hub', 'detail', 'confirmationStatus', 'attributePlug', 'plugAttribution', 'referralStatus'], session, api.auth) : undefined;
const moneyGateway = api ? withSessionRefresh(api.money, ['status', 'records'], session, api.auth) : undefined;
const storeGateway = api ? withSessionRefresh(api.store, ['myProfile', 'updateMyProfile', 'myOffers', 'createOffer', 'updateOffer', 'confirmAvailability'], session, api.auth) : undefined;
const circleGateway = api ? withSessionRefresh(api.circle, ['me'], session, api.auth) : undefined;
const masterGateway = api ? withSessionRefresh(api.master, ['designateSelf', 'createRequest', 'proposeCost', 'accept', 'decline', 'submitOpinion'], session, api.auth) : undefined;
const marketNetworkGateway = api ? withSessionRefresh(api.marketNetwork, ['createRequest', 'myRequests', 'cancelRequest', 'candidates', 'selection', 'selectCandidate', 'relationship', 'openRelationship', 'relationshipLifecycle'], session, api.auth) : undefined;
const referralGateway = api ? withSessionRefresh(api.referral, ['myCode', 'redeem', 'myHistory', 'myLifetimeShare'], session, api.auth) : undefined;
const subscriptionGateway = api ? withSessionRefresh(api.subscription, ['myStatus', 'selectPlan', 'activationAgreement', 'establishActivationAgreement', 'confirmActivationAgreement', 'prepareCurrentBillingCycle'], session, api.auth) : undefined;
const trustedMediaOrigin = api ? new URL(api.baseUrl).origin : null;

const FixtureApp = import.meta.env.DEV && import.meta.env.VITE_SECUREPAY_MODE === 'fixture'
  ? lazy(() => import('./App')) : null;

function useInvitationToken(): [string | null, () => void] {
  const [token, setToken] = useState(() => (typeof window === 'undefined' ? null : parseInvitationRoute(window.location.hash)));
  useEffect(() => {
    const onHashChange = () => setToken(parseInvitationRoute(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const clear = () => { window.location.hash = ''; setToken(null); };
  return [token, clear];
}

function useStoreOfferRoute() {
  const [route, setRoute] = useState(() => (typeof window === 'undefined' ? null : parseStoreOfferRoute(window.location.hash)));
  useEffect(() => {
    const onHashChange = () => setRoute(parseStoreOfferRoute(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return route;
}

function useActivationRoute() {
  const read = () => typeof window !== 'undefined' && window.location.hash === '#/activate';
  const [active, setActive] = useState(read);
  useEffect(() => {
    const onHashChange = () => setActive(read());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return active;
}

export default function RuntimeApp() {
  const [invitationToken, clearInvitationToken] = useInvitationToken();
  const storeOfferRoute = useStoreOfferRoute();
  const activationRoute = useActivationRoute();
  let mode;
  try { mode = runtimeMode(import.meta.env.VITE_SECUREPAY_MODE, import.meta.env.PROD); }
  catch { return <Unavailable />; }
  if (mode === 'fixture' && FixtureApp) {
    return <Suspense fallback={<p role="status">Loading preview…</p>}><FixtureApp /></Suspense>;
  }
  if (invitationToken) {
    return api && agreementGateway
      ? <RecipientExperience key={invitationToken} token={invitationToken} gateway={agreementGateway} auth={api.auth} session={session} onLeave={clearInvitationToken} />
      : <Unavailable />;
  }
  if (activationRoute) {
    return api && subscriptionGateway
      ? <ActivationExperience gateway={subscriptionGateway} auth={api.auth} session={session} onLeave={() => { window.location.hash = ''; }} />
      : <Unavailable />;
  }
  return api && agentGateway && agreementGateway && moneyGateway && storeGateway && circleGateway && masterGateway && marketNetworkGateway && referralGateway && subscriptionGateway
    ? <AgentExperience gateway={agentGateway} agreementGateway={agreementGateway} moneyGateway={moneyGateway} storeGateway={storeGateway} circleGateway={circleGateway} masterGateway={masterGateway} marketNetworkGateway={marketNetworkGateway} referralGateway={referralGateway} auth={api.auth} session={session} initialStoreOfferRoute={storeOfferRoute} trustedMediaOrigin={trustedMediaOrigin} />
    : <Unavailable />;
}
function Unavailable() {
  return <main className="min-h-screen bg-cream-50 text-forest-800 flex items-center justify-center p-6">
    <div role="status" className="max-w-md text-center">
      <h1 className="font-display text-2xl">SecurePay is unavailable</h1>
      <p className="mt-3 text-sand-600">Please try again later.</p>
    </div>
  </main>;
}
