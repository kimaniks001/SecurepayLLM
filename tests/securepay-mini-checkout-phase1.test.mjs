import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('src/mini/checkoutDemoFixtures.ts');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }
}).outputText;
const contracts = {};
runInNewContext(compiled, { exports: contracts, Object, Number });
const fixture = id => contracts.getMiniDemoCheckout(id);

function hostHarness(sourceType) {
  const isStore = sourceType === 'STORE';
  const source = { dataset: {
    demoHost: sourceType,
    checkoutFixture: isStore ? 'STORE-DEMO-01' : 'STAY-DEMO-01',
  }};
  const elements = Object.fromEntries([
    'demo-pay','demo-popup','demo-close','demo-overlay',
    'demo-frame','demo-fallback','demo-status',
  ].map(id => {
    const listeners = {};
    return [id,{listeners,hidden:id==='demo-popup'||id==='demo-overlay'||id==='demo-fallback',
      dataset:{},textContent:'Payment not started (test only)',attributes:{},
      setAttribute(name,value){this.attributes[name]=value;},
      addEventListener(name,fn){listeners[name]=fn;},focus(){} }];
  }));
  const windowHandlers = {};
  const frameIdentity = {};
  elements['demo-frame'].contentWindow=frameIdentity;
  elements['demo-frame'].src='about:blank';
  const origin='https://checkout-owner-preview.example';
  const doc = {
    querySelector: selector => selector==='[data-demo-host]'?source:null,
    getElementById: id => elements[id],
    addEventListener(name,fn){windowHandlers[name]=fn;},
  };
  const win = {
    location:{ origin,pathname:isStore?'/checkout-demo-store.html':'/checkout-demo-shortstays.html'},
    addEventListener(name,fn){windowHandlers[name]=fn;},
  };
  runInNewContext(read('public/checkout-demo-host.js'),{
    document:doc,window:win,Object,encodeURIComponent,setTimeout:()=>{},
  });
  return {
    click: () => elements['demo-pay'].listeners.click(),
    close: () => elements['demo-close'].listeners.click(),
    receive: (payload,atOrigin=origin,from=frameIdentity) =>
      windowHandlers.message({data:payload,origin:atOrigin,source:from}),
    elements, origin, frameIdentity,
    id:isStore?'STORE-DEMO-01':'STAY-DEMO-01',
  };
}

test('Store and ShortStays use two immutable fictional records, not user-priced checkout sessions',()=>{
  assert.deepEqual(Object.keys(contracts.MINI_DEMO_CHECKOUTS).sort(),
    ['STAY-DEMO-01','STORE-DEMO-01']);
  assert.equal(fixture('STORE-DEMO-01').source,'STORE');
  assert.equal(fixture('STORE-DEMO-01').amountMinor,180000);
  assert.equal(fixture('STAY-DEMO-01').amountMinor,900000);
  assert.equal(fixture('STAY-DEMO-01').source,'SHORTSTAYS');
  assert.equal(fixture('STAY-DEMO-01').hostReturnPath,'/checkout-demo-shortstays.html');
  assert.equal(fixture('STORE-DEMO-01').hostReturnPath,'/checkout-demo-store.html');
  assert.ok(Object.values(contracts.MINI_DEMO_CHECKOUTS).every(x=>x.fixtureOnly));
  assert.ok(Object.values(contracts.MINI_DEMO_CHECKOUTS).every(x=>Object.isFrozen(x)));
  for(const invalid of ['','STORE-DEMO-02','STAY-DEMO-01&amount=1','../admin','PAYMENT_SUCCESS']){
    assert.equal(fixture(invalid),null,invalid);
  }
});

test('every synthetic outcome and return preserves NOT PAID, including simulated provider confirmation',()=>{
  for(const state of ['NOT_STARTED','SELECT_METHOD','AWAITING_FAKE_PROVIDER',
    'SIMULATED_UNKNOWN','SIMULATED_CONFIRMED','SIMULATED_FAILED']) {
    assert.equal(contracts.isMiniDemoStatus(state),true);
    const label=contracts.miniDemoStatusLabel(state);
    assert.ok(/not paid|payment not started/i.test(label),state);
    assert.doesNotMatch(label,/^Paid\b|^Booking confirmed\b/i);
  }
  for(const state of ['PAID','FUNDED_HELD','SETTLED','PROVIDER_CONFIRMED','BOOKING_CONFIRMED'])
    assert.equal(contracts.isMiniDemoStatus(state),false);
});

