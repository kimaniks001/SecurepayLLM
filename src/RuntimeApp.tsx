import { lazy, Suspense, useEffect, useState } from 'react';
import { AgentExperience } from './features/agent/AgentExperience';
import { ActivationExperience } from './features/activation/ActivationExperience';
import { MoneyExperience } from './features/money/MoneyExperience';
import { HostedMoneySessionExperience } from './features/money/HostedMoneySessionExperience';
import { MoneyOperationsExperience } from './features/money/MoneyOperationsExperience';
import { RecipientExperience } from './features/recipient/RecipientExperience';
import { InvitationInboxExperience } from './features/invitation-inbox/InvitationInboxExperience';
import { SecureLinkExperience } from './features/securelink/SecureLinkExperience';
import { createInvitationInboxController } from './features/invitation-inbox/controller';
import { parseInvitationRoute, parseMyInvitationRoute } from './features/recipient/route';
import { parseStoreOfferRoute } from './features/store/route';
import { createSecurePayApi } from './api/securepay';
import { createSessionStore, withSessionRefresh } from './api/securepay/session';
import { MONEY_AUTHENTICATED_METHODS } from './api/securepay/money-refresh';
import { REVIEW_AUTHENTICATED_METHODS } from './api/securepay/agreement-review/refresh';
import { AUTHENTICATED_AGREEMENT_METHODS } from './api/securepay/agreements/refresh';
import { runtimeMode } from './config/securepay';

