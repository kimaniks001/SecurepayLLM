import { lazy, Suspense, useEffect, useState } from 'react';
import { AgentExperience } from './features/agent/AgentExperience';
import { ActivationExperience } from './features/activation/ActivationExperience';
import { RecipientExperience } from './features/recipient/RecipientExperience';
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
const subscriptionGateway = api ? withSessionRefresh(api.subscription, ['myStatus', 'selectPlan', 'activationAgreement', 'establishActivationAgreement', 'confirmActivationAgreement', 'prepareCurrentBillingCycle', 'activationFundingStatus', 'prepareVerificationFunding', 'initiateVerificationTransfer', 'prepareReserveFunding', 'establishReviewReserve'], session, api.auth) : undefined;
// The one external origin this app already has verified authority over — see adapters.ts `media()`.
const trustedMediaOrigin = api ? new URL(api.baseUrl).origin : null;

// Vite removes the unreachable fixture import from production builds.
const FixtureApp = import.meta.env.DEV && import.meta.env.VITE_SECUREPAY_MODE === 'fixture'
  ? lazy(() => import('./App')) : null;

/**
 * The invitation token lives only in the URL hash fragment (so the frontend host's own URL/access
 * log never sees it, and no local/session storage copy is made) for exactly as long as this recipient
 * view needs it. SecurePayAPI itself still receives the raw token by contract, as a path segment in
 * `GET /api/v1/agreement-invitations/{token}` and its `/join` — that is unavoidable backend authority,
 * not something this route choice claims to prevent.
 */
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

/** Same hash-route seam as useInvitationToken, for the public Offer deep link (see features/store/route.ts). */
function useStoreOfferRoute() {
  const [route, setRoute] = useState(() => (typeof window === 'undefined' ? null : parseStoreOfferRoute(window.location.hash)));
  useEffect(() => {
    const onHashChange = () => setRoute(parseStoreOfferRoute(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return route;
}

/** Activation is a first-class, non-secret route. No Agreement or payment identifiers are put in the URL. */
function useActivationRoute(): [boolean, () => void] {
  const matches = () => typeof window !== 'undefined' && /^#\/?activate\/?$/.test(window.location.hash);
  const [active, setActive] = useState(matches);
  useEffect(() => {
    const onHashChange = () => setActive(matches());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const clear = () => { window.location.hash = ''; setActive(false); };
  return [active, clear];
}

export default function RuntimeApp() {
  const [invitationToken, clearInvitationToken] = useInvitationToken();
  const storeOfferRoute = useStoreOfferRoute();
  const [activationRoute, clearActivationRoute] = useActivationRoute();
  let mode;
  try { mode = runtimeMode(import.meta.env.VITE_SECUREPAY_MODE, import.meta.env.PROD); }
  catch { return <Unavailable />; }
  if (mode === 'fixture' && FixtureApp) {
    return <Suspense fallback={<p role="status">Loading preview…</p>}><FixtureApp /></Suspense>;
  }
  if (invitationToken) {
    // Keyed so a token change while mounted (hash navigation to a different invitation) always
    // starts a fresh recipient controller instead of reusing one closed over the previous token.
    return api && agreementGateway
      ? <RecipientExperience key={invitationToken} token={invitationToken} gateway={agreementGateway} auth={api.auth} session={session} onLeave={clearInvitationToken} />
      : <Unavailable />;
  }
  if (activationRoute) {
    return api && subscriptionGateway
      ? <ActivationExperience gateway={subscriptionGateway} auth={api.auth} session={session} onLeave={clearActivationRoute} />
      : <Unavailable />;
  }
  return api && agentGateway && agreementGateway && moneyGateway && storeGateway && circleGateway && masterGateway && marketNetworkGateway && referralGateway
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
