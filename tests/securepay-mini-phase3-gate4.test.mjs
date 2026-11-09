import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { gate2Config,issueGate2Sandbox,progressGate2Sandbox,handleGate2Sandbox } from '../api/mini-gate2-sandbox.js';
import { GATE4_BRANCH,gate3Config,startGate3Attempt,gate3AttemptStatus,
  readGate3Attempt } from '../api/mini-gate3-sandbox.js';
import { gate4HostSnapshot,handleGate4Host } from '../api/mini-gate4-return.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const env={
  VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:GATE4_BRANCH,
  VERCEL_URL:'securepay-gate4-owners.vercel.app',
  MINI_GATE2_SANDBOX_SECRET:'Q'.repeat(64),
  MINI_GATE3_SANDBOX_SECRET:'R'.repeat(64)
};
const conf=gate3Config(env),g2=gate2Config(env),origin='https://'+env.VERCEL_URL;
const at=Date.now();
function sample(source='STORE',time=at){
  const started=issueGate2Sandbox(source,g2,time);
  const advanced=progressGate2Sandbox(started.session,g2,time);
  return {checkout:started.session,reviewed:advanced.session};
}
function response(){
  return {statusCode:0,body:null,headers:{},
    setHeader(k,v){this.headers[k.toLowerCase()]=v},
    end(body){this.body=JSON.parse(body)}
  };
}
async function call(method,url,opts={}){
  const res=response();
  handleGate4Host({method,url,headers:{
    host:env.VERCEL_URL,origin,...opts.headers
  }},res,opts.env||env,opts.now??at);
  return res;
}

test('only the exact Preview branch and two encrypted server secrets enable Gate 4',()=>{
  assert.ok(g2 && conf);
  assert.equal(conf.branch,GATE4_BRANCH);
  assert.equal(conf.origin,origin);
  for(const broken of [
    {VERCEL_ENV:'production'},{VERCEL_GIT_COMMIT_REF:'main'},
    {VERCEL_GIT_COMMIT_REF:'feat/mini-phase3-gate3-sandbox-payment-status-20261109'},
    {MINI_GATE2_SANDBOX_SECRET:''},{MINI_GATE3_SANDBOX_SECRET:''},
    {VERCEL_URL:'securepay.ke'}
  ]) {
    const result=awaitNotAllowed({ ...env,...broken });
    assert.equal(result,503);
  }
});
function awaitNotAllowed(environment){
  const res=response();
  handleGate4Host({method:'GET',url:'/api/mini-gate4-return?checkout=anything',
    headers:{host:environment.VERCEL_URL,origin:'https://'+environment.VERCEL_URL}},
  res,environment,at);
  return res.statusCode;
}

test('host server matches exact Store/ShortStays mock checkout, version, amount and attempt',async()=>{
  for(const [source,amount,fixture,path] of [
    ['STORE',180000,'STORE-DEMO-01','/checkout-gate4-store.html'],
    ['SHORTSTAYS',900000,'STAY-DEMO-01','/checkout-gate4-shortstays.html']
  ]){
    const {checkout,reviewed}=sample(source);
    const noAttempt=gate4HostSnapshot(checkout,null,conf,at);
    assert.equal(noAttempt.status,'NO_SIMULATED_ATTEMPT');
    assert.equal(noAttempt.matchedAgainstOriginalOrder,false);
    const started=startGate3Attempt(reviewed,'MPESA','SUCCESS',conf,at);
    const checked=gate4HostSnapshot(checkout,started.attempt,conf,at+2600);
    assert.equal(checked.orderId,started.orderId);
    assert.equal(checked.fixtureId,fixture);
    assert.equal(checked.amountMinor,amount);
    assert.equal(checked.status,'SIMULATED_CONFIRMED');
    assert.equal(checked.hostReturnPath,path);
    assert.equal(checked.matchedAgainstOriginalOrder,true);
    assert.equal(checked.checkedOrigin,'SERVER_SIMULATION_ONLY');
    for(const attr of [
      'realPaymentVerified','providerVerified','acceptedAgreement','orderCreated',
      'bookingConfirmed','inventoryReserved','accommodationHeld','moneyMoved','mayFulfil'
    ])assert.equal(checked[attr],false,attr+' must never be true');
    assert.equal(checked.paymentReceipt,null);
    const result=await call('GET','/api/mini-gate4-return?checkout='+
      encodeURIComponent(checkout)+'&attempt='+encodeURIComponent(started.attempt),
    {now:at+2600});
    assert.equal(result.statusCode,200);
    assert.equal(result.body.status,'SIMULATED_CONFIRMED');
    assert.equal(result.headers['cache-control'],'no-store, max-age=0');
    assert.equal(result.headers['referrer-policy'],'no-referrer');
  }
});

