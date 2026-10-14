import { createAgentGateway } from '../../api/securepay/agent';
import { createHttpClient, type AccessTokenProvider } from '../../api/securepay/http';

const APPROVED_UPSTREAM = 'https://securepay.ke';

/**
 * Phase 7 preview-only KS001 transport. The existing trusted API contract,
 * conversation access secret, client-turn idempotency and Trade Context
 * reconciliation remain owned by SecurePay's canonical agent gateway.
 *
 * Only the few conversation endpoints used by the Work smoke test can travel
 * through the same-origin relay; no blanket rewrite of other SecurePay APIs.
 */
export function createPreviewAgentGateway(baseUrl: string, getAccessToken: AccessTokenProvider) {
  if (new URL(baseUrl).origin !== APPROVED_UPSTREAM) {
    throw new Error('Preview relay requires the approved SecurePay API origin');
  }
  const previewFetch: typeof fetch = (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== APPROVED_UPSTREAM || !/^\/api\/agent\/conversations(?:\/|$)/.test(url.pathname)) {
      return Promise.reject(new Error('Only KS001 conversation calls can use the preview relay'));
    }
    const endpoint = '/api/preview-agent?path=' + encodeURIComponent(url.pathname + url.search);
    // The browser speaks only to its own Vercel origin. The serverless relay
    // validates the request before making a server-to-server HTTPS call.
    return fetch(endpoint, init);
  };
  return createAgentGateway(createHttpClient(baseUrl, getAccessToken, previewFetch));
}
