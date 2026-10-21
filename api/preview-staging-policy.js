/**
 * Gate 3 preview routing boundary.
 *
 * Existing public previews remain read-only against production. Staging writes
 * can be enabled ONLY for the explicitly designated protected staging project,
 * with an operator-confirmed, HTTPS SecurePay staging hostname. This is a
 * configuration safety rule; independent backend/database isolation must be
 * verified separately before an operator sets these variables.
 *
 * Never choose a target from the browser, a request header, or a query param.
 */
export const PRODUCTION_ORIGIN = 'https://securepay.ke';
export const GATE3_VERCEL_PROJECT_ID = 'prj_bnd17Uacp36N38RuE12wluwtHLlV';
export const GATE3_CONFIRMATION = 'I_CONFIRM_ISOLATED_SYNTHETIC_STAGING';

export function approvedSecurePayStagingOrigin(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  let uri;
  try { uri = new URL(value); } catch { return null; }
  const host = uri.hostname.toLowerCase();
  if (uri.protocol !== 'https:' || uri.username || uri.password || uri.port ||
      uri.pathname !== '/' || uri.search || uri.hash ||
      host === 'securepay.ke' || host === 'www.securepay.ke' ||
      !host.endsWith('.securepay.ke') ||
      !/(?:^|[.-])(?:staging|sandbox|qa|test)(?:[.-]|$)/.test(host)) return null;
  return uri.origin;
}

export function resolveGate3PreviewTarget(env = process.env) {
  const configured = ['SECUREPAY_STAGING_API_ORIGIN','SECUREPAY_STAGING_TEST_ONLY']
    .some(k => env[k] !== undefined && String(env[k]).length > 0);
  // Old previews must never become writable simply because this file deploys.
  if (!configured) return { origin: PRODUCTION_ORIGIN, writesEnabled: false };
  const origin = approvedSecurePayStagingOrigin(env.SECUREPAY_STAGING_API_ORIGIN);
  if (!origin ||
      env.VERCEL_PROJECT_ID !== GATE3_VERCEL_PROJECT_ID ||
      env.SECUREPAY_STAGING_TEST_ONLY !== GATE3_CONFIRMATION)
    return null; // invalid/mis-scoped staging config: FAIL CLOSED, not to production
  return { origin, writesEnabled: true };
}

/** Gate 3 certifies sign-in + draft conversation only, never social, store or Money writes. */
export function isGate3WorkspaceWriteAllowed(method, path) {
  if (method !== 'POST') return false;
  return [
    '/api/v1/auth/login',
    '/api/v1/auth/complete',
    '/api/v1/auth/refresh',
    '/api/v1/auth/mfa/resend',
  ].includes(path) ||
    /^\/api\/agent\/saved-builds\/[A-Za-z0-9_-]{8,128}\/resume$/.test(path);
}
