import { lazy, Suspense, useEffect, useState } from 'react';
import { AgentExperience } from './features/agent/AgentExperience';
import { RecipientExperience } from './features/recipient/RecipientExperience';
import { parseInvitationRoute } from './features/recipient/route';
import { createSecurePayApi } from './api/securepay';
import { createSessionStore, withSessionRefresh } from './api/securepay/session';
import { runtimeMode } from './config/securepay';

const session = createSessionStore();
let api: ReturnType<typeof createSecurePayApi> | undefined;
try { api = createSecurePayApi(import.meta.env.VITE_SECUREPAY_API_BASE_URL, session.getAccessToken); } catch { /* Missing configuration fails closed. */ }
const agentGateway = api ? withSessionRefresh(api.agent, ['adoptHandoff', 'reviewHandoff', 'continueHandoff'], session, api.auth) : undefined;
const agreementGateway = api ? withSessionRefresh(api.agreements, ['join', 'versions', 'version', 'confirmVersion'], session, api.auth) : undefined;

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

export default function RuntimeApp() {
  const [invitationToken, clearInvitationToken] = useInvitationToken();
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
  return api && agentGateway ? <AgentExperience gateway={agentGateway} auth={api.auth} session={session} /> : <Unavailable />;
}
function Unavailable() {
  return <main className="min-h-screen bg-cream-50 text-forest-800 flex items-center justify-center p-6">
    <div role="status" className="max-w-md text-center">
      <h1 className="font-display text-2xl">SecurePay is unavailable</h1>
      <p className="mt-3 text-sand-600">Please try again later.</p>
    </div>
  </main>;
}
