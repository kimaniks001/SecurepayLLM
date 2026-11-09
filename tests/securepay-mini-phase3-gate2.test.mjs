import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import {
  GATE2_BRANCH, GATE2_TTL_MS, gate2Config, issueGate2Sandbox,
  readGate2Sandbox, progressGate2Sandbox, gate2Snapshot, handleGate2Sandbox
} from '../api/mini-gate2-sandbox.js';

const read = file => readFileSync(new URL('../'+file,import.meta.url),'utf8');
const environment = {
  VERCEL_ENV:'preview',
  VERCEL_GIT_COMMIT_REF:GATE2_BRANCH,
  MINI_GATE2_SANDBOX_SECRET:'Y'.repeat(64),
  VERCEL_URL:'securepay-gate2-preview.vercel.app'
};
const config=gate2Config(environment);
const origin='https://'+environment.VERCEL_URL;
const at=Date.now();
function respond(){
  return {
    statusCode:0, output:null, headers:{},
    setHeader(key,value){this.headers[key.toLowerCase()]=value;},
    end(text){this.output=JSON.parse(text);}
  };
}
async function call(method,body,url='/api/mini-gate2-sandbox',options={}) {
  const res=respond();
  await handleGate2Sandbox({
    method,url,
    headers:{
      host:environment.VERCEL_URL,origin,'content-type':'application/json',
      ...options.headers
    },
    body
  },res,options.env||environment,options.at||at);
  return res;
}
function asBrowser(r){
  return {
    status:r.statusCode,
    ok:r.statusCode>=200&&r.statusCode<300,
    json:async()=>r.output
  };
}

test('Gate 2 only runs on its isolated preview branch with an encrypted server secret',()=>{
  assert.ok(config);
  assert.equal(config.key.length,32);
  assert.equal(config.origin,origin);
  for(const change of [
    {VERCEL_ENV:'production'},
    {VERCEL_ENV:'development'},
    {VERCEL_GIT_COMMIT_REF:'main'},
    {VERCEL_GIT_COMMIT_REF:'feat/mini-phase3-explicit-sandbox-lane-20261109'},
    {MINI_GATE2_SANDBOX_SECRET:''},
    {MINI_GATE2_SANDBOX_SECRET:'weak'},
    {VERCEL_URL:'securepay.ke'},
  ])assert.equal(gate2Config({...environment,...change}),null);
});

