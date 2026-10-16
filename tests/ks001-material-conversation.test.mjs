import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const require=createRequire(import.meta.url);
const ts=require('typescript');
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const answerSource=read('src/features/living-workspace/answerActions.ts');
const live=read('src/features/living-workspace/LiveKs001Session.tsx');
const mini=read('src/features/living-workspace/MiniContextInput.tsx');
const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');

const compiled=ts.transpileModule(answerSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
vm.runInNewContext(compiled,{module,exports:module.exports,Date,Set,String,RegExp},{timeout:1000});
const {questionActions,localCalendarDate}=module.exports;

test('delivery subject gets concrete choices, photo and natural typing — never a price-first form',()=>{
  const a=questionActions('What goods are we delivering?');
  assert.deepEqual(Array.from(a,x=>x.label),['Parcel','Food','Furniture','Add photo','Something else']);
  assert.ok(a.some(x=>x.kind==='shelf' && x.tool==='Photos'));
  assert.equal(a.some(x=>x.label==='Enter amount'),false);
});
test('semantic tools only arise for the question actually asked',()=>{
  assert.ok(questionActions('When should they be delivered?').some(x=>x.kind==='mini'&&x.input==='date'));
  assert.ok(questionActions('What time should collection begin?').some(x=>x.kind==='mini'&&x.input==='time'));
  assert.ok(questionActions('Where should we deliver them?').some(x=>x.kind==='shelf'&&x.tool==='Places'));
  assert.ok(questionActions('Who is delivering the goods?').some(x=>x.kind==='mini'&&x.input==='person'));
  assert.ok(questionActions('How much will delivery cost?').some(x=>x.kind==='mini'&&x.input==='money'));
  assert.equal(questionActions('KES 400 total. Ready to review.').length,0);
});
test('date choices use local calendar days and never invent a time',()=>{
  assert.equal(localCalendarDate('today',new Date(2026,9,16,23,59)),'2026-10-16');
  assert.equal(localCalendarDate('tomorrow',new Date(2026,9,16,23,59)),'2026-10-17');
  assert.equal(localCalendarDate('tomorrow',new Date(2026,11,31,23,59)),'2027-01-01');
});
test('only bounded server alternatives can be shown; model tool names cannot execute',()=>{
  const actions=questionActions('Which amount did you mean?',['KES 400','KES 600','KES 600','\n','A'.repeat(150)]);
  assert.deepEqual(Array.from(actions,x=>x.label),['KES 400','KES 600','I’ll explain']);
  assert.ok(actions.every(x=>x.kind!=='shelf'));
});
test('real KS001 sends all answers on one controller and preserves free-text typing',()=>{
  assert.match(live,/questionActions\(question,nextChoices\)/);
  assert.match(live,/controller\.send\(value\)/);
  assert.match(live,/controller\.send\(next\)/);
  assert.match(live,/setMini\(\{kind:a\.input,question\}\)/);
  assert.match(live,/onOpenTool\?\.\(a\.tool\)/);
  assert.match(shell,/onOpenTool=\{tool=>openTool\(tool\)\}/);
  assert.match(shell,/nextChoices=\{formationState\?/);
  assert.match(mini,/kind==='time'\?'time'/);
  assert.match(mini,/Choose a valid time/);
  assert.doesNotMatch(live,/replyPills\(/);
});