test('cross-order or cross-source reference substitution cannot reconcile',async()=>{
  const a=sample('STORE'),b=sample('STORE'),stay=sample('SHORTSTAYS');
  const payA=startGate3Attempt(a.reviewed,'PESALINK','SUCCESS',conf,at);
  const payStay=startGate3Attempt(stay.reviewed,'CHOICE_BANK','SUCCESS',conf,at);
  assert.ok(gate4HostSnapshot(a.checkout,payA.attempt,conf,at+3000));
  assert.equal(gate4HostSnapshot(b.checkout,payA.attempt,conf,at+3000),null);
  assert.equal(gate4HostSnapshot(stay.checkout,payA.attempt,conf,at+3000),null);
  assert.equal(gate4HostSnapshot(a.checkout,payStay.attempt,conf,at+3000),null);
  const bad=await call('GET','/api/mini-gate4-return?checkout='+encodeURIComponent(b.checkout)+
    '&attempt='+encodeURIComponent(payA.attempt),{now:at+3000});
  assert.equal(bad.statusCode,409);
  assert.equal(bad.body.code,'CHECKOUT_ATTEMPT_MISMATCH_OR_EXPIRED');
});

test('unknown test result can be reconciled later by the SERVER; no retry or client confirmation',()=>{
  for(const [scenario,terminal] of [
    ['UNKNOWN_THEN_CONFIRMED','SIMULATED_CONFIRMED'],
    ['UNKNOWN_THEN_FAILED','SIMULATED_FAILED']
  ]){
    const x=sample();
    const attempt=startGate3Attempt(x.reviewed,'MPESA',scenario,conf,at);
    assert.ok(attempt);
    assert.equal(gate3AttemptStatus(attempt.attempt,conf,at+1000).status,'SIMULATED_PENDING');
    assert.equal(gate3AttemptStatus(attempt.attempt,conf,at+4500).status,'SIMULATED_UNKNOWN');
    assert.equal(gate4HostSnapshot(x.checkout,attempt.attempt,conf,at+4500).status,'SIMULATED_UNKNOWN');
    const later=gate4HostSnapshot(x.checkout,attempt.attempt,conf,at+15000);
    assert.equal(later.status,terminal);
    assert.equal(later.attemptId,gate4HostSnapshot(x.checkout,attempt.attempt,conf,at+4500).attemptId);
    assert.equal(later.moneyMoved,false);
    assert.equal(later.mayFulfil,false);
  }
  const oldBranch=gate3Config({...env,VERCEL_GIT_COMMIT_REF:
    'feat/mini-phase3-gate3-sandbox-payment-status-20261109'});
  // Gate 3 branch deliberately cannot issue Gate 4-only delayed outcomes.
  assert.equal(startGate3Attempt(sample().reviewed,'MPESA','UNKNOWN_THEN_CONFIRMED',oldBranch,at),null);
});

test('tamper, expiry, wrong secret, arbitrary query fields and write attempts fail closed',async()=>{
  const x=sample(),started=startGate3Attempt(x.reviewed,'MPESA','UNKNOWN',conf,at);
  const damaged=started.attempt.slice(0,-7)+(started.attempt.at(-7)==='a'?'b':'a')+
    started.attempt.slice(-6);
  assert.equal(gate4HostSnapshot(x.checkout,damaged,conf,at),null);
  assert.equal(gate4HostSnapshot(x.checkout,started.attempt,conf,at+600001),null);
  const other=gate3Config({...env,MINI_GATE3_SANDBOX_SECRET:'Z'.repeat(64)});
  assert.equal(readGate3Attempt(started.attempt,other,at),null);
  assert.equal((await call('GET','/api/mini-gate4-return?checkout=x&attempt=y&paid=true')).statusCode,400);
  assert.equal((await call('POST','/api/mini-gate4-return')).statusCode,405);
  assert.equal((await call('GET','/api/mini-gate4-return?checkout=x',{
    headers:{origin:'https://evil.example'}})).statusCode,403);
  assert.equal((await call('GET','/api/mini-gate4-return?checkout=x',{
    headers:{host:'evil.vercel.app'}})).statusCode,403);
});