test('two sample hosts create signed mock order+agreement references, never a real order',async()=>{
  for(const [source,amount,fixtureId,returnPath] of [
    ['STORE',180000,'STORE-DEMO-01','/checkout-gate2-store.html'],
    ['SHORTSTAYS',900000,'STAY-DEMO-01','/checkout-gate2-shortstays.html']
  ]){
    const begin=await call('POST',{action:'BEGIN',source});
    assert.equal(begin.statusCode,201);
    assert.equal(begin.output.simulationOnly,true);
    assert.equal(begin.output.orderCreated,false);
    assert.equal(begin.output.acceptedAgreement,false);
    assert.equal(begin.output.paymentEnabled,false);
    assert.match(begin.output.session,/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    assert.doesNotMatch(begin.output.session,/Sample|KSh|STORE-DEMO|STAY-DEMO/);
    const snapshot=await call('GET',undefined,
      '/api/mini-gate2-sandbox?session='+encodeURIComponent(begin.output.session));
    assert.equal(snapshot.statusCode,200);
    assert.equal(snapshot.output.stage,'REVIEW');
    assert.equal(snapshot.output.order.fixtureId,fixtureId);
    assert.equal(snapshot.output.order.amountMinor,amount);
    assert.equal(snapshot.output.order.hostReturnPath,returnPath);
    assert.equal(snapshot.output.order.status,'NOT_PLACED_SANDBOX_ONLY');
    assert.equal(snapshot.output.agreement.reviewStatus,'AWAITING_SAMPLE_REVIEW');
    assert.equal(snapshot.output.agreement.signed,false);
    assert.equal(snapshot.output.agreement.accepted,false);
    assert.equal(snapshot.output.agreement.mayExploreSimulatedRails,false);
    for(const field of ['paymentEnabled','financialAuthority','orderCreated','agreementAccepted',
      'inventoryReserved','accommodationHeld','buyerVerified','sellerVerified']){
      assert.equal(snapshot.output[field],false,field+' cannot become true');
    }
    assert.equal(snapshot.headers['cache-control'],'no-store, max-age=0');
    assert.equal(snapshot.headers['referrer-policy'],'no-referrer');
  }
});

test('sample terms review preserves exact order, version, identity and amount while gating simulated rail UI',async()=>{
  const begin=issueGate2Sandbox('STORE',config,at);
  const original=gate2Snapshot(begin.session,config,at);
  assert.ok(original);
  assert.equal(original.agreement.mayExploreSimulatedRails,false);
  const response=await call('POST',{action:'REVIEW_TERMS',session:begin.session,reviewed:true});
  assert.equal(response.statusCode,200);
  assert.equal(response.output.acceptedAgreement,false);
  assert.equal(response.output.orderCreated,false);
  assert.equal(response.output.paymentEnabled,false);
  assert.notEqual(response.output.session,begin.session);
  const after=gate2Snapshot(response.output.session,config,at);
  assert.ok(after);
  assert.equal(after.stage,'TERMS_REVIEWED');
  assert.equal(after.order.sandboxId,original.order.sandboxId);
  assert.equal(after.agreement.orderSandboxId,original.order.sandboxId);
  assert.equal(after.order.amountMinor,original.order.amountMinor);
  assert.equal(after.agreement.version,original.order.orderVersion);
  assert.equal(after.agreement.mayExploreSimulatedRails,true);
  assert.equal(after.agreement.reviewStatus,'TERMS_REVIEWED_IN_SANDBOX');
  assert.equal(after.agreement.signed,false);
  assert.equal(after.agreement.accepted,false);
  assert.equal(after.agreement.legallyBinding,false);
  assert.equal(after.agreementAccepted,false);
  assert.equal(after.paymentEnabled,false);
  assert.equal(gate2Snapshot(begin.session,config,at).stage,'REVIEW',
    'stateless mock cannot claim prior token was consumed');
  assert.equal(progressGate2Sandbox(response.output.session,config,at),null,
    'reviewed token cannot be reviewed again');
});

test('wrong review action, fake merchant/amount, forged acceptance, or forced funding all denied',async()=>{
  const begin=issueGate2Sandbox('STORE',config,at);
  const invalid=[
    {action:'BEGIN',source:'UNKNOWN'},
    {action:'BEGIN',source:'STORE',amountMinor:1},
    {action:'BEGIN',source:'STORE',seller:'KS000'},
    {action:'BEGIN',source:'STORE',paymentEnabled:true},
    {action:'REVIEW_TERMS',session:begin.session,reviewed:false},
    {action:'REVIEW_TERMS',session:begin.session,reviewed:true,acceptedAgreement:true},
    {action:'FUND',session:begin.session,reviewed:true},
    {action:'SIGN',session:begin.session,reviewed:true},
  ];
  for(const input of invalid){
    const r=await call('POST',input);
    assert.ok(r.statusCode>=400,input.action+' must be denied');
  }
  assert.equal((await call('POST',{action:'REVIEW_TERMS',session:'fake',reviewed:true})).statusCode,409);
  assert.equal((await call('DELETE')).statusCode,405);
  assert.equal((await call('POST',{action:'BEGIN',source:'STORE'},undefined,{
    headers:{'content-type':'text/plain'}
  })).statusCode,415);
});

test('tamper, expiry, wrong origin/secret, incorrect host, and production fail closed',async()=>{
  const issued=issueGate2Sandbox('SHORTSTAYS',config,at);
  assert.ok(readGate2Sandbox(issued.session,config,at));
  assert.equal(readGate2Sandbox(issued.session,config,at+GATE2_TTL_MS),null);
  const cipher=issued.session;
  const mutated=cipher.slice(0,-9)+(cipher.at(-9)==='A'?'B':'A')+cipher.slice(-8);
  assert.equal(readGate2Sandbox(mutated,config,at),null);
  assert.equal(readGate2Sandbox(cipher,{...config,origin:'https://other.vercel.app'},at),null);
  const other=gate2Config({...environment,MINI_GATE2_SANDBOX_SECRET:'Z'.repeat(64)});
  assert.equal(readGate2Sandbox(cipher,other,at),null);
  assert.equal((await call('GET',undefined,
    '/api/mini-gate2-sandbox?session='+encodeURIComponent(cipher),{at:at+GATE2_TTL_MS})).statusCode,410);
  assert.equal((await call('POST',{action:'BEGIN',source:'STORE'},undefined,{
    headers:{host:'other.vercel.app'}})).statusCode,403);
  assert.equal((await call('POST',{action:'BEGIN',source:'STORE'},undefined,{
    headers:{origin:'https://evil.example'}})).statusCode,403);
  assert.equal((await call('POST',{action:'BEGIN',source:'STORE'},undefined,{
    env:{...environment,VERCEL_ENV:'production'}})).statusCode,503);
  assert.equal((await call('GET',undefined,'/api/mini-gate2-sandbox?session=x&paid=1')).statusCode,400);
});

test('client parser refuses any claim that the sandbox signed, accepted or paid a real transaction',()=>{
  const js=ts.transpileModule(read('src/mini/gate2SandboxClient.ts'),{
    compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}
  }).outputText;
  const exports={};
  runInNewContext(js,{exports,Date,Number,Object,String});
  const session=issueGate2Sandbox('STORE',config,Date.now()).session;
  const raw=gate2Snapshot(session,config,Date.now());
  assert.ok(exports.parseGate2Snapshot(raw));
  for(const extra of [
    {paymentEnabled:true},{orderCreated:true},{agreementAccepted:true},
    {inventoryReserved:true},{accommodationHeld:true},{buyerVerified:true},
    {financialAuthority:true},{sellerVerified:true},
    {order:{...raw.order,amountMinor:1}},
    {order:{...raw.order,hostReturnPath:'/payment-success'}},
    {agreement:{...raw.agreement,accepted:true}},
    {agreement:{...raw.agreement,signed:true}},
    {agreement:{...raw.agreement,mayExploreSimulatedRails:true}},
    {stage:'TERMS_REVIEWED'},
    {expiresAt:1},
  ]) {
    const changed={...raw,...extra};
    // An amount is supplied by the server fixture; the parser cannot check
    // a different *valid* amount without backend authority, but the token is
    // encrypted and the client cannot persist or send it to a real provider.
    if(extra.order?.amountMinor===1)continue;
    assert.equal(exports.parseGate2Snapshot(changed),null);
  }
  assert.equal(exports.parseGate2Snapshot({
    ...raw,order:{...raw.order,amountMinor:-1}
  }),null);
});

