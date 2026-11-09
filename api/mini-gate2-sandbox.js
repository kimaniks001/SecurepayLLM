/**
 * SECUREPAY MINI PHASE 3 / GATE 2 — OFFLINE SIMULATION ONLY.
 *
 * A stateless, server-verified mock order + mock agreement review machine.
 * No database; no persistent order; no authenticated buyer or seller; no
 * legally accepted Agreement; no inventory/room hold; no financial authority.
 * Vercel PREVIEW, exact development branch, and preview-only secret required.
 *
 * Not compatible with HostedMoneySession FUND and NOT a payment intent.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { getMiniSandboxFixture } from './mini-checkout-preview.js';

export const GATE2_BRANCH = 'feat/mini-phase3-gate2-sandbox-order-agreement-20261109';
export const GATE2_TTL_MS = 10 * 60 * 1000;
const STAGES = new Set(['REVIEW', 'TERMS_REVIEWED']);
const FORMAT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}
export function gate2Config(env = process.env) {
  if (env.VERCEL_ENV !== 'preview' || env.VERCEL_GIT_COMMIT_REF !== GATE2_BRANCH) return null;
  const secret = String(env.MINI_GATE2_SANDBOX_SECRET || '');
  const host = String(env.VERCEL_URL || '');
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(secret) ||
      !/^[a-z0-9-]+\.vercel\.app$/.test(host)) return null;
  return { origin: 'https://' + host, key: createHash('sha256').update(secret).digest() };
}

function sourceHash(record) {
  return createHash('sha256').update(JSON.stringify([
    record.id, record.source, record.orderVersion, record.amountMinor, record.currency,
    record.merchant, record.quantity, record.itemDescription, record.details, record.terms
  ])).digest('hex');
}

function seal(claims, config) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', config.key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(claims), 'utf8'), cipher.final()]);
  return [iv, encrypted, cipher.getAuthTag()].map(bytes => bytes.toString('base64url')).join('.');
}

export function issueGate2Sandbox(source, config, now = Date.now()) {
  const fixture = getMiniSandboxFixture(source);
  if (!fixture) return null;
  const token = seal({
    v: 3, origin: config.origin, source, orderVersion: fixture.orderVersion,
    orderHash: sourceHash(fixture),
    orderId: 'SIM-' + randomBytes(10).toString('hex').toUpperCase(),
    nonce: randomBytes(12).toString('hex'),
    stage: 'REVIEW', issuedAt: now, expiresAt: now + GATE2_TTL_MS
  }, config);
  return {session: token, expiresAt: now + GATE2_TTL_MS,
    simulationOnly: true, orderCreated: false, acceptedAgreement: false, paymentEnabled: false};
}

export function readGate2Sandbox(session, config, now = Date.now()) {
  if (typeof session !== 'string' || session.length < 100 || session.length > 1200 ||
      !FORMAT.test(session)) return null;
  try {
    const parts = session.split('.').map(x => Buffer.from(x, 'base64url'));
    if (parts.length !== 3 || parts[0].length !== 12 ||
        parts[1].length < 90 || parts[1].length > 850 || parts[2].length !== 16) return null;
    const decipher = createDecipheriv('aes-256-gcm', config.key, parts[0]);
    decipher.setAuthTag(parts[2]);
    const claims = JSON.parse(Buffer.concat([
      decipher.update(parts[1]), decipher.final()
    ]).toString('utf8'));
    if (!claims || claims.v !== 3 || claims.origin !== config.origin ||
        !STAGES.has(claims.stage) || !/^SIM-[0-9A-F]{20}$/.test(claims.orderId) ||
        !/^[0-9a-f]{24}$/.test(claims.nonce) ||
        !Number.isSafeInteger(claims.issuedAt) ||
        !Number.isSafeInteger(claims.expiresAt) ||
        claims.issuedAt > now + 30_000 || claims.expiresAt <= now ||
        claims.expiresAt !== claims.issuedAt + GATE2_TTL_MS) return null;
    const fixture = getMiniSandboxFixture(claims.source);
    if (!fixture || claims.orderVersion !== fixture.orderVersion ||
        claims.orderHash !== sourceHash(fixture)) return null;
    return {claims, fixture};
  } catch { return null; }
}

export function progressGate2Sandbox(session, config, now = Date.now()) {
  const result = readGate2Sandbox(session, config, now);
  if (!result || result.claims.stage !== 'REVIEW') return null;
  return {
    session: seal({...result.claims, stage: 'TERMS_REVIEWED'}, config),
    expiresAt: result.claims.expiresAt,
    simulationOnly: true,
    orderCreated: false, acceptedAgreement: false, paymentEnabled: false
  };
}

export function gate2Snapshot(session, config, now = Date.now()) {
  const result = readGate2Sandbox(session, config, now);
  if (!result) return null;
  const {claims, fixture} = result;
  const reviewed = claims.stage === 'TERMS_REVIEWED';
  return {
    stage: claims.stage, expiresAt: claims.expiresAt,
    simulationOnly: true, source: 'SERVER_SANDBOX_FIXTURE',
    orderCreated: false, inventoryReserved: false, accommodationHeld: false,
    buyerVerified: false, sellerVerified: false,
    paymentEnabled: false, financialAuthority: false, agreementAccepted: false,
    order: {
      sandboxId: claims.orderId, fixtureId: fixture.id, source: fixture.source,
      orderVersion: fixture.orderVersion,
      reference: fixture.reference, merchant: fixture.merchant,
      description: fixture.itemDescription, details: fixture.details,
      quantity: fixture.quantity, unit: fixture.unit,
      amountMinor: fixture.amountMinor, currency: fixture.currency,
      hostReturnPath: fixture.source === 'STORE' ?
        '/checkout-gate2-store.html' : '/checkout-gate2-shortstays.html',
      status: 'NOT_PLACED_SANDBOX_ONLY',
    },
    agreement: {
      sandboxId: 'SIM-AG-' + claims.orderId.slice(4), orderSandboxId: claims.orderId,
      version: fixture.orderVersion,
      scope: fixture.itemDescription + ' · ' + fixture.details,
      sellerObligation: fixture.source === 'SHORTSTAYS'
        ? 'Sample host would provide the stated accommodation after confirmation.'
        : 'Sample seller would prepare the listed goods after confirmation.',
      buyerObligation: 'Sample buyer would follow the reviewed quantity, price and terms.',
      terms: fixture.terms,
      reviewStatus: reviewed ? 'TERMS_REVIEWED_IN_SANDBOX' : 'AWAITING_SAMPLE_REVIEW',
      signed: false, accepted: false, legallyBinding: false,
      // This flag enables only the fictional funding *preview*, never money.
      mayExploreSimulatedRails: reviewed,
    },
  };
}

function reply(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(JSON.stringify(data));
}
export async function handleGate2Sandbox(req, res, env = process.env, now = Date.now()) {
  const config = gate2Config(env);
  if (!config) return reply(res, 503, {code: 'GATE2_SANDBOX_DISABLED'});
  const host = String(req.headers?.host || '');
  if (host !== config.origin.slice(8) ||
      (req.headers?.origin && req.headers.origin !== config.origin))
    return reply(res, 403, {code: 'ORIGIN_NOT_ALLOWED'});
  if (req.method === 'POST') {
    if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.['content-type'] || '')))
      return reply(res, 415, {code: 'JSON_REQUIRED'});
    let input = req.body;
    if (typeof input === 'string') {
      if (input.length > 1400) return reply(res, 413, {code: 'BODY_TOO_LARGE'});
      try {input = JSON.parse(input);} catch {return reply(res, 400, {code: 'BAD_JSON'});}
    }
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
        JSON.stringify(input).length > 1400) return reply(res, 400, {code: 'BAD_INPUT'});
    const keys = Object.keys(input);
    if (keys.length === 2 && hasOwn(input, 'action') &&
        hasOwn(input, 'source') && input.action === 'BEGIN') {
      const started = issueGate2Sandbox(input.source, config, now);
      return started ? reply(res, 201, started) : reply(res, 400, {code: 'INVALID_SANDBOX_SOURCE'});
    }
    if (keys.length === 3 && hasOwn(input, 'action') &&
        hasOwn(input, 'session') && hasOwn(input, 'reviewed') &&
        input.action === 'REVIEW_TERMS' && input.reviewed === true) {
      const progressed = progressGate2Sandbox(input.session, config, now);
      return progressed ? reply(res, 200, progressed) : reply(res, 409, {code: 'REVIEW_NOT_ALLOWED_OR_EXPIRED'});
    }
    return reply(res, 400, {code: 'INVALID_SANDBOX_ACTION'});
  }
  if (req.method === 'GET') {
    const query = new URL(req.url || '/', config.origin).searchParams;
    if (query.getAll('session').length !== 1 || [...query.keys()].some(k => k !== 'session'))
      return reply(res, 400, {code: 'SESSION_REQUIRED'});
    const snapshot = gate2Snapshot(query.get('session'), config, now);
    return snapshot ? reply(res, 200, snapshot) :
      reply(res, 410, {code: 'SANDBOX_SESSION_EXPIRED_OR_INVALID'});
  }
  res.setHeader('Allow', 'GET, POST');
  return reply(res, 405, {code: 'METHOD_NOT_ALLOWED'});
}
export default async function handler(req, res) {
  return handleGate2Sandbox(req, res);
}
