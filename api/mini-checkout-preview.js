/**
 * SECUREPAY MINI — PHASE 2 OWNER PREVIEW ONLY.
 *
 * Server-side FICTIONAL Store order and ShortStays booking snapshot with a
 * short-lived deployment-origin-bound encrypted reference. No Money Session,
 * agreement, bank, provider, inventory, room hold, or authenticated merchant.
 *
 * This endpoint MUST NEVER be treated as a production checkout authority.
 * Real host checkout needs independently authenticated order, participant,
 * agreement/version, partner quote and provider confirmation.
 */
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export const MINI_CHECKOUT_PREVIEW_BRANCH = 'feat/mini-checkout-phase2-server-context-20261109';
/** Phase 3 owner-only offline simulation: intentionally distinct from Store API source review. */
export const MINI_CHECKOUT_PHASE3_SANDBOX_BRANCH = 'feat/mini-phase3-explicit-sandbox-lane-20261109';
export const MINI_CHECKOUT_PREVIEW_TTL_MS = 5 * 60 * 1000;

const PREVIEW_ORDERS = Object.freeze({
  STORE: Object.freeze({
    id: 'STORE-DEMO-01', fixtureOnly: true, source: 'STORE',
    title: 'Store order', merchant: 'Sample Digital Store',
    itemDescription: 'Everyday goods', details: '3 packs · collection at the shop',
    quantity: '3', unit: 'packs', amountMinor: 180000, currency: 'KES',
    orderVersion: 'fixture-store-v1',
    terms: 'Illustrative collection terms. No inventory is reserved.',
    hostReturnPath: '/checkout-demo-store.html', reference: 'DEMO-STORE-1001',
  }),
  SHORTSTAYS: Object.freeze({
    id: 'STAY-DEMO-01', fixtureOnly: true, source: 'SHORTSTAYS',
    title: 'ShortStays booking', merchant: 'Sample Stay Host',
    itemDescription: 'Cabin stay · 2 nights',
    details: '4–6 Dec 2026 · 2 guests · sample dates only; no room held',
    quantity: '2', unit: 'nights', amountMinor: 900000, currency: 'KES',
    orderVersion: 'fixture-stay-v1',
    terms: 'Illustrative booking only. Availability, cancellations and check-in are not confirmed.',
    hostReturnPath: '/checkout-demo-shortstays.html', reference: 'DEMO-STAY-2001',
  }),
});

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function miniCheckoutPreviewConfig(env = process.env) {
  if (env.VERCEL_ENV !== 'preview' ||
      ![MINI_CHECKOUT_PREVIEW_BRANCH, MINI_CHECKOUT_PHASE3_SANDBOX_BRANCH]
        .includes(env.VERCEL_GIT_COMMIT_REF)) return null;
  const secret = String(env.MINI_CHECKOUT_PREVIEW_SECRET || '');
  const host = String(env.VERCEL_URL || '');
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(secret) ||
      !/^[a-z0-9-]+\.vercel\.app$/.test(host)) return null;
  return { key: createHash('sha256').update(secret).digest(), origin: 'https://' + host };
}

export function miniCheckoutPreviewIssue(source, origin, key, now = Date.now()) {
  if (!hasOwn(PREVIEW_ORDERS, source)) throw new Error('unsupported_demo_source');
  const record = PREVIEW_ORDERS[source];
  const claims = {
    v: 2, source, version: record.orderVersion, origin,
    issuedAt: now, expiresAt: now + MINI_CHECKOUT_PREVIEW_TTL_MS,
    nonce: randomBytes(16).toString('hex'),
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(claims), 'utf8'), cipher.final()]);
  return [iv, ciphertext, cipher.getAuthTag()].map(b => b.toString('base64url')).join('.');
}

