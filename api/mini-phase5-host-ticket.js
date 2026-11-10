/**
 * Phase 5 Gate 2: server-issued, version-bound HOST REGISTRY TICKET.
 *
 * Sandbox fixture ONLY. NOT a payment, order, Agreement, provider, booking,
 * host identity, user identity, or a production cross-origin integration.
 * Every issuer/reader request requires a precise Vercel preview origin.
 *
 * Signed read tickets are intentionally READ-ONLY and may be resolved again
 * until expiry. Stateless Vercel functions CANNOT enforce single-use redemption
 * without a durable atomic store. Never add a redeem/fund action here.
 */
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {getMiniSandboxFixture} from './mini-checkout-preview.js';

export const PHASE5_GATE2_BRANCH='feat/mini-phase5-gate2-host-registry-20261110';
export const PHASE5_TICKET_TTL_MS=5*60*1000;
export const PHASE5_HOST_REGISTRY=Object.freeze({
  STORE:Object.freeze({
    hostId:'STORE',path:'/phase5-store-host.html',returnAlias:'STORE_RETURN',
    fixtureId:'STORE-DEMO-01',enabled:true
  }),
  SHORTSTAYS:Object.freeze({
    hostId:'SHORTSTAYS',path:'/phase5-shortstays-host.html',returnAlias:'STAY_RETURN',
    fixtureId:'STAY-DEMO-01',enabled:true
  }),
  ESTATE:Object.freeze({hostId:'ESTATE',path:null,returnAlias:null,fixtureId:null,enabled:false}),
  MY_RIDE:Object.freeze({hostId:'MY_RIDE',path:null,returnAlias:null,fixtureId:null,enabled:false}),
  STORAGE:Object.freeze({hostId:'STORAGE',path:null,returnAlias:null,fixtureId:null,enabled:false})
});
const TOKEN=/^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/;
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);

