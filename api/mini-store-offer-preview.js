/**
 * Phase 3 Gate 1: READ-ONLY Store offer provenance inside a preview-only Mini.
 *
 * It reads the existing SecurePayAPI public Store offer endpoint and may issue
 * a 5-minute encrypted review capability. It does NOT create an order,
 * authenticate a buyer, reserve inventory, open a Money Session or move money.
 *
 * No new SecurePayAPI endpoint. No provider, payment or release calls.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export const STORE_OFFER_PREVIEW_BRANCH = 'feat/mini-checkout-phase3-store-offer-provenance-20261109';
/** Separate offline sandbox does not disable the read-only real-source route. */
export const STORE_OFFER_OFFLINE_SANDBOX_BRANCH = 'feat/mini-phase3-explicit-sandbox-lane-20261109';
export const STORE_OFFER_GATE3_PREVIEW_BRANCH = 'feat/mini-phase3-gate3-sandbox-payment-status-20261109';
export const STORE_OFFER_GATE4_PREVIEW_BRANCH = 'feat/mini-phase3-gate4-verified-return-20261109';
export const STORE_OFFER_PHASE3_API_CLIENT_BRANCH = 'feat/mini-phase3-real-store-authority-client-20261109';
export const STORE_OFFER_DAY11_BUY_BRANCH = 'feat/day11-mini-buy-live-store-entry-20261112';
export const STORE_OFFER_PREVIEW_TTL_MS = 5 * 60 * 1000;
const KS_NUMBER = /^KS\d{3,12}$/;
const OFFER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLOSED_STATES = new Set(['UNAVAILABLE','PAUSED','FULLY_BOOKED','RESTING']);
const OPEN_STATES = new Set(['AVAILABLE','LOW_AVAILABILITY','NEEDS_CONFIRMATION','TAKING_WORK','LIMITED']);
const KINDS = new Set(['PRODUCT','SERVICE','CAPACITY']);

export function storePreviewConfig(env = process.env) {
  if (env.VERCEL_ENV !== 'preview' ||
      ![STORE_OFFER_PREVIEW_BRANCH, STORE_OFFER_OFFLINE_SANDBOX_BRANCH, STORE_OFFER_GATE3_PREVIEW_BRANCH, STORE_OFFER_GATE4_PREVIEW_BRANCH, STORE_OFFER_PHASE3_API_CLIENT_BRANCH, STORE_OFFER_DAY11_BUY_BRANCH]
        .includes(env.VERCEL_GIT_COMMIT_REF)) return null;
  const secret = String(env.MINI_STORE_OFFER_PREVIEW_SECRET || '');
  const host = String(env.VERCEL_URL || '');
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(secret) ||
      !/^[a-z0-9-]+\.vercel\.app$/.test(host)) return null;
  try {
    const api = new URL(String(env.VITE_SECUREPAY_API_BASE_URL || ''));
    if (api.protocol !== 'https:' || api.username || api.password ||
        api.search || api.hash || api.port || api.pathname !== '/' ||
        !/(^|\.)securepay\.ke$/i.test(api.hostname)) return null;
    return { key: createHash('sha256').update(secret).digest(),
      origin: 'https://' + host, apiOrigin: api.origin };
  } catch { return null; }
}

function hasOwn(o,k) { return Object.prototype.hasOwnProperty.call(o,k); }
function validSeller(s) { return typeof s === 'string' && KS_NUMBER.test(s); }
function validOffer(s) { return typeof s === 'string' && OFFER_UUID.test(s); }
function validQty(q) { return Number.isSafeInteger(q) && q > 0 && q <= 20; }

function scalar(s,max) { return typeof s === 'string' && s.length > 0 && s.length <= max; }

