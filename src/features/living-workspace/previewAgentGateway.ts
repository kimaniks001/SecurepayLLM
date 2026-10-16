import { createAgentGateway } from '../../api/securepay/agent';
import { createHttpClient, type AccessTokenProvider } from '../../api/securepay/http';

const APPROVED_UPSTREAM = 'https://securepay.ke';

/**
 * Phase 7 preview-only KS001 transport. The existing trusted API contract,
 * conversation access secret, client-turn idempotency and Trade Context
 * reconciliation remain owned by SecurePay's canonical agent gateway.
 *
 * Only the conversation endpoints use the same-origin preview relay.
 * Other endpoints retain their original browser transport; no blanket proxy rewrite.
 */
export function createPreviewAgentGateway(baseUrl: string, getAccessToken: AccessTokenProvider) {
  if (new URL(baseUrl).origin !== APPROVED_UPSTREAM) {
    throw new Error('Preview relay requires the approved SecurePay API origin');
  }
  const previewFetch: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    // Only conversations use Vercel's narrow same-origin transport. All other
    // SecurePay capabilities retain their existing gateway and browser security:
    // don't silently block Agreement, Store, auth or Money endpoints.
    if (url.origin !== APPROVED_UPSTREAM) {
      return Promise.reject(new Error('Unexpected SecurePay API origin'));
    }
    if (!/^\/api\/agent\/conversations(?:\/|$)/.test(url.pathname)) {
      return fetch(input, init);
    }
    const endpoint = '/api/preview-agent?path=' + encodeURIComponent(url.pathname + url.search);
    // The browser speaks only to its own Vercel origin. The serverless relay
    // validates the request before making a server-to-server HTTPS call.
    // Vercel preview protection may require its own same-origin session cookie.
    // This cookie is consumed by Vercel; the relay NEVER forwards cookies upstream.
    if (url.pathname.endsWith('/sources/upload')) {
      if (!(init?.body instanceof FormData)) throw new Error('Source upload requires a file');
      const file = init.body.get('file');
      const sourceKind=init.body.get('sourceKind');
      const documentTypes=['application/pdf','text/plain','text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      const validType=file instanceof File && (sourceKind==='PHOTO'
        ? ['image/jpeg','image/png'].includes(file.type)
        : sourceKind==='DOCUMENT' && documentTypes.includes(file.type));
      if (!validType || !(file instanceof File) || file.size>2_000_000 || file.size===0)
        throw new Error('Select a supported file under 2 MB');
      const bytes = new Uint8Array(await file.arrayBuffer());
      // Convert only this bounded photo into an explicit payload; no generic upload proxy.
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 8192)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      const headers = new Headers(init?.headers);
      headers.set('Content-Type','application/json');
      return fetch(endpoint, {...init,headers,body:JSON.stringify({
        sourceKind,filename:file.name,mediaType:file.type,label:String(init.body.get('label')||'').slice(0,500),
        dataBase64:btoa(binary),
      }),credentials:'same-origin'});
    }
    return fetch(endpoint, { ...init, credentials: 'same-origin' });
  };
  return createAgentGateway(createHttpClient(baseUrl, getAccessToken, previewFetch));
}
