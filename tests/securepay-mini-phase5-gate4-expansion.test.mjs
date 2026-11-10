import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {
  PHASE5_GATE4_HOSTS,PHASE5_GATE4_SCENARIOS,PHASE5_GATE4_AUTHORITY,
  PHASE5_GATE4_EXTERNAL_BLOCKERS,phase5Gate4Sample,phase5Gate4Assess
} from '../public/securepay-mini-phase5-gate4-preflight.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const NOW=Date.UTC(2026,10,10,9,0);
const hosts=['MY_RIDE','STORAGE','ESTATE'];
const misses={
  MY_RIDE:{missing:'ride_driver',expired:'ride_quote',wrong_person:'ride_parties'},
  STORAGE:{missing:'storage_terms',expired:'storage_price',wrong_person:'storage_parties'},
  ESTATE:{missing:'estate_issuer',expired:'estate_bill_life',wrong_person:'estate_resident'}
};

test('only the three expansion domains exist, with no registered payment authority',()=>{
  assert.deepEqual(Object.keys(PHASE5_GATE4_HOSTS),hosts);
  assert.deepEqual(PHASE5_GATE4_SCENARIOS.map(x=>x.id),
    ['complete','missing','expired','wrong_person']);
  assert.ok(PHASE5_GATE4_EXTERNAL_BLOCKERS.includes('SECUREPAY_API_AND_PROVIDER_UNAVAILABLE'));
  assert.equal(phase5Gate4Sample('STORE','complete',NOW),null);
  assert.equal(phase5Gate4Sample('SHORTSTAYS','complete',NOW),null);
  assert.equal(phase5Gate4Sample('ESTATE','invented',NOW),null);
  assert.equal(phase5Gate4Sample('MY_RIDE','complete',NaN),null);
  for(const unsupported of ['__proto__','constructor','MY_RIDE_SKIP','',null]){
    assert.equal(phase5Gate4Sample(unsupported,'complete',NOW),null);
    const assessed=phase5Gate4Assess(unsupported,{},NOW);
    assert.equal(assessed.canLaunchMini,false);
    assert.equal(assessed.supported,false);
  }
});

for(const host of hosts){
  test(host+': locally complete source never becomes a signed order or permitted checkout',()=>{
    const example=phase5Gate4Sample(host,'complete',NOW);
    const assessed=phase5Gate4Assess(host,example,NOW);
    assert.equal(example.hostId,host);
    assert.equal(example.sourceContext,'BROWSER_ONLY_FICTIONAL_SOURCE');
    assert.equal(example.sourceVersion,'SAMPLE-v1');
    assert.equal(assessed.sourceShapeComplete,true);
    assert.equal(assessed.assessment,'LOCAL_SAMPLE_COMPLETE_NOT_AUTHORISED');
    assert.equal(assessed.supported,true);
    assert.ok(assessed.checks.length>=9);
    assert.equal(assessed.checks.some(x=>x.passed===false),false);
    assert.equal(assessed.checkoutEnabled,false);
    assert.equal(assessed.canLaunchMini,false);
    assert.equal(assessed.blockers.includes('REGISTERED_HOST_SERVER_REQUIRED'),true);
    for(const [key,value] of Object.entries(PHASE5_GATE4_AUTHORITY)){
      assert.equal(example[key],value,key);
    }
    // Re-review is read-only and deterministic; no server authority implied.
    assert.deepEqual(phase5Gate4Assess(host,example,NOW),assessed);
  });
  for(const scenario of ['missing','expired','wrong_person']){
    test(host+': '+scenario+' fails at the correct domain authority gate',()=>{
      const sample=phase5Gate4Sample(host,scenario,NOW);
      const assessed=phase5Gate4Assess(host,sample,NOW);
      assert.equal(assessed.sourceShapeComplete,false);
      assert.equal(assessed.checkoutEnabled,false);
      assert.equal(assessed.canLaunchMini,false);
      assert.equal(assessed.assessment,'SOURCE_REVIEW_BLOCKED');
      assert.ok(assessed.blockers.includes(misses[host][scenario]));
      assert.ok(assessed.checks.find(x=>x.key===misses[host][scenario]&&!x.passed));
      assert.ok(assessed.blockers.includes('SECUREPAY_API_AND_PROVIDER_UNAVAILABLE'));
    });
  }
  test(host+': forged provider, receipt, agreement or gate claim fails closed',()=>{
    const sample=phase5Gate4Sample(host,'complete',NOW);
    for(const forged of [
      {paymentEnabled:true},{moneyMoved:true},{paid:true},{agreementAccepted:true},
      {gateAccessAllowed:true},{hostRegistered:true},{signedHostTicketIssued:true},
      {providerVerified:true},{sourceServerVerified:true},{checkoutAuthorized:true},
      {fulfilmentAllowed:true}
    ]){
      const assessed=phase5Gate4Assess(host,{...sample,...forged},NOW);
      assert.equal(assessed.sourceShapeComplete,false);
      assert.ok(assessed.blockers.includes('no_financial_authority'));
      assert.equal(assessed.checkoutEnabled,false);
      assert.equal(assessed.canLaunchMini,false);
    }
  });
  test(host+': wrong host, corrupted expiry, missing facts remain denied',()=>{
    const sample=phase5Gate4Sample(host,'complete',NOW);
    for(const corrupted of [
      {...sample,hostId:'STORE'},
      {...sample,sourceContext:'REAL_PAYMENT_PROVIDER'},
      {...sample,sampleExpiryAt:new Date(NOW-1).toISOString()},
      {...sample,sampleExpiryAt:'invalid'},
      {...sample,currency:'USD'},
      {...sample,sourceVersion:null},
      {...sample,data:null}
    ]){
      const assessed=phase5Gate4Assess(host,corrupted,NOW);
      assert.equal(assessed.sourceShapeComplete,false);
      assert.equal(assessed.canLaunchMini,false);
    }
  });
}

