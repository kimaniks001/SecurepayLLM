import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PHASE5_GATE2_BRANCH,PHASE5_GATE3_BRANCH,PHASE5_TICKET_TTL_MS,PHASE5_HOST_REGISTRY,
  phase5Gate2Config,phase5HostRegistration,phase5IssueHostTicket,
  phase5ResolveHostTicket,handlePhase5HostTicket
} from '../api/mini-phase5-host-ticket.js';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const env={
  VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:PHASE5_GATE2_BRANCH,
  VERCEL_URL:'securepay-phase5-test.vercel.app',
  MINI_PHASE5_HOST_PREVIEW_SECRET:'Q'.repeat(64)
};
const config=phase5Gate2Config(env);
const origin=config.origin;
const NOW=Date.UTC(2026,10,10,8,0);
const hosts={
  STORE:{path:'/phase5-store-host.html',id:'STORE-DEMO-01',minor:180000},
  SHORTSTAYS:{path:'/phase5-shortstays-host.html',id:'STAY-DEMO-01',minor:900000}
};
const response=()=>({statusCode:0,body:null,headers:{},
  setHeader(k,v){this.headers[k.toLowerCase()]=v;},
  end(s){this.body=JSON.parse(s);}
});
function req(method,body=null,options={}){
  const source=options.source||'STORE';
  return {
    method,url:options.url||'/api/mini-phase5-host-ticket',
    headers:{
      host:env.VERCEL_URL,
      ...(method==='POST'?{origin,
        referer:origin+hosts[source].path,
        'content-type':'application/json','sec-fetch-site':'same-origin'}:{}),
      ...(options.headers||{})
    },body
  };
}
function call(method,body,opts={}){
  const res=response();
  const input=req(method,body,opts);
  handlePhase5HostTicket(input,res,opts.env||env,opts.now||NOW);
  return res;
}
test('Gate2 sandbox disabled unless exact branch, preview environment, host and dedicated secret',()=>{
  assert.equal(config.branch,PHASE5_GATE2_BRANCH);
  const gate3=phase5Gate2Config({...env,VERCEL_GIT_COMMIT_REF:PHASE5_GATE3_BRANCH});
  assert.ok(gate3);
  assert.equal(gate3.origin,config.origin);
  assert.equal(config.origin,'https://securepay-phase5-test.vercel.app');
  for(const changes of [
    {VERCEL_ENV:'production'},{VERCEL_ENV:'development'},
    {VERCEL_GIT_COMMIT_REF:'main'},
    {VERCEL_GIT_COMMIT_REF:'feat/mini-phase5-gate1-shared-host-bridge-20261110'},
    {VERCEL_URL:'securepay.ke'},
    {MINI_PHASE5_HOST_PREVIEW_SECRET:''},
    {MINI_PHASE5_HOST_PREVIEW_SECRET:'short'}
  ])assert.equal(phase5Gate2Config({...env,...changes}),null);
  assert.equal(call('POST',{action:'ISSUE',hostId:'STORE'},
    {env:{...env,VERCEL_ENV:'production'}}).statusCode,503);
});
test('registry explicitly disables Estate, Ride, Storage, arbitrary hosts and wrong fixture',()=>{
  assert.deepEqual(Object.keys(PHASE5_HOST_REGISTRY),
    ['STORE','SHORTSTAYS','ESTATE','MY_RIDE','STORAGE']);
  for(const host of ['ESTATE','MY_RIDE','STORAGE','OTHER',null,'__proto__']){
    assert.equal(phase5HostRegistration(host),null,String(host));
    assert.equal(phase5IssueHostTicket(host,config,NOW),null,String(host));
  }
  assert.ok(phase5HostRegistration('STORE'));
  assert.ok(phase5HostRegistration('SHORTSTAYS'));
});
for(const source of ['STORE','SHORTSTAYS']){
  test(source+' signed read ticket binds exact preview domain, source, version, path and amount',()=>{
    const issued=phase5IssueHostTicket(source,config,NOW);
    assert.equal(issued.simulationOnly,true);
    for(const flag of ['checkoutAuthorized','realPaymentEnabled','agreementAccepted',
      'bookingConfirmed','orderCreated'])assert.equal(issued[flag],false);
    assert.equal(issued.expiresAt,NOW+PHASE5_TICKET_TTL_MS);
    const x=phase5ResolveHostTicket(issued.ticket,config,NOW+1000);
    assert.equal(x.hostId,source);
    assert.equal(x.hostPath,hosts[source].path);
    assert.equal(x.fixtureId,hosts[source].id);
    assert.equal(x.amountMinor,hosts[source].minor);
    assert.equal(x.currency,'KES');
    assert.equal(x.source,'PREVIEW_SIGNED_HOST_REGISTRY');
    assert.equal(x.simulationOnly,true);
    for(const flag of ['checkoutAuthorized','realPaymentEnabled',
      'agreementAccepted','providerVerified','moneyMoved','roomHeld',
      'stockReserved','bookingConfirmed','orderCreated','mayFulfil'])
      assert.equal(x[flag],false,flag);
    assert.equal(phase5ResolveHostTicket(issued.ticket,config,NOW+PHASE5_TICKET_TTL_MS),null);
    assert.equal(phase5ResolveHostTicket(issued.ticket,
      {...config,origin:'https://other-preview.vercel.app'},NOW+1000),null);
    assert.equal(phase5ResolveHostTicket(issued.ticket,
      phase5Gate2Config({...env,MINI_PHASE5_HOST_PREVIEW_SECRET:'X'.repeat(64)}),NOW+1000),null);
    const parts=issued.ticket.split('.');
    const edited=parts[0]+'.'+parts[1].slice(0,-3)+'ABC.'+parts[2];
    assert.equal(phase5ResolveHostTicket(edited,config,NOW+1000),null);
    assert.equal(phase5ResolveHostTicket('NOT-A-TICKET',config,NOW),null);
  });
  test(source+' POST issues only from its registered same-origin page; GET resolves safely',()=>{
    const issue=call('POST',{action:'ISSUE',hostId:source},{source});
    assert.equal(issue.statusCode,201);
    assert.equal(issue.headers['cache-control'],'no-store, max-age=0');
    assert.equal(issue.headers['referrer-policy'],'no-referrer');
    const snapshot=call('GET',null,
      {url:'/api/mini-phase5-host-ticket?ticket='+encodeURIComponent(issue.body.ticket)});
    assert.equal(snapshot.statusCode,200);
    assert.equal(snapshot.body.hostId,source);
    assert.equal(snapshot.body.sourceVersion,issue.body.sourceVersion);
    // Repeated GET is a harmless read, not a second redemption or charge.
    const again=call('GET',null,
      {url:'/api/mini-phase5-host-ticket?ticket='+encodeURIComponent(issue.body.ticket)});
    assert.deepEqual(again.body,snapshot.body);
    assert.equal(call('POST',{action:'FUND',hostId:source},{source}).statusCode,400);
    assert.equal(call('DELETE',null,{source}).statusCode,405);
    assert.equal(call('GET',null,
      {url:'/api/mini-phase5-host-ticket?ticket='+issue.body.ticket+'&paid=true'}).statusCode,400);
  });
}
test('wrong page, forged Origin, cross-host path, arbitrary return or amount fail closed',()=>{
  const valid={action:'ISSUE',hostId:'STORE'};
  for(const options of [
    {headers:{origin:'https://evil.example'}},
    {headers:{host:'evil.example'}},
    {headers:{referer:origin+'/phase5-shortstays-host.html'}},
    {headers:{referer:'https://evil.example/phase5-store-host.html'}},
    {headers:{referer:origin+'/phase5-store-host.html?return=https://evil.example'}},
    {headers:{'sec-fetch-site':'cross-site'}},
    {headers:{origin:undefined}},
  ])assert.equal(call('POST',valid,options).statusCode,403,JSON.stringify(options));
  for(const body of [
    {...valid,amountMinor:1},{...valid,merchant:'Any'},
    {...valid,returnUrl:'https://evil.example'},
    {...valid,agreementAccepted:true},
    {action:'ISSUE',hostId:'ESTATE'},
    {action:'ISSUE',hostId:'MY_RIDE'},
    {action:'ISSUE',hostId:'STORAGE'}
  ])assert.ok(call('POST',body).statusCode>=400,JSON.stringify(body));
  assert.equal(call('POST',valid,{headers:{'content-type':'text/plain'}}).statusCode,415);
  assert.equal(call('GET',null,{headers:{host:'evil.example'}}).statusCode,403);
});
test('ticket issuer has no replayable redemption or payment route; no CORS allow origin',()=>{
  const src=read('api/mini-phase5-host-ticket.js');
  assert.doesNotMatch(src,/Access-Control-Allow-Origin/);
  assert.doesNotMatch(src,/createPaymentIntent|\.initiate\(|fundFromSelf|moneyMoved:true|booked:true|orderCreated:true/);
  assert.match(src,/READ_ONLY_FAKE_HOST_TICKET/);
  assert.match(src,/timingSafeEqual/);
  assert.match(src,/Referrer-Policy/);
  assert.match(src,/nonce|jti/);
  const page=read('src/mini/MiniPhase5HostTicket.tsx');
  assert.match(page,/fetch\('\/api\/mini-phase5-host-ticket\?ticket='/);
  assert.match(page,/x\.sourceVersion!==record\.orderVersion/);
  assert.match(page,/x\.amountMinor!==record\.amountMinor/);
  assert.match(page,/x\.expiresAt<=Date\.now\(\)/);
  assert.match(page,/journeyMode\/>/);
  assert.doesNotMatch(page,/postMessage|paymentIntentGateway|\.initiate\(|sendWhatsApp/);
});
