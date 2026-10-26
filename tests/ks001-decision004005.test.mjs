import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const actions=read('src/features/living-workspace/answerActions.ts');
const chat=read('src/features/living-workspace/LiveKs001Session.tsx');
const mini=read('src/features/living-workspace/MiniContextInput.tsx');
const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');

test('KS001 derives bounded answers for a known question, not generic random pills',()=>{
 for(const intent of ["date","time","currency","money","person","place","goods","confirmation","unknown"])
   assert.match(actions,new RegExp("case '"+intent+"':|\u0027"+intent+"\u0027"));
 assert.match(actions,/default:return \[\]/);
 assert.doesNotMatch(chat,/function replyPills\(/);
 assert.match(chat,/answerActions\(currentQuestion\)/);
 assert.match(chat,/if\(!actions\.length\)return null/);
 assert.match(chat,/className="font-semibold text-forest-900"/);
});
test('calendar and local clock choices remain distinct and do not invent time',()=>{
 assert.match(actions,/label:'Today',days:0/);
 assert.match(actions,/label:'Tomorrow',days:1/);
 assert.match(actions,/label:'Choose date',kind:'date'/);
 assert.match(actions,/label:'Choose time',kind:'time'/);
 assert.match(mini,/kind==='time'\?'time'/);
 assert.match(mini,/Choose a valid local time/);
 assert.match(chat,/I have not specified a time/);
 assert.match(chat,/getFullYear\(\)/);
});
test('photo and place pills use existing workspace tool and same canonical conversation',()=>{
 assert.match(actions,/label:'Add photo',tool:'Photos'/);
 assert.match(actions,/label:'Choose place',tool:'Places'/);
 assert.match(chat,/if\(onOpenTool\)onOpenTool\(action\.tool\)/);
 assert.match(shell,/onOpenTool=\{name=>openTool\(name\)\}/);
 assert.match(chat,/controller\.send\(action\.value\)/);
 assert.doesNotMatch(chat,/For your question/);
 assert.match(chat,/await controller\.send\(answer\)/);
 assert.match(shell,/<UniversalSourceTray/);
 assert.match(shell,/onCorrectFact=\{async \(label,previous,replacement,expectedVersion\)=>/);
 assert.doesNotMatch(chat,/acceptAgreement\(|sendMoney\(|confirmPayment\(/);
});

test('semantic examples exercise the real allowlist without executing invented tool names',()=>{
 const source=ts.transpileModule(actions,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const exported={};runInNewContext(source,{exports:exported});
 const resolve=exported.answerActions;
 const goods=resolve('What goods are being delivered?');
 assert.ok(goods.some(a=>a.type==='tool'&&a.tool==='Photos'));
 const dates=resolve('When should the goods arrive?');
 assert.ok(dates.some(a=>a.type==='mini'&&a.kind==='date'));
 assert.ok(dates.some(a=>a.type==='local-day'&&a.days===1));
 assert.ok(resolve('At what time should collection happen?').some(a=>a.type==='mini'&&a.kind==='time'));
 assert.ok(resolve('Who is responsible for the work?').some(a=>a.type==='mini'&&a.kind==='person'));
 assert.ok(resolve('Where should the delivery arrive?').some(a=>a.type==='tool'&&a.tool==='Places'));
 assert.ok(resolve('How much should the supplier be paid?').some(a=>a.type==='mini'&&a.kind==='money'));
 assert.equal(resolve('Please explain your situation.').length,0);
});

test('answer-pill and mini-input replies sound like the person, not orchestration instructions',()=>{
 assert.doesNotMatch(chat,/Please incorporate it into my current draft/);
 assert.doesNotMatch(chat,/This is not an accepted term/);
 assert.match(chat,/mini\.kind==='money' \? value\+'\.'/);
 assert.match(chat,/mini\.kind==='date' \? 'The date is '/);
 assert.match(chat,/mini\.kind==='time' \? 'The local time is '/);
 assert.match(chat,/void controller\.send\('The date is '/);
});

test('server-selected general subject question offers describing work or goods and existing photo tool',()=>{
 const source=ts.transpileModule(actions,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const exported={};runInNewContext(source,{exports:exported});
 const choices=exported.answerActions('What exactly is being provided or done?');
 assert.ok(choices.some(a=>a.type==='focus'&&a.label==='Describe the work or goods'));
 assert.ok(choices.some(a=>a.type==='tool'&&a.tool==='Photos'));
});
test('early draft inspection is not falsely displayed as sufficient understanding',()=>{
 const panel=read('src/features/living-workspace/LiveWorkResultPanel.tsx');
 assert.doesNotMatch(panel,/Ready for your review|Draft ready to review/);
 const readiness=read('src/features/living-workspace/workspaceReadinessTruth.ts');
 assert.match(readiness,/Available to inspect/);
 assert.match(readiness,/Acceptance not shown/);
 assert.match(panel,/state\?\.status === 'ready' && !state\.error/);
 assert.match(panel,/Review the available draft and its unresolved matters/);
});

test('Day 1: currency questions use distinct contextual reply pills, never an amount entry or silent default', () => {
 const source=ts.transpileModule(actions,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const exported={};runInNewContext(source,{exports:exported});
 const {answerActions:resolve, questionIntent:intent}=exported;
 const questions=[
   'Which currency is that in?',
   'What currency is the 400 total in?',
   'Is the amount in KES or USD?',
   'Should we use Kenyan shillings or dollars?',
 ];
 for(const q of questions) {
   assert.equal(intent(q),'currency',q);
   const found=resolve(q);
   for(const cc of ['KES','USD','EUR','GBP']) {
     const pill=found.find(p=>p.label===cc);
     assert.equal(pill?.type,'answer',q+' -> '+cc);
     assert.match(pill.value,new RegExp('\\\\b'+cc+'\\\\b'));
     assert.doesNotMatch(pill.value,/agreed|paid|authori[sz]ed|accepted/i);
   }
   assert.ok(found.some(p=>p.label==='Other currency'&&p.type==='focus'));
   assert.ok(found.some(p=>p.label==='Not sure yet'&&p.type==='answer'));
   assert.ok(!found.some(p=>p.kind==='money'),'Must not ask for an amount again');
 }
 assert.equal(intent('How much is the delivery?'),'money');
 assert.equal(intent('Which currency is that in.'),'unknown','Only explicit questions get pills');
 assert.equal(resolve('The total is KES 400.').length,0);
 assert.match(chat,/void controller\\.send\\(action\\.value\\)/,'Replies use existing authorised conversation');
});