test('both websites launch the exact same Mini entry with only a synthetic reference',()=>{
  const store=read('checkout-demo-store.html');
  const stay=read('checkout-demo-shortstays.html');
  for(const [html,kind,id] of [[store,'STORE','STORE-DEMO-01'],[stay,'SHORTSTAYS','STAY-DEMO-01']]){
    assert.match(html, new RegExp('data-demo-host="'+kind+'"'));
    assert.match(html,new RegExp('data-checkout-fixture="'+id+'"'));
    assert.match(html,/id="demo-pay"/);
    assert.match(html,/src="\/checkout-demo-server-host.js"/);
    assert.match(html,/id="demo-frame"/);
    assert.match(html,/id="demo-status"/);
    assert.match(html,/NOT PAID|not paid|Payment not started/);
    assert.doesNotMatch(html,/apiKey|fundsReceived|providerTransactionId|walletBalance/);
  }
  const vite=read('vite.config.ts');
  assert.match(vite,/demoStore: fileURLToPath/);
  assert.match(vite,/demoShortStays: fileURLToPath/);
  assert.match(vite,/main: fileURLToPath/);
  assert.match(vite,/mini: fileURLToPath/);
});

test('actual shared host controller opens the same Mini with correct local fixture id',()=>{
  for(const kind of ['STORE','SHORTSTAYS']){
    const host=hostHarness(kind);
    host.click();
    assert.equal(host.elements['demo-popup'].hidden,false);
    assert.equal(host.elements['demo-overlay'].hidden,false);
    assert.equal(host.elements['demo-frame'].src,
      '/mini.html?embedded=1&demoCheckout='+host.id);
    assert.equal(host.elements['demo-pay'].attributes['aria-expanded'],'true');
    host.close();
    assert.equal(host.elements['demo-popup'].hidden,true);
    assert.match(host.elements['demo-status'].textContent,/NOT PAID/);
    host.click();
    assert.equal(host.elements['demo-frame'].src,
      '/mini.html?embedded=1&demoCheckout='+host.id);
  }
});

test('a valid test-only Mini return closes the correct host but never marks the order or booking paid',()=>{
  for(const kind of ['STORE','SHORTSTAYS']){
    const host=hostHarness(kind);
    host.click();
    host.receive({type:'SECUREPAY_MINI_OWNER_DEMO_RETURN_V1',version:1,
      fixtureId:host.id,result:'SIMULATED_CONFIRMED',simulated:true});
    assert.equal(host.elements['demo-popup'].hidden,true);
    assert.match(host.elements['demo-status'].textContent,/NOT PAID/);
    assert.doesNotMatch(host.elements['demo-status'].textContent,/^Paid|Booking confirmed/i);
    assert.equal(host.elements['demo-status'].dataset.demoReturned,'yes');
  }
});

test('spoofed origins, unrelated frames, wrong order and forged funded statuses cannot update host',()=>{
  const host=hostHarness('STORE');
  host.click();
  const valid={type:'SECUREPAY_MINI_OWNER_DEMO_RETURN_V1',version:1,
    fixtureId:host.id,result:'SIMULATED_CONFIRMED',simulated:true};
  const before=host.elements['demo-status'].textContent;
  host.receive(valid,'https://other.example');
  host.receive(valid,host.origin,{});
  host.receive({...valid,fixtureId:'STAY-DEMO-01'});
  host.receive({...valid,result:'PAID'});
  host.receive({...valid,simulated:false});
  host.receive({...valid,type:'SECUREPAY_REAL_FUNDS_RECEIVED'});
  host.receive({...valid,version:9});
  assert.equal(host.elements['demo-status'].textContent,before);
  assert.equal(host.elements['demo-popup'].hidden,false);
});

test('Mini checkout is a reference-only mode of the same React shell and same funding component',()=>{
  const mini=read('src/mini/MiniExperience.tsx');
  const view=read('src/mini/MiniHostedCheckoutDemo.tsx');
  const funding=read('src/mini/MiniFundingPreview.tsx');
  assert.match(mini,/getMiniDemoCheckout\(demoRequest\)/);
  assert.match(mini,/<MiniHostedCheckoutDemo record=\{demoRecord\} language=\{lang\} journeyMode=\{journeyMode\}\/>/);
  assert.match(mini,/journeyMode = urlParams\?\.get\('journey'\) === '1'/);
  assert.match(mini,/Checkout unavailable/);
  assert.match(view,/<MiniFundingPreview/);
  assert.match(view,/<MiniGuestChat/);
  assert.match(view,/onDemoStateChange=\{onStatusChange\}/);
  assert.match(view,/onReturnToHost=\{returnToHost\}/);
  assert.match(view,/onBack=\{\(\) => setStep\('review'\)\}/);
  assert.match(funding,/onReturnToHost\?: \(\) => void/);
  assert.match(read('src/main.tsx'),/RuntimeApp/);
});

