/**
 * Client-side origin guard for preview relay requests.
 * This does NOT grant write authority; the Vercel server-side relay independently
 * checks the staging project, explicit operator confirmation and upstream host.
 */
export function requireApprovedPreviewApiOrigin(raw: string, allowPublicStagingHost = false): string {
  let url: URL;
  try { url = new URL(raw); } catch {
    throw new Error('A valid SecurePay API origin is required');
  }
  const host = url.hostname.toLowerCase();
  const isProduction = url.origin === 'https://securepay.ke';
  const isStaging = url.protocol === 'https:' && !url.port &&
    host.endsWith('.securepay.ke') &&
    /(?:^|[.-])(?:staging|sandbox|qa|test)(?:[.-]|$)/.test(host);
  const isExplicitPublicStaging = allowPublicStagingHost && url.origin === 'https://www.securepay.ke';
  if (!isProduction && !isStaging && !isExplicitPublicStaging) {
    throw new Error('Unknown SecurePay API origin; preview transport is unavailable');
  }
  return url.origin;
}

/**
 * The protected staging host and the separately built public sandbox host use
 * same-origin API requests. Browser Basic Auth occupies Authorization on staging,
 * so move only this app's bearer token to a private header that Nginx maps back
 * after its staging password check. The public build opts in only for www and
 * uses the same isolated SANDBOX API; the ordinary production build cannot opt in.
 */
export function createSameOriginStagingFetch(raw: string, allowPublicStagingHost = false): typeof fetch | null {
  if (typeof window === 'undefined') return null;
  const origin = requireApprovedPreviewApiOrigin(raw, allowPublicStagingHost);
  const url = new URL(origin);
  const isStagingHost = url.hostname === 'staging.securepay.ke';
  const isExplicitPublicHost = allowPublicStagingHost && url.hostname === 'www.securepay.ke';
  if (origin !== window.location.origin || (!isStagingHost && !isExplicitPublicHost)) return null;
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
