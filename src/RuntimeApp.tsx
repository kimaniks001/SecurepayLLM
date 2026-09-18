import { lazy, Suspense, useEffect, useState } from 'react';
import { AgentExperience } from './features/agent/AgentExperience';
import { ActivationExperience } from './features/activation/ActivationExperience';
import { MoneyExperience } from './features/money/MoneyExperience';
import { HostedMoneySessionExperience } from './features/money/HostedMoneySessionExperience';
import { MoneyOperationsExperience } from './features/money/MoneyOperationsExperience';
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
const moneyAuthorityGateway = api ? withSessionRefresh(api.moneyAuthority, ['list', 'open', 'status', 'fund', 'exercise', 'release', 'transactions'], session, api.auth) : undefined;
const financialPartnerGateway = api ? withSessionRefresh(api.financialPartners, ['list'], session, api.auth) : undefined;
const settlementDestinationGateway = api ? withSessionRefresh(api.settlementDestinations, ['current', 'history', 'verificationStatus', 'register', 'replace'], session, api.auth) : undefined;
const moneySessionGateway = api ? withSessionRefresh(api.moneySession, ['create', 'resolve', 'redeem'], session, api.auth) : undefined;
const paymentIntentGateway = api ? withSessionRefresh(api.paymentIntent, ['fundingAuthority', 'fundingOptions', 'createQuote', 'createIntent', 'listIntents', 'get', 'listAttempts', 'initiate'], session, api.auth) : undefined;
const moneyOperationsGateway = api ? withSessionRefresh(api.moneyOperations, ['summary'], session, api.auth) : undefined;
const currencyCapabilityGateway = api ? withSessionRefresh(api.currencyCapability, ['list', 'activate'], session, api.auth) : undefined;
const fxApplicationGateway = api ? withSessionRefresh(api.fxApplication, ['create', 'get', 'list', 'capability'], session, api.auth) : undefined;
const regulatedAccountsGateway = api ? withSessionRefresh(api.regulatedAccounts, ['listMine'], session, api.auth) : undefined;
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

/** Money is a first-class, non-secret route -- no Agreement or payment identifiers are put in the URL. */
function useMoneyRoute(): [boolean, () => void] {
  const matches = () => typeof window !== 'undefined' && /^#\/?money\/?$/.test(window.location.hash);
  const [active, setActive] = useState(matches);
  useEffect(() => {
    const onHashChange = () => setActive(matches());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const clear = () => { window.location.hash = ''; setActive(false); };
  return [active, clear];
}

/** Money operations is a first-class, non-secret route for support/ops roles -- read-only, gated server-side by REGULATED_PARTNER_READ. */
function useMoneyOperationsRoute(): [boolean, () => void] {
  const matches = () => typeof window !== 'undefined' && /^#\/?money-operations\/?$/.test(window.location.hash);
  const [active, setActive] = useState(matches);
  useEffect(() => {
    const onHashChange = () => setActive(matches());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const clear = () => { window.location.hash = ''; setActive(false); };
  return [active, clear];
}

/** Hosted Money session route -- #/money-session/{token}. The token lives only in the hash, like the invitation token. */
function useMoneySessionRoute(): string | null {
  const parse = () => {
    if (typeof window === 'undefined') return null;
    const match = /^#\/?money-session\/([^/]+)\/?$/.exec(window.location.hash);
    return match ? decodeURIComponent(match[1]) : null;
  };
  const [token, setToken] = useState(parse);
  useEffect(() => {
    const onHashChange = () => setToken(parse());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return token;
}

export default function RuntimeApp() {
  const [invitationToken, clearInvitationToken] = useInvitationToken();
  const storeOfferRoute = useStoreOfferRoute();
  const [activationRoute, clearActivationRoute] = useActivationRoute();
  const [moneyRoute, clearMoneyRoute] = useMoneyRoute();
  const [moneyOperationsRoute, clearMoneyOperationsRoute] = useMoneyOperationsRoute();
  const moneySessionToken = useMoneySessionRoute();
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
  if (moneySessionToken) {
    return api && moneySessionGateway
      ? <HostedMoneySessionExperience key={moneySessionToken} token={moneySessionToken} gateway={moneySessionGateway} auth={api.auth} session={session} />
      : <Unavailable />;
  }
  if (moneyOperationsRoute) {
    return api && moneyOperationsGateway
      ? <MoneyOperationsExperience gateway={moneyOperationsGateway} onLeave={clearMoneyOperationsRoute} />
      : <Unavailable />;
  }
  if (moneyRoute) {
    return api && moneyAuthorityGateway && financialPartnerGateway && settlementDestinationGateway && agreementGateway && moneySessionGateway && paymentIntentGateway && currencyCapabilityGateway && fxApplicationGateway && regulatedAccountsGateway
      ? <MoneyExperience gateways={{ moneyAuthority: moneyAuthorityGateway, financialPartners: financialPartnerGateway, settlementDestinations: settlementDestinationGateway, agreements: agreementGateway, moneySession: moneySessionGateway, paymentIntent: paymentIntentGateway, currencyCapability: currencyCapabilityGateway, fxApplication: fxApplicationGateway, regulatedAccounts: regulatedAccountsGateway }} auth={api.auth} session={session} onLeave={clearMoneyRoute} />
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