test('mock checkout state is not treated as server-created Money Session, payment or booking',()=>{
  const all=[
    'src/mini/checkoutDemoFixtures.ts',
    'src/mini/MiniHostedCheckoutDemo.tsx',
    'public/checkout-demo-host.js'
  ].map(read).join('\n');
  assert.doesNotMatch(all,/fetch\(|XMLHttpRequest|new WebSocket|createIntent\(|redeem\(|fundFromSelf\(/);
  assert.doesNotMatch(all,/REAL_PAYMENT_SUCCESS|MONEY_SETTLED|CONFIRMED_BOOKING/);
  assert.match(all,/SIMULATION ONLY/);
  assert.match(all,/window\.parent\.postMessage/);
  assert.match(all,/window\.location\.origin/);
  assert.match(all,/event\.origin !== window\.location\.origin/);
  assert.match(all,/event\.source !== frame\.contentWindow/);
  assert.match(all,/not an actual booked room|no real room held|not reserved|room held/i);
});

test('checkout-first API compatibility is explicitly unresolved, never a fabricated integration pass',()=>{
  const audit=read('docs/SECUREPAY_MINI_PHASE0_CHECKOUT_FOUNDATION_AUDIT_20261109.md');
  const contract=read('docs/SECUREPAY_MINI_CHECKOUT_CONTRACT_V1_20261109.md');
  assert.match(audit,/AgreementFundedAuthorityOrchestrationService\.fund/);
  assert.match(audit,/Payment Intent/);
  assert.match(contract,/existing hosted service/i);
  assert.match(contract,/Verify this before issuing any new session API/i);
  const fixturePack=JSON.parse(read('tests/fixtures/securepay-mini/checkout-acceptance.v1.json'));
  assert.deepEqual(fixturePack.verticalSlices.map(v=>v.status),['NOT_TESTED','NOT_TESTED']);
});


test('hosted checkout is self-guided; KS001 is optional and never a prerequisite',()=>{
  const view=read('src/mini/MiniHostedCheckoutDemo.tsx');
  assert.match(view,/Continue to payment/);
  assert.match(view,/onClick=\{\(\) => setStep\('funding'\)\}/);
  assert.match(view,/<MiniFundingPreview/);
  assert.match(view,/guidedDemo/);
  assert.match(view,/Need help\? Ask KS001/);
  assert.match(view,/returnLabel=\{sw/);
  assert.match(view,/Return to Store/);
  assert.match(view,/Return to ShortStays/);
  assert.match(view,/\.spm-frame'\)\?\.scrollTo\(0, 0\)/);
  const review=view.slice(view.indexOf("step === 'review'"),view.indexOf('<div className="spm-hosted-finance"'));
  assert.ok(review.indexOf('setStep(\'funding\')') < review.indexOf('onClick={showChat}'),
    'primary payment choice comes before optional Ask KS001');
  assert.doesNotMatch(review,/onClick=\{showChat\}[^]*setStep\('funding'\)/);
});

test('guided test result does not require hidden manual controls, and cannot be treated as real funding',()=>{
  const funding=read('src/mini/MiniFundingPreview.tsx');
  assert.match(funding,/guidedDemo = false/);
  assert.match(funding,/const pendingReply = window\.setTimeout\(\(\) => dispatch\(\{ type: 'SIMULATE_CONFIRMED' \}\), 1100\)/);
  assert.match(funding,/window\.clearTimeout\(pendingReply\)/);
  assert.match(funding,/\(pending \|\| unknown\) && !guidedDemo && <details className="spm-demo-controls">/);
  assert.match(funding,/confirmed && guidedDemo \? 'spm-primary spm-demo-return'/);
  assert.match(funding,/Test complete — not paid/);
  assert.match(funding,/SIMULATION ONLY · No real money/);
  assert.match(funding,/No money moved\./);
  assert.match(funding,/onReturnToHost/);
  assert.doesNotMatch(funding,/fetch\(|createIntent\(|redeem\(|fundFromSelf\(/);
});
