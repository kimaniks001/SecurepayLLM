import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');
const tsSource=read('src/features/living-workspace/workspaceReadinessTruth.ts');
const js=ts.transpileModule(tsSource,{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
const {workspaceReadinessIndicators: indicators}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const base={
  conversationId:'conversation-1',version:7,reviewable:false,readingSources:[]
};
const exam={
  conversationId:'conversation-1',tradeContextVersion:7,
  status:'PARTIAL_ADVISORY',fullyExamined:false,hasMaterialConcern:false,
  principleSetVersion:'principles-v1:test',advisoryQuestion:null,findings:[]
};
const values = (f,e) => Object.fromEntries(indicators(f,e).map(x=>[x.label,x.value]));
const ready = {status:'ready',data:exam};

test('Gate 4D: four compact read-only human statuses cannot suggest payment or acceptance',()=>{
  assert.deepEqual(values(base,{status:'idle',data:null}),{
    Draft:'Still forming', 'Fair Trade':'Not confirmed here',
    Parties:'Acceptance not shown',Money:'Not authorised here'
  });
  assert.equal(values({...base,reviewable:true},ready).Draft,'Available to inspect');
  const model=indicators({...base,reviewable:true},ready);
  assert.deepEqual(model.map(x=>x.label),['Draft','Fair Trade','Parties','Money']);
  for(const item of model){
    assert.doesNotMatch(item.value,/approved|certified|accepted|can pay|released|funded|complete/i);
  }
});

test('Gate 4D: current version is required for partial Fair Trade reading',()=>{
  assert.equal(values(base,ready)['Fair Trade'],'Partial examination');
  assert.equal(values(base,{status:'ready',data:{...exam,hasMaterialConcern:true}})['Fair Trade'],'Concern needs attention');
  assert.equal(values({...base,version:8},ready)['Fair Trade'],'Not confirmed here');
  assert.equal(values({...base,conversationId:'conversation-2'},ready)['Fair Trade'],'Not confirmed here');
  assert.equal(values(base,{status:'unavailable',data:exam})['Fair Trade'],'Not confirmed here');
  assert.equal(values(base,{status:'idle',data:exam})['Fair Trade'],'Not confirmed here');
  assert.equal(values(base,{status:'ready',data:{...exam,status:'APPROVED'}})['Fair Trade'],'Not confirmed here');
  assert.equal(values(base,{status:'loading',data:null})['Fair Trade'],'Reading current version');
  assert.equal(values(base,{status:'loading',data:exam})['Fair Trade'],'Reading current version');
});

test('Gate 4D: reading sources means only an emerging draft is inspectable',()=>{
  const output=values({...base,reviewable:true,readingSources:['photo.jpg']},ready);
  assert.equal(output.Draft,'Sources still being read');
  assert.equal(output.Parties,'Acceptance not shown');
  assert.equal(output.Money,'Not authorised here');
});

test('Gate 4D: stale, failed or wrong conversation versions never remain current on screen',()=>{
  const view=read('src/features/living-workspace/LiveWorkResultPanel.tsx');
  assert.match(view,/state\?\.status === 'ready' && !state\.error && state\.data\?\.conversationId === conversationId/);
  assert.match(view,/workspaceReadinessIndicators\(formation, examination\)/);
  assert.match(view,/data-gate4d-readiness/);
  assert.match(view,/role="group" aria-label="Agreement readiness"/);
  assert.match(view,/examination\.data\.tradeContextVersion === formation\.version/);
  assert.match(view,/Couldn't refresh the Agreement/);
});

test('Gate 4D: presentation stays separate from backend authority and preserves original panels',()=>{
  const panel=read('src/features/living-workspace/LiveWorkResultPanel.tsx');
  assert.match(panel,/What we're agreeing/);
  assert.match(panel,/What deserves attention/);
  assert.match(panel,/One useful next step/);
  assert.match(panel,/Fair Trade examination/);
  assert.match(panel,/Requires an authorised invitation action/);
  assert.match(panel,/Requires a separate, permitted acceptance process/);
  assert.match(panel,/Requires accepted terms, permissions and real Money readiness/);
  assert.doesNotMatch(tsSource,/fetch\(|localStorage|setItem|paymentIntent|submitTurn/);
  const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
  assert.match(shell,/LiveWorkResultPanel/);
  assert.match(shell,/LiveKs001Session/);
  assert.match(shell,/createFormationController\(gateway\)/);
});
