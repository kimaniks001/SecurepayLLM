import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const output=await build({
  entryPoints:['src/api/securepay/human-discovery/index.ts'],
  format:'esm',platform:'node',bundle:true,write:false
});
const api=await import('data:text/javascript;base64,'+
  Buffer.from(output.outputFiles[0].text).toString('base64'));
const uuid='792eea17-4c49-45cc-9ef5-59bde63bdaf6';
const candidate={
  helperIdentityId:uuid,helperRole:'PLUG',serviceKey:'property.measure',
  serviceLabel:'Measure a delivery',rateMinor:'25000',currency:'KES',
  billingBasis:'PER_SESSION',serviceCompetenceScreened:true,
  professionalLicenseVerified:false,locationMatchVerified:false,
  humanContactEstablished:false,hired:false,originalAgreementAccessible:false,
  moneyAuthorized:false
};
const valid={
  intent:'FIELD_CHECK',helpers:[candidate],geographyMatched:false,
  humanContactEstablished:false,agreementChanged:false,moneyAuthorized:false,
  limitation:'Only a published, time-sensitive declaration.'
};

test('H4C passes only the desired human-help intent with required first-party authentication',async()=>{
  const calls=[];
  const gateway=api.createHumanDiscoveryGateway({
    request:async(path,options)=>{calls.push({path,options});return valid;}
  });
  const result=await gateway.discover('FIELD_CHECK');
  assert.equal(result.helpers.length,1);
  assert.equal(calls.length,1);
  assert.equal(calls[0].path,'/api/v1/human-layer/helpers/discover?intent=FIELD_CHECK');
  assert.equal(calls[0].options.auth,'required');
  assert.equal(calls[0].options.method,'GET');
  assert.equal('body' in calls[0].options,false);
  assert.equal('identityId' in calls[0].options,false);
});

test('H4C rejects forged human contact, payment, appointment or licensing claims',async()=>{
  for(const bad of [
    {humanContactEstablished:true},{agreementChanged:true},{moneyAuthorized:true},
    {geographyMatched:true},{intent:'LOCAL_KNOWLEDGE'},
    {helpers:[{...candidate,hired:true}]},
    {helpers:[{...candidate,professionalLicenseVerified:true}]},
    {helpers:[{...candidate,locationMatchVerified:true}]},
    {helpers:[{...candidate,originalAgreementAccessible:true}]},
    {helpers:[{...candidate,serviceCompetenceScreened:false}]},
    {helpers:[{...candidate,helperRole:'ARBITRATOR'}]},
    {helpers:[{...candidate,rateMinor:'NaN'}]},
    {helpers:Array.from({length:9},()=>candidate)}
  ]){
    const gateway=api.createHumanDiscoveryGateway({request:async()=>({...valid,...bad})});
    await assert.rejects(gateway.discover('FIELD_CHECK'));
  }
});

test('H4C true zero-result response remains empty without invented providers',async()=>{
  const gateway=api.createHumanDiscoveryGateway({
    request:async()=>({...valid,helpers:[]})
  });
  const result=await gateway.discover('FIELD_CHECK');
  assert.deepEqual(result.helpers,[]);
  assert.equal(result.humanContactEstablished,false);
});

test('H4C cannot request a free-text purpose or a malformed category',async()=>{
  let calls=0;
  const gateway=api.createHumanDiscoveryGateway({
    request:async()=>{calls++;return valid;}
  });
  await assert.rejects(gateway.discover('get all users'));
  assert.equal(calls,0);
});

test('H4C is the original native Mini and a staged authenticated service, not a fake directory',async()=>{
  const [help,experience,owner,discovery,coreClient]=await Promise.all([
    'src/mini/MiniHumanHelp.tsx','src/mini/MiniExperience.tsx',
    'src/mini/MiniFirstPartyKs001.tsx','src/mini/MiniHumanDiscovery.tsx',
    'src/api/securepay/human-discovery/index.ts'
  ].map(path=>readFile(path,'utf8')));
  assert.match(help,/onFindHuman/);
  assert.match(help,/data-mini-h4c-first-party-entry/);
  assert.match(experience,/#\/preview\/mini\/h4c/);
  assert.match(experience,/!playground && !!getMiniFirstPartyOrigin/);
  assert.match(owner,/createHumanDiscoveryGateway\(http\)/);
  assert.match(owner,/VITE_SECUREPAY_MINI_H4C_DISCOVERY==='enabled'/);
  assert.match(owner,/prepare=\{\(\)=>ensureFreshSession\(session,auth\)\}/);
  assert.match(discovery,/No one has been contacted/);
  assert.match(discovery,/not connected in this preview/);
  assert.match(discovery,/not an accepted quote/);
  assert.doesNotMatch(discovery,/issueSettlement|createAgreement|processPayment|saveProvider/);
  assert.doesNotMatch(coreClient,/phoneNumber|privateStatement|exactAddress|sendPayment/);
});
