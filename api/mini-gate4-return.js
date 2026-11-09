/**
 * PHASE 3 / GATE 4 — SIMULATED HOST RECONCILIATION, NOT REAL FUNDS.
 *
 * Host reads original Gate 2 checkout reference + optional Gate 3 attempt.
 * Both must decrypt on this PREVIEW deployment and refer to the SAME sample
 * order, immutable fixture, version and value. It returns the server's
 * fictional status; no browser-supplied "paid" value is considered.
 *
 * No StoreOrder table, partner confirmation, ledger, signed external event or
 * idempotent settlement exists. This is NOT real payment verification.
 */
import { GATE4_BRANCH, gate3Config, readGate3Attempt,
  gate3AttemptStatus } from './mini-gate3-sandbox.js';
import { readGate2Sandbox, sourceHash } from './mini-gate2-sandbox.js';

export function gate4HostSnapshot(checkout, attempt, config, now=Date.now()) {
  const host=readGate2Sandbox(checkout,config.gate2,now);
  if(!host)return null;
  const {claims,fixture}=host;
  if(attempt!==null && attempt!==undefined && attempt!=='') {
    const valid=readGate3Attempt(attempt,config,now);
    if(!valid || valid.claims.orderId!==claims.orderId ||
        valid.claims.source!==claims.source ||
        valid.claims.version!==claims.orderVersion ||
        valid.claims.fixtureHash!==claims.orderHash ||
        valid.claims.fixtureHash!==sourceHash(fixture))return null;
    const state=gate3AttemptStatus(attempt,config,now);
    if(!state || state.orderId!==claims.orderId || state.fixtureId!==fixture.id ||
        state.amountMinor!==fixture.amountMinor)return null;
    return safeSnapshot(claims,fixture,state,now);
  }
  return safeSnapshot(claims,fixture,null,now);
}
function safeSnapshot(claims,fixture,state,now) {
  return {
    source:'SERVER_MATCHED_SANDBOX_ORDER_AND_ATTEMPT',
    simulationOnly:true,
    checkedAt:now,
    orderId:claims.orderId,fixtureId:fixture.id,orderVersion:fixture.orderVersion,
    hostReturnPath:fixture.source==='STORE'?
      '/checkout-gate4-store.html':'/checkout-gate4-shortstays.html',
    reference:fixture.reference,
    merchant:fixture.merchant,
    description:fixture.itemDescription,
    amountMinor:fixture.amountMinor,currency:'KES',
    status:state?.status||'NO_SIMULATED_ATTEMPT',
    attemptId:state?.attemptId||null,
    rail:state?.rail||null,
    checkedOrigin:'SERVER_SIMULATION_ONLY',
    matchedAgainstOriginalOrder:Boolean(state),
    realPaymentVerified:false,
    providerVerified:false,acceptedAgreement:false,
    orderCreated:false,bookingConfirmed:false,
    inventoryReserved:false,accommodationHeld:false,
    moneyMoved:false,mayFulfil:false,paymentReceipt:null,
  };
}
function respond(res,status,data){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.end(JSON.stringify(data));
}
export function handleGate4Host(req,res,env=process.env,now=Date.now()){
  const config=gate3Config(env);
  if(!config||config.branch!==GATE4_BRANCH)
    return respond(res,503,{code:'GATE4_PREVIEW_DISABLED'});
  if(req.headers?.host!==config.origin.slice(8) ||
      (req.headers?.origin && req.headers.origin!==config.origin))
    return respond(res,403,{code:'ORIGIN_NOT_ALLOWED'});
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return respond(res,405,{code:'READ_ONLY'});
  }
  const params=new URL(req.url||'/',config.origin).searchParams;
  if(params.getAll('checkout').length!==1 || params.getAll('attempt').length>1 ||
      [...params.keys()].some(k=>k!=='checkout'&&k!=='attempt'))
    return respond(res,400,{code:'CHECKOUT_REFERENCE_REQUIRED'});
  const checkout=params.get('checkout');
  const attempt=params.get('attempt');
  if(typeof checkout!=='string'||checkout.length>1200 ||
      (attempt!==null&&attempt.length>1500))
    return respond(res,400,{code:'REFERENCE_TOO_LONG'});
  const match=gate4HostSnapshot(checkout,attempt,config,now);
  if(!match)return respond(res,409,{code:'CHECKOUT_ATTEMPT_MISMATCH_OR_EXPIRED'});
  return respond(res,200,match);
}
export default function handler(req,res){return handleGate4Host(req,res);}