const session = createSessionStore();
let api: ReturnType<typeof createSecurePayApi> | undefined;
try { api = createSecurePayApi(import.meta.env.VITE_SECUREPAY_API_BASE_URL, session.getAccessToken); } catch { /* Missing configuration fails closed. */ }
const agentGateway = api ? withSessionRefresh(api.agent, ['adoptHandoff', 'reviewHandoff', 'continueHandoff', 'useCurrentSource', 'agreementWorkspaceView', 'createAccessGrant', 'switchAccessGrant'], session, api.auth) : undefined;
const agreementGateway = api ? withSessionRefresh(api.agreements, AUTHENTICATED_AGREEMENT_METHODS, session, api.auth) : undefined;
const moneyGateway = api ? withSessionRefresh(api.money, MONEY_AUTHENTICATED_METHODS.money, session, api.auth) : undefined;
const storeGateway = api ? withSessionRefresh(api.store, ['myProfile', 'updateMyProfile', 'myOffers', 'createOffer', 'updateOffer', 'confirmAvailability'], session, api.auth) : undefined;
const circleGateway = api ? withSessionRefresh(api.circle, ['me'], session, api.auth) : undefined;
const communityGateway = api ? withSessionRefresh(api.community, ['create', 'feed', 'mine', 'get', 'close'], session, api.auth) : undefined;
const masterGateway = api ? withSessionRefresh(api.master, ['designateSelf', 'createRequest', 'proposeCost', 'accept', 'decline', 'submitOpinion'], session, api.auth) : undefined;
const marketNetworkGateway = api ? withSessionRefresh(api.marketNetwork, ['createRequest', 'myRequests', 'cancelRequest', 'candidates', 'selection', 'selectCandidate', 'relationship', 'openRelationship', 'relationshipLifecycle'], session, api.auth) : undefined;
const referralGateway = api ? withSessionRefresh(api.referral, ['myCode', 'redeem', 'myHistory', 'myLifetimeShare'], session, api.auth) : undefined;
const subscriptionGateway = api ? withSessionRefresh(api.subscription, ['myStatus', 'selectPlan', 'activationAgreement', 'establishActivationAgreement', 'confirmActivationAgreement', 'prepareCurrentBillingCycle', 'activationFundingStatus', 'prepareVerificationFunding', 'initiateVerificationTransfer', 'prepareReserveFunding', 'establishReviewReserve'], session, api.auth) : undefined;
const moneyAuthorityGateway = api ? withSessionRefresh(api.moneyAuthority, MONEY_AUTHENTICATED_METHODS.moneyAuthority, session, api.auth) : undefined;
const financialPartnerGateway = api ? withSessionRefresh(api.financialPartners, MONEY_AUTHENTICATED_METHODS.financialPartners, session, api.auth) : undefined;
const settlementDestinationGateway = api ? withSessionRefresh(api.settlementDestinations, MONEY_AUTHENTICATED_METHODS.settlementDestinations, session, api.auth) : undefined;
const moneySessionGateway = api ? withSessionRefresh(api.moneySession, MONEY_AUTHENTICATED_METHODS.moneySession, session, api.auth) : undefined;
const paymentIntentGateway = api ? withSessionRefresh(api.paymentIntent, MONEY_AUTHENTICATED_METHODS.paymentIntent, session, api.auth) : undefined;
const agreementReviewGateway = api ? withSessionRefresh(api.agreementReview, REVIEW_AUTHENTICATED_METHODS, session, api.auth) : undefined;
const paymentReleaseGateway = api ? withSessionRefresh(api.paymentRelease, MONEY_AUTHENTICATED_METHODS.paymentRelease, session, api.auth) : undefined;
const moneyOperationsGateway = api ? withSessionRefresh(api.moneyOperations, MONEY_AUTHENTICATED_METHODS.moneyOperations, session, api.auth) : undefined;
const currencyCapabilityGateway = api ? withSessionRefresh(api.currencyCapability, MONEY_AUTHENTICATED_METHODS.currencyCapability, session, api.auth) : undefined;
const fxApplicationGateway = api ? withSessionRefresh(api.fxApplication, MONEY_AUTHENTICATED_METHODS.fxApplication, session, api.auth) : undefined;
const regulatedAccountsGateway = api ? withSessionRefresh(api.regulatedAccounts, MONEY_AUTHENTICATED_METHODS.regulatedAccounts, session, api.auth) : undefined;
const businessCurrencyCapabilityGateway = api ? withSessionRefresh(api.businessCurrencyCapability, MONEY_AUTHENTICATED_METHODS.businessCurrencyCapability, session, api.auth) : undefined;
const businessFxApplicationGateway = api ? withSessionRefresh(api.businessFxApplication, MONEY_AUTHENTICATED_METHODS.businessFxApplication, session, api.auth) : undefined;
const projectGateway = api ? withSessionRefresh(api.projects, ['create', 'list', 'get', 'update', 'archive', 'restore', 'addAgreement', 'removeAgreement', 'agreements', 'summary', 'calendar'], session, api.auth) : undefined;
const visionBoardGateway = api ? withSessionRefresh(api.visionBoard, ['shelves', 'items', 'get', 'create', 'update', 'lock', 'unlock', 'supersede', 'generateQuotation', 'generateInvoice', 'generateReceipt'], session, api.auth) : undefined;
const settingsGateway = api ? withSessionRefresh(api.settings, ['get', 'update'], session, api.auth) : undefined;
const notificationsGateway = api ? withSessionRefresh(api.notifications, ['list', 'get', 'markRead', 'resolve', 'getPreferences', 'updatePreferences'], session, api.auth) : undefined;
const businessGateway = api ? withSessionRefresh(api.business, ['activate', 'get', 'members', 'inviteMember', 'acceptInvitation', 'removeMember'], session, api.auth) : undefined;
const authorizationGateway = api ? withSessionRefresh(api.authorization, ['authoritySummary', 'initiateRoleAssignment', 'executeRoleAssignment', 'approveProtectedAction', 'rejectProtectedAction', 'createDelegation', 'revokeDelegation'], session, api.auth) : undefined;
const developerGateway = api ? withSessionRefresh(api.developer, ['registerApplication', 'getApplication', 'integrationCheck', 'suspendApplication', 'reactivateApplication', 'revokeApplication', 'issueCredential', 'rotateCredential', 'revokeCredential', 'registerWebhook', 'rotateWebhookSecret', 'webhookDeliveries', 'replayWebhookDelivery', 'issueSecureCode', 'revokeSecureCode'], session, api.auth) : undefined;
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

/**
 * PHASE 4 NEXT SLICE (Section 7/8) — the authenticated-owner counterpart: an invitation opened from
 * Home's "Invitations for you" by id, never a raw token. See `parseMyInvitationRoute`'s own doctrine.
 */
