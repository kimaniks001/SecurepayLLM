/**
 * Phase 3 Gate 3 — SERVER-DECIDED PAYMENT STATUS SIMULATOR, NOT MONEY.
 *
 * Isolated preview-only mock: an authenticated-encrypted Gate 2 agreement
 * REVIEW must first move to TERMS_REVIEWED; only then may this sandbox
 * start a fictional rail attempt. The SERVER derives pending/confirmed/
 * failed/unknown on each GET. The browser never manufactures a provider
 * confirmation, nor is an external provider ever contacted.
 *
 * IMPORTANT: stateless encrypted test tokens have NO database-backed
 * idempotency, one-time redemption, reconciliation or audit trail. The
 * simulator must NEVER become a production payment/Agreement authority.
 */
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { gate2Config, readGate2Sandbox, sourceHash } from './mini-gate2-sandbox.js';
import { getMiniSandboxFixture } from './mini-checkout-preview.js';

export const GATE3_BRANCH = 'feat/mini-phase3-gate3-sandbox-payment-status-20261109';
export const GATE4_BRANCH = 'feat/mini-phase3-gate4-verified-return-20261109';
export const GATE3_RAILS = Object.freeze(['CHOICE_BANK', 'MPESA', 'PESALINK']);
export const GATE3_SCENARIOS = Object.freeze(['SUCCESS', 'FAILURE', 'UNKNOWN', 'SLOW']);
/** Only Gate 4 may exercise a deliberately delayed mock reconciliation. */
export const GATE4_SCENARIOS = Object.freeze(['UNKNOWN_THEN_CONFIRMED','UNKNOWN_THEN_FAILED']);
export const GATE3_TTL_MS = 10 * 60 * 1000;
const tokenPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function gate3Config(env = process.env) {
  if (env.VERCEL_ENV !== 'preview' || ![GATE3_BRANCH,GATE4_BRANCH].includes(env.VERCEL_GIT_COMMIT_REF))
    return null;
  const secret = String(env.MINI_GATE3_SANDBOX_SECRET || '');
  const host = String(env.VERCEL_URL || '');
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(secret) ||
      !/^[a-z0-9-]+\.vercel\.app$/.test(host)) return null;
  const gate2 = gate2Config(env);
  if (!gate2 || gate2.origin !== 'https://' + host) return null;
  return { origin: 'https://' + host, branch: env.VERCEL_GIT_COMMIT_REF,
    key: createHash('sha256').update(secret).digest(), gate2 };
}
function seal(data, config) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', config.key, iv);
  const buf = Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);
  return [iv,buf,cipher.getAuthTag()].map(x=>x.toString('base64url')).join('.');
}
export function readGate3Attempt(token, config, now = Date.now()) {
  if (typeof token !== 'string' || token.length < 95 || token.length > 1500 ||
      !tokenPattern.test(token)) return null;
  try {
    const p = token.split('.').map(x=>Buffer.from(x,'base64url'));
    if (p.length !== 3 || p[0].length !== 12 || p[2].length !== 16 ||
        p[1].length < 100 || p[1].length > 1020) return null;
    const dec = createDecipheriv('aes-256-gcm',config.key,p[0]);
    dec.setAuthTag(p[2]);
    const c = JSON.parse(Buffer.concat([dec.update(p[1]),dec.final()]).toString('utf8'));
    const fixture = getMiniSandboxFixture(c.source);
    if (!fixture || c.v !== 1 || c.origin !== config.origin ||
        !GATE3_RAILS.includes(c.rail) || !(GATE3_SCENARIOS.includes(c.scenario) ||
          (config.origin && GATE4_SCENARIOS.includes(c.scenario))) ||
        !/^SIM-PAY-[A-F0-9]{24}$/.test(c.attemptId) ||
        !/^SIM-[A-F0-9]{20}$/.test(c.orderId) ||
        !/^[a-f0-9]{24}$/.test(c.nonce) ||
        c.version !== fixture.orderVersion ||
        c.fixtureHash !== sourceHash(fixture) ||
        !Number.isSafeInteger(c.initiatedAt) ||
        !Number.isSafeInteger(c.readyAt) ||
        !Number.isSafeInteger(c.expiresAt) ||
        c.readyAt < c.initiatedAt || c.readyAt > c.initiatedAt + 60000 ||
        (GATE4_SCENARIOS.includes(c.scenario)
          ? (!Number.isSafeInteger(c.reconcileAt) ||
             c.reconcileAt !== c.initiatedAt + 15000 ||
             config.branch !== GATE4_BRANCH)
          : c.reconcileAt !== null) ||
        c.initiatedAt > now + 30000 ||
        c.expiresAt > c.initiatedAt + GATE3_TTL_MS ||
        c.expiresAt <= now) return null;
    return {claims:c,fixture};
  } catch { return null; }
}
export function startGate3Attempt(reviewSession, rail, scenario, config, now = Date.now()) {
  if (!GATE3_RAILS.includes(rail) ||
      !(GATE3_SCENARIOS.includes(scenario) ||
        (config.branch===GATE4_BRANCH && GATE4_SCENARIOS.includes(scenario))) ||
      typeof reviewSession !== 'string') return null;
  const reviewed = readGate2Sandbox(reviewSession, config.gate2, now);
  if (!reviewed || reviewed.claims.stage !== 'TERMS_REVIEWED') return null;
  const {claims,fixture} = reviewed;
  const delay = scenario === 'SLOW' ? 30000 : 2500;
  const token = seal({
    v:1,origin:config.origin,
    orderId:claims.orderId,source:claims.source,
    fixtureHash:claims.orderHash,version:claims.orderVersion,
    rail,scenario,
    attemptId:'SIM-PAY-'+randomBytes(12).toString('hex').toUpperCase(),
    nonce:randomBytes(12).toString('hex'),
    initiatedAt:now,readyAt:now+delay,
    reconcileAt:GATE4_SCENARIOS.includes(scenario)?now+15000:null,
    expiresAt:Math.min(claims.expiresAt,now+GATE3_TTL_MS)
  },config);
  // Note: expiresAt must equal initiatedAt+TTL for independently signed
  // attempt tokens. The originating Gate 2 review may expire sooner; cap
  // the attempt token to the reviewed source's original deadline.
  return {attempt:token,
    attemptExpiresAt:Math.min(claims.expiresAt,now+GATE3_TTL_MS),
    orderId:claims.orderId,fixtureId:fixture.id,
    simulationOnly:true, paymentEnabled:false, paymentInitiated:false,
    realProviderEvent:false};
}