test('Gate 4 original checkout is the only source of truth, never a browser paid flag',()=>{
  const code=read('api/mini-gate4-return.js');
  assert.match(code,/readGate2Sandbox\(checkout,config\.gate2,now\)/);
  assert.match(code,/readGate3Attempt\(attempt,config,now\)/);
  assert.match(code,/valid\.claims\.orderId!==claims\.orderId/);
  assert.match(code,/gate3AttemptStatus\(attempt,config,now\)/);
  assert.match(code,/realPaymentVerified:false/);
  assert.match(code,/mayFulfil:false/);
  assert.match(code,/paymentReceipt:null/);
  assert.doesNotMatch(code,/fundFromSelf\(|createIntent\(|PaymentInitiationService|releaseFunds\(/);
});

test('Gate 4 UI adds a separate Mini path and leaves Gate 3 and Gate 2 intact',()=>{
  const mini=read('src/mini/MiniExperience.tsx');
  assert.match(mini,/sandboxReconcile/);
  assert.match(mini,/gate4Enabled/);
  assert.match(mini,/sandboxPayment/);
  const shell=read('src/mini/MiniGate2Sandbox.tsx');
  assert.match(shell,/type:'SECUREPAY_MINI_GATE4_RETURN_V1'/);
  assert.match(shell,/type:'SECUREPAY_MINI_GATE4_ATTEMPT_REF_V1'/);
  assert.match(shell,/reconcileMode=\{gate4Enabled\}/);
  assert.match(shell,/<MiniGate3Funding/);
  const funding=read('src/mini/MiniGate3Funding.tsx');
  assert.match(funding,/onAttemptReference/);
  assert.match(funding,/reconcileMode/);
  assert.match(funding,/UNKNOWN_THEN_CONFIRMED/);
  assert.doesNotMatch(funding,/dispatch\(\{ type: 'SIMULATE_CONFIRMED'/);
  for(const [path,marker] of [
    ['checkout-gate4-store.html','data-gate4-host="STORE"'],
    ['checkout-gate4-shortstays.html','data-gate4-host="SHORTSTAYS"']
  ])assert.ok(read(path).includes(marker));
  assert.match(read('checkout-gate3-store.html'),/checkout-gate3-host\.js/);
  assert.match(read('checkout-gate2-store.html'),/checkout-gate2-host\.js/);
});

test('host event cannot claim paid: it only triggers a server-side matched status GET',()=>{
  const host=read('public/checkout-gate4-host.js');
  assert.match(host,/SECUREPAY_MINI_GATE4_ATTEMPT_REF_V1/);
  assert.match(host,/SECUREPAY_MINI_GATE4_RETURN_V1/);
  assert.match(host,/event\.origin!==window\.location\.origin/);
  assert.match(host,/event\.source!==frame\.contentWindow/);
  assert.match(host,/fetch\(url,\{/);
  assert.match(host,/matchedAgainstOriginalOrder!==Boolean\(attemptRef\)/);
  assert.match(host,/void adoptAttempt\(msg\.attempt\)/);
  assert.match(host,/realPaymentVerified!==false/);
  assert.match(host,/mayFulfil!==false/);
  assert.match(host,/paymentReceipt!==null/);
  assert.match(host,/NOT PAID/);
  assert.match(host,/sessionStorage/);
  assert.doesNotMatch(host,/msg\.result\s*===\s*'SIMULATED_CONFIRMED'/);
});

test('Gate 4 sandbox remains view-only; real API and provider status cannot be inferred',()=>{
  const host=read('public/checkout-gate4-host.js');
  const server=read('api/mini-gate4-return.js');
  for(const code of [host,server]){
    assert.doesNotMatch(code,/https:\/\/api\.securepay\.ke|\/api\/v1\/money-sessions|providerWebhook|escrowRelease/);
  }
  assert.match(read('vite.config.ts'),/gate4Store: fileURLToPath/);
  assert.match(read('vite.config.ts'),/gate4Stays: fileURLToPath/);
  assert.match(read('checkout-store-offer-preview.html'),/href="\/checkout-gate4-store.html"/);
});


test('executing both host launchers reconcile only via GET, reject forged messages and resume after refresh',async()=>{
  for(const source of ['STORE','SHORTSTAYS']){
    let now=Date.now();
    const fixture=source==='STORE'?'STORE-DEMO-01':'STAY-DEMO-01';
    const path=source==='STORE'?'/checkout-gate4-store.html':'/checkout-gate4-shortstays.html';
    const storage=new Map();
    const calls=[];
    function init(){
      const listeners={},elements={};
      for(const id of ['demo-pay','demo-popup','demo-overlay','demo-frame',
        'demo-close','demo-fallback','demo-status','demo-check-status']){
        elements[id]={
          textContent:id==='demo-pay'?'Pay with SecurePay':'Not started',
          hidden:['demo-popup','demo-overlay','demo-fallback','demo-check-status'].includes(id),
          disabled:false,dataset:{},listeners:{},
          src:id==='demo-frame'?'about:blank':undefined,
          contentWindow:id==='demo-frame'?{}:undefined,
          setAttribute(){},focus(){},
          addEventListener(type,fn){this.listeners[type]=fn}
        };
      }
      const browser={
        window:{
          location:{pathname:path,origin},
          addEventListener(name,fn){listeners[name]=fn},
          setTimeout(){return 0},
          setInterval(){return 0}
        },
        document:{
          querySelector:q=>q==='[data-gate4-host]'?
            {dataset:{gate4Host:source,checkoutFixture:fixture}}:null,
          getElementById:id=>elements[id],
          addEventListener(name,fn){listeners[name]=fn}
        },
        sessionStorage:{
          getItem:k=>storage.get(k)||null,
          setItem:(k,v)=>storage.set(k,String(v)),
          removeItem:k=>storage.delete(k)
        },
        fetch:async(url,opts)=>{
          calls.push({url,options:opts});
          if(opts.credentials!=='same-origin')return {ok:false,status:401,json:async()=>({})};
          const res=response();
          if(opts.method==='POST'){
            await handleGate2Sandbox({method:'POST',url,
              headers:{host:env.VERCEL_URL,origin,'content-type':'application/json'},
              body:JSON.parse(opts.body)},res,env,now);
          }else{
            handleGate4Host({method:'GET',url,
              headers:{host:env.VERCEL_URL,origin}},res,env,now);
          }
          return {ok:res.statusCode>=200&&res.statusCode<300,
            status:res.statusCode,json:async()=>res.body};
        }
      };
      runInNewContext(read('public/checkout-gate4-host.js'),browser);
      return {elements,listeners};
    }
    const host=init();
    host.elements['demo-pay'].listeners.click();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(host.elements['demo-popup'].hidden,false);
    assert.match(host.elements['demo-frame'].src,/sandboxReconcile=/);
    const created=calls.find(x=>x.options.method==='POST');
    assert.ok(created);
    assert.deepEqual(JSON.parse(created.options.body),{action:'BEGIN',source});
    const checkout=new URL(host.elements['demo-frame'].src,origin).searchParams.get('sandboxReconcile');
    const reviewed=progressGate2Sandbox(checkout,g2,now).session;
    const issued=startGate3Attempt(reviewed,'CHOICE_BANK','UNKNOWN_THEN_CONFIRMED',conf,now);
    assert.ok(issued);
    const frame=host.elements['demo-frame'].contentWindow;
    const message={type:'SECUREPAY_MINI_GATE4_ATTEMPT_REF_V1',sandboxGate:4,
      fixtureId:fixture,simulated:true,orderCreated:false,
      agreementAccepted:false,attempt:issued.attempt};
    host.listeners.message({origin:'https://evil.example',source:frame,data:message});
    assert.equal(calls.filter(x=>x.options.method==='GET').length,1,
      'forged origin cannot trigger additional server request');
    host.listeners.message({origin,source:{},data:message});
    assert.equal(calls.filter(x=>x.options.method==='GET').length,1,
      'wrong iframe cannot trigger another request');
    host.listeners.message({origin,source:frame,data:{...message,agreementAccepted:true}});
    assert.equal(calls.filter(x=>x.options.method==='GET').length,1,
      'false acceptance cannot trigger status');
    host.listeners.message({origin,source:frame,data:message});
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(host.elements['demo-status'].textContent,/NOT PAID/);
    now+=4500;
    host.elements['demo-check-status'].listeners.click();
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(host.elements['demo-status'].textContent,/unresolved.*NOT PAID/);
    now+=12000;
    host.elements['demo-check-status'].listeners.click();
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(host.elements['demo-status'].textContent,/Test confirmation reconciled — NOT PAID/);
    const returnMsg={type:'SECUREPAY_MINI_GATE4_RETURN_V1',sandboxGate:4,
      fixtureId:fixture,simulated:true,orderCreated:false,agreementAccepted:false,
      result:'PAID'};
    host.listeners.message({origin,source:frame,data:returnMsg});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(host.elements['demo-popup'].hidden,true);
    assert.match(host.elements['demo-status'].textContent,/NOT PAID/);
    const refreshed=init();
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(refreshed.elements['demo-status'].textContent,/NOT PAID/);
    assert.match(refreshed.elements['demo-status'].textContent,/Test confirmation reconciled/);
    assert.equal(calls.filter(x=>x.options.method==='POST').length,1,
      'page refresh must not initiate another sample order');
  }
});
