import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const {outputFiles}=await build({
  entryPoints:['src/api/securepay/human-exam-readiness/index.ts'],
  format:'esm',platform:'node',bundle:true,write:false
});
const api=await import('data:text/javascript;base64,'+
  Buffer.from(outputFiles[0].text).toString('base64'));
const s={agreementId:'agr-a',acceptedVersionId:'v-8',
  reviewCaseId:'review-a',dataScope:'SUBMITTED_STATEMENT_TEXT'};
const id='1926e013-cd2a-4792-8ca1-319fef0a3915';
const valid={
  ...s,outcome:'AWAITING_PARTY_CONSENT',
  activeOriginalPartyCount:3,consentingOriginalPartyCount:2,
  awaitingOriginalPartyCount:1,nonbindingQuestions:[],
  allPartiesConsentChecked:false,actualKs001ExaminationAvailable:false,
  ks001ModelInvoked:false,privateDataSentToModel:false,evidenceVerified:false,
  bindingDecisionMade:false,agreementChanged:false,moneyAuthorized:false
};

test('H3 preparation passes only canonical case metadata with first-party auth and idempotency',async()=>{
  const calls=[];
  const gateway=api.createHumanExamReadinessGateway({
    request:async(path,options)=>{calls.push({path,options});return valid;}
  });
  const got=await gateway.prepare(s,id);
  assert.equal(got.awaitingOriginalPartyCount,1);
  assert.equal(calls.length,1);
  assert.equal(calls[0].path,'/api/v1/human-layer/help/ai-examination/prepare');
  assert.equal(calls[0].options.auth,'required');
  assert.equal(calls[0].options.method,'POST');
  assert.deepEqual(calls[0].options.body,s);
  assert.deepEqual(calls[0].options.headers,{'Idempotency-Key':id});
  assert.equal('identityId' in calls[0].options.body,false);
  assert.equal('submittedNarrative' in calls[0].options.body,false);
});

test('H3 fails closed for wrong source, invented model findings or malformed party count',async()=>{
  for(const wrong of [
    {agreementId:'wrong'},{reviewCaseId:'stale'},{dataScope:'SUBMITTED_EVIDENCE_METADATA'},
    {actualKs001ExaminationAvailable:true},{ks001ModelInvoked:true},
    {privateDataSentToModel:true},{bindingDecisionMade:true},
    {evidenceVerified:true},{agreementChanged:true},{moneyAuthorized:true},
    {consentingOriginalPartyCount:4},{awaitingOriginalPartyCount:-1}
  ]){
    const gateway=api.createHumanExamReadinessGateway({
      request:async()=>({...valid,...wrong})
    });
    await assert.rejects(gateway.prepare(s,id));
  }
});

test('H3 cannot fire without exact Agreement version and a well-formed request key',async()=>{
  let calls=0;
  const gateway=api.createHumanExamReadinessGateway({request:async()=>{calls++;return valid;}});
  await assert.rejects(gateway.prepare({...s,acceptedVersionId:''},id));
  await assert.rejects(gateway.prepare(s,'id-from-a-preview'));
  assert.equal(calls,0);
});

test('H3 stays in signed-in native Mini and is a readiness check, NOT an AI examination',async()=>{
  const files=await Promise.all([
    'src/mini/MiniFirstPartyKs001.tsx','src/mini/MiniMyAgreements.tsx',
    'src/mini/MiniHumanReviewCases.tsx','src/mini/MiniHumanAiConsent.tsx',
    'src/mini/MiniHumanExamReadiness.tsx','src/mini/MiniExperience.tsx'
  ].map(f=>readFile(f,'utf8')));
  const [owner,agreements,review,consent,readiness,shell]=files;
  assert.match(owner,/createHumanExamReadinessGateway\(http\)/);
  assert.match(owner,/humanExamGateway=\{!demo && isMiniExperiencePreviewHost/);
  assert.match(agreements,/humanConsentGateway && humanExamGateway && details\.currentVersion/);
  assert.match(review,/examGateway=\{\{prepare:async/);
  assert.match(consent,/<MiniHumanExamReadiness/);
  assert.match(readiness,/Nothing was sent to AI/);
  assert.match(readiness,/no AI examination was started/i);
  assert.match(shell,/isMiniExperiencePreviewHost/);
  assert.doesNotMatch(readiness,/openai|processPayment|issueSettlement|grantConsent|executeModel/);
});


test('H3 sample shows missing and all-consented cases without storing real permissions',async()=>{
  const example=await readFile('src/mini/MiniHumanConsentExample.tsx','utf8');
  assert.match(example,/Preview examination readiness/);
  assert.match(example,/2 of 3/);
  assert.match(example,/3 of 3/);
  assert.match(example,/Illustration only — no server check or permission saved/);
  assert.match(example,/All fictional permissions are present/);
  for(const forbidden of ['fetch(', 'localStorage', 'gateway.grant', 'executeModel']) {
    assert.equal(example.includes(forbidden),false,'Sample must not run '+forbidden);
  }
});