function useMyInvitationRoute(): [string | null, () => void] {
  const [invitationId, setInvitationId] = useState(() => (typeof window === 'undefined' ? null : parseMyInvitationRoute(window.location.hash)));
  useEffect(() => {
    const onHashChange = () => setInvitationId(parseMyInvitationRoute(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const clear = () => { window.location.hash = ''; setInvitationId(null); };
  return [invitationId, clear];
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

/**
 * KS001 Upgrade Phase 4 final convergence (Section 3/4) — the Invitations surface is a first-class,
 * non-secret route (no invitation id in this URL — that only ever appears via `#/my-invitations/{id}`,
 * see `useMyInvitationRoute`), reached from Home's "View all invitations" doorway and from
 * `OPEN_INVITATIONS` notifications.
 */
function useInvitationInboxRoute(): [boolean, () => void] {
  const matches = () => typeof window !== 'undefined' && /^#\/?invitations\/?$/.test(window.location.hash);
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

const SECURE_LINK_PATH_PATTERN = /^\/(?:securelink|s|r|k|w|g)\/([^/]+)\/?$/;
const SECURE_LINK_HASH_PATTERN = /^#\/?(?:securelink|s|r|k|w|g)\/([^/]+)\/?$/;

/**
 * KS001 Upgrade Phase 5 (SecureLink & Money Continuation, Section 8) — the public SecureLink route.
 * The slug is the ONLY identifier ever in this URL (never an Agreement id) — it is exactly what the
 * server-issued `publicUrl` already carries, never reconstructed client-side.
 *
 * KS001 Upgrade Phase 5 continuation (Slice 5) — also accepted the backend's own real path-prefix
 * shape (`PublicLocatorUrlBuilder`/`PublicPathClass#pathPrefix`: `s`/`r`/`k`/`w`/`g`) as a HASH form
 * (`#/r/{slug}`), so a hand-typed or locally-shared link would still resolve.
 *
 * KS001 Upgrade Phase 5 — UR-141 closure (routing alignment): `PublicLocatorUrlBuilder` has always
 * built a CLEAN pathname URL (`{baseUrl}/{prefix}/{slug}`, no `#`) — this is the actual shape every
 * genuinely server-issued `publicUrl` carries once a production base URL is configured. This hook was
 * checking only `window.location.hash`, so a real production link (`https://securepay.ke/r/{slug}`)
 * would never have matched here at all — a genuine routing mismatch, found and closed by this pass
 * before any production deployment. The canonical pathname form is now checked FIRST (matching
 * doctrine: new server-issued links use the clean form); the legacy hash form is checked second,
 * purely for backward compatibility with old/local/shared links, and never becomes canonical. Both
 * forms converge on the exact same slug and the exact same `SecureLinkExperience`/backend digest
 * lookup below — no duplicate authority, and the path prefix itself is navigation only (Section 8 of
 * the closure mandate): the backend's own locator lookup remains the sole authority on product type,
 * regardless of which prefix a URL was typed or shared with.
 */
function useSecureLinkRoute(): [string | null, () => void] {
  const parse = () => {
    if (typeof window === 'undefined') return null;
    const pathMatch = SECURE_LINK_PATH_PATTERN.exec(window.location.pathname);
    if (pathMatch) return decodeURIComponent(pathMatch[1]);
    const hashMatch = SECURE_LINK_HASH_PATTERN.exec(window.location.hash);
    return hashMatch ? decodeURIComponent(hashMatch[1]) : null;
  };
  const [slug, setSlug] = useState(parse);
  useEffect(() => {
    const onChange = () => setSlug(parse());
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      window.removeEventListener('popstate', onChange);
    };
  }, []);
  const clear = () => {
    if (typeof window !== 'undefined') {
      window.location.hash = '';
      // A canonical pathname route leaves no hash to clear -- reset the path itself, without a
      // full reload, so leaving a clean-path SecureLink returns to the ordinary application shell.
      if (SECURE_LINK_PATH_PATTERN.test(window.location.pathname)) {
        window.history.replaceState(null, '', '/');
      }
    }
    setSlug(null);
  };
  return [slug, clear];
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
  const [myInvitationId, clearMyInvitationId] = useMyInvitationRoute();
  const [invitationInboxRoute, clearInvitationInboxRoute] = useInvitationInboxRoute();
  // KS001 Upgrade Phase 4 final convergence (Section 3/4) -- created once, matching the same
  // parent-creates-controller convention AgentExperience uses for notificationsController.
  const [invitationInboxController] = useState(() => agreementGateway && createInvitationInboxController(agreementGateway));
  const storeOfferRoute = useStoreOfferRoute();
  const [activationRoute, clearActivationRoute] = useActivationRoute();
  const [moneyRoute, clearMoneyRoute] = useMoneyRoute();
  const [moneyOperationsRoute, clearMoneyOperationsRoute] = useMoneyOperationsRoute();
  const [secureLinkSlug, clearSecureLinkSlug] = useSecureLinkRoute();
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
  if (myInvitationId) {
    // PHASE 4 NEXT SLICE (Section 7/8) — same RecipientExperience, same Join machine, entered by a
    // self-scoped invitation id from Home's "Invitations for you" instead of a raw token.
    return api && agreementGateway
      ? <RecipientExperience key={myInvitationId} invitationId={myInvitationId} gateway={agreementGateway} auth={api.auth} session={session} onLeave={clearMyInvitationId} />
      : <Unavailable />;
  }
  if (invitationInboxRoute) {
    return api && invitationInboxController
      ? <InvitationInboxExperience
          controller={invitationInboxController}
          onLeave={clearInvitationInboxRoute}
          onReview={invitationId => { window.location.hash = `#/my-invitations/${encodeURIComponent(invitationId)}`; }}
        />
      : <Unavailable />;
  }
  if (secureLinkSlug) {
    return api && agreementGateway
      ? <SecureLinkExperience key={secureLinkSlug} slug={secureLinkSlug} gateway={agreementGateway} auth={api.auth} session={session} onLeave={clearSecureLinkSlug} />
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
    return api && moneyAuthorityGateway && financialPartnerGateway && settlementDestinationGateway && agreementGateway && moneyGateway && paymentReleaseGateway && paymentIntentGateway && currencyCapabilityGateway && fxApplicationGateway && regulatedAccountsGateway && businessCurrencyCapabilityGateway && businessFxApplicationGateway
      ? <MoneyExperience gateways={{ moneyAuthority: moneyAuthorityGateway, financialPartners: financialPartnerGateway, settlementDestinations: settlementDestinationGateway, agreements: agreementGateway, money: moneyGateway, paymentRelease: paymentReleaseGateway, paymentIntent: paymentIntentGateway, currencyCapability: currencyCapabilityGateway, fxApplication: fxApplicationGateway, regulatedAccounts: regulatedAccountsGateway, businessCurrencyCapability: businessCurrencyCapabilityGateway, businessFxApplication: businessFxApplicationGateway }} auth={api.auth} session={session} onLeave={clearMoneyRoute} />
      : <Unavailable />;
  }
  return api && agentGateway && agreementGateway && moneyGateway && agreementReviewGateway && storeGateway && circleGateway && communityGateway && masterGateway && marketNetworkGateway && referralGateway && projectGateway && visionBoardGateway && settingsGateway && businessGateway && authorizationGateway && developerGateway && notificationsGateway && subscriptionGateway
    ? <AgentExperience gateway={agentGateway} agreementGateway={agreementGateway} moneyGateway={moneyGateway} agreementReviewGateway={agreementReviewGateway} storeGateway={storeGateway} circleGateway={circleGateway} communityGateway={communityGateway} masterGateway={masterGateway} marketNetworkGateway={marketNetworkGateway} referralGateway={referralGateway} projectGateway={projectGateway} visionBoardGateway={visionBoardGateway} settingsGateway={settingsGateway} businessGateway={businessGateway} authorizationGateway={authorizationGateway} developerGateway={developerGateway} notificationsGateway={notificationsGateway} subscriptionGateway={subscriptionGateway} auth={api.auth} session={session} initialStoreOfferRoute={storeOfferRoute} trustedMediaOrigin={trustedMediaOrigin} />
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
