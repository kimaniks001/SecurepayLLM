import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {gate2Config,handleGate2Sandbox,progressGate2Sandbox,issueGate2Sandbox} from '../api/mini-gate2-sandbox.js';
import {gate3Config,startGate3Attempt} from '../api/mini-gate3-sandbox.js';
import {handleGate4Host} from '../api/mini-gate4-return.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const BRANCH='feat/mini-phase4-offline-resilience-20261109';
const env={
  VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:BRANCH,
  VERCEL_URL:'securepay-phase4-offline.vercel.app',
  MINI_GATE2_SANDBOX_SECRET:'H'.repeat(64),MINI_GATE3_SANDBOX_SECRET:'J'.repeat(64)
};
const origin='https://'+env.VERCEL_URL,g2=gate2Config(env),g3=gate3Config(env);
function response(){
  return {statusCode:0,body:null,headers:{},
    setHeader(k,v){this.headers[k.toLowerCase()]=v},
    end(v){this.body=JSON.parse(v)}
  };
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function browserHost(source='STORE'){
  const path=source==='STORE'?'/checkout-gate4-store.html':'/checkout-gate4-shortstays.html';
  const fixture=source==='STORE'?'STORE-DEMO-01':'STAY-DEMO-01';
  const storage=new Map(),calls=[];
  let now=Date.now(),failReads=false;
  function mount(){
    const listeners={},elements={};
    for(const id of ['demo-pay','demo-popup','demo-overlay','demo-frame','demo-close',
      'demo-fallback','demo-status','demo-check-status']){
      elements[id]={textContent:id==='demo-pay'?'Pay with SecurePay':'Not started',
        hidden:['demo-popup','demo-overlay','demo-fallback','demo-check-status'].includes(id),
        disabled:false,src:id==='demo-frame'?'about:blank':undefined,
        contentWindow:id==='demo-frame'?{}:undefined,listeners:{},
        setAttribute(){},focus(){},addEventListener(type,fn){this.listeners[type]=fn}};
    }
    const globals={
      Date:{now:()=>now},
      window:{location:{origin,pathname:path},addEventListener(k,fn){listeners[k]=fn},
        setTimeout(){return 0},setInterval(){return 0}},
      document:{querySelector:q=>q==='[data-gate4-host]'?
          {dataset:{gate4Host:source,checkoutFixture:fixture}}:null,
        getElementById:id=>elements[id],addEventListener(k,fn){listeners[k]=fn}},
      sessionStorage:{getItem:k=>storage.get(k)||null,
        setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
      fetch:async(url,opts)=>{
        calls.push({url,opts});
        if(opts.credentials!=='same-origin')return {ok:false,status:401,json:async()=>({})};
        if(failReads&&opts.method==='GET')
          return {ok:false,status:503,json:async()=>({})};
        const res=response();
        if(opts.method==='POST'){
          await handleGate2Sandbox({method:'POST',url,
            headers:{host:env.VERCEL_URL,origin,'content-type':'application/json'},
            body:JSON.parse(opts.body)},res,env,now);
        }else {
          handleGate4Host({method:'GET',url,
            headers:{host:env.VERCEL_URL,origin}},res,env,now);
        }
        return {ok:res.statusCode>=200&&res.statusCode<300,
          status:res.statusCode,json:async()=>res.body};
      }
    };
    runInNewContext(read('public/checkout-gate4-host.js'),globals);
    return {elements,listeners};
  }
  return {mount,calls,storage,fixture,source,
    advance:delta=>{now+=delta},now:()=>now,
    offline:flag=>{failReads=flag}};
}
function reference(host){
  return new URL(host.elements['demo-frame'].src,origin).searchParams.get('sandboxReconcile');
}
function deliver(host,attempt,fixture,source,claimedStatus){
  host.listeners.message({origin,source:host.elements['demo-frame'].contentWindow,
    data:{type:'SECUREPAY_MINI_GATE4_ATTEMPT_REF_V1',sandboxGate:4,
      fixtureId:fixture,simulated:true,orderCreated:false,
      agreementAccepted:false,attempt,...(claimedStatus?{status:claimedStatus}:{})}});
}
function storedAttempt(browser){
  const raw=browser.storage.get('spm-gate4-owner-host-'+browser.source);
  return raw?JSON.parse(raw).attempt:null;
}

test('Phase 4 preview remains isolated; no provider or production authority',()=>{
  assert.ok(g2&&g3);
  for(const alternate of [
    {...env,VERCEL_ENV:'production'}, {...env,VERCEL_GIT_COMMIT_REF:'main'},
    {...env,MINI_GATE3_SANDBOX_SECRET:''}
  ])assert.equal(gate3Config(alternate),null);
  const ui=read('src/mini/MiniGate3Funding.tsx');
  assert.match(ui,/startInFlight\.current/);
  assert.match(ui,/terminal==='expired'/);
  const host=read('public/checkout-gate4-host.js');
  assert.match(host,/verifiedStatus==='SIMULATED_FAILED'/);
  assert.match(host,/checkedCheckout!==checkout\|\|checkedAttempt!==attempt/);
});

test('both hosts: double Pay launch stays single, unknown cannot be replaced, and reload resumes',async()=>{
  for(const source of ['STORE','SHORTSTAYS']){
    const b=browserHost(source),host=b.mount();
    host.elements['demo-pay'].listeners.click();
    host.elements['demo-pay'].listeners.click();
    await tick();
    assert.equal(b.calls.filter(c=>c.opts.method==='POST').length,1);
    const checkout=reference(host);
    const reviewed=progressGate2Sandbox(checkout,g2,b.now()).session;
    const original=startGate3Attempt(reviewed,'MPESA','UNKNOWN_THEN_CONFIRMED',g3,b.now());
    assert.ok(original);
    deliver(host,original.attempt,b.fixture,source,'PAID');
    await tick();
    assert.equal(storedAttempt(b),original.attempt);
    const second=startGate3Attempt(reviewed,'PESALINK','SUCCESS',g3,b.now());
    const gets=b.calls.filter(c=>c.opts.method==='GET').length;
    deliver(host,second.attempt,b.fixture,source);
    await tick();
    assert.equal(storedAttempt(b),original.attempt,'pending attempt remains authoritative');
    assert.equal(b.calls.filter(c=>c.opts.method==='GET').length,gets);
    assert.match(host.elements['demo-status'].textContent,/NOT PAID/);
    b.advance(4500);
    host.elements['demo-check-status'].listeners.click();await tick();
    assert.match(host.elements['demo-status'].textContent,/unresolved.*NOT PAID/);
    deliver(host,second.attempt,b.fixture,source);
    assert.equal(storedAttempt(b),original.attempt,'unknown must not allow another attempt');
    b.advance(11000);
    host.elements['demo-check-status'].listeners.click();await tick();
    assert.match(host.elements['demo-status'].textContent,/reconciled.*NOT PAID/);
    deliver(host,second.attempt,b.fixture,source);
    assert.equal(storedAttempt(b),original.attempt,'confirmed fictional result is terminal');
    const sameTabReload=b.mount();await tick();
    assert.equal(storedAttempt(b),original.attempt);
    assert.match(sameTabReload.elements['demo-status'].textContent,/NOT PAID/);
    assert.equal(b.calls.filter(c=>c.opts.method==='POST').length,1);
  }
});

test('verified failed sandbox attempt permits a distinct second test; outage never does',async()=>{
  const b=browserHost(),host=b.mount();
  host.elements['demo-pay'].listeners.click();await tick();
  const reviewed=progressGate2Sandbox(reference(host),g2,b.now()).session;
  const failed=startGate3Attempt(reviewed,'CHOICE_BANK','FAILURE',g3,b.now());
  deliver(host,failed.attempt,b.fixture,'STORE');await tick();
  const retry=startGate3Attempt(reviewed,'MPESA','SUCCESS',g3,b.now());
  b.offline(true);
  host.elements['demo-check-status'].listeners.click();await tick();
  deliver(host,retry.attempt,b.fixture,'STORE');
  assert.equal(storedAttempt(b),failed.attempt,'cannot retry after unverified offline status');
  b.offline(false);b.advance(2600);
  host.elements['demo-check-status'].listeners.click();await tick();
  assert.match(host.elements['demo-status'].textContent,/failure reconciled.*NOT PAID/);
  deliver(host,retry.attempt,b.fixture,'STORE');await tick();
  assert.equal(storedAttempt(b),retry.attempt,'retry is allowed only after host verifies failure');
  assert.match(host.elements['demo-status'].textContent,/NOT PAID/);
});

test('expired stored checkout never silently resumes a previous order',async()=>{
  const b=browserHost(),original=issueGate2Sandbox('STORE',g2,Date.now()-600001);
  b.storage.set('spm-gate4-owner-host-STORE',JSON.stringify({
    fixtureId:'STORE-DEMO-01',checkout:original.session,
    attempt:null,expiresAt:Date.now()-1
  }));
  const host=b.mount();await tick();
  assert.equal(b.storage.has('spm-gate4-owner-host-STORE'),false);
  assert.match(host.elements['demo-status'].textContent,/expired.*NOT PAID/);
  assert.equal(b.calls.length,0,'expiry may not initiate a fresh checkout');
  host.elements['demo-pay'].listeners.click();await tick();
  assert.equal(b.calls.filter(c=>c.opts.method==='POST').length,1,
    'new sandbox session requires explicit new Pay click');
});


test('unverified or cross-order iframe attempt cannot poison saved host checkout',async()=>{
  for(const source of ['STORE','SHORTSTAYS']){
    const b=browserHost(source),host=b.mount();
    host.elements['demo-pay'].listeners.click();await tick();
    const checkout=reference(host);
    const reviewed=progressGate2Sandbox(checkout,g2,b.now()).session;
    const other=issueGate2Sandbox(source,g2,b.now());
    const otherReviewed=progressGate2Sandbox(other.session,g2,b.now()).session;
    const unrelated=startGate3Attempt(otherReviewed,'MPESA','SUCCESS',g3,b.now());
    deliver(host,unrelated.attempt,b.fixture,source,'PAID');await tick();
    assert.equal(storedAttempt(b),null,'unrelated same-source order cannot occupy active slot');
    assert.match(host.elements['demo-status'].textContent,/Cannot verify.*NOT PAID/);
    assert.equal(b.calls.filter(c=>c.opts.method==='POST').length,1);
    b.offline(true);
    const genuine=startGate3Attempt(reviewed,'CHOICE_BANK','UNKNOWN',g3,b.now());
    deliver(host,genuine.attempt,b.fixture,source);await tick();
    assert.equal(storedAttempt(b),null,'503 cannot persist a provider-looking token');
    b.offline(false);
    deliver(host,genuine.attempt,b.fixture,source,'SIMULATED_CONFIRMED');
    await tick();
    assert.equal(storedAttempt(b),genuine.attempt,'only the verified original may persist');
    assert.match(host.elements['demo-status'].textContent,/pending.*NOT PAID/);
  }
});

test('after verified failure, cross-order retry is rejected and genuine retry is permitted',async()=>{
  const b=browserHost(),host=b.mount();
  host.elements['demo-pay'].listeners.click();await tick();
  const checkout=reference(host),reviewed=progressGate2Sandbox(checkout,g2,b.now()).session;
  const initial=startGate3Attempt(reviewed,'CHOICE_BANK','FAILURE',g3,b.now());
  deliver(host,initial.attempt,b.fixture,'STORE');await tick();
  b.advance(2600);
  host.elements['demo-check-status'].listeners.click();await tick();
  assert.match(host.elements['demo-status'].textContent,/failure reconciled.*NOT PAID/);
  const other=issueGate2Sandbox('STORE',g2,b.now());
  const wrong=startGate3Attempt(progressGate2Sandbox(other.session,g2,b.now()).session,'MPESA','SUCCESS',g3,b.now());
  deliver(host,wrong.attempt,b.fixture,'STORE');await tick();
  assert.equal(storedAttempt(b),initial.attempt,'cross-order failure retry cannot replace reference');
  const genuine=startGate3Attempt(reviewed,'MPESA','SUCCESS',g3,b.now());
  deliver(host,genuine.attempt,b.fixture,'STORE');await tick();
  assert.equal(storedAttempt(b),genuine.attempt,'same-order signed retry is accepted');
  assert.match(host.elements['demo-status'].textContent,/NOT PAID/);
});


test('Gate 3: after a status outage, explicit Check adopts only the original server-matched attempt',async()=>{
  for(const source of ['STORE','SHORTSTAYS']){
    const b=browserHost(source),host=b.mount();
    host.elements['demo-pay'].listeners.click();await tick();
    const checkout=reference(host);
    const reviewed=progressGate2Sandbox(checkout,g2,b.now()).session;
    const genuine=startGate3Attempt(reviewed,'MPESA','UNKNOWN_THEN_CONFIRMED',g3,b.now());
    b.offline(true);
    deliver(host,genuine.attempt,b.fixture,source);
    await tick();
    assert.equal(storedAttempt(b),null,'no unverified attempt may be stored');
    assert.match(host.elements['demo-status'].textContent,/unverified|Cannot verify/);
    assert.equal(host.elements['demo-check-status'].hidden,false,
      'Check original must remain available during outage');
    host.elements['demo-close'].listeners.click();await tick();
    assert.match(host.elements['demo-status'].textContent,/unverified.*NOT PAID/,
      'closing Mini must not erase knowledge of unresolved attempt');
    b.offline(false);
    host.elements['demo-check-status'].listeners.click();await tick();
    assert.equal(storedAttempt(b),genuine.attempt,
      'explicit server recheck restores original attempt without a new POST');
    assert.match(host.elements['demo-status'].textContent,/pending.*NOT PAID/);
    const secondOpen=b.mount();await tick();
    assert.equal(storedAttempt(b),genuine.attempt);
    assert.match(secondOpen.elements['demo-status'].textContent,/NOT PAID/);
    assert.equal(b.calls.filter(c=>c.opts.method==='POST').length,1,
      'recovery must not create a second checkout');
  }
});

test('Gate 3: active checkout expiry fails closed without reusing an old attempt',async()=>{
  for(const source of ['STORE','SHORTSTAYS']){
    const b=browserHost(source),host=b.mount();
    host.elements['demo-pay'].listeners.click();await tick();
    const checkout=reference(host);
    const reviewed=progressGate2Sandbox(checkout,g2,b.now()).session;
    const attempt=startGate3Attempt(reviewed,'MPESA','UNKNOWN',g3,b.now());
    deliver(host,attempt.attempt,b.fixture,source);await tick();
    assert.equal(storedAttempt(b),attempt.attempt);
    b.advance(600001);
    const before=b.calls.length;
    host.elements['demo-check-status'].listeners.click();await tick();
    assert.equal(storedAttempt(b),null,'original expired checkout must be cleared');
    assert.match(host.elements['demo-status'].textContent,/expired.*NOT PAID/);
    assert.equal(b.calls.length,before,'expired attempt must not be queried or retried');
    const beforePost=b.calls.filter(c=>c.opts.method==='POST').length;
    host.elements['demo-pay'].listeners.click();await tick();
    assert.equal(b.calls.filter(c=>c.opts.method==='POST').length,beforePost+1,
      'only a new explicit customer action issues a fresh fictional checkout');
  }
});
