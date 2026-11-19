import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const output=await build({
  entryPoints:['src/api/securepay/human-consent/index.ts'],
  platform:'node',format:'esm',bundle:true,write:false
});
const module=await import('data:text/javascript;base64,'+
  Buffer.from(output.outputFiles[0].text).toString('base64'));
const source={
  agreementId:'agr-1',acceptedVersionId:'v-4',reviewCaseId:'review-1',
  dataScope:'SUBMITTED_STATEMENT_TEXT'
};
const validCommand='1926e013-cd2a-4792-8ca1-319fef0a3915';
const status={
  scope:source,myPermission:'GRANTED',myExpiry:'2026-11-20T12:00:00Z',myRevision:2,
  participation:{state:'WAITING_FOR_EXPLICIT_CONSENT',requiredOriginalPartyCount:3,
    explicitlyConsentingPartyCount:2,stillAwaitingPartyCount:1,
    allRequiredPartiesConsented:false,modelProcessingAuthorized:false},
  privateContentSharedWithModel:false,bindingDecisionMade:false,
  moneyInstructionAuthorized:false
};

test('H3: read, grant and withdraw all require real auth, exact source, and idempotent mutation',async()=>{
  const calls=[];
  const gateway=module.createHumanConsentGateway({
    request:async (path,options)=>{calls.push({path,options});return status;}
  });
  assert.equal((await gateway.status(source)).myPermission,'GRANTED');
  await gateway.grant(source,'2026-11-20T12:00:00.000Z',validCommand);
  await gateway.withdraw(source,validCommand);
  assert.deepEqual(calls.map(c=>c.path),[
    '/api/v1/human-layer/help/ai-consent/status',
    '/api/v1/human-layer/help/ai-consent/grant',
    '/api/v1/human-layer/help/ai-consent/withdraw'
  ]);
  for(const call of calls){
    assert.equal(call.options.auth,'required');
    assert.equal(call.options.method,'POST');
  }
  assert.deepEqual(calls[1].options.body,{
    source,expiresAt:'2026-11-20T12:00:00.000Z',
    iExplicitlyConsentToFutureKs001ReviewOfMySelectedData:true
  });
  assert.deepEqual(calls[1].options.headers,{'Idempotency-Key':validCommand});
  assert.deepEqual(calls[2].options.headers,{'Idempotency-Key':validCommand});
  assert.deepEqual(calls[2].options.body,source);
});

test('H3: no mismatched Agreement, hidden money, or false model processing from server',async()=>{
  const variants=[
    {scope:{...source,reviewCaseId:'not-ours'}},
    {scope:{...source,dataScope:'SUBMITTED_EVIDENCE_METADATA'}},
    {participation:{...status.participation,modelProcessingAuthorized:true}},
    {privateContentSharedWithModel:true},
    {bindingDecisionMade:true},
    {moneyInstructionAuthorized:true},
  ];
  for(const change of variants){
    const gateway=module.createHumanConsentGateway({
      request:async()=>({...status,...change})
    });
    await assert.rejects(gateway.status(source),/Permission status was not verified/);
  }
});

test('H3: invalid source, wrong scope or missing command never sends a request',async()=>{
  const calls=[];
  const gateway=module.createHumanConsentGateway({
    request:async(...args)=>{calls.push(args);return status;}
  });
  await assert.rejects(gateway.grant(source,'not-a-date',validCommand));
  await assert.rejects(gateway.withdraw(source,'bad-command'));
  await assert.rejects(gateway.status({...source,dataScope:'INVOICE_PHOTOS'}));
  assert.equal(calls.length,0);
});

test('H3 permission controls live inside the first-party native Mini owner experience',async()=>{
  const [owned,ks001,review,caseView,consent,app]=await Promise.all([
    'src/mini/MiniMyAgreements.tsx',
    'src/mini/MiniFirstPartyKs001.tsx',
    'src/mini/MiniHumanReviewCases.tsx',
    'src/mini/MiniHumanCaseEvidence.tsx',
    'src/mini/MiniHumanAiConsent.tsx',
    'src/mini/MiniExperience.tsx'
  ].map(path=>readFile(path,'utf8')));
  assert.match(owned,/humanPreviewEnabled && reviewGateway && humanPartyGateway && humanFairBriefGateway && humanConsentGateway && humanExamGateway/);
  assert.match(ks001,/createHumanConsentGateway\(http\)/);
  assert.match(ks001,/humanConsentGateway=\{!demo && isMiniExperiencePreviewHost/);
  assert.match(review,/consentGateway=\{\{status:async/);
  assert.match(caseView,/<MiniHumanAiConsent/);
  assert.match(consent,/onClick=\{\(\)=>void decide\('withdraw'\)\}/);
  assert.match(consent,/disabled=\{working\|\|!confirmed\}/);
  assert.match(consent,/future KS001 examination/);
  assert.match(consent,/This does not start an AI examination/);
  assert.match(app,/isMiniExperiencePreviewHost/);
  assert.doesNotMatch(consent,/localStorage|sessionStorage|executeModel|authorizeMoney|processPayment/);
});
