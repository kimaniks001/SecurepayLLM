/**
 * Isolated browser-preview relay for the existing KS001 conversational smoke test.
 * Nothing here changes production SecurePay, and this is NOT a generic API proxy.
 *
 * Browser -> its own Vercel deployment -> SecurePay's existing conversation API.
 * The origin from the browser is intentionally not passed to upstream: CORS
 * protects browsers, while the HTTPS server-to-server hop has its own narrow
 * endpoint allowlist and SecurePay's existing authentication/authority.
 */
const UPSTREAM = 'https://securepay.ke';
const MAX_JSON_BYTES = 64 * 1024;
const conversationPath = /^\/api\/agent\/conversations\/([A-Za-z0-9_-]{8,128})\/(turns|context|history)$/;

function permitted(method, path) {
  if (path === '/api/agent/conversations') return method === 'POST';
  const match = conversationPath.exec(path);
  if (!match) return false;
  return match[2] === 'turns' ? method === 'POST' : method === 'GET';
}

function reject(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ message }));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  // This handler is deployed with the *isolated Vercel preview*, not to the production domain.
  const host = String(req.headers.host || '').toLowerCase();
  if (!/^[a-z0-9-]+\.vercel\.app$/.test(host)) return reject(res, 403, 'Preview deployment required');
  // Do not turn this into a cross-site relay. Same-origin browser calls only.
  const origin = req.headers.origin;
  if (origin && origin !== `https://${host}`) return reject(res, 403, 'Invalid origin');
  if (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') return reject(res, 403, 'Cross-site requests are not allowed');
  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'POST') return reject(res, 405, 'Method not allowed');
  const requested = req.query?.path;
  if (typeof requested !== 'string') return reject(res, 400, 'Missing conversation path');
  let path;
  try {
    const url = new URL(requested, UPSTREAM);
    if (url.origin !== UPSTREAM || !permitted(method, url.pathname)) return reject(res, 403, 'Conversation endpoint not allowed');
    if ([...url.searchParams.keys()].some(key => key !== 'limit')) return reject(res, 400, 'Unexpected query parameter');
    if (url.searchParams.has('limit') && (!/^\d{1,3}$/.test(url.searchParams.get('limit')) || Number(url.searchParams.get('limit')) > 100)) return reject(res, 400, 'Invalid history limit');
    path = url.pathname + url.search;
  } catch {
    return reject(res, 400, 'Invalid conversation path');
  }
  const headers = { 'Accept': 'application/json' };
  for (const [client, upstream] of [['authorization','Authorization'], ['x-securepay-conversation-token','X-SecurePay-Conversation-Token']]) {
    const value = req.headers[client];
    if (typeof value === 'string' && value.length <= 8192) headers[upstream] = value;
  }
  let body;
  if (method === 'POST' && path !== '/api/agent/conversations') {
    if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type'] || ''))) return reject(res, 415, 'JSON required');
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(body, 'utf8') > MAX_JSON_BYTES) return reject(res, 413, 'Request too large');
    headers['Content-Type'] = 'application/json';
  } else if (method === 'POST' && req.body !== undefined && req.body !== '') {
    return reject(res, 400, 'Conversation creation does not accept a body');
  }
  try {
    const result = await fetch(UPSTREAM + path, { method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(55000) });
    if (result.status >= 300 && result.status < 400) return reject(res, 502, 'Unexpected upstream redirect');
    const payload = await result.text();
    if (Buffer.byteLength(payload,'utf8') > 1024 * 1024) return reject(res, 502, 'Upstream response too large');
    res.statusCode = result.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(payload);
  } catch {
    // Never log credentials, conversation tokens, message bodies or personal information.
    return reject(res, 502, 'SecurePay conversation service unavailable');
  }
}
