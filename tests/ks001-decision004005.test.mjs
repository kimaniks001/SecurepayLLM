import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const actions=read('src/features/living-workspace/answerActions.ts');
const chat=read('src/features/living-workspace/LiveKs001Session.tsx');
const mini=read('src/features/living-workspace/MiniContextInput.tsx');
const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');

test('KS001 derives bounded answers for a known question, not generic random pills',()=>{
 for(const intent of ["date","time","money","person","place","goods","confirmation","unknown"])
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
 assert.match(chat,/No exact time has been chosen/);
 assert.match(chat,/getFullYear\(\)/);
});
test('photo and place pills use existing workspace tool and same canonical conversation',()=>{
 assert.match(actions,/label:'Add photo',tool:'Photos'/);
 assert.match(actions,/label:'Choose place',tool:'Places'/);
 assert.match(chat,/if\(onOpenTool\)onOpenTool\(action\.tool\)/);
 assert.match(shell,/onOpenTool=\{name=>openTool\(name\)\}/);
 assert.match(chat,/controller\.send\(action\.value\)/);
 assert.match(chat,/controller\.send\('For your question/);
 assert.match(shell,/<UniversalSourceTray/);
 assert.match(shell,/onCorrectFact=\{async \(label,previous,replacement,expectedVersion\)=>/);
 assert.doesNotMatch(chat,/acceptAgreement\(|sendMoney\(|confirmPayment\(/);
});
