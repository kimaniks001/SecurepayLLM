import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const review=read('src/features/formation/AgreementReview.tsx');
const panel=read('src/features/living-workspace/LiveWorkResultPanel.tsx');
const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const chat=read('src/features/living-workspace/LiveKs001Session.tsx');
const actions=read('src/features/living-workspace/answerActions.ts');

test('Day 1 legacy-review regression: canonical Agreement reader remains inside the Living Workspace',()=>{
  assert.match(panel,/data-day1-review-in-workspace/);
  assert.match(panel,/formation\.reviewable && onReview/);
  assert.match(shell,/data-day1-workspace-review/);
  assert.match(shell,/<AgreementReview\s/);
  assert.match(shell,/formationState\.data\?\.conversationId===liveConversationId/);
  assert.match(shell,/onBack=\{\(\)=>setDraftReviewOpen\(false\)\}/);
  assert.match(shell,/setDraftReviewOpen\(true\);setScreen\('chat'\)/);
  assert.doesNotMatch(shell,/location\.hash\s*=\s*['"`]#\/agreement-review/);
  assert.match(shell,/<LiveKs001Session controller=\{liveController!\}/);
});

test('Day 1 review remains non-consequential until explicit versioned handoff within the masterpiece',()=>{
  assert.match(review,/setUpAvailable\?: boolean/);
  assert.match(review,/setUpAvailable && <button/);
  assert.match(review,/setUpAvailable && setUp/);
  assert.match(shell,/setUpAvailable=\{!!signedIn && !!handoffController && !!handoffIdentity\}/);
  assert.match(shell,/formationState\?\.data\?\.confirmable/);
  assert.match(shell,/handoffController\.start\(liveConversationId,version\)/);
  assert.match(shell,/<HandoffPanel handoff=\{handoffController\} identity=\{handoffIdentity\}/);
  assert.match(shell,/submitCorrection\(liveController,text\)/);
  assert.match(shell,/retryPending\(liveController\)/);
});

test('Day 1 source compiles syntactically as TSX without changing the approved shell',()=>{
  for(const [path,code] of [['Review',review],['Check',panel],['Workspace',shell],['Chat',chat]]){
    const out=ts.transpileModule(code,{
      fileName:path+'.tsx',
      reportDiagnostics:true,
      compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX},
    });
    const errs=(out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
    assert.equal(errs.length,0,path+': '+errs.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')).join(' | '));
  }
  assert.match(shell,/data-workspace-frozen-layout/);
  assert.match(shell,/data-tool-rail/);
  assert.match(shell,/aria-label="KS001 conversation"/);
  assert.match(shell,/aria-label="Living result"/);
});

test('Day 1 question classification does not confuse currency with amount',()=>{
  const js=ts.transpileModule(actions,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const exports={};runInNewContext(js,{exports});
  const cases=['Which currency is that in?','What currency is the 400 total in?','Is the amount in KES or USD?','Should we use Kenyan shillings or dollars?'];
  for(const q of cases){
    assert.equal(exports.questionIntent(q),'currency',q);
    const pills=exports.answerActions(q);
    assert.equal(pills.filter(a=>a.type==='answer'&&['KES','USD','EUR','GBP'].includes(a.label)).map(a=>a.label).join(','),'KES,USD,EUR,GBP');
    assert.ok(pills.some(a=>a.label==='Other currency'&&a.type==='focus'));
    assert.ok(!pills.some(a=>a.kind==='money'));
  }
  assert.equal(exports.questionIntent('What is being delivered for KES 400?'),'goods');
  assert.equal(exports.questionIntent('When should I pay KES 400?'),'date');
  assert.equal(exports.questionIntent('How much is the delivery?'),'money');
  assert.equal(exports.answerActions('The price is KES 400.').length,0);
});
