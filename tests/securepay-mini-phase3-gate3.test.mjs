import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import {gate2Config,issueGate2Sandbox,progressGate2Sandbox,handleGate2Sandbox} from '../api/mini-gate2-sandbox.js';
import {
  GATE3_BRANCH,GATE3_TTL_MS,gate3Config,readGate3Attempt,
  startGate3Attempt,gate3AttemptStatus,handleGate3Sandbox
} from '../api/mini-gate3-sandbox.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const env={
  VERCEL_ENV:'preview',
  VERCEL_GIT_COMMIT_REF:GATE3_BRANCH,
  VERCEL_URL:'securepay-gate3-owner.vercel.app',
  MINI_GATE2_SANDBOX_SECRET:'Q'.repeat(64),
  MINI_GATE3_SANDBOX_SECRET:'R'.repeat(64)
};
const conf=gate3Config(env),g2=gate2Config(env),origin='https://'+env.VERCEL_URL;
const t=Date.now();
function sample(source='STORE'){
  const original=issueGate2Sandbox(source,g2,t);
  return {unreviewed:original.session,reviewed:progressGate2Sandbox(original.session,g2,t).session};
}
function response(){
  return {statusCode:0,body:null,headers:{},
    setHeader(k,v){this.headers[k.toLowerCase()]=v;},
    end(raw){this.body=JSON.parse(raw);}};
}
async function call(method,body,url='/api/mini-gate3-sandbox',opts={}){
  const r=response();
  await handleGate3Sandbox({method,url,
    headers:{host:env.VERCEL_URL,origin,'content-type':'application/json',...opts.headers},
    body},r,opts.env||env,opts.now??t);
  return r;
}
test('exact Gate 3 preview and independently signed Gate 2 review prerequisite',()=>{
  assert.equal(conf.origin,origin);
  assert.equal(conf.key.length,32);
  assert.equal(conf.gate2.key.length,32);
  for(const override of [
    {VERCEL_ENV:'production'},{VERCEL_ENV:'development'},
    {VERCEL_GIT_COMMIT_REF:'main'},{VERCEL_GIT_COMMIT_REF:'feat/mini-phase3-gate2-sandbox-order-agreement-20261109'},
    {MINI_GATE3_SANDBOX_SECRET:''},{MINI_GATE2_SANDBOX_SECRET:''},
    {VERCEL_URL:'securepay.ke'}
  ])assert.equal(gate3Config({...env,...override}),null);
});

test('never start fictional rail without a reviewed sample agreement',async()=>{
  const {unreviewed,reviewed}=sample();
  assert.equal(startGate3Attempt(unreviewed,'MPESA','SUCCESS',conf,t),null);
  assert.equal(startGate3Attempt(reviewed,'MPESA','INVALID',conf,t),null);
  assert.equal(startGate3Attempt(reviewed,'CASH','SUCCESS',conf,t),null);
  assert.equal(startGate3Attempt('fake','MPESA','SUCCESS',conf,t),null);
  const bad=await call('POST',{action:'START_SIMULATED_ATTEMPT',reviewSession:unreviewed,
    rail:'MPESA',scenario:'SUCCESS'});
  assert.equal(bad.statusCode,409);
  const valid=await call('POST',{action:'START_SIMULATED_ATTEMPT',reviewSession:reviewed,
    rail:'MPESA',scenario:'SUCCESS'});
  assert.equal(valid.statusCode,201);
  assert.equal(valid.body.paymentEnabled,false);
  assert.equal(valid.body.paymentInitiated,false);
  assert.equal(valid.body.realProviderEvent,false);
  assert.ok(valid.body.attemptExpiresAt>t);
  assert.doesNotMatch(valid.body.attempt,/MPESA|STORE-DEMO|SIM-PAY/);
});