export function phase5Gate2Config(env=process.env){
  if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!==PHASE5_GATE2_BRANCH)return null;
  const host=String(env.VERCEL_URL||'');
  const secret=String(env.MINI_PHASE5_HOST_PREVIEW_SECRET||'');
  if(!/^[a-z0-9-]+\.vercel\.app$/.test(host)||
     !/^[A-Za-z0-9_-]{43,128}$/.test(secret))return null;
  // Domain separation: the raw secret cannot be used for any other lane.
  const key=createHash('sha256').update('securepay.phase5.host.preview.v1\0'+secret).digest();
  return {origin:'https://'+host,key,branch:PHASE5_GATE2_BRANCH};
}
export function phase5FixtureDigest(fixture){
  return createHash('sha256').update(JSON.stringify([
    fixture.id,fixture.source,fixture.orderVersion,fixture.merchant,
    fixture.amountMinor,fixture.currency,fixture.itemDescription,
    fixture.details,fixture.quantity,fixture.unit,fixture.terms
  ])).digest('hex');
}
export function phase5HostRegistration(source){
  if(typeof source!=='string'||!has(PHASE5_HOST_REGISTRY,source))return null;
  const host=PHASE5_HOST_REGISTRY[source];
  if(!host.enabled||!host.path||!host.fixtureId)return null;
  const fixture=getMiniSandboxFixture(source);
  return fixture&&fixture.id===host.fixtureId?{host,fixture}:null;
}
function sign(part,config){
  return createHmac('sha256',config.key).update(part).digest('base64url');
}
function safeOrigin(req,config,requirePage=false){
  if(req.headers?.host!==config.origin.slice(8))return false;
  const origin=req.headers?.origin;
  if(origin!==undefined&&origin!==config.origin)return false;
  if(requirePage&&origin!==config.origin)return false;
  const site=req.headers?.['sec-fetch-site'];
  if(site!==undefined&&site!=='same-origin')return false;
  return true;
}
function validReferrer(value,config,host){
  if(typeof value!=='string'||value.length>700)return false;
  try{
    const u=new URL(value);
    return u.origin===config.origin&&u.pathname===host.path&&
      u.username===''&&u.password===''&&u.search===''&&u.hash==='';
  }catch{return false;}
}
export function phase5IssueHostTicket(source,config,now=Date.now()){
  const entry=phase5HostRegistration(source);
  if(!entry||!Number.isSafeInteger(now))return null;
  const {host,fixture}=entry;
  const payload={
    v:1,kind:'READ_ONLY_FAKE_HOST_TICKET',origin:config.origin,
    hostId:host.hostId,hostPath:host.path,returnAlias:host.returnAlias,
    fixtureId:fixture.id,version:fixture.orderVersion,
    fixtureDigest:phase5FixtureDigest(fixture),
    jti:randomBytes(16).toString('hex'),iat:now,exp:now+PHASE5_TICKET_TTL_MS
  };
  const header=Buffer.from('{"typ":"SP-P5-DEMO","alg":"HS256"}','utf8').toString('base64url');
  const body=Buffer.from(JSON.stringify(payload),'utf8').toString('base64url');
  const signed=header+'.'+body;
  return {
    ticket:signed+'.'+sign(signed,config),expiresAt:payload.exp,
    hostId:host.hostId,returnAlias:host.returnAlias,
    sourceVersion:fixture.orderVersion,
    simulationOnly:true,checkoutAuthorized:false,realPaymentEnabled:false,
    agreementAccepted:false,bookingConfirmed:false,orderCreated:false
  };
}
export function phase5ResolveHostTicket(ticket,config,now=Date.now()){
  if(typeof ticket!=='string'||ticket.length<160||ticket.length>1100||!TOKEN.test(ticket))return null;
  try{
    const parts=ticket.split('.');
    const expectedHeader=Buffer.from('{"typ":"SP-P5-DEMO","alg":"HS256"}').toString('base64url');
    if(parts[0]!==expectedHeader||parts[2].length!==43)return null;
    const expected=Buffer.from(sign(parts[0]+'.'+parts[1],config),'base64url');
    const given=Buffer.from(parts[2],'base64url');
    if(expected.length!==given.length||!timingSafeEqual(expected,given))return null;
    const p=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
    if(!p||p.v!==1||p.kind!=='READ_ONLY_FAKE_HOST_TICKET'||
      p.origin!==config.origin||!Number.isSafeInteger(p.iat)||
      !Number.isSafeInteger(p.exp)||p.iat>now+30000||
      p.exp<=now||p.exp!==p.iat+PHASE5_TICKET_TTL_MS||
      !/^[a-f0-9]{32}$/.test(p.jti))return null;
    const resolved=phase5HostRegistration(p.hostId);
    if(!resolved)return null;
    const {host,fixture}=resolved;
    if(p.hostId!==host.hostId||p.hostPath!==host.path||
      p.returnAlias!==host.returnAlias||p.fixtureId!==fixture.id||
      p.version!==fixture.orderVersion||
      p.fixtureDigest!==phase5FixtureDigest(fixture))return null;
    return {
      source:'PREVIEW_SIGNED_HOST_REGISTRY',simulationOnly:true,
      hostId:host.hostId,hostPath:host.path,returnAlias:host.returnAlias,
      fixtureId:fixture.id,sourceVersion:fixture.orderVersion,
      merchant:fixture.merchant,amountMinor:fixture.amountMinor,currency:fixture.currency,
      expiresAt:p.exp,checkoutAuthorized:false,realPaymentEnabled:false,
      agreementAccepted:false,providerVerified:false,moneyMoved:false,
      roomHeld:false,stockReserved:false,bookingConfirmed:false,orderCreated:false,
      mayFulfil:false
    };
  }catch{return null;}
}
function respond(res,code,data){
  res.statusCode=code;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Pragma','no-cache');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Access-Control-Allow-Origin',''); // NEVER credentialed cross-origin
  res.end(JSON.stringify(data));
}
export function handlePhase5HostTicket(req,res,env=process.env,now=Date.now()){
  const config=phase5Gate2Config(env);
  if(!config)return respond(res,503,{code:'PHASE5_PREVIEW_DISABLED'});
  if(!safeOrigin(req,config,req.method==='POST'))
    return respond(res,403,{code:'ORIGIN_NOT_REGISTERED'});
  if(req.method==='POST'){
    if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.['content-type']||'')))
      return respond(res,415,{code:'JSON_REQUIRED'});
    let data=req.body;
    if(typeof data==='string'){
      if(data.length>400)return respond(res,413,{code:'TOO_LARGE'});
      try{data=JSON.parse(data);}catch{return respond(res,400,{code:'BAD_JSON'});}
    }
    if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==2||
      !has(data,'action')||!has(data,'hostId')||data.action!=='ISSUE')
      return respond(res,400,{code:'INVALID_ISSUER_REQUEST'});
    const registered=phase5HostRegistration(data.hostId);
    if(!registered)return respond(res,403,{code:'HOST_NOT_REGISTERED'});
    if(!validReferrer(req.headers?.referer,config,registered.host))
      return respond(res,403,{code:'HOST_PATH_NOT_REGISTERED'});
    const issued=phase5IssueHostTicket(data.hostId,config,now);
    return issued?respond(res,201,issued):respond(res,409,{code:'HOST_UNAVAILABLE'});
  }
  if(req.method==='GET'){
    const params=new URL(req.url||'/',config.origin).searchParams;
    if(params.getAll('ticket').length!==1||[...params.keys()].some(k=>k!=='ticket'))
      return respond(res,400,{code:'TICKET_REQUIRED'});
    const resolved=phase5ResolveHostTicket(params.get('ticket'),config,now);
    return resolved?respond(res,200,resolved):respond(res,410,{code:'TICKET_INVALID_OR_EXPIRED'});
  }
  res.setHeader('Allow','GET, POST');
  return respond(res,405,{code:'READ_ONLY_ISSUE_OR_RESOLVE'});
}
export default function handler(req,res){return handlePhase5HostTicket(req,res);}