export function verifyPublishedStoreOffer(raw, seller, offerId, quantity = 1) {
  if (!raw || typeof raw !== 'object' || !validSeller(seller) ||
      !validOffer(offerId) || !validQty(quantity) ||
      raw.canonicalKsNumber !== seller || raw.status !== 'ACTIVE' ||
      !scalar(raw.displayName,120) || !raw.offer || typeof raw.offer !== 'object') return null;
  const o = raw.offer;
  if (typeof o.id !== 'string' || o.id.toLowerCase() !== offerId.toLowerCase() ||
      !KINDS.has(o.kind) || !OPEN_STATES.has(o.availabilityState) ||
      CLOSED_STATES.has(o.availabilityState) || o.currency !== 'KES' ||
      !scalar(o.title,160) || (o.description !== null && typeof o.description !== 'string') ||
      (typeof o.description === 'string' && o.description.length > 1500) ||
      !scalar(o.updatedAt,60) || !Number.isFinite(Date.parse(o.updatedAt)) ||
      !Number.isSafeInteger(o.priceMinor) || o.priceMinor <= 0 ||
      (o.quantityAvailable !== null && (!Number.isSafeInteger(o.quantityAvailable) || o.quantityAvailable < quantity)) ||
      !Number.isSafeInteger(o.priceMinor * quantity)) return null;

  // Important: a published offer updatedAt is not an Agreement version.
  const fingerprintInput = [
    seller, offerId.toLowerCase(), o.updatedAt, String(o.priceMinor),
    o.currency, o.kind, o.availabilityState,
    String(o.quantityAvailable), o.title, o.description || '',
  ].join('\n');
  const fingerprint = createHash('sha256').update(fingerprintInput).digest('hex');
  return {
    fingerprint,
    record: {
      id: 'STORE-OFFER-REVIEW', source: 'STORE', reviewOnly: true,
      publishedStoreOffer: true, sellerKsNumber: seller,
      offerId: offerId.toLowerCase(), offerUpdatedAt: o.updatedAt,
      merchant: raw.displayName, title: 'Published Store offer',
      itemDescription: o.title,
      details: o.kind === 'PRODUCT' ? quantity + ' × ' + o.title :
        quantity + ' × ' + o.kind.toLowerCase() + ' · seller confirmation required',
      quantity: String(quantity), unit: o.kind === 'PRODUCT' ? 'items' : 'units',
      amountMinor: o.priceMinor * quantity, currency: 'KES',
      availabilityState: o.availabilityState,
      terms: 'Listing price only. Not a quotation or accepted Agreement. No stock or service time reserved.',
      hostReturnPath: '/checkout-store-offer-preview.html',
      reference: seller + ' · ' + offerId.toLowerCase(),
    }
  };
}

export async function fetchCurrentPublishedOffer(apiOrigin, seller, offerId, quantity, fetcher = fetch) {
  if (!validSeller(seller) || !validOffer(offerId) || !validQty(quantity)) return null;
  const url = apiOrigin + '/api/v1/stores/' + encodeURIComponent(seller) +
    '/offers/' + encodeURIComponent(offerId);
  const response = await fetcher(url, {
    method:'GET', redirect:'error', credentials:'omit', cache:'no-store',
    headers:{Accept:'application/json'}, signal:AbortSignal.timeout(5000)
  });
  if (!response.ok) return null;
  const size = Number(response.headers?.get?.('content-length') || 0);
  if (size > 32768) return null;
  const raw = await response.text();
  if (raw.length > 32768) return null;
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return null; }
  return verifyPublishedStoreOffer(parsed,seller,offerId,quantity);
}

/** Public discoverability only; every selected offer is re-read on POST and GET. */
export async function discoverStoreOffers(apiOrigin, fetcher = fetch) {
  const response=await fetcher(apiOrigin+'/api/v1/stores/search?kind=PRODUCT&limit=5',{
    method:'GET',redirect:'error',credentials:'omit',cache:'no-store',
    headers:{Accept:'application/json'},signal:AbortSignal.timeout(5000)
  });
  if(!response.ok)return [];
  const size=Number(response.headers?.get?.('content-length')||0);
  if(size>32768)return [];
  const text=await response.text();
  if(text.length>32768)return [];
  let records;
  try{records=JSON.parse(text);}catch{return [];}
  if(!Array.isArray(records))return [];
  return records.slice(0,5).flatMap(entry=>{
    const o=entry?.offer;
    if(!validSeller(entry?.canonicalKsNumber) ||
      !validOffer(o?.id) || !scalar(o?.title,160) ||
      !scalar(entry?.displayName,120) ||
      !OPEN_STATES.has(o?.availabilityState) ||
      o?.currency!=='KES' ||
      !Number.isSafeInteger(o?.priceMinor) ||
      o.priceMinor<=0)return [];
    return [{
      sellerKsNumber:entry.canonicalKsNumber,
      offerId:o.id,
      sellerName:entry.displayName,
      title:o.title,
      priceMinor:o.priceMinor,
      currency:'KES',
    }];
  });
}

export function issueOfferReview(reference, config, now = Date.now()) {
  const claims = {v:1,origin:config.origin,ks:reference.record.sellerKsNumber,
    offerId:reference.record.offerId,
    quantity:Number(reference.record.quantity),fingerprint:reference.fingerprint,
    issuedAt:now,expiresAt:now+STORE_OFFER_PREVIEW_TTL_MS,
    nonce:randomBytes(16).toString('hex')};
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm',config.key,iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(claims),'utf8'),cipher.final()]);
  return [iv,encrypted,cipher.getAuthTag()].map(b=>b.toString('base64url')).join('.');
}