test('server derives pending then fictional confirmation from immutable signed attempt, not client timer',()=>{
  const {reviewed}=sample('STORE');
  const started=startGate3Attempt(reviewed,'CHOICE_BANK','SUCCESS',conf,t);
  assert.ok(started);
  const early=gate3AttemptStatus(started.attempt,conf,t);
  const done=gate3AttemptStatus(started.attempt,conf,t+2500);
  assert.equal(early.status,'SIMULATED_PENDING');
  assert.equal(done.status,'SIMULATED_CONFIRMED');
  assert.equal(early.orderId,done.orderId);
  assert.equal(early.attemptId,done.attemptId);
  assert.equal(done.amountMinor,180000);
  assert.equal(done.currency,'KES');
  assert.equal(done.rail,'CHOICE_BANK');
  for(const k of ['realProviderEvent','paymentInitiated','paymentEnabled','agreementAccepted',
    'orderCreated','inventoryReserved','accommodationHeld','financialAuthority'])
    assert.equal(done[k],false,'never claims '+k);
  assert.equal(done.paymentReference,null);
  assert.equal(done.source,'SIGNED_PREVIEW_PROVIDER_SIMULATOR');
});

test('server handles failed, unknown, delayed statuses separately; unknown has no automatic retry',()=>{
  const {reviewed}=sample('SHORTSTAYS');
  const cases=[
    ['FAILURE','SIMULATED_FAILED',2500],
    ['UNKNOWN','SIMULATED_UNKNOWN',2500],
    ['SLOW','SIMULATED_PENDING',3000],
    ['SLOW','SIMULATED_CONFIRMED',30000]
  ];
  for(const [scenario,expected,offset] of cases){
    const issued=startGate3Attempt(reviewed,'PESALINK',scenario,conf,t);
    const result=gate3AttemptStatus(issued.attempt,conf,t+offset);
    assert.equal(result.status,expected);
    assert.equal(result.amountMinor,900000);
    assert.equal(result.fixtureId,'STAY-DEMO-01');
  }
  const unknown=startGate3Attempt(reviewed,'MPESA','UNKNOWN',conf,t);
  assert.equal(gate3AttemptStatus(unknown.attempt,conf,t+GATE3_TTL_MS-100).status,
    'SIMULATED_UNKNOWN','unknown never silently becomes confirmed');
});

test('tamper, expiry, wrong secret, cross-origin and changed fixture fail closed',async()=>{
  const issued=startGate3Attempt(sample().reviewed,'MPESA','SUCCESS',conf,t);
  assert.ok(readGate3Attempt(issued.attempt,conf,t));
  assert.equal(readGate3Attempt(issued.attempt,conf,t+GATE3_TTL_MS),null);
  const modified=issued.attempt.slice(0,-9)+
    (issued.attempt.at(-9)==='A'?'B':'A')+issued.attempt.slice(-8);
  assert.equal(readGate3Attempt(modified,conf,t),null);
  assert.equal(readGate3Attempt(issued.attempt,{...conf,origin:'https://other.vercel.app'},t),null);
  assert.equal(readGate3Attempt(issued.attempt,
    gate3Config({...env,MINI_GATE3_SANDBOX_SECRET:'Z'.repeat(64)}),t),null);
  assert.equal(gate3AttemptStatus('FAKE',conf,t),null);
  assert.equal((await call('GET',undefined,'/api/mini-gate3-sandbox?attempt='+issued.attempt,
    {now:t+GATE3_TTL_MS})).statusCode,410);
});

test('the endpoint refuses forged amount, arbitrary banking instructions and wrong origins',async()=>{
  const {reviewed}=sample();
  const payload={action:'START_SIMULATED_ATTEMPT',reviewSession:reviewed,
    rail:'MPESA',scenario:'SUCCESS'};
  for(const extra of [
    {amountMinor:1},{funded:true},{paymentReference:'REAL'},
    {beneficiary:'KS999'},{action:'FUND'},{action:'RELEASE'},{rail:'MPESA_STK_REAL'}
  ]) {
    const result=await call('POST',{...payload,...extra});
    assert.ok(result.statusCode>=400);
  }
  assert.equal((await call('POST',payload,undefined,{
    headers:{origin:'https://attacker.example'}})).statusCode,403);
  assert.equal((await call('POST',payload,undefined,{
    headers:{host:'attacker.vercel.app'}})).statusCode,403);
  assert.equal((await call('POST',payload,undefined,{
    env:{...env,VERCEL_ENV:'production'}})).statusCode,503);
  assert.equal((await call('POST',payload,undefined,{
    headers:{'content-type':'text/plain'}})).statusCode,415);
  assert.equal((await call('GET',undefined,'/api/mini-gate3-sandbox?attempt=foo&paid=1')).statusCode,400);
  assert.equal((await call('DELETE')).statusCode,405);
});