test('Estate bill and gate visitor access are categorically separate permissions',()=>{
  const valid=phase5Gate4Sample('ESTATE','complete',NOW);
  const evaluated=phase5Gate4Assess('ESTATE',valid,NOW);
  assert.equal(valid.data.gatePassReference,null);
  assert.equal(valid.gateAccessAllowed,false);
  assert.ok(evaluated.checks.find(x=>x.key==='estate_gate_privacy'&&x.passed));
  const illegal={...valid,data:{...valid.data,gatePassReference:'SAMPLE-VISITOR-PASS'}};
  const rejected=phase5Gate4Assess('ESTATE',illegal,NOW);
  assert.ok(rejected.blockers.includes('estate_gate_privacy'));
  assert.equal(rejected.canLaunchMini,false);
});

test('Phase 5 Gate 2/3 signed ticket registry remains disabled for all three expansion hosts',()=>{
  const api=read('api/mini-phase5-host-ticket.js');
  for(const host of hosts)assert.match(api,new RegExp(
    host+":Object\\.freeze\\(\\{hostId:'"+host+"'.*enabled:false"
  ));
  assert.match(api,/phase5HostRegistration\(source\)/);
  assert.doesNotMatch(api,/fixtureId:'ESTATE-DEMO|fixtureId:'RIDE-DEMO|fixtureId:'STORAGE-DEMO/);
});

test('Gate 4 owner lab is separately built, branded, mobile-safe and never calls the API',()=>{
  const html=read('phase5-gate4-expansion.html');
  const app=read('public/securepay-mini-phase5-gate4-lab.js');
  const source=read('public/securepay-mini-phase5-gate4-preflight.js');
  const css=read('public/securepay-mini-phase5-gate4.css');
  const directory=read('phase5-hosts.html');
  const vite=read('vite.config.ts');
  for(const host of hosts)assert.ok(html.includes('data-host="'+host+'"'),host);
  for(const id of ['p5g4-title','p5g4-scenario','p5g4-sample','p5g4-verdict',
    'p5g4-checks','p5g4-next'])assert.ok(html.includes('id="'+id+'"'));
  assert.match(html,/disabled aria-disabled="true"/);
  assert.match(html,/no connected API/i);
  assert.match(html,/href="https:\/\/securepay\.ke\/"/);
  assert.match(html,/brand\/securepay-mark-green\.png/);
  assert.match(html,/aria-live="polite"/);
  assert.match(html,/src="\/securepay-mini-phase5-gate4-lab\.js"/);
  assert.match(directory,/href="\/phase5-gate4-expansion\.html"/);
  assert.match(vite,/phase5ExpansionReadiness/);
  assert.match(css,/@media\(max-width:680px\)/);
  assert.match(app,/textContent=/);
  assert.match(app,/phase5Gate4Sample\(/);
  assert.match(app,/phase5Gate4Assess\(/);
  for(const file of [source,app,html]){
    assert.doesNotMatch(file,/fetch\(|XMLHttpRequest|sendBeacon|\.initiate\(|postMessage\(|window\.open\(|sessionStorage|localStorage|createPaymentIntent|fundFromSelf/);
  }
});