export function readOfferReview(token, config, now = Date.now()) {
  if (typeof token !== 'string' || token.length < 70 || token.length > 1024 ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
  try {
    const p=token.split('.').map(x=>Buffer.from(x,'base64url'));
    if (p.length !== 3 || p[0].length !== 12 || p[1].length < 40 ||
        p[1].length > 600 || p[2].length !== 16) return null;
    const d=createDecipheriv('aes-256-gcm',config.key,p[0]);
    d.setAuthTag(p[2]);
    const c=JSON.parse(Buffer.concat([d.update(p[1]),d.final()]).toString('utf8'));
    if (c.v !== 1 || c.origin !== config.origin ||
        !validSeller(c.ks) || !validOffer(c.offerId) || !validQty(c.quantity) ||
        !/^[0-9a-f]{64}$/.test(c.fingerprint) ||
        !Number.isSafeInteger(c.issuedAt) || !Number.isSafeInteger(c.expiresAt) ||
        c.issuedAt > now + 30000 ||
        c.expiresAt <= now ||
        c.expiresAt !== c.issuedAt + STORE_OFFER_PREVIEW_TTL_MS ||
        !/^[0-9a-f]{32}$/.test(c.nonce)) return null;
    return c;
  } catch { return null; }
}

function respond(res,status,data) {
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.end(JSON.stringify(data));
}

export async function handleOfferReview(req,res,env=process.env,now=Date.now(),fetcher=fetch) {
  const conf=storePreviewConfig(env);
  if (!conf) return respond(res,503,{code:'STORE_REVIEW_NOT_CONFIGURED'});
  if (req.headers?.host !== conf.origin.slice(8) ||
      (req.headers.origin && req.headers.origin !== conf.origin))
    return respond(res,403,{code:'ORIGIN_NOT_ALLOWED'});
  if (req.method === 'POST') {
    if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.['content-type'] || '')))
      return respond(res,415,{code:'JSON_REQUIRED'});
    let payload=req.body;
    if (typeof payload === 'string') {
      if (payload.length > 250) return respond(res,413,{code:'BODY_TOO_LARGE'});
      try {payload=JSON.parse(payload);}catch {return respond(res,400,{code:'BAD_JSON'});}
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
        Object.keys(payload).length !== 3 || !hasOwn(payload,'sellerKsNumber') ||
        !hasOwn(payload,'offerId') || !hasOwn(payload,'quantity') ||
        !validSeller(payload.sellerKsNumber) || !validOffer(payload.offerId) ||
        !validQty(payload.quantity)) return respond(res,400,{code:'INVALID_OFFER_REFERENCE'});
    try {
      const found=await fetchCurrentPublishedOffer(conf.apiOrigin,payload.sellerKsNumber,
        payload.offerId,payload.quantity,fetcher);
      if (!found) return respond(res,409,{code:'OFFER_UNAVAILABLE_OR_UNVERIFIED'});
      return respond(res,201,{offerSession:issueOfferReview(found,conf,now),
        expiresAt:now+STORE_OFFER_PREVIEW_TTL_MS,
        simulationOnly:true,orderCreated:false,paymentEnabled:false});
    } catch (error) {
      // Preview operator signal only; never log seller data, tokens or secrets.
      console.warn('mini-store-offer-preview: upstream request failed', {
        errorType: error?.name || 'unknown',
        causeCode: error?.cause?.code || 'none',
      });
      return respond(res,503,{code:'STORE_API_UNAVAILABLE'});
    }
  }
  if (req.method === 'GET') {
    const q=new URL(req.url||'/',conf.origin).searchParams;
    if(q.size===1 && q.getAll('discover').length===1 && q.get('discover')==='1') {
      try {
        const choices=await discoverStoreOffers(conf.apiOrigin,fetcher);
        return respond(res,200,{offers:choices,simulationOnly:true,checkoutEnabled:false});
      } catch{return respond(res,503,{code:'STORE_API_UNAVAILABLE'});}
    }
    if (q.getAll('session').length !== 1 || [...q.keys()].some(k=>k!=='session'))
      return respond(res,400,{code:'SESSION_REQUIRED'});
    const c=readOfferReview(q.get('session'),conf,now);
    if (!c) return respond(res,410,{code:'SESSION_EXPIRED_OR_INVALID'});
    try {
      const current=await fetchCurrentPublishedOffer(conf.apiOrigin,c.ks,c.offerId,c.quantity,fetcher);
      if (!current || current.fingerprint !== c.fingerprint)
        return respond(res,409,{code:'OFFER_CHANGED_OR_UNAVAILABLE'});
      return respond(res,200,{
        record:current.record,expiresAt:c.expiresAt,
        previewSource:'SECUREPAY_PUBLIC_STORE_OFFER',
        simulationOnly:true,orderCreated:false,
        agreementAccepted:false,inventoryReserved:false,paymentEnabled:false,
      });
    } catch (error) {
      // Preview operator signal only; never log seller data, tokens or secrets.
      console.warn('mini-store-offer-preview: upstream request failed', {
        errorType: error?.name || 'unknown',
        causeCode: error?.cause?.code || 'none',
      });
      return respond(res,503,{code:'STORE_API_UNAVAILABLE'});
    }
  }
  res.setHeader('Allow','GET, POST');
  return respond(res,405,{code:'METHOD_NOT_ALLOWED'});
}

export default function handler(req,res){return handleOfferReview(req,res);}