test('client parser cannot promote simulated states into real provider events or payment receipts',()=>{
  const js=ts.transpileModule(read('src/mini/gate3SandboxClient.ts'),{
    compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}
  }).outputText;
  const exports={};
  runInNewContext(js,{exports,Date,Object,Number,String});
  const issued=startGate3Attempt(sample().reviewed,'MPESA','SUCCESS',conf,t);
  const result=gate3AttemptStatus(issued.attempt,conf,t);
  const expected={orderId:result.orderId,fixtureId:result.fixtureId,amountMinor:result.amountMinor};
  assert.ok(exports.parseGate3Result({...result,expiresAt:Date.now()+200000},expected));
  for(const extra of [
    {realProviderEvent:true},{paymentInitiated:true},{paymentEnabled:true},
    {agreementAccepted:true},{orderCreated:true},{inventoryReserved:true},
    {accommodationHeld:true},{financialAuthority:true},
    {paymentReference:'12345'},{amountMinor:1},
    {source:'PROVIDER_CONFIRMED'},{status:'PAID'},{rail:'CASH'},
    {orderId:'SIM-FAKE'},{expiresAt:1}
  ])assert.equal(exports.parseGate3Result(
    {...result,expiresAt:Date.now()+200000,...extra},expected),null);
});

test('Gate 3 host launcher preserves one Mini, safely handles progress and return, never marks paid',()=>{
  const host=read('public/checkout-gate3-host.js');
  const ui=read('src/mini/MiniGate2Sandbox.tsx');
  const funding=read('src/mini/MiniGate3Funding.tsx');
  assert.match(host,/sandboxPayment=/);
  assert.match(host,/data-gate3-host/);
  assert.match(host,/SECUREPAY_MINI_SANDBOX_PROGRESS_V1/);
  assert.match(host,/event\.source!==frame\.contentWindow/);
  assert.match(host,/event\.origin!==window\.location\.origin/);
  assert.match(host,/orderCreated===false/);
  assert.match(host,/agreementAccepted===false/);
  assert.match(host,/NOT PAID/);
  assert.doesNotMatch(host,/Paid successfully|Booking confirmed|CONFIRMED_PAYMENT/);
  assert.match(ui,/gate3Enabled \? <MiniGate3Funding/);
  assert.match(ui,/gate3Enabled\?3:2/);
  assert.match(ui,/spm-gate3-reviewed-/);
  assert.match(funding,/getGate3Simulation\(token,expected,signal\)/);
  assert.match(funding,/window\.setInterval\(/);
  assert.doesNotMatch(funding,/dispatch\(\{ type: 'SIMULATE_CONFIRMED' \}\)/);
  assert.match(funding,/unknown\?\x27Status unknown — do not retry\x27/);
  assert.match(funding,/Check original attempt/);
  assert.match(funding,/\(!attempt \|\| failed \|\| terminal===\x27expired\x27\)/);
  assert.match(funding,/<MiniFundingPreview|spm-demo-rails/);
  assert.match(ui,/MiniGuestChat/);
});

test('two Gate 3 hosts and original Gate 2 hosts are separate, no production payment APIs changed',()=>{
  for(const [file,source] of [
    ['checkout-gate3-store.html','STORE'],
    ['checkout-gate3-shortstays.html','SHORTSTAYS']
  ]){
    const html=read(file);
    assert.match(html,new RegExp('data-gate3-host="'+source+'"'));
    assert.match(html,/src="\/checkout-gate3-host.js"/);
  }
  assert.match(read('checkout-gate2-store.html'),/src="\/checkout-gate2-host.js"/);
  assert.match(read('checkout-gate2-shortstays.html'),/src="\/checkout-gate2-host.js"/);
  assert.match(read('checkout-store-offer-preview.html'),/href="\/checkout-gate3-store.html"/);
  assert.match(read('checkout-store-offer-preview.html'),/href="\/checkout-gate3-shortstays.html"/);
  assert.match(read('vite.config.ts'),/gate3Store: fileURLToPath/);
  assert.match(read('vite.config.ts'),/gate3Stays: fileURLToPath/);
  const code=read('api/mini-gate3-sandbox.js');
  assert.doesNotMatch(code,/PaymentInitiationService|fundFromSelf\(|createIntent\(|releaseFunds\(|fetch\(/);
  assert.match(code,/NO database-backed/);
});


test('executing Gate 3 launcher preserves one Mini and treats all progress as untrusted NOT PAID',async()=>{
  for(const [source,fixtureId,path] of [
    ['STORE','STORE-DEMO-01','/checkout-gate3-store.html'],
    ['SHORTSTAYS','STAY-DEMO-01','/checkout-gate3-shortstays.html']
  ]) {
    const listeners={};
    const elements={};
    for(const id of ['demo-pay','demo-popup','demo-overlay','demo-frame',
      'demo-close','demo-fallback','demo-status']){
      elements[id]={
        hidden:['demo-popup','demo-overlay','demo-fallback'].includes(id),
        textContent:id==='demo-pay'?'Pay with SecurePay':'Payment not started',
        dataset:{},listeners:{},disabled:false,
        src:id==='demo-frame'?'about:blank':undefined,
        contentWindow:id==='demo-frame'?{}:undefined,
        addEventListener(event,handler){this.listeners[event]=handler;},
        setAttribute(){},focus(){}
      };
    }
    const calls=[];
    const browser={
      window:{location:{pathname:path,origin},addEventListener(k,fn){listeners[k]=fn},
        setTimeout(){return 0}},
      document:{querySelector:sel=>sel==='[data-gate3-host]'?
        {dataset:{gate3Host:source,checkoutFixture:fixtureId}}:null,
        getElementById:id=>elements[id],
        addEventListener(k,fn){listeners[k]=fn}},
      fetch:async(url,options)=>{
        calls.push({url,options});
        if(options.credentials!=='same-origin')return {ok:false,status:401};
        const res=response();
        await handleGate2Sandbox({
          method:'POST',url,
          headers:{host:env.VERCEL_URL,origin,'content-type':'application/json'},
          body:JSON.parse(options.body)
        },res,env,Date.now());
        return {ok:res.statusCode>=200&&res.statusCode<300,
          status:res.statusCode,json:async()=>res.body};
      }
    };
    runInNewContext(read('public/checkout-gate3-host.js'),browser);
    elements['demo-pay'].listeners.click();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(calls.length,1);
    assert.deepEqual(JSON.parse(calls[0].options.body),{action:'BEGIN',source});
    assert.match(elements['demo-frame'].src,/^\/mini\.html\?embedded=1&sandboxPayment=/);
    assert.equal(elements['demo-popup'].hidden,false);
    assert.match(elements['demo-status'].textContent,/NOT PAID/);
    const frame=elements['demo-frame'].contentWindow;
    const eventPayload={type:'SECUREPAY_MINI_SANDBOX_PROGRESS_V1',
      sandboxGate:3,fixtureId,simulated:true,orderCreated:false,
      agreementAccepted:false,result:'SIMULATED_UNKNOWN'};
    listeners.message({origin:'https://attacker.example',source:frame,data:eventPayload});
    assert.doesNotMatch(elements['demo-status'].textContent,/Unknown/);
    listeners.message({origin,source:{},data:eventPayload});
    assert.doesNotMatch(elements['demo-status'].textContent,/Unknown/);
    listeners.message({origin,source:frame,data:{...eventPayload,agreementAccepted:true}});
    assert.doesNotMatch(elements['demo-status'].textContent,/Unknown/);
    listeners.message({origin,source:frame,data:eventPayload});
    assert.match(elements['demo-status'].textContent,/Unknown test result — NOT PAID/);
    assert.equal(elements['demo-popup'].hidden,false);
    elements['demo-close'].listeners.click();
    elements['demo-pay'].listeners.click();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(calls.length,1,'same unexpired mock checkout resumes on reopen');
    listeners.message({origin,source:frame,data:{
      type:'SECUREPAY_MINI_OWNER_DEMO_RETURN_V1',version:1,
      sandboxGate:3,fixtureId,simulated:true,orderCreated:false,
      agreementAccepted:false,result:'SIMULATED_CONFIRMED'
    }});
    assert.equal(elements['demo-popup'].hidden,true);
    assert.match(elements['demo-status'].textContent,/NOT PAID/);
    assert.doesNotMatch(elements['demo-status'].textContent,/Payment received|Order paid|Booking confirmed/);
  }
});
