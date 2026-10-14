/**
 * Structural Workspace preview bridge, deliberately NOT a generic SecurePay API proxy.
 * Used only by Vercel preview hosts; every path/method/query is allow-listed.
 * Browser's Vercel preview protection cookies are NEVER forwarded upstream.
 */
const UPSTREAM = 'https://securepay.ke';
const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_RESPONSE_BYTES = 1024 * 1024;

function allowed(method, pathname, params) {
  const keys = [...params.keys()];
  const noQuery = keys.length === 0;
  if (method === 'POST') {
    if (!noQuery) return false;
    if (['/api/v1/auth/login', '/api/v1/auth/complete', '/api/v1/auth/refresh',
      '/api/v1/auth/mfa/resend'].includes(pathname)) return true;
    return /^\/api\/agent\/saved-builds\/[A-Za-z0-9_-]{8,128}\/resume$/.test(pathname);
  }
  if (method !== 'GET') return false;
  if (pathname === '/api/v1/vision-dreams' ||
      pathname === '/api/v1/community/membership/me') return noQuery;
  const paged = pathname === '/api/agent/saved-builds'
    || pathname === '/api/v1/community/circles/mine'
    || pathname === '/api/v1/community/objects';
  if (!paged || keys.some(k => !['limit','offset'].includes(k))) return false;
  if (keys.length !== new Set(keys).size) return false;
  for (const [key,value] of params) {
    if (!/^\d{1,4}$/.test(value)) return false;
    if (Number(value) > (key === 'limit' ? 50 : 1000)) return false;
  }
  return true;
}

function reject(res, status, message) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ message }));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const host = String(req.headers.host || '').toLowerCase();
  if (!/^[a-z0-9-]+\.vercel\.app$/.test(host)) return reject(res,403,'Preview deployment required');
  if (req.headers.origin && req.headers.origin !== 'https://' + host) return reject(res,403,'Invalid origin');
  if (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') return reject(res,403,'Cross-site request refused');
  const method = req.method || 'GET';
  if (!['GET','POST'].includes(method)) return reject(res,405,'Method not allowed');
  const supplied = req.query?.path;
  if (typeof supplied !== 'string' || !supplied.startsWith('/api/')) return reject(res,400,'Invalid API path');
  let upstream;
  try {
    upstream = new URL(supplied, UPSTREAM);
    if (upstream.origin !== UPSTREAM || !allowed(method,upstream.pathname,upstream.searchParams)) {
      return reject(res,403,'Workspace endpoint not allowed');
    }
  } catch { return reject(res,400,'Invalid API path'); }

  const isAuth = upstream.pathname.startsWith('/api/v1/auth/');
  const headers = { Accept:'application/json' };
  if (!isAuth) {
    const bearer = req.headers.authorization;
    if (typeof bearer !== 'string' || !/^Bearer [^\s]{10,8000}$/.test(bearer)) {
      return reject(res,401,'Sign in is required');
    }
    headers.Authorization = bearer;
  }
  let body;
  if (method === 'POST') {
    const resume = /^\/api\/agent\/saved-builds\/[A-Za-z0-9_-]{8,128}\/resume$/.test(upstream.pathname);
    if (resume) {
      if (req.body !== undefined && req.body !== '') return reject(res,400,'Resume does not accept a body');
    } else {
      if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type']||''))) {
        return reject(res,415,'JSON request required');
      }
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
      if (Buffer.byteLength(body,'utf8') > MAX_REQUEST_BYTES) return reject(res,413,'Request too large');
      headers['Content-Type'] = 'application/json';
    }
  }
  try {
    const result = await fetch(upstream, {method,headers,body,redirect:'manual',signal:AbortSignal.timeout(45000)});
    if (result.status >= 300 && result.status < 400) return reject(res,502,'Unexpected upstream redirect');
    const response = await result.text();
    if (Buffer.byteLength(response,'utf8') > MAX_RESPONSE_BYTES) return reject(res,502,'Upstream response too large');
    res.statusCode = result.status;
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.end(response);
  } catch {
    // Never log identity credentials, bearer tokens, saved-work titles or private content.
    return reject(res,502,'SecurePay service unavailable');
  }
}