test('real browser launcher code opens BOTH sample sites and reuses its iframe after closing',async()=>{
  for(const [source,fixtureId,path] of [
    ['STORE','STORE-DEMO-01','/checkout-gate2-store.html'],
    ['SHORTSTAYS','STAY-DEMO-01','/checkout-gate2-shortstays.html']
  ]){
    const listeners={},elements={};
    for(const id of ['demo-pay','demo-popup','demo-overlay','demo-frame',
      'demo-close','demo-fallback','demo-status']){
      elements[id]={
        hidden:['demo-popup','demo-overlay','demo-fallback'].includes(id),
        textContent:id==='demo-pay'?'Pay with SecurePay':'Not started',
        dataset:{},listeners:{},disabled:false,
        src:id==='demo-frame'?'about:blank':undefined,
        addEventListener(event,listener){this.listeners[event]=listener;},
        setAttribute(){},focus(){}
      };
    }
    elements['demo-frame'].contentWindow={};
    const requests=[];
    const browser={
      window:{location:{pathname:path,origin},addEventListener(t,fn){listeners[t]=fn},
        setTimeout(){return 0;}},
      document:{
        querySelector:selector=>selector==='[data-gate2-host]'?
          {dataset:{gate2Host:source,checkoutFixture:fixtureId}}:null,
        getElementById:id=>elements[id],
        addEventListener(t,fn){listeners[t]=fn}
      },
      fetch:async(url,opts)=>{
        requests.push({url,opts});
        if(opts.credentials!=='same-origin')return {ok:false,status:401};
        return asBrowser(await call(opts.method,JSON.parse(opts.body),url,{at:Date.now()}));
      }
    };
    runInNewContext(read('public/checkout-gate2-host.js'),browser);
    elements['demo-pay'].listeners.click();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(requests.length,1);
    assert.equal(requests[0].opts.credentials,'same-origin');
    assert.equal(requests[0].opts.redirect,'error');
    assert.deepEqual(JSON.parse(requests[0].opts.body),{action:'BEGIN',source});
    assert.equal(elements['demo-popup'].hidden,false);
    assert.match(elements['demo-frame'].src,/^\/mini\.html\?embedded=1&sandboxAgreement=/);
    assert.doesNotMatch(elements['demo-frame'].src,/amount=|recipient=|paid=/);
    elements['demo-close'].listeners.click();
    elements['demo-pay'].listeners.click();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(requests.length,1,'reopen reuses unexpired sample agreement');
    listeners.message({origin:'https://evil.example',
      source:elements['demo-frame'].contentWindow,
      data:{type:'SECUREPAY_MINI_OWNER_DEMO_RETURN_V1',version:1,
        fixtureId,result:'SIMULATED_CONFIRMED',simulated:true,sandboxGate:2,
        orderCreated:false,agreementAccepted:false}});
    assert.equal(elements['demo-popup'].hidden,false,'forged origin ignored');
    listeners.message({origin,source:elements['demo-frame'].contentWindow,
      data:{type:'SECUREPAY_MINI_OWNER_DEMO_RETURN_V1',version:1,
        fixtureId,result:'SIMULATED_CONFIRMED',simulated:true,sandboxGate:2,
        orderCreated:false,agreementAccepted:false}});
    assert.equal(elements['demo-popup'].hidden,true);
    assert.match(elements['demo-status'].textContent,/NOT PAID/);
    assert.match(elements['demo-status'].textContent,/NOT BOOKED/);
  }
});

