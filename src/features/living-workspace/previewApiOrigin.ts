/**
 * Client-side origin guard for preview relay requests.
 * This does NOT grant write authority; the Vercel server-side relay independently
 * checks the staging project, explicit operator confirmation and upstream host.
 */
export function requireApprovedPreviewApiOrigin(raw: string): string {
  let url: URL;
  try { url = new URL(raw); } catch {
    throw new Error('A valid SecurePay API origin is required');
  }
  const host = url.hostname.toLowerCase();
  const isProduction = url.origin === 'https://securepay.ke';
  const isStaging = url.protocol === 'https:' && !url.port &&
    host.endsWith('.securepay.ke') &&
    /(?:^|[.-])(?:staging|sandbox|qa|test)(?:[.-]|$)/.test(host);
  if (!isProduction && !isStaging) {
    throw new Error('Unknown SecurePay API origin; preview transport is unavailable');
  }
  return url.origin;
}

/**
 * The droplet serves the UI and isolated staging API on one origin behind Nginx
 * Basic Auth. Browser Basic Auth occupies Authorization, so move only this
 * app's bearer token to a private header that the staging Nginx maps back to
 * Authorization after it has checked Basic Auth. Nginx must clear cookies and
 * the private header before proxying. Never use this transport off staging.
 */
export function createSameOriginStagingFetch(raw: string): typeof fetch | null {
  if (typeof window === 'undefined') return null;
  const origin = requireApprovedPreviewApiOrigin(raw);
  const url = new URL(origin);
  if (origin !== window.location.origin || url.hostname !== 'staging.securepay.ke') return null;
  return (input, init) => {
    const requestUrl = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (requestUrl.origin !== origin || !requestUrl.pathname.startsWith('/api/')) {
      return Promise.reject(new Error('Staging API access is limited to same-origin SecurePay endpoints'));
    }
    const headers = new Headers(init?.headers);
    const bearer = headers.get('Authorization');
    headers.delete('Authorization');
    headers.delete('X-SecurePay-Access-Token');
    if (bearer) {
      if (!/^Bearer\s+\S+$/.test(bearer)) return Promise.reject(new Error('Invalid staging access token header'));
      headers.set('X-SecurePay-Access-Token', bearer);
    }
    return fetch(requestUrl.href, {
      ...init, headers, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
    });
  };
}
