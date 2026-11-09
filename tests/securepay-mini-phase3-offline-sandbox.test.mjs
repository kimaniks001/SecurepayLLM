import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  MINI_CHECKOUT_PREVIEW_BRANCH,
  MINI_CHECKOUT_PHASE3_SANDBOX_BRANCH,
  miniCheckoutPreviewConfig,
  miniCheckoutPreviewIssue,
  miniCheckoutPreviewResolve,
  handleMiniCheckoutPreview
} from '../api/mini-checkout-preview.js';
import {
  STORE_OFFER_PREVIEW_BRANCH,
  STORE_OFFER_OFFLINE_SANDBOX_BRANCH,
  storePreviewConfig,
  handleOfferReview
} from '../api/mini-store-offer-preview.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const offline='feat/mini-phase3-explicit-sandbox-lane-20261109';
const environment={
  VERCEL_ENV:'preview', VERCEL_GIT_COMMIT_REF:offline,
  MINI_CHECKOUT_PREVIEW_SECRET:'D'.repeat(64),
  MINI_STORE_OFFER_PREVIEW_SECRET:'E'.repeat(64),
  VERCEL_URL:'securepay-phase3-sandbox.vercel.app',
  VITE_SECUREPAY_API_BASE_URL:'https://securepay.ke',
};
const ts=Date.UTC(2026,10,9,13,0,0);
const origin='https://'+environment.VERCEL_URL;
const resp=()=>({
  statusCode:0,headers:{},output:null,
  setHeader(k,v){this.headers[k.toLowerCase()]=v},
  end(s){this.output=JSON.parse(s)}
});

test('Phase 3 offline sandbox is separate from the published Store source and exact preview branches are gated',()=>{
  assert.equal(MINI_CHECKOUT_PREVIEW_BRANCH,'feat/mini-checkout-phase2-server-context-20261109');
  assert.equal(MINI_CHECKOUT_PHASE3_SANDBOX_BRANCH,offline);
  assert.equal(STORE_OFFER_PREVIEW_BRANCH,'feat/mini-checkout-phase3-store-offer-provenance-20261109');
  assert.equal(STORE_OFFER_OFFLINE_SANDBOX_BRANCH,offline);
  assert.ok(miniCheckoutPreviewConfig(environment));
  assert.ok(storePreviewConfig(environment));
  assert.equal(miniCheckoutPreviewConfig({...environment,VERCEL_ENV:'production'}),null);
  assert.equal(storePreviewConfig({...environment,VERCEL_ENV:'production'}),null);
  assert.equal(miniCheckoutPreviewConfig({...environment,VERCEL_GIT_COMMIT_REF:'main'}),null);
  assert.equal(storePreviewConfig({...environment,VERCEL_GIT_COMMIT_REF:'main'}),null);
  assert.equal(miniCheckoutPreviewConfig({...environment,MINI_CHECKOUT_PREVIEW_SECRET:''}),null);
  assert.equal(storePreviewConfig({...environment,MINI_STORE_OFFER_PREVIEW_SECRET:''}),null);
});

test('offline Store and ShortStays create genuine encrypted reference to FICTIONAL records only',async()=>{
  const config=miniCheckoutPreviewConfig(environment);
  assert.ok(config);
  for(const source of ['STORE','SHORTSTAYS']){
    const request={method:'POST',headers:{host:environment.VERCEL_URL,origin,
        'content-type':'application/json'},body:{source}};
    const result=resp();
    await handleMiniCheckoutPreview(request,result,environment,ts);
    assert.equal(result.statusCode,201);
    assert.equal(result.output.simulationOnly,true);
    const token=result.output.session;
    assert.doesNotMatch(token,/Sample|STORE-DEMO|STAY-DEMO/);
    const opened=miniCheckoutPreviewResolve(token,origin,config.key,ts+1000);
    assert.equal(opened.record.source,source);
    assert.equal(opened.record.fixtureOnly,true);
    assert.equal(opened.agreementAccepted,false);
    assert.equal(opened.reservationHeld,false);
    assert.equal(opened.financialAuthority,false);
    assert.equal(miniCheckoutPreviewResolve(token,origin,config.key,ts+300001),null);
  }
});

test('live-source lookup does not silently substitute fictional Store offers during API outages',async()=>{
  const res=resp();
  await handleOfferReview({method:'GET',url:'/api/mini-store-offer-preview?discover=1',
    headers:{host:environment.VERCEL_URL,origin}},res,environment,ts,
    async()=>{throw Error('upstream unavailable')});
  assert.equal(res.statusCode,503);
  assert.equal(res.output.code,'STORE_API_UNAVAILABLE');
  assert.equal(res.output.offers,undefined);
  const page=read('checkout-store-offer-preview.html');
  assert.match(page,/While the Store API is unavailable/);
  assert.match(page,/fictional transactions/);
  assert.match(page,/href="\/checkout-demo-store\.html"/);
  assert.match(page,/href="\/checkout-demo-shortstays\.html"/);
  assert.match(page,/The live Store source stays separate and fails closed/);
  const launcher=read('public/mini-store-offer-launcher.js');
  assert.doesNotMatch(launcher,/checkout-demo-store\.html|checkout-demo-shortstays\.html/);
  assert.match(launcher,/This Store offer could not be verified right now/);
});

test('sandbox Store and ShortStays still use one Mini and same payment UI, all simulated outcomes NOT PAID',()=>{
  const host=read('public/checkout-demo-server-host.js');
  assert.match(host,/STORE: \{ id: 'STORE-DEMO-01'/);
  assert.match(host,/SHORTSTAYS: \{ id: 'STAY-DEMO-01'/);
  assert.match(host,/checkoutSession=/);
  assert.match(host,/credentials: 'same-origin'/);
  assert.match(host,/SIMULATED_CONFIRMED: 'Simulated provider confirmation — NOT PAID'/);
  assert.match(read('src/mini/MiniServerCheckout.tsx'),/MiniHostedCheckoutDemo/);
  assert.match(read('src/mini/MiniHostedCheckoutDemo.tsx'),/MiniFundingPreview/);
  assert.match(read('src/mini/MiniHostedCheckoutDemo.tsx'),/MiniGuestChat/);
  assert.match(read('src/mini/MiniFundingPreview.tsx'),/SIMULATION ONLY · No real money/);
});

test('real-money APIs and the main SecurePay experience are not altered by sandbox test lane',()=>{
  const all=['api/mini-checkout-preview.js','checkout-store-offer-preview.html',
    'api/mini-store-offer-preview.js'].map(read).join('\n');
  assert.doesNotMatch(all,/createIntent\(|fundFromSelf\(|releaseFunds\(|PaymentInitiationService\.initiate/);
  assert.match(read('src/main.tsx'),/RuntimeApp/);
  assert.match(read('vite.config.ts'),/demoStore: fileURLToPath/);
  assert.match(read('vite.config.ts'),/demoShortStays: fileURLToPath/);
});