export function miniCheckoutPreviewResolve(token, origin, key, now = Date.now()) {
  if (typeof token !== 'string' || token.length < 60 || token.length > 1024 ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
  try {
    const pieces = token.split('.');
    if (pieces.length !== 3) return null;
    const [iv, cipherBytes, tag] = pieces.map(x => Buffer.from(x, 'base64url'));
    if (iv.length !== 12 || cipherBytes.length < 20 || cipherBytes.length > 650 || tag.length !== 16) return null;
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const claims = JSON.parse(Buffer.concat([decipher.update(cipherBytes), decipher.final()]).toString('utf8'));
    if (!claims || claims.v !== 2 || !hasOwn(PREVIEW_ORDERS, claims.source) ||
        claims.origin !== origin || !Number.isSafeInteger(claims.issuedAt) ||
        !Number.isSafeInteger(claims.expiresAt) ||
        claims.issuedAt > now + 30_000 ||
        claims.expiresAt <= now ||
        claims.expiresAt !== claims.issuedAt + MINI_CHECKOUT_PREVIEW_TTL_MS ||
        typeof claims.nonce !== 'string' || !/^[a-f0-9]{32}$/.test(claims.nonce)) return null;
    const order = PREVIEW_ORDERS[claims.source];
    if (order.orderVersion !== claims.version) return null; // stale source version
    // A fixture is server controlled but still NOT an Agreement, booking hold or real order.
    return { record: { ...order }, expiresAt: claims.expiresAt,
      agreementAccepted: false, reservationHeld: false, financialAuthority: false,
      source: 'SERVER_PREVIEW_FIXTURE_NOT_LIVE_ORDER' };
  } catch {
    return null;
  }
}

function json(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(JSON.stringify(body));
}

export async function handleMiniCheckoutPreview(req, res, env = process.env, now = Date.now()) {
  const config = miniCheckoutPreviewConfig(env);
  if (!config) return json(res, 503, { code: 'PREVIEW_NOT_CONFIGURED' });
  const host = String(req.headers?.host || '');
  const originHeader = req.headers?.origin;
  if (host !== config.origin.slice(8) ||
      (originHeader && originHeader !== config.origin)) {
    return json(res, 403, { code: 'HOST_NOT_ALLOWED' });
  }
  if (req.method === 'POST') {
    const type = String(req.headers?.['content-type'] || '');
    if (!/^application\/json(?:\s*;|$)/i.test(type)) return json(res, 415, { code: 'JSON_REQUIRED' });
    let payload = req.body;
    if (typeof payload === 'string') {
      if (payload.length > 128) return json(res, 413, { code: 'BODY_TOO_LARGE' });
      try { payload = JSON.parse(payload); } catch { return json(res, 400, { code: 'BAD_JSON' }); }
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
        Object.keys(payload).length !== 1 || !hasOwn(payload, 'source') ||
        !hasOwn(PREVIEW_ORDERS, payload.source)) {
      return json(res, 400, { code: 'UNKNOWN_DEMO_SOURCE' });
    }
    const token = miniCheckoutPreviewIssue(payload.source, config.origin, config.key, now);
    return json(res, 201, { session: token, expiresAt: now + MINI_CHECKOUT_PREVIEW_TTL_MS,
      simulationOnly: true });
  }
  if (req.method === 'GET') {
    const query = new URL(req.url || '/', config.origin).searchParams;
    if ([...query.keys()].some(x => x !== 'session') ||
        query.getAll('session').length !== 1) return json(res, 400, { code: 'SESSION_REQUIRED' });
    const result = miniCheckoutPreviewResolve(query.get('session'), config.origin, config.key, now);
    if (!result) return json(res, 410, { code: 'SESSION_EXPIRED_OR_INVALID' });
    return json(res, 200, { ...result, simulationOnly: true });
  }
  res.setHeader('Allow', 'GET, POST');
  return json(res, 405, { code: 'METHOD_NOT_ALLOWED' });
}

export default async function handler(req, res) {
  return handleMiniCheckoutPreview(req, res);
}
