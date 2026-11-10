import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const script=read('public/securepay-mini-phase5-host-bridge.js');
const hosts={
  STORE:{path:'/phase5-store-host.html',fixture:'STORE-DEMO-01',
    version:'fixture-store-v1',alias:'STORE_RETURN'},
  SHORTSTAYS:{path:'/phase5-shortstays-host.html',fixture:'STAY-DEMO-01',
    version:'fixture-stay-v1',alias:'STAY_RETURN'}
};
const mockTicket=['Abc'.repeat(44),'Xyz'.repeat(54),'Def'.repeat(15)].join('.');
function harness(source='STORE',opts={}){
  const host=hosts[source]||{path:'/fake',fixture:'bad',version:'bad'};
  const root={dataset:{miniPhase5Host:source,checkoutFixture:host.fixture}};
  const elements={};
  for(const id of ['demo-pay','demo-popup','demo-overlay','demo-frame',
    'demo-close','demo-fallback','demo-status']){
    const listeners={};
    elements[id]={
      listeners,hidden:['demo-popup','demo-overlay','demo-fallback'].includes(id),
      attributes:{},dataset:{},textContent:id==='demo-pay'?'Pay with SecurePay':'NOT PAID',
      src:'about:blank',disabled:false,
      setAttribute(k,v){this.attributes[k]=v;},
      focus(){this.focused=true;},
      addEventListener(k,v){listeners[k]=v;}
    };
  }
  const frameId={},origin='https://securepay-owner.vercel.app',fetches=[];
  elements['demo-frame'].contentWindow=frameId;
  elements['demo-frame'].contentDocument={querySelector:()=>({})};
  const listeners={};
  const document={
    querySelector:q=>q==='[data-mini-phase5-host]'?root:null,
    getElementById:id=>elements[id],
    addEventListener:(name,fn)=>{listeners['document:'+name]=fn;}
  };
  const window={
    location:{origin,pathname:opts.path||host.path},
    addEventListener:(name,fn)=>{listeners[name]=fn;},
    setTimeout:fn=>fn()
  };
  if(opts.fixture)root.dataset.checkoutFixture=opts.fixture;
  if(opts.source)root.dataset.miniPhase5Host=opts.source;
  const fetch=async(url,options)=>{
    fetches.push({url,options});
    if(opts.failure)throw Error('OFFLINE');
    return {
      ok:true,
      json:async()=>({
        ticket:mockTicket,expiresAt:Date.now()+240000,
        hostId:source,sourceVersion:host.version,returnAlias:host.alias,
        simulationOnly:true,checkoutAuthorized:false,
        realPaymentEnabled:false,agreementAccepted:false,
        orderCreated:false,bookingConfirmed:false,...(opts.payload||{})
      })
    };
  };
  runInNewContext(script,{window,document,fetch,Object,Boolean,Date,JSON,encodeURIComponent});
  return {
    elements,listeners,origin,frameId,fetches,
    async click(){
      elements['demo-pay'].listeners.click?.();
      await new Promise(resolve=>setImmediate(resolve));
    },
    close:()=>elements['demo-close'].listeners.click?.(),
    receive:(data,from=frameId,at=origin)=>listeners.message?.({data,origin:at,source:from}),
    host
  };
}
function reply(host,result='SIMULATED_CONFIRMED'){
  return {type:'SECUREPAY_MINI_OWNER_DEMO_RETURN_V1',
    version:1,fixtureId:host.fixture,simulated:true,result};
}
for(const source of ['STORE','SHORTSTAYS']){
  test(source+' requests a host-bound server ticket rather than inventing checkout on the page',async()=>{
    const h=harness(source);
    await h.click();
    assert.equal(h.fetches.length,1);
    assert.equal(h.fetches[0].url,'/api/mini-phase5-host-ticket');
    assert.deepEqual(JSON.parse(h.fetches[0].options.body),{action:'ISSUE',hostId:source});
    assert.doesNotMatch(h.fetches[0].options.body,/merchant|amountMinor|password|returnUrl|beneficiary/);
    assert.equal(h.fetches[0].options.credentials,'same-origin');
    assert.equal(h.elements['demo-frame'].src,
      '/mini.html?embedded=1&phase5Ticket='+encodeURIComponent(mockTicket));
    assert.equal(h.elements['demo-popup'].hidden,false);
    h.close();await h.click();
    assert.equal(h.fetches.length,1,'reopen does not mint another ticket');
    assert.match(h.elements['demo-status'].textContent,/NOT PAID/);
  });
  test(source+' enforces exact origin, iframe, fixture and fictional flags on return',async()=>{
    const h=harness(source);await h.click();const initial=h.elements['demo-status'].textContent;
    for(const [value,from,origin] of [
      [reply(h.host),'other-frame',h.origin],
      [reply(h.host),h.frameId,'https://evil.example'],
      [reply(h.host,'PAID'),h.frameId,h.origin],
      [{...reply(h.host),simulated:false},h.frameId,h.origin],
      [{...reply(h.host),fixtureId:'OTHER-DEMO'},h.frameId,h.origin],
      [{...reply(h.host),version:2},h.frameId,h.origin]
    ])h.receive(value,from,origin);
    assert.equal(h.elements['demo-status'].textContent,initial);
    assert.equal(h.elements['demo-popup'].hidden,false);
    h.receive(reply(h.host,'SIMULATED_UNKNOWN'));
    assert.equal(h.elements['demo-popup'].hidden,true);
    assert.match(h.elements['demo-status'].textContent,/unknown.*NOT PAID/i);
    await h.click();
    assert.equal(h.fetches.length,1,'unknown result must never start another ticket');
    assert.equal(h.elements['demo-popup'].hidden,false);
    assert.match(h.elements['demo-status'].textContent,/unknown.*NOT PAID/i);
  });
  test(source+' fails closed without server, without permission or with forged issuer response',async()=>{
    for(const options of [
      {failure:true},{payload:{checkoutAuthorized:true}},
      {payload:{ticket:'client-fake'}},{payload:{hostId:'ESTATE'}},
      {payload:{sourceVersion:'outdated'}},{payload:{agreementAccepted:true}},
      {payload:{expiresAt:Date.now()-100}},
    ]){
      const h=harness(source,options);
      await h.click();
      assert.equal(h.elements['demo-popup'].hidden,true);
      assert.equal(h.elements['demo-fallback'].hidden,false);
      assert.match(h.elements['demo-status'].textContent,/NOT PAID/);
      assert.equal(h.elements['demo-frame'].src,'about:blank');
    }
  });
}
test('nonregistered sites and incorrect source/path/fixture do not mount bridge',async()=>{
  for(const s of ['ESTATE','MY_RIDE','STORAGE','UNKNOWN']){
    const h=harness(s);await h.click();
    assert.equal(h.fetches.length,0);
  }
  for(const opt of [
    {path:'/phase5-shortstays-host.html'},
    {source:'ESTATE'},
    {fixture:'STAY-DEMO-01'}
  ]){
    const h=harness('STORE',opt);
    await h.click();assert.equal(h.fetches.length,0);
  }
});
test('unchanged branded host pages use ONE bridge and no client-side payment authority',()=>{
  for(const source of ['STORE','SHORTSTAYS']){
    const html=read(hosts[source].path.slice(1));
    assert.match(html,new RegExp('data-mini-phase5-host="'+source+'"'));
    assert.match(html,/src="\/securepay-mini-phase5-host-bridge\.js"/);
    assert.match(html,/class="demo-securepay-imprint"/);
    assert.match(html,/href="https:\/\/securepay\.ke\/"/);
    assert.match(html,/id="demo-popup"/);
    assert.match(html,/SIMULATION ONLY/);
  }
  assert.match(read('phase5-hosts.html'),/Varsityville Estate/);
  assert.match(read('vite.config.ts'),/phase5HostDirectory/);
  assert.match(read('src/mini/MiniExperience.tsx'),/<MiniPhase5HostTicket ticket=\{phase5Ticket\} language=\{lang\}/);
  assert.doesNotMatch(script,/paymentIntentGateway|fundFromSelf|paymentConfirmed\s*=\s*true|checkoutSessionIssued\s*=\s*true/);
  assert.doesNotMatch(script,/\?embedded=1&demoCheckout=/);
});