export function gate3AttemptStatus(token, config, now = Date.now()) {
  const data = readGate3Attempt(token,config,now);
  if (!data) return null;
  const {claims,fixture} = data;
  const status = now < claims.readyAt ? 'SIMULATED_PENDING' :
    claims.scenario === 'SUCCESS' ? 'SIMULATED_CONFIRMED' :
    claims.scenario === 'FAILURE' ? 'SIMULATED_FAILED' :
    claims.scenario === 'UNKNOWN' ? 'SIMULATED_UNKNOWN' :
    claims.scenario === 'UNKNOWN_THEN_CONFIRMED' ?
      (now < claims.reconcileAt ? 'SIMULATED_UNKNOWN' : 'SIMULATED_CONFIRMED') :
    claims.scenario === 'UNKNOWN_THEN_FAILED' ?
      (now < claims.reconcileAt ? 'SIMULATED_UNKNOWN' : 'SIMULATED_FAILED') :
    'SIMULATED_CONFIRMED';
  return {
    attemptId:claims.attemptId,orderId:claims.orderId,
    fixtureId:fixture.id,
    rail:claims.rail,status,
    simulatedAt:now,expiresAt:claims.expiresAt,
    amountMinor:fixture.amountMinor,currency:fixture.currency,
    source:'SIGNED_PREVIEW_PROVIDER_SIMULATOR',
    simulationOnly:true, realProviderEvent:false,
    paymentInitiated:false,paymentEnabled:false,
    agreementAccepted:false,orderCreated:false,
    inventoryReserved:false,accommodationHeld:false,financialAuthority:false,
    // This must never be used as a real payment or settlement receipt.
    paymentReference:null,
  };
}
function send(res,status,body) {
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(body));
}
export async function handleGate3Sandbox(req,res,env=process.env,now=Date.now()) {
  const conf=gate3Config(env);
  if(!conf)return send(res,503,{code:'GATE3_SANDBOX_DISABLED'});
  if(req.headers?.host!==conf.origin.slice(8) ||
      (req.headers.origin && req.headers.origin!==conf.origin))
    return send(res,403,{code:'ORIGIN_NOT_ALLOWED'});
  if(req.method==='POST'){
    if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.['content-type']||'')))
      return send(res,415,{code:'JSON_REQUIRED'});
    let input=req.body;
    if(typeof input==='string'){
      if(input.length>1800)return send(res,413,{code:'BODY_TOO_LARGE'});
      try{input=JSON.parse(input);}catch{return send(res,400,{code:'BAD_JSON'});}
    }
    if(!input || typeof input!=='object' || Array.isArray(input) ||
        Object.keys(input).length!==4 ||
        input.action!=='START_SIMULATED_ATTEMPT' ||
        typeof input.reviewSession!=='string' ||
        typeof input.rail!=='string' ||
        typeof input.scenario!=='string' ||
        JSON.stringify(input).length>1800)
      return send(res,400,{code:'INVALID_SIMULATION_REQUEST'});
    const started=startGate3Attempt(input.reviewSession,input.rail,input.scenario,conf,now);
    return started?send(res,201,started):send(res,409,{code:'REVIEW_OR_RAIL_NOT_ELIGIBLE'});
  }
  if(req.method==='GET'){
    const query=new URL(req.url||'/',conf.origin).searchParams;
    if(query.getAll('attempt').length!==1 || [...query.keys()].some(x=>x!=='attempt'))
      return send(res,400,{code:'ATTEMPT_REQUIRED'});
    const state=gate3AttemptStatus(query.get('attempt'),conf,now);
    return state?send(res,200,state):send(res,410,{code:'ATTEMPT_EXPIRED_OR_INVALID'});
  }
  res.setHeader('Allow','GET, POST');
  return send(res,405,{code:'METHOD_NOT_ALLOWED'});
}
export default function handler(req,res) {
  return handleGate3Sandbox(req,res);
}
