import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';

const built=await build({
  entryPoints:['src/api/securepay/human-agreement-handoff/index.ts'],
  bundle:true,format:'esm',platform:'node',write:false
});
const api=await import('data:text/javascript;base64,'+
  Buffer.from(built.outputFiles[0].text).toString('base64'));
const request='30ae26db-d80a-44ee-99c4-7415c94105a6';
const agreement='fe3a877c-1955-4218-9964-29f88113e904';
const version='364e564e-b1a7-4814-b8b4-727ca8b46c2f';
const proof={
  humanEngagementId:request,
  canonicalAgreementId:agreement,
  initialAgreementVersionId:version,
  initialContentHash:'a'.repeat(64),
  publicReference:'AGR-FE3A877C',
  currentAgreementStatus:'PROPOSED',
  exactInitialVersionStillCurrent:true,
  canonicalAgreementProposed:true,
  bothPartiesConfirmedCanonicalVersion:false,
  publicSecureLinkIssued:false,
  workAuthorized:false,
  originalAgreementAccessGranted:false,
  moneyAuthorized:false,
  nextHumanStep:'Invite the helper, confirm the actual Agreement version, then use the standard SecureLink authority.'
};

test('H4E sends requester-only first-party POST without copy of source Agreement, Money or payment',async()=>{
  const calls=[];
  const gateway=api.createHumanCanonicalHandoffGateway({
    request:async(path,options)=>{calls.push({path,options});return proof;}
  });
  const result=await gateway.propose(request);
  assert.equal(result.canonicalAgreementId,agreement);
  assert.equal(result.publicSecureLinkIssued,false);
  assert.equal(result.bothPartiesConfirmedCanonicalVersion,false);
  assert.deepEqual(calls,[{
    path:'/api/v1/human-layer/engagements/'+request+'/agreement-draft',
    options:{method:'POST',auth:'required'}
  }]);
  assert.equal('body' in calls[0].options,false);
});

test('H4E private GET can verify uncertain outcome without retrying Agreement creation',async()=>{
  const calls=[];
  const gateway=api.createHumanCanonicalHandoffGateway({
    request:async(path,options)=>{calls.push({path,options});return proof;}
  });
  await gateway.mine(request);
  assert.equal(calls.length,1);
  assert.equal(calls[0].options.method,'GET');
  assert.equal(calls[0].options.auth,'required');
});

test('H4E fails closed on forged or guessed SecureLink, confirmation, payment, source access, work permission',async()=>{
  for(const patched of [
    {publicSecureLinkIssued:true},
    {bothPartiesConfirmedCanonicalVersion:true},
    {moneyAuthorized:true},
    {workAuthorized:true},
    {originalAgreementAccessGranted:true},
    {canonicalAgreementProposed:false},
    {canonicalAgreementId:'wrong'},
    {initialAgreementVersionId:'fake'},
    {humanEngagementId:agreement},
    {initialContentHash:''},
    {publicReference:''}
  ]){
    const gateway=api.createHumanCanonicalHandoffGateway({
      request:async()=>({...proof,...patched})
    });
    await assert.rejects(gateway.propose(request),JSON.stringify(patched));
  }
});

test('H4E refuses replay as unchanged proposed Agreement if terms/version have already moved',async()=>{
  for(const changed of [
    {exactInitialVersionStillCurrent:false},
    {currentAgreementStatus:'CONFIRMATION_PENDING'},
    {currentAgreementStatus:'CANCELLED'}
  ]){
    const gateway=api.createHumanCanonicalHandoffGateway({
      request:async()=>({...proof,...changed})
    });
    await assert.rejects(gateway.propose(request));
    const observed=await gateway.mine(request);
    assert.equal(observed.currentAgreementStatus,changed.currentAgreementStatus||'PROPOSED');
  }
});

test('H4E request key must be exact UUID; no call for arbitrary value',async()=>{
  let calls=0;
  const gateway=api.createHumanCanonicalHandoffGateway({
    request:async()=>{calls++;return proof;}
  });
  await assert.rejects(gateway.propose('wrong'));
  await assert.rejects(gateway.mine('../unrelated-agreement'));
  assert.equal(calls,0);
});

test('H4E preserves original H3/H4C/H4D and native Mini, with explicit H4E staging flag',async()=>{
  const [experience,help,owner,engagement,steps]=await Promise.all([
    'src/mini/MiniExperience.tsx',
    'src/mini/MiniHumanHelp.tsx',
    'src/mini/MiniFirstPartyKs001.tsx',
    'src/mini/MiniHumanEngagements.tsx',
    'src/mini/MiniHumanCertificationPreview.tsx'
  ].map(path=>readFile(path,'utf8')));
  assert.match(experience,/window\.location\.hash === '#\/preview\/mini\/h3'/);
  assert.match(experience,/window\.location\.hash === '#\/preview\/mini\/h4c'/);
  assert.match(experience,/window\.location\.hash === '#\/preview\/mini\/h4d'/);
  assert.match(experience,/window\.location\.hash === '#\/preview\/mini\/h4e'/);
  assert.match(help,/directH4ePreview/);
  assert.match(owner,/createHumanCanonicalHandoffGateway\(http\)/);
  assert.match(owner,/VITE_SECUREPAY_MINI_H4E_CANONICAL_HANDOFF==='enabled'/);
  assert.match(owner,/setHumanDiscoveryOpen\(false\);/);
  assert.match(engagement,/entry\.status==='READY_FOR_AGREEMENT'/);
  assert.match(engagement,/entry\.viewerRole==='REQUESTER'/);
  assert.match(engagement,/agreementGateway\.propose\(entry\.engagementId\)/);
  assert.match(engagement,/agreementGateway\.mine\(entry\.engagementId\)/);
  assert.match(engagement,/Prepare official Agreement/);
  assert.match(engagement,/Open My Agreements/);
  assert.match(steps,/data-mini-h4e-native/);
  assert.match(steps,/no real helpers, issued SecureLinks/);
  assert.doesNotMatch(steps,/fetch\(|issueLink\(|processPayment\(/);
});
