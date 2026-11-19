import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const entry=await build({
  entryPoints:['src/api/securepay/human-party-submissions/index.ts'],
  format:'esm',platform:'node',bundle:true,write:false
});
const api=await import('data:text/javascript;base64,'+
  Buffer.from(entry.outputFiles[0].text).toString('base64'));

test('H3 client cannot grant KS001 AI access simply by fetching a case',async()=>{
  const calls=[];
  const scope={agreementId:'agreement-a',acceptedVersionId:'version-4',
    reviewCaseId:'review-r'};
  const gateway=api.createHumanPartySubmissionGateway({
    request:async (path,options)=>{
      calls.push({path,options});
      return {...scope, partyStatements:[], evidenceSubmissions:[],
        activeOriginalPartyCount:3, originalPartySubmissionCount:2,
        allOriginalPartiesSubmitted:false, statementsVerified:false,
        evidenceExamined:false, bindingDecisionMade:false,
        moneyInstructionAuthorized:false};
    }
  });
  const result=await gateway.read(scope);
  assert.equal(result.activeOriginalPartyCount,3);
  assert.equal(result.originalPartySubmissionCount,2);
  assert.equal(result.allOriginalPartiesSubmitted,false);
  assert.equal(calls.length,1);
  assert.equal(calls[0].options.auth,'required');
  assert.equal(calls[0].path,'/api/v1/human-layer/help/party-submissions');
  assert.doesNotMatch(calls[0].path,/model|consent|disclose|pay/i);
});

test('native Mini preview shows missing third party as missing, not as a finding',async()=>{
  const view=await readFile('src/mini/MiniHumanCaseEvidence.tsx','utf8');
  assert.match(view,/activeOriginalPartyCount: 3, originalPartySubmissionCount: 2/);
  assert.match(view,/allOriginalPartiesSubmitted: false/);
  assert.match(view,/Others still need an opportunity to respond/);
  assert.match(view,/not shared with an AI examination just by opening Help/);
  assert.match(view,/separately recorded and withdrawable permission/);
  assert.match(view,/No findings, automatic AI disclosure, Agreement amendments or Money instructions/);
});

test('still native spm-* Mini and no unconsented model execution',async()=>{
  const [view,app,gateway,styles]=await Promise.all([
    'src/mini/MiniHumanCaseEvidence.tsx',
    'src/mini/MiniExperience.tsx',
    'src/api/securepay/human-party-submissions/index.ts',
    'src/mini/miniHumanHelp.css'
  ].map(p=>readFile(p,'utf8')));
  assert.match(view,/spm-human-case/);
  assert.match(app,/isMiniExperiencePreviewHost/);
  assert.match(styles,/\.spm-human-case-body/);
  assert.doesNotMatch(view,/openai|executeModel|grantConsent|autoApprove/);
  assert.doesNotMatch(gateway,/grantConsent|openai|autoApprove/);
});
