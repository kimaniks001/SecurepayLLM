import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const bridge=read('public/securepay-mini-phase5-host-bridge.js');
const cases=Object.freeze({
  STORE:{path:'/phase5-store-host.html',id:'STORE-DEMO-01'},
  SHORTSTAYS:{path:'/phase5-shortstays-host.html',id:'STAY-DEMO-01'}
});
function harness(source='STORE',overrides={}){
  const item=cases[source]||{path:'/phase5-unapproved.html',id:'FAKE-DEMO'};
  const root={dataset:{miniPhase5Host:source,checkoutFixture:item.id}};
  const elements={};
  for(const id of ['demo-pay','demo-popup','demo-overlay','demo-frame',
    'demo-close','demo-fallback','demo-status']){
    const listeners={};
    elements[id]={
      hidden:['demo-popup','demo-overlay','demo-fallback'].includes(id),
      listeners,attributes:{},dataset:{},textContent:'No test checkout started — NOT PAID',
      src:'about:blank',
      setAttribute(name,value){this.attributes[name]=value;},
      focus(){this.focused=true;},
      addEventListener(name,handler){listeners[name]=handler;}
    };
  }
  const frameIdentity={},origin='https://owner-mini-preview.example';
  elements['demo-frame'].contentWindow=frameIdentity;
  elements['demo-frame'].contentDocument={
    querySelector:s=>s==='.spm-root'?{}:null
  };
  const handlers={};
  const document={
    querySelector:selector=>selector==='[data-mini-phase5-host]'?root:null,
    getElementById:id=>elements[id],
    addEventListener:(name,fn)=>{handlers['document:'+name]=fn;}
  };
  const window={
    location:{origin,pathname:item.path},
    addEventListener:(name,fn)=>{handlers[name]=fn;},
    setTimeout:(fn)=>fn()
  };
  if(overrides.pathname)window.location.pathname=overrides.pathname;
  if(overrides.host)root.dataset.miniPhase5Host=overrides.host;
  if(overrides.fixture)root.dataset.checkoutFixture=overrides.fixture;
  runInNewContext(bridge,{document,window,encodeURIComponent,Object,Boolean});
  return {
    elements,handlers,origin,frameIdentity,
    click:()=>elements['demo-pay'].listeners.click?.(),
    close:()=>elements['demo-close'].listeners.click?.(),
    receive:(payload,from=frameIdentity,at=origin)=>handlers.message?.({
      data:payload,origin:at,source:from
    }),
    source,id:item.id
  };
}
const reply=(id,result='SIMULATED_CONFIRMED')=>({
  type:'SECUREPAY_MINI_OWNER_DEMO_RETURN_V1',version:1,
  fixtureId:id,result,simulated:true
});

for(const source of ['STORE','SHORTSTAYS']){
  test(source+' uses ONE popup script and the original Mini full-journey mode',()=>{
    const testHost=harness(source);
    testHost.click();
    assert.equal(testHost.elements['demo-popup'].hidden,false);
    assert.equal(testHost.elements['demo-overlay'].hidden,false);
    assert.equal(testHost.elements['demo-frame'].src,
      '/mini.html?embedded=1&demoCheckout='+testHost.id+'&journey=1');
    assert.equal(testHost.elements['demo-pay'].attributes['aria-expanded'],'true');
    testHost.close();
    assert.equal(testHost.elements['demo-popup'].hidden,true);
    assert.match(testHost.elements['demo-status'].textContent,/NOT PAID/);
    testHost.click();
    assert.equal(testHost.elements['demo-frame'].src,
      '/mini.html?embedded=1&demoCheckout='+testHost.id+'&journey=1');
  });
  test(source+' accepts only an exact same-origin/frame/result and never marks paid',()=>{
    const h=harness(source);h.click();
    const initial=h.elements['demo-status'].textContent;
    h.receive(reply(h.id),'alien-frame',h.origin);
    h.receive(reply(h.id),h.frameIdentity,'https://attacker.example');
    h.receive(reply('STORE-DEMO-02'));
    h.receive({...reply(h.id),simulated:false});
    h.receive({...reply(h.id),result:'PAID'});
    h.receive({...reply(h.id),type:'PROVIDER_PAYMENT_VERIFIED'});
    h.receive({...reply(h.id),version:9});
    assert.equal(h.elements['demo-popup'].hidden,false);
    assert.equal(h.elements['demo-status'].textContent,initial);
    for(const result of ['SIMULATED_CONFIRMED','SIMULATED_FAILED','SIMULATED_UNKNOWN']){
      const accepted=harness(source);accepted.click();
      accepted.receive(reply(accepted.id,result));
      assert.equal(accepted.elements['demo-popup'].hidden,true);
      assert.match(accepted.elements['demo-status'].textContent,/NOT PAID/);
      assert.doesNotMatch(accepted.elements['demo-status'].textContent,/^Paid\b|Booking confirmed/i);
    }
  });
}
test('Estate, My Ride, Storage and altered paths cannot activate checkout while not verified',()=>{
  for(const id of ['ESTATE','MY_RIDE','STORAGE','UNREGISTERED']){
    const h=harness(id);
    assert.equal(h.elements['demo-pay'].listeners.click,undefined,id);
  }
  for(const change of [
    {pathname:'/checkout-gate4-store.html'},
    {fixture:'STAY-DEMO-01'},
    {host:'ESTATE'},
    {pathname:'/phase5-shortstays-host.html'}
  ]){
    const h=harness('STORE',change);
    assert.equal(h.elements['demo-pay'].listeners.click,undefined,JSON.stringify(change));
  }
  assert.doesNotMatch(bridge,/fetch\(|createIntent\(|paymentInitiated\s*=\s*true|bookingConfirmed\s*=\s*true|fundFromSelf\(/);
});
test('the two independent hosts use exactly one Mini bridge, original official logo and no index redesign',()=>{
  for(const source of ['STORE','SHORTSTAYS']){
    const path=cases[source].path.slice(1);
    const html=read(path);
    assert.match(html,new RegExp('data-mini-phase5-host="'+source+'"'));
    assert.match(html,new RegExp('data-checkout-fixture="'+cases[source].id+'"'));
    assert.match(html,/src="\/securepay-mini-phase5-host-bridge\.js"/);
    assert.match(html,/class="demo-securepay-imprint"/);
    assert.match(html,/href="https:\/\/securepay\.ke\/"/);
    assert.match(html,/target="_blank" rel="noopener noreferrer"/);
    assert.match(html,/SIMULATION ONLY/);
    assert.match(html,/id="demo-popup"/);
    assert.match(html,/aria-live="polite"/);
    assert.doesNotMatch(html,/paymentProviderSecret|mpesaPasskey|realFundsReceived/);
  }
  const nav=read('phase5-hosts.html');
  for(const path of ['phase5-store-host.html','phase5-shortstays-host.html'])
    assert.ok(nav.includes(path));
  for(const name of ['My Ride','Storage','Varsityville Estate'])
    assert.ok(nav.includes(name));
  const vite=read('vite.config.ts');
  assert.match(vite,/phase5HostDirectory: fileURLToPath/);
  assert.match(vite,/phase5StoreHost: fileURLToPath/);
  assert.match(vite,/phase5ShortStaysHost: fileURLToPath/);
  assert.match(read('src/mini/MiniExperience.tsx'),/MiniHostedCheckoutDemo/);
});