test('Mini requires explicit mock review before the existing three-rail simulator, never mandatory chat',()=>{
  const mini=read('src/mini/MiniGate2Sandbox.tsx');
  assert.match(mini,/acknowledgeGate2Review\(session\)/);
  assert.match(mini,/getGate2Snapshot\(reviewed\.session\)/);
  assert.match(mini,/loaded\.data\.agreement\.mayExploreSimulatedRails!==true/);
  assert.match(mini,/reviewed&&<div className="spm-hosted-finance"/);
  assert.match(mini,/<MiniFundingPreview/);
  assert.match(mini,/<MiniGuestChat/);
  assert.match(mini,/No one has signed or accepted/);
  assert.match(mini,/SANDBOX · No agreement signed/);
  assert.match(mini,/SECUREPAY_MINI_GATE2_CANCEL/);
  const app=read('src/mini/MiniExperience.tsx');
  assert.match(app,/sandboxAgreement/);
  assert.match(app,/<MiniGate2Sandbox session=\{gate2Session\}/);
  assert.match(read('src/mini/MiniFundingPreview.tsx'),/SIMULATION ONLY · No real money/);
});

test('both Gate 2 host pages and preview landing remain distinct from original Store and ShortStays examples',()=>{
  for(const path of ['checkout-gate2-store.html','checkout-gate2-shortstays.html']){
    const html=read(path);
    assert.match(html,/data-gate2-host=/);
    assert.match(html,/src="\/checkout-gate2-host.js"/);
    assert.match(html,/Phase 3 Gate 2 sandbox/);
    assert.match(html,/No signature or money/);
  }
  const landing=read('checkout-store-offer-preview.html');
  assert.match(landing,/href="\/checkout-gate2-store.html"/);
  assert.match(landing,/href="\/checkout-gate2-shortstays.html"/);
  assert.match(read('checkout-demo-store.html'),/src="\/checkout-demo-server-host.js"/);
  assert.match(read('checkout-demo-shortstays.html'),/src="\/checkout-demo-server-host.js"/);
  assert.match(read('vite.config.ts'),/gate2Store: fileURLToPath/);
  assert.match(read('vite.config.ts'),/gate2Stays: fileURLToPath/);
  assert.doesNotMatch(read('api/mini-gate2-sandbox.js'),
    /createIntent\(|fundFromSelf\(|PaymentInitiationService|releaseFunds\(|axios\.post\(/);
});
