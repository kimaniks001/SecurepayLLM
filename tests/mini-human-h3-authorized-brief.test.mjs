import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const bundle=await build({entryPoints:['src/api/securepay/human-party-submissions/index.ts'],
  platform:'node',format:'esm',bundle:true,write:false});
const api=await import('data:text/javascript;base64,'+
  Buffer.from(bundle.outputFiles[0].text).toString('base64'));

const source={agreementId:'agr-1',acceptedVersionId:'ver-1',reviewCaseId:'review-1'};

test('H3 fair brief can only read verified exact source with signed-in API token', async()=>{
  const calls=[];
  const gateway=api.createHumanFairBriefGateway({
    request:async(path,options)=>{
      calls.push({path,options});
      return {...source,nextQuestions:[],
        ks001HasMadeFinding:false,automaticModelDisclosureAuthorized:false,
        moneyInstructionAuthorized:false,bindingDecisionMade:false,
        amendmentAuthorized:false,affectedPartiesAllHeard:false};
    }
  });
  const result=await gateway.read(source);
  assert.equal(calls.length,1);
  assert.equal(calls[0].path,'/api/v1/human-layer/help/fair-brief');
  assert.equal(calls[0].options.auth,'required');
  assert.equal(calls[0].options.method,'POST');
  assert.deepEqual(calls[0].options.body,source);
  assert.equal(result.ks001HasMadeFinding,false);
  assert.equal(result.moneyInstructionAuthorized,false);
  await assert.rejects(gateway.read({...source,reviewCaseId:''}));
  assert.equal(calls.length,1);
});

test('H3 rejects cross-case facts or fraudulent payment/adjudication status', async()=>{
  for(const patch of [
    {reviewCaseId:'unexpected-review'},
    {acceptedVersionId:'stale-version'},
    {automaticModelDisclosureAuthorized:true},
    {ks001HasMadeFinding:true},
    {moneyInstructionAuthorized:true},
    {bindingDecisionMade:true},
    {amendmentAuthorized:true}
  ]){
    const gateway=api.createHumanFairBriefGateway({request:async()=>({
      ...source,...patch,attributedStatements:[],nextQuestions:[]
    })});
    await assert.rejects(gateway.read(source));
  }
});

test('Native Mini only offers real reviews through first-party session and canonical Agreement/version',async()=>{
  const [owner,ks001,cases,widget]=await Promise.all([
    'src/mini/MiniMyAgreements.tsx',
    'src/mini/MiniFirstPartyKs001.tsx',
    'src/mini/MiniHumanReviewCases.tsx',
    'src/mini/MiniHumanCaseEvidence.tsx'
  ].map(f=>readFile(f,'utf8')));
  assert.match(ks001,/createAgreementReviewGateway\(http\)/);
  assert.match(ks001,/createHumanPartySubmissionGateway\(http\)/);
  assert.match(ks001,/createHumanFairBriefGateway\(http\)/);
  assert.match(ks001,/humanPreviewEnabled=\{!demo && isMiniExperiencePreviewHost/);
  assert.match(owner,/details\.currentVersion\.id/);
  assert.match(owner,/humanPreviewEnabled && reviewGateway && humanPartyGateway && humanFairBriefGateway/);
  assert.match(cases,/reviewGateway\.list\(\{ agreementId, page: 0, size: 20 \}\)/);
  assert.match(cases,/item\.agreementId === agreementId/);
  assert.match(cases,/item\.agreementVersionId === acceptedVersionId/);
  assert.match(cases,/onClick=\{\(\) => setChoice\(\{agreementId,acceptedVersionId,reviewCaseId:item\.reviewCaseId\}\)\}/);
  assert.match(cases,/await prepare\(\)/);
  assert.match(cases,/fairBriefGateway\.read\(scope\)/);
  assert.doesNotMatch(cases,/window\.location\.hash|new URLSearchParams|demoReviewCaseId/);
  assert.match(widget,/fairBriefGateway\.read\(scope\)/);
  assert.match(widget,/No findings, automatic AI disclosure, Agreement amendments or Money instructions/);
});
