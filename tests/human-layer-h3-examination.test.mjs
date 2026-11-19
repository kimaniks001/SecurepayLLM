import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const assembled = await build({
  entryPoints: ['src/api/securepay/human-help/index.ts'],
  format:'esm',platform:'node',bundle:true,write:false
});
const api = await import('data:text/javascript;base64,'+
  Buffer.from(assembled.outputFiles[0].text).toString('base64'));

test('H3 examination uses signed-in canonical server; no staff, model or browser role', async () => {
  const calls=[];
  const service=api.createHumanHelpGateway({
    request:async (path,options)=>{
      calls.push({path,options});
      return { agreementId:'agr-1',acceptedVersionId:'ver-4',
        verifiedFacts:[],participantVisibleReviews:[],
        yourPositionStatus:'NOT_VERIFIED',otherPartiesPositionStatus:'NOT_VERIFIED',
        evidenceStatus:'NOT_EXAMINED',bothSidesHeard:false,
        bindingDecisionMade:false,agreementAmended:false,moneyInstructionAuthorized:false };
    }
  });
  const result=await service.examine(' agr-1 ',' ver-4 ');
  assert.equal(calls.length,1);
  assert.equal(calls[0].path,'/api/v1/human-layer/help/examine');
  assert.equal(calls[0].options.method,'POST');
  assert.equal(calls[0].options.auth,'required');
  assert.deepEqual(calls[0].options.body,{agreementId:'agr-1',acceptedVersionId:'ver-4'});
  assert.equal(result.bothSidesHeard,false);
  assert.equal(result.bindingDecisionMade,false);
  assert.throws(() => service.examine('agr-1',''));
  assert.equal(calls.length,1);
});

test('real signed-in Mini Help follows same H3 typed gateway and displays source provenance', async () => {
  const [runtime,support,agent,panel,apiIndex,preview]=await Promise.all([
    'src/RuntimeApp.tsx','src/features/support/SupportExperience.tsx',
    'src/features/agent/AgentExperience.tsx',
    'src/features/human-layer/MiniHumanHelpPanel.tsx','src/api/securepay/index.ts',
    'src/features/human-layer/MiniH3Review.tsx'
  ].map(path=>readFile(path,'utf8')));
  assert.match(apiIndex,/humanHelp: createHumanHelpGateway\(http\)/);
  assert.match(runtime,/withSessionRefresh\(api\.humanHelp, \['triage', 'examine'\]/);
  assert.match(agent,/Pick<HumanHelpGateway, 'triage' \| 'examine'>/);
  assert.match(support,/MiniHumanHelpPanel/);
  assert.match(panel,/gateway\.examine\(agreement\.agreementId, agreement\.acceptedVersionId\)/);
  assert.match(panel,/report\.agreementId !== agreement\.agreementId/);
  assert.match(panel,/both parties' accounts are not yet verified/i);
  assert.match(preview,/other party's position — not yet heard/i);
});

test('review remains in Mini and never claims evidence examination or a payment', async()=>{
  const [runtime,preview]=await Promise.all([
    readFile('src/RuntimeApp.tsx','utf8'),
    readFile('src/features/human-layer/MiniH3Review.tsx','utf8')
  ]);
  assert.match(runtime,/if \(miniH3Review\) return <MiniH3Review/);
  assert.match(runtime,/if \(miniH2Review\) return <MiniH2Review/);
  assert.match(preview,/KS001 has not examined a real Agreement or heard the other party/);
  assert.match(preview,/No real messages, human booking, case, deposit, Agreement change or payment/);
});
