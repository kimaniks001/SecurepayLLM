/**
 * Isolated browser-preview relay for the existing KS001 conversational smoke test.
 * Nothing here changes production SecurePay, and this is NOT a generic API proxy.
 *
 * Browser -> its own Vercel deployment -> SecurePay's existing conversation API.
 * The origin from the browser is intentionally not passed to upstream: CORS
 * protects browsers, while the HTTPS server-to-server hop has its own narrow
 * endpoint allowlist and SecurePay's existing authentication/authority.
 */
import { PRODUCTION_ORIGIN, resolveGate3PreviewTarget } from './preview-staging-policy.js';
const MAX_JSON_BYTES = 64 * 1024;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // Bounded multipart envelope (file UI limit 2MB).
const conversationPath = /^\/api\/agent\/conversations\/([A-Za-z0-9_-]{8,128})\/(turns|context|history|agreement-formation|fair-trade-examination)$/;

function permitted(method, path) {
  if (path === '/api/agent/conversations') return method === 'POST';
  if (/^\/api\/agent\/conversations\/[A-Za-z0-9_-]{8,128}\/sources\/place$/.test(path)) return method === 'POST';
  if (/^\/api\/agent\/conversations\/[A-Za-z0-9_-]{8,128}\/identity-selections$/.test(path)) return method === 'POST';
  if (/^\/api\/agent\/conversations\/[A-Za-z0-9_-]{8,128}\/sources\/upload$/.test(path)) return method === 'POST';
  if (/^\/api\/agent\/conversations\/[A-Za-z0-9_-]{8,128}\/sources\/[A-Za-z0-9_-]{8,128}$/.test(path)) return method === 'GET';
  if (/^\/api\/agent\/conversations\/[A-Za-z0-9_-]{8,128}\/sources\/[A-Za-z0-9_-]{8,128}\/retry$/.test(path)) return method === 'POST';
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

export function createLoopbackTestHandler(upstream) {
  if (!/^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(upstream)) throw new Error('Only literal loopback test upstream is allowed');
  return (req, res) => handle(req, res, upstream);
}

export default async function handler(req, res) {
  const target = resolveGate3PreviewTarget();
  if (!target) return reject(res, 503, 'Staging API is not safely configured');
  return handle(req, res, target.origin);
}

async function handle(req, res, upstreamBase) {
  res.setHeader('Cache-Control', 'no-store');
  // This handler is deployed with the *isolated Vercel preview*, not to the production domain.
  const host = String(req.headers.host || '').toLowerCase();
  if (!/^[a-z0-9-]+\.vercel\.app$/.test(host)) return reject(res, 403, 'Preview deployment required');
  // Do not turn this into a cross-site relay. Same-origin browser calls only.
  const origin = req.headers.origin;
  if (origin && origin !== `https://${host}`) return reject(res, 403, 'Invalid origin');
  if (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') return reject(res, 403, 'Cross-site requests are not allowed');
  // Master Phase 1: authenticated preview writes must never reach production.
  // Preview GETs remain available for read-only baseline inspection.
  // An isolated staging upstream requires separate reviewed configuration.
  if (upstreamBase === PRODUCTION_ORIGIN && req.method !== 'GET') {
    return reject(res, 403, 'Preview writes disabled until isolated staging is configured');
  }
  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'POST') return reject(res, 405, 'Method not allowed');
  const requested = req.query?.path;
  if (typeof requested !== 'string') return reject(res, 400, 'Missing conversation path');
  let path;
  try {
    const url = new URL(requested, upstreamBase);
    if (url.origin !== upstreamBase || !permitted(method, url.pathname)) return reject(res, 403, 'Conversation endpoint not allowed');
    const endpoint = url.pathname.split('/').at(-1);
    const allowedQuery = endpoint === 'history' ? ['limit'] : (endpoint === 'agreement-formation' || endpoint === 'fair-trade-examination') ? ['timeZone'] : [];
    if ([...url.searchParams.keys()].some(key => !allowedQuery.includes(key))) return reject(res, 400, 'Unexpected query parameter');
    if (url.searchParams.has('limit') && (!/^\d{1,3}$/.test(url.searchParams.get('limit')) || Number(url.searchParams.get('limit')) > 100)) return reject(res, 400, 'Invalid history limit');
    if (url.searchParams.has('timeZone') && !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+){0,3}$/.test(url.searchParams.get('timeZone') || '')) return reject(res, 400, 'Invalid time zone');
        path = url.pathname + url.search;
  } catch {
    return reject(res, 400, 'Invalid conversation path');
  }
  // The Gate 3 staging window allows only draft conversations and their turns.
  // All invitations, uploads, selections and other writes remain disabled.
  if (upstreamBase !== PRODUCTION_ORIGIN && req.method !== 'GET' &&
      path !== '/api/agent/conversations' &&
      !/^\/api\/agent\/conversations\/[A-Za-z0-9_-]{8,128}\/turns$/.test(path))
    return reject(res, 403, 'Staging write outside draft certification');
  const headers = { 'Accept': 'application/json' };
  for (const [client, upstream] of [['authorization','Authorization'], ['x-securepay-conversation-token','X-SecurePay-Conversation-Token']]) {
    const value = req.headers[client];
    if (typeof value === 'string' && value.length <= 8192) headers[upstream] = value;
  }
  let body;
  if (method === 'POST' && path.endsWith('/sources/upload')) {
    if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type'] || '')))
      return reject(res, 415, 'Photo payload required');
    let input;
    try { input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch { return reject(res, 400, 'Invalid photo payload'); }
    if (!input || !['PHOTO','DOCUMENT'].includes(input.sourceKind)
        || !(input.sourceKind==='PHOTO' ? ['image/jpeg','image/png'] : ['application/pdf','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']).includes(input.mediaType)
        || typeof input.filename !== 'string' || input.filename.length > 180
        || /[\\/\x00-\x1f]/.test(input.filename)
        || typeof input.dataBase64 !== 'string' || input.dataBase64.length > MAX_PHOTO_BYTES * 1.4
        || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.dataBase64)
        || typeof input.label !== 'string' || input.label.length > 500)
      return reject(res, 400, 'Invalid photo payload');
    const bytes = Buffer.from(input.dataBase64,'base64');
    if (!bytes.length || bytes.length > 2_000_000) return reject(res, 413, 'Photo too large');
    const validJpeg = bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff;
    const validPng = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const validPdf=bytes.subarray(0,5).toString('ascii')==='%PDF-';
    const validZip=bytes.subarray(0,2).toString('ascii')==='PK';
    const validDocument=input.sourceKind==='DOCUMENT' && (input.mediaType==='application/pdf'?validPdf : input.mediaType==='text/plain'||input.mediaType==='text/csv'?true:validZip);
    if (!(input.sourceKind==='PHOTO'?(input.mediaType==='image/jpeg'?validJpeg:validPng):validDocument))
      return reject(res, 415, 'Photo format mismatch');
    const form = new FormData();
    form.append('sourceKind',input.sourceKind);
    if (input.label) form.append('label',input.label);
    form.append('file',new Blob([bytes],{type:input.mediaType}),input.filename);
    body = form;
  } else if (method === 'POST' && path.endsWith('/identity-selections')) {
    if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type'] || ''))) return reject(res, 415, 'JSON required');
    let input;
    try { input=typeof req.body==='string'?JSON.parse(req.body):req.body; } catch { return reject(res,400,'Invalid lookup'); }
    if (!input || Object.keys(input).some(key=>key!=='ksNumber') || typeof input.ksNumber!=='string' ||
      !/^KS[0-9A-Za-z-]{2,35}$/i.test(input.ksNumber)) return reject(res,400,'A valid KS Number is required');
    body=JSON.stringify({ksNumber:input.ksNumber});
    headers['Content-Type']='application/json';
  } else if (method === 'POST' && path.endsWith('/retry')) {
    if(req.body !== undefined && req.body !== '' && req.body !== null) return reject(res,400,'Retry does not accept a body');
  } else if (method === 'POST' && path !== '/api/agent/conversations') {
    if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type'] || ''))) return reject(res, 415, 'JSON required');
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(body, 'utf8') > MAX_JSON_BYTES) return reject(res, 413, 'Request too large');
    headers['Content-Type'] = 'application/json';
  } else if (method === 'POST' && req.body !== undefined && req.body !== '') {
    return reject(res, 400, 'Conversation creation does not accept a body');
  }
  try {
    const result = await fetch(upstreamBase + path, { method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(55000) });
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
