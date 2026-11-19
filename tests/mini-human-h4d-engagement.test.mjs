import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';

const compiled=await build({
  entryPoints:['src/api/securepay/human-engagement/index.ts'],
  bundle:true,format:'esm',platform:'node',write:false
});
const api=await import('data:text/javascript;base64,'+
  Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const requester='e6bfa40d-dc72-411c-b39a-f2ce3e0bed28';
const helper='f4432f52-0170-4b30-8df2-6fe3d23c1461';
const id='8be51195-65f4-4b66-a5ac-2d0952dbac4b';
const command={
  idempotencyKey:'5428bc93-82b8-476b-a813-b17787e13a8a',
  helperIdentityId:helper,helperRole:'PLUG',serviceKey:'delivery.count',
  scopeStatement:'Count delivered chairs and record the observed condition',
  completionCondition:'Written count and observed condition record',
  units:1,consentVersion:'H4D_TASK_BRIEF_V1'
};
const invitation={
  engagementId:id,requesterIdentityId:requester,helperIdentityId:helper,
  viewerRole:'REQUESTER',helperRole:'PLUG',serviceKey:'delivery.count',
  serviceLabel:'Count delivered items',scopeStatement:command.scopeStatement,
  completionCondition:command.completionCondition,units:1,
  unitRateMinor:'15000',totalQuoteMinor:'15000',
  currency:'KES',billingBasis:'PER_SESSION',
  status:'REQUESTED',version:1,
  expiresAt:'2026-11-22T15:00:00Z',
  helperAccepted:false,requesterConfirmed:false,
  canonicalAgreementCreated:false,secureLinkIssued:false,
  workAuthorized:false,originalAgreementAccess:false,moneyAuthorized:false
};

test('H4D sends the exact reviewed brief through the authenticated first-party API',async()=>{
  const calls=[];
  const gateway=api.createHumanEngagementGateway({
    request:async(path,opts)=>{calls.push({path,opts});return invitation;}
  });
  const result=await gateway.create(command);
  assert.equal(result.status,'REQUESTED');
  assert.deepEqual(calls,[{
    path:'/api/v1/human-layer/engagements',
    opts:{method:'POST',auth:'required',body:command}
  }]);
  assert.equal('sourceAgreementId' in command,false);
  assert.equal('evidenceReference' in command,false);
  assert.equal('paymentAccount' in command,false);
});

test('H4D rejects forged funding, Agreement, SecureLink or unsolicited approvals',async()=>{
  for(const bad of [
    {canonicalAgreementCreated:true},{secureLinkIssued:true},{moneyAuthorized:true},
    {workAuthorized:true},{originalAgreementAccess:true},
    {viewerRole:'STRANGER'},{viewerRole:null},
    {unitRateMinor:'bad'},{totalQuoteMinor:'999999'},
    {units:-1},{status:'FUNDED'},{version:0},
    {helperIdentityId:requester}
  ]){
    const gateway=api.createHumanEngagementGateway({request:async()=>({...invitation,...bad})});
    await assert.rejects(gateway.create(command));
  }
});

test('H4D returns private inbox only from the authenticated endpoint',async()=>{
  const calls=[];
  const gateway=api.createHumanEngagementGateway({
    request:async(path,opts)=>{calls.push({path,opts});return [invitation];}
  });
  const rows=await gateway.mine();
  assert.equal(rows.length,1);
  assert.equal(rows[0].viewerRole,'REQUESTER');
  assert.deepEqual(calls[0],{path:'/api/v1/human-layer/engagements/mine',
    opts:{method:'GET',auth:'required'}});
});

test('H4D separate decision requires matching request ID and version',async()=>{
  const calls=[];
  const gateway=api.createHumanEngagementGateway({
    request:async(path,opts)=>{calls.push({path,opts});
      return {...invitation,status:'HELPER_ACCEPTED',version:2,
        viewerRole:'HELPER',helperAccepted:true};}
  });
  const outcome=await gateway.decide(id,'HELPER_ACCEPT',1);
  assert.equal(outcome.status,'HELPER_ACCEPTED');
  assert.deepEqual(calls[0],{
    path:'/api/v1/human-layer/engagements/'+id+'/decision',
    opts:{method:'POST',auth:'required',body:{action:'HELPER_ACCEPT',expectedVersion:1}}
  });
  await assert.rejects(gateway.decide('bad','HELPER_ACCEPT',1));
  await assert.rejects(gateway.decide(id,'CUSTOMER_ACCEPT',1));
});

test('H4D stays in native Mini and retains H3/H4C, without fake Money',async()=>{
  const [app,help,owner,discovery,ui]=await Promise.all([
    'src/mini/MiniExperience.tsx','src/mini/MiniHumanHelp.tsx',
    'src/mini/MiniFirstPartyKs001.tsx','src/mini/MiniHumanDiscovery.tsx',
    'src/mini/MiniHumanEngagements.tsx'
  ].map(p=>readFile(p,'utf8')));
  assert.match(app,/window\.location\.hash === '#\/preview\/mini\/h3'/);
  assert.match(app,/window\.location\.hash === '#\/preview\/mini\/h4d'/);
  assert.match(help,/directH4dPreview/);
  assert.match(owner,/createHumanEngagementGateway\(http\)/);
  assert.match(owner,/VITE_SECUREPAY_MINI_H4D_ENGAGEMENT==='enabled'/);
  assert.match(owner,/My human requests/);
  assert.match(discovery,/onSelectHelper\(person\)/);
  assert.match(ui,/H4D_TASK_BRIEF_V1/);
  assert.match(ui,/viewerRole/);
  assert.match(ui,/requestKey\.current/);
  assert.match(ui,/No Money/);
  assert.doesNotMatch(ui,/processPayment\(|issueSecureLink\(|activateProduct\(/);
});
