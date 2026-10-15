/**
 * Structural Workspace preview bridge, deliberately NOT a generic SecurePay API proxy.
 * Used only by Vercel preview hosts; every path/method/query is allow-listed.
 * Browser's Vercel preview protection cookies are NEVER forwarded upstream.
 */
const UPSTREAM = 'https://securepay.ke';
const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024; // vision asset responses; bounded

function allowed(method, pathname, params) {
  const keys = [...params.keys()];
  const noQuery = keys.length === 0;
  const dream = /^\/api\/v1\/vision-dreams\/[A-Za-z0-9_-]{8,128}$/;
  const board = /^\/api\/v1\/vision-dreams\/[A-Za-z0-9_-]{8,128}\/board$/;
  const asset = /^\/api\/v1\/vision-dreams\/[A-Za-z0-9_-]{8,128}\/assets\/[A-Za-z0-9_-]{8,128}$/;
  const assets = /^\/api\/v1\/vision-dreams\/[A-Za-z0-9_-]{8,128}\/assets$/;
  const base = String.raw`^/api/v1/community/circles/[A-Za-z0-9_-]{8,128}`;
  const circleMember = new RegExp(base + '/membership$');
  const circleObjects = new RegExp(base + '/objects$');
  const circleCoordination = new RegExp(base + '/coordination-prompts$');
  const circleCoordinationMine = new RegExp(base + '/coordination-prompts/mine$');
  const circleRespond = new RegExp(base + '/coordination-prompts/[A-Za-z0-9_-]{8,128}/responses$');

  if (method === 'PATCH') return noQuery && dream.test(pathname);
  if (method === 'PUT') return noQuery && board.test(pathname);
  if (method === 'DELETE') return noQuery && asset.test(pathname);
  if (method === 'POST') {
    if (!noQuery) return false;
    if (pathname === '/api/v1/store/me/offers') return true;
    if (pathname === '/api/v1/vision-dreams' || assets.test(pathname) || circleObjects.test(pathname)
        || circleCoordination.test(pathname) || circleRespond.test(pathname)) return true;
    if (['/api/v1/auth/login', '/api/v1/auth/complete', '/api/v1/auth/refresh',
      '/api/v1/auth/mfa/resend'].includes(pathname)) return true;
    return /^\/api\/agent\/saved-builds\/[A-Za-z0-9_-]{8,128}\/resume$/.test(pathname);
  }
  if (method === 'GET' && pathname === '/api/v1/stores/search') {
    if (keys.some(key => !['kind','category','location','limit'].includes(key)) ||
        new Set(keys).size !== keys.length) return false;
    if (!['PRODUCT','SERVICE','CAPACITY'].includes(params.get('kind'))) return false;
    if (params.has('limit') && !/^(?:[1-9]|10)$/.test(params.get('limit'))) return false;
    return ['category','location'].every(key => !params.has(key) || params.get(key).length <= 120);
  }
  if (method === 'GET' && noQuery &&
      /^\/api\/v1\/stores\/[A-Za-z0-9_-]{3,60}$/.test(pathname)) return true;
  if (method === 'GET' && noQuery &&
      /^\/api\/v1\/stores\/[A-Za-z0-9_-]{3,60}\/offers\/[A-Za-z0-9_-]{8,128}$/.test(pathname)) return true;
  if (method === 'GET' && noQuery &&
      ['/api/v1/store/me/profile','/api/v1/store/me/offers'].includes(pathname)) return true;
  if (method !== 'GET') return false;
  if (noQuery && (board.test(pathname) || assets.test(pathname) || asset.test(pathname)
      || circleMember.test(pathname) || circleCoordinationMine.test(pathname))) return true;
  // These Money paths are read-only and require the caller's signed-in bearer.
  // The server still decides Agreement visibility, financial truth and partner status.
  if (noQuery && (pathname === '/api/v1/regulated-accounts/partners' ||
      /^\/api\/v1\/agreements\/[A-Za-z0-9_-]{8,128}\/money-snapshot$/.test(pathname))) return true;
  if (noQuery && (pathname === '/api/v1/vision-dreams'
      || pathname === '/api/v1/community/membership/me')) return true;
  if (noQuery && (dream.test(pathname)
      || /^\/api\/v1\/community\/circles\/[A-Za-z0-9_-]{8,128}$/.test(pathname)
      || /^\/api\/v1\/agreements\/[A-Za-z0-9_-]{8,128}\/detail$/.test(pathname))) return true;
  if (pathname === '/api/v1/me/agreements') {
    if (keys.some(k => !['page','size'].includes(k)) || keys.length !== new Set(keys).size) return false;
    for (const [key,value] of params) {
      if (!/^\d{1,4}$/.test(value) || Number(value) > (key === 'size' ? 20 : 1000)) return false;
    }
    return true;
  }
  const communityPublicList = [
    '/api/v1/community/projects', '/api/v1/community/events',
    '/api/v1/community/service-opportunities',
  ].includes(pathname);
  const paged = pathname === '/api/agent/saved-builds'
    || pathname === '/api/v1/community/circles/mine'
    || pathname === '/api/v1/community/objects'
    || circleObjects.test(pathname) || communityPublicList;
  if (!paged || keys.some(k => !['limit','offset'].includes(k)) || keys.length !== new Set(keys).size) return false;
  for (const [key,value] of params) {
    if (!/^\d{1,4}$/.test(value) || Number(value) > (key === 'limit' ? (communityPublicList ? 20 : 50) : 1000)) return false;
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
  if (!['GET','POST','PATCH','PUT','DELETE'].includes(method)) return reject(res,405,'Method not allowed');
  const supplied = req.query?.path;
  if (typeof supplied !== 'string' || !supplied.startsWith('/api/')) return reject(res,400,'Invalid API path');
  let upstream;
  try {
    upstream = new URL(supplied, UPSTREAM);
    if (upstream.origin !== UPSTREAM || !allowed(method,upstream.pathname,upstream.searchParams)) {
      return reject(res,403,'Workspace endpoint not allowed');
    }
  } catch { return reject(res,400,'Invalid API path'); }

  const publicStoreRead = method === 'GET' &&
     (upstream.pathname === '/api/v1/stores/search' ||
      /^\/api\/v1\/stores\/[A-Za-z0-9_-]{3,60}$/.test(upstream.pathname) ||
      /^\/api\/v1\/stores\/[A-Za-z0-9_-]{3,60}\/offers\/[A-Za-z0-9_-]{8,128}$/.test(upstream.pathname));
  const isAuth = upstream.pathname.startsWith('/api/v1/auth/');
  const headers = { Accept:'application/json' };
  if (!isAuth && !publicStoreRead) {
    const bearer = req.headers.authorization;
    if (typeof bearer !== 'string' || !/^Bearer [^\s]{10,8000}$/.test(bearer)) {
      return reject(res,401,'Sign in is required');
    }
    headers.Authorization = bearer;
    // Explicit Circle actions require a bounded client intent key, forwarded
    // only for approved paths. Never forward arbitrary preview request headers.
    if (method==='POST' && /^\/api\/v1\/community\/circles\//.test(upstream.pathname)) {
      const key=req.headers['idempotency-key'];
      if (typeof key!=='string' || !/^[A-Za-z0-9_-]{8,128}$/.test(key))
        return reject(res,400,'Circle idempotency key required');
      headers['Idempotency-Key']=key;
    }
  }
  let body;
  if (['POST','PATCH','PUT'].includes(method)) {
    const resume = method==='POST' && /^\/api\/agent\/saved-builds\/[A-Za-z0-9_-]{8,128}\/resume$/.test(upstream.pathname);
    if (resume) {
      if (req.body !== undefined && req.body !== '') return reject(res,400,'Resume does not accept a body');
    } else {
      if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type']||''))) {
        return reject(res,415,'JSON request required');
      }
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
      const bytes = Buffer.byteLength(body,'utf8');
      // Never generalise these limits to the whole API: board 512 KB, image up to 2.8 MB.
      const limit = upstream.pathname.endsWith('/board') ? 600*1024
         : upstream.pathname.endsWith('/assets') ? 2_800_000 : MAX_REQUEST_BYTES;
      if (bytes > limit) return reject(res,413,'Request too large');
      headers['Content-Type'] = 'application/json';
    }
  }
  try {
    // Defence in depth: the LIVE/Community discovery lists are available only
    // after a separate authoritative membership check, never from demo state.
    const isMemberList = method==='GET' && [
      '/api/v1/community/projects','/api/v1/community/events',
      '/api/v1/community/service-opportunities',
    ].includes(upstream.pathname);
    if(isMemberList) {
      const membership = await fetch(UPSTREAM+'/api/v1/community/membership/me', {
        method:'GET',headers,redirect:'manual',signal:AbortSignal.timeout(12000),
      });
      if(!membership.ok) return reject(res,membership.status===401?401:403,'Community membership could not be verified');
      const payload = await membership.json();
      if(payload?.status!=='ACTIVE') return reject(res,403,'ACTIVE Trust Project membership required');
    }
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
