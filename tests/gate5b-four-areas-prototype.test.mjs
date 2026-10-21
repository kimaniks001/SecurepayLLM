import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('src/features/living-workspace/gate5bConcept.ts');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const model=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const app=read('src/RuntimeApp.tsx');
const presentation=read('src/features/living-workspace/Gate5BConceptReview.tsx');

test('Gate 5B: five genuinely distinct, existing purposes with a clear privacy boundary',()=>{
  const expected=['work','vision','circle','community','money'];
  assert.deepEqual(model.gate5BAreas.map(x=>x.id),expected);
  assert.equal(new Set(model.gate5BAreas.map(x=>x.title)).size,5);
  assert.match(model.gate5BArea('vision').privacy,/Private by default/);
  assert.match(model.gate5BArea('circle').privacy,/Circle-only/);
  assert.match(model.gate5BArea('community').privacy,/Public LIVE/);
  assert.match(model.gate5BArea('work').boundary,/party acceptance/);
  assert.match(model.gate5BArea('money').boundary,/No funding/);
  for(const area of model.gate5BAreas){
    assert.ok(area.eyebrow.length>15);
    assert.ok(area.question.endsWith('?'));
    assert.ok(area.meaning.length>60);
    assert.ok(area.next.length>15);
  }
});

test('Gate 5B: all three examples tell the truth in all five areas',()=>{
  assert.deepEqual(model.gate5BExamples.map(x=>x.id),['chama','delivery','water']);
  for(const scenario of model.gate5BExamples){
    for(const area of model.gate5BAreas){
      assert.ok(typeof scenario[area.id]==='string'&&scenario[area.id].length>45,
        scenario.id+' '+area.id+' missing real example');
      const boundary=model.gate5BPreviewBoundary(area.id,scenario.id);
      assert.equal(boundary.scope,'LOCAL_CONCEPT_ONLY');
      for(const flag of ['canPublish','createsMembership','createsAgreement','checksTrade','acceptsForParties','canMoveMoney'])
        assert.equal(boundary[flag],false,scenario.id+' '+area.id+' must not obtain authority');
    }
  }
  assert.match(model.gate5BExample('delivery').work,/what exactly is being delivered/);
  assert.match(model.gate5BExample('chama').money,/not money collected/);
  assert.match(model.gate5BExample('water').community,/without publishing private Circle work/);
});

test('Gate 5B: normal frozen layout and its real controllers remain, local route cannot attach backend',()=>{
  assert.match(shell,/data-workspace-frozen-layout/);
  assert.match(shell,/data-workspace-shell/);
  assert.match(shell,/data-tool-rail/);
  assert.match(shell,/sp-brand-conversation/);
  assert.match(shell,/sp-brand-result/);
  assert.match(shell,/createAgentController\(gateway/);
  assert.match(shell,/createFormationController\(gateway\)/);
  assert.match(shell,/LiveWorkResultPanel/);
  assert.match(shell,/InlineVisionEditor/);
  assert.match(shell,/InlineCircleBoard/);
  assert.match(shell,/InlineCommunityHub/);
  assert.match(shell,/UnifiedMoneyTool/);
  assert.match(app,/key=\{gate5BReview\?'gate5b-concept':'live-workspace'\}/);
  assert.match(app,/conceptReview=\{gate5BReview\}/);
  assert.match(app,/gateway=\{gate5BReview\?undefined:previewAgentGateway\}/);
  assert.match(app,/workspaceGateways=\{gate5BReview\?undefined:previewWorkspaceGateways\}/);
  assert.match(shell,/if\(conceptReview\)return; \/\/ Never consume a private resume signal/);
  assert.match(shell,/!conceptReview && liveStarted && gateway/);
  assert.match(shell,/!conceptReview && uiOnlyPreview && mode==='work'/);
  assert.match(shell,/!conceptReview && mode==='community'/);
  assert.match(shell,/!conceptReview && toolsOpen &&/);
  assert.match(shell,/Gate5BConceptJourney/);
  assert.match(shell,/Gate5BConceptResult/);
});

test('Gate 5B: no fake login, payment, member join, backend handoff or inferred approval',()=>{
  assert.doesNotMatch(presentation,/(?:fetch\(|localStorage|sessionStorage|\.createConversation\(|\.send\(|\.confirm\(|\.join\(|\.createPayment|gateway\.get)/);
  assert.doesNotMatch(source,/(?:fetch\(|localStorage|sessionStorage|\.createConversation\(|\.submit\()/);
  assert.match(presentation,/Nothing has actually happened\?/);
  assert.match(presentation,/No data was saved or sent|Nothing here saves/);
  assert.match(presentation,/No funding, cover, quote|No institution has offered/);
  assert.match(shell,/Gate 5B is a local concept demonstration/);
  assert.match(presentation,/No required order/);
  assert.match(presentation,/No accounts or money/);
});
